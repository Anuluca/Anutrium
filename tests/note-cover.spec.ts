import { expect, test } from '@playwright/test'

const id = 'a12ee06a-a95f-4cbc-9b65-ff71bbca5371'
const cover =
  'https://assets.anuluca.com/Island/notes/pokemonCorocoro/BW2/IMG_2129.jpg'
const source = `---\ntitle: "Corocoro宝可梦情报"\ndate: "2024-11-12"\ncategory: pokemon\ncover: "${cover}"\n---\n\n${'封面背景回归正文。\n\n'.repeat(
  100
)}`

test('independent modal background keeps its aspect ratio and follows the entire scroll range', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  let releaseCover!: () => void
  const ready = new Promise<void>((resolve) => {
    releaseCover = resolve
  })
  await page.route(
    'https://assets.anuluca.com/Island/notes/pokemonCorocoro/BW2/IMG_2129.jpg*',
    async (route) => {
      await ready
      await route.fulfill({
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="900"><rect width="2000" height="900" fill="#995c36"/><circle cx="1000" cy="450" r="300" fill="#c29c4a"/></svg>',
      })
    }
  )
  await page.route('https://steam-api.anuluca.com/notes**', (route) =>
    new URL(route.request().url()).pathname.endsWith(id)
      ? route.fulfill({ contentType: 'text/markdown', body: source })
      : route.fulfill({
          json: {
            notes: [
              {
                id,
                title: 'Corocoro宝可梦情报',
                time: '2024-11-12',
                type: 'pokemon',
                image: cover,
              },
            ],
            nextCursor: null,
          },
        })
  )
  await page.addInitScript(() => {
    const samples: number[][] = []
    ;(window as any).__noteCoverEntrance = samples
    const sample = () => {
      const reader = document.querySelector<HTMLElement>('.note-reader')
      const header = document.querySelector('.note-modal-background')
      const modal = reader?.closest('.note-detail-modal')
      if (
        header &&
        modal &&
        ['title', 'meta', 'hold', 'moving'].includes(
          reader!.dataset.noteEnter || ''
        )
      ) {
        const box = header.getBoundingClientRect(),
          frame = modal.getBoundingClientRect()
        samples.push([
          box.left - frame.left,
          box.top - frame.top,
          box.width,
          box.height,
          Number(getComputedStyle(header).opacity),
        ])
      }
      if (reader?.dataset.noteEnter !== 'ready') requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await page.goto(`/atrium/notes?note=${id}`, { waitUntil: 'domcontentloaded' })
  const reader = page.locator('.note-reader'),
    header = reader.locator('.note-reader__header'),
    background = page.locator('.note-modal-background'),
    image = background.locator('img').first()
  await expect(background).toHaveCSS('opacity', '0', { timeout: 45000 })
  releaseCover()
  await expect
    .poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth), {
      timeout: 45000,
    })
    .toBe(2000)
  await expect(reader).toHaveAttribute('data-note-enter', /title|meta|hold/, {
    timeout: 45000,
  })
  const initial = await background.evaluate((el) => {
    const frame = el.getBoundingClientRect(),
      modal = el.closest('.note-detail-modal')!,
      box = modal.getBoundingClientRect(),
      style = getComputedStyle(modal),
      cover = el.querySelector('img')!,
      image = cover.getBoundingClientRect()
    return {
      fullHeight: Math.abs(
        frame.height -
          box.height +
          parseFloat(style.borderTopWidth) +
          parseFloat(style.borderBottomWidth)
      ),
      width: Math.abs(image.width - frame.width * 1.15),
      uncoveredHeight: Math.max(
        image.top - frame.top,
        frame.bottom - image.bottom
      ),
      zoom: Math.max(
        image.width / cover.naturalWidth,
        image.height / cover.naturalHeight
      ),
      center: Math.abs(
        (image.top + image.bottom) / 2 - (frame.top + frame.height * 0.55)
      ),
    }
  })
  expect(initial.fullHeight).toBeLessThanOrEqual(1)
  expect(initial.width).toBeLessThanOrEqual(1)
  expect(initial.uncoveredHeight).toBeLessThanOrEqual(1)
  expect(initial.center).toBeLessThanOrEqual(1)
  await expect(reader).toHaveAttribute('data-note-enter', 'ready', {
    timeout: 45000,
  })
  const finalZoom = await image.evaluate((el: HTMLImageElement) => {
    const box = el.getBoundingClientRect()
    return Math.max(box.width / el.naturalWidth, box.height / el.naturalHeight)
  })
  expect(finalZoom).toBeLessThan(initial.zoom)
  expect(
    await image.evaluate(
      (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m11
    )
  ).toBeCloseTo(1, 3)
  const samples = await page.evaluate(
    () => (window as any).__noteCoverEntrance as number[][]
  )
  expect(samples.length).toBeGreaterThan(10)
  expect(
    await background.evaluate(
      (el) => getComputedStyle(el, '::before').backdropFilter
    )
  ).toBe('none')
  expect(samples.some((sample) => sample[4] > 0 && sample[4] < 1)).toBe(true)
  for (let axis = 0; axis < 3; axis++) {
    const values = samples.map((sample) => sample[axis])
    expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
  }
  const heights = samples.map((sample) => sample[3])
  expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(100)
  expect(
    new Set(heights.map((height) => Math.round(height))).size
  ).toBeGreaterThan(10)
  const before = (await header.boundingBox())!
  releaseCover()
  await expect
    .poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBe(2000)
  const after = (await header.boundingBox())!
  const insets = await header.evaluate((el) => {
    const box = el.getBoundingClientRect(),
      reader = el.closest('.note-reader')!.getBoundingClientRect(),
      style = getComputedStyle(el),
      modal = el.closest('.note-detail-modal')!,
      modalBox = modal.getBoundingClientRect(),
      modalStyle = getComputedStyle(modal)
    return {
      modalLeft:
        box.left - modalBox.left - parseFloat(modalStyle.borderLeftWidth),
      modalTop: box.top - modalBox.top - parseFloat(modalStyle.borderTopWidth),
      insetTop:
        parseFloat(style.getPropertyValue('--note-reader-inset-top')) *
        parseFloat(getComputedStyle(document.documentElement).fontSize),
      insetLeft:
        parseFloat(style.getPropertyValue('--note-reader-inset-left')) *
        parseFloat(getComputedStyle(document.documentElement).fontSize),
      top: box.top - reader.top,
      left: box.left - reader.left,
      right: reader.right - box.right,
      margin: style.margin,
      padding: [
        style.paddingTop,
        style.paddingRight,
        style.paddingBottom,
        style.paddingLeft,
      ],
    }
  })
  expect(Math.abs(insets.top)).toBeLessThanOrEqual(1)
  expect(Math.abs(insets.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(insets.right)).toBeLessThanOrEqual(1)
  expect(insets.margin).toBe('0px')
  expect(Math.abs(insets.modalLeft)).toBeLessThanOrEqual(1)
  expect(Math.abs(insets.modalTop)).toBeLessThanOrEqual(1)
  expect(parseFloat(insets.padding[0])).toBeCloseTo(16 + insets.insetTop, 1)
  expect(parseFloat(insets.padding[3])).toBeCloseTo(16 + insets.insetLeft, 1)
  expect(insets.padding[1]).toBe('16px')
  expect(insets.padding[2]).toBe(insets.padding[0])

  expect(Math.abs(before.height - after.height)).toBeLessThanOrEqual(1)
  expect(Math.abs(before.width - after.width)).toBeLessThanOrEqual(1)
  await expect(image).toHaveCSS('object-fit', 'cover')
  await expect(image).toHaveCSS('object-position', '50% 45%')
  const finalOffset = await background.evaluate((el) => {
    const frame = el.getBoundingClientRect(),
      image = el.querySelector('img')!.getBoundingClientRect(),
      overscan = parseFloat(
        getComputedStyle(el).getPropertyValue('--note-cover-overscan')
      )
    return Math.abs(image.top - frame.top + overscan - frame.height * 0.1)
  })
  expect(finalOffset).toBeLessThanOrEqual(1)
  expect(
    await image.evaluate((el) => (el as HTMLImageElement).currentSrc)
  ).toContain(
    info.project.name.includes('mobile')
      ? 'image=card-mobile'
      : 'image=card-thumb'
  )

  const shift = () =>
    image.evaluate(
      (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42
    )
  async function assertCovered() {
    await expect(image).toHaveCSS('filter', 'none')
    const bounds = await background.evaluate((el) => {
      const frame = el.getBoundingClientRect(),
        picture = el.querySelector('picture')!.getBoundingClientRect(),
        image = el.querySelector('img')!.getBoundingClientRect()
      return {
        width: Math.abs(frame.width - picture.width),
        height: Math.abs(frame.height - picture.height),
        top: image.top - frame.top,
        bottom: frame.bottom - image.bottom,
      }
    })
    expect(bounds.width).toBeLessThanOrEqual(1)
    expect(bounds.height).toBeLessThanOrEqual(1)
    expect(bounds.top).toBeLessThanOrEqual(1)
    expect(bounds.bottom).toBeLessThanOrEqual(1)
    await expect
      .poll(() =>
        background.evaluate((el) =>
          Math.abs(
            el.getBoundingClientRect().height -
              Math.min(
                el
                  .closest('.note-detail-modal')!
                  .querySelector('.note-reader__header')!
                  .getBoundingClientRect().height * 1.35,
                (el.closest('.note-detail-modal')! as HTMLElement).clientHeight
              )
          )
        )
      )
      .toBeLessThanOrEqual(1)
  }
  await assertCovered()
  const modalInsets = await background.evaluate((el) => {
    const modal = el.closest('.note-detail-modal')!,
      frame = modal.getBoundingClientRect(),
      box = el.getBoundingClientRect(),
      style = getComputedStyle(modal)
    return [
      Math.abs(box.left - frame.left - parseFloat(style.borderLeftWidth)),
      Math.abs(box.top - frame.top - parseFloat(style.borderTopWidth)),
      Math.abs(frame.right - box.right - parseFloat(style.borderRightWidth)),
      Math.abs(
        box.height -
          Math.min(
            modal.querySelector('.note-reader__header')!.getBoundingClientRect()
              .height * 1.35,
            (modal as HTMLElement).clientHeight
          )
      ),
      Number(!!el.closest('.note-reader')),
    ]
  })
  expect(modalInsets.every((value) => value <= 1)).toBe(true)
  expect(modalInsets[4]).toBe(0)
  expect(await shift()).toBe(0)
  await page.screenshot({ path: info.outputPath('note-cover.png') })
  const scroll = reader.locator('.note-reader__body-scroll')
  await scroll.evaluate((el) => (el.scrollTop = 200))
  await expect.poll(shift).toBeCloseTo(3, 1)
  await expect(reader).toHaveClass(/is-header-compact/)
  await expect
    .poll(() =>
      header.evaluate((el) =>
        Math.abs(
          el.getBoundingClientRect().height -
            parseFloat(getComputedStyle(el).paddingTop) -
            parseFloat(getComputedStyle(el).paddingBottom) -
            el.querySelector('.note-reader__heading')!.getBoundingClientRect()
              .height
        )
      )
    )
    .toBeLessThanOrEqual(1)
  await assertCovered()
  await scroll.evaluate((el) => (el.scrollTop = 1000))
  await expect.poll(shift).toBe(15)
  await assertCovered()
  await scroll.evaluate((el) => (el.scrollTop = 2000))
  await expect.poll(shift).toBe(30)
  await assertCovered()
  await scroll.evaluate((el) => (el.scrollTop = el.scrollHeight))
  await expect
    .poll(async () =>
      Math.abs(
        (await shift()) - (await scroll.evaluate((el) => el.scrollTop * 0.015))
      )
    )
    .toBeLessThanOrEqual(0.1)
  await assertCovered()
  await scroll.evaluate((el) => (el.scrollTop = 0))
  await expect.poll(shift).toBe(0)
  await expect(reader).not.toHaveClass(/is-header-compact/)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await scroll.evaluate((el) => (el.scrollTop = 500))
  await expect(image).toHaveCSS('transform', 'none')
})

test('a failed cover does not leave a broken image or block reading', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route(
    'https://assets.anuluca.com/Island/notes/pokemonCorocoro/BW2/IMG_2129.jpg*',
    (route) => route.fulfill({ status: 404 })
  )
  await page.route('https://steam-api.anuluca.com/notes**', (route) =>
    new URL(route.request().url()).pathname.endsWith(id)
      ? route.fulfill({ contentType: 'text/markdown', body: source })
      : route.fulfill({
          json: {
            notes: [
              {
                id,
                title: 'Corocoro宝可梦情报',
                time: '2024-11-12',
                type: 'pokemon',
                image: cover,
              },
            ],
            nextCursor: null,
          },
        })
  )
  await page.goto(`/atrium/notes?note=${id}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.note-reader h1')).toHaveText(
    'Corocoro宝可梦情报',
    { timeout: 45000 }
  )
  await expect(page.locator('.note-modal-background')).toHaveCount(0)
  await expect(page.locator('.note-reader__body-scroll')).toBeVisible()
})

test('color dither ignores hover and reveals the original cover only while pressed', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route(`${cover}*`, (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="900"><rect width="2000" height="900" fill="#995c36"/><circle cx="1000" cy="450" r="300" fill="#c29c4a"/></svg>',
    })
  )
  await page.route('https://steam-api.anuluca.com/notes**', (route) =>
    new URL(route.request().url()).pathname.endsWith(id)
      ? route.fulfill({ contentType: 'text/markdown', body: source })
      : route.fulfill({
          json: {
            notes: [
              {
                id,
                title: 'Corocoro宝可梦情报',
                time: '2024-11-12',
                type: 'pokemon',
                image: cover,
              },
            ],
            nextCursor: null,
          },
        })
  )
  await page.goto(`/atrium/notes?note=${id}`, { waitUntil: 'domcontentloaded' })
  const background = page.locator('.note-modal-background')
  const image = background.locator('img').first()
  const reveal = background.locator('.note-cover-reveal-window')
  await expect(image).toBeVisible({ timeout: 45000 })
  await expect
    .poll(() => image.evaluate((el) => (el as HTMLImageElement).naturalWidth))
    .toBe(2000)
  await expect(image).toHaveCSS('filter', 'none')
  await expect(reveal.locator('img')).toHaveCSS('filter', 'none')
  const frame = (await background.boundingBox())!
  const x = frame.x + frame.width / 2
  const y = frame.y + frame.height * 0.3
  // 触屏分支使用触点事件，监听器不能阻止正文原生滚动。
  if (info.project.name.includes('mobile')) {
    await background.evaluate(
      (el, point) =>
        el.closest('.note-detail-modal')!.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            pointerType: 'touch',
            clientX: point.x,
            clientY: point.y,
          })
        ),
      { x, y }
    )
  } else {
    await page.mouse.move(x, y)
    await expect(reveal).toHaveCSS('opacity', '0')
    await page.mouse.down()
  }
  await expect(reveal).toHaveCSS('opacity', '1')
  const positions = await background.locator('img').evaluateAll((images) =>
    images.map((el) => {
      const box = el.getBoundingClientRect()
      return [box.x, box.y, box.width, box.height]
    })
  )
  positions[0].forEach((value, axis) =>
    expect(Math.abs(value - positions[1][axis])).toBeLessThanOrEqual(1)
  )
  await page.screenshot({
    path: info.outputPath('note-cover-color-reveal.png'),
  })
  if (info.project.name.includes('mobile')) {
    await background.evaluate((el) =>
      el
        .closest('.note-detail-modal')!
        .dispatchEvent(
          new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' })
        )
    )
  } else {
    await page.mouse.up()
  }
  await expect(reveal).toHaveCSS('opacity', '0')
})

test('switching notes replays cover zoom and fade even when both notes share a cover', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const ids = [id, 'f2a08581-e032-4f35-9aa7-c84c19c57e98']
  await page.route(`${cover}*`, (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="900"><rect width="2000" height="900" fill="#995c36"/></svg>',
    })
  )
  await page.route('https://steam-api.anuluca.com/notes**', (route) => {
    const selected = new URL(route.request().url()).pathname.split('/')[2]
    return selected
      ? route.fulfill({
          contentType: 'text/markdown',
          body: source.replace(
            'Corocoro宝可梦情报',
            `封面切换 ${ids.indexOf(selected)}`
          ),
        })
      : route.fulfill({
          json: {
            notes: ids.map((id, index) => ({
              id,
              title: `封面切换 ${index}`,
              path: `/atrium/notes?note=${id}`,
              time: '2024-11-12',
              type: 'pokemon',
              image: cover,
            })),
            nextCursor: null,
          },
        })
  })
  await page.goto(`/atrium/notes?note=${id}`, { waitUntil: 'domcontentloaded' })
  const reader = page.locator('.note-reader')
  await expect(reader).toHaveAttribute('data-note-enter', 'ready', {
    timeout: 45000,
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  for (const direction of ['next', 'prev']) {
    await page
      .locator(`.note-detail-nav--${direction}`)
      .evaluate((el: HTMLElement) => el.click())
    const background = page.locator(
      '.note-modal-background.is-switch-entrance.is-loaded'
    )
    await expect(background).toHaveCount(1)
    await expect(page.locator('.note-detail-modal')).not.toHaveClass(
      /is-switching/
    )
    await expect(background).toBeVisible()
    const visibleStart = await background.evaluate((el) => ({
      opacity: Number(getComputedStyle(el).opacity),
      scale: new DOMMatrixReadOnly(getComputedStyle(el).transform).a,
    }))
    expect(visibleStart.opacity).toBeLessThan(0.6)
    expect(visibleStart.scale).toBeGreaterThan(1.05)
    const frames = await background.evaluate((el) => {
      const animation = el
        .getAnimations()
        .find(
          (animation) =>
            animation instanceof CSSAnimation &&
            animation.animationName.includes('noteCoverSwitchIn')
        )!
      animation.pause()
      const samples = [0, 600, 1200].map((time) => {
        animation.currentTime = time
        const style = getComputedStyle(el)
        return {
          opacity: Number(style.opacity),
          scale: new DOMMatrixReadOnly(style.transform).a,
        }
      })
      animation.play()
      return samples
    })
    expect(frames[0].opacity).toBe(0)
    expect(frames[0].scale).toBeCloseTo(1.15, 3)
    expect(frames[1].opacity).toBeGreaterThan(0)
    expect(frames[1].opacity).toBeLessThan(1)
    expect(frames[1].scale).toBeGreaterThan(1)
    expect(frames[1].scale).toBeLessThan(1.15)
    expect(frames[2].opacity).toBe(1)
    expect(frames[2].scale).toBe(1)
    await expect(page.locator('.note-detail-modal')).not.toHaveClass(
      /is-switching/
    )
    await expect(background).toHaveCSS('opacity', '1')
    expect(
      await background.evaluate(
        (el) => getComputedStyle(el, '::before').backdropFilter
      )
    ).toBe('none')
  }
})
