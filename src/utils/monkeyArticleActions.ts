import { translate } from '@/locales/translate'

import {
  showErrorMessage,
  showSuccessMessage,
  showWarningMessage,
} from './elementMessage'

import type { MonkeyArticle } from '@/types/monkeyArticle'

export async function copyMonkeyArticle(article: MonkeyArticle | null) {
  if (!article) return
  try {
    await navigator.clipboard.writeText(
      `${article.title}\n\n${article.content}`
    )
    showSuccessMessage(translate('monkeyTypewriter.copied'))
  } catch {
    showWarningMessage(translate('monkeyTypewriter.copyFailed'))
  }
}

function triggerDownload(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
}

export function downloadMonkeyArticle(article: MonkeyArticle | null) {
  if (!article) return
  const url = URL.createObjectURL(
    new Blob([`${article.title}\n${article.createdAt}\n\n${article.content}`], {
      type: 'text/plain;charset=utf-8',
    })
  )
  try {
    triggerDownload(url, `monkey-${article.id}.txt`)
    showSuccessMessage(translate('monkeyTypewriter.downloaded'))
  } catch {
    showErrorMessage(translate('monkeyTypewriter.downloadFailed'))
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

export async function shareMonkeyArticleImage(file: File, title: string) {
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title })
      showSuccessMessage(translate('monkeyTypewriter.shareOpened'))
      return
    } catch (cause) {
      if (cause instanceof Error && cause.name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(file)
  try {
    triggerDownload(url, file.name)
    showWarningMessage(translate('monkeyTypewriter.shareFallback'))
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
