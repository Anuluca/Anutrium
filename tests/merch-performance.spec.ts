import { expect, test } from '@playwright/test'

test('merch cards render together and finish entry before scrolling', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const mountedPages = new Set<Element>()
    Object.assign(window, { merchMountedPages: mountedPages })
    new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue
          if (node.matches('.merch-page')) mountedPages.add(node)
          node
            .querySelectorAll('.merch-page')
            .forEach((page) => mountedPages.add(page))
        }
      }
    }).observe(document, { childList: true, subtree: true })
    const stats = { created: 0, callbacks: 0 }
    Object.assign(window, { merchObserverStats: stats })
    const OriginalObserver = window.IntersectionObserver
    window.IntersectionObserver = class extends OriginalObserver {
      constructor(
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit
      ) {
        const isMerchObserver = options?.rootMargin === '0px 0px -10% 0px'
        if (isMerchObserver) stats.created++
        super((entries, observer) => {
          if (isMerchObserver) stats.callbacks++
          callback(entries, observer)
        }, options)
      }
    }
  })

  await page.goto('/island/merch', {
    waitUntil: 'domcontentloaded',
  })
  const cards = page.locator('.collection-card')
  await expect(cards.first()).toBeVisible()
  const totalCount = await page
    .locator('.collection-section__count span:first-child')
    .evaluateAll((elements) =>
      elements.reduce(
        (total, element) => total + Number(element.textContent),
        0
      )
    )
  await expect(cards).toHaveCount(totalCount)
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 15000,
  })
  expect(
    await page.evaluate(
      () =>
        (window as typeof window & { merchMountedPages: Set<Element> })
          .merchMountedPages.size
    )
  ).toBe(1)
  await page.waitForTimeout(2500)
  const observerCount = await page.evaluate(
    () =>
      (window as typeof window & { merchObserverStats: { created: number } })
        .merchObserverStats.created
  )
  expect(observerCount).toBe(0)
  const runningEntries = () =>
    page
      .locator('.collection-index')
      .evaluate(
        (element) =>
          element
            .getAnimations({ subtree: true })
            .filter(
              (animation) =>
                animation.playState === 'running' || animation.pending
            ).length
      )
  await expect.poll(runningEntries).toBe(0)
  expect(
    await page
      .locator('.collection-index')
      .evaluate((element) => element.getAnimations({ subtree: true }).length)
  ).toBe(0)

  const threeDimensionalElements = await page
    .locator('.collection-section, .collection-section *')
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          const style = getComputedStyle(element)
          return (
            style.transformStyle === 'preserve-3d' ||
            style.perspective !== 'none' ||
            style.transform.startsWith('matrix3d')
          )
        })
        .map((element) => element.className)
    )
  expect(threeDimensionalElements).toEqual([])

  await page.evaluate(() => {
    document.body.scrollTop = document.body.scrollHeight
  })
  await expect(cards).toHaveCount(totalCount)
  expect(await runningEntries()).toBe(0)
  await expect(cards.first().locator('img')).toHaveAttribute(
    'src',
    /[?&]image=card-thumb/
  )
})

test('merch cover transition stays lightweight and back restores scroll position', async ({
  page,
}) => {
  await page.goto('/island/merch', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 15000,
  })
  const card = page.locator('.collection-card').nth(8)
  await card.scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    new MutationObserver((records, observer) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (
            !(node instanceof Element) ||
            !node.matches('.collection-card--expanding')
          )
            continue
          Object.assign(window, {
            merchCoverTransition: {
              tag: node.tagName,
              children: node.childElementCount,
              source: node.getAttribute('src'),
            },
          })
          observer.disconnect()
        }
      }
    }).observe(document.body, { childList: true })
  })
  await card.click()
  await expect(page.locator('.merch-detail-page')).toBeVisible()
  // 浏览器可能在实际点击前微调卡片位置，按导航瞬间记录的位置校验返回。
  const scrollTop = await page.evaluate(() =>
    Number(sessionStorage.getItem('anutrium:merch:scroll-top'))
  )
  expect(scrollTop).toBeGreaterThan(0)
  const transition = await page.evaluate(
    () =>
      (
        window as typeof window & {
          merchCoverTransition: {
            tag: string
            children: number
            source: string
          }
        }
      ).merchCoverTransition
  )
  expect(transition.tag).toBe('IMG')
  expect(transition.children).toBe(0)
  expect(transition.source).toMatch(/[?&]image=card-thumb/)
  await expect(page.locator('.collection-card--expanding')).toHaveCount(0)
  await page.goBack()
  await expect(page.locator('.merch-page')).toHaveClass(
    /has-returned-from-detail/
  )
  await expect(page.locator('.merch-page')).not.toHaveClass(
    /is-returning-from-detail/
  )
  await expect
    .poll(async () =>
      Math.abs((await page.evaluate(() => document.body.scrollTop)) - scrollTop)
    )
    .toBeLessThanOrEqual(1)
})

test('fullscreen page keeps its geometry while leaving for merch', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/archive?isExpand=true', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 30000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 15000,
  })
  await page.evaluate(() => {
    const root = document.querySelector('.temple-page')!
    const container = document.querySelector('.router-container')!
    const read = () =>
      [root, container].flatMap((element) => {
        const bounds = element.getBoundingClientRect()
        return [bounds.top, bounds.left]
      })
    const probe = { initial: read(), samples: [] as number[][], done: false }
    Object.assign(window, { merchLeaveGeometry: probe })
    const sample = () => {
      if (!root.isConnected) {
        probe.done = true
        return
      }
      probe.samples.push(read())
      requestAnimationFrame(sample)
    }
    sample()
    const app = document.querySelector('#app') as HTMLElement & {
      __vue_app__: {
        config: {
          globalProperties: {
            $router: { push: (path: string) => Promise<unknown> }
          }
        }
      }
    }
    void app.__vue_app__.config.globalProperties.$router.push(
      '/island/merch'
    )
  })
  await expect(page.locator('.merch-page')).toBeVisible({ timeout: 30000 })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as typeof window & { merchLeaveGeometry: { done: boolean } })
            .merchLeaveGeometry.done
      )
    )
    .toBe(true)
  const geometry = await page.evaluate(
    () =>
      (
        window as typeof window & {
          merchLeaveGeometry: { initial: number[]; samples: number[][] }
        }
      ).merchLeaveGeometry
  )
  expect(geometry.samples.length).toBeGreaterThan(1)
  for (const sample of geometry.samples)
    sample.forEach((value, index) =>
      expect(Math.abs(value - geometry.initial[index])).toBeLessThanOrEqual(1)
    )
})
