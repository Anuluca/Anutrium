import type MarkdownIt from 'markdown-it'

/** 仅解释测试集中的 Hexo 标签，不执行模板代码，也不接受任意嵌入地址。 */
export function noteHexoTags(markdown: MarkdownIt) {
  const escape = markdown.utils.escapeHtml
  const safeLink = (source: string, label: string) => {
    const url = markdown.normalizeLink(source)
    return markdown.validateLink(url) && /^https?:\/\//i.test(url)
      ? `<a href="${escape(
          url
        )}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>`
      : escape(label)
  }
  const citation = (args: string) => {
    const match = args.match(/^(.*?)\s+(https?:\/\/\S+)(?:\s+([\s\S]+))?$/)
    if (match)
      return `${escape(match[1])} ${safeLink(match[2], match[3] || match[2])}`
    return escape(args)
  }
  const iframe = (
    source: string,
    title: string,
    referrerPolicy = 'no-referrer'
  ) =>
    `<div class="note-embed${
      title === 'YouTube' ? ' native-cursor' : ''
    }"><iframe src="${escape(source)}" title="${escape(
      title
    )}" loading="lazy" sandbox="allow-scripts allow-same-origin allow-presentation" referrerpolicy="${referrerPolicy}" allowfullscreen></iframe></div>\n`

  markdown.block.ruler.before(
    'fence',
    'note_hexo_tags',
    (state, start, end, silent) => {
      const line = state.src.slice(
        state.bMarks[start] + state.tShift[start],
        state.eMarks[start]
      )
      const match = line.match(
        /^{%\s*(blockquote|pullquote|codeblock|youtube|vimeo|gist|jsfiddle)\s*(.*?)\s*%}\s*$/
      )
      if (!match || state.sCount[start] - state.blkIndent >= 4) return false
      const [, type, args] = match
      let last = start
      if (['blockquote', 'pullquote', 'codeblock'].includes(type)) {
        for (last = start + 1; last < end; last++) {
          const closing = state.src.slice(
            state.bMarks[last] + state.tShift[last],
            state.eMarks[last]
          )
          if (closing.trim() === `{% end${type} %}`) break
        }
        if (last === end) return false
      }
      if (silent) return true
      const token = state.push('note_hexo', '', 0)
      token.block = true
      token.map = [start, last + 1]
      token.meta = { type, args }
      token.content =
        last > start
          ? state.getLines(start + 1, last, state.blkIndent, false)
          : ''
      state.line = last + 1
      return true
    },
    { alt: ['paragraph', 'reference', 'blockquote', 'list'] }
  )

  markdown.renderer.rules.note_hexo = (tokens, index, options, env) => {
    const token = tokens[index]
    const { type, args } = token.meta
    if (type === 'blockquote' || type === 'pullquote') {
      // 再次解析内层 Markdown，但限制自定义块递归，避免恶意嵌套耗尽调用栈。
      const depth = env.noteHexoDepth || 0
      if (depth >= 16) return `<pre>${escape(token.content)}</pre>`
      const content = markdown.render(token.content, {
        ...env,
        noteHexoDepth: depth + 1,
      })
      const direction = type === 'pullquote' && args === 'right' ? ' right' : ''
      return `<blockquote class="note-quote${direction}">${content}${
        type === 'blockquote' && args
          ? `<footer>${citation(args)}</footer>`
          : ''
      }</blockquote>\n`
    }
    if (type === 'codeblock') {
      const language = args.match(/(?:^|\s)lang:([\w+-]+)/)?.[1] || ''
      const marked = args.match(/(?:^|\s)mark:([\d,-]+)/)?.[1] || ''
      const caption = args.replace(/(?:^|\s)(?:lang|mark):\S+/g, '').trim()
      const lines = token.content.replace(/\n$/, '').split('\n')
      const ranges = marked
        .split(',')
        .map((range) => range.split('-').map(Number))
      const content = lines
        .map((line, lineIndex) => {
          const isMarked = ranges.some(
            ([first, last = first]) =>
              lineIndex + 1 >= first && lineIndex + 1 <= last
          )
          const highlighted =
            options.highlight?.(line, language, '') || escape(line)
          return `<span class="note-code-line${
            isMarked ? ' is-marked' : ''
          }" data-line="${lineIndex + 1}">${highlighted || ' '}</span>`
        })
        .join('')
      return `<figure class="note-code-block">${
        caption ? `<figcaption>${citation(caption)}</figcaption>` : ''
      }<pre><code class="language-${escape(
        language
      )}">${content}</code></pre></figure>\n`
    }
    const id = args.split(/\s+/)[0]
    if (type === 'youtube' && /^[\w-]{11}$/.test(id))
      // YouTube 用 Referer 验证嵌入来源；隐藏来源会触发播放器错误 153。
      return iframe(
        `https://www.youtube-nocookie.com/embed/${id}`,
        'YouTube',
        'strict-origin-when-cross-origin'
      )
    if (type === 'vimeo' && /^\d+$/.test(id))
      return iframe(`https://player.vimeo.com/video/${id}`, 'Vimeo')
    if (type === 'jsfiddle' && /^[\w-]+$/.test(id))
      return iframe(`https://jsfiddle.net/${id}/embedded/`, 'JSFiddle')
    if (type === 'gist' && /^[a-f\d]+$/i.test(id))
      return iframe(`https://gist.github.com/${id}.pibb`, 'GitHub Gist')
    return `<p>${escape(`{% ${type} ${args} %}`)}</p>\n`
  }
}
