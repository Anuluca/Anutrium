export const copyText = async (text: string) => {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // 浏览器权限策略可能拦截 Clipboard API，继续使用兼容方案。
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}
