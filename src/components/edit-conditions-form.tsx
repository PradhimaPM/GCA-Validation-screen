import {
  HeadingField,
  RadioButtonField,
  DropdownField,
  ButtonWidget,
  TextField,
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

/** Dropdown with a required label above. The built-in clear icon is hidden because every condition field needs a value. */
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
  return (
    <p className="my-4 text-xs font-semibold uppercase tracking-wide text-gray-600">{join}</p>
  )
}

const rowClass = 'grid grid-cols-[repeat(3,minmax(0,1fr))_2rem] items-start gap-x-4'

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

interface EditConditionsFormProps {
  name: string
  onNameChange: (name: string) => void
  content: RuleReviewContent
  onChange: (content: RuleReviewContent) => void
}

/**
 * Inline edit form for a rule's name and conditions. Mirrors the Appian rule
 * editor layout: Name field at the top, then a Match choice, then one block
 * per condition with labeled, required fields and AND/OR between them.
 *
 * Changes bubble up to the parent as they happen. The parent persists them
 * through the regular page footer (Save Draft / Accept).
 */
export default function EditConditionsForm({
  name,
  onNameChange,
  content,
  onChange,
}: EditConditionsFormProps) {
  const total = countConditions(content)

  const nextId = () =>
    Math.max(
      0,
      ...content.conditions.map(c => c.id),
      ...content.groups.flatMap(g => g.conditions.map(c => c.id)),
    ) + 1

  const mapList = (
    groupId: number | null,
    fn: (list: RuleCondition[]) => RuleCondition[],
  ) => {
    if (groupId === null) {
      onChange({ ...content, conditions: fn(content.conditions) })
    } else {
      onChange({
        ...content,
        groups: content.groups
          .map(g => (g.id === groupId ? { ...g, conditions: fn(g.conditions) } : g))
          .filter(g => g.conditions.length > 0),
      })
    }
  }

  const change = (groupId: number | null, next: RuleCondition) =>
    mapList(groupId, list => list.map(c => (c.id === next.id ? next : c)))
  const remove = (groupId: number | null, id: number) =>
    mapList(groupId, list => list.filter(c => c.id !== id))
  const add = (groupId: number | null) =>
    mapList(groupId, list => [...list, createCondition(nextId(), 'Contract Category')])

  const renderConditions = (
    groupId: number | null,
    list: RuleCondition[],
    join: ConditionJoin,
  ) =>
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
    <div className="space-y-6 px-5 py-5">
      <TextField
        label="Name"
        required={true}
        value={name}
        saveInto={onNameChange}
        marginBelow="NONE"
      />

      <div>
        <HeadingField
          text="Conditions"
          size="MEDIUM_PLUS"
          headingTag="H3"
          fontWeight="SEMI_BOLD"
          marginBelow="EVEN_LESS"
        />
        <p className="mb-4 text-xs text-gray-600">
          Ensure multiple conditions of the same clause data type aren&apos;t pointing to multiple
          different values
        </p>

        <div className="rounded-md border border-gray-200 bg-gray-50 p-5">
          <MatchRadio
            value={content.join}
            onChange={join => onChange({ ...content, join })}
          />
          <hr className="my-5 border-gray-200" />

          {renderConditions(null, content.conditions, content.join)}

          {content.groups.map((group, groupIndex) => (
            <div key={group.id}>
              {(content.conditions.length > 0 || groupIndex > 0) && (
                <Separator join={content.join} />
              )}
              <div className="rounded-md border border-gray-300 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <HeadingField
                    text={`Condition Group ${groupIndex + 1}`}
                    size="SMALL"
                    headingTag="H4"
                    fontWeight="SEMI_BOLD"
                    marginBelow="NONE"
                  />
                  <span className="text-xs text-gray-600">
                    {group.conditions.length} condition
                    {group.conditions.length === 1 ? '' : 's'} · {group.join}
                  </span>
                </div>
                <MatchRadio
                  value={group.join}
                  onChange={join =>
                    onChange({
                      ...content,
                      groups: content.groups.map(g =>
                        g.id === group.id ? { ...g, join } : g,
                      ),
                    })
                  }
                />
                <hr className="my-4 border-gray-200" />
                {renderConditions(group.id, group.conditions, group.join)}
                <div className="mt-4">{addButton(group.id)}</div>
              </div>
            </div>
          ))}

          <div className="mt-5">{addButton(null)}</div>
        </div>
      </div>
    </div>
  )
}
