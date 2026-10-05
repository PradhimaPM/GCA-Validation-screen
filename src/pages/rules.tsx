import { useState, useEffect, useMemo } from 'react'
import {
  SiteNav,
  TabsField,
  HeadingField,
  CardLayout,
  ReadOnlyGrid,
  GridColumn,
  ButtonWidget,
  ButtonArrayLayout,
  TextField,
  DropdownField,
  RichTextDisplayField,
  TextItem,
  TagField,
} from '@pglevy/sailwind'
import {
  LayoutGrid,
  List,
  Layers,
  CircleHelp,
  Shuffle,
} from 'lucide-react'
import {
  getRules,
  formatRuleTimestamp,
  formatRuleConditions,
  type Rule,
} from '../db/rules'

const navPages = [
  { label: 'Clause Sets', icon: LayoutGrid },
  { label: 'Clauses', icon: List },
  { label: 'Templates', icon: Layers },
  { label: 'Questionnaires', icon: CircleHelp },
  { label: 'Rules', icon: Shuffle, isSelected: true },
]

const statusChoices = ['Active', 'Draft']

const statusTagColors: Record<Rule['status'], { background: string; text: string }> = {
  Active: { background: '#D7F3E0', text: '#166534' },
  Draft: { background: '#DEDAFB', text: '#3730A3' },
}

export default function Rules() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Any')
  const [activeTab, setActiveTab] = useState('option-1')

  useEffect(() => {
    getRules().then(data => {
      setRules(data)
      setLoading(false)
    })
  }, [])

  const filteredRules = useMemo(() => {
    const term = appliedSearch.trim().toLowerCase()
    return rules.filter(rule => {
      const matchesSearch = term === '' || rule.name.toLowerCase().includes(term)
      const matchesStatus = statusFilter === 'Any' || rule.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [rules, appliedSearch, statusFilter])

  const handleSearch = () => setAppliedSearch(searchInput)

  const handleRefresh = async () => {
    setSearchInput('')
    setAppliedSearch('')
    setStatusFilter('Any')
    setRules(await getRules())
  }

  return (
    <div className="flex h-screen bg-white">
      <SiteNav
        displayName="Clause Automation"
        pages={navPages}
        userName="Arun Ganesh"
        appianLogoSrc="/images/icon-appian-header.png"
        highlightColor="#C7C4F4"
      />

      <main className="flex-1 overflow-y-auto border-l border-gray-200">
        <TabsField
          tabs={[
            { value: 'option-1', label: 'Option 1' },
            { value: 'option-2', label: 'Option 2' },
            { value: 'option-3', label: 'Option 3' },
          ]}
          value={activeTab}
          onValueChange={setActiveTab}
          variant="UNDERLINE"
          navigationOnly={true}
          fullWidthSeparator={true}
        />

        <div className="px-8 py-6">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <HeadingField
                text="Rules"
                size="LARGE"
                headingTag="H1"
                fontWeight="REGULAR"
                marginBelow="EVEN_LESS"
              />
              <RichTextDisplayField
                value={[
                  <TextItem
                    key="subtitle"
                    text="Create conditional rules to include or exclude clauses based on clause set data"
                    color="SECONDARY"
                    size="STANDARD"
                  />,
                ]}
                marginBelow="NONE"
              />
            </div>

            <div className="shrink-0">
              <ButtonArrayLayout
                align="END"
                buttons={[
                  {
                    label: 'Create Rule',
                    style: 'OUTLINE',
                    color: 'ACCENT',
                    icon: 'Plus',
                    iconPosition: 'START',
                    onClick: () => alert('Create Rule is not wired up in this prototype.'),
                  },
                  {
                    label: 'Create Rules with AI',
                    style: 'SOLID',
                    color: 'ACCENT',
                    icon: 'Sparkles',
                    iconPosition: 'START',
                    onClick: () => alert('Create Rules with AI is not wired up in this prototype.'),
                  },
                ]}
              />
            </div>
          </div>

          <CardLayout padding="STANDARD" showBorder={true} shape="SEMI_ROUNDED">
            <div className="flex items-center gap-3 mb-4 flex-nowrap">
              <div className="w-64 shrink-0">
                <TextField
                  label="Search Rules"
                  labelPosition="COLLAPSED"
                  placeholder="Search Rules"
                  value={searchInput}
                  saveInto={setSearchInput}
                  marginBelow="NONE"
                />
              </div>

              <ButtonWidget
                label="SEARCH"
                style="OUTLINE"
                color="ACCENT"
                onClick={handleSearch}
              />

              <div className="w-60 shrink-0">
                <DropdownField
                  label="STATUS"
                  labelPosition="ADJACENT"
                  placeholder="Any"
                  choiceLabels={statusChoices}
                  choiceValues={statusChoices}
                  value={statusFilter === 'Any' ? null : statusFilter}
                  saveInto={value => setStatusFilter(value ?? 'Any')}
                  marginBelow="NONE"
                />
              </div>

              <div className="ml-auto flex items-center gap-2 shrink-0">
                <ButtonWidget
                  style="OUTLINE"
                  color="SECONDARY"
                  icon="Download"
                  tooltip="Export"
                  accessibilityText="Export"
                  onClick={() => alert('Export is not wired up in this prototype.')}
                />
                <ButtonWidget
                  style="OUTLINE"
                  color="SECONDARY"
                  icon="Filter"
                  tooltip="Filter"
                  accessibilityText="Filter"
                  onClick={() => alert('Filter is not wired up in this prototype.')}
                />
                <ButtonWidget
                  style="OUTLINE"
                  color="SECONDARY"
                  icon="RefreshCw"
                  tooltip="Refresh"
                  accessibilityText="Refresh"
                  onClick={handleRefresh}
                />
              </div>
            </div>

            <ReadOnlyGrid
              data={filteredRules}
              pageSize={10}
              pagingControls="ROW_COUNT"
              borderStyle="LIGHT"
              rowHeader={0}
              initialSorts={[{ field: 'lastUpdated', ascending: false }]}
              emptyGridMessage={
                loading ? 'Loading rules...' : 'No rules match your search.'
              }
              accessibilityText="Rules that include or exclude clauses based on clause set data"
            >
              <GridColumn label="Name" sortField="name" width="WIDE" value="name" />
              <GridColumn
                label="Status"
                sortField="status"
                width="NARROW"
                value={(row: Rule) => (
                  <TagField
                    size="SMALL"
                    tags={[
                      {
                        text: row.status,
                        backgroundColor: statusTagColors[row.status].background,
                        textColor: statusTagColors[row.status].text,
                      },
                    ]}
                    marginBelow="NONE"
                  />
                )}
              />
              <GridColumn label="Source" sortField="source" width="NARROW" value="source" />
              <GridColumn
                label="Conditions"
                sortField="conditions"
                width="MEDIUM"
                value={(row: Rule) => formatRuleConditions(row)}
              />
              <GridColumn
                label="Included Clauses"
                sortField="includedClauses"
                width="NARROW"
                align="CENTER"
                value="includedClauses"
              />
              <GridColumn
                label="Excluded Clauses"
                sortField="excludedClauses"
                width="NARROW"
                align="CENTER"
                value="excludedClauses"
              />
              <GridColumn
                label="Last Updated"
                sortField="lastUpdated"
                width="MEDIUM_PLUS"
                value={(row: Rule) => (
                  <RichTextDisplayField
                    value={[
                      <TextItem key="updated" text={formatRuleTimestamp(row.lastUpdated)} />,
                    ]}
                    preventWrapping={true}
                    marginBelow="NONE"
                  />
                )}
              />
              <GridColumn
                label=""
                width="ICON"
                align="CENTER"
                value={(row: Rule) => (
                  <ButtonWidget
                    style="GHOST"
                    color="SECONDARY"
                    size="SMALL"
                    icon="EllipsisVertical"
                    tooltip="Row actions"
                    accessibilityText={`Actions for ${row.name}`}
                    onClick={() => alert(`Row actions for ${row.name}`)}
                  />
                )}
              />
            </ReadOnlyGrid>
          </CardLayout>
        </div>
      </main>
    </div>
  )
}
