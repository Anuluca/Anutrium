import { expect, type Page, test } from '@playwright/test'

test.setTimeout(90000)

const push = (page: Page, path: string) =>
  page.evaluate(async (target) => {
    const app = document.querySelector('#app') as HTMLElement & {
      __vue_app__: {
        config: {
          globalProperties: {
            $router: { push: (path: string) => Promise<void> }
          }
        }
      }
    }
    await app.__vue_app__.config.globalProperties.$router.push(target)
  }, path)
const ready = async (page: Page, module: string) => {
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 25000 }
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    module
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true'
  )
}

test('all four module URLs open home and select their module', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const module of ['archive', 'flanerie', 'island', 'pokeyard']) {
    await page.goto(`/${module}`, { waitUntil: 'domcontentloaded' })
    await ready(page, module)
    await expect(page.locator('.temple-menu__header')).toHaveCount(0)
    await expect(page.locator('.temple-stage')).toHaveAttribute(
      'data-environment-brightness',
      '0.420'
    )
    await expect(page.locator('.temple-stage')).toHaveAttribute(
      'data-entrance-mode',
      'simple'
    )
    await expect(
      page.locator('canvas[aria-label="路卡利欧三维模型"]')
    ).toHaveCount(1)
  }
})

test('module return restores focus, expansion and panel scroll with simple entrance', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await ready(page, 'archive')
  await expect(page.locator('.works-grid').first()).toBeVisible()
  if (!info.project.name.includes('mobile')) {
    await page.locator('.temple-expand').click()
    await expect(page.locator('.temple-menu')).toHaveAttribute(
      'aria-busy',
      'false'
    )
  }
  const root = page.locator('.temple-focus-content .scroll-viewport__scroll')
  await root.evaluate((element) => {
    element.scrollTop = 260
  })
  const scrollTop = await root.evaluate((element) => element.scrollTop)
  await push(page, '/craft')
  await expect(page.locator('.craft-page')).toBeVisible()
  await page.locator('.logo-box').click()
  await ready(page, 'archive')
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-mode',
    'simple'
  )
  await expect
    .poll(() => root.evaluate((element) => element.scrollTop))
    .toBeCloseTo(scrollTop, 0)
  if (!info.project.name.includes('mobile'))
    await expect(page.locator('.temple-expand')).toHaveAttribute(
      'aria-expanded',
      'true'
    )
})

test('direct child route returns to its corresponding module', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/island/study-notes', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.logo-box')).toBeVisible()
  await page.locator('.logo-box').click()
  await ready(page, 'island')
})

test('about preserves module color, model tint and zodiac', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  await ready(page, 'flanerie')
  await expect(page.locator('.current-module-name')).toHaveText('FLÂNERIE')
  const theme = () =>
    page.evaluate(() => ({
      color: getComputedStyle(document.documentElement).getPropertyValue(
        '--page-theme-color'
      ),
      model:
        document.querySelector<HTMLElement>('.temple-stage')!.dataset
          .themeColor,
      sign: document.querySelector('.zodiac-sign-face.is-active .zodiac-glyph')!
        .textContent,
    }))
  const before = await theme()
  if (info.project.name.includes('mobile'))
    await page.locator('.mobile-menu-icon').click()
  await page
    .locator(
      `${
        info.project.name.includes('mobile')
          ? '.mobile-menu-items'
          : '.menu-box'
      } [data-temple-nav="about"]`
    )
    .click()
  await expect(page.locator('.about-overlay')).toBeVisible()
  await page.waitForTimeout(1200)
  expect(await theme()).toEqual(before)
  await page.keyboard.press('Escape')
  await expect(page.locator('.about-overlay')).toHaveCount(0)
  expect(await theme()).toEqual(before)
})

test('collapsed and expanded cards, title height and progress edge remain consistent', async ({
  page,
}, info) => {
  test.skip(
    info.project.name.includes('mobile'),
    'Expansion is a desktop action'
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const module of ['archive', 'flanerie', 'island']) {
    await page.goto(`/${module}`, { waitUntil: 'domcontentloaded' })
    await ready(page, module)
    const grid = page
      .locator(module === 'archive' ? '.works-grid' : '.vlog-grid')
      .first()
    if (module !== 'island') await expect(grid).toBeVisible()
    const title = page.locator('.temple-focus-content .page-hero-title')
    const height = (await title.boundingBox())!.height
    for (const expanded of [false, true, false]) {
      if (
        expanded !==
        ((await page
          .locator('.temple-expand')
          .getAttribute('aria-expanded')) ===
          'true')
      ) {
        await page.locator('.temple-expand').click()
        await expect(page.locator('.temple-menu')).toHaveAttribute(
          'aria-busy',
          'false'
        )
      }
      if (module !== 'island')
        expect(
          await grid.evaluate(
            (element) =>
              getComputedStyle(element).gridTemplateColumns.split(' ').length
          )
        ).toBe(expanded ? 4 : 2)
      if (expanded)
        expect((await title.boundingBox())!.height).toBeGreaterThan(height)
      if (expanded && module !== 'island') {
        expect(
          (await page.locator('.temple-expand').boundingBox())!.x
        ).toBeCloseTo(24, 0)
      }
      const progress = page.locator('body > .page-scroll-progress.is-embedded')
      await expect(progress).toBeAttached()
      expect(
        Math.abs(
          (await progress.boundingBox())!.x + 4 - page.viewportSize()!.width
        )
      ).toBeLessThanOrEqual(1)
      const geometry = await page
        .locator('.temple-menu')
        .evaluate((element) => {
          const box = element.getBoundingClientRect()
          const header = document.querySelector('.el-menu-layout-all')!
          const css = getComputedStyle(header)
          const inset =
            parseFloat(css.getPropertyValue('--header-inline-padding')) +
            parseFloat(css.getPropertyValue('--header-menu-item-padding'))
          return {
            left: box.left,
            right: innerWidth - box.right,
            inset:
              inset *
              parseFloat(getComputedStyle(document.documentElement).fontSize),
          }
        })
      expect(
        Math.abs(
          (module === 'island' && !expanded ? geometry.left : geometry.right) -
            geometry.inset
        )
      ).toBeLessThanOrEqual(1)
    }
  }
})

test('test harbor has the requested four groups and toolbox link', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/test', { waitUntil: 'domcontentloaded' })
  const panels = page.locator(
    info.project.name.includes('mobile') ? '.mobile-port' : '.port-panel'
  )
  await expect(panels).toHaveCount(4)
  const groups = await panels.evaluateAll((items) =>
    items.map((item) => ({
      title: item.querySelector('.port-head p, .port-label em')!.textContent,
      cards: Array.from(
        item.querySelectorAll('.card-info strong, .mobile-card-info strong')
      ).map((card) => card.textContent?.trim()),
    }))
  )
  expect(groups).toEqual([
    { title: 'ART', cards: ['摄影', '绘画'] },
    { title: 'CREATIVE', cards: ['工具箱', '设计创作', '实验室'] },
    { title: 'NOTES', cards: ['学习笔记', '杂谈'] },
    { title: 'OTAKU', cards: ['游戏库', '收藏品'] },
  ])
  await panels
    .nth(1)
    .getByRole('button', { name: /工具箱/ })
    .click()
  await expect(page).toHaveURL(/\/craft$/)
})

test('simple entrance fades the whole model and focus straightens head pitch', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  await ready(page, 'flanerie')
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-mode', 'simple')
  await expect
    .poll(async () =>
      Math.abs(
        Number((await stage.getAttribute('data-head-rotation'))!.split(',')[0])
      )
    )
    .toBeLessThan(0.001)
  await expect(stage).toHaveAttribute('data-head-nod-angle', '0.000')
})

test('module URL navigation reuses the home canvas and keeps its selected theme', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  await ready(page, 'flanerie')
  const canvas = await page.locator('.temple-stage canvas').elementHandle()
  await push(page, '/archive')
  await ready(page, 'archive')
  expect(
    await canvas!.evaluate(
      (element) => element === document.querySelector('.temple-stage canvas')
    )
  ).toBe(true)
  await expect
    .poll(() =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue(
          '--page-theme-color'
        )
      )
    )
    .toBe('#3276fe')
})

test('travel map redraws after both resize directions and remains interactive', async ({
  page,
}, info) => {
  test.skip(
    info.project.name.includes('mobile'),
    'Expansion is a desktop action'
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  await ready(page, 'flanerie')
  const map = page.locator('.travel-map')
  await expect(map.locator('.leaflet-map-pane')).toBeAttached()
  await expect(map.locator('.leaflet-tile').first()).toBeAttached()
  for (const expanded of [true, false]) {
    const tile = await map.locator('.leaflet-tile').first().elementHandle()
    const before = (await map.boundingBox())!.width
    await page.locator('.temple-expand').click()
    await expect(page.locator('.temple-menu')).toHaveAttribute(
      'aria-busy',
      'false'
    )
    await expect
      .poll(() => tile!.evaluate((element) => element.isConnected))
      .toBe(false)
    const width = (await map.boundingBox())!.width
    expect(expanded ? width > before : width < before).toBe(true)
    await expect(
      map.locator('.visited-region-highlight').first()
    ).toBeAttached()
    await expect(map.locator('.leaflet-tile').first()).toBeAttached()
    const region = map.locator('.visited-region-highlight').first()
    const coordinates = await region.getAttribute('d')
    await map.locator('.leaflet-control-zoom-in').click()
    await expect.poll(() => region.getAttribute('d')).not.toBe(coordinates)
  }
})

test('default logo hover enlarges its icon', async ({ page }, info) => {
  test.skip(info.project.name.includes('mobile'), 'Hover is a desktop action')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 25000 }
  )
  const logo = page.locator('.logo-box .logo')
  const width = (await logo.boundingBox())!.width
  await page.locator('.logo-box').hover()
  await expect
    .poll(async () => (await logo.boundingBox())!.width / width)
    .toBeGreaterThan(1.3)
  const center = (await logo.boundingBox())!
  expect(
    Math.abs(center.x + center.width / 2 - page.viewportSize()!.width / 2)
  ).toBeLessThanOrEqual(1)
})

test('embedded work and journey cards use two columns on mobile', async ({
  page,
}, info) => {
  test.skip(
    !info.project.name.includes('mobile'),
    'Mobile column override regression'
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const module of ['archive', 'flanerie']) {
    await page.goto(`/${module}`, { waitUntil: 'domcontentloaded' })
    await ready(page, module)
    const grid = page
      .locator(module === 'archive' ? '.works-grid' : '.vlog-grid')
      .first()
    await expect(grid).toBeAttached()
    expect(
      await grid.evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(' ').length
      )
    ).toBe(2)
    const progress = page.locator('body > .page-scroll-progress.is-embedded')
    expect(
      Math.abs(
        (await progress.boundingBox())!.x + 4 - page.viewportSize()!.width
      )
    ).toBeLessThanOrEqual(1)
  }
})
