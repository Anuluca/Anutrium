import { ElMessage } from 'element-plus'

import 'element-plus/theme-chalk/dark/css-vars.css'

import 'element-plus/es/components/message/style/css'

const DEFAULT_MESSAGE_OFFSET = 112
const messagePosition = {
  placement: 'bottom' as const,
  offset: DEFAULT_MESSAGE_OFFSET,
}

export const showSuccessMessage = (message: string) =>
  ElMessage({ message, ...messagePosition, type: 'success' })

export const showErrorMessage = (message: string) =>
  ElMessage({ message, ...messagePosition, type: 'error' })

export const showWarningMessage = (message: string) =>
  ElMessage({
    message,
    ...messagePosition,
    type: 'warning',
    grouping: true,
  })
