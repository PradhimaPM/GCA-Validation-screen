/** Accept filter for the file picker. Users can bypass it, so also check with `isExcelFile`. */
export const EXCEL_ACCEPT =
  '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel'

export const isExcelFile = (file: File) => /\.(xlsx|xls)$/i.test(file.name)
