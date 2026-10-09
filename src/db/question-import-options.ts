/**
 * Question import options data layer.
 *
 * These are the ways a customer can add questions the first time they open the
 * Questions tab. Each option maps to one card on the landing page.
 */

export interface QuestionImportOption {
  id: number
  /** Stable key the page uses to pick an icon and wire up behavior. */
  key: 'SYSTEM' | 'MANUAL'
  title: string
  description: string
  buttonLabel: string
}

const questionImportOptions: QuestionImportOption[] = [
  {
    id: 1,
    key: 'SYSTEM',
    title: 'Import system questions',
    description: 'Add the standard questions that ship with the solution.',
    buttonLabel: 'Import system questions',
  },
  {
    id: 2,
    key: 'MANUAL',
    title: 'Import manually',
    description: 'Upload a spreadsheet to add many questions at once.',
    buttonLabel: 'Import manually',
  },
]

export async function getQuestionImportOptions(): Promise<QuestionImportOption[]> {
  return questionImportOptions
}

export async function getQuestionImportOption(id: number): Promise<QuestionImportOption | undefined> {
  return questionImportOptions.find(o => o.id === id)
}
