import {
  ElMessageBox,
  type ElMessageBoxOptions,
  type MessageBoxData,
} from 'element-plus'

import { setSmoothScrollLocked } from './smoothScroll'

import 'element-plus/es/components/message-box/style/css'

let messageBoxSequence = 0

export const confirmWithoutPageShift = async (
  message: ElMessageBoxOptions['message'],
  title: ElMessageBoxOptions['title'],
  options: ElMessageBoxOptions = {}
): Promise<MessageBoxData> => {
  const scrollLockKey = `scroll-safe-message-box-${++messageBoxSequence}`
  setSmoothScrollLocked(scrollLockKey, true)

  try {
    return await ElMessageBox.confirm(message, title, {
      ...options,
      lockScroll: false,
    })
  } finally {
    setSmoothScrollLocked(scrollLockKey, false)
  }
}
