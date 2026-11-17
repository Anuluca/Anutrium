import { expect, test } from '@playwright/test'

import {
  babelBooks,
  mockBabelLibrary,
  openMonkeyTypewriter,
} from './helpers/babelLibrary'

test('library modal adapts artwork and vertical books to the viewport and opens saved articles', async ({
  page,
}, info) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const calls = await mockBabelLibrary(page)
  await openMonkeyTypewriter(page)
  await page.locator('.babel-entrance').click()
  const modal = page.locator('.babel-library-dialog')
  await expect(modal).toBeVisible()
  await expect(modal.locator('.library-book')).toHaveCount(babelBooks.length)
  await expect(modal.locator('.library-refresh')).toHaveText('')
  await expect(modal.locator('.library-refresh svg')).toHaveCount(1)
  await expect(
    modal.locator('h1,h2,p,.library-footnote,.archive-copy')
  ).toHaveCount(0)
  const layout = await modal.evaluate((element) => {
    const rect = (selector: string) =>
      element.querySelector(selector)!.getBoundingClientRect()
    const style = (selector: string) =>
      getComputedStyle(element.querySelector(selector)!)
    const art = rect('.library-art')
    const catalogue = rect('.library-catalogue')
    const first = rect('.library-book')
    const number = rect('.book-number')
    const title = rect('.book-title')
    const year = rect('.book-date > :first-child')
    const day = rect('.book-date > :last-child')
    const matrix = new DOMMatrix(style('.book-title').transform)
    const close = rect('.diamond-close-btn')
    const dialog = element.getBoundingClientRect()
    return {
      mobile: matchMedia('(max-width: 768px)').matches,
      leftRight: art.right <= catalogue.left,
      stacked: art.bottom <= catalogue.top,
      artWidth: art.width,
      twoRowsVisible: (() => {
        const viewport = rect('.library-scroll')
        const items = Array.from(element.querySelectorAll('.library-book')).map(
          (book) => book.getBoundingClientRect()
        )
        const rows = [...new Set(items.map((book) => Math.round(book.top)))]
        const second = rows[1]
        return (
          second !== undefined &&
          items.find((book) => Math.round(book.top) === second)!.bottom <=
            viewport.bottom + 1
        )
      })(),
      stageWidth: rect('.babel-library').width,
      imageWidth: rect('.library-art .babel-photo').width,
      imageTop: rect('.library-art .babel-photo').top,
      artTop: art.top,
      artMask: style('.library-art').maskImage,
      artPadding: parseFloat(style('.library-art').paddingTop),
      imageLeft: rect('.library-art .babel-photo').left,
      artLeft: art.left,
      noOverflow:
        element.querySelector('.babel-library')!.scrollWidth <=
        element.querySelector('.babel-library')!.clientWidth + 1,
      vertical: first.height > first.width,
      bookHeight: first.height,
      artworkHeight: art.height,
      stageHeight: rect('.babel-library').height,
      imageHeight: rect('.library-art .babel-photo > img').height,
      imageFit: style('.library-art .babel-photo > img').objectFit,
      ordered:
        number.bottom <= title.top &&
        title.bottom <= year.top &&
        year.bottom <= day.top,
      weights: ['.book-number', '.book-title', '.book-date'].map(
        (selector) => style(selector).fontWeight
      ),
      families: ['.book-number', '.book-title', '.book-date'].map(
        (selector) => style(selector).fontFamily
      ),
      rotated: Math.abs(matrix.a) < 0.01 && Math.abs(matrix.b - 1) < 0.01,
      closeBelow: close.top >= dialog.bottom,
      closeCentered: Math.abs(
        close.left + close.width / 2 - dialog.left - dialog.width / 2
      ),
    }
  })
  if (layout.mobile) {
    expect(layout.stacked).toBe(true)
    expect(layout.artWidth).toBeLessThanOrEqual(340)
    expect(
      Math.abs(layout.imageHeight / 2 - layout.artworkHeight)
    ).toBeLessThanOrEqual(1)
    expect(Math.abs(layout.imageTop - layout.artTop)).toBeLessThanOrEqual(1)
    expect(layout.artMask).toContain('linear-gradient')
    expect(layout.artMask).toContain('rgba(0, 0, 0, 0)')
  } else {
    expect(layout.leftRight).toBe(true)
    expect(layout.artWidth / layout.stageWidth).toBeLessThanOrEqual(0.37)
    expect(layout.imageWidth).toBeGreaterThan(280)
    expect(
      Math.abs(layout.imageHeight + 2 * layout.artPadding - layout.stageHeight)
    ).toBeLessThanOrEqual(1)
    expect(layout.artPadding).toBeGreaterThanOrEqual(24)
    expect(layout.imageLeft - layout.artLeft).toBeGreaterThanOrEqual(24)
    expect(layout.artMask).toContain('to right')
  }
  expect(layout.noOverflow).toBe(true)
  expect(layout.vertical).toBe(true)
  if (layout.mobile) expect(layout.twoRowsVisible).toBe(true)
  else expect(layout.bookHeight).toBe(572)
  expect(layout.imageFit).toBe('contain')
  expect(layout.ordered).toBe(true)
  expect(layout.weights).toEqual(['400', '400', '400'])
  expect(layout.families[0]).toContain('UnboundedSans')
  expect(layout.families[1]).toContain('Anton')
  expect(layout.families[2]).toContain('Anton')
  expect(layout.rotated).toBe(true)
  expect(layout.closeBelow).toBe(true)
  expect(layout.closeCentered).toBeLessThanOrEqual(1)
  await expect(modal.locator('.book-date').first()).toHaveText('202611.10')
  await page.screenshot({
    path: `test-results/babel-library-${info.project.name}.png`,
  })
  await modal.getByRole('button', { name: '刷新书架' }).click()
  await expect.poll(() => calls.list).toBe(2)
  await modal.locator('.library-book').first().click()
  await expect(modal).toBeVisible()
  await expect(
    modal.locator('.babel-reader .manuscript-highlights')
  ).toHaveText(babelBooks[0].content)
  await expect(modal.getByRole('button', { name: '复制全文' })).toBeVisible()
  await expect(modal.getByRole('button', { name: '下载 .txt' })).toBeVisible()
  await expect(
    modal.getByRole('button', { name: '分享', exact: true })
  ).toBeVisible()
  const size = await modal.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const rootSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize
    )
    return {
      width: rect.width,
      height: rect.height,
      top: rect.top,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      rootSize,
    }
  })
  if (size.viewportWidth <= 768) {
    expect(size.width).toBeCloseTo(size.viewportWidth - 16, 0)
    expect(size.height).toBeCloseTo(size.viewportHeight - 156, 0)
    expect(size.top).toBeCloseTo(44, 0)
  } else {
    expect(size.width).toBeCloseTo(
      Math.min(
        size.viewportWidth - 160,
        ((size.viewportHeight - Math.max(80, size.rootSize * 3)) * 16) / 9
      ),
      0
    )
    expect(size.width / size.height).toBeCloseTo(16 / 9, 2)
  }
  await modal.getByRole('button', { name: '返回书架' }).click()
  await expect(modal.locator('.library-book').first()).toBeVisible()
  await expect(modal.locator('.babel-reader')).toHaveCount(0)
})

test('shelf and refresh enter first, then books fall in row order', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await mockBabelLibrary(page)
  await openMonkeyTypewriter(page)
  await page.locator('.babel-entrance').click()
  const modal = page.locator('.babel-library-dialog')
  await expect(modal).toBeVisible()
  await expect(modal.locator('.library-book')).toHaveCount(0)
  const intro = await modal.locator('.library-art').evaluate((element) => {
    const animation = element.getAnimations()[0]
    const timing = animation.effect!.getTiming()
    const frames = (animation.effect as KeyframeEffect).getKeyframes()
    return { duration: timing.duration, delay: timing.delay, from: frames[0] }
  })
  expect(intro.duration).toBe(500)
  expect(intro.delay).toBe(460)
  expect(intro.from.opacity).toBe('0')
  expect(intro.from.transform).toMatch(/translateY\(-/)
  await expect(modal.locator('.library-book')).toHaveCount(babelBooks.length)
  const delays = await modal
    .locator('.library-book-entry')
    .evaluateAll((elements) =>
      elements.map((element) =>
        parseFloat(getComputedStyle(element).animationDelay)
      )
    )
  for (let index = 1; index < delays.length; index++)
    expect(delays[index]).toBeGreaterThan(delays[index - 1])
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
})

test('the same book card expands to fill the reader without stretching metadata, then reveals the body', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await mockBabelLibrary(page)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(`**/monkey-articles/${babelBooks[0].id}`, async (route) => {
    await gate
    await route.fulfill({ json: babelBooks[0] })
  })
  await openMonkeyTypewriter(page)
  await page.locator('.babel-entrance').click()
  const modal = page.locator('.babel-library-dialog')
  const source = modal.locator('.library-book').first()
  await expect(source).toBeVisible()
  await page.waitForTimeout(1400)
  await source.click()
  const origin = await source.evaluate((el) => {
    const rect = el.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width }
  })
  const card = modal.locator('.book-opening-shell')
  try {
    await expect(card).toHaveAttribute('data-phase', 'unfolding')
    const samples = await card.evaluate((element) => {
      const title = element.querySelector<HTMLElement>('.book-title')!
      const animations = [
        ...element.getAnimations(),
        ...title.getAnimations(),
        ...element.querySelector('.book-date')!.getAnimations(),
      ]
      for (const animation of animations) animation.pause()
      const samples = [0, 410, 820].map((time) => {
        animations.forEach((animation) => {
          animation.currentTime = time
        })
        const rect = element.getBoundingClientRect()
        const number = element
          .querySelector('.book-number')!
          .getBoundingClientRect()
        const date = element
          .querySelector('.book-date')!
          .getBoundingClientRect()
        return {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          numberX: number.left - rect.left,
          numberY: number.top - rect.top,
          numberWidth: number.width,
          numberHeight: number.height,
          dateX: date.left - rect.left,
          dateBottom: rect.bottom - date.bottom,
          dateWidth: date.width,
          titleMatrix: getComputedStyle(title).transform,
          titleSize: parseFloat(getComputedStyle(title).fontSize),
        }
      })
      animations.forEach((animation) => animation.finish())
      return samples
    })
    expect(samples[0].left).toBeCloseTo(origin!.x, 0)
    expect(samples[0].top).toBeCloseTo(origin!.y, 0)
    expect(samples[0].width).toBeCloseTo(origin!.width, 0)
    expect(samples[1].width).toBeGreaterThan(samples[0].width)
    expect(samples[1].width).toBeLessThan(samples[2].width)
    for (const sample of samples)
      for (const key of [
        'numberX',
        'numberY',
        'numberWidth',
        'numberHeight',
        'dateX',
        'dateWidth',
      ] as const)
        expect(sample[key]).toBeCloseTo(samples[0][key], 0)
    const stage = await modal.locator('.babel-library').boundingBox()
    expect(samples[2].width).toBeCloseTo(stage!.width, 0)
    expect(samples[2].height).toBeCloseTo(stage!.height, 0)
    expect(samples[1].titleMatrix).toMatch(/^matrix\(1, 0, 0, 1,/)
    expect(samples[2].titleMatrix).toMatch(/^matrix\(1, 0, 0, 1,/)
    expect(samples[2].titleSize).toBeCloseTo(samples[0].titleSize * 1.6, 1)
    expect(samples[2].dateBottom - samples[0].dateBottom).toBeCloseTo(56, 0)
    await expect(card).toHaveAttribute('data-phase', 'ready')
    await expect(modal.locator('.manuscript-highlights')).toHaveCount(0)
    release()
    const body = modal.locator('.babel-reader .manuscript-highlights')
    await expect(body).toHaveText(babelBooks[0].content)
    await expect(body.locator('.reader-paragraph').first()).toHaveCSS(
      'opacity',
      '1'
    )
    await expect(card).toHaveCount(1)
    expect(
      await card
        .locator('.book-title')
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1)
    ).toBe(true)
    await page.screenshot({
      path: `test-results/babel-expanded-${info.project.name}.png`,
    })
  } finally {
    release()
  }
})

test('reader copies, downloads and shares the selected article', async ({
  page,
  context,
}) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockBabelLibrary(page)
  await openMonkeyTypewriter(page)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.locator('.babel-entrance').click()
  const modal = page.locator('.babel-library-dialog')
  await modal.locator('.library-book').first().click()
  const reader = modal.locator('.babel-reader')
  await expect(reader).toBeVisible()
  await reader.getByRole('button', { name: '复制全文' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    `${babelBooks[0].title}\n\n${babelBooks[0].content}`
  )
  const text = page.waitForEvent('download')
  await reader.getByRole('button', { name: '下载 .txt' }).click()
  expect((await text).suggestedFilename()).toBe(
    `monkey-${babelBooks[0].id}.txt`
  )
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: () => true,
    })
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: ShareData) => {
        ;(window as any).babelShared = {
          title: data.title,
          files: data.files?.map((file) => ({
            name: file.name,
            size: file.size,
          })),
        }
      },
    })
  })
  const share = reader.getByRole('button', { name: '分享', exact: true })
  await expect(share).toHaveAttribute('aria-busy', 'false', { timeout: 30000 })
  await share.click()
  await expect
    .poll(() => page.evaluate(() => (window as any).babelShared?.title))
    .toBe(babelBooks[0].title)
  const shared = await page.evaluate(() => (window as any).babelShared)
  expect(shared.files[0].name).toBe('monkey-manuscript.png')
  expect(shared.files[0].size).toBeGreaterThan(1000)
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: () => false,
    })
  )
  const image = page.waitForEvent('download')
  await share.click()
  expect((await image).suggestedFilename()).toBe('monkey-manuscript.png')
  await expect(modal).toBeVisible()
})

test('reader actions stay at the bottom right and share the outer button styling and two-flash interaction', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await mockBabelLibrary(page)
  await openMonkeyTypewriter(page)
  await page.locator('.babel-entrance').click()
  const modal = page.locator('.babel-library-dialog')
  await modal.locator('.library-book').first().click()
  const reader = modal.locator('.babel-reader')
  await expect(reader).toHaveCSS('opacity', '1')
  const layout = await page.evaluate(() => {
    const reader = document.querySelector<HTMLElement>('.babel-reader')!
    const share = reader.querySelector<HTMLElement>('.share-button')!
    const bounds = reader.getBoundingClientRect()
    const button = share.getBoundingClientRect()
    const readerStyle = getComputedStyle(
      reader.querySelector('.babel-reader-content')!
    )
    const properties = [
      'color',
      'backgroundColor',
      'borderColor',
      'borderWidth',
      'fontFamily',
      'fontWeight',
      'boxShadow',
      'backdropFilter',
    ]
    const outer = getComputedStyle(
      document.querySelector('.draft-actions-left > button')!
    )
    const inner = getComputedStyle(
      reader.querySelector('[aria-label="复制全文"]')!
    )
    const close = reader.querySelector<HTMLElement>('.reader-close')!
    const closeRect = close.getBoundingClientRect()
    const date = reader.querySelector('time')!.getBoundingClientRect()
    return {
      closeCenter: Math.abs(
        closeRect.left + closeRect.width / 2 - date.left - date.width / 2
      ),
      closeGap: closeRect.top - date.bottom,
      closeWidth: closeRect.width,
      ownClose: close.classList.contains('diamond-close-btn'),
      fontSize: parseFloat(inner.fontSize),
      tracking: parseFloat(inner.letterSpacing) / parseFloat(inner.fontSize),
      timeSize: parseFloat(
        getComputedStyle(reader.querySelector('time')!).fontSize
      ),
      right: Math.abs(
        button.right - bounds.right + parseFloat(readerStyle.paddingRight)
      ),
      bottom: Math.abs(
        button.bottom - bounds.bottom + parseFloat(readerStyle.paddingBottom)
      ),
      overflow: reader.scrollWidth - reader.clientWidth,
      outer: properties.map((key) => (outer as any)[key]),
      inner: properties.map((key) => (inner as any)[key]),
    }
  })
  expect(layout.right).toBeLessThanOrEqual(1)
  expect(layout.bottom).toBeLessThanOrEqual(1)
  expect(layout.overflow).toBeLessThanOrEqual(1)
  expect(layout.inner).toEqual(layout.outer)
  expect(layout.closeCenter).toBeLessThanOrEqual(1)
  expect(layout.closeGap).toBeGreaterThanOrEqual(10)
  expect(layout.closeWidth).toBe(44)
  expect(layout.ownClose).toBe(true)
  expect(layout.fontSize).toBeGreaterThanOrEqual(24)
  expect(layout.timeSize).toBeGreaterThanOrEqual(13)
  expect(layout.tracking).toBeCloseTo(-0.05)
  await expect(modal.locator('.modal-close-row')).toBeHidden()
  await page.evaluate(() => {
    ;(window as any).babelCopies = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          ;(window as any).babelCopies.push({ text, time: performance.now() })
        },
      },
    })
  })
  const flash = await reader
    .getByRole('button', { name: '复制全文' })
    .evaluate((button: HTMLButtonElement) => {
      ;(window as any).babelCopyStarted = performance.now()
      button.click()
      button.click()
      const animation = button.getAnimations()[0]
      return {
        before: (window as any).babelCopies.length,
        duration: animation.effect!.getTiming().duration,
        colors: (animation.effect as KeyframeEffect)
          .getKeyframes()
          .map((frame) => frame.backgroundColor),
      }
    })
  expect(flash.before).toBe(0)
  expect(flash.duration).toBe(240)
  expect(
    flash.colors.filter((color) => color === 'rgb(29, 203, 169)')
  ).toHaveLength(2)
  await expect
    .poll(() => page.evaluate(() => (window as any).babelCopies.length))
    .toBe(1)
  expect(
    await page.evaluate(
      () =>
        (window as any).babelCopies[0].time - (window as any).babelCopyStarted
    )
  ).toBeGreaterThanOrEqual(220)
  await reader.getByRole('button', { name: '返回书架' }).click()
  await expect(reader).toHaveCount(0)
  await modal.locator('.modal-close-row .diamond-close-btn').click()
})

test('opening adapts to resize and cancels without leaving a hidden book', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await mockBabelLibrary(page)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(
    `https://steam-api.anuluca.com/monkey-articles/${babelBooks[0].id}`,
    async (route) => {
      await gate
      await route.fulfill({ json: babelBooks[0] })
    }
  )
  await openMonkeyTypewriter(page)
  await page.locator('.babel-entrance').click()
  const modal = page.locator('.babel-library-dialog')
  await modal.locator('.library-book').first().click()
  try {
    await expect(modal.locator('.book-opening-shell')).toHaveAttribute(
      'data-phase',
      'unfolding'
    )
    const viewport = page.viewportSize()!
    await page.setViewportSize({ ...viewport, height: viewport.height - 60 })
    await expect(modal.locator('.book-opening-shell')).toHaveAttribute(
      'data-phase',
      'ready'
    )
    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden()
    await expect(page.locator('.book-opening-shell')).toHaveCount(0)
    const response = page.waitForResponse(
      `https://steam-api.anuluca.com/monkey-articles/${babelBooks[0].id}`
    )
    release()
    await response
    await page.locator('.babel-entrance').click()
    await expect(modal.locator('.library-refresh')).toBeEnabled()
    await expect(modal.locator('.library-book').first()).toBeVisible()
    await modal.locator('.library-book').first().click()
    await expect(modal.locator('.babel-reader')).toBeVisible()
    await expect(
      modal.locator('.babel-reader .manuscript-highlights')
    ).toHaveText(babelBooks[0].content)
  } finally {
    release()
  }
})

test('mobile shelves fit two complete rows on compact and tall screens', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'mobile-chrome')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await mockBabelLibrary(page)
  await openMonkeyTypewriter(page)
  await page.locator('.babel-entrance').click()
  for (const size of [
    { width: 320, height: 568 },
    { width: 430, height: 932 },
  ]) {
    await page.setViewportSize(size)
    await expect
      .poll(() =>
        page.locator('.library-scroll').evaluate((element) => {
          const viewport = element.getBoundingClientRect()
          const books = Array.from(
            element.querySelectorAll('.library-book')
          ).map((book) => book.getBoundingClientRect())
          const rows = [...new Set(books.map((book) => Math.round(book.top)))]
          const second = books.find((book) => Math.round(book.top) === rows[1])
          return (
            !!second &&
            second.bottom <= viewport.bottom + 1 &&
            element.scrollWidth <= element.clientWidth + 1
          )
        })
      )
      .toBe(true)
  }
})

test('closing reverses the same card and cannot flash an enlarged book after returning', async ({
  page,
}, info) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await mockBabelLibrary(page)
  await page.route(`**/monkey-articles/${babelBooks[2].id}`, (route) =>
    route.fulfill({
      json: { ...babelBooks[2], content: 'A saved paragraph.\n\n'.repeat(40) },
    })
  )
  await openMonkeyTypewriter(page)
  await page.locator('.babel-entrance').click()
  const modal = page.locator('.babel-library-dialog')
  const book = modal.locator('.library-book').nth(2)
  await page.waitForTimeout(1400)
  const initial = await book.boundingBox()
  for (let repeat = 0; repeat < 3; repeat++) {
    await book.click()
    const card = modal.locator('.book-opening-shell')
    await expect(card).toHaveAttribute('data-phase', 'ready')
    await expect(
      modal.locator('.babel-reader .reader-paragraph').first()
    ).toHaveCSS('opacity', '1')
    await card.evaluate((el) => {
      ;(window as any).bookCardNode = el
      ;(window as any).bookCardAnimation = el.getAnimations()[0]
    })
    await modal.getByRole('button', { name: '复制全文', exact: true }).click()
    await expect(card).toHaveAttribute('data-phase', 'ready')
    if (repeat === 1) {
      await modal.locator('.babel-reader .manuscript').evaluate((el) => {
        el.scrollTop = el.scrollHeight / 2
      })
    }
    await modal.locator('.reader-close').click()
    await expect(card).toHaveAttribute('data-phase', 'closing')
    const frames = await card.evaluate((el) => {
      const animation = el.getAnimations()[0]
      const identical =
        el === (window as any).bookCardNode &&
        animation === (window as any).bookCardAnimation
      animation.pause()
      const widths = [820, 615, 410, 205, 1].map((time) => {
        animation.currentTime = time
        return el.getBoundingClientRect().width
      })
      for (const other of el.querySelector('.book-title')!.getAnimations())
        other.finish()
      animation.finish()
      return { identical, rate: animation.playbackRate, widths }
    })
    expect(frames.identical).toBe(true)
    expect(frames.rate).toBe(-1)
    expect(frames.widths).toEqual([...frames.widths].sort((a, b) => b - a))
    await expect(modal.locator('.babel-reader')).toHaveCount(0)
    await expect(card).toHaveCount(0)
    await expect(book).toBeFocused()
    const returned = await book.evaluate(async (el) => {
      const frames = []
      for (let index = 0; index < 12; index++) {
        await new Promise(requestAnimationFrame)
        const r = el.getBoundingClientRect()
        frames.push({
          width: r.width,
          height: r.height,
          visible: getComputedStyle(el).visibility,
        })
      }
      return frames
    })
    for (const frame of returned) {
      expect(frame.width).toBeCloseTo(initial!.width, 0)
      expect(frame.height).toBeCloseTo(initial!.height, 0)
      expect(frame.visible).toBe('visible')
    }
  }
  await page.screenshot({
    path: `test-results/babel-returned-${info.project.name}.png`,
  })
})
