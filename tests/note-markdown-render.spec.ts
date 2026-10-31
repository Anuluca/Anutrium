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

test('all 24 source documents render, including every extended syntax', () => {
  expect(manifest.notes).toHaveLength(24)
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
  expect(elements).toContain('<u>Underline text</u>')
  expect(elements).toContain('<dl><dt>Definition List Title</dt>')
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
  expect(hexo).toContain('David Levithan')
  expect(hexo).toContain('class="note-quote right"')
  expect(hexo.match(/note-code-line is-marked/g)).toHaveLength(4)
  expect(hexo).toContain('https://gist.github.com/996818.pibb')
  expect(hexo).toContain('https://jsfiddle.net/ccWP7/embedded/')
  expect(render('/videos.md')).toContain(
    'https://www.youtube-nocookie.com/embed/TIbZDRXM-Tg'
  )
  expect(render('/videos.md')).toContain(
    'https://player.vimeo.com/video/82090131'
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
