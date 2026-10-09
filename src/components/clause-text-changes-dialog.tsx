import { DialogField, ButtonWidget, CardLayout, HeadingField } from '@pglevy/sailwind'
import type { ClauseTextChange } from '../db/clause-history'
import { OriginalTextView, UpdatedTextView } from './clause-change-views'

interface ClauseTextChangesDialogProps {
  change: ClauseTextChange
  onClose: () => void
}

const paneStyle = { height: 'calc(75vh - 17rem)', minHeight: '12rem' }

/** Side-by-side view of the original clause text and the updated text, with what was removed and added. */
export default function ClauseTextChangesDialog({ change, onClose }: ClauseTextChangesDialogProps) {
  return (
    <DialogField
      open={true}
      onOpenChange={open => {
        if (!open) onClose()
      }}
      title="Edited clause text"
      description="Review the references below"
      width="FIT"
      marginBelow="NONE"
    >
      <div className="dialog-size-75 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <HeadingField
            text="Original text"
            size="SMALL"
            headingTag="H3"
            fontWeight="SEMI_BOLD"
            marginBelow="EVEN_LESS"
          />
          <CardLayout padding="STANDARD" showBorder={true} showShadow={false} shape="SEMI_ROUNDED">
            <div className="overflow-y-auto" style={paneStyle}>
              <OriginalTextView change={change} />
            </div>
          </CardLayout>
        </div>

        <div>
          <HeadingField
            text="Updated text"
            size="SMALL"
            headingTag="H3"
            fontWeight="SEMI_BOLD"
            marginBelow="EVEN_LESS"
          />
          <CardLayout padding="STANDARD" showBorder={true} showShadow={false} shape="SEMI_ROUNDED">
            <div className="overflow-y-auto" style={paneStyle}>
              <UpdatedTextView change={change} />
            </div>
          </CardLayout>
        </div>
      </div>

      <div className="flex justify-end border-t border-gray-200 pt-4 mt-6">
        <ButtonWidget label="Close" style="OUTLINE" color="SECONDARY" onClick={onClose} />
      </div>
    </DialogField>
  )
}
