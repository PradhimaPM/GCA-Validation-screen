import { RichTextDisplayField, TextItem } from '@pglevy/sailwind'
import { segmentsToParagraphs, type ChangeSegment, type ClauseTextChange } from '../db/clause-history'

/*
 * Shared views of an edited clause. The pop-up and the side pane both use these,
 * so the two options always show the same text with the same colors.
 */

/** One paragraph of clause text, with removed and added runs marked when the paragraph has any. */
export function ChangeParagraph({ segments }: { segments: ChangeSegment[] }) {
  return (
    <RichTextDisplayField
      value={segments.map((segment, index) =>
        segment.type === 'removed' ? (
          <TextItem key={index} text={segment.text} color="NEGATIVE" style="STRIKETHROUGH" />
        ) : segment.type === 'added' ? (
          <TextItem key={index} text={segment.text} color="POSITIVE" />
        ) : (
          <TextItem key={index} text={segment.text} color="SECONDARY" />
        ),
      )}
      marginBelow="STANDARD"
    />
  )
}

/** Key to the changes, pinned to the top of the updated text. Each sample is styled exactly like the text it describes. */
export function ChangeLegend() {
  return (
    <div className="sticky top-0 z-10 bg-white pb-4">
      <div
        className="flex flex-wrap items-center gap-x-8 gap-y-1 rounded-md border border-gray-200 bg-gray-50 px-4 py-2"
        role="group"
        aria-label="Key to the changes: removed text and added text"
      >
        <RichTextDisplayField
          value={[
            <TextItem key="label" text="Text removed: " color="SECONDARY" />,
            <TextItem key="sample" text="removed text" color="NEGATIVE" style="STRIKETHROUGH" />,
          ]}
          marginBelow="NONE"
        />
        <RichTextDisplayField
          value={[
            <TextItem key="label" text="Text added: " color="SECONDARY" />,
            <TextItem key="sample" text="added text" color="POSITIVE" />,
          ]}
          marginBelow="NONE"
        />
      </div>
    </div>
  )
}

/** The clause text before the edit, as read-only paragraphs. */
export function OriginalTextView({ change }: { change: ClauseTextChange }) {
  return (
    <>
      {segmentsToParagraphs([{ type: 'unchanged', text: change.originalText }]).map((paragraph, index) => (
        <ChangeParagraph key={index} segments={paragraph} />
      ))}
    </>
  )
}

/**
 * The clause text after the edit. Edits that carry tracked changes show the key and
 * the marked-up text. Older, short edits show the original with the removed and added text listed.
 */
export function UpdatedTextView({ change }: { change: ClauseTextChange }) {
  if (change.changedSegments) {
    return (
      <>
        <ChangeLegend />
        {segmentsToParagraphs(change.changedSegments).map((paragraph, index) => (
          <ChangeParagraph key={index} segments={paragraph} />
        ))}
      </>
    )
  }

  return (
    <>
      <RichTextDisplayField
        value={[<TextItem key="changed" text={change.originalText} color="SECONDARY" />]}
        marginBelow="EVEN_LESS"
      />
      <RichTextDisplayField
        value={[
          <TextItem key="removed-label" text="Text removed: " style="STRONG" />,
          <TextItem key="removed" text={change.removedText ?? ''} color="NEGATIVE" />,
        ]}
        marginBelow="NONE"
      />
      <RichTextDisplayField
        value={[
          <TextItem key="added-label" text="Text added: " style="STRONG" />,
          <TextItem key="added" text={change.addedText ?? ''} color="POSITIVE" />,
        ]}
        marginBelow="NONE"
      />
    </>
  )
}

/**
 * The edit as one marked-up document. Tracked edits already carry their segments. Short edits
 * only store the removed and added snippets, so those are placed back into the original text
 * where the removed snippet sits. When the snippet can't be found, the original is shown whole
 * with the snippets listed after it.
 */
function buildInlineSegments(change: ClauseTextChange): ChangeSegment[] {
  if (change.changedSegments) return change.changedSegments

  const { originalText, removedText, addedText } = change
  const at = removedText ? originalText.indexOf(removedText) : -1
  if (removedText && at !== -1) {
    const segments: ChangeSegment[] = [
      { type: 'unchanged', text: originalText.slice(0, at) },
      { type: 'removed', text: removedText },
    ]
    if (addedText) segments.push({ type: 'added', text: addedText })
    segments.push({ type: 'unchanged', text: originalText.slice(at + removedText.length) })
    return segments.filter(segment => segment.text !== '')
  }

  const segments: ChangeSegment[] = [{ type: 'unchanged', text: originalText }]
  if (removedText) segments.push({ type: 'removed', text: `\n\n${removedText}` })
  if (addedText) segments.push({ type: 'added', text: `\n\n${addedText}` })
  return segments
}

/** Single-column view with removed text struck through and added text in green, in place. */
export function InlineChangesView({ change }: { change: ClauseTextChange }) {
  return (
    <>
      <ChangeLegend />
      {segmentsToParagraphs(buildInlineSegments(change)).map((paragraph, index) => (
        <ChangeParagraph key={index} segments={paragraph} />
      ))}
    </>
  )
}

/** The clause as it reads after the edit: removed text dropped, added text shown as plain text. */
export function UpdatedOnlyView({ change }: { change: ClauseTextChange }) {
  const finalSegments = buildInlineSegments(change)
    .filter(segment => segment.type !== 'removed')
    .map((segment): ChangeSegment => ({ type: 'unchanged', text: segment.text }))

  return (
    <>
      {segmentsToParagraphs(finalSegments).map((paragraph, index) => (
        <ChangeParagraph key={index} segments={paragraph} />
      ))}
    </>
  )
}
