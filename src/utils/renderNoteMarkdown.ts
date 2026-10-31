import hljs from 'highlight.js/lib/core'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import katex from 'katex'
import MarkdownIt from 'markdown-it'
import abbr from 'markdown-it-abbr'
import anchor from 'markdown-it-anchor'
import container from 'markdown-it-container'
import deflist from 'markdown-it-deflist'
import { full as emoji } from 'markdown-it-emoji'
import footnote from 'markdown-it-footnote'
import ins from 'markdown-it-ins'
import mark from 'markdown-it-mark'
import sub from 'markdown-it-sub'
import sup from 'markdown-it-sup'
import taskLists from 'markdown-it-task-lists'
import texmath from 'markdown-it-texmath'

import { noteHexoTags } from './noteHexoTags'

Object.entries({ javascript, xml, css, json, typescript }).forEach(
  ([name, language]) => hljs.registerLanguage(name, language)
)

// 保留原始 HTML 禁用与协议校验，仅由受控插件生成必要的展示标签。
const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  typographer: true,
  quotes: '“”‘’',
  highlight: (source, language) =>
    hljs.getLanguage(language)
      ? hljs.highlight(source, { language }).value
      : '',
})
  .use(abbr)
  .use(anchor, { tabIndex: false })
  .use(deflist)
  .use(emoji)
  .use(footnote)
  .use(ins)
  .use(mark)
  .use(sub)
  .use(sup)
  .use(taskLists)
  .use(texmath, {
    engine: katex,
    delimiters: 'dollars',
    katexOptions: {
      trust: false,
      throwOnError: false,
      maxExpand: 1000,
      maxSize: 20,
    },
  })
  .use(noteHexoTags)

for (const name of ['note', 'tip', 'attention', 'warning'])
  markdown.use(container, name)

// 元素测试需要的 HTML 仅允许这组无交互标签；事件、样式、脚本和任意属性仍会转义。
markdown.inline.ruler.before(
  'html_inline',
  'note_safe_elements',
  (state, silent) => {
    const match = state.src
      .slice(state.pos)
      .match(
        /^<(\/?)(u|dl|dt|dd|sup|sub|cite|acronym|abbr)(?:\s+title=("[^"]*"|'[^']*'))?\s*>/i
      )
    if (!match || (match[1] && match[3])) return false
    if (!silent) {
      const token = state.push('html_inline', '', 0)
      const title = match[3]
        ? ` title="${markdown.utils.escapeHtml(match[3].slice(1, -1))}"`
        : ''
      token.content = `<${match[1]}${match[2].toLowerCase()}${title}>`
    }
    state.pos += match[0].length
    return true
  }
)

const renderImage = markdown.renderer.rules.image!
markdown.renderer.rules.image = (tokens, index, options, env, renderer) => {
  tokens[index].attrSet('loading', 'lazy')
  tokens[index].attrSet('decoding', 'async')
  const image = renderImage(tokens, index, options, env, renderer)
  const caption = renderer.renderInlineAsText(
    tokens[index].children || [],
    options,
    env
  )
  return caption
    ? `${image}<span class="note-image-caption">${markdown.utils.escapeHtml(
        caption
      )}</span>`
    : image
}

const renderFootnoteRef = markdown.renderer.rules.footnote_ref!
markdown.renderer.rules.footnote_ref = (
  tokens,
  index,
  options,
  env,
  renderer
) => {
  const definition = env.footnotes?.list[tokens[index].meta.id]
  const text =
    definition?.content ||
    definition?.tokens
      ?.filter((token) => token.type === 'inline')
      .map((token) => token.content)
      .join('\n') ||
    ''
  return `<span class="note-footnote" title="${markdown.utils.escapeHtml(
    text
  )}">${renderFootnoteRef(tokens, index, options, env, renderer)}</span>`
}

export const renderNoteMarkdown = (body: string) => markdown.render(body)
