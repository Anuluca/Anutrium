import { ElMessage } from 'element-plus'

import 'element-plus/theme-chalk/dark/css-vars.css'

import 'element-plus/es/components/message/style/css'

const DEFAULT_MESSAGE_OFFSET = 16
const MOBILE_HEADER_GAP = 12

const getMessageOffset = () => {
  if (typeof window === 'undefined' || window.innerWidth > window.innerHeight) {
    return DEFAULT_MESSAGE_OFFSET
  }

  const headerBottom =
    document
      .querySelector<HTMLElement>('.el-menu-layout-all')
      ?.getBoundingClientRect().bottom ?? 0

  return Math.ceil(
    Math.max(DEFAULT_MESSAGE_OFFSET, headerBottom + MOBILE_HEADER_GAP)
  )
}

export const showSuccessMessage = (message: string) =>
  ElMessage({ message, offset: getMessageOffset(), type: 'success' })

export const showErrorMessage = (message: string) =>
  ElMessage({ message, offset: getMessageOffset(), type: 'error' })
