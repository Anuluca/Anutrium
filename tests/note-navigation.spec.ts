import { expect, test } from '@playwright/test'

test('note navigation preloads neighbors and fades stationary content while shells move', async ({
  page,
  isMobile,
}) => {
  test.setTimeout(90000)
  const notes = Array.from({ length: 14 }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    title: `Navigation ${index}`,
    time: '2026-11-01',
    type: 'technology',
    path: '',
  })).map((note) => ({ ...note, path: `/atrium/notes?note=${note.id}` }))
  const requestedNotes: string[] = []
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('https://steam-api.anuluca.com/notes**', (route) => {
    const id = new URL(route.request().url()).pathname.split('/')[2]
    if (!id)
      return route.fulfill({
        json: {
          notes: [
            ...notes,
            {
              ...notes[0],
              id: '11111111-1111-4111-8111-111111111111',
              type: 'daily',
            },
          ],
          nextCursor: null,
        },
      })
    requestedNotes.push(id)
    const note = notes.find((item) => item.id === id)!
    return route.fulfill({
      contentType: 'text/markdown',
      body: `---\ntitle: ${note.title}\ndate: 2026-11-01\ncategory: technology\n---\n\nBody ${note.title}`,
    })
  })
  await page.goto(`/atrium/notes?category=technology&note=${notes[11].id}`, {
    waitUntil: 'domcontentloaded',
  })
  const modal = page.locator('.note-detail-modal')
  const previous = page.locator('.note-detail-nav--prev')
  const next = page.locator('.note-detail-nav--next')
  await expect(previous).toBeVisible({ timeout: 45000 })
  await expect(next).toBeVisible()
  await expect(modal.locator('h1')).toHaveText(notes[11].title)
  await expect
    .poll(() => [...requestedNotes].sort())
    .toEqual([notes[10].id, notes[11].id, notes[12].id].sort())
  await expect(page.locator('.note-detail-stage .note-reader')).toHaveCount(0)
  await expect(previous).toHaveText('')
  await expect(next).toHaveText('')
  const prevBounds = (await previous.boundingBox())!
  const nextBounds = (await next.boundingBox())!
  const center = (await modal.boundingBox())!
  const viewport = page.viewportSize()!
  expect(prevBounds.width / center.width).toBeCloseTo(0.9, 2)
  expect(nextBounds.height / center.height).toBeCloseTo(0.9, 2)
  if (isMobile) {
    expect(prevBounds.y).toBeLessThan(0)
    expect(prevBounds.y + prevBounds.height).toBeGreaterThan(0)
    expect(prevBounds.y + prevBounds.height).toBeLessThan(40)
    expect(viewport.height - nextBounds.y).toBeGreaterThan(0)
    expect(viewport.height - nextBounds.y).toBeLessThan(40)
    const close = (await modal.locator('.diamond-close-btn').boundingBox())!
    expect(close.y + close.height).toBeLessThan(nextBounds.y)
  } else {
    expect(prevBounds.x).toBeLessThan(0)
    expect(prevBounds.x + prevBounds.width).toBeGreaterThan(0)
    expect(prevBounds.x + prevBounds.width).toBeLessThan(64)
    expect(viewport.width - nextBounds.x).toBeGreaterThan(0)
    expect(viewport.width - nextBounds.x).toBeLessThan(64)
    expect(
      Math.abs(
        prevBounds.y + prevBounds.height / 2 - center.y - center.height / 2
      )
    ).toBeLessThanOrEqual(1)
  }
  const clickShell = async (shell: typeof next) => {
    const bounds = (await shell.boundingBox())!
    // 点击当前可视的窄边，弹窗的大部分外壳位于视口之外。
    await shell.click({
      position: {
        x:
          (Math.max(0, bounds.x) +
            Math.min(viewport.width, bounds.x + bounds.width)) /
            2 -
          bounds.x,
        y:
          (Math.max(0, bounds.y) +
            Math.min(viewport.height, bounds.y + bounds.height)) /
            2 -
          bounds.y,
      },
    })
  }
  const titleBefore = (await modal.locator('h1').boundingBox())!
  const stack = page.locator('.study-note-stack')
  await expect(stack).toHaveClass(/is-ready/)
  await stack.evaluate((element: HTMLElement) => {
    element.dataset.testMasonryChanges = '0'
    new MutationObserver((records) => {
      element.dataset.testMasonryChanges = String(
        Number(element.dataset.testMasonryChanges) + records.length
      )
    }).observe(element, { attributes: true, attributeFilter: ['class'] })
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await previous.evaluate((shell: HTMLElement) => shell.click())
  await expect(modal).toHaveClass(/is-switching/)
  const motion = await page.evaluate(async () => {
    await new Promise(requestAnimationFrame)
    const shell = document.querySelector('.note-detail-nav.is-incoming')!
    const outgoing = document.querySelector('.note-detail-outgoing')!
    const reader = document.querySelector('.note-reader')!
    const movement = shell
      .getAnimations()
      .find((a) => !(a instanceof CSSAnimation))!
    const fade = reader.getAnimations()[0]
    for (const element of [shell, outgoing, reader]) {
      for (const animation of element.getAnimations()) {
        if (animation instanceof CSSAnimation) continue
        animation.pause()
        animation.currentTime = element === reader ? 125 : 500
      }
    }
    return {
      duration: movement.effect!.getTiming().duration,
      opacity: getComputedStyle(reader).opacity,
      readerFrames: fade.effect!.getKeyframes(),
      frames: movement.effect!.getKeyframes(),
    }
  })
  expect(motion.duration).toBe(1000)
  expect(
    motion.frames.every(
      (frame) =>
        !['left', 'top', 'width', 'height'].some(
          (property) => property in frame
        )
    )
  ).toBe(true)
  expect(Number(motion.opacity)).toBeGreaterThan(0)
  expect(Number(motion.opacity)).toBeLessThan(1)
  expect(
    motion.readerFrames.every(
      (frame) => !('transform' in frame) && !('translate' in frame)
    )
  ).toBe(true)
  const titleDuring = (await modal.locator('h1').boundingBox())!
  expect(Math.abs(titleDuring.x - titleBefore.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(titleDuring.y - titleBefore.y)).toBeLessThanOrEqual(1)
  const modalDuring = (await modal.boundingBox())!
  expect(Math.abs(modalDuring.x - center.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(modalDuring.y - center.y)).toBeLessThanOrEqual(1)
  if (!isMobile) {
    const metrics = await page.context().newCDPSession(page)
    await metrics.send('Performance.enable')
    const readLayouts = async () => {
      const result = await metrics.send('Performance.getMetrics')
      return result.metrics.find((metric) => metric.name === 'LayoutCount')!
        .value
    }
    const initialLayouts = await readLayouts()
    // 强制读取每个采样点的几何，确认移动和缩放不会触发布局重排。
    await previous.evaluate((shell) => {
      const animation = shell.getAnimations()[0]
      for (let time = 0; time <= 1000; time += 100) {
        animation.currentTime = time
        shell.getBoundingClientRect()
      }
      animation.currentTime = 500
    })
    // 允许动画层初始化的一次布局，不允许每个采样点都重新布局。
    expect((await readLayouts()) - initialLayouts).toBeLessThanOrEqual(1)
    await metrics.detach()
  }
  await page.screenshot({
    path: test.info().outputPath('note-switch-midpoint.png'),
  })
  await expect(page).toHaveURL(new RegExp(`note=${notes[11].id}`))
  // 几何动画尚未结束时，正文已在同一中央阅读器里完成淡出并切换。
  await modal
    .locator('.note-reader')
    .evaluate((reader) => reader.getAnimations().forEach((a) => a.finish()))
  await expect(page).toHaveURL(new RegExp(`note=${notes[10].id}`))
  await expect(modal.locator('h1')).toHaveText(notes[10].title)
  await expect(modal.locator('.note-reader')).toHaveAttribute(
    'data-note-enter',
    'ready'
  )
  await expect(page.locator('.note-reader')).toHaveCount(1)
  expect(requestedNotes.filter((id) => id === notes[10].id)).toHaveLength(1)
  const titleAfter = (await modal.locator('h1').boundingBox())!
  expect(Math.abs(titleAfter.x - titleBefore.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(titleAfter.y - titleBefore.y)).toBeLessThanOrEqual(1)
  await page.evaluate(() => {
    for (const element of document.querySelectorAll(
      '.note-detail-stage .note-detail-nav, .note-reader'
    )) {
      for (const animation of element.getAnimations()) {
        if (!(animation instanceof CSSAnimation)) animation.finish()
      }
    }
  })
  await expect(modal).not.toHaveClass(/is-switching/)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await clickShell(next)
  await expect(modal).not.toHaveClass(/is-switching/)
  await expect(page).toHaveURL(new RegExp(`note=${notes[11].id}`))
  await clickShell(next)
  await expect(modal).not.toHaveClass(/is-switching/)
  await expect(page).toHaveURL(new RegExp(`note=${notes[12].id}`))
  await expect(modal.locator('h1')).toHaveText(notes[12].title)
  await clickShell(next)
  await expect(modal).not.toHaveClass(/is-switching/)
  await expect(page).toHaveURL(new RegExp(`note=${notes[13].id}`))
  await expect(next).toHaveCount(0)
  await page.goBack()
  await expect(page).toHaveURL(new RegExp(`note=${notes[12].id}`))
  await expect(next).toBeVisible()
  await expect(stack).toHaveAttribute('data-test-masonry-changes', '0')
  await page.screenshot({
    path: test.info().outputPath('note-neighbors.png'),
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await next.evaluate((shell: HTMLElement) => shell.click())
  await expect(modal).toHaveClass(/is-switching/)
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/atrium/notes?category=technology&note=${notes[0].id}`)
  await expect(modal).toBeVisible({ timeout: 45000 })
  await expect(previous).toHaveCount(0)
  await expect(next).toBeVisible()
})
