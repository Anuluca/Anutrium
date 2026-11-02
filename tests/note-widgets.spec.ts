import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

import { parseNoteDocument } from '../src/utils/noteDocument'
import {
  renderNoteContent,
  renderNoteMarkdown,
} from '../src/utils/renderNoteMarkdown'

const source = readFileSync('docs/notes/corocoro-pokemon.md', 'utf8')
const parsed = parseNoteDocument(source)
const id = 'a12ee06a-a95f-4cbc-9b65-ff71bbca5371'

test('Corocoro preserves all 40 images and six groups; fenced examples and unsafe links stay inert', () => {
  expect(parsed.metadata.type).toBe('pokemon')
  expect(parsed.metadata.image).toBe(
    'https://assets.anuluca.com/Island/notes/pokemonCorocoro/BW2/IMG_2129.jpg'
  )
  const content = renderNoteContent(parsed.body)
  expect(content.widgets).toHaveLength(2)
  expect(content.widgets[1]).toEqual({
    type: 'social-links',
    caption: '如有遗漏欢迎补充',
  })
  expect(parsed.body).toMatch(/^::::: tabs/)
  expect(parsed.body.endsWith('::: social-links 如有遗漏欢迎补充\n:::')).toBe(
    true
  )
  expect(parsed.body).not.toContain('来源：')
  const tabs = content.widgets[0]
  if (tabs.type !== 'tabs') throw new Error('expected tabs')
  expect(tabs.pages.map((page) => page.title)).toEqual([
    'BW',
    'BW2',
    'XY',
    'ORAS',
    'SM',
    '假图',
  ])
  expect(
    tabs.pages.map((page) => {
      const gallery = renderNoteContent(page.body, 1).widgets[0]
      if (gallery.type !== 'gallery') throw new Error('expected gallery')
      return gallery.items.length
    })
  ).toEqual([4, 1, 9, 8, 12, 6])
  const staticHTML = renderNoteMarkdown(parsed.body)
  expect(staticHTML.match(/data-note-original=/g)).toHaveLength(40)
  expect(staticHTML).toContain('image=card-thumb')
  expect(staticHTML).toContain('image=card-mobile')
  expect(
    renderNoteContent(
      '```md\n::: gallery\n![x](https://assets.anuluca.com/x.jpg)\n:::\n```'
    ).widgets
  ).toEqual([])
  expect(
    renderNoteContent('::: gallery\n![x](https://assets.anuluca.com/x.jpg)')
      .widgets
  ).toEqual([])
  expect(
    renderNoteMarkdown(
      '::: tool-card\n[危险链接](javascript:alert(1))\n<script>alert(1)</script>\n:::'
    )
  ).not.toMatch(/<script|href="javascript:/)
  expect(renderNoteMarkdown('::: gallery\n正文不能丢失\n:::')).toContain(
    '正文不能丢失'
  )
  const deep =
    Array.from({ length: 12 }, (_, i) => `${':'.repeat(20 - i)} tab 层`).join(
      '\n'
    ) +
    '\n正文\n' +
    Array.from({ length: 12 }, (_, i) => ':'.repeat(9 + i)).join('\n')
  expect(renderNoteMarkdown(deep)).toContain('正文')
})

test('reader uses FilterRail and MediaGallery; switching groups and preview preserve modal geometry', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route(
    'https://assets.anuluca.com/Island/notes/pokemonCorocoro/**',
    (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#777"/></svg>',
      })
  )
  await page.route('https://steam-api.anuluca.com/notes**', (route) =>
    new URL(route.request().url()).pathname.endsWith(id)
      ? route.fulfill({ contentType: 'text/markdown', body: source })
      : route.fulfill({
          json: {
            notes: [
              { id, ...parsed.metadata, path: `/atrium/notes?note=${id}` },
            ],
            nextCursor: null,
          },
        })
  )
  await page.goto(`/atrium/notes?note=${id}`, { waitUntil: 'domcontentloaded' })
  const reader = page.locator('.note-reader')
  const rail = reader.locator('.note-tabs > .filter-rail')
  const social = reader.locator('.note-social-links .footer-social-links')
  await expect(social).toBeVisible({ timeout: 45000 })
  await expect(social.locator('button, a')).toHaveCount(4)
  const contactRow = reader.locator('.note-social-links')
  await expect(contactRow.locator('.note-social-links__caption')).toHaveText(
    '如有遗漏欢迎补充'
  )
  const colors = await social
    .locator('button, a')
    .evaluateAll((items) => items.map((item) => getComputedStyle(item).color))
  expect(new Set(colors).size).toBe(1)
  const rowGeometry = await contactRow.evaluate((row) => {
    const label = row
      .querySelector('.note-social-links__caption')!
      .getBoundingClientRect()
    const links = row.querySelector('nav')!.getBoundingClientRect()
    const tabs = row
      .closest('.note-markdown')!
      .querySelector('.note-tabs')!
      .getBoundingClientRect()
    return {
      centerDifference: Math.abs(
        label.y + label.height / 2 - links.y - links.height / 2
      ),
      afterGallery: row.getBoundingClientRect().top >= tabs.bottom - 1,
      overflow: row.scrollWidth - row.clientWidth,
    }
  })
  expect(rowGeometry.centerDifference).toBeLessThanOrEqual(1)
  expect(rowGeometry.afterGallery).toBe(true)
  expect(rowGeometry.overflow).toBeLessThanOrEqual(1)

  await expect(
    social.getByRole('link', { name: 'WEIBO', exact: true })
  ).toHaveAttribute('href', 'https://weibo.com/u/8248788427')
  await expect(
    social.getByRole('link', { name: 'MAIL', exact: true })
  ).toHaveAttribute('href', 'mailto:tilucario@outlook.com')
  await expect(
    social.getByRole('button', { name: 'WECHAT', exact: true })
  ).toBeVisible()
  await expect(rail).toBeVisible({ timeout: 45000 })
  await expect(rail.locator('button')).toHaveCount(6)
  const gallery = reader.locator('.media-gallery')
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(4)
  expect(
    await gallery.evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length
    )
  ).toBe(info.project.name.includes('mobile') ? 2 : 3)
  const geometry = () =>
    page.evaluate(() => {
      const body = document.body.getBoundingClientRect()
      const modal = document
        .querySelector('.note-detail-modal')!
        .getBoundingClientRect()
      return {
        body: body.width,
        x: modal.x,
        y: modal.y,
        scroll: document.scrollingElement!.scrollTop,
      }
    })
  const before = await geometry()
  for (const [name, count] of [
    ['BW2', 1],
    ['XY', 9],
    ['ORAS', 8],
    ['SM', 12],
    ['假图', 6],
    ['BW', 4],
  ] as const) {
    await rail.getByRole('button', { name, exact: true }).click()
    await expect(gallery.locator('.media-gallery__card')).toHaveCount(count)
  }
  await gallery.locator('.media-gallery__open').first().click()
  await expect(page.locator('.el-image-viewer__wrapper')).toBeVisible()
  const viewerSource = await page
    .locator('.el-image-viewer__img')
    .first()
    .getAttribute('src')
  expect(viewerSource).toContain('/BW/IMG_1763.jpg')
  expect(viewerSource).not.toContain('image=')
  await page.keyboard.press('Escape')
  await expect(page.locator('.el-image-viewer__wrapper')).toHaveCount(0)
  const after = await geometry()
  for (const key of Object.keys(before) as (keyof typeof before)[])
    expect(Math.abs(before[key] - after[key])).toBeLessThanOrEqual(1)
  await expect(page.locator('.note-detail-modal')).toBeVisible()
  const overflow = await reader.evaluate(
    (el) => el.scrollWidth - el.clientWidth
  )
  expect(overflow).toBeLessThanOrEqual(1)
  await page.screenshot({ path: info.outputPath('corocoro.png') })
})
