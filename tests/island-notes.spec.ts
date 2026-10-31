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
  await expect(cards).toHaveCount(20, { timeout: 20000 })
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

test('note modal keeps desktop 90vh height and mobile 3:4 proportions across loading, short content and resize', async ({
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
      '.note-reader__loading .el-icon.is-loading',
      '.note-detail-modal .modal-scroll-region'
    )
    const measure = () =>
      modal.evaluate((el) => {
        const bounds = el.getBoundingClientRect()
        return {
          width: bounds.width,
          height: bounds.height,
          contentHeight: el.querySelector('.modal-scroll-region')!.clientHeight,
          viewportWidth: innerWidth,
          viewportHeight: innerHeight,
        }
      })
    const verifySize = (size: Awaited<ReturnType<typeof measure>>) => {
      const mobile = size.viewportWidth <= 768
      const width = mobile
        ? Math.min(
            size.viewportWidth - 20,
            ((size.viewportHeight - 192) * 3) / 4
          )
        : Math.min(size.viewportWidth - 48, size.viewportHeight * 1.2)
      expect(Math.abs(size.width - width)).toBeLessThanOrEqual(1)
      expect(
        Math.abs(
          size.height - (mobile ? (width * 4) / 3 : size.viewportHeight * 0.9)
        )
      ).toBeLessThanOrEqual(1)
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
      { width: 1920, height: 1400 },
      { width: 1024, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport)
      await expect
        .poll(
          async () => {
            const size = await measure()
            return viewport.width <= 768
              ? Number((size.width / size.height).toFixed(3))
              : Number((size.height / size.viewportHeight).toFixed(3))
          },
          { timeout: 15000 }
        )
        .toBe(viewport.width <= 768 ? 0.75 : 0.9)
      verifySize(await measure())
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
      '.study-note-loading .el-icon.is-loading',
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
  await expect(cards).toHaveCount(20)
  await expect(cards.first()).toBeVisible()
  const geometry = await tabs.evaluate((element) => {
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
  await expect(cards).toHaveCount(2)
  await tab('POKÉMON').click()
  await expect(tab('POKÉMON')).toHaveClass(/is-active/)
  await expect(cards).toHaveCount(1)
  await expect(cards.locator('h2')).toHaveText('宝可梦笔记')
  await expect(pagination).toHaveCount(0)
  await tab('TECHNOLOGY').click()
  await expect(cards).toHaveCount(20)
  await pagination.getByRole('button', { name: '2', exact: true }).click()
  await expect(cards).toHaveCount(1)
  await tab('DAILY').click()
  await expect(cards).toHaveCount(0)
  await expect(notes.locator('.study-note-empty')).toBeVisible()
  await tab('TEST').click()
  await expect(cards).toHaveCount(2)
  await expect(cards.locator('h2')).toHaveText(['测试笔记一', '测试笔记二'])
  await expect(pagination).toHaveCount(0)
  await tab('ALL').click()
  await expect(cards).toHaveCount(20)
  await expect(pagination.locator('[aria-current="page"]')).toHaveText('1')
  await expect(tabs.locator('.filter-rail__count')).toHaveText([
    '22',
    '21',
    '1',
    '0',
    '2',
  ])
})
