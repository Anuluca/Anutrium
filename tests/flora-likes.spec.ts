import { expect, test } from '@playwright/test'

test('likes blink, count, persist across pets and enforce the shared daily limit', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.routeWebSocket('ws://localhost:3000/**', (s) => s.close())
  let remaining = 10,
    writes = 0
  let dropped = false
  let releaseFirstPost!: () => void
  const firstPost = new Promise<void>((resolve) => {
    releaseFirstPost = resolve
  })
  let held = false
  const counts = { huahua: 8, xiaohei: 15 }
  const acceptedRequestIds: string[] = []
  const snapshot = () => ({
    counts: { ...counts },
    remaining,
    limit: 10,
    visitorToken: 'test-visitor-token',
    acceptedRequestIds: [...acceptedRequestIds],
    day: '2026-10-19',
    resetsAt: '2099-10-19T16:00:00Z',
  })
  await page.route('**/floratrium/likes', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type, X-Flora-Visitor',
        },
      })
      return
    }
    if (route.request().method() === 'POST') {
      if (!held) {
        held = true
        await firstPost
      }
      const body = route.request().postDataJSON() as {
        petId: 'huahua' | 'xiaohei'
        requestId: string
      }
      if (!acceptedRequestIds.includes(body.requestId)) {
        if (!remaining) {
          await route.fulfill({
            status: 429,
            json: { ...snapshot(), error: 'daily_limit' },
          })
          return
        }
        counts[body.petId]++
        remaining--
        writes++
        acceptedRequestIds.push(body.requestId)
      }
    }
    if (route.request().method() === 'POST' && writes === 1 && !dropped) {
      dropped = true
      await route.abort('failed')
      return
    }
    await route.fulfill({
      json: snapshot(),
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  })
  await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.flora-like__button')).toBeVisible({
    timeout: 45000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 20000,
  })
  if (info.project.name.includes('mobile')) {
    const alert = page.locator('.mobile-experience-alert')
    await expect(alert).toBeVisible({ timeout: 20000 })
    await alert.click()
  }
  const button = page.locator('.flora-like__button'),
    number = page.locator('.flora-like__count')
  await expect(number).toHaveText('8')
  await page.evaluate(() => document.fonts.ready)
  const numberLayout = await page
    .locator('.flora-like__number')
    .evaluate((element) => {
      const style = getComputedStyle(element)
      const bounds = element.getBoundingClientRect()
      const context = document.createElement('canvas').getContext('2d')!
      context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const metrics = context.measureText(element.textContent ?? '')
      const baselineProbe = document.createElement('span')
      baselineProbe.style.cssText =
        'display:inline-block;width:0;height:0;vertical-align:baseline'
      element.append(baselineProbe)
      const baseline = baselineProbe.getBoundingClientRect().top
      baselineProbe.remove()
      return {
        layoutHeight:
          bounds.height +
          parseFloat(style.marginTop) +
          parseFloat(style.marginBottom),
        bottomClearance:
          bounds.bottom - baseline - metrics.actualBoundingBoxDescent,
      }
    })
  const iconBounds = (await button.locator('.flora-like__icon').boundingBox())!
  expect(numberLayout.layoutHeight).toBeCloseTo(iconBounds.height, 0)
  expect(numberLayout.bottomClearance).toBeGreaterThanOrEqual(0)
  if (!info.project.name.includes('mobile')) {
    await button.hover()
    await expect(button.locator('.flora-like__icon')).toHaveCSS(
      'color',
      'rgb(226, 52, 86)'
    )
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await button.click()
  await expect(button.locator('.flora-like__icon')).toHaveClass(/is-flashing/)
  await expect(button.locator('.flora-like__ripple')).toHaveCount(1)
  await expect(button.locator('.flora-like__ripple')).toHaveCSS('fill', 'none')
  await expect(number).toContainText('9')
  await expect(page.locator('.flora-like__plus')).toHaveText('+1')
  expect(writes).toBe(0)
  releaseFirstPost()
  await expect(button).toBeEnabled()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('button[data-pet-id="xiaohei"]').click()
  await expect(number).toHaveText('15')
  for (let i = 0; i < 9; i++) {
    await button.click()
    await expect(button).toBeEnabled()
  }
  await expect(number).toContainText('24')
  await button.click()
  await expect(page.locator('.el-message--warning')).toContainText('10')
  await expect(page.locator('.flora-like__message')).toHaveCount(0)
  expect(writes).toBe(10)
  await page.locator('button[data-pet-id="huahua"]').click()
  await expect(number).toHaveText('9')
  await expect(button).toHaveAttribute('aria-label', /0 次/)
  await page.screenshot({ path: `.tmp/flora-likes-${info.project.name}.png` })
})

test('optimistic likes roll back when the server cannot confirm the click', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  let rejectPost!: () => void
  const responseGate = new Promise<void>((resolve) => {
    rejectPost = resolve
  })
  await page.route('**/floratrium/likes', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST',
          'Access-Control-Allow-Headers': 'Content-Type, X-Flora-Visitor',
        },
      })
    } else if (route.request().method() === 'POST') {
      await responseGate
      await route.fulfill({
        status: 503,
        json: { error: 'likes_unavailable' },
        headers: { 'Access-Control-Allow-Origin': '*' },
      })
    } else {
      await route.fulfill({
        json: {
          counts: { huahua: 0, xiaohei: 0 },
          remaining: 10,
          limit: 10,
          visitorToken: 'test-token',
          acceptedRequestIds: [],
          day: '2026-10-19',
          resetsAt: '2099-10-19T16:00:00Z',
        },
        headers: { 'Access-Control-Allow-Origin': '*' },
      })
    }
  })
  await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
  const button = page.locator('.flora-like__button')
  await expect(button).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 20000,
  })
  if (info.project.name.includes('mobile')) {
    const alert = page.locator('.mobile-experience-alert')
    await expect(alert).toBeVisible({ timeout: 20000 })
    await alert.click()
  }
  await expect(page.locator('.flora-like__number')).toHaveText('0')
  await button.click()
  await expect(page.locator('.flora-like__number')).toHaveText('1')
  rejectPost()
  await expect(page.locator('.flora-like__message')).toContainText('重试')
  await expect(page.locator('.flora-like__number')).toHaveText('0')
  await expect(page.locator('.flora-like__plus')).toHaveCount(0)
})
