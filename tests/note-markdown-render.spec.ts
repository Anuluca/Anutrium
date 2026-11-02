import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

import { parseNoteDocument } from '../src/utils/noteDocument'
import { renderNoteMarkdown } from '../src/utils/renderNoteMarkdown'

const manifest = JSON.parse(
  readFileSync('tests/fixtures/notes/book-reference/manifest.json', 'utf8')
)
const render = (suffix: string) => {
  const note = manifest.notes.find((item) => item.sourcePath.endsWith(suffix))
  return renderNoteMarkdown(
    parseNoteDocument(
      readFileSync(
        `tests/fixtures/notes/book-reference/published/${note.file}`,
        'utf8'
      )
    ).body
  )
}

test('all 18 source documents render, including every extended syntax', () => {
  expect(manifest.notes).toHaveLength(18)
  for (const note of manifest.notes) {
    const parsed = parseNoteDocument(
      readFileSync(
        `tests/fixtures/notes/book-reference/published/${note.file}`,
        'utf8'
      )
    )
    expect(parsed.metadata.title).toBe(note.title)
    expect(renderNoteMarkdown(parsed.body)).toBeTruthy()
  }
  const elements = render('/elements.md')
  expect(elements).toContain('<u>下划线文字</u>')
  expect(elements).toContain('<dl><dt>定义列表标题</dt>')
  expect(elements.match(/type="checkbox"/g)).toHaveLength(3)
  expect(elements.match(/checked=""/g)).toHaveLength(2)
  const extended = render('/markdown-it-demo.md')
  for (const tag of [
    '<sub>',
    '<sup>',
    '<ins>',
    '<mark>',
    '<dl>',
    '<abbr ',
    'footnote-ref',
    'class="warning"',
    'hljs-keyword',
  ])
    expect(extended).toContain(tag)
  expect(extended).toContain('😉')
  expect(render('/footnotes-demo.md')).toContain('note-footnote')
  const math = render('/katex-demo.md')
  expect(math.match(/class="katex-display"/g)).toHaveLength(3)
  expect(math).not.toContain('katex-error')
  for (const type of ['note', 'tip', 'attention'])
    expect(render('/md-container.md')).toContain(`class="${type}"`)
  const hexo = render('/tag-plugins.md')
  expect(hexo).not.toContain('{%')
  expect(hexo).toContain('大卫·利维坦')
  expect(hexo).toContain('class="note-quote right"')
  expect(hexo.match(/note-code-line is-marked/g)).toHaveLength(4)
  expect(hexo).not.toContain('https://gist.github.com/')
  expect(hexo).not.toContain('https://jsfiddle.net/')
  expect(render('/videos.md')).toContain(
    'https://www.youtube-nocookie.com/embed/TIbZDRXM-Tg'
  )
  expect(render('/videos.md')).toContain(
    'https://player.vimeo.com/video/82090131'
  )
  expect(render('/videos.md')).toContain(
    'https://player.bilibili.com/player.html?bvid=BV1Q5cWeyEZe&amp;autoplay=0'
  )
})

test('extended Markdown keeps scripts, HTML attributes, links and TeX commands safe', () => {
  const html = renderNoteMarkdown(
    [
      '<script>alert(1)</script>',
      '<img src=x onerror=alert(1)>',
      '<u onclick="alert(1)">unsafe</u>',
      '[unsafe](javascript:alert(1))',
      '{% youtube ../unsafe %}',
      '{% bilibili BV1Q5cWeyEZe" onload=alert(1) %}',
      '{% gist 996818" onload="alert(1) %}',
      '$\\href{javascript:alert(1)}{unsafe}$',
    ].join('\n\n')
  )
  expect(html).not.toMatch(/<script|<img|<iframe|<u onclick|href="javascript:/)
})

test('YouTube embed sends its site origin without leaking the note path', async ({
  page,
}) => {
  let referrer = ''
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) => {
    referrer = route.request().headers().referer || ''
    return route.fulfill({
      contentType: 'text/html',
      body: '<p>Player request received</p>',
    })
  })
  await page.route('**/__note-embed-regression?note=test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: renderNoteMarkdown('{% youtube TIbZDRXM-Tg %}'),
    })
  )
  await page.goto('/__note-embed-regression?note=test')
  await expect.poll(() => referrer).toBe('http://localhost:3000/')
})

test('YouTube hover hides the custom cursor and restores it after leaving', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'))
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<button>Play</button>' })
  )
  await page.route('**/__note-player-cursor', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<html><body style="margin:0;min-height:100vh"><style>.note-embed{position:absolute;left:40px;top:40px;width:400px;height:250px}.note-embed iframe{width:100%;height:100%;border:0}</style>${renderNoteMarkdown(
        '{% youtube TIbZDRXM-Tg %}'
      )}<div id="cursor-fixture"></div><script type="module" src="/tests/fixtures/cursor-layout.ts"></script></body></html>`,
    })
  )
  await page.goto('/__note-player-cursor')
  const cursor = page.locator('.cursor-position')
  const player = page.locator('.note-embed')
  await expect(cursor).toBeAttached()
  for (let repeat = 0; repeat < 2; repeat++) {
    await page.mouse.move(500, 350)
    await expect(cursor).not.toHaveClass(/is-hidden/)
    await player.hover({ position: { x: 100, y: 100 } })
    await expect(cursor).toHaveClass(/is-hidden/)
    await expect(player).not.toHaveCSS('cursor', 'none')
    await page.mouse.move(500, 350)
    await expect(cursor).not.toHaveClass(/is-hidden/)
  }
})

test('excerpt separator stops rendering without treating code comments as separators', () => {
  const html = render('/excerpts.md')
  expect(html).toContain('以下内容为可见摘要')
  expect(html).not.toContain('more')
  expect(html).not.toContain('这是第二段隐藏内容')
  expect(renderNoteMarkdown('摘要\n<!-- more -->\n隐藏内容')).toBe(
    '<p>摘要</p>\n'
  )
  const code = renderNoteMarkdown('```html\n<!-- more -->\n```\n\n代码后的文字')
  expect(code).toContain('more')
  expect(code).toContain('代码后的文字')
  expect(renderNoteMarkdown('    <!-- more -->\n\n缩进代码后的文字')).toContain(
    '缩进代码后的文字'
  )
})

test('body links open new windows while footnote navigation stays in the reader', () => {
  const html = renderNoteMarkdown(
    '[外部](https://example.com) [相对](/notes) [邮件](mailto:test@example.com) [锚点](#section)'
  )
  expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(
    3
  )
  expect(html).toContain('<a href="#section">锚点</a>')
  expect(render('/footnotes-demo.md')).not.toMatch(
    /href="#fn[^"]*"[^>]*target=/
  )
})

test('all code blocks number each line and preserve multiline highlighting and source text', async ({
  page,
}) => {
  const source = '/* 第一行\n第二行 */\n\nconst text = "<script>";'
  const html = renderNoteMarkdown(
    '```js\n' + source + '\n```\n\n    缩进代码\n    第二行'
  )
  await page.setContent(html)
  const blocks = page.locator('pre > code')
  await expect(blocks).toHaveCount(2)
  await expect(blocks.nth(0).locator(':scope > .note-code-line')).toHaveCount(4)
  await expect(blocks.nth(1).locator(':scope > .note-code-line')).toHaveCount(2)
  expect(await blocks.nth(0).textContent()).toBe(source)
  await expect(
    blocks.nth(0).locator('[data-line="2"] .hljs-comment')
  ).toHaveText('第二行 */')
  await expect(page.locator('script')).toHaveCount(0)
})

test('literature fixtures contain complete public-domain works and removed modules stay absent', () => {
  expect(render('/sc-demo.md')).toContain('豫章故郡')
  expect(render('/sc-demo.md')).toContain('落霞与孤鹜齐飞')
  expect(render('/sc-demo.md')).toContain('槛外长江空自流')
  expect(render('/tc-demo.md')).toContain('不知東方之既白')
  expect(render('/jp-demo.md')).toContain('下人の行方は、誰も知らない')
  expect(render('/en-demo.md')).toContain('They are the magi')
  for (const suffix of [
    '/gallery-post.md',
    '/link-post.md',
    '/中文測試.md',
    '/日本語テスト.md',
  ])
    expect(
      manifest.notes.some((note) => note.sourcePath.endsWith(suffix))
    ).toBe(false)
})
