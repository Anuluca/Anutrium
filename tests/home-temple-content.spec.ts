import { expect, test } from '@playwright/test'

import { openHomeAboutOverlay } from './helpers/homeAboutOverlay'

test.beforeEach(async ({ page }, testInfo) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({
    reducedMotion:
      testInfo.title.includes('fades') || testInfo.title.includes('focus aims')
        ? 'no-preference'
        : 'reduce',
  })
  if (testInfo.title.includes('focus aims')) {
    await page.route('**/src/config/templeExperience.ts*', async (route) => {
      const response = await route.fetch()
      await route.fulfill({
        response,
        body: (
          await response.text()
        ).replace(/mode: ["']headache["']/, 'mode: "normal"'),
      })
    })
  }
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 25000 }
  )
})

test('home centers its icon, then exposes scene shortcuts and enables all pillars', async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name.includes('mobile')
  await expect(page.locator('.layout-page')).toHaveClass(
    /temple-header-default/
  )
  await expect(page.locator('.desktop-menu, .mobile-menu-icon')).toHaveCount(0)
  const pillars = page.locator('.temple-obelisk')
  await expect(pillars).toHaveCount(4)
  for (const id of ['island', 'pokeyard']) {
    await expect(page.locator(`[data-obelisk="${id}"]`)).toBeEnabled()
    await page
      .locator(`[data-obelisk="${id}"]`)
      .evaluate((el: HTMLButtonElement) => el.click())
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      id
    )
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true'
    )
    if (id === 'island') {
      await expect(page.locator('.current-module-name')).toHaveText('CREATIVE')
      await expect(page.locator('[data-obelisk="island"]')).toHaveAttribute(
        'aria-label',
        'IV / 创作'
      )
      await expect(page.locator('.temple-stage')).toHaveAttribute(
        'data-theme-color',
        '#ce4c87'
      )
    }
    await page.keyboard.press('Escape')
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true'
    )
  }
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await expect(page.locator('.current-module-name')).toHaveCount(1)
  await expect(page.locator('.current-module-name')).toHaveText('ARCHIVE')
  if (mobile) await page.locator('.mobile-menu-icon').click()
  const actions = page.locator(
    mobile
      ? '.mobile-menu-items .temple-nav-action'
      : '.menu-box .temple-nav-action'
  )
  await expect(actions).toHaveCount(mobile ? 7 : 6)
  expect(
    await actions.evaluateAll((items) =>
      items.map((item) => item.getAttribute('data-temple-nav'))
    )
  ).toEqual(
    mobile
      ? [
          'home',
          'archive',
          'flanerie',
          'pokeyard',
          'island',
          'sprigatito',
          'statue',
        ]
      : ['archive', 'flanerie', 'statue', 'sprigatito', 'pokeyard', 'island']
  )
  await expect(page.locator('[data-temple-nav="about"]')).toHaveCount(0)
  await expect(actions.filter({ hasText: 'POKÉYARD' })).toBeEnabled()
  await page
    .locator(
      `${
        mobile ? '.mobile-menu-items' : '.menu-box'
      } [data-temple-nav="flanerie"]`
    )
    .click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie'
  )
})

test('mobile HOME clears focus and overrides module restoration when returning from a child page', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'), '手机菜单专用入口')
  test.setTimeout(90000)
  const root = page.locator('.temple-page')
  await page
    .locator('[data-obelisk="flanerie"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(root).toHaveAttribute('data-settled', 'true')
  const clickHome = async () => {
    await page.locator('.mobile-menu-icon').click()
    await page.locator('.mobile-menu-items [data-temple-nav="home"]').click()
    await expect(page).toHaveURL(/\/$/)
    await expect(root).toHaveAttribute('data-selected', 'none')
    await expect(page.locator('.layout-page')).toHaveClass(
      /temple-header-default/
    )
    await expect(page.locator('.mobile-menu-panel.active')).toHaveCount(0)
  }
  await clickHome()
  await expect(root).toHaveAttribute('data-settled', 'true')
  await page
    .locator('[data-obelisk="island"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(root).toHaveAttribute('data-settled', 'true')
  await page.evaluate(() =>
    (
      document.querySelector('.layout-page') as any
    ).__vueParentComponent.proxy.$router.push('/craft')
  )
  await expect(root).toHaveCount(0, { timeout: 15000 })
  // 模拟旅程详情保留的恢复标记，HOME 应同时覆盖这类自动聚焦。
  await page.evaluate(() => {
    sessionStorage.setItem('anutrium:flanerie:returning-from-detail', 'true')
    sessionStorage.setItem('anutrium:flanerie:selected-vlog', 'test-home')
  })
  await clickHome()
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true',
    { timeout: 25000 }
  )
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(page.locator('.temple-focus-content')).toHaveCount(0)
})

test('header blank space exits pillar focus while navigation buttons keep switching modules', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000)
  const root = page.locator('.temple-page')
  await page
    .locator('[data-obelisk="flanerie"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(root).toHaveAttribute('data-settled', 'true')
  const mobile = testInfo.project.name.includes('mobile')
  if (mobile) await page.locator('.mobile-menu-icon').click()
  await page
    .locator(
      `${
        mobile ? '.mobile-menu-items' : '.menu-box'
      } [data-temple-nav="archive"]`
    )
    .locator(mobile ? '.big-title' : '.main-title')
    .click()
  await expect(root).toHaveAttribute('data-selected', 'archive')
  await expect(root).toHaveAttribute('data-settled', 'true')
  const header = page.locator('.el-menu-layout-all')
  const bounds = (await header.boundingBox())!
  const blank = { x: bounds.width / 2, y: 2 }
  expect(
    await page.evaluate(
      ({ x, y }) => !!document.elementFromPoint(x, y)?.closest('button, a'),
      { x: bounds.x + blank.x, y: bounds.y + blank.y }
    )
  ).toBe(false)
  await header.click({ position: blank })
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(page.locator('.layout-page')).toHaveClass(
    /temple-header-default/
  )
  await expect(page).toHaveURL(/\/$/)
})

test('embedded portfolio uses a desktop side detail and keeps mobile and expanded dialogs', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  const mobile = testInfo.project.name.includes('mobile')
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  const panel = page.locator('.temple-focus-content .scroll-viewport__scroll')
  const card = panel.locator('.shared-work-card').first()
  await expect(card).toBeVisible({ timeout: 20000 })
  const initial = await page.locator('.temple-page').boundingBox()
  const panelBox = (await panel.boundingBox())!
  const viewport = page.viewportSize()!
  if (mobile) expect(panelBox.width).toBeGreaterThan(viewport.width * 0.8)
  else {
    expect(panelBox.width).toBeGreaterThan(viewport.width * 0.44)
    expect(panelBox.width).toBeLessThan(viewport.width * 0.5)
  }
  const before = await panel.evaluate((el) => el.scrollTop)
  await page.mouse.move(
    panelBox.x + panelBox.width / 2,
    panelBox.y + panelBox.height / 2
  )
  await page.mouse.wheel(0, 450)
  await expect
    .poll(() => panel.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(before)
  expect(await page.locator('.temple-page').boundingBox()).toEqual(initial)
  await panel.evaluate((el) => {
    el.scrollTop = 0
  })
  await card.click()
  const modal = page.locator('.el-dialog')
  const detail = mobile ? modal : page.locator('.work-detail-inline')
  await expect(detail).toBeVisible()
  if (!mobile) {
    await expect(modal).toBeHidden()
    await expect(detail.locator('.diamond-close-btn')).toHaveCount(0)
    const summaryTops = await detail
      .locator('.aside-summary > .aside-field')
      .evaluateAll((fields) =>
        fields.map((field) => field.getBoundingClientRect().top)
      )
    expect(summaryTops).toHaveLength(3)
    expect(Math.abs(summaryTops[0] - summaryTops[1])).toBeLessThanOrEqual(1)
    expect(summaryTops[2]).toBeGreaterThan(Math.max(...summaryTops.slice(0, 2)))
    const layout = await detail.evaluate((el) => {
      const rect = (selector: string) =>
        el.querySelector(selector)!.getBoundingClientRect()
      const gallery = rect('.gallery-track-wrap')
      const links = Array.from(el.querySelectorAll('.link-item')).map((link) =>
        link.getBoundingClientRect()
      )
      return {
        galleryTop: gallery.top,
        galleryBottom: gallery.bottom,
        galleryLeft: gallery.left,
        galleryRatio: gallery.width / gallery.height,
        galleryWidth: gallery.width,
        contentWidth: rect('.aside-company').width,
        columnGap: getComputedStyle(el.querySelector('.modal-body')!).columnGap,
        titleTop: rect('.aside-title').top,
        titleRight: rect('.aside-title').right,
        titleBottom: rect('.aside-title').bottom,
        summaryTop: rect('.aside-summary').top,
        summaryBottom: rect('.aside-summary').bottom,
        aboutTop: rect('.aside-desc').top,
        linksLeft: rect('.aside-links').left,
        linksTop: rect('.aside-links').top,
        confidentialTop: rect('.confidential-notice').top,
        detailsBottom: rect('.details-section').bottom,
        lastDetailBottom: rect('.detail-item:last-child').bottom,
        summaryGap: getComputedStyle(el.querySelector('.aside-summary')!)
          .columnGap,
        rootFontSize: getComputedStyle(document.documentElement).fontSize,
        links: links.map(({ top, width }) => ({ top, width })),
      }
    })
    expect(Math.abs(layout.galleryTop - layout.titleTop)).toBeLessThanOrEqual(1)
    expect(layout.galleryLeft).toBeGreaterThan(layout.titleRight)
    expect(Math.abs(layout.linksLeft - layout.galleryLeft)).toBeLessThanOrEqual(
      1
    )
    expect(layout.linksTop).toBeGreaterThan(layout.galleryBottom)
    expect(layout.summaryTop).toBeGreaterThan(layout.titleBottom)
    expect(layout.aboutTop).toBeGreaterThan(layout.summaryBottom)
    expect(layout.summaryTop - layout.titleBottom).toBeCloseTo(
      parseFloat(layout.columnGap),
      1
    )
    expect(layout.aboutTop - layout.summaryBottom).toBeCloseTo(
      parseFloat(layout.columnGap),
      1
    )
    expect(layout.galleryRatio).toBeCloseTo(16 / 9, 2)
    expect(layout.galleryWidth).toBeCloseTo(
      (layout.contentWidth - parseFloat(layout.columnGap)) / 2,
      1
    )
    expect(layout.confidentialTop).toBeGreaterThan(layout.detailsBottom)
    expect(layout.confidentialTop).toBeGreaterThan(layout.lastDetailBottom)
    expect(parseFloat(layout.summaryGap)).toBeCloseTo(
      parseFloat(layout.rootFontSize) * (32 / 30),
      1
    )
    expect(layout.links).toHaveLength(2)
    expect(layout.links[0].top).toBeCloseTo(layout.links[1].top, 0)
    expect(layout.links[0].width).toBeCloseTo(layout.links[1].width, 0)
    await expect(detail.locator('.gallery-slide img').first()).toHaveCSS(
      'object-fit',
      'contain'
    )
    const detailBox = (await detail.boundingBox())!
    const origin = await detail.evaluate((el) =>
      getComputedStyle(el).transformOrigin.split(' ').map(parseFloat)
    )
    expect(origin[0]).toBeCloseTo(detailBox.width / 2, 1)
    expect(origin[1]).toBeCloseTo(detailBox.height / 2, 1)
    expect(Math.abs(detailBox.y - panelBox.y)).toBeLessThanOrEqual(1)
    expect(
      Math.abs(detailBox.y + detailBox.height - (panelBox.y + panelBox.height))
    ).toBeLessThanOrEqual(1)
    const companyBox = (await detail.locator('.aside-company').boundingBox())!
    expect(companyBox.x - detailBox.x).toBeCloseTo(
      parseFloat(layout.rootFontSize) * (24 / 30),
      1
    )
    expect(companyBox.y - detailBox.y).toBeCloseTo(
      parseFloat(layout.rootFontSize) * (18 / 30),
      1
    )
    const headerTitleBox = (await page.locator('.logo-box').boundingBox())!
    expect(Math.abs(detailBox.x - headerTitleBox.x)).toBeLessThanOrEqual(1)
    expect(detailBox.x).toBeGreaterThanOrEqual(0)
    expect(detailBox.x + detailBox.width).toBeLessThanOrEqual(
      viewport.width / 2
    )
    const detailScroll = detail.locator('.scroll-viewport__scroll')
    const detailProgress = detail.locator('.page-scroll-progress')
    await expect(detailScroll).toHaveCSS('scrollbar-width', 'none')
    await expect(detailProgress).toBeVisible()
    await detailScroll.evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    await expect
      .poll(() =>
        detailProgress.evaluate((el) =>
          parseFloat(
            (el as HTMLElement).style.getPropertyValue(
              '--page-scroll-progress-scale'
            )
          )
        )
      )
      .toBeCloseTo(1, 2)
    await detailScroll.evaluate((el) => {
      el.scrollTop = 0
    })
    const secondCard = panel.locator('.shared-work-card').nth(1)
    const secondTitle = (await secondCard.locator('strong').textContent())!
    await secondCard.click()
    await expect(detail).toHaveAttribute('aria-label', secondTitle)
    const image = detail.locator('.gallery-slide').first()
    if (await image.count()) {
      await image.click()
      await expect(page.locator('.el-image-viewer__wrapper')).toBeVisible()
      expect(await page.locator('.temple-page').boundingBox()).toEqual(initial)
      await page.keyboard.press('Escape')
      await expect(page.locator('.el-image-viewer__wrapper')).toHaveCount(0)
      await expect(detail).toBeVisible()
    }
  }
  for (const selector of [
    '.aside-company-name',
    '.field-label',
    '.project-share-button',
  ])
    await expect(detail.locator(selector).first()).toHaveCSS(
      'color',
      'rgb(50, 118, 254)'
    )
  expect(await page.locator('.temple-page').boundingBox()).toEqual(initial)
  await page.keyboard.press('Escape')
  await expect(detail).toBeHidden()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'archive'
  )
  if (!mobile) {
    await card.click()
    await expect(detail).toBeVisible()
    await page.locator('.temple-expand').click()
    await expect(detail).toHaveCount(0)
    await expect(modal).toBeHidden()
    await expect(page.locator('.temple-menu')).toHaveAttribute(
      'aria-busy',
      'false'
    )
    await card.click()
    await expect(modal).toBeVisible()
    await expect(modal.locator('.diamond-close-btn')).toBeVisible()
    await expect(modal.locator('.aside-summary')).toHaveCSS('display', 'flex')
    expect(await page.locator('.temple-page').boundingBox()).toEqual(initial)
    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden()
  }
})

test('embedded journey keeps its map, batches and return position', async ({
  page,
}) => {
  await page
    .locator('[data-obelisk="flanerie"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  const panel = page.locator('.temple-focus-content .scroll-viewport__scroll')
  await expect(panel.locator('.travel-map-shell')).toBeVisible()
  const card = panel.locator('.shared-vlog-card').first()
  await expect(card).toBeAttached()
  await card.scrollIntoViewIfNeeded()
  const scrollTop = await panel.evaluate((el) => el.scrollTop)
  await card.evaluate((el: HTMLButtonElement) => el.click())
  await expect(page).toHaveURL(/\/flanerie\/[^?]+\?from=home$/)
  await expect(page.locator('.flr-page')).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 25000 }
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie'
  )
  await expect(panel.locator('.shared-vlog-card').first()).toBeAttached()
  await expect
    .poll(() => panel.evaluate((el) => el.scrollTop))
    .toBeCloseTo(scrollTop, -1)
  await panel
    .locator('.shared-vlog-card')
    .first()
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.flr-page')).toBeVisible()
  await page.locator('.detail-page-header__back').click()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie',
    { timeout: 25000 }
  )
  await expect(panel.locator('.shared-vlog-card').first()).toBeAttached()
  await expect
    .poll(() => panel.evaluate((el) => el.scrollTop))
    .toBeCloseTo(scrollTop, -1)
})

test('embedded content fades with the panel before it is unmounted', async ({
  page,
}) => {
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  const root = page.locator('.temple-page')
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(page.locator('.archive-content')).toBeVisible()
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(page.locator('.archive-content')).toBeAttached()
  await expect(root).toHaveAttribute('data-settled', 'true', { timeout: 10000 })
  await expect(page.locator('.temple-menu')).toHaveCount(0)
})

test('creative and pokeyard reuse embedded 404 content without locking the page', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  const root = page.locator('.temple-page')
  for (const category of ['island', 'pokeyard']) {
    await page
      .locator(`[data-obelisk="${category}"]`)
      .evaluate((el: HTMLButtonElement) => el.click())
    await expect(root).toHaveAttribute('data-selected', category)
    await expect(root).toHaveAttribute('data-settled', 'true')
    const content = page.locator(
      '.temple-focus-content .not-found-page.is-embedded'
    )
    await expect(content).toBeVisible({ timeout: 15000 })
    await expect(content).toContainText('404 SIGNAL LOST')
    await expect(content.locator('.porygon__draw-mask > *')).toHaveCount(11)
    const geometry = await content.evaluate((el) => {
      const viewport = el
        .closest('.scroll-viewport__scroll')!
        .getBoundingClientRect()
      const group = el.querySelector('.inner')!.getBoundingClientRect()
      const text = el.querySelector('.show-text')!.getBoundingClientRect()
      const image = el.querySelector('.porygon')!.getBoundingClientRect()
      return {
        centerOffset: Math.abs(
          group.top + group.height / 2 - viewport.top - viewport.height / 2
        ),
        imageLeft: image.left,
        textLeft: text.left,
        textRight: text.right,
      }
    })
    expect(geometry.centerOffset).toBeLessThanOrEqual(1)
    expect(geometry.imageLeft).toBeGreaterThan(geometry.textLeft)
    if (!testInfo.project.name.includes('mobile'))
      expect(geometry.imageLeft).toBeLessThan(geometry.textRight)
    await expect(content.locator('.porygon')).toHaveCSS('position', 'absolute')
    await expect(content.locator('.show-text')).toHaveCSS(
      'position',
      'absolute'
    )
    await expect(page.locator('html')).not.toHaveClass(/not-found-no-scroll/)
    await expect(page.locator('body')).not.toHaveClass(/not-found-no-scroll/)
    const bounds = await content.evaluate((el) => {
      const root = el.getBoundingClientRect()
      const group = el.querySelector('.inner')!.getBoundingClientRect()
      return { left: group.left - root.left, right: group.right - root.right }
    })
    expect(bounds.left).toBeGreaterThanOrEqual(-1)
    expect(bounds.right).toBeLessThanOrEqual(1)
    if (!testInfo.project.name.includes('mobile')) {
      await page.locator('.temple-expand').click()
      await expect(root).not.toHaveClass(/temple-page--resizing/)
      await expect(content).toBeVisible()
    }
    await content.getByRole('button', { name: '-> RETURN TO HOME' }).click()
    await expect(root).toHaveAttribute('data-selected', 'none')
    await expect(page.locator('.temple-menu')).toHaveCount(0)
  }
})

test('portfolio blank clicks close inline detail before returning home', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes('mobile'),
    'Inline details are desktop only'
  )
  const root = page.locator('.temple-page')
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(root).toHaveAttribute('data-settled', 'true')
  const card = page.locator('.temple-focus-content .shared-work-card').first()
  await expect(card).toBeVisible({ timeout: 20000 })
  const detail = page.locator('.work-detail-inline')
  const content = page.locator('.temple-focus-content')
  const menuBox = (await content.boundingBox())!
  const scrollBox = (await content
    .locator('.scroll-viewport__scroll')
    .boundingBox())!
  const canvasBox = (await page.locator('.temple-stage canvas').boundingBox())!
  for (const point of [
    { x: menuBox.x + menuBox.width / 2, y: menuBox.y + 2 },
    { x: scrollBox.x + scrollBox.width / 2, y: scrollBox.y + 2 },
    { x: canvasBox.x + 2, y: canvasBox.y + canvasBox.height / 2 },
  ]) {
    await card.click()
    await expect(detail).toBeVisible()
    await page.mouse.click(point.x, point.y)
    await expect(detail).toHaveCount(0)
    await expect(root).toHaveAttribute('data-selected', 'archive')
    await expect(root).toHaveAttribute('data-settled', 'true')
    await expect(content).toBeVisible()
    await expect(root).not.toHaveClass(/temple-page--expanded/)
  }
  await page.mouse.click(menuBox.x + menuBox.width / 2, menuBox.y + 2)
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(page.locator('.temple-menu')).toHaveCount(0)
})

test('secondary menu blank space returns home in sidebar and fullscreen layouts', async ({
  page,
}, testInfo) => {
  const root = page.locator('.temple-page')
  const mobile = testInfo.project.name.includes('mobile')
  for (const expanded of mobile ? [false] : [false, true]) {
    await page
      .locator('[data-obelisk="archive"]')
      .evaluate((el: HTMLButtonElement) => el.click())
    await expect(root).toHaveAttribute('data-settled', 'true')
    await expect(page.locator('.shared-work-card').first()).toBeVisible({
      timeout: 20000,
    })
    if (expanded) {
      await page.locator('.temple-expand').click()
      await expect(root).not.toHaveClass(/temple-page--resizing/)
    }
    const content = page.locator('.temple-focus-content')
    const box = (await content.boundingBox())!
    // 内容上方的实际留白应可返回，覆盖两端和桌面展开状态。
    await page.mouse.click(box.x + box.width / 2, box.y + 2)
    await expect(root).toHaveAttribute('data-selected', 'none')
    await expect(root).toHaveAttribute('data-settled', 'true', {
      timeout: 10000,
    })
    await expect(page.locator('.temple-menu')).toHaveCount(0)
    await expect(root).not.toHaveClass(/temple-page--expanded/)
  }
})

test('focus expansion preserves scroll state and uses a progress bar without scroll masks', async ({
  page,
}, testInfo) => {
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  const viewport = page.locator('.temple-focus-content')
  const scroll = viewport.locator('.scroll-viewport__scroll')
  await expect(scroll.locator('.shared-work-card').first()).toBeVisible({
    timeout: 15000,
  })
  await expect(viewport.locator('.page-hero-title')).toHaveCount(0)
  await expect(viewport).not.toHaveClass(/has-fixed-header/)
  await expect(viewport).toHaveCSS(
    'padding-top',
    testInfo.project.name.includes('mobile') ? '32px' : '40px'
  )
  await expect(scroll).toHaveCSS('mask-image', 'none')
  const viewportShift = await scroll.evaluate((el) => {
    const before = el.getBoundingClientRect().top
    el.scrollTop = 400
    return el.getBoundingClientRect().top - before
  })
  expect(Math.abs(viewportShift)).toBeLessThanOrEqual(1)
  await expect(scroll.locator('.page-hero-title')).toHaveCount(0)
  await expect(scroll).toHaveCSS('mask-image', 'none')
  await expect(
    page.locator('body > .page-scroll-progress.is-embedded')
  ).toBeVisible()
  if (testInfo.project.name.includes('mobile')) {
    await expect(page.locator('.temple-expand')).toHaveCount(0)
    expect(
      await page
        .locator('.temple-page')
        .evaluate((el) => getComputedStyle(el, '::after').maskImage)
    ).toBe('none')
    const shade = await page.locator('.temple-page').evaluate((el) => {
      const css = getComputedStyle(el, '::after')
      return { image: css.backgroundImage, pointerEvents: css.pointerEvents }
    })
    expect(shade.image).toContain('repeating-linear-gradient')
    expect(shade.image).toContain('rgba(0, 0, 0, 0.9)')
    expect(shade.image).toContain('rgba(18, 18, 18, 0.9)')
    expect(shade.pointerEvents).toBe('none')
    return
  }
  const initialWidth = (await viewport.boundingBox())!.width
  const scrollTop = await scroll.evaluate((el) => el.scrollTop)
  await page.locator('.temple-expand').click()
  await expect(page.locator('.temple-page')).toHaveClass(
    /temple-page--expanded/
  )
  await expect
    .poll(async () => (await viewport.boundingBox())!.width)
    .toBeGreaterThan(page.viewportSize()!.width * 0.8)
  expect(await scroll.evaluate((el) => el.scrollTop)).toBeCloseTo(scrollTop, -1)
  await page.locator('.temple-expand').click()
  await expect
    .poll(async () => (await viewport.boundingBox())!.width)
    .toBeCloseTo(initialWidth, -1)
  await page.keyboard.press('Escape')
  await expect(page.locator('.layout-page')).toHaveClass(
    /temple-header-default/
  )
})

test('about opens over the scene without navigation, preserves focus, and closes from the mask or Escape', async ({
  page,
}, testInfo) => {
  await page
    .locator('[data-obelisk="flanerie"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  const mobile = testInfo.project.name.includes('mobile')
  const open = async () => {
    if (mobile) await page.locator('.mobile-menu-icon').click()
    await openHomeAboutOverlay(page)
    await expect(page.locator('.about-overlay .about-page')).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('.about-overlay .page-hero-title')).toHaveCount(0)
    await expect(page.locator('.current-module-name')).toHaveText('ABOUT')
    await expect(page.locator('.about-overlay__mask')).toHaveCSS(
      'backdrop-filter',
      'none'
    )
    await expect(page.locator('.about-overlay__mask')).toHaveCSS(
      'mask-image',
      'none'
    )
    await expect(page).toHaveURL(/\/$/)
  }
  await open()
  await page
    .locator('.about-overlay__mask')
    .click({ position: { x: 8, y: 160 } })
  await expect(page.locator('.about-overlay')).toHaveCount(0)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie'
  )
  await open()
  await page.keyboard.press('Escape')
  await expect(page.locator('.about-overlay')).toHaveCount(0)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie'
  )
  await expect(page.locator('.current-module-name')).toHaveText('FLÂNERIE')
  expect(await page.locator('.shared-vlog-card .shuffle-text').count()).toBe(0)
})

test('fullscreen home leaves without changing its page or router geometry', async ({
  page,
}) => {
  test.setTimeout(60000)
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 20000,
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => {
    const root = document.querySelector('.temple-page')!
    const container = document.querySelector('.router-container')!
    const sample = () =>
      [root, container].map((el) => {
        const r = el.getBoundingClientRect()
        return [r.top, r.left]
      })
    ;(window as any).leaveGeometry = { before: sample(), frames: [] }
    const tick = () => {
      if (!root.isConnected) return
      ;(window as any).leaveGeometry.frames.push(sample())
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
    ;(
      document.querySelector('.layout-page') as any
    ).__vueParentComponent.proxy.$router.push('/craft')
  })
  await expect(page.locator('.temple-page')).toHaveCount(0, { timeout: 15000 })
  const data = await page.evaluate(() => (window as any).leaveGeometry)
  expect(data.frames.length).toBeGreaterThan(2)
  for (const frame of data.frames)
    for (let element = 0; element < 2; element++)
      for (let axis = 0; axis < 2; axis++)
        expect(
          Math.abs(frame[element][axis] - data.before[element][axis])
        ).toBeLessThanOrEqual(1)
})

test('about mask fades immediately before content loads, aligns with the menu, and closes from blank space', async ({
  page,
}, testInfo) => {
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  if (testInfo.project.name.includes('mobile'))
    await page.locator('.mobile-menu-icon').click()
  await page.evaluate(() => {
    const samples: {
      backdrop: string
      alpha: number
      opacity: number
      hasContent: boolean
    }[] = []
    ;(window as any).aboutEnterSamples = samples
    ;(window as any).samplingAboutEnter = true
    const sample = () => {
      if (!(window as any).samplingAboutEnter) return
      const overlay = document.querySelector('.about-overlay')
      const mask = document.querySelector('.about-overlay__mask')
      if (overlay && mask) {
        samples.push({
          backdrop: getComputedStyle(mask).backdropFilter,
          alpha: parseFloat(
            getComputedStyle(mask).backgroundColor.split(',')[3] ?? '1'
          ),
          opacity: Number(getComputedStyle(overlay).opacity),
          hasContent: !!overlay.querySelector('.about-page'),
        })
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await openHomeAboutOverlay(page)
  await expect(page.locator('.about-overlay')).toBeVisible()
  await expect(page.locator('.about-overlay__content')).toBeAttached()
  await expect(page.locator('.about-overlay__mask')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0.9)'
  )
  expect(
    await page
      .locator('.about-overlay')
      .evaluate((el) => getComputedStyle(el).transitionProperty)
  ).toContain('opacity')
  await expect(page.locator('.about-overlay .about-page')).toBeVisible({
    timeout: 12000,
  })
  await expect(page.locator('.about-overlay .about-page')).toHaveCSS(
    'opacity',
    '1'
  )
  const samples = await page.evaluate(() => {
    ;(window as any).samplingAboutEnter = false
    return (window as any).aboutEnterSamples as {
      backdrop: string
      alpha: number
      opacity: number
      hasContent: boolean
    }[]
  })
  expect(samples.every(({ backdrop }) => backdrop === 'none')).toBe(true)
  expect(samples.some(({ alpha }) => alpha > 0 && alpha < 0.9)).toBe(true)
  expect(samples.every(({ opacity }) => opacity === 1)).toBe(true)
  expect(samples.some(({ hasContent }) => hasContent)).toBe(true)
  expect(
    samples
      .filter(({ hasContent }) => hasContent)
      .every(({ alpha }) => alpha >= 0.89)
  ).toBe(true)
  const contentGeometry = await page
    .locator('.about-overlay__content')
    .evaluate((el) => {
      const bounds = el.getBoundingClientRect()
      const inset =
        innerWidth <= 768
          ? 24
          : parseFloat(getComputedStyle(document.documentElement).fontSize) *
            (1.33333 + 0.66667)
      return { left: bounds.left, right: innerWidth - bounds.right, inset }
    })
  expect(contentGeometry.left).toBeCloseTo(contentGeometry.inset, 0)
  expect(contentGeometry.right).toBeCloseTo(contentGeometry.inset, 0)
  const progress = page.locator(
    'body > .page-scroll-progress.is-embedded[style*="z-index: 1200"]'
  )
  await expect(progress).toHaveCount(1)
  expect(
    await progress.evaluate(
      (el) => innerWidth - el.getBoundingClientRect().right
    )
  ).toBeLessThanOrEqual(1)
  await page
    .locator('.about-overlay__mask')
    .click({ position: { x: 5, y: 180 } })
  await expect(page.locator('.about-overlay')).toHaveCount(0)
  await expect(progress).toHaveCount(0)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'archive'
  )
})

test('statue inscription appears on desktop hover and stays visible on mobile', async ({
  page,
}, testInfo) => {
  const stage = page.locator('.temple-stage')
  const mobile = testInfo.project.name.includes('mobile')
  expect(
    Number(await stage.getAttribute('data-statue-label-depth'))
  ).toBeCloseTo(0.568, 3)
  await expect(stage).toHaveAttribute('data-statue-label-color', '#e23456')
  await expect(stage).toHaveAttribute(
    'data-statue-label-reveal',
    mobile ? '1.000' : '0.000'
  )
  const viewport = page.viewportSize()!
  await page.mouse.move(viewport.width / 2, viewport.height / 2)
  await expect(stage).toHaveAttribute('data-statue-label-reveal', '1.000')
  await page.mouse.move(20, 150)
  await expect(stage).toHaveAttribute(
    'data-statue-label-reveal',
    mobile ? '1.000' : '0.000'
  )
  if (mobile) {
    for (const id of ['archive', 'flanerie', 'pokeyard', 'island']) {
      await page
        .locator(`[data-obelisk="${id}"]`)
        .evaluate((el: HTMLButtonElement) => el.click())
      await expect(page.locator('.temple-page')).toHaveAttribute(
        'data-selected',
        id
      )
      await expect(page.locator('.temple-page')).toHaveAttribute(
        'data-settled',
        'true'
      )
      const themeColor = await stage.getAttribute('data-theme-color')
      await expect(stage).toHaveAttribute(
        'data-statue-label-color',
        themeColor!
      )
      await expect(stage).toHaveAttribute('data-statue-label-reveal', '1.000')
      await page.keyboard.press('Escape')
      await expect(page.locator('.temple-page')).toHaveAttribute(
        'data-selected',
        'none'
      )
      await expect(page.locator('.temple-page')).toHaveAttribute(
        'data-settled',
        'true'
      )
      await expect(stage).toHaveAttribute('data-statue-label-color', '#e23456')
    }
    return
  }
  await stage.locator('canvas').click({
    position: { x: viewport.width / 2, y: viewport.height / 2 },
  })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'statue'
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await expect(stage).toHaveAttribute('data-temple-reveal', '0.000')
  await expect(stage).toHaveAttribute('data-statue-label-visible', 'true')
  await expect(stage).toHaveAttribute('data-statue-label-reveal', '1.000')
  await expect(stage).toHaveAttribute('data-statue-label-scale', '1.500')
  await expect(stage).toHaveAttribute('data-statue-label-color', '#e23456')
  await expect(stage).toHaveAttribute('data-statue-label-scanlines', '1.000')
  const footerHeight = await page
    .locator('.footer-com')
    .evaluate((el) => parseFloat(getComputedStyle(el).height))
  expect(
    Math.abs(
      viewport.height -
        Number(await stage.getAttribute('data-statue-label-bottom')) -
        (footerHeight * 3 + 24)
    )
  ).toBeLessThanOrEqual(1)
  await page.mouse.move(20, 150)
  await expect(stage).toHaveAttribute('data-statue-label-visible', 'true')
  await page.keyboard.press('Escape')
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await expect(stage).toHaveAttribute('data-statue-label-scale', '1.000')
  await expect(stage).toHaveAttribute('data-statue-label-color', '#e23456')
  await expect(stage).toHaveAttribute('data-statue-label-scanlines', '0.000')
})

test('statue inscription overlaps letter reveals linearly and fades only after returning', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'), '手机端字样默认展示')
  const stage = page.locator('.temple-stage')
  const shaderErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && /shader|WebGL/i.test(message.text()))
      shaderErrors.push(message.text())
  })
  const readEnvironment = async () =>
    stage.evaluate((element) => ({
      reveal: Number(element.dataset.templeReveal),
      scale: Number(element.dataset.templeScale),
      pillars: element.dataset.monumentY!.split(',').map(Number),
      holyScale: Number(element.dataset.statueHolyScale),
      holyLight: Number(element.dataset.statueHolyLight),
      clipHeight: Number(element.dataset.statueClipHeight),
      statueY: Number(element.dataset.statueY),
    }))
  const closingStates: Awaited<ReturnType<typeof readEnvironment>>[] = []
  const openingStates: typeof closingStates = []
  await page.evaluate(() => {
    const clock = { now: performance.now() }
    ;(window as any).labelFadeClock = clock
    const nativeFrame = requestAnimationFrame.bind(window)
    performance.now = () => clock.now
    window.requestAnimationFrame = (callback) =>
      nativeFrame(() => callback(clock.now))
  })
  const advance = async (milliseconds: number) => {
    await page.evaluate(async (ms) => {
      ;(window as any).labelFadeClock.now += ms
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
    }, milliseconds)
  }
  const viewport = page.viewportSize()!
  await page.mouse.move(viewport.width / 2, viewport.height / 2)
  const readLetters = async () =>
    (await stage.getAttribute('data-statue-label-letters'))!
      .split(',')
      .map(Number)
  await advance(100)
  const firstLetters = await readLetters()
  expect(firstLetters[0]).toBeCloseTo(100 / 180, 2)
  expect(firstLetters[1]).toBeCloseTo(10 / 180, 2)
  expect(firstLetters[0] - firstLetters[1]).toBeCloseTo(0.5, 2)
  expect(firstLetters.slice(2)).toEqual([0, 0, 0, 0])
  await advance(100)
  const secondLetters = await readLetters()
  expect(secondLetters[0]).toBe(1)
  expect(secondLetters[1]).toBeCloseTo(110 / 180, 2)
  expect(secondLetters[2]).toBeCloseTo(20 / 180, 2)
  expect(secondLetters[1] - secondLetters[2]).toBeCloseTo(0.5, 2)
  expect(secondLetters[3]).toBe(0)
  await advance(100)
  const thirdLetters = await readLetters()
  expect(thirdLetters[2]).toBeCloseTo(120 / 180, 2)
  expect(thirdLetters[3]).toBeCloseTo(30 / 180, 2)
  expect(thirdLetters[4]).toBe(0)
  for (let i = 0; i < 4; i++) await advance(100)
  await expect(stage).toHaveAttribute('data-statue-label-reveal', '1.000')
  await expect(stage).toHaveAttribute('data-statue-label-color', '#e23456')
  const footerHeight = await page
    .locator('.footer-com')
    .evaluate((el) => parseFloat(getComputedStyle(el).height))
  const targetBottom = viewport.height - (footerHeight * 3 + 24)
  const homeBottom = Number(
    await stage.getAttribute('data-statue-label-bottom')
  )
  let previousBottom = homeBottom
  const direction = Math.sign(targetBottom - previousBottom)
  const initialModel = await readEnvironment()
  await stage.locator('canvas').click({
    position: { x: viewport.width / 2, y: viewport.height / 2 },
  })
  for (let i = 0; i < 18; i++) {
    await advance(100)
    closingStates.push(await readEnvironment())
    const bottom = Number(await stage.getAttribute('data-statue-label-bottom'))
    expect((bottom - previousBottom) * direction).toBeGreaterThanOrEqual(-1)
    expect((bottom - targetBottom) * direction).toBeLessThanOrEqual(1)
    previousBottom = bottom
    await expect(stage).toHaveAttribute('data-statue-label-reveal', '1.000')
  }
  // 点击后首帧应仍保持半身裁切；随后裁切面与模型上升连续推进。
  expect(closingStates[0].clipHeight).toBeCloseTo(initialModel.clipHeight, 2)
  expect(closingStates[0].statueY).toBeCloseTo(initialModel.statueY, 2)
  expect(closingStates.at(-1)!.clipHeight).toBeCloseTo(-0.1, 3)
  expect(closingStates.at(-1)!.statueY).toBeGreaterThan(initialModel.statueY)
  expect(
    closingStates.some(
      ({ reveal, scale, pillars, holyScale, holyLight }) =>
        reveal > 0 &&
        reveal < 1 &&
        scale > 1 &&
        pillars.every((y) => y < 0 && y > -7.5) &&
        holyScale < 1 &&
        holyLight > 0 &&
        holyLight < 1
    )
  ).toBe(true)
  for (let i = 1; i < closingStates.length; i++) {
    expect(closingStates[i].clipHeight).toBeLessThanOrEqual(
      closingStates[i - 1].clipHeight
    )
    expect(closingStates[i].statueY).toBeGreaterThanOrEqual(
      closingStates[i - 1].statueY
    )
    expect(closingStates[i].reveal).toBeLessThanOrEqual(
      closingStates[i - 1].reveal
    )
    expect(closingStates[i].scale).toBeGreaterThanOrEqual(
      closingStates[i - 1].scale
    )
    closingStates[i].pillars.forEach((y, index) =>
      expect(y).toBeLessThanOrEqual(closingStates[i - 1].pillars[index])
    )
  }
  expect(closingStates[7].reveal).toBeGreaterThan(0)
  expect(closingStates[14].reveal).toBeGreaterThan(0)
  await expect(stage).toHaveAttribute('data-temple-reveal', '0.000')
  await expect(stage).toHaveAttribute(
    'data-monument-y',
    '-7.500,-7.500,-7.500,-7.500'
  )
  await expect(stage).toHaveAttribute('data-visible-obelisks', '')
  await expect(stage).toHaveAttribute('data-statue-holy-light', '0.000')
  expect(Math.abs(previousBottom - targetBottom)).toBeLessThanOrEqual(1)
  await page.mouse.move(20, 150)
  await page.keyboard.press('Escape')
  await advance(100)
  await expect(stage).toHaveAttribute('data-statue-label-reveal', '1.000')
  for (let i = 0; i < 20; i++) {
    await advance(100)
    openingStates.push(await readEnvironment())
    const bottom = Number(await stage.getAttribute('data-statue-label-bottom'))
    expect((bottom - previousBottom) * -direction).toBeGreaterThanOrEqual(-1)
    expect((bottom - homeBottom) * -direction).toBeLessThanOrEqual(1)
    previousBottom = bottom
    await expect(stage).toHaveAttribute('data-statue-label-reveal', '1.000')
    await expect(stage).toHaveAttribute('data-statue-label-visible', 'true')
  }
  expect(Math.abs(previousBottom - homeBottom)).toBeLessThanOrEqual(1)
  expect(
    openingStates.some(
      ({ reveal, scale, pillars, holyScale, holyLight }) =>
        reveal > 0 &&
        reveal < 1 &&
        scale > 1 &&
        pillars.every((y) => y < 0 && y > -7.5) &&
        holyScale > 0 &&
        holyScale < 1 &&
        holyLight > 0 &&
        holyLight < 1
    )
  ).toBe(true)
  expect(openingStates.at(-1)!.clipHeight).toBeCloseTo(
    initialModel.clipHeight,
    3
  )
  expect(openingStates.at(-1)!.statueY).toBeCloseTo(initialModel.statueY, 3)
  await expect(stage).toHaveAttribute('data-temple-scale', '1.000')
  await expect(stage).toHaveAttribute('data-temple-reveal', '1.000')
  await expect(stage).toHaveAttribute(
    'data-monument-y',
    '0.000,0.000,0.000,0.000'
  )
  await expect(stage).toHaveAttribute('data-statue-holy-scale', '1.000')
  await expect(stage).toHaveAttribute('data-statue-holy-light', '1.000')
  await advance(100)
  const disappearing = Number(
    await stage.getAttribute('data-statue-label-reveal')
  )
  expect(disappearing).toBeGreaterThan(0)
  expect(disappearing).toBeLessThan(1)
  await advance(2000)
  expect(shaderErrors).toEqual([])
  await expect(stage).toHaveAttribute('data-statue-label-reveal', '0.000')
  await expect(stage).toHaveAttribute('data-statue-label-visible', 'false')
})

test('module colors synchronize the page and model and all crystals remain hoverable', async ({
  page,
}, testInfo) => {
  const stage = page.locator('.temple-stage')
  await expect(page.locator('.site-brand')).toHaveCount(0)
  await expect(stage).toHaveAttribute('data-model', 'lucario')
  const originalModelColor = await stage.getAttribute('data-statue-color')
  if (!testInfo.project.name.includes('mobile')) {
    for (const [id, color, index] of [
      ['archive', '#3276fe', 0],
      ['flanerie', '#8b5cc7', 1],
      ['island', '#ce4c87', 3],
      ['pokeyard', '#f1c640', 2],
    ] as const) {
      const box = (await page.locator(`[data-obelisk="${id}"]`).boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.25)
      await expect(stage).toHaveAttribute('data-hovered', id)
      await expect
        .poll(
          async () =>
            (await stage.getAttribute('data-cap-colors'))?.split(',')[index]
        )
        .toBe(color)
    }
  }
  for (const [id, color] of [
    ['archive', '#3276fe'],
    ['flanerie', '#8b5cc7'],
    ['island', '#ce4c87'],
  ] as const) {
    await page
      .locator(`[data-obelisk="${id}"]`)
      .evaluate((el: HTMLButtonElement) => el.click())
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      id
    )
    await expect(stage).toHaveAttribute('data-theme-color', color)
    await expect
      .poll(() => stage.getAttribute('data-statue-color'))
      .not.toBe(originalModelColor)
    expect(
      await page.evaluate(() =>
        document.documentElement.style.getPropertyValue('--page-theme-color')
      )
    ).toBe(color)
    await expect(page.locator('.site-brand')).toHaveText('Anutrium')
    const rgb = color
      .match(/[0-9a-f]{2}/gi)!
      .map((channel) => parseInt(channel, 16))
    await expect(page.locator('.current-module-name')).toHaveCSS(
      'color',
      `rgb(${rgb.join(', ')})`
    )
    if (id === 'archive') {
      const accent = `rgb(${rgb.join(', ')})`
      await expect(page.locator('.work-card-corner').first()).toHaveCSS(
        'background-color',
        accent
      )
      await expect(page.locator('.work-card-info small').first()).toHaveCSS(
        'color',
        accent
      )
      await expect(page.locator('.availability-cta').first()).toHaveCSS(
        'color',
        accent
      )
      await expect(page.locator('.availability-github')).toHaveCSS(
        '--github-contribution-4',
        color
      )
      expect(
        await page
          .locator('.availability-panel')
          .evaluate(
            (element) => getComputedStyle(element, '::before').backgroundColor
          )
      ).toBe(accent)
    }
  }
  await page.keyboard.press('Escape')
  await page.mouse.move(5, 120)
  await expect(stage).toHaveAttribute('data-theme-color', '#e23456')
  await expect(stage).toHaveAttribute('data-statue-color', originalModelColor!)
  await expect(page.locator('.site-brand')).toHaveCount(0)
})

test('expansion fades its header, resizes content and safely cancels when focus exits', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes('mobile'),
    'Mobile content already fills the screen'
  )
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await expect(page.locator('.archive-content')).toBeVisible()
  const panel = page.locator('.temple-menu')
  await page.locator('.temple-expand').click()
  await expect(panel).toHaveAttribute('aria-busy', 'true')
  await expect(page.locator('.temple-menu__body')).toHaveJSProperty(
    'inert',
    true
  )
  await expect
    .poll(() =>
      page.locator('.temple-menu').evaluate((el) => el.getAnimations().length)
    )
    .toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  await expect(panel).toHaveAttribute('aria-busy', 'false')
  await expect(page.locator('.temple-menu')).toHaveCount(0)
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await expect(page.locator('.temple-menu__body')).toHaveCSS('opacity', '1')
})

test('header fades in and out and its brand never stretches', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  const logo = (await page.locator('.logo-box .logo').boundingBox())!
  expect(
    Math.abs(logo.x + logo.width / 2 - page.viewportSize()!.width / 2)
  ).toBeLessThanOrEqual(1)
  const mobile = testInfo.project.name.includes('mobile')
  const nav = page.locator(mobile ? '.mobile-menu-icon' : '.desktop-menu')
  const samples = await page.evaluate(
    async (selector) => {
      const frames: {
        logoMoving: boolean
        logoDuration: number
        fadeDuration: string
        navOpacity: number | null
        titleOpacity: number | null
      }[] = []
      document
        .querySelector<HTMLButtonElement>('[data-obelisk="archive"]')!
        .click()
      await new Promise<void>((resolve) => {
        const sample = () => {
          const logo = document.querySelector('.logo-box .logo')!
          const nav = document.querySelector(selector)
          const navOpacity = nav ? Number(getComputedStyle(nav).opacity) : null
          const title = document.querySelector('.header-brand-details')
          frames.push({
            logoMoving: logo.getAnimations().length > 0,
            logoDuration: Number(
              logo.getAnimations()[0]?.effect?.getTiming().duration || 0
            ),
            fadeDuration: nav ? getComputedStyle(nav).transitionDuration : '',
            navOpacity,
            titleOpacity: title
              ? Number(getComputedStyle(title).opacity)
              : null,
          })
          if (navOpacity === 1) resolve()
          else requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
      return frames
    },
    mobile ? '.mobile-menu-icon' : '.desktop-menu'
  )
  expect(
    samples.some((frame) => frame.logoMoving && frame.navOpacity === null)
  ).toBe(true)
  expect(samples.some((frame) => frame.logoDuration === 2000)).toBe(true)
  expect(
    samples.some(
      (frame) =>
        frame.logoMoving &&
        frame.titleOpacity !== null &&
        frame.titleOpacity > 0 &&
        frame.titleOpacity < 1
    )
  ).toBe(true)
  expect(
    samples.some(
      (frame) =>
        frame.navOpacity !== null &&
        frame.navOpacity > 0 &&
        frame.navOpacity < 1
    )
  ).toBe(true)
  expect(
    samples
      .filter((frame) => frame.navOpacity !== null)
      .every((frame) => !frame.logoMoving)
  ).toBe(true)
  await expect(nav).toHaveCSS('opacity', '1')
  expect(samples.some((frame) => frame.fadeDuration === '0.8s')).toBe(true)
  const brand = page.locator('.site-brand')
  const focusedLogo = (await page.locator('.logo-box .logo').boundingBox())!
  if (mobile) {
    expect(focusedLogo.x).toBeLessThan(page.viewportSize()!.width * 0.2)
    await expect(page.locator('.layout-page')).not.toHaveClass(
      /temple-header-balanced/
    )
  }
  const brandBox = (await brand.boundingBox())!
  const rootFont = await page.evaluate(() =>
    parseFloat(getComputedStyle(document.documentElement).fontSize)
  )
  expect(brandBox.x - focusedLogo.x - focusedLogo.width).toBeCloseTo(
    rootFont * 0.16667,
    0
  )
  const before = (await brand.boundingBox())!.width
  await page.locator('.logo-box').hover()
  await page.waitForTimeout(850)
  expect((await brand.boundingBox())!.width).toBeCloseTo(before, 1)
  const navBefore = (await nav.boundingBox())!
  const brandBefore = (await brand.boundingBox())!
  const exitMotion = await page.evaluate(
    async (selector) => {
      const frames: {
        opacity: number
        navX: number
        logoMoving: boolean
        brandOpacity: number
        brandX: number
        brandWidth: number
      }[] = []
      let opacityTransition = false
      document
        .querySelector(selector)!
        .addEventListener('transitionrun', (event) => {
          if ((event as TransitionEvent).propertyName === 'opacity')
            opacityTransition = true
        })
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
      await new Promise<void>((resolve) => {
        const sample = () => {
          const nav = document.querySelector(selector)
          if (!nav) return resolve()
          const brand = document.querySelector('.site-brand')
          const brandBox = brand?.getBoundingClientRect()
          frames.push({
            opacity: Number(getComputedStyle(nav).opacity),
            navX: nav.getBoundingClientRect().x,
            logoMoving:
              document.querySelector('.logo-box .logo')!.getAnimations()
                .length > 0,
            brandOpacity: brand
              ? Number(getComputedStyle(brand.parentElement!).opacity)
              : 0,
            brandX: brandBox?.x || 0,
            brandWidth: brandBox?.width || 0,
          })
          requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
      return { frames, opacityTransition }
    },
    mobile ? '.mobile-menu-icon' : '.desktop-menu'
  )
  const exitFrames = exitMotion.frames
  expect(
    exitMotion.opacityTransition ||
      exitFrames.some((frame) => frame.opacity > 0 && frame.opacity < 1)
  ).toBe(true)
  for (const frame of exitFrames.filter((frame) => frame.opacity > 0)) {
    expect(Math.abs(frame.navX - navBefore.x)).toBeLessThanOrEqual(1)
  }
  for (const frame of exitFrames.filter((frame) => frame.brandOpacity > 0)) {
    expect(Math.abs(frame.brandX - brandBefore.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(frame.brandWidth - brandBefore.width)).toBeLessThanOrEqual(
      1
    )
  }
  expect(
    exitFrames.some((frame) => frame.opacity > 0 && frame.logoMoving)
  ).toBe(true)
  expect(
    exitFrames.some(
      (frame) =>
        frame.brandOpacity > 0 && frame.brandOpacity < 1 && frame.logoMoving
    )
  ).toBe(true)
  await expect(nav).toHaveCount(0)
  await expect(brand).toHaveCount(0)
  await expect
    .poll(async () => {
      const rect = (await page.locator('.logo-box .logo').boundingBox())!
      return Math.abs(rect.x + rect.width / 2 - page.viewportSize()!.width / 2)
    })
    .toBeLessThanOrEqual(1)
})

test('logo return stays continuous when the centered layout takes over', async ({
  page,
}) => {
  await page
    .locator('[data-obelisk=archive]')
    .evaluate((el) => (el as HTMLElement).click())
  await expect(page.locator('.temple-menu')).toHaveAttribute(
    'aria-busy',
    'false'
  )
  await expect(page.locator('.layout-page')).not.toHaveClass(
    /temple-header-default/
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const handoff = await page.evaluate(async () => {
    const logo = document.querySelector('.logo-box .logo')!
    const shell = document.querySelector('.layout-page')!
    const frames: { x: number; y: number; centered: boolean }[] = []
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await new Promise<void>((resolve) => {
      const sample = () => {
        frames.push({
          x: logo.getBoundingClientRect().x,
          y: logo.getBoundingClientRect().y,
          centered: shell.classList.contains('temple-header-default'),
        })
        if (frames.at(-1)!.centered) resolve()
        else requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    return frames.slice(-2)
  })
  expect(handoff).toHaveLength(2)
  expect(handoff[0].centered).toBe(false)
  expect(handoff[1].centered).toBe(true)
  expect(Math.abs(handoff[1].y - handoff[0].y)).toBeLessThanOrEqual(1)
  expect(Math.abs(handoff[1].x - handoff[0].x)).toBeLessThanOrEqual(1)
})

test('focused modules tint the half-screen zodiac and rotate to their configured signs', async ({
  page,
}) => {
  const chart = page.locator('.star-container')
  await expect(chart).toHaveClass(/is-red-layout/)
  for (const [id, glyph, color] of [
    ['archive', '♒︎', '#3276fe'],
    ['flanerie', '♐︎', '#8b5cc7'],
    ['island', '♓︎', '#ce4c87'],
    ['pokeyard', '♌︎', '#f1c640'],
  ]) {
    await page
      .locator(`[data-obelisk="${id}"]`)
      .evaluate((element: HTMLButtonElement) => element.click())
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true'
    )
    await expect(chart).toHaveClass(/is-content-layout/)
    await expect(chart).toHaveClass(/is-theme-tinted/)
    await expect(
      chart.locator('.zodiac-sign-face.is-active .zodiac-glyph')
    ).toHaveText(glyph)
    await expect(chart).toHaveCSS('--chart-strong', color)
    const rgb = color
      .slice(1)
      .match(/../g)!
      .map((value) => parseInt(value, 16))
    await expect(chart.locator('.zodiac-static-art--tinted')).toHaveCSS(
      'background-color',
      `rgb(${rgb.join(', ')})`
    )
    await expect(
      chart.locator('.zodiac-sign-face.is-active .zodiac-glyph')
    ).toHaveCSS('color', `rgb(${rgb.join(', ')})`)
    await expect(chart).toHaveCSS('--stage-opacity', '0.15')
    if (id === 'island' || id === 'pokeyard') {
      await expect(page.locator('.temple-menu')).toBeVisible()
      await expect(
        page.locator('.archive-content, .journey-content')
      ).toHaveCount(0)
    }
  }
  await page.keyboard.press('Escape')
  await expect(chart).toHaveClass(/is-red-layout/)
  await expect(
    chart.locator('.zodiac-sign-face.is-active .zodiac-glyph')
  ).toHaveText('♓︎')
})

test('expansion fades to black while the viewport grows and keeps content visible', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  test.skip(
    testInfo.project.name.includes('mobile'),
    'Mobile content already fills the screen'
  )
  for (const id of ['archive', 'island']) {
    await page
      .locator(`[data-obelisk="${id}"]`)
      .evaluate((element: HTMLButtonElement) => element.click())
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true'
    )
    await expect(page.locator('.temple-menu')).toHaveCSS('opacity', '1')
    for (const expanded of [true, false]) {
      const frames = await page.evaluate(async () => {
        const panel = document.querySelector<HTMLElement>('.temple-menu')!
        const body = panel.querySelector<HTMLElement>('.temple-menu__body')!
        const viewport = panel.querySelector<HTMLElement>('.scroll-viewport')!
        const root = document.querySelector('.temple-page')!
        const shade = root.querySelector('.temple-fullscreen-shade')!
        const frames: {
          expanded: boolean
          width: number
          opacity: number
          clip: string
          viewportMotion: string
          resizing: boolean
          shadeOpacity: number
          stageVisibility: string
          shadeBackground: string
        }[] = []
        panel.querySelector<HTMLButtonElement>('.temple-expand')!.click()
        await new Promise<void>((resolve, reject) => {
          const started = performance.now()
          const sample = () => {
            frames.push({
              expanded: root.classList.contains('temple-page--expanded'),
              width: viewport.clientWidth,
              opacity: Number(getComputedStyle(body).opacity),
              clip: getComputedStyle(body).clipPath,
              viewportMotion: getComputedStyle(viewport).transform,
              resizing: panel.getAttribute('aria-busy') === 'true',
              shadeOpacity: Number(getComputedStyle(shade).opacity),
              stageVisibility: getComputedStyle(
                root.querySelector('.temple-stage')!
              ).visibility,
              shadeBackground: getComputedStyle(shade).backgroundImage,
            })
            if (
              frames.length > 1 &&
              panel.getAttribute('aria-busy') === 'false'
            )
              resolve()
            else if (performance.now() - started > 4000)
              reject(new Error('Resize did not settle'))
            else requestAnimationFrame(sample)
          }
          requestAnimationFrame(sample)
        })
        return frames
      })
      expect(frames.every((frame) => frame.opacity === 1)).toBe(true)
      const targetFrames = frames.filter((frame) => frame.expanded === expanded)
      expect(targetFrames.length).toBeGreaterThan(1)
      const widths = targetFrames.map((frame) => frame.width)
      expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(
        page.viewportSize()!.width * 0.2
      )
      expect(new Set(widths).size).toBeGreaterThan(1)
      if (id === 'archive') {
        const columns = await page
          .locator('.works-grid')
          .first()
          .evaluate(
            (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length
          )
        expect(columns).toBe(expanded ? 4 : 2)
      }
      if (expanded) {
        expect(
          targetFrames
            .filter((frame) => frame.resizing)
            .some((frame) => frame.shadeOpacity > 0 && frame.shadeOpacity < 1)
        ).toBe(true)
        expect(
          targetFrames
            .filter((frame) => frame.stageVisibility === 'hidden')
            .every((frame) => frame.shadeOpacity > 0.99)
        ).toBe(true)
        const shade = page.locator('.temple-fullscreen-shade')
        await expect(shade).toHaveCSS('opacity', '1')
        await expect(shade).toHaveCSS('mask-image', 'none')
        expect(
          await shade.evaluate((el) => getComputedStyle(el).backgroundImage)
        ).toContain('repeating-linear-gradient')
        await expect(page.locator('.temple-stage')).toHaveCSS(
          'visibility',
          'hidden'
        )
        await expect(page.locator('.temple-stage canvas')).toHaveCSS(
          'visibility',
          'hidden'
        )
        await expect(page.locator('.temple-obelisks')).toHaveCSS(
          'visibility',
          'hidden'
        )
      } else {
        await expect(page.locator('.temple-stage')).toHaveCSS(
          'visibility',
          'visible'
        )
        await expect(page.locator('.temple-stage canvas')).toHaveCSS(
          'visibility',
          'visible'
        )
        await expect(page.locator('.temple-obelisks')).toHaveCSS(
          'visibility',
          'visible'
        )
      }
      expect(new Set(frames.map((frame) => frame.shadeBackground)).size).toBe(1)
      await expect(page.locator('.temple-menu__header')).toHaveCount(0)
      await expect(page.locator('.temple-menu')).toHaveAttribute(
        'aria-busy',
        'false'
      )
    }
  }
})

test('theme fades directly from red to blue over 1.1 seconds', async ({
  page,
}) => {
  await page.mouse.move(20, 100)
  const sample = () =>
    page.evaluate(async () => {
      const stage = document.querySelector<HTMLElement>('.temple-stage')!
      const original = stage.dataset.statueColor!
      const colors: string[] = []
      const started = performance.now()
      const until = started + 1400
      let intermediate: string | undefined
      ;(
        document.querySelector(`[data-obelisk="archive"]`) as HTMLButtonElement
      ).click()
      await new Promise<void>((resolve) => {
        const frame = () => {
          colors.push(stage.dataset.statueColor!)
          const elapsed = performance.now() - started
          if (elapsed >= 700 && elapsed < 900)
            intermediate = stage.dataset.statueColor!
          if (performance.now() < until) requestAnimationFrame(frame)
          else resolve()
        }
        requestAnimationFrame(frame)
      })
      return { original, colors, intermediate }
    })
  for (const focus of [true, false]) {
    const result = await sample()
    expect(new Set(result.colors).size).toBeGreaterThan(6)
    const channels = result.colors.map((color) =>
      color
        .slice(1)
        .match(/../g)!
        .map((channel) => parseInt(channel, 16))
    )
    // 实际颜色直接在红、蓝之间过渡，既不闪黄，也不经过刻意去饱和的中性色。
    for (const [r, g, b] of channels) {
      const high = Math.max(r, g, b)
      const low = Math.min(r, g, b)
      const saturation = high ? (high - low) / high : 0
      const yellow = r > b && g > b && Math.abs(r - g) < (high - low) * 0.6
      expect(yellow && saturation > 0.25).toBe(false)
      expect(Math.max(r, b) - g).toBeGreaterThan(28)
    }
    expect(result.intermediate).toBeDefined()
    expect(result.intermediate).not.toBe(
      result.colors[result.colors.length - 1]
    )
    const final = channels[channels.length - 1]
    expect(focus ? final[2] > final[0] : final[0] > final[2]).toBe(true)
  }
})

test('focus exit waits for the submenu before restoring the scene', async ({
  page,
}) => {
  const root = page.locator('.temple-page')
  const stage = page.locator('.temple-stage')
  const homeCamera = await stage.getAttribute('data-camera-position')
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(page.locator('.temple-menu')).toHaveCSS('opacity', '1')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  // 延长真实 CSS 退场，验证回程依赖完成信号，而不是写死菜单动画的等待时长。
  await page.addStyleTag({
    content: '.temple-menu { transition-duration: 2s !important; }',
  })
  const focused = await stage.evaluate((el) => [
    el.getAttribute('data-camera-position'),
    el.getAttribute('data-head-rotation'),
    el.getAttribute('data-head-nod-angle'),
    el.getAttribute('data-theme-color'),
  ])
  await page.keyboard.press('Escape')
  const panel = page.locator('.temple-menu')
  await expect(panel).toHaveClass(/temple-menu-reveal-leave-active/)
  await panel.evaluate((el) => {
    for (const animation of el.getAnimations()) animation.pause()
  })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(650)
  await expect(root).toHaveAttribute('data-selected', 'archive')
  expect(
    await stage.evaluate((el) => [
      el.getAttribute('data-camera-position'),
      el.getAttribute('data-head-rotation'),
      el.getAttribute('data-head-nod-angle'),
      el.getAttribute('data-theme-color'),
    ])
  ).toEqual(focused)
  await panel.evaluate((el) => {
    for (const animation of el.getAnimations()) animation.finish()
  })
  await expect(panel).toHaveCount(0)
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(stage).toHaveAttribute('data-camera-position', homeCamera!)
  await expect(stage).toHaveAttribute('data-theme-color', '#e23456')
})

test('switching focus during submenu exit cancels the pending return', async ({
  page,
}) => {
  const root = page.locator('.temple-page')
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(page.locator('.temple-menu')).toHaveCSS('opacity', '1')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addStyleTag({
    content: '.temple-menu { transition-duration: 2s !important; }',
  })
  const panel = await page.locator('.temple-menu').elementHandle()
  await page.keyboard.press('Escape')
  await expect(page.locator('.temple-menu')).toHaveClass(
    /temple-menu-reveal-leave-active/
  )
  await panel!.evaluate((el) => {
    for (const animation of el.getAnimations()) animation.pause()
  })
  await page
    .locator('[data-obelisk="flanerie"]')
    .evaluate((el: HTMLButtonElement) => el.click())
  await expect(root).toHaveAttribute('data-selected', 'flanerie')
  await expect(root).toHaveAttribute('data-settled', 'true')
  await panel!.evaluate((el) => {
    for (const animation of el.getAnimations()) animation.finish()
  })
  await expect(page.locator('.temple-menu-reveal-leave-active')).toHaveCount(0)
  await expect(root).toHaveAttribute('data-selected', 'flanerie')
  await expect(page.locator('.journey-content')).toBeVisible()
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-theme-color',
    '#8b5cc7'
  )
})

test('focus aims the head at the pillar and restores delayed pointer tracking on exit', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000)
  const stage = page.locator('.temple-stage')
  for (const [id, sign] of [
    ['flanerie', -1],
    ['island', 1],
  ] as const) {
    await page
      .locator(`[data-obelisk="${id}"]`)
      .evaluate((el: HTMLButtonElement) => el.click())
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true'
    )
    await expect(stage).toHaveAttribute('data-head-aim', id)
    expect(
      Number(await stage.getAttribute('data-head-turn-progress'))
    ).toBeLessThan(1)
    await expect(page.locator('.temple-focus-content')).toBeAttached()
    await expect(stage).toHaveAttribute('data-head-turn-progress', '1.000')
    const pose = (await stage.getAttribute('data-head-rotation'))!
      .split(',')
      .map(Number)
    expect(pose[1] * sign).toBeGreaterThan(
      testInfo.project.name.includes('mobile') ? 0.15 : 0.35
    )
    await page.mouse.move(page.viewportSize()!.width * 0.8, 120)
    await page.waitForTimeout(250)
    const after = (await stage.getAttribute('data-head-rotation'))!
      .split(',')
      .map(Number)
    expect(
      Math.max(...after.map((value, i) => Math.abs(value - pose[i])))
    ).toBeLessThan(0.00001)
  }
  await page.keyboard.press('Escape')
  await expect(stage).toHaveAttribute('data-head-aim', 'center')
  await page.mouse.move(page.viewportSize()!.width * 0.05, 120)
  await page.mouse.move(page.viewportSize()!.width * 0.95, 120)
  await expect(stage).toHaveAttribute('data-head-aim', 'pointer')
  expect(
    Math.abs(
      Number((await stage.getAttribute('data-head-rotation'))!.split(',')[1])
    )
  ).toBeLessThan(0.001)
  await page.mouse.move(page.viewportSize()!.width * 0.8, 120)
  await expect
    .poll(async () =>
      Number((await stage.getAttribute('data-head-rotation'))!.split(',')[1])
    )
    .toBeGreaterThan(0.05)
})

test('pillar hover colors the shaft and dims the environment with a reversible transition', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes('mobile'),
    'Touch devices do not have persistent hover'
  )
  const stage = page.locator('.temple-stage')
  const before = await stage.getAttribute('data-body-colors')
  const statue = await stage.getAttribute('data-statue-color')
  const box = (await page.locator('[data-obelisk="archive"]').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.25)
  await expect(stage).toHaveAttribute('data-hovered', 'archive')
  await expect
    .poll(async () =>
      Number(await stage.getAttribute('data-environment-brightness'))
    )
    .toBeLessThan(0.5)
  await expect(stage).not.toHaveAttribute('data-body-colors', before!)
  await expect(stage).not.toHaveAttribute('data-statue-color', statue!)
  await page.mouse.move(5, 120)
  await expect(stage).toHaveAttribute('data-environment-brightness', '1.000')
  await expect(stage).toHaveAttribute('data-body-colors', before!)
  await expect(stage).toHaveAttribute('data-statue-color', statue!)
  await page
    .locator('[data-obelisk="archive"]')
    .evaluate((element: HTMLButtonElement) => element.click())
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  await page.mouse.move(5, 120)
  await expect(stage).toHaveAttribute('data-hovered', 'none')
  await expect(stage).toHaveAttribute('data-environment-brightness', '0.420')
  await page.keyboard.press('Escape')
  await expect(stage).toHaveAttribute('data-environment-brightness', '1.000')
})
