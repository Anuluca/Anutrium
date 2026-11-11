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

test('book pulls out of the shelf and unfolds horizontally before revealing its article', async ({
  page,
}, info) => {
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
    const shell = modal.locator('.book-opening-shell')
    await expect(shell).toBeVisible()
    await expect(shell).toHaveAttribute('data-phase', 'unfolding')
    const simultaneous = await modal.evaluate((element) => {
      const moving = element
        .querySelector('.book-opening-shell')!
        .getAnimations()[0]
      const folding = element
        .querySelector('.book-opening-hinge')!
        .getAnimations()[0]
      return {
        delta: Math.abs(Number(moving.startTime) - Number(folding.startTime)),
        moving: moving.playState,
        folding: folding.playState,
      }
    })
    expect(simultaneous.delta).toBeLessThanOrEqual(1)
    expect(simultaneous.moving).toBe('running')
    expect(simultaneous.folding).toBe('running')
    const fold = await modal
      .locator('.book-opening-hinge')
      .evaluate((element) =>
        (element.getAnimations()[0].effect as KeyframeEffect).getKeyframes()
      )
    expect(fold[0].transform).toBe('rotateY(0deg)')
    expect(fold[1].transform).toBe('rotateY(-180deg)')
    const seams = await shell.evaluate((element) => [
      getComputedStyle(element.querySelector('.book-opening-paper')!)
        .borderLeftWidth,
      getComputedStyle(element.querySelector('.book-opening-front')!)
        .borderLeftWidth,
      getComputedStyle(element.querySelector('.book-opening-back')!)
        .borderRightWidth,
    ])
    expect(seams).toEqual(['0px', '0px', '0px'])
    await shell.evaluate((element) => {
      for (const node of [
        element,
        ...element.querySelectorAll(
          '.book-opening-hinge, .book-opening-spine, .book-opening-spread'
        ),
      ]) {
        for (const animation of node.getAnimations()) {
          animation.pause()
          animation.currentTime = 420
        }
      }
    })
    await page.screenshot({
      path: `test-results/babel-book-fold-${info.project.name}.png`,
    })
    await shell.evaluate((element) => {
      for (const node of [
        element,
        ...element.querySelectorAll(
          '.book-opening-hinge, .book-opening-spine, .book-opening-spread'
        ),
      ]) {
        for (const animation of node.getAnimations()) animation.play()
      }
    })
    await expect(shell).toHaveAttribute('data-phase', 'ready')
    await expect(modal.locator('.babel-reader')).toHaveCount(0)
    const delta = await modal.evaluate((element) => {
      const shell = element
        .querySelector('.book-opening-shell')!
        .getBoundingClientRect()
      const target = element
        .querySelector('.library-reader-region')!
        .getBoundingClientRect()
      return Math.max(
        Math.abs(shell.left - target.left),
        Math.abs(shell.top - target.top),
        Math.abs(shell.width - target.width),
        Math.abs(shell.height - target.height)
      )
    })
    expect(delta).toBeLessThanOrEqual(1)
    release()
    await expect(modal.locator('.babel-reader')).toBeVisible()
    await expect(shell).toHaveCount(0)
    await expect(
      modal.locator('.babel-reader .manuscript-highlights')
    ).toHaveText(babelBooks[0].content)
    await expect(modal.locator('.babel-reader')).toHaveCSS('opacity', '1')
    await page.screenshot({
      path: `test-results/babel-reader-${info.project.name}.png`,
    })
    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden()
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
    const readerStyle = getComputedStyle(reader)
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
    return {
      closeLeft: Math.abs(
        closeRect.left - bounds.left - parseFloat(readerStyle.paddingLeft)
      ),
      closeBottom: Math.abs(
        closeRect.bottom - bounds.bottom + parseFloat(readerStyle.paddingBottom)
      ),
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
  expect(layout.closeLeft).toBeLessThanOrEqual(1)
  expect(layout.closeBottom).toBeLessThanOrEqual(1)
  expect(layout.closeWidth).toBe(64)
  expect(layout.ownClose).toBe(true)
  expect(layout.fontSize).toBeGreaterThanOrEqual(24)
  expect(layout.timeSize).toBeGreaterThanOrEqual(20)
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

test('article clicks reverse the opening animation while action buttons keep the reader open', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await mockBabelLibrary(page)
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async () => {} },
    })
  })
  await openMonkeyTypewriter(page)
  await page.locator('.babel-entrance').click()
  const modal = page.locator('.babel-library-dialog')
  for (const selector of [
    '.babel-reader-heading',
    '.manuscript-highlights',
    '.reader-close',
  ]) {
    await modal.locator('.library-book').first().click()
    const reader = modal.locator('.babel-reader')
    await expect(reader).toHaveCSS('opacity', '1')
    await expect(modal.locator('.book-opening-shell')).toHaveCount(0)
    await reader.getByRole('button', { name: '复制全文' }).click()
    await page.waitForTimeout(300)
    await expect(reader).toBeVisible()
    await expect(modal.locator('.book-opening-shell')).toHaveCount(0)
    await reader.locator(selector).click()
    const shell = modal.locator('.book-opening-shell')
    await expect(shell).toHaveAttribute('data-phase', 'closing')
    await expect
      .poll(() =>
        modal
          .locator('.book-opening-hinge')
          .evaluate((element) => element.getAnimations()[0].playbackRate)
      )
      .toBe(-1)
    await expect(reader).toBeAttached()
    await expect(reader).toHaveCount(0)
    await expect(shell).toHaveCount(0)
    await expect(modal.locator('.library-book').first()).toBeVisible()
    await expect(modal.locator('.library-book').first()).toBeFocused()
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

test('closing keeps opaque pages aligned without stretched faces or duplicate cover text', async ({
  page,
}, info) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await mockBabelLibrary(page)
  await openMonkeyTypewriter(page)
  await page.locator('.babel-entrance').click()
  const modal = page.locator('.babel-library-dialog')
  // Use another column to catch an incorrect return-to-spine offset.
  const book = modal.locator('.library-book').nth(2)
  await book.click()
  await expect(modal.locator('.book-opening-shell')).toHaveCount(0)
  const envelope = await modal.evaluate((element) => {
    const a = element
      .querySelector('.library-book.is-selected')!
      .getBoundingClientRect()
    const b = element
      .querySelector('.library-reader-region')!
      .getBoundingClientRect()
    return {
      left: Math.min(a.left, b.left),
      top: Math.min(a.top, b.top),
      right: Math.max(a.right, b.right),
      bottom: Math.max(a.bottom, b.bottom),
    }
  })
  await modal.locator('.babel-reader-heading').click()
  const shell = modal.locator('.book-opening-shell')
  await expect(shell).toHaveAttribute('data-phase', 'closing')
  const handoff = await modal.evaluate((element) => ({
    opacity: getComputedStyle(element.querySelector('.book-opening-shell')!)
      .opacity,
    pageLayer: Number(
      getComputedStyle(element.querySelector('.library-reader-region')!).zIndex
    ),
    bookLayer: Number(
      getComputedStyle(element.querySelector('.book-opening-shell')!).zIndex
    ),
  }))
  expect(handoff.opacity).toBe('1')
  expect(handoff.pageLayer).toBeGreaterThan(handoff.bookLayer)
  await expect
    .poll(() =>
      shell.evaluate((element) => element.getAnimations()[0].playbackRate)
    )
    .toBe(-1)
  const returningBook = await book.evaluate((element) => {
    const animation = element.getAnimations()[0]
    animation.pause()
    const samples = [410, 820 / 3, 820 / 6, 0].map((time) => {
      animation.currentTime = time
      return {
        opacity: Number(getComputedStyle(element).opacity),
        visibility: getComputedStyle(element).visibility,
      }
    })
    animation.currentTime = 820
    return samples
  })
  for (const [index, opacity] of [0, 0, 0.5, 1].entries())
    expect(returningBook[index].opacity).toBeCloseTo(opacity, 4)
  expect(returningBook.every((sample) => sample.visibility === 'visible')).toBe(
    true
  )
  for (const time of [819, 615, 410, 205, 1]) {
    const faces = await shell.evaluate((element, time) => {
      for (const node of [
        element,
        ...element.querySelectorAll(
          '.book-opening-hinge,.book-opening-spine,.book-opening-spread'
        ),
      ]) {
        const animation = node.getAnimations()[0]
        animation.pause()
        animation.currentTime = time
      }
      return Array.from(
        element.querySelectorAll(
          '.book-opening-front,.book-opening-back,.book-opening-paper'
        )
      ).map((face) => {
        const r = face.getBoundingClientRect()
        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom }
      })
    }, time)
    for (const face of faces) {
      expect(face.left).toBeGreaterThanOrEqual(envelope.left - 1)
      expect(face.top).toBeGreaterThanOrEqual(envelope.top - 1)
      expect(face.right).toBeLessThanOrEqual(envelope.right + 1)
      expect(face.bottom).toBeLessThanOrEqual(envelope.bottom + 1)
    }
    await expect(shell.locator('.book-opening-front')).toHaveText('')
    if (time === 410)
      await page.screenshot({
        path: `test-results/babel-closing-fixed-${info.project.name}.png`,
      })
  }
  const delta = await shell.evaluate((element) => {
    const a = element
      .querySelector('.book-opening-spine')!
      .getBoundingClientRect()
    const b = document
      .querySelector('.library-book.is-selected')!
      .getBoundingClientRect()
    return Math.max(
      Math.abs(a.left - b.left),
      Math.abs(a.top - b.top),
      Math.abs(a.width - b.width),
      Math.abs(a.height - b.height)
    )
  })
  expect(delta).toBeLessThanOrEqual(1)
  await shell.evaluate((element) => {
    for (const node of [
      element,
      ...element.querySelectorAll(
        '.book-opening-hinge,.book-opening-spine,.book-opening-spread'
      ),
    ])
      node.getAnimations()[0].play()
  })
  await book.evaluate((element) => element.getAnimations()[0].finish())
  await expect(modal.locator('.babel-reader')).toHaveCount(0)
  await expect(shell).toHaveCount(0)
  await expect(book).toBeFocused()
})
