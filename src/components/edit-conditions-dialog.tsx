import { useState } from 'react'
import {
  DialogField,
  HeadingField,
  RadioButtonField,
  DropdownField,
  ButtonWidget,
} from '@pglevy/sailwind'
import {
  clauseDataTypes,
  conditionOperators,
  questionnaires,
  createCondition,
  changeConditionClauseData,
  changeConditionQuestionnaire,
  changeConditionQuestion,
  getConditionValueOptions,
  getQuestionnaireQuestions,
  countConditions,
  type ClauseDataType,
  type ConditionJoin,
  type ConditionOperator,
  type RuleCondition,
  type RuleReviewContent,
} from '../db/rule-reviews'

const joinLabels = ['All conditions (AND)', 'Any condition (OR)']
const joinValues: ConditionJoin[] = ['AND', 'OR']
const questionnaireNames = questionnaires.map(q => q.name)

/** Dropdown with a required label above, matching the Appian rule editor. The built-in clear icon is hidden because every condition field needs a value. */
function Select({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: string[]
  value: string | null
  onChange: (value: string) => void
}) {
  return (
    <div className="[&_.lucide-x]:hidden">
      <DropdownField
        label={label}
        required={true}
        placeholder={`Select ${label.toLowerCase()}`}
        choiceLabels={options}
        choiceValues={options}
        value={value}
        saveInto={next => next && onChange(next)}
        marginBelow="NONE"
      />
    </div>
  )
}

function MatchRadio({
  value,
  onChange,
}: {
  value: ConditionJoin
  onChange: (join: ConditionJoin) => void
}) {
  return (
    <RadioButtonField
      label="Match"
      required={true}
      choiceLabels={joinLabels}
      choiceValues={joinValues}
      value={value}
      saveInto={next => next && onChange(next as ConditionJoin)}
      choiceLayout="COMPACT"
      marginBelow="NONE"
    />
  )
}

function Separator({ join }: { join: ConditionJoin }) {
  return <p className="my-5 text-sm font-semibold uppercase tracking-wide text-gray-600">{join}</p>
}

const rowClass = 'grid grid-cols-[repeat(3,minmax(0,1fr))_2rem] items-start gap-x-6'

interface ConditionFieldsProps {
  condition: RuleCondition
  canRemove: boolean
  onChange: (next: RuleCondition) => void
  onRemove: () => void
}

function ConditionFields({ condition, canRemove, onChange, onRemove }: ConditionFieldsProps) {
  const isQuestion = condition.clauseData === 'Questionnaire Question'

  const clauseDataSelect = (
    <Select
      label="Clause Data"
      options={clauseDataTypes}
      value={condition.clauseData}
      onChange={value =>
        value !== condition.clauseData &&
        onChange(changeConditionClauseData(condition, value as ClauseDataType))
      }
    />
  )
  const operatorSelect = (
    <Select
      label="Operator"
      options={conditionOperators}
      value={condition.operator}
      onChange={value => onChange({ ...condition, operator: value as ConditionOperator })}
    />
  )
  const valueSelect = (
    <Select
      label="Value"
      options={getConditionValueOptions(condition)}
      value={condition.value}
      onChange={value => onChange({ ...condition, value })}
    />
  )
  const removeButton = (
    <div className="pt-7">
      <ButtonWidget
        style="GHOST"
        color="SECONDARY"
        size="SMALL"
        icon="X"
        tooltip="Remove condition"
        accessibilityText={`Remove condition ${condition.clauseData}`}
        disabled={!canRemove}
        onClick={onRemove}
      />
    </div>
  )

  if (!isQuestion) {
    return (
      <div className={rowClass}>
        {clauseDataSelect}
        {operatorSelect}
        {valueSelect}
        {removeButton}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className={rowClass}>{clauseDataSelect}</div>
      <div className={rowClass}>
        <Select
          label="Questionnaire"
          options={questionnaireNames}
          value={condition.questionnaire}
          onChange={value => onChange(changeConditionQuestionnaire(condition, value))}
        />
      </div>
      <div className={rowClass}>
        <Select
          label="Question"
          options={getQuestionnaireQuestions(condition.questionnaire)}
          value={condition.question}
          onChange={value => onChange(changeConditionQuestion(condition, value))}
        />
        {operatorSelect}
        {valueSelect}
        {removeButton}
      </div>
    </div>
  )
}

interface EditConditionsDialogProps {
  content: RuleReviewContent
  onClose: () => void
  onApply: (content: RuleReviewContent) => void
}

/**
 * Edit Conditions dialog. Mirrors the Appian rule editor: a Match choice, then
 * one block per condition with labeled, required fields and AND/OR between them.
 * Changes stay inside the dialog until the reviewer applies them.
 */
export default function EditConditionsDialog({ content, onClose, onApply }: EditConditionsDialogProps) {
  const [draft, setDraft] = useState<RuleReviewContent>(() => structuredClone(content))
  const total = countConditions(draft)

  const nextId = () =>
    Math.max(
      0,
      ...draft.conditions.map(c => c.id),
      ...draft.groups.flatMap(g => g.conditions.map(c => c.id)),
    ) + 1

  const mapList = (
    groupId: number | null,
    fn: (list: RuleCondition[]) => RuleCondition[],
  ) =>
    setDraft(prev =>
      groupId === null
        ? { ...prev, conditions: fn(prev.conditions) }
        : {
            ...prev,
            groups: prev.groups
              .map(g => (g.id === groupId ? { ...g, conditions: fn(g.conditions) } : g))
              .filter(g => g.conditions.length > 0),
          },
    )

  const change = (groupId: number | null, next: RuleCondition) =>
    mapList(groupId, list => list.map(c => (c.id === next.id ? next : c)))
  const remove = (groupId: number | null, id: number) =>
    mapList(groupId, list => list.filter(c => c.id !== id))
  const add = (groupId: number | null) =>
    mapList(groupId, list => [...list, createCondition(nextId(), 'Contract Category')])

  const renderConditions = (groupId: number | null, list: RuleCondition[], join: ConditionJoin) =>
    list.map((condition, index) => (
      <div key={condition.id}>
        {index > 0 && <Separator join={join} />}
        <ConditionFields
          condition={condition}
          canRemove={total > 1}
          onChange={next => change(groupId, next)}
          onRemove={() => remove(groupId, condition.id)}
        />
      </div>
    ))

  const addButton = (groupId: number | null) => (
    <ButtonWidget
      label="Add Condition"
      style="LINK"
      color="ACCENT"
      size="SMALL"
      icon="CirclePlus"
      iconPosition="START"
      onClick={() => add(groupId)}
    />
  )

  return (
    <DialogField
      open={true}
      onOpenChange={open => {
        if (!open) onClose()
      }}
      title="Edit Conditions"
      width="FIT"
      height="EXTRA_TALL"
      closeOnOutsideClick={false}
      marginBelow="NONE"
    >
      <div
        className="mx-auto flex flex-col"
        style={{ width: 'min(60rem, 100%)', height: 'calc(85vh - 7rem)' }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto pr-2">
          <p className="mb-5 text-sm text-gray-600">
            Ensure multiple conditions of the same clause data type aren&apos;t pointing to multiple
            different values. These conditions apply to every clause in this rule.
          </p>

          <div className="rounded-md border border-gray-200 bg-gray-50 p-6">
            <MatchRadio value={draft.join} onChange={join => setDraft(prev => ({ ...prev, join }))} />
            <hr className="my-5 border-gray-200" />

            {renderConditions(null, draft.conditions, draft.join)}

            {draft.groups.map((group, groupIndex) => (
              <div key={group.id}>
                {(draft.conditions.length > 0 || groupIndex > 0) && <Separator join={draft.join} />}
                <div className="rounded-md border border-gray-300 bg-white p-5">
                  <HeadingField
                    text={`Condition group ${groupIndex + 1}`}
                    size="SMALL"
                    headingTag="H3"
                    fontWeight="SEMI_BOLD"
                    marginBelow="LESS"
                  />
                  <MatchRadio
                    value={group.join}
                    onChange={join =>
                      setDraft(prev => ({
                        ...prev,
                        groups: prev.groups.map(g => (g.id === group.id ? { ...g, join } : g)),
                      }))
                    }
                  />
                  <hr className="my-5 border-gray-200" />
                  {renderConditions(group.id, group.conditions, group.join)}
                  <div className="mt-5">{addButton(group.id)}</div>
                </div>
              </div>
            ))}

            <div className="mt-6">{addButton(null)}</div>
          </div>
        </div>

        <div className="mt-4 flex shrink-0 items-center justify-between border-t border-gray-200 pt-4">
          <ButtonWidget label="CANCEL" style="OUTLINE" color="ACCENT" onClick={onClose} />
          <ButtonWidget
            label="APPLY CONDITIONS"
            style="SOLID"
            color="ACCENT"
            onClick={() => onApply(draft)}
          />
        </div>
      </div>
    </DialogField>
  )
}
