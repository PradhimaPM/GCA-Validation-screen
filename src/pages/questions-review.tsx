import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'wouter'
import {
  HeadingField,
  MessageBanner,
  ReadOnlyGrid,
  GridColumn,
  ButtonWidget,
  RichTextDisplayField,
  TextItem,
} from '@pglevy/sailwind'
import QuestionsShell from '../components/questions-shell'
import QuestionStatusTag from '../components/question-status-tag'
import UpdateQuestionDialog from '../components/update-question-dialog'
import { getSystemQuestions, reviewQuestions, type Question } from '../db/questions'

/** Username recorded as the reviewer in this prototype. */
const CURRENT_USER = 'john.smith'

export default function QuestionsReview() {
  const [, setLocation] = useLocation()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([])
  const [openQuestion, setOpenQuestion] = useState<Question | null>(null)

  useEffect(() => {
    getSystemQuestions().then(data => {
      setQuestions([...data])
      setLoading(false)
    })
  }, [])

  const counts = useMemo(
    () => ({
      pending: questions.filter(q => q.status === 'Pending').length,
      approved: questions.filter(q => q.status === 'Approved').length,
      rejected: questions.filter(q => q.status === 'Rejected').length,
    }),
    [questions],
  )

  // Bulk actions only apply to questions that are still pending.
  const pendingSelectedIds = useMemo(
    () =>
      questions
        .filter(q => q.status === 'Pending' && selectedIds.includes(q.id))
        .map(q => q.id),
    [questions, selectedIds],
  )

  const review = async (ids: number[], status: 'Approved' | 'Rejected') => {
    await reviewQuestions(ids, status, CURRENT_USER)
    // The data layer returns the same array each time, so copy it to trigger a re-render.
    setQuestions([...(await getSystemQuestions())])
    setSelectedIds([])
  }

  return (
    <QuestionsShell>
      <div className="px-8 py-6">
        <div className="flex items-start justify-between gap-6 mb-4">
          <div>
            <HeadingField
              text="Review system questions"
              size="LARGE"
              headingTag="H1"
              fontWeight="REGULAR"
              marginBelow="EVEN_LESS"
            />
            <RichTextDisplayField
              value={[
                <TextItem
                  key="subtitle"
                  text="Approve or reject each imported question. Approved questions are added to the Questions tab as standard questions."
                  color="SECONDARY"
                  size="MEDIUM"
                />,
              ]}
              marginBelow="NONE"
            />
          </div>
          <div className="shrink-0">
            <ButtonWidget
              label="DONE"
              style="SOLID"
              color="ACCENT"
              onClick={() => setLocation('/questions')}
            />
          </div>
        </div>

        {!loading && questions.length > 0 && counts.pending === 0 && (
          <div className="mb-4">
            <MessageBanner
              primaryText="Review complete."
              secondaryText={`${counts.approved} approved and ${counts.rejected} rejected. Select Done to see the approved questions.`}
              backgroundColor="SUCCESS"
              highlightColor="POSITIVE"
              icon="success"
              marginBelow="NONE"
            />
          </div>
        )}

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <ButtonWidget
            label="APPROVE SELECTED"
            style="SOLID"
            color="POSITIVE"
            icon="Check"
            iconPosition="START"
            disabled={pendingSelectedIds.length === 0}
            onClick={() => review(pendingSelectedIds, 'Approved')}
          />
          <ButtonWidget
            label="REJECT SELECTED"
            style="OUTLINE"
            color="NEGATIVE"
            icon="X"
            iconPosition="START"
            disabled={pendingSelectedIds.length === 0}
            onClick={() => review(pendingSelectedIds, 'Rejected')}
          />
          <RichTextDisplayField
            value={[
              <TextItem
                key="summary"
                text={`${counts.pending} pending  •  ${counts.approved} approved  •  ${counts.rejected} rejected`}
                color="SECONDARY"
              />,
            ]}
            marginBelow="NONE"
            className="ml-auto"
          />
        </div>

        <ReadOnlyGrid
          data={questions}
          pageSize={20}
          pagingControls="ROW_COUNT"
          borderStyle="LIGHT"
          rowHeader={0}
          selectable={true}
          selectionStyle="CHECKBOX"
          selectionValue={selectedIds}
          selectionSaveInto={setSelectedIds}
          emptyGridMessage={loading ? 'Loading questions...' : 'No questions to review.'}
          accessibilityText="Imported system questions waiting for review, with response type and approval status"
        >
          <GridColumn
            label="Question"
            sortField="question"
            width="6X"
            value={(row: Question) => (
              <RichTextDisplayField
                value={[
                  <TextItem
                    key="question"
                    text={row.question}
                    color="ACCENT"
                    link={() => setOpenQuestion(row)}
                    linkStyle="STANDALONE"
                  />,
                ]}
                marginBelow="NONE"
              />
            )}
          />
          <GridColumn label="Response Type" sortField="responseType" width="2X" value="responseType" />
          <GridColumn
            label="Status"
            sortField="status"
            width="2X"
            value={(row: Question) => <QuestionStatusTag status={row.status} />}
          />
          <GridColumn
            label="Review"
            width="2X"
            value={(row: Question) =>
              row.status === 'Pending' ? (
                <div className="flex items-center gap-1">
                  <ButtonWidget
                    style="GHOST"
                    color="POSITIVE"
                    size="SMALL"
                    icon="Check"
                    tooltip="Approve"
                    accessibilityText={`Approve question: ${row.question}`}
                    onClick={() => review([row.id], 'Approved')}
                  />
                  <ButtonWidget
                    style="GHOST"
                    color="NEGATIVE"
                    size="SMALL"
                    icon="X"
                    tooltip="Reject"
                    accessibilityText={`Reject question: ${row.question}`}
                    onClick={() => review([row.id], 'Rejected')}
                  />
                </div>
              ) : (
                <RichTextDisplayField
                  value={[<TextItem key="done" text="Reviewed" color="GRAY_500" />]}
                  marginBelow="NONE"
                />
              )
            }
          />
        </ReadOnlyGrid>
      </div>

      {openQuestion && (
        <UpdateQuestionDialog
          key={openQuestion.id}
          question={openQuestion}
          onClose={() => setOpenQuestion(null)}
          onSaved={async () => {
            setQuestions([...(await getSystemQuestions())])
            setOpenQuestion(null)
          }}
        />
      )}
    </QuestionsShell>
  )
}
