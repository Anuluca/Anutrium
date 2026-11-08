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
  expect(parsed.metadata.title).toBe(
    '宝可梦系列二周目才能获取的本世代宝可梦整理'
  )
  expect(parsed.metadata.type).toBe('pokemon')
  expect(parsed.metadata.image).toBeUndefined()
  expect(content.widgets).toEqual([])
  expect(parsed.body).toMatch(/^# 总览\n\n/)
  const ids = [...content.html.matchAll(/alt="#(\d+) /g)].map((m) =>
    Number(m[1])
  )
  expect(ids).toHaveLength(97)
  expect(new Set(ids).size).toBe(97)
  expect(ids).toEqual([...ids].sort((a, b) => a - b))
  expect(content.html).toContain('data-note-title="《红／绿／蓝》')
  expect(content.html).toContain('《白金》需外部作品或活动前置')
  expect(content.html).toContain('十一、使用这份名单时的判断方法')
})

test('Image table descriptions are escaped and fenced examples remain inert', () => {
  const source =
    '<abbr title="&quot; onmouseover=&quot;alert(1)&quot;">![x](https://assets.anuluca.com/x.png)</abbr>'
  const html = renderNoteMarkdown(source)
  expect(html).toContain(
    'data-note-title="&quot; onmouseover=&quot;alert(1)&quot;"'
  )
  expect(html).not.toContain(' onmouseover="')
  expect(renderNoteMarkdown(`\`\`\`md\n${source}\n\`\`\``)).not.toContain(
    '<abbr'
  )
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
  const grid = page.locator('.note-image-table')
  await expect(grid.locator('img')).toHaveCount(97, { timeout: 45000 })
  await expect(grid.locator('abbr').nth(3)).toHaveAttribute(
    'data-note-title',
    /^《红／绿／蓝》/
  )
  await expect(grid.locator('img').first()).toHaveCSS('width', '96px')
  const geometry = await grid.evaluate((element) => ({
    overflow: element.scrollWidth - element.clientWidth,
    readerOverflow:
      element.closest('.note-reader')!.scrollWidth -
      element.closest('.note-reader')!.clientWidth,
    overview:
      element.previousElementSibling?.previousElementSibling?.textContent,
    introduction: element.previousElementSibling?.textContent,
  }))
  const trigger = grid.locator('abbr').nth(3)
  await trigger.focus()
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip).not.toContainText('#0150')
  await expect(tooltip).not.toContainText('超梦')
  await expect(tooltip).toContainText('《红／绿／蓝》')
  const box = await tooltip.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width)
  await trigger.blur()
  await expect(tooltip).toHaveCount(0)
  await trigger.hover()
  await expect(page.getByRole('tooltip')).toBeVisible()
  expect(geometry.overview).toBe('总览')
  expect(geometry.introduction).toBe(
    '由于本人习惯每次通关都尽量用本世代宝可梦组成通关队伍，且尽量不使用用过的宝可梦，所以整理了这个表格。'
  )
  expect(geometry.overflow).toBeLessThanOrEqual(1)
  expect(geometry.readerOverflow).toBeLessThanOrEqual(1)
})
