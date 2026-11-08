import { expect, type Route, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

import { parseNoteDocument } from '../src/utils/noteDocument'
import {
  renderNoteContent,
  renderNoteMarkdown,
} from '../src/utils/renderNoteMarkdown'

const source = readFileSync('docs/notes/postgame-pokemon.md', 'utf8')
const parsed = parseNoteDocument(source)

test('Pokémon overview preserves all species, order, details and an empty cover', () => {
  const content = renderNoteContent(parsed.body)
  expect(parsed.metadata.type).toBe('pokemon')
  expect(parsed.metadata.image).toBeUndefined()
  expect(content.widgets).toEqual([])
  expect(content.html).toMatch(/^<div class="note-pokemon-grid"/)
  const ids = [...content.html.matchAll(/alt="#(\d+) /g)].map((m) =>
    Number(m[1])
  )
  expect(ids).toHaveLength(97)
  expect(new Set(ids).size).toBe(97)
  expect(ids).toEqual([...ids].sort((a, b) => a - b))
  expect(content.html).toContain('title="#0150 超梦｜《红／绿／蓝》')
  expect(content.html).toContain('《白金》需外部作品或活动前置')
  expect(content.html).toContain('十一、使用这份名单时的判断方法')
})

test('Pokémon grid escapes descriptions, keeps invalid content and ignores fenced examples', () => {
  const image =
    '![宝可梦](https://assets.anuluca.com/test.png "&quot; onmouseover=&quot;alert(1)&quot;")'
  const block = `::: pokemon-grid\n${image}\n:::`
  expect(renderNoteMarkdown(block)).toContain(
    'title="&quot; onmouseover=&quot;alert(1)&quot;"'
  )
  expect(renderNoteMarkdown(`\`\`\`md\n${block}\n\`\`\``)).not.toContain(
    '<div class="note-pokemon-grid"'
  )
  expect(renderNoteMarkdown('::: pokemon-grid\n正文不能丢失\n:::')).toContain(
    '正文不能丢失'
  )
  expect(
    renderNoteMarkdown('::: pokemon-grid\n![x](javascript:alert(1))\n:::')
  ).not.toContain('<div class="note-pokemon-grid"')
})

test('Pokémon overview fits the reader and retains hover information', async ({
  page,
}) => {
  test.setTimeout(60000)
  const id = '66bd27c6-cb9b-4f97-a746-3d93c1d09d41'
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const respond = (route: Route) =>
    new URL(route.request().url()).pathname.endsWith(id)
      ? route.fulfill({ contentType: 'text/markdown', body: source })
      : route.fulfill({
          json: { notes: [{ id, ...parsed.metadata }], nextCursor: null },
        })
  await page.route('**/api/notes**', respond)
  await page.route('https://steam-api.anuluca.com/notes**', respond)
  await page.goto(`/atrium/notes?note=${id}`, { waitUntil: 'domcontentloaded' })
  const grid = page.locator('.note-pokemon-grid')
  await expect(grid.locator('img')).toHaveCount(97, { timeout: 45000 })
  await expect(grid.locator('abbr').nth(3)).toHaveAttribute(
    'title',
    /超梦.*红／绿／蓝/
  )
  await expect(grid.locator('img').first()).toHaveCSS('width', '80px')
  const geometry = await grid.evaluate((element) => ({
    overflow: element.scrollWidth - element.clientWidth,
    readerOverflow:
      element.closest('.note-reader')!.scrollWidth -
      element.closest('.note-reader')!.clientWidth,
    first: element.parentElement!.firstElementChild === element,
  }))
  expect(geometry).toEqual({ overflow: 0, readerOverflow: 0, first: true })
})
