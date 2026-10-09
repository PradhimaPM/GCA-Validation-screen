import { useEffect, useState } from 'react'
import { HeadingField, ButtonWidget, CheckboxField, TabsField } from '@pglevy/sailwind'
import {
  countChanges,
  formatClauseHistoryTimestamp,
  type ClauseHistoryEntry,
  type ClauseTextChange,
} from '../db/clause-history'
import { getDisplayName } from '../db/users'
import {
  InlineChangesView,
  OriginalTextView,
  UpdatedOnlyView,
  UpdatedTextView,
} from './clause-change-views'

interface ClauseTextChangesPaneProps {
  entry: ClauseHistoryEntry
  change: ClauseTextChange
  onClose: () => void
  /** 'checkbox' (Option 2) toggles to the original text. 'views' (Option 3) switches between inline changes, updated only and original only. */
  mode?: 'checkbox' | 'views'
}

type PaneView = 'changes' | 'updated' | 'original'

/**
 * Side pane for an edited clause. It sits beside the history list so the list stays
 * in view. A half-width pane is too narrow for two columns, so it shows the updated
 * text by default and a "Show original text" checkbox switches to the original text.
 */
export default function ClauseTextChangesPane({
  entry,
  change,
  onClose,
  mode = 'checkbox',
}: ClauseTextChangesPaneProps) {
  const [showOriginal, setShowOriginal] = useState(false)
  const [paneView, setPaneView] = useState<PaneView>('changes')
  const counts = countChanges(change)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <aside
      aria-label="Edited clause text"
      className="flex h-screen w-[46%] min-w-[26rem] max-w-[52rem] shrink-0 flex-col border-l border-gray-200 bg-white"
    >
      <div className="shrink-0 px-6 pt-5">
        <div className="flex items-start justify-between gap-4">
          <HeadingField
            text="Edited clause text"
            size="MEDIUM_PLUS"
            headingTag="H2"
            fontWeight="SEMI_BOLD"
            marginBelow="EVEN_LESS"
          />
          <ButtonWidget
            style="GHOST"
            color="SECONDARY"
            size="SMALL"
            icon="X"
            tooltip="Close"
            accessibilityText="Close edited clause text"
            onClick={onClose}
          />
        </div>
        <p className="text-sm text-gray-600">
          {getDisplayName(entry.modifiedBy)} • {formatClauseHistoryTimestamp(entry.modifiedAt)}
          {counts && ` • ${counts.removed} removed • ${counts.added} added`}
        </p>
      </div>

      {mode === 'views' ? (
        <div className="shrink-0 border-b border-gray-200 px-6 pb-3 pt-4">
          <TabsField
            tabs={[
              { value: 'changes', label: 'Changes' },
              { value: 'updated', label: 'Updated only' },
              { value: 'original', label: 'Original only' },
            ]}
            value={paneView}
            onValueChange={value => setPaneView(value as PaneView)}
            variant="PILL"
            size="SMALL"
            density="DENSE"
            navigationOnly={true}
            marginBelow="NONE"
          />
        </div>
      ) : (
        <div className="flex shrink-0 justify-end border-b border-gray-200 px-6 pb-3 pt-4">
          <CheckboxField
            label="Text version"
            labelPosition="COLLAPSED"
            choiceLabels={['Show original text']}
            choiceValues={['original']}
            value={showOriginal ? ['original'] : []}
            onChange={values => setShowOriginal(values.includes('original'))}
            marginBelow="NONE"
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-5">
        {mode === 'views' ? (
          paneView === 'changes' ? (
            <InlineChangesView change={change} />
          ) : paneView === 'updated' ? (
            <UpdatedOnlyView change={change} />
          ) : (
            <OriginalTextView change={change} />
          )
        ) : showOriginal ? (
          <OriginalTextView change={change} />
        ) : (
          <UpdatedTextView change={change} />
        )}
      </div>
    </aside>
  )
}
