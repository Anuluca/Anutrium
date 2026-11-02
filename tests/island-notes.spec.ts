import { expect, type Page, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const demoId = '46625c0b-2bd5-491e-aef9-da54e9ac3700'
const demoSource = readFileSync('tests/fixtures/notes/markdown-demo.md', 'utf8')
const demoSummary = {
  id: demoId,
  title: '前端手记：Markdown 排版与代码示例',
  time: '2026-10-31',
  type: 'technology',
  path: `/atrium/notes?note=${demoId}`,
}

const remoteId = '2aa08581-e032-4f35-9aa7-c84c19c57e98'
const remoteSource =
  '---\ntitle: "在线发布测试"\ndate: "2026-10-31"\ncategory: technology\n---\n\n## 来自 Markdown\n\n<script>window.noteInjected = true</script>\n\n[危险链接](javascript:alert(1))\n\n| 项目 | 结果 |\n| --- | --- |\n| 在线笔记 | 可读 |\n\n```ts\nconst message = "hello"\n```'

test.beforeEach(async ({ page }) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('https://steam-api.anuluca.com/notes**', (route) => {
    if (new URL(route.request().url()).pathname.endsWith(demoId))
      return route.fulfill({ contentType: 'text/markdown', body: demoSource })
    return route.fulfill({ json: { notes: [demoSummary], nextCursor: null } })
  })
})

async function openNotes(page: Page, suffix = '') {
  await page.goto(`/atrium/notes${suffix}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.island-focus').first()).toHaveAttribute(
    'data-detail-item',
    'NOTES',
    { timeout: 45000 }
  )
}

const pushNoteRoute = (page: Page, path: string) =>
  page.evaluate((path) => {
    const app = (
      document.querySelector('#app') as HTMLElement & {
        __vue_app__: {
          config: {
            globalProperties: {
              $router: { push: (path: string) => Promise<void> }
            }
          }
        }
      }
    ).__vue_app__
    return app.config.globalProperties.$router.push(path)
  }, path)

test('card flashes twice while opening the note immediately', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await openNotes(page)
  const card = page.locator('.study-note-card').first()
  await expect(card).toBeVisible()
  // 暂停点击反馈，验证弹窗无需等待卡片动画结束。
  const frames = await card.evaluate((element: HTMLElement) => {
    element.click()
    const animations = element.getAnimations()
    animations.forEach((animation) => animation.pause())
    const flash = animations.find((animation) =>
      (animation.effect as KeyframeEffect)
        .getKeyframes()
        .some((frame) => frame.backgroundColor)
    )!
    return (flash.effect as KeyframeEffect)
      .getKeyframes()
      .map((frame) => frame.backgroundColor)
  })
  expect(frames).toHaveLength(5)
  expect(frames[1]).toBe(frames[3])
  expect(frames[0]).toBe(frames[2])
  await expect(page).toHaveURL(new RegExp(`note=${demoId}`))
  await expect(page.locator('.note-detail-modal')).toBeVisible()
  await card.evaluate((element) =>
    element.getAnimations().forEach((animation) => animation.finish())
  )
  await expect(page).toHaveURL(new RegExp(`note=${demoId}`))
  await expect(page.locator('.note-detail-modal')).toBeVisible()
})

const expectLoadingCentered = async (
  page: Page,
  iconSelector: string,
  regionSelector: string
) => {
  await expect(page.locator(`${iconSelector} svg`)).toBeVisible()
  await expect
    .poll(() =>
      page.locator(iconSelector).evaluate((icon, selector) => {
        const bounds = icon.getBoundingClientRect()
        const region = document.querySelector(selector)!.getBoundingClientRect()
        return Math.max(
          Math.abs(
            bounds.left + bounds.width / 2 - region.left - region.width / 2
          ),
          Math.abs(
            bounds.top + bounds.height / 2 - region.top - region.height / 2
          )
        )
      }, regionSelector)
    )
    .toBeLessThanOrEqual(1)
}

test('note query navigation clears route cursor loading immediately', async ({
  page,
}) => {
  await openNotes(page)
  await expect(page.locator('.study-note-card')).toBeVisible()
  const routeIsLoading = () =>
    page.evaluate(() => {
      const app = (
        document.querySelector('#app') as HTMLElement & {
          __vue_app__: {
            config: {
              globalProperties: {
                $pinia: { _s: Map<string, { loadingSources: string[] }> }
              }
            }
          }
        }
      ).__vue_app__
      return app.config.globalProperties.$pinia._s
        .get('cursorState')!
        .loadingSources.includes('route-transition')
    })
  await pushNoteRoute(page, demoSummary.path)
  expect(await routeIsLoading()).toBe(false)
  await expect(page.locator('.note-detail-modal')).toBeVisible()
  await pushNoteRoute(page, '/atrium/notes')
  expect(await routeIsLoading()).toBe(false)
})

test('server demo supports tables, code and returning without a bundled fallback', async ({
  page,
}) => {
  await openNotes(page)
  const cards = page.locator('.study-note-card')
  await expect(cards).toHaveCount(1, { timeout: 20000 })
  await expect(cards.first()).toContainText('前端手记：Markdown 排版与代码示例')
  await expect(cards.locator('.study-note-card__category')).toHaveText(
    '[TECHNOLOGY]'
  )
  await expect(page.locator('.study-note-stack')).toHaveClass(/is-ready/)
  await cards.first().click()
  await expect(page).toHaveURL(new RegExp(`note=${demoId}`))
  await expect(page.locator('.note-detail-modal')).toBeVisible()
  await expect(cards).toHaveCount(1)
  const reader = page.locator('.note-detail-modal .note-reader')
  const textColors = await reader.evaluate((element) => {
    const reference = document.createElement('span')
    reference.style.color = 'var(--text-color)'
    element.append(reference)
    const expected = getComputedStyle(reference).color
    reference.remove()
    return { actual: getComputedStyle(element).color, expected }
  })
  expect(textColors.actual).toBe(textColors.expected)
  await expect(reader.locator('header h1')).toHaveText(
    '前端手记：Markdown 排版与代码示例'
  )
  await expect(reader.locator('table')).toBeVisible()
  await expect(reader.locator('pre code')).toContainText('computed')
  await expect(reader.locator('a[download]')).toHaveCount(0)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.note-reader header h1')).toBeVisible({
    timeout: 45000,
  })
  await page.locator('.note-detail-modal .diamond-close-btn').click()
  await expect(page.locator('.note-detail-modal')).toBeHidden()
  await expect(cards).toHaveCount(1, { timeout: 20000 })
  await expect(page.locator('.study-note-stack')).toHaveClass(/is-ready/)
})

test('online Markdown is listed and rendered safely without horizontal panel overflow', async ({
  page,
}) => {
  await page.route('https://steam-api.anuluca.com/notes**', async (route) => {
    if (new URL(route.request().url()).pathname.endsWith(remoteId))
      return route.fulfill({ contentType: 'text/markdown', body: remoteSource })
    return route.fulfill({
      json: {
        notes: [
          {
            id: remoteId,
            title: '在线发布测试',
            time: '2026-10-31',
            type: 'technology',
            path: `/atrium/notes?note=${remoteId}`,
          },
        ],
        nextCursor: null,
      },
    })
  })
  await openNotes(page)
  await expect(page.locator('.study-note-card')).toHaveCount(1)
  await page.getByRole('link', { name: /在线发布测试/ }).click()
  await expect(page.locator('.note-markdown table')).toBeVisible()
  await expect(page.locator('.note-markdown pre')).toContainText(
    'const message'
  )
  await expect(page.locator('.note-markdown script')).toHaveCount(0)
  await expect(
    page.locator('.note-markdown a[href^="javascript:"]')
  ).toHaveCount(0)
  expect(await page.evaluate(() => 'noteInjected' in window)).toBe(false)
  const overflow = await page
    .locator('.note-reader')
    .evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('online service failure has no built-in demo and retry loads server notes', async ({
  page,
}) => {
  let failed = true
  await page.route('https://steam-api.anuluca.com/notes**', (route) =>
    route.fulfill(
      failed
        ? { status: 503, json: { error: 'notes_unavailable' } }
        : { json: { notes: [demoSummary], nextCursor: null } }
    )
  )
  await openNotes(page)
  await expect(page.locator('.study-note-service')).toBeVisible()
  await expect(page.locator('.study-note-card')).toHaveCount(0)
  failed = false
  await page.locator('.study-note-service button').click()
  await expect(page.locator('.study-note-service')).toHaveCount(0)
  await expect(page.locator('.study-note-card')).toHaveCount(1)
})

test('unknown note shows a recoverable missing state', async ({ page }) => {
  await page.route(`https://steam-api.anuluca.com/notes/${remoteId}`, (route) =>
    route.fulfill({ status: 404, json: { error: 'not_found' } })
  )
  await openNotes(page, `?note=${remoteId}`)
  await expect(page.locator('.note-reader [role="alert"]')).toContainText(
    '未找到这篇笔记'
  )
  await page.locator('.note-detail-modal .diamond-close-btn').click()
  await expect(page.locator('.note-detail-modal')).toBeHidden()
  await expect(page.locator('.study-note-card')).toHaveCount(1)
})

test('empty server list renders empty state without generating local notes', async ({
  page,
}) => {
  await page.route('https://steam-api.anuluca.com/notes**', (route) =>
    route.fulfill({ json: { notes: [], nextCursor: null } })
  )
  await openNotes(page)
  await expect(page.locator('.study-note-empty')).toBeVisible({
    timeout: 20000,
  })
  await expect(page.locator('.study-note-card')).toHaveCount(0)
})

test('note modal preserves list scroll, card anchor and body width, and supports Escape and browser history', async ({
  page,
}) => {
  await page.route('https://steam-api.anuluca.com/notes**', (route) => {
    if (new URL(route.request().url()).pathname.endsWith(demoId))
      return route.fulfill({ contentType: 'text/markdown', body: demoSource })
    return route.fulfill({
      json: {
        notes: Array.from({ length: 20 }, (_, index) => ({
          ...demoSummary,
          id: `${demoId}-${index}`,
        })),
        nextCursor: null,
      },
    })
  })
  await openNotes(page)
  const cards = page.locator('.study-note-card')
  await expect(cards).toHaveCount(12, { timeout: 20000 })
  await expect(page.locator('.study-note-stack')).toHaveClass(/is-ready/)
  const card = cards.nth(10)
  await card.scrollIntoViewIfNeeded()
  const position = () =>
    card.evaluate((el) => ({
      top: el.getBoundingClientRect().top,
      scroll: el.closest('.scroll-viewport__scroll')!.scrollTop,
      pageScroll: document.scrollingElement!.scrollTop,
      bodyWidth: document.body.getBoundingClientRect().width,
    }))
  const before = await position()
  await card.click()
  const modal = page.locator('.note-detail-modal')
  await expect(modal).toBeVisible()
  await expect(modal.locator('.note-reader header h1')).toBeVisible()
  const during = await position()
  for (const key of ['top', 'scroll', 'pageScroll', 'bodyWidth'] as const)
    expect(Math.abs(during[key] - before[key])).toBeLessThanOrEqual(1)
  const closeGeometry = await modal.evaluate((el) => {
    const dialog = el.getBoundingClientRect()
    const close = el
      .querySelector('.diamond-close-btn')!
      .getBoundingClientRect()
    return {
      delta: Math.abs(
        close.left + close.width / 2 - dialog.left - dialog.width / 2
      ),
      below: close.top >= dialog.bottom - 1,
    }
  })
  expect(closeGeometry.delta).toBeLessThanOrEqual(1)
  expect(closeGeometry.below).toBe(true)
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  const after = await position()
  for (const key of ['top', 'scroll', 'pageScroll', 'bodyWidth'] as const)
    expect(Math.abs(after[key] - before[key])).toBeLessThanOrEqual(1)
  await card.click()
  await expect(modal).toBeVisible()
  await page.goBack()
  await expect(modal).toBeHidden()
})

test('notes uses two mobile columns and keeps its close button usable above the mobile notice', async ({
  page,
}, info) => {
  await page.route('https://steam-api.anuluca.com/notes', (route) =>
    route.fulfill({
      json: {
        notes: Array.from({ length: 20 }, (_, index) => ({
          ...demoSummary,
          id: `${demoId}-${index}`,
        })),
        nextCursor: null,
      },
    })
  )
  await openNotes(page)
  await expect(page.locator('.study-note-stack')).toHaveClass(/is-ready/)
  const columns = await page
    .locator('.study-note-stack')
    .evaluate(
      (element) =>
        getComputedStyle(element).gridTemplateColumns.split(' ').length
    )
  expect(columns).toBe(info.project.name.includes('mobile') ? 2 : 3)
  if (info.project.name.includes('mobile'))
    await page
      .locator('.study-note-list')
      .screenshot({ path: '.tmp/notes-mobile-grid.png' })
  await page.locator('.study-note-card').first().click()
  const modal = page.locator('.note-detail-modal')
  await expect(modal.locator('header h1')).toBeVisible()
  if (info.project.name.includes('mobile')) {
    await expect(page.locator('.mobile-experience-alert')).toBeHidden()
    await expect(page.locator('.footer-com')).toBeHidden()
    await page.screenshot({ path: '.tmp/notes-mobile-full-height.png' })
  }
  await modal.locator('.diamond-close-btn').click()
  await expect(modal).toBeHidden()
})

test('note modal keeps desktop 16:9 size and fills mobile height with space for closing', async ({
  page,
}) => {
  let release = () => {}
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(
    `https://steam-api.anuluca.com/notes/${demoId}`,
    async (route) => {
      await pending
      await route.fulfill({
        contentType: 'text/markdown',
        body: '---\ntitle: "短笔记"\ndate: "2026-10-31"\ncategory: technology\n---\n\n只有一行正文。',
      })
    }
  )
  try {
    await openNotes(page)
    await expect(page.locator('.study-note-stack')).toHaveClass(/is-ready/)
    await page.locator('.study-note-card').first().click()
    const modal = page.locator('.note-detail-modal')
    await expect(modal.locator('.note-reader [role="status"]')).toBeVisible()
    await expectLoadingCentered(
      page,
      '.note-reader__loading .loading-logo',
      '.note-detail-modal .modal-scroll-region'
    )
    const measure = () =>
      modal.evaluate((el) => {
        const bounds = el.getBoundingClientRect()
        return {
          width: bounds.width,
          height: bounds.height,
          top: bounds.top,
          bottom: bounds.bottom,
          left: bounds.left,
          contentHeight: el.querySelector('.modal-scroll-region')!.clientHeight,
          rootFontSize: parseFloat(
            getComputedStyle(document.documentElement).fontSize
          ),
          closeBottom: el
            .querySelector('.diamond-close-btn')!
            .getBoundingClientRect().bottom,
          closeTop: el
            .querySelector('.diamond-close-btn')!
            .getBoundingClientRect().top,
          dialogBottom: bounds.bottom,
          viewportWidth: innerWidth,
          viewportHeight: innerHeight,
        }
      })
    const verifySize = (size: Awaited<ReturnType<typeof measure>>) => {
      const mobile = size.viewportWidth <= 768
      const width = mobile
        ? size.viewportWidth - 16
        : Math.min(
            size.viewportWidth - 160,
            ((size.viewportHeight - Math.max(80, size.rootFontSize * 3)) * 16) /
              9
          )
      expect(Math.abs(size.width - width)).toBeLessThanOrEqual(1)
      expect(
        Math.abs(
          size.height - (mobile ? size.viewportHeight - 156 : (width * 9) / 16)
        )
      ).toBeLessThanOrEqual(1)
      if (mobile) {
        expect(Math.abs(size.top - 44)).toBeLessThanOrEqual(1)
        expect(Math.abs(size.left - 8)).toBeLessThanOrEqual(1)
        expect(size.closeTop).toBeGreaterThan(size.bottom)
        expect(size.closeBottom).toBeLessThan(size.viewportHeight - 28)
      }
    }
    const loadingSize = await measure()
    release()
    verifySize(loadingSize)
    await expect(modal.locator('header h1')).toHaveText('短笔记')
    const contentSize = await measure()
    expect(
      Math.abs(contentSize.height - loadingSize.height)
    ).toBeLessThanOrEqual(1)
    expect(Math.abs(contentSize.width - loadingSize.width)).toBeLessThanOrEqual(
      1
    )
    expect(
      Math.abs(contentSize.contentHeight - loadingSize.contentHeight)
    ).toBeLessThanOrEqual(1)
    for (const viewport of [
      { width: 3840, height: 2160 },
      { width: 2560, height: 1440 },
      { width: 1920, height: 1400 },
      { width: 1024, height: 1000 },
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ]) {
      await page.setViewportSize(viewport)
      // 桌面端缩放前后均为 16:9，须等待实际尺寸更新，不能只等宽高比。
      await expect(async () => verifySize(await measure())).toPass({
        timeout: 15000,
      })
      const result = await measure()
      verifySize(result)
      if (viewport.width > 768) {
        expect(
          Math.abs(
            result.closeTop -
              result.dialogBottom -
              (result.viewportHeight - result.closeBottom)
          )
        ).toBeLessThanOrEqual(1)
      }
      expect(result.closeBottom).toBeLessThanOrEqual(result.viewportHeight + 1)
    }
  } finally {
    release()
  }
})

for (const empty of [false, true]) {
  test(`overview ${
    empty ? 'empty' : 'populated'
  } notes cache survives entering and returning to Notes without refresh`, async ({
    page,
  }) => {
    let count = 0
    await page.route('https://steam-api.anuluca.com/notes', (route) => {
      count++
      return route.fulfill({
        json: { notes: empty ? [] : [demoSummary], nextCursor: null },
      })
    })
    const initial = page.waitForResponse(
      (response) => new URL(response.url()).pathname === '/notes'
    )
    await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
    await (await initial).finished()
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    )
    await expect(page.locator('.island-focus').first()).toBeVisible({
      timeout: 45000,
    })
    for (let visit = 0; visit < 2; visit++) {
      await pushNoteRoute(page, '/atrium/notes')
      if (empty)
        await expect(page.locator('.study-note-empty')).toBeVisible({
          timeout: 20000,
        })
      else
        await expect(page.locator('.study-note-stack')).toHaveClass(
          /is-ready/,
          { timeout: 20000 }
        )
      await expect(page.locator('.study-note-loading')).toHaveCount(0)
      expect(count).toBe(1)
      await pushNoteRoute(page, '/atrium')
      await expect(page.locator('.island-notes-content')).toHaveCount(0, {
        timeout: 15000,
      })
    }
  })
}

for (const empty of [false, true]) {
  test(`expired ${
    empty ? 'empty' : 'populated'
  } notes cache refreshes on window return with one shared request`, async ({
    page,
  }) => {
    const initialTime = new Date('2026-11-01T00:00:00Z')
    await page.clock.setFixedTime(initialTime)
    let count = 0
    let release = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    await page.route('https://steam-api.anuluca.com/notes', async (route) => {
      count++
      if (count > 1) await held
      return route.fulfill({
        json: {
          notes:
            count === 1
              ? empty
                ? []
                : [demoSummary]
              : [
                  {
                    ...demoSummary,
                    id: remoteId,
                    title: '更新后的在线笔记',
                    path: `/atrium/notes?note=${remoteId}`,
                  },
                ],
          nextCursor: null,
        },
      })
    })
    try {
      await openNotes(page)
      await expect(
        page.locator(empty ? '.study-note-empty' : '.study-note-card')
      ).toBeVisible()
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      expect(count).toBe(1)
      await page.clock.setFixedTime(new Date(initialTime.getTime() + 61000))
      await page.evaluate(() => {
        window.dispatchEvent(new Event('focus'))
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await expect.poll(() => count).toBe(2)
      if (!empty) {
        await expect(page.locator('.study-note-card')).toContainText(
          demoSummary.title
        )
        await expect(page.locator('.study-note-loading')).toHaveCount(0)
      }
      release()
      await expect(page.locator('.study-note-card')).toContainText(
        '更新后的在线笔记'
      )
      expect(count).toBe(2)
    } finally {
      release()
    }
  })
}

test('direct Notes access shares one first request and centers the image-list loading icon', async ({
  page,
}) => {
  let count = 0
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('https://steam-api.anuluca.com/notes', async (route) => {
    count++
    await held
    await route.fulfill({ json: { notes: [demoSummary], nextCursor: null } })
  })
  try {
    await openNotes(page)
    const loading = page.locator('.study-note-loading')
    await expect(loading).toBeVisible()
    expect(count).toBe(1)
    await expect(page.locator('.study-note-empty')).toHaveCount(0)
    await expectLoadingCentered(
      page,
      '.study-note-loading .loading-logo',
      '.island-detail__viewport .scroll-viewport__scroll'
    )
    release()
    await expect(page.locator('.study-note-card')).toHaveCount(1)
    await expect(loading).toHaveCount(0)
    expect(count).toBe(1)
  } finally {
    release()
  }
})

test('entering Notes while overview request is pending reuses that request', async ({
  page,
}) => {
  let count = 0
  let release = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('https://steam-api.anuluca.com/notes', async (route) => {
    count++
    await held
    await route.fulfill({ json: { notes: [demoSummary], nextCursor: null } })
  })
  try {
    await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
    await expect.poll(() => count, { timeout: 45000 }).toBe(1)
    await expect(page.locator('.island-focus').first()).toBeVisible({
      timeout: 45000,
    })
    await pushNoteRoute(page, '/atrium/notes')
    await expect(page.locator('.study-note-loading')).toBeVisible()
    expect(count).toBe(1)
    release()
    await expect(page.locator('.study-note-card')).toHaveCount(1)
    await expect(page.locator('.study-note-loading')).toHaveCount(0)
    expect(count).toBe(1)
  } finally {
    release()
  }
})

test('shared category tabs filter before pagination and reset to the first page', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'anutrium:mobile-experience-alert-dismiss-until',
      String(Date.now() + 86400000)
    )
  )
  const summaries = [
    ...Array.from({ length: 21 }, (_, index) => ({
      ...demoSummary,
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      title: `技术笔记 ${index + 1}`,
    })),
    { ...demoSummary, id: remoteId, type: 'pokemon', title: '宝可梦笔记' },
    { ...demoSummary, id: 'test-1', type: 'test', title: '测试笔记一' },
    { ...demoSummary, id: 'test-2', type: 'test', title: '测试笔记二' },
  ]
  await page.route('https://steam-api.anuluca.com/notes**', (route) =>
    route.fulfill({ json: { notes: summaries, nextCursor: null } })
  )
  await openNotes(page)
  const notes = page.locator('.island-notes-content')
  const tabs = notes.getByRole('navigation', { name: '笔记分类' })
  const tab = (title: string) =>
    tabs
      .getByRole('button')
      .filter({ has: page.locator('strong', { hasText: title }) })
  const cards = notes.locator('.study-note-card')
  const pagination = notes.locator('.study-note-pagination')
  await expect(tabs).toHaveClass(/filter-rail--horizontal/)
  await expect(tabs.locator('strong')).toHaveText([
    'ALL',
    'TECHNOLOGY',
    'POKÉMON',
    'DAILY',
    'TEST',
  ])
  await expect(tabs.locator('.filter-rail__count')).toHaveText([
    '22',
    '21',
    '1',
    '0',
    '2',
  ])
  await expect(cards).toHaveCount(12)
  await expect(cards.first()).toBeVisible()
  const geometry = await notes
    .locator('.study-note-toolbar')
    .evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      const row = element.parentElement!.getBoundingClientRect()
      return { left: bounds.left - row.left, right: row.right - bounds.right }
    })
  expect(Math.abs(geometry.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(geometry.right)).toBeLessThanOrEqual(1)
  await expect(cards.first().locator('.study-note-card__category')).toHaveText(
    '[TECHNOLOGY]'
  )
  await pagination.getByRole('button', { name: '2', exact: true }).click()
  await expect(cards).toHaveCount(10)
  await tab('POKÉMON').click()
  await expect(tab('POKÉMON')).toHaveClass(/is-active/)
  await expect(cards).toHaveCount(1)
  await expect(cards.locator('h2')).toHaveText('宝可梦笔记')
  await expect(pagination).toHaveCount(0)
  await tab('TECHNOLOGY').click()
  await expect(cards).toHaveCount(12)
  await pagination.getByRole('button', { name: '2', exact: true }).click()
  await expect(cards).toHaveCount(9)
  await tab('DAILY').click()
  await expect(cards).toHaveCount(0)
  await expect(notes.locator('.study-note-empty')).toBeVisible()
  await tab('TEST').click()
  await expect(cards).toHaveCount(2)
  await expect(cards.locator('h2')).toHaveText(['测试笔记一', '测试笔记二'])
  await expect(pagination).toHaveCount(0)
  await tab('ALL').click()
  await expect(cards).toHaveCount(12)
  await expect(pagination.locator('[aria-current="page"]')).toHaveText('1')
  await expect(tabs.locator('.filter-rail__count')).toHaveText([
    '22',
    '21',
    '1',
    '0',
    '2',
  ])
})

test('every Notes category supports direct URLs, refresh and invalid-category fallback', async ({
  page,
}) => {
  test.setTimeout(180000)
  const categories = ['technology', 'pokemon', 'daily', 'test'] as const
  const summaries = categories.map((type, index) => ({
    ...demoSummary,
    id: `category-${index}`,
    type,
    title: `category ${type}`,
  }))
  await page.route('https://steam-api.anuluca.com/notes**', (route) =>
    route.fulfill({ json: { notes: summaries, nextCursor: null } })
  )
  const notes = page.locator('.island-notes-content')
  for (const [category, label, count] of [
    ['all', 'ALL', 3],
    ['technology', 'TECHNOLOGY', 1],
    ['pokemon', 'POKÉMON', 1],
    ['daily', 'DAILY', 1],
    ['test', 'TEST', 1],
    ['invalid', 'ALL', 3],
  ] as const) {
    await openNotes(page, `?category=${category}`)
    await expect(
      notes.locator('.study-note-filters button.is-active strong')
    ).toHaveText(label)
    await expect(notes.locator('.study-note-card')).toHaveCount(count)
    if (category !== 'all' && category !== 'invalid')
      await expect(notes.locator('.study-note-card h2')).toHaveText(
        `category ${category}`
      )
  }
  await pushNoteRoute(page, '/atrium/notes?category=test')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(
    notes.locator('.study-note-filters button.is-active strong')
  ).toHaveText('TEST', { timeout: 45000 })
  await expect(notes.locator('.study-note-card h2')).toHaveText('category test')
})

test('category routes preserve note links, query parameters, history and the scene', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'anutrium:mobile-experience-alert-dismiss-until',
      String(Date.now() + 86400000)
    )
  )
  await page.route('https://steam-api.anuluca.com/notes**', (route) => {
    if (new URL(route.request().url()).pathname.endsWith(demoId))
      return route.fulfill({
        contentType: 'text/markdown',
        body: demoSource.replace('category: technology', 'category: test'),
      })
    return route.fulfill({
      json: {
        notes: [
          { ...demoSummary, type: 'test' },
          {
            ...demoSummary,
            id: remoteId,
            type: 'pokemon',
            title: 'Pokemon note',
          },
        ],
        nextCursor: null,
      },
    })
  })
  await openNotes(page, '?category=test&keep=1#notes')
  const notes = page.locator('.island-notes-content')
  const cards = notes.locator('.study-note-card')
  const modal = page.locator('.note-detail-modal')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toHaveAttribute('href', /category=test.*note=/)
  await page.evaluate(() => {
    ;(window as any).notesCategoryCanvas = document.querySelector(
      '.temple-stage canvas'
    )
  })
  await cards.first().click()
  await expect(modal).toBeVisible()
  const opened = new URL(page.url())
  expect(opened.searchParams.get('category')).toBe('test')
  expect(opened.searchParams.get('keep')).toBe('1')
  expect(opened.searchParams.get('note')).toBe(demoId)
  expect(opened.hash).toBe('#notes')
  await page.goBack()
  await expect(modal).toBeHidden()
  await expect(cards).toHaveCount(1)
  await expect(
    notes.locator('.study-note-filters .is-active strong')
  ).toHaveText('TEST')
  await page.goForward()
  await expect(modal).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  expect(new URL(page.url()).searchParams.get('category')).toBe('test')
  expect(new URL(page.url()).searchParams.has('note')).toBe(false)
  await notes
    .locator('.study-note-filters button')
    .filter({ hasText: 'POKÉMON' })
    .click()
  await expect(cards.locator('h2')).toHaveText('Pokemon note')
  expect(new URL(page.url()).searchParams.get('category')).toBe('pokemon')
  expect(new URL(page.url()).searchParams.get('keep')).toBe('1')
  expect(new URL(page.url()).hash).toBe('#notes')
  await page.goBack()
  await expect(
    notes.locator('.study-note-filters .is-active strong')
  ).toHaveText('TEST')
  await page.goForward()
  await expect(
    notes.locator('.study-note-filters .is-active strong')
  ).toHaveText('POKÉMON')
  await notes
    .locator('.study-note-filters button')
    .filter({ hasText: 'ALL' })
    .click()
  await expect(cards).toHaveCount(1)
  await expect(cards.locator('h2')).toHaveText('Pokemon note')
  expect(new URL(page.url()).searchParams.get('category')).toBe('all')
  expect(
    await page.evaluate(
      () =>
        (window as any).notesCategoryCanvas ===
        document.querySelector('.temple-stage canvas')
    )
  ).toBe(true)
  await expect(page.locator('.route-curtain')).toHaveCount(0)
})

test('manual refresh bypasses the cache, keeps the category and clamps pagination', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'anutrium:mobile-experience-alert-dismiss-until',
      String(Date.now() + 86400000)
    )
  )
  let requests = 0
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('https://steam-api.anuluca.com/notes**', async (route) => {
    requests++
    if (requests > 2) return route.fulfill({ status: 503 })
    if (requests > 1) await gate
    return route.fulfill({
      json: {
        notes:
          requests === 1
            ? Array.from({ length: 21 }, (_, index) => ({
                ...demoSummary,
                id: `refresh-${index}`,
              }))
            : [{ ...demoSummary, title: '刷新后的笔记' }],
        nextCursor: null,
      },
    })
  })
  await openNotes(page, '?category=technology')
  const notes = page.locator('.island-notes-content')
  const refresh = notes.getByRole('button', { name: '刷新笔记', exact: true })
  await expect(notes.locator('.study-note-card')).toHaveCount(12)
  await notes
    .locator('.study-note-pagination')
    .getByRole('button', { name: '2', exact: true })
    .click()
  await expect(notes.locator('.study-note-card')).toHaveCount(9)
  await expect(refresh).toHaveText('')
  await expect(refresh.locator('svg')).toHaveCount(1)
  const geometry = await notes
    .locator('.study-note-toolbar')
    .evaluate((element) => {
      const rail = element
        .querySelector('.filter-rail')!
        .getBoundingClientRect()
      const button = element
        .querySelector('.study-note-refresh')!
        .getBoundingClientRect()
      const row = element.getBoundingClientRect()
      return {
        overlap: rail.right - button.left,
        right: row.right - button.right,
        iconRight:
          row.right -
          element
            .querySelector('.study-note-refresh .el-icon')!
            .getBoundingClientRect().right,
      }
    })
  expect(geometry.overlap).toBeLessThanOrEqual(1)
  expect(Math.abs(geometry.right)).toBeLessThanOrEqual(1)
  expect(Math.abs(geometry.iconRight)).toBeLessThanOrEqual(1)
  try {
    expect(requests).toBe(1)
    await refresh.click()
    await expect(refresh).toBeDisabled()
    await expect(refresh.locator('.loading-logo')).toHaveCount(1)
    await expect.poll(() => requests).toBe(2)
    await expect(page.getByText('NOTES已刷新', { exact: true })).toHaveCount(0)
    release()
    await expect(refresh).toBeEnabled()
    await expect(notes.locator('.study-note-card h2')).toHaveText(
      '刷新后的笔记'
    )
    await expect(notes.locator('.study-note-pagination')).toHaveCount(0)
    await expect(
      notes.locator('.study-note-filters .is-active strong')
    ).toHaveText('TECHNOLOGY')
    expect(new URL(page.url()).searchParams.get('category')).toBe('technology')
    expect(requests).toBe(2)
    const success = page.getByText('NOTES已刷新', { exact: true })
    await expect(success).toBeVisible()
    await expect(success).toHaveCount(1)
    await expect(success).toBeHidden({ timeout: 5000 })
    await refresh.click()
    await expect(notes.locator('.study-note-service')).toBeVisible()
    await expect(refresh).toBeEnabled()
    await expect(success).toHaveCount(0)
    await expect(notes.locator('.study-note-card h2')).toHaveText(
      '刷新后的笔记'
    )
  } finally {
    release()
  }
})

const trackTitleEntrances = (page: Page) =>
  page.addInitScript(() => {
    ;(window as any).noteTitleStarts = 0
    new MutationObserver((records) => {
      for (const record of records) {
        const element = record.target as HTMLElement
        if (
          record.attributeName === 'data-note-enter' &&
          element.matches?.('.note-reader') &&
          element.dataset.noteEnter === 'title'
        )
          (window as any).noteTitleStarts++
      }
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-note-enter'],
    })
  })

test('note entrance wipes the enlarged title, reveals metadata, holds then moves and reveals first-screen semantic blocks', async ({
  page,
}) => {
  // 直接读取实际时间轴，避免繁忙设备的 RAF 采样漏帧误报动画时长。
  await page.route('**/src/utils/noteEntrance.ts*', async (route) => {
    const response = await route.fetch()
    const source = await response.text()
    expect(source).toContain('.timeline()')
    expect(source).toContain('gsap.to(blocks, {')
    await route.fulfill({
      response,
      body: source
        .replace(
          '.timeline()',
          '.timeline({ onStart() { window.__noteEntranceTimeline = this } })'
        )
        .replace(
          'gsap.to(blocks, {',
          'window.__noteBodyTween = gsap.to(blocks, {'
        ),
    })
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await trackTitleEntrances(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const paragraph =
    '这是用于检查真实换行的正文，保留**强调文字**与[可点击链接](https://example.com)。'.repeat(
      2
    )
  const source = `---\ntitle: "入场"\ndate: "2026-11-01"\ncategory: technology\n---\n\n${paragraph}\n\n${Array.from(
    { length: 12 },
    (_, i) =>
      `第 ${i + 1} 段正文。${'后续段落直接显示，无需等待滚动动画。'.repeat(8)}`
  ).join('\n\n')}`
  await page.route(`https://steam-api.anuluca.com/notes/${demoId}`, (route) =>
    route.fulfill({ contentType: 'text/markdown', body: source })
  )
  await page.addInitScript(() => {
    const samples: {
      stage: string
      center: number
      meta: string
      metaMask: string
      time: number
      body: string
    }[] = []
    ;(window as any).noteEntranceSamples = samples
    const sample = () => {
      const reader = document.querySelector<HTMLElement>(
        '.note-reader[data-note-enter]'
      )
      const stage = reader?.dataset.noteEnter
      if (
        reader &&
        stage &&
        !samples.some((sample) => sample.stage === stage) &&
        reader.querySelector('header')
      ) {
        const header = reader.querySelector('header')!,
          meta = header.querySelector('.note-reader__meta')!,
          title = header.querySelector('h1')!
        const viewport = reader
          .closest('.modal-scroll-region')!
          .getBoundingClientRect()
        const m = meta.getBoundingClientRect(),
          t = title.getBoundingClientRect()
        samples.push({
          stage,
          center: Math.abs(
            (Math.min(m.top, t.top) + Math.max(m.bottom, t.bottom)) / 2 -
              (viewport.top + viewport.height / 2)
          ),
          meta: getComputedStyle(meta.querySelector('.note-reader__category')!)
            .opacity,
          metaMask: getComputedStyle(meta).maskImage,
          time: performance.now(),
          body: getComputedStyle(reader.querySelector('.note-markdown')!)
            .visibility,
        })
      }
      const titleElement = reader?.querySelector<HTMLElement>('header h1')
      if (titleElement && stage === 'title') {
        const reveal = parseFloat(
          titleElement.style.getPropertyValue('--note-title-reveal')
        )
        if (reveal > 0 && reveal < 104) (window as any).noteTitleWiped = true
        if (getComputedStyle(titleElement).maskImage !== 'none')
          (window as any).noteTitleMask = true
        if (titleElement.children.length)
          (window as any).noteTitleWasSplit = true
        const matrix = new DOMMatrixReadOnly(
          getComputedStyle(reader!.querySelector('header')!).transform
        )
        ;(window as any).noteTitleInitialScale = matrix.a
      }
      if (reader && stage === 'meta' && titleElement) {
        const reveal = parseFloat(
          titleElement.style.getPropertyValue('--note-title-reveal')
        )
        const opacity = Number(
          getComputedStyle(
            reader.querySelector('.note-reader__header .note-reader__category')!
          ).opacity
        )
        const flashes = ((window as any).noteMetaFlashes ??= [])
        if (flashes.at(-1) !== opacity) flashes.push(opacity)
        if (
          opacity === 0 &&
          Number(
            getComputedStyle(reader.querySelector('header time')!).opacity
          ) !== 0
        )
          (window as any).noteDateAppearedBeforeCategory = true
        if (reveal > 0 && reveal < 104 && opacity === 1)
          (window as any).noteMetaOverlapsWipeTail = true
      }
      if (reader && stage === 'moving') {
        const meta = reader.querySelector('.note-reader__meta')!
        const opacity = Number(getComputedStyle(meta).opacity)
        if (opacity > 0 && opacity < 1)
          (window as any).noteMetaFadesWhileMoving = true
      }
      const blocks = reader?.querySelectorAll(
        '.note-markdown > [data-note-reveal="active"]'
      )
      if (blocks && blocks.length > 1) {
        const opacity = Array.from(blocks).map((block) =>
          Number(getComputedStyle(block).opacity)
        )
        if (Math.max(...opacity) - Math.min(...opacity) > 0.05)
          (window as any).noteBlocksStaggered = true
      }
      if (reader?.querySelector('.note-enter-line'))
        (window as any).noteBodyWasSplit = true
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await openNotes(page, `?note=${demoId}`)
  const reader = page.locator('.note-reader')
  await expect(reader).toHaveAttribute('data-note-enter', 'ready', {
    timeout: 15000,
  })
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).noteEntranceSamples.some(
          (sample: { stage: string }) => sample.stage === 'ready'
        )
      )
    )
    .toBe(true)
  const samples = await page.evaluate(
    () =>
      (window as any).noteEntranceSamples as {
        stage: string
        center: number
        meta: string
        metaMask: string
        time: number
        body: string
      }[]
  )
  expect(samples.map((sample) => sample.stage)).toEqual(
    expect.arrayContaining(['title', 'meta', 'hold', 'moving'])
  )
  expect(
    samples.find((sample) => sample.stage === 'title')!.center
  ).toBeLessThanOrEqual(2)
  expect(samples.find((sample) => sample.stage === 'title')!.meta).toBe('0')
  expect(samples.find((sample) => sample.stage === 'title')!.metaMask).toBe(
    'none'
  )
  expect(samples.find((sample) => sample.stage === 'moving')!.body).toBe(
    'hidden'
  )
  expect(samples.find((sample) => sample.stage === 'hold')!.meta).toBe('1')
  expect(samples.find((sample) => sample.stage === 'hold')!.metaMask).toBe(
    'none'
  )
  expect(
    samples.find((sample) => sample.stage === 'hold')!.center
  ).toBeLessThanOrEqual(2)
  expect(samples.find((sample) => sample.stage === 'moving')!.meta).toBe('1')
  const timing = await reader.evaluate((element) => {
    const timeline = (window as any).__noteEntranceTimeline
    const move = timeline
      .getChildren(false, true, false)
      .find((tween: any) =>
        tween.targets().includes(element.querySelector('header'))
      )
    return {
      hold: timeline.labels.moving - timeline.labels.hold,
      move: move.duration(),
      body: (window as any).__noteBodyTween.vars.duration,
      bodyTotal: (window as any).__noteBodyTween.duration(),
      titleFlashes: timeline
        .getChildren(false, true, false)
        .filter(
          (tween: any) =>
            tween.targets().includes(element.querySelector('h1')) &&
            typeof tween.vars.opacity === 'number'
        )
        .map((tween: any) => ({
          opacity: tween.vars.opacity,
          time: tween.startTime(),
        })),
    }
  })
  expect(timing.hold).toBeCloseTo(0.4, 5)
  expect(timing.move).toBe(1.6)
  expect(timing.body).toBe(0.8)
  expect(timing.bodyTotal).toBeLessThanOrEqual(1.21)
  expect(
    timing.titleFlashes.map((flash: { opacity: number }) => flash.opacity)
  ).toEqual([1, 0, 1, 0])
  expect(timing.titleFlashes[3].time - timing.titleFlashes[0].time).toBeCloseTo(
    0.18,
    5
  )
  expect(timing.titleFlashes[3].time).toBeLessThan(1.8)
  expect(await page.evaluate(() => (window as any).noteMetaFlashes)).toEqual([
    1, 0, 1, 0, 1,
  ])
  expect(
    await page.evaluate(() => (window as any).noteDateAppearedBeforeCategory)
  ).toBeUndefined()
  const phases = samples
    .map((sample) => sample.stage)
    .filter((stage) =>
      ['title', 'meta', 'hold', 'moving', 'ready'].includes(stage)
    )
  expect(phases).toEqual(['title', 'meta', 'hold', 'moving', 'ready'])
  await expect
    .poll(() => page.evaluate(() => (window as any).noteBlocksStaggered))
    .toBe(true)
  expect(await page.evaluate(() => (window as any).noteTitleWiped)).toBe(true)
  expect(
    await page.evaluate(() => (window as any).noteMetaOverlapsWipeTail)
  ).toBe(true)
  expect(
    await page.evaluate(() => (window as any).noteMetaFadesWhileMoving)
  ).toBeUndefined()
  expect(await page.evaluate(() => (window as any).noteTitleMask)).toBe(true)
  expect(
    await page.evaluate(() => (window as any).noteTitleWasSplit)
  ).toBeUndefined()
  if (!page.viewportSize() || page.viewportSize()!.width > 768)
    expect(
      await page.evaluate(() => (window as any).noteTitleInitialScale)
    ).toBeGreaterThan(1.5)
  await expect(reader.locator('header h1')).toHaveCSS('mask-image', 'none')
  await expect(reader.locator('header h1')).toHaveText('入场')
  expect(
    await reader
      .locator('.note-reader__header')
      .evaluate(
        (header) =>
          header.querySelector('.note-reader__meta')!.getBoundingClientRect()
            .top - header.querySelector('h1')!.getBoundingClientRect().bottom
      )
  ).toBeGreaterThanOrEqual(0)
  const first = reader.locator('.note-markdown > p').first()
  await expect(first).not.toHaveAttribute(
    'data-note-reveal',
    /pending|active/,
    { timeout: 5000 }
  )
  await expect(first.locator('strong').first()).toHaveCSS('font-weight', '900')
  await expect(first.locator('a').first()).toHaveAttribute(
    'href',
    'https://example.com'
  )
  expect(
    await page.evaluate(() => (window as any).noteBodyWasSplit)
  ).toBeUndefined()
  const last = reader.locator('.note-markdown > p').last()
  await expect(last).not.toHaveAttribute('data-note-reveal')
  await expect(last).toHaveCSS('opacity', '1')
  await expect(last).toHaveCSS('transform', 'none')
  await last.scrollIntoViewIfNeeded()
  await expect(last).not.toHaveAttribute('data-note-reveal', /pending|active/, {
    timeout: 5000,
  })
  await expect(last.locator('.note-enter-line')).toHaveCount(0)
  await page.locator('.note-detail-modal .diamond-close-btn').click()
  await expect(page.locator('.note-detail-modal')).toBeHidden()
  await page.locator('.study-note-card').first().click()
  await expect
    .poll(() => page.evaluate(() => (window as any).noteTitleStarts))
    .toBe(2)
  await page.setViewportSize({ width: 800, height: 700 })
  await expect(reader).toHaveAttribute('data-note-enter', 'ready')
  await expect(reader.locator('[data-note-reveal]')).toHaveCount(0)
  await page.locator('.note-detail-modal .diamond-close-btn').click()
  await expect(page.locator('.note-detail-modal')).toBeHidden()
  await page.locator('.study-note-card').first().click()
  await expect
    .poll(() => page.evaluate(() => (window as any).noteTitleStarts))
    .toBe(3)
  await page.keyboard.press('Escape')
  await expect(page.locator('.note-detail-modal')).toBeHidden()
  expect(errors).toEqual([])
})

test('reopening the same note during modal exit restarts its entrance without remounting the reader', async ({
  page,
}) => {
  await trackTitleEntrances(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.route(`https://steam-api.anuluca.com/notes/${demoId}`, (route) =>
    route.fulfill({
      contentType: 'text/markdown',
      body: '---\ntitle: "重开入场"\ndate: "2026-11-01"\ncategory: technology\n---\n\n笔记正文。',
    })
  )
  await openNotes(page, `?note=${demoId}`)
  const reader = page.locator('.note-reader')
  await expect(reader).toHaveAttribute('data-note-enter', 'ready', {
    timeout: 15000,
  })
  await reader.evaluate((element) =>
    element.setAttribute('data-test-instance', 'retained')
  )
  await pushNoteRoute(page, '/atrium/notes')
  await expect(reader).toBeAttached()
  await pushNoteRoute(page, `/atrium/notes?note=${demoId}`)
  await expect(reader).toHaveAttribute('data-test-instance', 'retained')
  await expect
    .poll(() => page.evaluate(() => (window as any).noteTitleStarts))
    .toBe(2)
  await expect(reader).toHaveAttribute('data-note-enter', 'ready', {
    timeout: 10000,
  })
})

test('semantic body entrance preserves Markdown nodes and leaves later blocks visible', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const content =
    '首段**加粗**和[链接](https://example.com)。\n\n> 引用第一段。\n>\n> 引用第二段。\n\n| 项目 | 结果 |\n| --- | --- |\n| 表格 | 保持完整 |\n\n```js\n// 注释\nconst value = 1;\n```\n\n- 父列表\n  - 子列表\n\n$$x^2 + y^2 = 1$$\n\n' +
    Array.from(
      { length: 12 },
      (_, index) => `后续段落 ${index}。${'保持正常阅读。'.repeat(25)}`
    ).join('\n\n')
  await page.route(`https://steam-api.anuluca.com/notes/${demoId}`, (route) =>
    route.fulfill({
      contentType: 'text/markdown',
      body: `---\ntitle: "正文"\ndate: "2026-11-01"\ncategory: technology\n---\n\n${content}`,
    })
  )
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      const body = document.querySelector('.note-markdown')
      if (!body?.firstElementChild) return
      ;(window as any).originalNoteBody = body.innerHTML
      ;(window as any).noteBodyMutations = 0
      new MutationObserver((records) => {
        ;(window as any).noteBodyMutations += records.length
      }).observe(body, { childList: true, subtree: true })
      observer.disconnect()
    })
    observer.observe(document, { childList: true, subtree: true })
  })
  await openNotes(page, `?note=${demoId}`)
  const reader = page.locator('.note-reader'),
    body = reader.locator('.note-markdown')
  await expect(reader).toHaveAttribute('data-note-enter', 'ready', {
    timeout: 15000,
  })
  const last = body.locator(':scope > p').last()
  await expect(last).not.toHaveAttribute('data-note-reveal')
  await expect(last).toHaveCSS('opacity', '1')
  await expect.poll(() => body.locator('[data-note-reveal]').count()).toBe(0)
  expect(await page.evaluate(() => (window as any).noteBodyMutations)).toBe(0)
  const html = await body.innerHTML()
  const original = await page.evaluate(
    () => (window as any).originalNoteBody as string
  )
  expect(html.replace(/ style=""/g, '')).toBe(
    original.replace(/ style=""/g, '')
  )
  await expect(body.locator('.note-enter-line')).toHaveCount(0)
  await expect(body.locator('blockquote > p')).toHaveCount(2)
  await expect(body.locator('.note-code-line')).toHaveCount(2)
  await expect(body.locator('ul ul')).toHaveCount(1)
  await expect(body.locator('.katex')).toHaveCount(1)
  await last.scrollIntoViewIfNeeded()
  await expect(body.locator('[data-note-reveal]')).toHaveCount(0)
})

test('note title compacts outside the body scroller and desktop wheels use nested Lenis', async ({
  page,
}, info) => {
  const source =
    demoSource.replace('---\n\n', '---\n\n[跳到结尾](#note-bottom)\n\n') +
    '\n\n' +
    '## 正文段落\n\n固定标题回归内容。\n\n'.repeat(35) +
    '\n\n## note-bottom\n\n结尾正文。'
  await page.route(`https://steam-api.anuluca.com/notes/${demoId}`, (route) =>
    route.fulfill({ contentType: 'text/markdown', body: source })
  )
  await openNotes(page, `?note=${demoId}`)
  const reader = page.locator('.note-reader')
  const scroll = reader.locator('.note-reader__body-scroll')
  const header = reader.locator('.note-reader__header')
  await expect(reader).toHaveAttribute('data-note-enter', 'ready')
  const measureHeader = () =>
    header.evaluate((el) => {
      const box = el.getBoundingClientRect(),
        title = el.querySelector('h1')!
      return {
        top: box.top,
        left: box.left,
        width: box.width,
        height: box.height,
        font: getComputedStyle(title).fontSize,
        gap: parseFloat(getComputedStyle(title).marginBottom),
        transform: getComputedStyle(title).transform,
        insideScroll: !!el.closest('.note-reader__body-scroll'),
      }
    })
  const before = await measureHeader()
  expect(before.insideScroll).toBe(false)
  expect(await scroll.evaluate((el) => el.clientHeight)).toBeGreaterThan(80)
  const progress = reader.locator('.page-scroll-progress')
  const progressBefore = (await progress.boundingBox())!
  expect(
    Math.abs(progressBefore.y - (before.top + before.height))
  ).toBeLessThanOrEqual(1)
  const assertFixedProgress = async () => {
    const box = (await progress.boundingBox())!
    expect(Math.abs(box.y - progressBefore.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(box.height - progressBefore.height)).toBeLessThanOrEqual(1)
    const edge = await page.locator('.note-detail-modal').evaluate((el) => {
      return (
        el.getBoundingClientRect().right -
        parseFloat(getComputedStyle(el).borderRightWidth)
      )
    })
    expect(Math.abs(box.x + box.width - edge)).toBeLessThanOrEqual(1)
    const bottom = await page.locator('.note-detail-modal').evaluate((el) => {
      return (
        el.getBoundingClientRect().bottom -
        parseFloat(getComputedStyle(el).borderBottomWidth)
      )
    })
    expect(Math.abs(box.y + box.height - bottom)).toBeLessThanOrEqual(1)
  }
  await assertFixedProgress()
  expect(
    await scroll.evaluate((el) => getComputedStyle(el).scrollbarWidth)
  ).toBe('none')
  await reader.evaluate((el) => {
    const samples: { top: number; height: number }[] = []
    ;(window as any).noteProgressBounds = samples
    const start = performance.now()
    const sample = () => {
      const box = el
        .querySelector('.page-scroll-progress')!
        .getBoundingClientRect()
      samples.push({ top: box.top, height: box.height })
      if (performance.now() - start < 500) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await scroll.evaluate((el) => {
    el.scrollTop = 360
  })
  await expect(reader).toHaveClass(/is-header-compact/)
  await expect
    .poll(async () => (await measureHeader()).height)
    .toBeLessThan(before.height)
  const compact = await measureHeader()
  expect(parseFloat(compact.font)).toBeLessThan(parseFloat(before.font))
  expect(compact.gap).toBeLessThan(before.gap)
  expect(compact.insideScroll).toBe(false)
  await assertFixedProgress()
  await expect
    .poll(() =>
      progress.evaluate((el) =>
        parseFloat(el.style.getPropertyValue('--page-scroll-progress-scale'))
      )
    )
    .toBeGreaterThan(0)
  await expect(reader.locator('.note-reader__scroll-header')).toHaveCount(0)
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBe(360)
  expect(
    await page
      .locator('.note-detail-modal .modal-scroll-region')
      .evaluate((el) => el.scrollTop)
  ).toBe(0)
  await scroll.evaluate((el) => {
    el.scrollTop = 0
  })
  await expect(reader).not.toHaveClass(/is-header-compact/)
  await expect.poll(measureHeader).toEqual(before)
  await assertFixedProgress()
  const progressSamples = await page.evaluate(
    () =>
      (window as any).noteProgressBounds as { top: number; height: number }[]
  )
  expect(progressSamples.length).toBeGreaterThan(1)
  for (const box of progressSamples) {
    expect(Math.abs(box.top - progressBefore.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(box.height - progressBefore.height)).toBeLessThanOrEqual(1)
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const touch = await page.evaluate(
    () => matchMedia('(hover: none) and (pointer: coarse)').matches
  )
  if (!touch) await expect(scroll).toHaveClass(/lenis/)
  else await expect(scroll).not.toHaveClass(/lenis/)
  await scroll.evaluate((el) => {
    const values: number[] = []
    ;(window as any).noteWheelSamples = values
    el.addEventListener('scroll', () => values.push(el.scrollTop), {
      passive: true,
    })
  })
  await scroll.evaluate((el) => {
    el.addEventListener(
      'wheel',
      (event) => {
        ;(window as any).noteInputWheelDelta = event.deltaY
      },
      { once: true, passive: true }
    )
  })
  await scroll.hover()
  await page.mouse.wheel(0, 320)
  // 手机驱动的设备像素输入与 WheelEvent 的 CSS 像素不同；按实际接收的输入检查交接。
  const wheelDelta = await page.evaluate(() =>
    Math.abs((window as any).noteInputWheelDelta)
  )
  expect(wheelDelta).toBeGreaterThan(0)
  await expect
    .poll(() => scroll.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(Math.min(250, wheelDelta * 0.75))
  if (!touch) {
    const samples = await page.evaluate(
      () => (window as any).noteWheelSamples as number[]
    )
    expect(
      new Set(samples.map((value) => Math.round(value))).size
    ).toBeGreaterThan(3)
  }
  await expect(reader).toHaveClass(/is-header-compact/)
  await expect
    .poll(async () => (await measureHeader()).height)
    .toBeLessThan(before.height)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(scroll).not.toHaveClass(/lenis/)
  await scroll.evaluate((el) => {
    el.scrollTop = 0
  })
  await reader.getByRole('link', { name: '跳到结尾', exact: true }).click()
  await expect
    .poll(() => scroll.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(1000)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await assertFixedProgress()
  await page.screenshot({ path: info.outputPath('note-fixed-header.png') })
})

test('reopening a scrolled note resets its reader and restores content after closing or cancelling exit', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const source =
    demoSource + '\n\n' + '## 重开回归\n\n这是滚动后的正文。\n\n'.repeat(35)
  await page.route(`https://steam-api.anuluca.com/notes/${demoId}`, (route) =>
    route.fulfill({ contentType: 'text/markdown', body: source })
  )
  await openNotes(page, `?note=${demoId}`)
  const reader = page.locator('.note-reader')
  const modal = page.locator('.note-detail-modal')
  const scroll = modal.locator('.note-reader__body-scroll')
  const assertFreshReader = async () => {
    await expect(reader).toHaveAttribute('data-note-enter', 'ready', {
      timeout: 15000,
    })
    await expect(reader.locator('.note-markdown')).toHaveCSS(
      'visibility',
      'visible'
    )
    await expect(reader).not.toHaveClass(/is-header-condensed|is-header-moving/)
    await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBe(0)
    await expect(reader.locator('.note-reader__header')).toHaveCSS(
      'opacity',
      '1'
    )
    await expect(reader.locator('.note-markdown > p').first()).toBeVisible()
  }
  await assertFreshReader()
  await scroll.evaluate((el) => {
    el.scrollTop = 760
  })
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBe(760)
  await modal.locator('.diamond-close-btn').click()
  await expect(modal).toBeHidden()
  await page.locator('.study-note-card').first().click()
  await assertFreshReader()
  await scroll.evaluate((el) => {
    el.scrollTop = 760
  })
  await expect.poll(() => scroll.evaluate((el) => el.scrollTop)).toBe(760)
  await reader.evaluate((el) =>
    el.setAttribute('data-test-instance', 'retained-scroll')
  )
  await pushNoteRoute(page, '/atrium/notes')
  await pushNoteRoute(page, `/atrium/notes?note=${demoId}`)
  await expect(reader).toHaveAttribute('data-test-instance', 'retained-scroll')
  await assertFreshReader()
})
