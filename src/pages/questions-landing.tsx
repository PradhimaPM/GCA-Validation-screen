import { useState, useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'wouter'
import {
  HeadingField,
  CardLayout,
  ButtonWidget,
  FileCard,
  MessageBanner,
  RichTextDisplayField,
  TextItem,
} from '@pglevy/sailwind'
import { Library, PencilLine } from 'lucide-react'
import QuestionsShell from '../components/questions-shell'
import {
  getQuestionImportOptions,
  type QuestionImportOption,
} from '../db/question-import-options'
import { importSystemQuestions, importCustomQuestions } from '../db/questions'
import { EXCEL_ACCEPT, isExcelFile } from '../lib/excel-file'

const optionIcons: Record<QuestionImportOption['key'], ReactNode> = {
  SYSTEM: <Library size={28} aria-hidden="true" />,
  MANUAL: <PencilLine size={28} aria-hidden="true" />,
}

const optionButtonIcons: Record<QuestionImportOption['key'], string> = {
  SYSTEM: 'Download',
  MANUAL: 'Upload',
}

/** Description color per option. The manual option uses a lighter shade. */
const optionDescriptionColors: Record<QuestionImportOption['key'], 'SECONDARY' | 'GRAY_500'> = {
  SYSTEM: 'SECONDARY',
  MANUAL: 'GRAY_500',
}

export default function QuestionsLanding() {
  const [options, setOptions] = useState<QuestionImportOption[]>([])
  const [, setLocation] = useLocation()
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getQuestionImportOptions().then(setOptions)
  }, [])

  const handleOptionClick = (option: QuestionImportOption) => {
    if (option.key === 'SYSTEM') {
      importSystemQuestions().then(() => setLocation('/questions-review'))
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (isExcelFile(file)) {
        setExcelFile(file)
        setFileError(false)
      } else {
        setFileError(true)
      }
    }
    // Reset so choosing the same file again still fires onChange.
    event.target.value = ''
  }

  return (
    <QuestionsShell>
        <div className="px-8 py-12">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <HeadingField
                text="Add your first questions"
                size="LARGE_PLUS"
                headingTag="H1"
                fontWeight="REGULAR"
                align="CENTER"
                marginBelow="EVEN_LESS"
              />
              <RichTextDisplayField
                align="CENTER"
                value={[
                  <TextItem
                    key="subtitle"
                    text="You haven't added any questions yet. Choose how you want to get started."
                    color="SECONDARY"
                    size="MEDIUM_PLUS"
                  />,
                ]}
                marginBelow="NONE"
              />
            </div>

            {fileError && (
              <div className="max-w-xl mx-auto mb-6">
                <MessageBanner
                  primaryText="File must be an Excel file (.xlsx or .xls)."
                  secondaryText="Choose a different file and try again."
                  backgroundColor="ERROR"
                  highlightColor="NEGATIVE"
                  icon="error"
                  announceBehavior="DISPLAY_AND_ANNOUNCE"
                  showCloseButton={true}
                  onClose={() => setFileError(false)}
                  marginBelow="NONE"
                />
              </div>
            )}

            <div className="flex flex-col gap-6 max-w-xl mx-auto">
              {options.map(option => (
                <CardLayout
                  key={option.id}
                  padding="MORE"
                  showBorder={true}
                  showShadow={false}
                  shape="SEMI_ROUNDED"
                  height="AUTO"
                >
                  <div className="flex flex-col items-center text-center h-full">
                    <div
                      className="flex items-center justify-center w-16 h-16 rounded-full mb-4"
                      style={{ backgroundColor: '#E8E7FD', color: '#2322F0' }}
                    >
                      {optionIcons[option.key]}
                    </div>
                    <HeadingField
                      text={option.title}
                      size="MEDIUM_PLUS"
                      headingTag="H2"
                      fontWeight="SEMI_BOLD"
                      align="CENTER"
                      marginBelow="EVEN_LESS"
                    />
                    <div className="mb-6 flex-1">
                      <RichTextDisplayField
                        align="CENTER"
                        value={[
                          <TextItem
                            key="desc"
                            text={option.description}
                            color={optionDescriptionColors[option.key]}
                            size="MEDIUM"
                          />,
                        ]}
                        marginBelow="NONE"
                      />
                    </div>
                    <ButtonWidget
                      label={option.buttonLabel}
                      style={option.key === 'SYSTEM' ? 'SOLID' : 'OUTLINE'}
                      color="ACCENT"
                      size="MEDIUM"
                      icon={optionButtonIcons[option.key]}
                      iconPosition="START"
                      onClick={() => handleOptionClick(option)}
                    />
                  </div>
                </CardLayout>
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={EXCEL_ACCEPT}
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload Excel sheet"
              tabIndex={-1}
            />

            {excelFile && (
              <div className="mt-8 max-w-xl mx-auto">
                <CardLayout padding="STANDARD" showBorder={true} showShadow={false} shape="SEMI_ROUNDED">
                  <HeadingField
                    text="Ready to import"
                    size="SMALL"
                    headingTag="H2"
                    fontWeight="SEMI_BOLD"
                    marginBelow="LESS"
                  />
                  <FileCard
                    fileName={excelFile.name}
                    fileSize={excelFile.size}
                    showRemove={true}
                    onRemove={() => setExcelFile(null)}
                  />
                  <div className="mt-4 flex justify-end">
                    <ButtonWidget
                      label="Import questions"
                      style="SOLID"
                      color="ACCENT"
                      onClick={async () => {
                        await importCustomQuestions(excelFile.name, 'john.smith')
                        setLocation('/questions')
                      }}
                    />
                  </div>
                </CardLayout>
              </div>
            )}
          </div>
        </div>
    </QuestionsShell>
  )
}
