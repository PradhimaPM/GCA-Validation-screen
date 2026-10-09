import { useState } from 'react'
import {
  DialogField,
  MessageBanner,
  HeadingField,
  TextField,
  DropdownField,
  ButtonWidget,
} from '@pglevy/sailwind'
import {
  createQuestion,
  updateQuestion,
  type Question,
  type QuestionResponseType,
} from '../db/questions'

const responseTypeChoices: QuestionResponseType[] = ['Radio Button', 'Dropdown']

/** Username recorded as the modifier when the prototype user saves a question. */
const CURRENT_USER = 'john.smith'

interface UpdateQuestionDialogProps {
  /** The question to edit. Leave out to create a new Custom question. */
  question?: Question
  onClose: () => void
  onSaved: (saved: Question) => void
}

/**
 * Create / Update Question dialog.
 *
 * - New questions are Custom and Approved (they skip review), with everything editable.
 * - Custom questions are always fully editable.
 * - Standard (system) questions can only have their response edited while
 *   Pending. Approved and Rejected ones show a banner and lock the response.
 */
export default function UpdateQuestionDialog({ question, onClose, onSaved }: UpdateQuestionDialogProps) {
  const isNew = question === undefined
  const [text, setText] = useState(question?.question ?? '')
  const [responseType, setResponseType] = useState<QuestionResponseType>(question?.responseType ?? 'Radio Button')
  const [options, setOptions] = useState<string[]>(question?.responseOptions ?? ['', ''])

  const isStandard = question?.source === 'Standard'
  const responseEditable = isNew || !isStandard || question.status === 'Pending'
  const optionsValid = !responseEditable || (options.length > 0 && options.every(o => o.trim() !== ''))
  const canSave = text.trim() !== '' && optionsValid

  const handleSave = async () => {
    if (!canSave) return
    const values = {
      question: text.trim(),
      responseType,
      responseOptions: options.map(o => o.trim()),
      lastModified: new Date().toISOString(),
      modifiedBy: CURRENT_USER,
    }
    const saved = isNew
      ? await createQuestion({ ...values, source: 'Custom', status: 'Approved' })
      : await updateQuestion(question.id, values)
    if (saved) onSaved(saved)
  }

  return (
    <DialogField
      open={true}
      onOpenChange={open => {
        if (!open) onClose()
      }}
      title={isNew ? 'New Question' : 'Update Question'}
      width="FIT"
      height="EXTRA_TALL"
      closeOnOutsideClick={false}
      marginBelow="NONE"
    >
      <div className="flex flex-col justify-between" style={{ minHeight: 'calc(85vh - 7rem)' }}>
        <div>
          {isStandard && question.status === 'Approved' && (
            <div className="mb-3">
              <MessageBanner
                primaryText="This question has already been approved."
                secondaryText="Its responses can't be edited."
                backgroundColor="SUCCESS"
                highlightColor="POSITIVE"
                icon="success"
                marginBelow="NONE"
              />
            </div>
          )}
          {isStandard && question.status === 'Rejected' && (
            <div className="mb-3">
              <MessageBanner
                primaryText="This question has been rejected."
                secondaryText="Its responses can't be edited."
                backgroundColor="ERROR"
                highlightColor="NEGATIVE"
                icon="error"
                marginBelow="NONE"
              />
            </div>
          )}

          {!isNew && (
            <div className="mb-4">
              <MessageBanner
                primaryText="Edits to this question will be reflected on all questionnaire templates that reference it."
                backgroundColor="WARN"
                highlightColor="WARN"
                icon="warning"
                marginBelow="NONE"
              />
            </div>
          )}

          <HeadingField
            text="Question"
            size="MEDIUM"
            headingTag="H2"
            fontWeight="SEMI_BOLD"
            color="ACCENT"
            marginBelow="LESS"
          />
          <TextField
            label="Question Text"
            required={true}
            value={text}
            saveInto={setText}
            marginBelow="STANDARD"
          />

          <HeadingField
            text="Response"
            size="MEDIUM"
            headingTag="H2"
            fontWeight="SEMI_BOLD"
            color="ACCENT"
            marginBelow="LESS"
          />
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-10 gap-y-4 max-w-5xl">
            <DropdownField
              label="Type"
              required={true}
              disabled={!responseEditable}
              choiceLabels={responseTypeChoices}
              choiceValues={responseTypeChoices}
              value={responseType}
              saveInto={value => value && setResponseType(value)}
              marginBelow="NONE"
            />

            <div>
              <HeadingField
                text="Response Options"
                size="SMALL"
                headingTag="H3"
                fontWeight="SEMI_BOLD"
                marginBelow="EVEN_LESS"
              />
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="flex-1">
                      <TextField
                        label={`Response option ${index + 1}`}
                        labelPosition="COLLAPSED"
                        value={option}
                        disabled={!responseEditable}
                        saveInto={value =>
                          setOptions(prev => prev.map((o, i) => (i === index ? value : o)))
                        }
                        marginBelow="NONE"
                      />
                    </div>
                    {responseEditable && (
                      <ButtonWidget
                        style="GHOST"
                        color="SECONDARY"
                        size="SMALL"
                        icon="X"
                        tooltip="Remove option"
                        accessibilityText={`Remove response option ${index + 1}`}
                        disabled={options.length <= 1}
                        onClick={() => setOptions(prev => prev.filter((_, i) => i !== index))}
                      />
                    )}
                  </div>
                ))}
              </div>
              {responseEditable && (
                <div className="mt-3">
                  <ButtonWidget
                    label="ADD OPTION"
                    style="OUTLINE"
                    color="ACCENT"
                    size="SMALL"
                    icon="Plus"
                    iconPosition="START"
                    onClick={() => setOptions(prev => [...prev, ''])}
                  />
                </div>
              )}
            </div>

            {!responseEditable && (
              <div className="lg:col-span-2">
                <MessageBanner
                  primaryText="Responses cannot be edited"
                  secondaryText="Responses can only be edited while a question is pending."
                  backgroundColor="INFO"
                  highlightColor="INFO"
                  icon="info"
                  showDecorativeBar={false}
                  marginBelow="NONE"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 pt-4 mt-8">
          <ButtonWidget label="CANCEL" style="OUTLINE" color="ACCENT" onClick={onClose} />
          <ButtonWidget
            label={isNew ? 'CREATE QUESTION' : 'UPDATE QUESTION'}
            style="SOLID"
            color="ACCENT"
            disabled={!canSave}
            onClick={handleSave}
          />
        </div>
      </div>
    </DialogField>
  )
}
