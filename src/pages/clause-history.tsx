import { useState, useEffect } from 'react'
import {
  HeadingField,
  TabsField,
  CardLayout,
  ReadOnlyGrid,
  GridColumn,
  RichTextDisplayField,
  TextItem,
} from '@pglevy/sailwind'
import AppNav from '../components/app-nav'
import ClauseTextChangesDialog from '../components/clause-text-changes-dialog'
import ClauseTextChangesPane from '../components/clause-text-changes-pane'
import {
  getClauseHistory,
  formatClauseHistoryTimestamp,
  type ClauseHistoryEntry,
} from '../db/clause-history'
import { getDisplayName } from '../db/users'

/** Option 1 shows the changes in a pop-up. Option 2 shows them in a side pane next to the list.
 * Option 3 uses the same side pane with one inline marked-up view and a switch for updated only or original only. */
type ViewOption = 'option-1' | 'option-2' | 'option-3'

export default function ClauseHistory() {
  const [entries, setEntries] = useState<ClauseHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewOption>('option-1')
  const [openEntry, setOpenEntry] = useState<ClauseHistoryEntry | null>(null)

  useEffect(() => {
    getClauseHistory().then(data => {
      setEntries(data)
      setLoading(false)
    })
  }, [])

  const clauseName = entries[0]?.clauseName ?? ''

  /** In the side pane option, the row whose changes are open is shaded so it's clear which one the pane shows. */
  const rowShade = (row: ClauseHistoryEntry) =>
    view !== 'option-1' && openEntry?.id === row.id ? '#EFF6FF' : '#FFFFFF'

  /** Adds "Added 3 Fill-in(s) and Removed 1 Fill-in(s)" style text for an entry, or null when there are no fill-in changes. */
  const renderFillIns = (entry: ClauseHistoryEntry) => {
    const { fillInsAdded, fillInsRemoved } = entry
    if (!fillInsAdded && !fillInsRemoved) return null
    const parts = []
    if (fillInsAdded) {
      parts.push(
        <TextItem key="added" text="Added" color="POSITIVE" style="STRONG" />,
        <TextItem key="added-count" text={` ${fillInsAdded} Fill-in(s)`} />,
      )
    }
    if (fillInsAdded && fillInsRemoved) parts.push(<TextItem key="and" text=" and " />)
    if (fillInsRemoved) {
      parts.push(
        <TextItem key="removed" text="Removed" color="NEGATIVE" style="STRONG" />,
        <TextItem key="removed-count" text={` ${fillInsRemoved} Fill-in(s)`} />,
      )
    }
    return (
      <RichTextDisplayField
        value={[<TextItem key="bullet" text="•  " />, ...parts]}
        marginBelow="NONE"
      />
    )
  }

  return (
    <div className="flex h-screen bg-white">
      <AppNav selected="Clauses" />

      <main className="flex-1 overflow-y-auto border-l border-gray-200">
        <div className="px-8 pt-6 pb-8">
          <HeadingField
            text={clauseName}
            size="LARGE"
            headingTag="H1"
            fontWeight="SEMI_BOLD"
            marginBelow="LESS"
          />

          <TabsField
            tabs={[
              { value: 'summary', label: 'Summary' },
              { value: 'reporting', label: 'Reporting' },
              { value: 'history', label: 'Clause History' },
            ]}
            value="history"
            variant="PILL"
            size="SMALL"
            density="DENSE"
            navigationOnly={true}
            marginBelow="STANDARD"
          />

          <CardLayout padding="STANDARD" showBorder={false} showShadow={true} shape="SEMI_ROUNDED">
            <TabsField
              tabs={[
                { value: 'option-1', label: 'Option 1: Pop-up' },
                { value: 'option-2', label: 'Option 2: Side pane' },
                { value: 'option-3', label: 'Option 3: Inline changes' },
              ]}
              value={view}
              onValueChange={value => {
                setView(value as ViewOption)
                setOpenEntry(null)
              }}
              variant="UNDERLINE"
              navigationOnly={true}
              fullWidthSeparator={true}
              marginBelow="STANDARD"
            />
            <ReadOnlyGrid
              data={entries}
              pageSize={20}
              pagingControls="ROW_COUNT"
              borderStyle="LIGHT"
              rowHeader={0}
              initialSorts={[{ field: 'modifiedAt', ascending: false }]}
              emptyGridMessage={loading ? 'Loading clause history...' : 'No changes have been made to this clause.'}
              accessibilityText="Clause history, with the user, the modification, and the time of each change"
            >
              <GridColumn
                label="User"
                sortField="modifiedBy"
                width="3X"
                backgroundColor={rowShade}
                value={(row: ClauseHistoryEntry) => getDisplayName(row.modifiedBy)}
              />
              <GridColumn
                label="Modification"
                width="7X"
                backgroundColor={rowShade}
                value={(row: ClauseHistoryEntry) => (
                  <div className="py-1">
                    <RichTextDisplayField
                      value={[
                        <TextItem
                          key="type"
                          text={row.modificationType}
                          color={row.modificationType === 'Added' ? 'POSITIVE' : 'BLUE_700'}
                          style="STRONG"
                        />,
                        <TextItem key="the-clause" text=" the Clause" />,
                      ]}
                      marginBelow="NONE"
                    />
                    <div className="pl-3">
                      {row.textChange && (
                        <RichTextDisplayField
                          value={[
                            <TextItem key="bullet" text="•  Edited Clause Text (" />,
                            <TextItem
                              key="show"
                              text="Show Changes"
                              color="ACCENT"
                              link={() => setOpenEntry(row)}
                              linkStyle="INLINE"
                            />,
                            <TextItem key="close" text=")" />,
                          ]}
                          marginBelow="NONE"
                        />
                      )}
                      {renderFillIns(row)}
                      {row.modificationType === 'Added' && (
                        <RichTextDisplayField
                          value={[<TextItem key="name" text={`•  ${row.clauseName}`} />]}
                          marginBelow="NONE"
                        />
                      )}
                    </div>
                  </div>
                )}
              />
              <GridColumn
                label="Time"
                sortField="modifiedAt"
                width="3X"
                align="END"
                backgroundColor={rowShade}
                value={(row: ClauseHistoryEntry) => formatClauseHistoryTimestamp(row.modifiedAt)}
              />
            </ReadOnlyGrid>
          </CardLayout>
        </div>
      </main>

      {view !== 'option-1' && openEntry?.textChange && (
        <ClauseTextChangesPane
          key={`${view}-${openEntry.id}`}
          mode={view === 'option-3' ? 'views' : 'checkbox'}
          entry={openEntry}
          change={openEntry.textChange}
          onClose={() => setOpenEntry(null)}
        />
      )}

      {view === 'option-1' && openEntry?.textChange && (
        <ClauseTextChangesDialog change={openEntry.textChange} onClose={() => setOpenEntry(null)} />
      )}
    </div>
  )
}
