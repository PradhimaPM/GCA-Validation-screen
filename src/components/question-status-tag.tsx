import { TagField } from '@pglevy/sailwind'
import type { QuestionStatus } from '../db/questions'

const statusTagColors: Record<QuestionStatus, { background: string; text: string }> = {
  Approved: { background: '#D7F3E0', text: '#166534' },
  Rejected: { background: '#FDE2E2', text: '#991B1B' },
  Pending: { background: '#E5E7EB', text: '#374151' },
}

/** Green for Approved, red for Rejected, grey for Pending. */
export default function QuestionStatusTag({ status }: { status: QuestionStatus }) {
  return (
    <TagField
      size="SMALL"
      tags={[
        {
          text: status,
          backgroundColor: statusTagColors[status].background,
          textColor: statusTagColors[status].text,
        },
      ]}
      marginBelow="NONE"
    />
  )
}
