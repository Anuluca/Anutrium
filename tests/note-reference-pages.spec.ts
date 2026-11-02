import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(
  readFileSync('tests/fixtures/notes/book-reference/manifest.json', 'utf8')
)
const notes = manifest.notes.map((note) => ({
  ...note,
  time: '2026-11-01',
  type: 'test',
  path: `/atrium/notes?note=${note.id}`,
}))

test.beforeEach(async ({ page }) => {
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('https://steam-api.anuluca.com/notes**', (route) => {
    const id = new URL(route.request().url()).pathname.split('/')[2]
    if (!id) return route.fulfill({ json: { notes, nextCursor: null } })
    const note = notes.find((item) => item.id === id)
    return note
      ? route.fulfill({
          contentType: 'text/markdown',
          body: readFileSync(
            `tests/fixtures/notes/book-reference/published/${note.file}`,
            'utf8'
          ),
        })
      : route.fulfill({ status: 404 })
  })
})

test('remaining reference notes and every extended block fit the real modal', async ({
  page,
}, testInfo) => {
  // 使用短屏手机，确保这组语料确实溢出，从而验证固定分页器。
  if (testInfo.project.name.includes('mobile'))
    await page.setViewportSize({ width: 393, height: 650 })
  await page.goto('/atrium/notes', { waitUntil: 'domcontentloaded' })
  await page
    .locator('.study-note-filters button')
    .filter({ hasText: 'TEST' })
    .click()
  await expect(page.locator('.study-note-card')).toHaveCount(12, {
    timeout: 45000,
  })
  await expect(page.locator('.study-note-stack')).toHaveClass(/is-ready/)
  if (testInfo.project.name.includes('mobile')) {
    const cards = await page
      .locator('.study-note-card')
      .evaluateAll((elements) =>
        elements.slice(0, 3).map((element) => {
          const bounds = element.getBoundingClientRect()
          return { top: bounds.top, left: bounds.left }
        })
      )
    expect(Math.abs(cards[0].top - cards[1].top)).toBeLessThanOrEqual(1)
    expect(cards[1].left).toBeGreaterThan(cards[0].left)
    expect(Math.abs(cards[2].left - cards[0].left)).toBeLessThanOrEqual(1)
    expect(cards[2].top).toBeGreaterThan(cards[0].top)
  }
  const listScroll = page.locator('.study-note-list > .scroll-viewport__scroll')
  const fixedControls = async () =>
    page.locator('.island-notes-content').evaluate((element) => {
      const header = element
        .querySelector('.filter-rail')!
        .getBoundingClientRect()
      const panel = element.getBoundingClientRect()
      return {
        header: header.top,
        panelBottom: panel.bottom,
      }
    })
  const progressGeometry = () =>
    page.locator('.study-note-list').evaluate((element) => {
      const scroll = element
        .querySelector('.scroll-viewport__scroll')!
        .getBoundingClientRect()
      const progress = element
        .querySelector(':scope > .page-scroll-progress')!
        .getBoundingClientRect()
      const toolbar = element
        .querySelector('.study-note-toolbar')!
        .getBoundingClientRect()
      const right = Math.max(
        ...Array.from(element.querySelectorAll('.study-note-card')).map(
          (card) => card.getBoundingClientRect().right
        )
      )
      return {
        top: Math.abs(progress.top - scroll.top),
        bottom: Math.abs(progress.bottom - scroll.bottom),
        toolbarGap: progress.top - toolbar.bottom,
        contentGap: progress.left - right,
      }
    })
  await expect
    .poll(async () =>
      Math.max(
        (
          await progressGeometry()
        ).top,
        (
          await progressGeometry()
        ).bottom
      )
    )
    .toBeLessThanOrEqual(1)
  const progress = await progressGeometry()
  expect(progress.toolbarGap).toBeGreaterThanOrEqual(0)
  expect(progress.contentGap).toBeGreaterThanOrEqual(8)
  const before = await fixedControls()
  await expect(page.locator('.study-note-pagination')).toHaveCount(1)
  await listScroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  const overflows = await listScroll.evaluate(
    (element) => element.scrollHeight > element.clientHeight + 1
  )
  if (overflows)
    await expect
      .poll(() => listScroll.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0)
  const bottomGap = await listScroll.evaluate((element) => {
    const cards = Array.from(element.querySelectorAll('.study-note-card'))
    return (
      element.getBoundingClientRect().bottom -
      Math.max(...cards.map((card) => card.getBoundingClientRect().bottom))
    )
  })
  expect(bottomGap).toBeGreaterThan(10)
  const after = await fixedControls()
  expect(Math.abs(after.header - before.header)).toBeLessThanOrEqual(1)
  const samples = [
    ['elements.md', 'input[type="checkbox"]', 3],
    ['markdown-it-demo.md', '.warning', 1],
    ['md-container.md', '.note, .tip, .attention', 3],
    ['footnotes-demo.md', '.footnote-ref', 4],
    ['tag-plugins.md', '.note-code-line.is-marked', 4],
    ['videos.md', '.note-embed iframe', 3],
    ['images.md', '.note-image-hover', 4],
    ['excerpts.md', 'p', 1],
    ['en-demo.md', 'p', null],
    ['katex-demo.md', '.katex-display', 3],
  ] as const
  for (const [suffix, selector, count] of samples) {
    const note = notes.find((item) => item.sourcePath.endsWith('/' + suffix))
    await page.evaluate(async (path) => {
      const app = (
        document.querySelector('#app') as HTMLElement & {
          __vue_app__: {
            config: {
              globalProperties: {
                $router: { push(path: string): Promise<void> }
              }
            }
          }
        }
      ).__vue_app__
      await app.config.globalProperties.$router.push(path)
    }, note.path)
    const reader = page.locator('.note-reader')
    await expect(reader.locator('header h1')).toHaveText(note.title)
    if (testInfo.project.name.includes('mobile'))
      await expect(page.locator('.mobile-experience-alert')).toBeHidden()
    if (count === null)
      expect(
        await reader.locator(`.note-markdown ${selector}`).count()
      ).toBeGreaterThan(10)
    else
      await expect(reader.locator(`.note-markdown ${selector}`)).toHaveCount(
        count
      )
    expect(
      await page
        .locator('.note-reader__body-scroll')
        .evaluate((element) => element.scrollWidth - element.clientWidth)
    ).toBeLessThanOrEqual(1)
    if (suffix === 'markdown-it-demo.md') {
      await expect(reader.locator('.note-markdown')).toHaveCSS(
        'font-weight',
        '600'
      )
      await expect(reader.locator('.note-markdown')).not.toContainText(
        '项目推荐'
      )
      for (const [marker, width] of [
        ['_', '1px'],
        ['-', '2px'],
        ['*', '3px'],
      ])
        await expect(
          reader.locator(`hr[data-note-rule="${marker}"]`).first()
        ).toHaveCSS('border-top-width', width)
      await expect(reader.locator('.note-markdown em').first()).toHaveCSS(
        'font-style',
        'italic'
      )
    }
    if (suffix === 'elements.md') {
      await expect(reader.locator('.note-reader__header')).toHaveCSS(
        'border-bottom-width',
        '0px'
      )
      const sizes = await reader
        .locator(
          '.note-markdown h1, .note-markdown h2, .note-markdown h3, .note-markdown h4, .note-markdown h5, .note-markdown h6'
        )
        .evaluateAll((elements) =>
          elements
            .slice(0, 6)
            .map((element) => parseFloat(getComputedStyle(element).fontSize))
        )
      expect(sizes).toEqual([40, 34, 28, 23, 20, 18])
      await expect(reader.locator('.note-markdown dd')).toHaveCSS(
        'margin-left',
        '0px'
      )
      await expect(
        reader.locator('.note-markdown ul.contains-task-list')
      ).toHaveCSS('padding-left', '0px')
      const inline = reader.locator('.note-markdown :not(pre) > code').first()
      await expect(inline).toHaveCSS('color', 'rgb(0, 0, 0)')
      await expect(inline).toHaveCSS('background-color', 'rgb(226, 52, 86)')
      const abbreviation = reader.locator('acronym[data-note-title]')
      await expect(abbreviation).toHaveAttribute(
        'data-note-title',
        '美国职业篮球联赛'
      )
      await expect(abbreviation).toHaveCSS('text-decoration-style', 'dashed')
      await page.emulateMedia({ reducedMotion: 'no-preference' })
      await abbreviation.hover()
      expect(
        await abbreviation.evaluate(
          (element) => getComputedStyle(element, '::after').visibility
        )
      ).toBe('visible')
      expect(
        await abbreviation.evaluate(
          (element) => getComputedStyle(element, '::after').animationName
        )
      ).toBe('anutriumCrtOn')
      await abbreviation.evaluate((element) => {
        element.addEventListener('animationstart', (event) => {
          if (event.animationName === 'anutriumCrtOff')
            element.setAttribute(
              'data-test-exit-animation',
              event.animationName
            )
        })
      })
      await reader.locator('header h1').hover()
      await expect(abbreviation).toHaveAttribute(
        'data-test-exit-animation',
        'anutriumCrtOff'
      )
      await expect(abbreviation).not.toHaveClass(/is-tooltip-closing/)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await expect(reader.locator('.note-markdown th').first()).toHaveCSS(
        'padding',
        '12px 18px'
      )
      await expect(reader.locator('.note-markdown p').first()).toHaveCSS(
        'user-select',
        'text'
      )
      await expect(reader).toHaveClass(/native-cursor/)
      expect(
        await page
          .locator('.note-detail-modal .diamond-close-btn')
          .evaluate((element) => !!element.closest('.native-cursor'))
      ).toBe(false)

      const content = reader.locator('.note-markdown')
      await expect(content.locator('blockquote')).toHaveCSS(
        'padding-top',
        '8px'
      )
      await expect(content.locator('blockquote > p')).toHaveCSS(
        'margin-top',
        '0px'
      )
      for (const heading of ['h1', 'h2']) {
        const border = await content
          .locator(heading)
          .first()
          .evaluate((element) => ({
            width: element.getBoundingClientRect().width,
            parent: element.parentElement!.getBoundingClientRect().width,
            border: getComputedStyle(element).borderBottomWidth,
          }))
        expect(Math.abs(border.width - border.parent)).toBeLessThanOrEqual(1)
        expect(border.border).toBe('1px')
      }
    }
    if (suffix === 'markdown-it-demo.md') {
      await expect(reader.locator('.note-markdown')).toHaveCSS(
        'font-weight',
        '600'
      )
      await expect(reader.locator('.note-markdown')).not.toContainText(
        '项目推荐'
      )
      for (const [marker, width] of [
        ['_', '1px'],
        ['-', '2px'],
        ['*', '3px'],
      ])
        await expect(
          reader.locator(`hr[data-note-rule="${marker}"]`).first()
        ).toHaveCSS('border-top-width', width)
      const code = reader.locator('.note-markdown pre > code').first()
      await expect(code.locator('.note-code-line')).not.toHaveCount(0)
      expect(
        await code
          .locator('.note-code-line')
          .first()
          .evaluate((element) => getComputedStyle(element).fontFamily)
      ).toBe('consolas, Menlo, monospace')
      await page
        .locator('.note-detail-modal')
        .screenshot({ path: `.tmp/book-code-${testInfo.project.name}.png` })
    }
    if (suffix === 'excerpts.md') {
      await expect(reader.locator('.note-markdown')).not.toContainText('more')
      await expect(reader.locator('.note-markdown')).not.toContainText(
        '这段文字位于摘要分隔符之后'
      )
    }
    if (suffix === 'images.md') {
      expect(
        await reader
          .locator('.note-markdown img')
          .evaluateAll((images) =>
            images.every(
              (image) =>
                image.getBoundingClientRect().height <=
                parseFloat(getComputedStyle(image).maxHeight) + 1
            )
          )
      ).toBe(true)

      const box = await reader
        .locator('.note-image-hover')
        .last()
        .evaluate((element) => {
          const bounds = element.getBoundingClientRect(),
            parent = element.parentElement!.getBoundingClientRect()
          return {
            center: bounds.left + bounds.width / 2,
            parent: parent.left + parent.width / 2,
          }
        })
      expect(Math.abs(box.center - box.parent)).toBeLessThanOrEqual(1)
    }
    if (suffix === 'tag-plugins.md') {
      const book = reader
        .locator('.note-quote')
        .filter({ hasText: '大卫·利维坦' })
      await expect(book.locator('footer')).toHaveCSS('font-size', '20px')
      await expect(book.locator('footer strong')).toHaveCSS(
        'font-weight',
        '900'
      )
      await expect(book.locator('footer cite')).toHaveCSS(
        'font-style',
        'italic'
      )
      await expect(book.locator('footer cite')).toHaveText('《清醒》')
      await expect(reader.locator('.note-quote.right')).toHaveCSS(
        'text-align',
        'right'
      )
      await expect(
        reader.locator('.note-code-line.is-marked').first()
      ).toHaveCSS('background-color', 'rgb(33, 33, 34)')
      const figure = reader
        .locator('.note-code-block')
        .filter({ hasText: 'Underscore.js' })
      await expect(figure.locator('.note-code-caption-link a')).toHaveText(
        'Underscore.js'
      )
      const caption = await figure.locator('figcaption').evaluate((element) => {
        const box = element.getBoundingClientRect(),
          title = element
            .querySelector('.note-code-caption-title')!
            .getBoundingClientRect(),
          link = element
            .querySelector('.note-code-caption-link')!
            .getBoundingClientRect()
        return {
          center: box.x + box.width / 2,
          title: title.x + title.width / 2,
          linkRight: link.right,
          right: box.right,
        }
      })
      expect(Math.abs(caption.center - caption.title)).toBeLessThanOrEqual(1)
      expect(caption.right - caption.linkRight).toBeLessThan(20)
      await expect(figure.locator('.note-code-frame')).toHaveCSS(
        'background-color',
        'rgba(13, 9, 18, 0.82)'
      )
    }
    if (suffix === 'footnotes-demo.md') {
      await reader.locator('.footnote-ref a').first().click()
      expect(
        await page
          .locator('.note-reader__body-scroll')
          .evaluate((element) => element.scrollTop)
      ).toBeGreaterThan(0)
      expect(await page.evaluate(() => window.scrollY)).toBe(0)
    }
  }
  await page
    .locator('.note-detail-modal')
    .screenshot({ path: `.tmp/book-notes-${testInfo.project.name}.png` })
  await page.locator('.note-detail-modal .diamond-close-btn').click()
  await expect(page.locator('.note-detail-modal')).toBeHidden()
  await expect(page).not.toHaveURL(/note=/)

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.evaluate(() => {
    const root = document.querySelector('.temple-page')!
    const container = document.querySelector('.router-container')!
    const frames: number[][][] = []
    ;(window as any).notesLeaveFrames = frames
    const sample = () => {
      if (!root.isConnected) return
      frames.push(
        [root, container].map((element) => {
          const bounds = element.getBoundingClientRect()
          return [bounds.top, bounds.left]
        })
      )
      requestAnimationFrame(sample)
    }
    sample()
    void (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push('/404')
  })
  await expect(page.locator('.temple-page')).toHaveCount(0)
  const frames = await page.evaluate(
    () => (window as any).notesLeaveFrames as number[][][]
  )
  expect(frames.length).toBeGreaterThan(2)
  for (const frame of frames) {
    for (let element = 0; element < 2; element++) {
      for (let axis = 0; axis < 2; axis++) {
        expect(
          Math.abs(frame[element][axis] - frames[0][element][axis])
        ).toBeLessThanOrEqual(1)
      }
    }
  }
})

test('note images reuse gallery Cinco with half the brightness and saturation increments', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const note = notes.find((note) => note.sourcePath.endsWith('/images.md'))
  await page.goto(note.path, { waitUntil: 'domcontentloaded' })
  const image = page.locator('.note-markdown img').first()
  await expect(image).toBeVisible({ timeout: 45000 })
  await expect
    .poll(() =>
      image.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0
      )
    )
    .toBe(true)
  const wrapper = page.locator('.note-image-hover').first()
  await wrapper.hover()
  await expect(wrapper.locator('.media-gallery__cinco-layer')).toHaveCount(2)
  const filters = await wrapper.evaluate(async (wrapper) => {
    const source = await (await fetch('/src/utils/imageCincoHover.ts')).text()
    const url = source.match(/from ["']([^"']*\/gsap\.js[^"']*)/)?.[1]
    const { gsap } = await import(url!)
    wrapper.dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' })
    )
    const bottom = wrapper.querySelector('.media-gallery__cinco-layer')!
    const timeline = gsap.getTweensOf(bottom)[0].parent
    timeline.pause(0)
    const initial = getComputedStyle(bottom).filter
    timeline.time(0.5)
    const settled = getComputedStyle(bottom).filter
    timeline.play()
    return { initial, settled }
  })
  expect(filters.initial).toBe('brightness(2.5) saturate(1.5)')
  expect(filters.settled).toBe('brightness(1) saturate(1)')
  await page.locator('.note-detail-modal .diamond-close-btn').click()
  await expect(page.locator('.media-gallery__cinco-surface')).toHaveCount(0)
})

test('portrait images and embedded videos fit the media height cap without changing proportions', async ({
  page,
}) => {
  const note = notes.find((note) => note.sourcePath.endsWith('/images.md'))
  await page.route(
    'https://assets.anuluca.com/note-assets/test-tall.svg',
    (route) =>
      route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1600"><path fill="#888" d="M0 0h900v1600H0z"/></svg>',
      })
  )
  await page.route(`https://steam-api.anuluca.com/notes/${note.id}`, (route) =>
    route.fulfill({
      contentType: 'text/markdown',
      body: '---\ntitle: "媒体比例"\ndate: "2026-11-01"\ncategory: test\n---\n\n![竖图](https://assets.anuluca.com/note-assets/test-tall.svg)\n\n{% youtube TIbZDRXM-Tg %}',
    })
  )
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: 'player' })
  )
  await page.goto(note.path, { waitUntil: 'domcontentloaded' })
  const image = page.locator('.note-markdown img')
  await image.scrollIntoViewIfNeeded()
  await expect
    .poll(() =>
      image.evaluate((image: HTMLImageElement) => image.naturalHeight)
    )
    .toBe(1600)
  const size = await image.evaluate((image) => ({
    width: image.getBoundingClientRect().width,
    height: image.getBoundingClientRect().height,
    max: parseFloat(getComputedStyle(image).maxHeight),
  }))
  expect(size.height).toBeLessThanOrEqual(size.max + 1)
  expect(size.width / size.height).toBeCloseTo(9 / 16, 2)
  const video = await page.locator('.note-embed').evaluate((element) => ({
    width: element.getBoundingClientRect().width,
    height: element.getBoundingClientRect().height,
    max: parseFloat(getComputedStyle(element).maxHeight),
  }))
  expect(video.height).toBeLessThanOrEqual(video.max + 1)
  expect(video.width / video.height).toBeCloseTo(16 / 9, 2)
})
