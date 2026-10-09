import { useState, useEffect, type ReactNode } from 'react'
import { useLocation, useParams } from 'wouter'
import {
  SiteNav,
  HeadingField,
  CardLayout,
  DialogField,
  ButtonWidget,
  RichTextDisplayField,
  TextItem,
  TagField,
  MessageBanner,
} from '@pglevy/sailwind'
import {
  LayoutGrid,
  List,
  Layers,
  CircleHelp,
  Shuffle,
  Eye,
  Pencil,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import EditConditionsForm from '../components/edit-conditions-form'
import {
  getReviewQueue,
  getRuleReview,
  saveRuleReviewDraft,
  acceptRuleReview,
  rejectRuleReview,
  revertRuleReview,
  countConditions,
  type RuleReview,
  type RuleReviewContent,
  type RuleCondition,
  type ConditionJoin,
  type ReviewClause,
} from '../db/rule-reviews'
import { updateRuleApproval, type RuleApproval, type RuleApprovalStatus } from '../db/rule-approvals'

const navPages = [
  { label: 'Clause Sets', icon: LayoutGrid },
  { label: 'Clauses', icon: List },
  { label: 'Templates', icon: Layers },
  { label: 'Questionnaires', icon: CircleHelp },
  { label: 'Rules', icon: Shuffle, isSelected: true },
]

const statusTagColors: Record<RuleApprovalStatus, { background: string; text: string }> = {
  Approved: { background: '#D7F3E0', text: '#166534' },
  Rejected: { background: '#FDE2E2', text: '#991B1B' },
  Pending: { background: '#DBEAFE', text: '#1E40AF' },
}

const UNSAVED_CONFIRM = 'You have unsaved changes. Discard them and continue?'

const pluralize = (count: number, singular: string) =>
  `${count} ${singular}${count === 1 ? '' : 's'}`

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

/* -------------------------------------------------------------------------- */
/* Read-only pieces                                                           */
/* -------------------------------------------------------------------------- */

/** Renders long text as read-only paragraphs, keeping the blank lines in the source. */
function TextBlock({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n\n+/).map((paragraph, index) => (
        <RichTextDisplayField
          key={index}
          value={[<TextItem key="t" text={paragraph} size="STANDARD" />]}
          marginBelow="STANDARD"
        />
      ))}
    </>
  )
}

/** One condition on a single line: clause data, operator, value. */
function ConditionRow({ condition }: { condition: RuleCondition }) {
  const isQuestion = condition.clauseData === 'Questionnaire Question'
  return (
    <div className="rounded-md border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900">
      <p>
        <span className="font-medium">{isQuestion ? condition.question : condition.clauseData}</span>{' '}
        <span className="text-gray-600">{condition.operator}</span>{' '}
        <span>{condition.value}</span>
      </p>
      {isQuestion && <p className="mt-0.5 text-xs text-gray-600">{condition.questionnaire}</p>}
    </div>
  )
}

/** Conditions stacked with the join (AND / OR) between them. */
function ConditionStack({ conditions, join }: { conditions: RuleCondition[]; join: ConditionJoin }) {
  return (
    <div>
      {conditions.map((condition, index) => (
        <div key={condition.id}>
          {index > 0 && <p className="py-1 text-xs font-semibold text-gray-600">{join}</p>}
          <ConditionRow condition={condition} />
        </div>
      ))}
    </div>
  )
}

/**
 * A clause-detail card the reviewer can collapse. Both cards on the right pane
 * start collapsed so the pane stays short, and either one opens on click.
 */
function CollapsibleCard({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-md border border-gray-200 bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-center justify-between gap-3 rounded-md px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {open ? (
          <ChevronUp size={16} aria-hidden="true" className="text-gray-600" />
        ) : (
          <ChevronDown size={16} aria-hidden="true" className="text-gray-600" />
        )}
      </button>
      {open && <div className="border-t border-gray-200 px-4 py-3">{children}</div>}
    </div>
  )
}

/** A read-only row in the clause lists with a trailing "View" link. */
function ClauseRow({ clause, onView }: { clause: ReviewClause; onView: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        <span className="block text-sm font-semibold text-gray-900">{clause.number}</span>
        <span className="mt-0.5 line-clamp-2 block text-sm text-gray-600">{clause.title}</span>
      </div>
      <button
        type="button"
        onClick={onView}
        aria-label={`View ${clause.number}`}
        className="shrink-0 text-sm font-medium text-blue-700 hover:underline focus:outline-none focus-visible:underline"
      >
        View
      </button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

function RuleReviewScreen({ pendingOnly }: { pendingOnly: boolean }) {
  const params = useParams<{ id: string }>()
  const ruleId = Number(params.id)
  const [, setLocation] = useLocation()

  const [queue, setQueue] = useState<RuleApproval[]>([])
  const [review, setReview] = useState<RuleReview | null>(null)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'missing'>('loading')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [editingConditions, setEditingConditions] = useState(false)
  const [confirmingReject, setConfirmingReject] = useState(false)
  const [selectedClauseId, setSelectedClauseId] = useState<number | null>(null)
  const [viewingClauseId, setViewingClauseId] = useState<number | null>(null)
  const [nameInput, setNameInput] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoadState('loading')
    setDone(false)
    setEditingConditions(false)
    Promise.all([getReviewQueue(), getRuleReview(ruleId)]).then(([rules, stored]) => {
      if (cancelled) return
      setQueue(rules)
      if (!stored) {
        setReview(null)
        setLoadState('missing')
        return
      }
      // Work on a copy so unsaved edits never leak into the data layer.
      const copy = structuredClone(stored)
      setReview(copy)
      setDirty(false)
      setSavedAt(stored.draftSavedAt)
      const foundRule = rules.find(r => r.id === ruleId)
      if (foundRule) setNameInput(foundRule.name)
      const included = copy.clauses.filter(c => c.outcome === 'Included')
      const excluded = copy.clauses.filter(c => c.outcome === 'Excluded')
      setSelectedClauseId([...included, ...excluded][0]?.id ?? null)
      setLoadState('ready')
    })
    return () => {
      cancelled = true
    }
  }, [ruleId])

  const rule = queue.find(r => r.id === ruleId)

  const includedClauses = review?.clauses.filter(c => c.outcome === 'Included') ?? []
  const excludedClauses = review?.clauses.filter(c => c.outcome === 'Excluded') ?? []
  const selectedClause = review?.clauses.find(c => c.id === selectedClauseId) ?? null

  const conditionTotal = review ? countConditions(review) : 0

  const toContent = (r: RuleReview): RuleReviewContent => ({
    join: r.join,
    conditions: r.conditions,
    groups: r.groups,
  })

  /* -------------------------------- navigation ------------------------------- */

  const confirmLeave = () => !dirty || window.confirm(UNSAVED_CONFIRM)

  const goToList = () => {
    if (!confirmLeave()) return
    setLocation('/rules-review')
  }

  /* --------------------------------- actions --------------------------------- */

  const handleContentChange = (content: RuleReviewContent) => {
    setReview(prev => (prev ? { ...prev, ...content } : prev))
    setDirty(true)
  }

  const handleNameChange = (next: string) => {
    setNameInput(next)
    setDirty(true)
  }

  /** Persist a name change, if any, so the Rules list and header stay in sync. */
  const persistNameIfChanged = async () => {
    if (!rule || nameInput === rule.name) return
    await updateRuleApproval(ruleId, { name: nameInput })
    setQueue(await getReviewQueue())
  }

  const handleSaveDraft = async () => {
    if (!review) return
    setBusy(true)
    await persistNameIfChanged()
    const saved = await saveRuleReviewDraft(ruleId, toContent(review))
    setSavedAt(saved?.draftSavedAt ?? null)
    setDirty(false)
    setBusy(false)
  }

  const handleDecision = async (decision: 'accept' | 'reject') => {
    if (!review) return
    setBusy(true)
    await persistNameIfChanged()
    const content = toContent(review)
    if (decision === 'accept') await acceptRuleReview(ruleId, content)
    else await rejectRuleReview(ruleId, content)
    setDirty(false)
    setBusy(false)
    // Return to the Rules list; the reviewer picks the next rule to open.
    setLocation('/rules-review')
  }

  const handleRevert = async () => {
    if (!review) return
    setBusy(true)
    await persistNameIfChanged()
    await revertRuleReview(ruleId, toContent(review))
    // Refresh queue so the status tag at the top reflects Pending.
    setQueue(await getReviewQueue())
    setDirty(false)
    setSavedAt(null)
    setBusy(false)
  }

  /* ---------------------------------- render --------------------------------- */

  const statusMessage = dirty
    ? 'Unsaved changes'
    : savedAt
      ? `Draft saved at ${formatTime(savedAt)}`
      : ''

  const renderShell = (content: ReactNode) => (
    <div className="flex h-screen bg-white">
      <SiteNav
        displayName="Clause Automation"
        pages={navPages}
        userName="Pradhima P M"
        appianLogoSrc="/images/icon-appian-header.png"
        highlightColor="#C7C4F4"
      />
      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden border-l border-gray-200 bg-gray-50">
        {content}
      </main>
    </div>
  )

  if (loadState === 'loading') {
    return renderShell(
      <div className="p-8">
        <HeadingField text="Loading rule..." size="MEDIUM" headingTag="H1" />
      </div>,
    )
  }

  if (loadState === 'missing' || !review || !rule) {
    return renderShell(
      <div className="p-8 max-w-xl">
        <HeadingField text="Rule not found" size="LARGE" headingTag="H1" marginBelow="LESS" />
        <RichTextDisplayField
          value={[<TextItem key="t" text="This rule doesn't exist or has been removed." color="SECONDARY" />]}
          marginBelow="STANDARD"
        />
        <ButtonWidget label="Back to Rules" style="OUTLINE" color="ACCENT" onClick={() => setLocation('/rules-review')} />
      </div>,
    )
  }

  if (done) {
    const counts = {
      Approved: queue.filter(r => r.status === 'Approved').length,
      Rejected: queue.filter(r => r.status === 'Rejected').length,
      Pending: queue.filter(r => r.status === 'Pending').length,
    }
    return renderShell(
      <div className="p-8 max-w-2xl">
        <CardLayout padding="MORE" showBorder={true} shape="SEMI_ROUNDED" style="#FFFFFF">
          <HeadingField
            text={pendingOnly ? 'All pending rules reviewed' : 'All rules reviewed'}
            size="LARGE"
            headingTag="H1"
            marginBelow="LESS"
          />
          <RichTextDisplayField
            value={[
              <TextItem
                key="t"
                text="There are no more pending rules in the library."
                color="SECONDARY"
              />,
            ]}
            marginBelow="STANDARD"
          />
          <div className="flex gap-3 mb-6">
            {(Object.keys(counts) as RuleApprovalStatus[]).map(status => (
              <TagField
                key={status}
                size="STANDARD"
                tags={[
                  {
                    text: `${counts[status]} ${status}`,
                    backgroundColor: statusTagColors[status].background,
                    textColor: statusTagColors[status].text,
                  },
                ]}
                marginBelow="NONE"
              />
            ))}
          </div>
          <ButtonWidget
            label="Back to Rules"
            style="SOLID"
            color="ACCENT"
            onClick={() => setLocation('/rules-review')}
          />
        </CardLayout>
      </div>,
    )
  }

  return renderShell(
    <>
      {/* Page header */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-8 py-4">
        <div className="flex items-start gap-3">
          <div className="-ml-2 mt-0.5">
            <ButtonWidget
              style="GHOST"
              color="SECONDARY"
              size="SMALL"
              icon="ChevronLeft"
              tooltip="Back to Rules"
              accessibilityText="Back to Rules"
              onClick={goToList}
            />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <HeadingField
                text="Review Rule"
                size="LARGE"
                headingTag="H1"
                fontWeight="REGULAR"
                marginBelow="NONE"
              />
              <TagField
                size="SMALL"
                tags={[
                  {
                    text: rule.status,
                    backgroundColor: statusTagColors[rule.status].background,
                    textColor: statusTagColors[rule.status].text,
                  },
                ]}
                marginBelow="NONE"
              />
            </div>
            <RichTextDisplayField
              value={[
                <TextItem
                  key="subtitle"
                  text="Review the rule and accept it to add to the library"
                  color="SECONDARY"
                  size="STANDARD"
                />,
              ]}
              marginBelow="NONE"
            />
          </div>
        </div>
      </div>

      {/* Two panes, each scrolling on its own */}
      <div className="flex min-h-0 flex-1">
        {/* Left pane: rule, conditions, included and excluded clauses */}
        <section aria-label="Rule" className="min-w-0 flex-[3] overflow-y-auto px-8 py-6">
          <div className="rounded-md border border-gray-200 bg-white">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
              <div className="min-w-0">
                <HeadingField
                  text={nameInput || rule.name}
                  size="MEDIUM_PLUS"
                  headingTag="H2"
                  fontWeight="SEMI_BOLD"
                  marginBelow="EVEN_LESS"
                />
                <p className="text-sm text-gray-600">
                  {pluralize(conditionTotal, 'condition')} ·{' '}
                  {pluralize(review.groups.length, 'group')}
                </p>
              </div>
              <div
                role="group"
                aria-label="Rule view"
                className="inline-flex shrink-0 overflow-hidden rounded border border-gray-300 text-xs font-semibold uppercase"
              >
                <button
                  type="button"
                  aria-current={!editingConditions ? 'true' : undefined}
                  onClick={() => setEditingConditions(false)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${
                    !editingConditions
                      ? 'bg-blue-50 text-blue-800'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Eye size={14} aria-hidden="true" /> Preview
                </button>
                <button
                  type="button"
                  aria-current={editingConditions ? 'true' : undefined}
                  onClick={() => setEditingConditions(true)}
                  className={`inline-flex items-center gap-1.5 border-l border-gray-300 px-3 py-1.5 ${
                    editingConditions
                      ? 'bg-blue-50 text-blue-800'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Pencil size={14} aria-hidden="true" /> Edit
                </button>
              </div>
            </div>

            {editingConditions ? (
              <EditConditionsForm
                name={nameInput}
                onNameChange={handleNameChange}
                content={toContent(review)}
                onChange={handleContentChange}
              />
            ) : (
              <div className="px-5 py-4">
                <HeadingField
                  text="Conditions"
                  size="MEDIUM_PLUS"
                  headingTag="H3"
                  fontWeight="SEMI_BOLD"
                  marginBelow="EVEN_LESS"
                />
                <p className="mb-4 text-xs text-gray-600">
                  Clause set data that triggers this rule
                </p>

                {conditionTotal === 0 && (
                  <p className="text-sm text-gray-700">
                    This rule has no conditions, so it applies to every clause set.
                  </p>
                )}

                <div className="space-y-4">
                  {review.conditions.length > 0 && (
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                      <ConditionStack conditions={review.conditions} join={review.join} />
                    </div>
                  )}

                  {review.groups.map((group, groupIndex) => (
                    <div key={group.id}>
                      {(review.conditions.length > 0 || groupIndex > 0) && (
                        <p className="pb-2 text-xs font-semibold text-gray-600">{review.join}</p>
                      )}
                      <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                        <p className="mb-3 text-xs text-gray-700">
                          Condition Group {groupIndex + 1}
                        </p>
                        <ConditionStack conditions={group.conditions} join={group.join} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Included and excluded clauses, one row each */}
          {[
            { label: 'Included Clauses', items: includedClauses },
            { label: 'Excluded Clauses', items: excludedClauses },
          ].map(group => (
            <div key={group.label} className="mt-6 overflow-hidden rounded-md border border-gray-200 bg-white">
              <div className="px-5 py-4">
                <HeadingField
                  text={`${group.label} (${group.items.length})`}
                  size="MEDIUM_PLUS"
                  headingTag="H3"
                  fontWeight="SEMI_BOLD"
                  marginBelow="NONE"
                />
              </div>
              <div className="border-t border-gray-200">
                {group.items.length === 0 && (
                  <p className="px-5 py-4 text-sm text-gray-600">
                    No {group.label.toLowerCase()} in this rule.
                  </p>
                )}
                {group.items.map(clause => (
                  <ClauseRow
                    key={clause.id}
                    clause={clause}
                    onView={() => setViewingClauseId(clause.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Right pane: the selected clause */}
        <section
          aria-label="Clause details"
          className="min-w-0 flex-[2] overflow-y-auto border-l border-gray-200 bg-white px-6 py-6"
        >
          {selectedClause ? (
            <div className="space-y-4">
              <HeadingField
                text={`${selectedClause.number} ${selectedClause.title}`}
                size="MEDIUM"
                headingTag="H2"
                fontWeight="SEMI_BOLD"
                marginBelow="NONE"
              />

              <CollapsibleCard
                key={`${selectedClause.id}-clauses`}
                title={`Clauses Involved (${includedClauses.length})`}
                defaultOpen={false}
              >
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-800">
                  {includedClauses.map(clause => (
                    <li key={clause.id}>
                      <span className="font-medium">{clause.number}</span>
                      <span className="text-gray-600"> | {clause.title}</span>
                    </li>
                  ))}
                </ul>
              </CollapsibleCard>

              <div className="rounded-md border border-gray-200 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">Prescription Text</p>
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <p className="mb-2 text-base">
                    <span className="mr-2 text-sm font-semibold text-gray-700">
                      {selectedClause.number}
                    </span>
                    <span className="text-lg font-semibold text-gray-900">
                      {selectedClause.title}
                    </span>
                  </p>
                  <TextBlock text={selectedClause.prescription} />
                </div>
              </div>
            </div>
          ) : (
            <MessageBanner
              primaryText="No clause selected"
              secondaryText={
                review.clauses.length === 0
                  ? 'This rule does not include or exclude any clauses.'
                  : 'Pick a clause from the list to review its text.'
              }
              backgroundColor="INFO"
              highlightColor="INFO"
              icon="info"
              showDecorativeBar={false}
              marginBelow="NONE"
            />
          )}
        </section>
      </div>

      {/* Footer actions — always visible so every rule can be edited and saved. */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-gray-200 bg-white px-8 py-3">
        <div className="flex items-center gap-4">
          <ButtonWidget
            label="Save Draft"
            style="OUTLINE"
            color="ACCENT"
            disabled={busy || !dirty}
            onClick={handleSaveDraft}
          />
          <span
            className={`text-sm ${dirty ? 'text-amber-700' : 'text-gray-600'}`}
            role="status"
            aria-live="polite"
          >
            {statusMessage}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {rule.status === 'Pending' ? (
            <>
              <ButtonWidget
                label="Reject"
                style="OUTLINE"
                color="NEGATIVE"
                disabled={busy}
                onClick={() => setConfirmingReject(true)}
              />
              <ButtonWidget
                label="Accept"
                style="SOLID"
                color="ACCENT"
                disabled={busy}
                onClick={() => handleDecision('accept')}
              />
            </>
          ) : (
            <ButtonWidget
              label="Revert to Pending"
              style="SOLID"
              color="ACCENT"
              disabled={busy}
              onClick={handleRevert}
            />
          )}
        </div>
      </div>

      {confirmingReject && (
        <DialogField
          open={true}
          onOpenChange={open => {
            if (!open) setConfirmingReject(false)
          }}
          title="Reject this rule?"
          width="MEDIUM"
          height="FIT"
          closeOnOutsideClick={false}
          marginBelow="NONE"
        >
          <p className="text-base text-gray-700">
            Once rejected, this rule can&apos;t be edited or reviewed again.
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <ButtonWidget
              label="CANCEL"
              style="OUTLINE"
              color="ACCENT"
              onClick={() => setConfirmingReject(false)}
            />
            <ButtonWidget
              label="REJECT RULE"
              style="SOLID"
              color="NEGATIVE"
              disabled={busy}
              onClick={async () => {
                setConfirmingReject(false)
                await handleDecision('reject')
              }}
            />
          </div>
        </DialogField>
      )}

      {viewingClauseId !== null &&
        (() => {
          const clause = review.clauses.find(c => c.id === viewingClauseId)
          if (!clause) return null
          return (
            <DialogField
              open={true}
              onOpenChange={open => {
                if (!open) setViewingClauseId(null)
              }}
              title={`${clause.number} — ${clause.title}`}
              width="FIT"
              height="EXTRA_TALL"
              marginBelow="NONE"
            >
              <div className="dialog-size-60 flex h-full min-h-0 flex-col">
                <div className="min-h-0 flex-1 overflow-y-auto break-words pr-2 text-sm leading-relaxed text-gray-800">
                  <TextBlock text={clause.text} />
                </div>
                <div className="mt-4 flex shrink-0 justify-end border-t border-gray-200 pt-4">
                  <ButtonWidget
                    label="Close"
                    style="OUTLINE"
                    color="ACCENT"
                    onClick={() => setViewingClauseId(null)}
                  />
                </div>
              </div>
            </DialogField>
          )
        })()}
    </>,
  )
}

/** Review any rule. Approved and Rejected rules open read-only. */
export default function RuleReviewPage() {
  return <RuleReviewScreen pendingOnly={false} />
}

/** Review only the rules that are still Pending, one after another. */
export function PendingRuleReviewPage() {
  return <RuleReviewScreen pendingOnly={true} />
}
