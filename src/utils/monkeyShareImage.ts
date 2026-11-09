import { toBlob } from 'html-to-image'
import QRCode from 'qrcode'

export const MONKEY_SHARE_URL =
  'https://anuluca.com/laboratory/monkey-typewriter'
const resources = new Map<string, Promise<string>>()

async function inlineResource(url: string): Promise<string> {
  if (url.startsWith('data:')) return url
  if (resources.has(url)) return resources.get(url)!
  const promise = (async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000)
    let blob: Blob
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error('分享图片素材加载失败，请重试。')
      blob = await response.blob()
    } finally {
      clearTimeout(timeout)
    }
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('分享素材读取失败。'))
      reader.readAsDataURL(blob)
    })
  })().catch((error) => {
    resources.delete(url)
    throw error
  })
  resources.set(url, promise)
  return promise
}
function covers(range: string, text: string) {
  if (!range) return true
  return range.split(',').some((part) => {
    const [low, high] = part.trim().replace(/^U\+/i, '').split('-')
    const start = parseInt(low.replace(/\?/g, '0'), 16)
    const end = parseInt((high || low).replace(/\?/g, 'F'), 16)
    return Array.from(text).some((letter) => {
      const code = letter.codePointAt(0)!
      return code >= start && code <= end
    })
  })
}
// 只嵌入导出内容实际使用的字体分片，避免下载整个 Unicode 字库。
async function exportFonts(root: HTMLElement) {
  const used = new Map<string, string>()
  for (const node of [
    root,
    ...Array.from(root.querySelectorAll<HTMLElement>('*')),
  ]) {
    const text = Array.from(node.childNodes)
      .filter((child) => child.nodeType === Node.TEXT_NODE)
      .map((child) => child.textContent || '')
      .join('')
    if (!text.trim()) continue
    for (const family of getComputedStyle(node).fontFamily.split(',')) {
      const key = family.trim().replace(/["']/g, '')
      used.set(key, (used.get(key) || '') + text)
    }
  }
  const faces: CSSFontFaceRule[] = []
  function visit(sheet: CSSStyleSheet) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule.type === CSSRule.FONT_FACE_RULE)
          faces.push(rule as CSSFontFaceRule)
        if (
          rule.type === CSSRule.IMPORT_RULE &&
          (rule as CSSImportRule).styleSheet
        )
          visit((rule as CSSImportRule).styleSheet!)
      }
    } catch {
      /* 跨域第三方样式不参与当前页面字体导出。 */
    }
  }
  Array.from(document.styleSheets).forEach(visit)
  const css = await Promise.all(
    faces
      .filter((face) => {
        const family = face.style.fontFamily.replace(/["']/g, '').trim()
        return (
          used.has(family) &&
          covers(
            face.style.getPropertyValue('unicode-range'),
            used.get(family)!
          )
        )
      })
      .map(async (face) => {
        let css = face.cssText
        for (const match of Array.from(
          css.matchAll(/url\(["']?([^"')]+)["']?\)/g)
        )) {
          const url = new URL(
            match[1],
            face.parentStyleSheet?.href || location.href
          ).href
          css = css.replace(match[0], `url("${await inlineResource(url)}")`)
        }
        return css
      })
  )
  return css.join('\n')
}
function freezeStyles(root: HTMLElement) {
  // 固化最终样式后移除业务类名，后台制图副本不会被页面查询器误认成现场元素。
  for (const frame of Array.from(
    root.querySelectorAll<HTMLElement>('.manuscript-frame')
  )) {
    for (const pseudo of ['::before', '::after']) {
      const style = getComputedStyle(frame, pseudo)
      const corner = document.createElement('span')
      for (const property of Array.from(style))
        corner.style.setProperty(property, style.getPropertyValue(property))
      corner.style.content = ''
      frame.append(corner)
    }
  }
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
  const styles = nodes.map((node) => {
    const style = getComputedStyle(node)
    return Array.from(style).map((property) => [
      property,
      style.getPropertyValue(property),
    ])
  })
  nodes.forEach((node, index) => {
    for (const [property, value] of styles[index])
      node.style.setProperty(property, value)
    node.removeAttribute('class')
  })
}
function setStyle(
  node: HTMLElement | null,
  styles: Partial<CSSStyleDeclaration>
) {
  if (node) Object.assign(node.style, styles)
}

/** 在独立副本内重排真实页面元素，全文展开，不改动现场 DOM、滚动位置及已输入内容。 */
export async function createMonkeyShareImage(
  root: HTMLElement,
  title: string,
  content: string
): Promise<File> {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.setAttribute('inert', '')
  host.dataset.monkeyShareExport = ''
  Object.assign(host.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    width: '1600px',
    pointerEvents: 'none',
  })
  const picture = document.createElement('div')
  picture.className = 'monkey-share-picture no-rem'
  Object.assign(picture.style, {
    width: '1600px',
    background: '#050505',
    color: '#fffff4',
    fontFamily: "'alibaba-puhuiti', sans-serif",
    paddingTop: '40px',
  })
  const theme =
    getComputedStyle(root).getPropertyValue('--accent').trim() || '#e23456'
  // 保留当前主题及页面色彩变量，不依赖导出容器所在位置。
  const computed = getComputedStyle(root)
  for (const property of Array.from(computed))
    if (property.startsWith('--'))
      picture.style.setProperty(property, computed.getPropertyValue(property))
  const heading = document.createElement('header')
  heading.style.cssText = 'text-align:center;padding:0 90px 20px;'
  const label = document.createElement('div')
  label.textContent = '// LABORATORY'
  label.style.cssText = `font:900 18px/1.5 UnboundedSans,sans-serif;color:${theme};`
  const pageTitle = document.createElement('h1')
  pageTitle.textContent = '猴子打字'
  pageTitle.style.cssText = `font:900 64px/1.2 'alibaba-puhuiti',sans-serif;color:${theme};margin:0;`
  heading.append(label, pageTitle)
  const clone = root.cloneNode(true) as HTMLElement
  clone.classList.remove('is-intro', 'is-typing')
  clone
    .querySelectorAll(
      '.paper-projection, .babel-entrance, .draft-actions, .lab-feedback, .babel-library, .library-button, button, canvas, .page-scroll-progress'
    )
    .forEach((node) => node.remove())
  for (const node of [
    clone,
    ...Array.from(clone.querySelectorAll<HTMLElement>('*')),
  ]) {
    node.classList.remove(
      'crt-effect-enter-active',
      'crt-effect-enter-from',
      'crt-effect-enter-to'
    )
    node.style.setProperty('animation', 'none', 'important')
    node.style.setProperty('transition', 'none', 'important')
  }
  setStyle(clone, {
    width: '1600px',
    height: 'auto',
    padding: '0 90px',
    display: 'flex',
    background: 'transparent',
  })
  setStyle(clone.querySelector('.photo-header'), {
    flex: 'none',
    height: '290px',
    transition: 'none',
  })
  setStyle(clone.querySelector('.photo-composition'), {
    width: '360px',
    transform: 'translate(-50%, -50%)',
    transition: 'none',
  })
  const photo = clone.querySelector<HTMLElement>('.typewriter-photo')!
  photo.classList.remove('is-fuzzy-ready')
  setStyle(photo, { margin: '0', filter: 'none' })
  const image = photo.querySelector<HTMLImageElement>('img')!
  image.dataset.shareRole = 'photo'
  const embeddedImage = await inlineResource(image.src)
  image.src = embeddedImage
  image.style.opacity = '1'
  photo.style.setProperty('--photo-source', `url("${embeddedImage}")`)
  const input = clone.querySelector<HTMLInputElement>('.manuscript-title')!
  const titleElement = document.createElement('h2')
  titleElement.className = input.className
  // 保留 Vue scoped 样式标记。
  for (const attribute of Array.from(input.attributes))
    if (attribute.name.startsWith('data-v-'))
      titleElement.setAttribute(attribute.name, '')
  titleElement.textContent = title
  input.replaceWith(titleElement)
  const textarea =
    clone.querySelector<HTMLTextAreaElement>('.manuscript-editor')!
  const body = clone.querySelector<HTMLElement>('.manuscript-body')!
  const highlight = clone.querySelector<HTMLElement>('.manuscript-highlights')!
  textarea.remove()
  highlight.removeAttribute('aria-hidden')
  setStyle(highlight, {
    position: 'static',
    width: '100%',
    height: 'auto',
    color: '#fffff4',
    overflow: 'visible',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    margin: '0',
  })
  if (highlight.textContent !== content + '\n') highlight.textContent = content
  highlight.querySelectorAll<HTMLElement>('mark').forEach((mark) => {
    mark.style.color = 'inherit'
  })
  setStyle(body, {
    position: 'static',
    flex: 'none',
    height: 'auto',
    minHeight: '0',
    overflow: 'visible',
  })
  for (const selector of [
    '.lab-workspace',
    '.paper-tray',
    '.manuscript-panels',
    '.manuscript-frame',
    '.manuscript',
  ]) {
    setStyle(clone.querySelector(selector), {
      flex: 'none',
      width: '100%',
      height: 'auto',
      minHeight: '0',
      overflow: 'visible',
    })
  }
  setStyle(clone.querySelector('.lab-workspace'), { display: 'flex' })
  setStyle(clone.querySelector('.analysis-reveal'), {
    display: 'flex',
    height: '84px',
    overflow: 'visible',
  })
  setStyle(clone.querySelector('.analysis-frame'), {
    height: 'auto',
    minHeight: '72px',
    overflow: 'visible',
    flexWrap: 'wrap',
  })
  const words = clone.querySelector<HTMLElement>('.analysis-words')
  setStyle(words, {
    flex: '0 1 auto',
    flexWrap: 'wrap',
    overflow: 'visible',
    whiteSpace: 'normal',
  })
  const footer = document.createElement('footer')
  footer.style.cssText =
    'display:flex;justify-content:space-between;align-items:flex-end;gap:40px;padding:42px 90px 48px;'
  const links = document.createElement('div')
  links.style.cssText =
    'font:900 20px/1.8 UnboundedSans,sans-serif;color:#fffff4;'
  const description = document.createElement('p')
  description.textContent = '随机生成文章，巴别图书馆保存着所有人生成过的文章'
  description.style.cssText =
    "font:900 18px/1.6 'alibaba-puhuiti',sans-serif;color:#999;margin:0 0 16px;"
  const link = document.createElement('div')
  link.dataset.shareRole = 'url'
  link.textContent = MONKEY_SHARE_URL
  links.append(description, link)
  const qr = document.createElement('img')
  qr.dataset.shareRole = 'qr'
  qr.alt = '页面二维码'
  qr.width = qr.height = 160
  qr.src = await QRCode.toDataURL(MONKEY_SHARE_URL, {
    width: 160,
    margin: 4,
    errorCorrectionLevel: 'M',
  })
  footer.append(links, qr)
  picture.append(heading, clone, footer)
  host.append(picture)
  // 挂在同一个场景父级，复用现有 scoped 规则及主题；绝不移动原页面节点。
  root.parentElement!.append(host)
  try {
    freezeStyles(picture)
    await document.fonts.ready
    await image.decode()
    const height = Math.ceil(picture.scrollHeight)
    if (height > 12000)
      throw new Error('正文换行过多，分享图片过长，请减少换行后重试。')
    const blob = await toBlob(picture, {
      width: 1600,
      height,
      canvasWidth: 1200,
      canvasHeight: Math.ceil(height * 0.75),
      pixelRatio: 1,
      fontEmbedCSS: await exportFonts(picture),
    })
    if (!blob) throw new Error('分享图片生成失败，请重试。')
    return new File([blob], 'monkey-manuscript.png', { type: 'image/png' })
  } finally {
    host.remove()
  }
}
