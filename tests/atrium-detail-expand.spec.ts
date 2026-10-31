import { expect, test } from './helpers/sceneDiagnostics'

const modules = [
  ['/atrium/laboratory', 'LABORATORY', 'left'],
  ['/atrium/notes', 'NOTES', 'left'],
  ['/atrium/games', 'GAME LIBRARY', 'right'],
  ['/atrium/collections', 'COLLECTIBLES', 'right'],
] as const

test('detail heading flashes twice before returning to the overview', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'), '桌面端验证标题点击反馈')
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/atrium/collections', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus:not(.island-closing-snapshot)')
  const heading = root.locator('.island-panels .island-window__bar:visible')
  await expect(root.locator('.island-detail-expand')).toBeEnabled({
    timeout: 45000,
  })
  const opacities = await heading.evaluate((element) => {
    element.click()
    const flash = element.getAnimations().find((animation) => {
      const frames = (animation.effect as KeyframeEffect).getKeyframes()
      return frames.length === 5 && frames[1].opacity === '0'
    })!
    flash.pause()
    const values = [0, 60, 120, 180].map((time) => {
      flash.currentTime = time
      return getComputedStyle(element).opacity
    })
    flash.play()
    return values
  })
  expect(opacities).toEqual(['1', '0', '1', '0'])
  await expect(page).toHaveURL(/\/atrium$/)
})

test('all Atrium detail pages expand and collapse on the model side', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'), '移动端默认全宽展示')
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(modules[0][0], { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus:not(.island-closing-snapshot)')
  for (const [index, [path, id, side]] of modules.entries()) {
    if (index) {
      await page.evaluate((target) => {
        const app = (document.querySelector('#app') as any).__vue_app__
        return app.config.globalProperties.$router.push(target)
      }, path)
    }
    await expect(root).toHaveAttribute('data-detail-item', id, {
      timeout: 45000,
    })
    const panel = root.locator(
      `.island-panels [data-island-group="${
        side === 'left' ? 'ideas' : 'interests'
      }"]`
    )
    const button = panel.locator('.island-detail-expand')
    await expect(button).toBeVisible()
    await expect(button).toBeEnabled()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    const before = await panel.boundingBox()
    const buttonBox = await button.boundingBox()
    expect(before).not.toBeNull()
    expect(buttonBox).not.toBeNull()
    if (side === 'left')
      expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(before!.x + 1)
    else
      expect(buttonBox!.x).toBeGreaterThanOrEqual(before!.x + before!.width - 1)
    const scroll = panel.locator(
      '.island-detail__viewport .scroll-viewport__scroll'
    )
    const scrollTop = await scroll.evaluate((element) => {
      element.scrollTop = 40
      return element.scrollTop
    })
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(root).toHaveClass(/has-detail-expanded/)
    await expect(button).toBeEnabled()
    expect((await panel.boundingBox())!.width).toBeGreaterThan(
      before!.width + 10
    )
    const expandedScroll = await scroll.evaluate(
      (element, previous) => ({
        actual: element.scrollTop,
        expected: Math.min(
          previous,
          Math.max(0, element.scrollHeight - element.clientHeight)
        ),
      }),
      scrollTop
    )
    expect(expandedScroll.actual).toBe(expandedScroll.expected)
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(root).not.toHaveClass(/has-detail-expanded/)
    await expect(button).toBeEnabled()
    expect(
      Math.abs((await panel.boundingBox())!.width - before!.width)
    ).toBeLessThanOrEqual(1)
    expect(await scroll.evaluate((element) => element.scrollTop)).toBe(
      expandedScroll.actual
    )
  }
})

test('notes expands and collapses with the normal motion', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'), '移动端没有展开按钮')
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/atrium/notes', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus:not(.island-closing-snapshot)')
  const panel = root.locator('[data-island-group="ideas"]')
  const button = panel.locator('.island-detail-expand')
  await expect(button).toBeEnabled({ timeout: 45000 })
  const before = await panel.boundingBox()
  const expectUnstretchedContent = async () => {
    const scales = await panel.evaluate(
      (element) =>
        new Promise<{
          pane: number
          content: number[]
          clip: string
        } | null>((resolve) => {
          const started = performance.now()
          const sample = () => {
            const pane = new DOMMatrixReadOnly(
              getComputedStyle(element).transform
            ).m11
            const content = Array.from(
              element.querySelectorAll<HTMLElement>(
                '.island-window__bar, .island-item:not([style*="display: none"]), .island-detail'
              ),
              (item) =>
                new DOMMatrixReadOnly(getComputedStyle(item).transform).m11
            )
            if (
              Math.abs(pane - 1) > 0.03 &&
              content.length === 3 &&
              content.every((scale) => scale !== 1)
            )
              resolve({
                pane,
                content,
                clip: getComputedStyle(element).clipPath,
              })
            else if (performance.now() - started > 1100) resolve(null)
            else requestAnimationFrame(sample)
          }
          requestAnimationFrame(sample)
        })
    )
    expect(scales).not.toBeNull()
    expect(scales!.clip).not.toBe('none')
    for (const scale of scales!.content)
      expect(scales!.pane * scale).toBeCloseTo(1, 2)
  }
  await button.click()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  await expectUnstretchedContent()
  await expect(button).toBeEnabled({ timeout: 10000 })
  expect((await panel.boundingBox())!.width).toBeGreaterThan(before!.width + 10)
  await button.click()
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await expectUnstretchedContent()
  await expect(button).toBeEnabled({ timeout: 10000 })
  expect(
    Math.abs((await panel.boundingBox())!.width - before!.width)
  ).toBeLessThanOrEqual(1)
})

test('mobile detail pages use the full content width without an expand button', async ({
  page,
}, info) => {
  test.skip(!info.project.name.includes('mobile'), '桌面端支持展开按钮')
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(modules[0][0], { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus:not(.island-closing-snapshot)')
  for (const [index, [path, id, side]] of modules.entries()) {
    if (index) {
      await page.evaluate((target) => {
        const app = (document.querySelector('#app') as any).__vue_app__
        return app.config.globalProperties.$router.push(target)
      }, path)
    }
    await expect(root).toHaveAttribute('data-detail-item', id, {
      timeout: 45000,
    })
    await expect(root.locator('.island-detail-expand')).toHaveCount(0)
    const panel = root.locator(
      `.island-panels [data-island-group="${
        side === 'left' ? 'ideas' : 'interests'
      }"]`
    )
    await expect(panel.locator('.island-detail')).toBeVisible()
    const bounds = await panel.evaluate((element) => ({
      panel: element.getBoundingClientRect().width,
      available: element.parentElement!.getBoundingClientRect().width,
    }))
    expect(Math.abs(bounds.panel - bounds.available)).toBeLessThanOrEqual(1)
    await expect(
      root.locator(`[data-link-item="${id}"] .island-anchor__frame`)
    ).toBeVisible()
  }
})

test('detail group heading uses a transparent background and a nearby theme-colored arrow', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/laboratory', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus:not(.island-closing-snapshot)')
  for (const [index, path] of [
    '/atrium/laboratory',
    '/atrium/collections',
  ].entries()) {
    if (index) {
      await page.evaluate(
        (target) =>
          (
            document.querySelector('#app') as any
          ).__vue_app__.config.globalProperties.$router.push(target),
        path
      )
    }
    await expect(page).toHaveURL(path)
    const heading = root.locator(
      '.island-panels .island-window:visible .island-window__bar'
    )
    await expect(heading).toBeVisible({ timeout: 45000 })
    const style = await heading.evaluate((bar) => {
      const title = bar.querySelector('h2')!
      const arrow = bar.querySelector<HTMLElement>('.island-window__glyph')!
      const titleStyle = getComputedStyle(title)
      const titleBounds = title.getBoundingClientRect()
      const arrowBounds = arrow.getBoundingClientRect()
      const probe = document.createElement('span')
      probe.style.color = 'var(--page-theme-color)'
      bar.appendChild(probe)
      const theme = getComputedStyle(probe).color
      probe.remove()
      return {
        background: getComputedStyle(bar).backgroundColor,
        image: getComputedStyle(bar).backgroundImage,
        mask: titleStyle.maskImage,
        color: titleStyle.color,
        fill: titleStyle.webkitTextFillColor,
        theme,
        gap: arrowBounds.left - titleBounds.right,
        arrowColor: getComputedStyle(arrow).borderRightColor,
      }
    })
    expect(style.background).toBe('rgba(0, 0, 0, 0)')
    expect(style.image).toBe('none')
    expect(style.mask).toContain('to right')
    expect(style.color).toBe(style.theme)
    expect(style.fill).toBe(style.theme)
    expect(style.arrowColor).toBe(style.theme)
    expect(Math.abs(style.gap - 3)).toBeLessThanOrEqual(1)
  }
})

test('detail heading and count flash twice on entry and exit', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/atrium/laboratory', { waitUntil: 'domcontentloaded' })
  const root = page.locator(
    '.island-focus.has-detail:not(.island-closing-snapshot)'
  )
  await expect(root.locator('.island-detail')).toBeVisible({ timeout: 45000 })
  const entry = await root.evaluate((element) => {
    return ['.island-window__bar', '.island-item__count'].map((selector) => {
      const node = element.querySelector<HTMLElement>(
        `.island-window:has(.island-detail) ${selector}`
      )!
      const animation = node
        .getAnimations()
        .find((item) =>
          (item as CSSAnimation).animationName?.startsWith(
            'island-detail-header-flash-in'
          )
        )!
      animation.pause()
      const values = [351, 411, 459, 507, 590].map((time) => {
        animation.currentTime = time
        return getComputedStyle(node).opacity
      })
      animation.finish()
      return values
    })
  })
  expect(entry).toEqual([
    ['0', '1', '0', '1', '1'],
    ['0', '1', '0', '1', '1'],
  ])
  const exit = await page.evaluate(async () => {
    const app = (document.querySelector('#app') as any).__vue_app__
    await app.config.globalProperties.$router.push('/atrium')
    const snapshot = document.querySelector('.island-closing-snapshot')!
    return Array.from(
      snapshot.querySelectorAll<HTMLElement>(
        '.island-detail-header-leave-active'
      )
    )
      .filter((node) => node.getClientRects().length > 0)
      .map((node) => {
        const animation = node
          .getAnimations()
          .find((item) =>
            (item as CSSAnimation).animationName?.startsWith(
              'island-detail-header-flash-out'
            )
          )!
        animation.pause()
        return [1, 61, 109, 157, 240].map((time) => {
          animation.currentTime = time
          return getComputedStyle(node).opacity
        })
      })
  })
  expect(exit).toEqual([
    ['1', '0', '1', '0', '0'],
    ['1', '0', '1', '0', '0'],
  ])
})
