import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(
  readFileSync('tests/fixtures/notes/book-reference/manifest.json', 'utf8')
)
const notes = manifest.notes.map((note) => ({
  ...note,
  time: '2026-11-01',
  type: 'test',
  path: `/atrium/notes?note=${note.id}`,
}))

test.beforeEach(async ({ page }) => {
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('https://steam-api.anuluca.com/notes**', (route) => {
    const id = new URL(route.request().url()).pathname.split('/')[2]
    if (!id) return route.fulfill({ json: { notes, nextCursor: null } })
    const note = notes.find((item) => item.id === id)
    return note
      ? route.fulfill({
          contentType: 'text/markdown',
          body: readFileSync(
            `tests/fixtures/notes/book-reference/published/${note.file}`,
            'utf8'
          ),
        })
      : route.fulfill({ status: 404 })
  })
})

test('reference notes paginate and every extended block fits the real modal', async ({
  page,
}, testInfo) => {
  // 使用短屏手机，确保这组语料确实溢出，从而验证固定分页器。
  if (testInfo.project.name.includes('mobile'))
    await page.setViewportSize({ width: 393, height: 650 })
  await page.goto('/atrium/notes', { waitUntil: 'domcontentloaded' })
  await page
    .locator('.study-note-filters button')
    .filter({ hasText: 'TEST' })
    .click()
  await expect(page.locator('.study-note-card')).toHaveCount(20, {
    timeout: 45000,
  })
  await expect(page.locator('.study-note-stack')).toHaveClass(/is-ready/)
  const mobileNotice = page.locator('.mobile-experience-alert')
  if (await mobileNotice.isVisible()) {
    await mobileNotice.locator('.el-alert__close-btn').click()
    await expect(mobileNotice).toBeHidden()
  }
  const listScroll = page.locator('.study-note-list > .scroll-viewport__scroll')
  const fixedControls = async () =>
    page.locator('.island-notes-content').evaluate((element) => {
      const header = element
        .querySelector('.filter-rail')!
        .getBoundingClientRect()
      const footer = element
        .querySelector('.study-note-pagination')!
        .getBoundingClientRect()
      const panel = element.getBoundingClientRect()
      return {
        header: header.top,
        footer: footer.top,
        footerBottom: footer.bottom,
        panelBottom: panel.bottom,
      }
    })
  const before = await fixedControls()
  expect(before.footerBottom).toBeLessThanOrEqual(before.panelBottom + 1)
  await expect(page.locator('.study-note-pagination')).toBeInViewport()
  await listScroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect
    .poll(() => listScroll.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0)
  const after = await fixedControls()
  expect(Math.abs(after.header - before.header)).toBeLessThanOrEqual(1)
  expect(Math.abs(after.footer - before.footer)).toBeLessThanOrEqual(1)
  await page.locator('.study-note-pagination button').last().click()
  await expect(page.locator('.study-note-card')).toHaveCount(4)
  await expect(listScroll).toHaveJSProperty('scrollTop', 0)
  const samples = [
    ['elements.md', 'input[type="checkbox"]', 3],
    ['markdown-it-demo.md', '.warning', 1],
    ['md-container.md', '.note, .tip, .attention', 3],
    ['footnotes-demo.md', '.footnote-ref', 4],
    ['tag-plugins.md', '.note-code-line.is-marked', 4],
    ['videos.md', '.note-embed iframe', 2],
    ['en-demo.md', 'p', 10],
    ['katex-demo.md', '.katex-display', 3],
  ] as const
  for (const [suffix, selector, count] of samples) {
    const note = notes.find((item) => item.sourcePath.endsWith('/' + suffix))
    await page.evaluate(async (path) => {
      const app = (
        document.querySelector('#app') as HTMLElement & {
          __vue_app__: {
            config: {
              globalProperties: {
                $router: { push(path: string): Promise<void> }
              }
            }
          }
        }
      ).__vue_app__
      await app.config.globalProperties.$router.push(path)
    }, note.path)
    const reader = page.locator('.note-reader')
    await expect(reader.locator('header h1')).toHaveText(note.title)
    await expect(reader.locator(`.note-markdown ${selector}`)).toHaveCount(
      count
    )
    expect(
      await page
        .locator('.modal-scroll-region')
        .evaluate((element) => element.scrollWidth - element.clientWidth)
    ).toBeLessThanOrEqual(1)
    if (suffix === 'footnotes-demo.md') {
      await reader.locator('.footnote-ref a').first().click()
      expect(
        await page
          .locator('.modal-scroll-region')
          .evaluate((element) => element.scrollTop)
      ).toBeGreaterThan(0)
      expect(await page.evaluate(() => window.scrollY)).toBe(0)
    }
  }
  await page
    .locator('.note-detail-modal')
    .screenshot({ path: `.tmp/book-notes-${testInfo.project.name}.png` })
  await page.locator('.note-detail-modal .diamond-close-btn').click()
  await expect(page.locator('.note-detail-modal')).toBeHidden()
  await expect(page).not.toHaveURL(/note=/)

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => {
    const root = document.querySelector('.temple-page')!
    const container = document.querySelector('.router-container')!
    const frames: number[][][] = []
    ;(window as any).notesLeaveFrames = frames
    const sample = () => {
      if (!root.isConnected) return
      frames.push(
        [root, container].map((element) => {
          const bounds = element.getBoundingClientRect()
          return [bounds.top, bounds.left]
        })
      )
      requestAnimationFrame(sample)
    }
    sample()
    void (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push('/404')
  })
  await expect(page.locator('.temple-page')).toHaveCount(0)
  const frames = await page.evaluate(
    () => (window as any).notesLeaveFrames as number[][][]
  )
  expect(frames.length).toBeGreaterThan(2)
  for (const frame of frames) {
    for (let element = 0; element < 2; element++) {
      for (let axis = 0; axis < 2; axis++) {
        expect(
          Math.abs(frame[element][axis] - frames[0][element][axis])
        ).toBeLessThanOrEqual(1)
      }
    }
  }
})
