import { expect, type Page, test } from '@playwright/test'

const defaults = [
  '20260530_233444_modified_time_compressed_2cadb319aa4e.webp',
  '20260530_233444_modified_time_compressed_549d220c64c4.webp',
  '20260709_003441_modified_time_compressed_945b813d79d1.webp',
  '20260530_233444_modified_time_compressed_43154bd467d4.webp',
  '20260530_233444_modified_time_compressed_6f3a9a47f580.webp',
  '20260530_233444_modified_time_compressed_e5f052cf8797.webp',
]
const illustrationDefaults = [
  '20240122_215617_TWO SIDES_表里.webp',
  '20240810_103854_METEOR MASH_彗星拳.webp',
  '20240826_013410_No Title_无题.webp',
  '20240827_182312_REBIRTH_诞生.webp',
  '20250412_211141_IRON VALIENT_铁武者.webp',
  '20251203_074156_MEGA LUCARIO Z_MEGA路卡利欧Z.webp',
  '20261023_000708_Be Brave_勇敢.webp',
]
const gallerySelector = '.creative-photography'
const openCreative = async (
  page: Page,
  reducedMotion: 'reduce' | 'no-preference'
) => {
  // 固定接口样本，避免用户正在上传/移动本地图片时影响分页和交互回归。
  await page.route('**/__floratrium/media?**', (route) => {
    const query = new URL(route.request().url()).searchParams
    const album = query.get('pet')
    if (album !== 'photography' && album !== 'illustration')
      return route.continue()
    const files =
      album === 'photography'
        ? [
            ...defaults,
            ...Array.from(
              { length: 11 },
              (_, index) => `fixture-${index}.webp`
            ),
          ]
        : illustrationDefaults
    const prefix =
      album === 'photography' ? 'Creative/Photography' : 'Creative/illustration'
    const offset = Number(query.get('cursor') || 0)
    return route.fulfill({
      json: {
        items: files.slice(offset, offset + 15).map((filename) => ({
          key: `${prefix}/${filename}`,
          url: `https://assets.anuluca.com/${prefix}/${encodeURIComponent(
            filename
          )}`,
          type: 'image',
        })),
        totalPages: Math.ceil(files.length / 15),
        totalItems: files.length,
        nextCursor: offset + 15 < files.length ? String(offset + 15) : null,
      },
    })
  })
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion })
  await page.goto('/creative', { waitUntil: 'domcontentloaded' })
  await expect(
    page.locator(
      `${gallerySelector} .image-marquee__group:first-child .image-marquee__photo`
    )
  ).toHaveCount(defaults.length, { timeout: 45000 })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 30000 }
  )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
}
const visibleFiles = (page: Page) =>
  page
    .locator(
      `${gallerySelector} .creative-photography__preview:not(.creative-photo-fade-leave-active) .image-marquee__group:first-child img, ${gallerySelector} .creative-photography__all:not(.creative-photo-fade-leave-active) img`
    )
    .evaluateAll((images) =>
      images.map((image) =>
        new URL((image as HTMLImageElement).src).pathname.split('/').pop()
      )
    )

test('photography preserves configured defaults through expansion and collapse', async ({
  page,
}) => {
  test.setTimeout(90000)
  await openCreative(page, 'reduce')
  expect(await visibleFiles(page)).toEqual(defaults)
  const button = page.locator(`${gallerySelector} .flora-expand-button`)
  await button.click()
  await expect(
    page.locator(`${gallerySelector} .media-gallery__card`)
  ).toHaveCount(15)
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  await button.click()
  await expect(
    page.locator(
      `${gallerySelector} .image-marquee__group:first-child .image-marquee__photo`
    )
  ).toHaveCount(defaults.length)
  expect(await visibleFiles(page)).toEqual(defaults)
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await expect(
    page.locator(`${gallerySelector} .creative-photography__preview`)
  ).toBeVisible()
  const layout = await page.locator(gallerySelector).evaluate((root) => {
    const button = root.querySelector<HTMLElement>('.flora-expand-button')!
    const label = button.querySelector('span')!.getBoundingClientRect()
    const icon = button.querySelector('svg')!.getBoundingClientRect()
    const row = button.getBoundingClientRect()
    const bounds = root.getBoundingClientRect()
    return {
      width: row.width,
      fullWidth: bounds.width,
      labelRight: label.right,
      iconLeft: icon.left,
      right: row.right,
      left: row.left,
    }
  })
  expect(Math.abs(layout.width - layout.fullWidth)).toBeLessThanOrEqual(1)
  expect(layout.right - layout.labelRight).toBeLessThanOrEqual(24)
  expect(layout.iconLeft).toBeGreaterThan(layout.left + layout.width / 2)
})

test('full photography pages contain 15 images with a two-image last page and reset on reopening', async ({
  page,
}) => {
  test.setTimeout(90000)
  await openCreative(page, 'reduce')
  const gallery = page.locator(gallerySelector)
  const toggle = gallery.locator('.flora-expand-button')
  const pager = gallery.locator('.flora-album-gallery__pagination')
  await expect(pager).toHaveCount(0)
  await toggle.click()
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(15)
  const firstPage = await visibleFiles(page)
  // 桌面窄模块中，原生按钮的长标签不能覆盖居中的分页器。
  const footer = await gallery.evaluate((root) => {
    const button = root
      .querySelector('.flora-expand-button')!
      .getBoundingClientRect()
    const pager = root
      .querySelector('.flora-album-gallery__pagination')!
      .getBoundingClientRect()
    return { buttonLeft: button.left, pagerRight: pager.right }
  })
  expect(footer.buttonLeft).toBeGreaterThanOrEqual(footer.pagerRight)
  await expect(
    pager.locator('.flora-album-gallery__page-numbers button')
  ).toHaveText(['1', '2'])
  await expect(
    pager.getByRole('button', { name: '上一页', exact: true })
  ).toBeDisabled()
  await pager.getByRole('button', { name: '第 2 页', exact: true }).click()
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(2)
  await expect(
    pager.getByRole('button', { name: '下一页', exact: true })
  ).toBeDisabled()
  await expect(
    pager.getByRole('button', { name: '第 2 页', exact: true })
  ).toHaveAttribute('aria-current', 'page')
  expect(new Set([...firstPage, ...(await visibleFiles(page))]).size).toBe(17)
  await pager.getByRole('button', { name: '上一页', exact: true }).click()
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(15)
  expect(await visibleFiles(page)).toEqual(firstPage)
  await pager.getByRole('button', { name: '下一页', exact: true }).click()
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(2)
  await toggle.click()
  await expect(
    gallery.locator('.image-marquee__group:first-child .image-marquee__photo')
  ).toHaveCount(defaults.length)
  await expect(pager).toHaveCount(0)
  await toggle.click()
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(15)
  await expect(
    pager.getByRole('button', { name: '第 1 页', exact: true })
  ).toHaveAttribute('aria-current', 'page')
})

test('preview scrolls continuously with equal height, original proportions and 2px overlaps', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await openCreative(page, 'no-preference')
  const preview = page.locator(
    `${gallerySelector} .creative-photography__preview`
  )
  const track = preview.locator('.image-marquee__track')
  await expect(track).not.toHaveClass(/is-paused/)
  const geometry = await preview.evaluate((root) => {
    const groups = root.querySelectorAll('.image-marquee__group')
    const buttons = [...groups[0].querySelectorAll('button')]
    const rectangles = buttons.map((button) => button.getBoundingClientRect())
    return {
      gaps: rectangles
        .slice(1)
        .map((rect, index) => rect.left - rectangles[index].right),
      heights: rectangles.map((rect) => rect.height),
      ratios: buttons.map((button) => {
        const image = button.querySelector('img')!
        const rect = image.getBoundingClientRect()
        return Math.abs(
          rect.width / rect.height -
            Number(image.getAttribute('width')) /
              Number(image.getAttribute('height'))
        )
      }),
      seam:
        groups[1].querySelector('button')!.getBoundingClientRect().left -
        rectangles.at(-1)!.right,
    }
  })
  expect(
    Math.max(...geometry.heights) - Math.min(...geometry.heights)
  ).toBeLessThanOrEqual(1)
  expect(geometry.gaps.every((gap) => Math.abs(gap + 2) <= 0.25)).toBe(true)
  expect(geometry.ratios.every((ratio) => ratio < 0.01)).toBe(true)
  expect(Math.abs(geometry.seam + 2)).toBeLessThanOrEqual(0.25)
  const before = await track.evaluate((el) => getComputedStyle(el).transform)
  await expect
    .poll(() => track.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(before)
  await preview.hover()
  await expect(track).toHaveCSS(
    'animation-play-state',
    info.project.name.includes('mobile') ? 'running' : 'paused'
  )
  await page.mouse.move(0, 0)
  await expect(track).toHaveCSS('animation-play-state', 'running')
  const photo = preview
    .locator('.image-marquee__group')
    .first()
    .locator('button')
    .nth(1)
  if (!info.project.name.includes('mobile')) {
    await expect
      .poll(
        () =>
          photo
            .locator('img')
            .evaluate(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0
            ),
        { timeout: 30000 }
      )
      .toBe(true)
    await preview.hover()
    await photo.hover()
    const surface = photo.locator('.media-gallery__cinco-surface')
    await expect(surface).toHaveCount(1)
    await expect(surface).toHaveCSS('position', 'absolute')
    await expect(surface).toHaveCSS('display', 'grid')
    await expect(surface.locator('.media-gallery__cinco-layer')).toHaveCount(2)
    await expect(
      surface.locator('.media-gallery__cinco-layer').last()
    ).toHaveCSS('clip-path', 'inset(50%)')
    await expect(track).toHaveCSS('animation-play-state', 'paused')
    await page.mouse.move(0, 0)
    await expect(surface).toHaveCount(0)
    await preview.hover()
    await photo.hover()
    await expect(surface).toHaveCount(1)
  }
  // 使用按钮事件避免滚动队列移动期间的点击稳定性等待。
  await photo.evaluate((el) => (el as HTMLButtonElement).click())
  await expect(page.locator('.el-image-viewer__wrapper')).toBeVisible()
  await expect(preview.locator('.media-gallery__cinco-surface')).toHaveCount(0)
  await expect(page.locator('.el-image-viewer__img').first()).toHaveAttribute(
    'src',
    new RegExp(defaults[1])
  )
  await page.locator('.el-image-viewer__close').click()
  await expect(page.locator('.el-image-viewer__wrapper')).toHaveCount(0)
  await expect(track).not.toHaveClass(/is-paused/)
  if (!info.project.name.includes('mobile')) {
    await page.locator('.temple-expand').click()
    await expect(track).toHaveCSS('animation-play-state', 'running')
  }
})

test('marquee direction defaults left, illustration moves right and Creative menu is not muted', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await openCreative(page, 'no-preference')
  if (info.project.name.includes('mobile'))
    await page.locator('.mobile-menu-icon').click()
  await expect(
    page.locator('.temple-nav-action[data-temple-nav="island"]').first()
  ).toBeAttached()
  await expect(
    page.locator(
      '.temple-nav-action[data-temple-nav="island"].is-wireframe-preview'
    )
  ).toHaveCount(0)
  if (info.project.name.includes('mobile')) {
    await page.locator('.mobile-menu-icon').click()
    await expect(page.locator('.mobile-menu-wrapper')).toHaveCount(0)
  }
  for (const [selector, direction] of [
    ['.creative-photography__preview', 'left'],
    ['.creative-illustration__preview', 'right'],
  ]) {
    const preview = page.locator(selector)
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toHaveAttribute('data-direction', direction)
    const track = preview.locator('.image-marquee__track')
    await expect(track).toHaveCSS(
      'animation-direction',
      direction === 'right' ? 'reverse' : 'normal'
    )
    const distance = await track.evaluate((element) => {
      const animation = element.getAnimations()[0]
      animation.pause()
      animation.currentTime = 1000
      const from = new DOMMatrixReadOnly(getComputedStyle(element).transform)
        .m41
      animation.currentTime = 1200
      const to = new DOMMatrixReadOnly(getComputedStyle(element).transform).m41
      animation.play()
      return to - from
    })
    expect(distance * (direction === 'right' ? 1 : -1)).toBeGreaterThan(1)
  }
})

test('illustration uses its configured preview, full R2 collection and independent expansion', async ({
  page,
}) => {
  test.setTimeout(90000)
  await openCreative(page, 'reduce')
  const drawing = page.locator('.creative-illustration')
  const preview = drawing.locator('.image-marquee__group').first()
  await expect(drawing.locator('.image-marquee__entry-mask')).toHaveCount(0)
  const files = illustrationDefaults
  await expect(preview.locator('img')).toHaveCount(files.length)
  expect(
    await preview
      .locator('img')
      .evaluateAll((images) =>
        images.map((image) =>
          decodeURIComponent(
            new URL((image as HTMLImageElement).src).pathname.split('/').pop()!
          )
        )
      )
  ).toEqual(files)
  await preview
    .locator('button')
    .first()
    .evaluate((el) => (el as HTMLButtonElement).click())
  await expect(page.locator('.el-image-viewer__wrapper')).toBeVisible()
  await expect(page.locator('.el-image-viewer__img').first()).toHaveAttribute(
    'src',
    `https://assets.anuluca.com/Creative/illustration/${encodeURIComponent(
      files[0]
    )}`
  )
  await page.locator('.el-image-viewer__close').click()
  await expect(page.locator('.el-image-viewer__wrapper')).toHaveCount(0)
  await drawing.locator('.creative-illustration__toggle').click()
  await expect(drawing.locator('.media-gallery__card')).toHaveCount(
    files.length
  )
  expect(
    await drawing
      .locator('.media-gallery__card img')
      .evaluateAll((images) =>
        images.map((image) => (image as HTMLImageElement).src)
      )
  ).toEqual(
    expect.arrayContaining(
      files.map(
        (file) =>
          `https://assets.anuluca.com/Creative/illustration/${encodeURIComponent(
            file
          )}?image=card-thumb`
      )
    )
  )
  await expect(
    drawing.locator('.flora-album-gallery__page-numbers button')
  ).toHaveText(['1'])
  await expect(page.locator('.creative-photography')).toHaveAttribute(
    'data-expanded',
    'false'
  )
  await drawing.locator('.creative-illustration__toggle').click()
  await expect(
    drawing.locator('.image-marquee__group').first().locator('img')
  ).toHaveCount(files.length)
})

test('featured photo masks wait 0.5 seconds and uncover downward in sequence', async ({
  page,
}) => {
  test.setTimeout(90000)
  let releasePhotography: () => void = () => {}
  let releaseIllustration: () => void = () => {}
  const photographyReady = new Promise<void>((resolve) => {
    releasePhotography = resolve
  })
  const illustrationReady = new Promise<void>((resolve) => {
    releaseIllustration = resolve
  })
  await page.route('https://assets.anuluca.com/Creative/**', async (route) => {
    await (route.request().url().includes('/Photography/')
      ? photographyReady
      : illustrationReady)
    await route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="white"/></svg>',
    })
  })
  await openCreative(page, 'no-preference')
  const photography = page.locator('.creative-photography__preview')
  await expect(photography).toHaveAttribute('data-entry-state', 'waiting')
  await expect(
    photography.locator('.image-marquee__entry-mask').first()
  ).toHaveCSS('background-color', 'rgb(139, 92, 199)')
  releasePhotography()
  for (const selector of [
    '.creative-photography__preview',
    '.creative-illustration__preview',
  ]) {
    const preview = page.locator(selector)
    await preview.scrollIntoViewIfNeeded()
    if (selector.includes('illustration')) releaseIllustration()
    await expect(preview).toHaveAttribute('data-entry-state', 'revealing')
    const sample = await preview.evaluate((root) => {
      const masks = [
        ...root.querySelectorAll<HTMLElement>(
          '.image-marquee__group:first-child .image-marquee__entry-mask'
        ),
      ]
      const animations = [
        ...root.querySelectorAll('.image-marquee__entry-mask'),
      ].flatMap((mask) => mask.getAnimations())
      const at = (time: number) => {
        for (const animation of animations) {
          animation.pause()
          animation.currentTime = time
        }
        return masks.map(
          (mask) => new DOMMatrixReadOnly(getComputedStyle(mask).transform).m22
        )
      }
      const covered = at(400)
      const staggered = at(650)
      const origin = parseFloat(
        getComputedStyle(masks[0]).transformOrigin.split(' ')[1]
      )
      const height = masks[0].offsetHeight
      for (const animation of animations) {
        animation.currentTime = 0
        animation.play()
      }
      return { covered, staggered, origin, height }
    })
    expect(sample.covered.every((scale) => Math.abs(scale - 1) < 0.001)).toBe(
      true
    )
    expect(sample.staggered[0]).toBeLessThan(sample.staggered[1])
    expect(sample.staggered[1]).toBeLessThan(1)
    expect(sample.staggered[2]).toBeCloseTo(1, 3)
    expect(sample.origin).toBeCloseTo(sample.height, 0)
    await expect(preview).toHaveAttribute('data-entry-state', 'complete')
    await expect(preview.locator('.image-marquee__entry-mask')).toHaveCount(0)
  }
})

const sampleToggle = (page: Page) =>
  page.locator(gallerySelector).evaluate(async (root) => {
    const samples: {
      mode: string
      opacity: number
      duration: string
      delay: string
      height: number
      buttonTop: number
      elapsed: number
      buttonCount: number
      buttonOpacity: number
      buttonExpanded: string | null
      heightAnimating: boolean
    }[] = []
    root.querySelector<HTMLButtonElement>('.flora-expand-button')!.click()
    const start = performance.now()
    await new Promise<void>((resolve) => {
      const sample = () => {
        const panels = root.querySelectorAll<HTMLElement>(
          '.creative-photography__preview, .creative-photography__all'
        )
        for (const panel of panels)
          samples.push({
            mode: panel.classList.contains('creative-photography__preview')
              ? 'preview'
              : 'all',
            opacity: Number(getComputedStyle(panel).opacity),
            duration: getComputedStyle(panel).transitionDuration,
            delay: getComputedStyle(panel).transitionDelay,
            elapsed: performance.now() - start,
            buttonCount: root.querySelectorAll('.flora-expand-button').length,
            buttonOpacity: Number(
              getComputedStyle(root.querySelector('.flora-expand-button')!)
                .opacity
            ),
            buttonExpanded: root
              .querySelector('.flora-expand-button')!
              .getAttribute('aria-expanded'),
            heightAnimating: root
              .querySelector('.creative-media__viewport')!
              .getAnimations()
              .some(
                (animation) =>
                  animation.playState === 'running' &&
                  Number(animation.currentTime) >
                    Number(animation.effect?.getTiming().delay || 0) + 100
              ),
            height: root
              .querySelector('.creative-photography__viewport')!
              .getBoundingClientRect().height,
            buttonTop: root
              .querySelector('.flora-expand-button')!
              .getBoundingClientRect().top,
          })
        const button = root.querySelector('.flora-expand-button')!
        const settled =
          performance.now() - start >= 1700 &&
          !button.hasAttribute('disabled') &&
          Number(getComputedStyle(button).opacity) > 0.99
        if (!settled && performance.now() - start < 4000)
          requestAnimationFrame(sample)
        else resolve()
      }
      requestAnimationFrame(sample)
    })
    return samples
  })

test('separate preview and full gallery fade out and in and settle after rapid toggles', async ({
  page,
}) => {
  test.setTimeout(90000)
  await openCreative(page, 'no-preference')
  const opening = await sampleToggle(page)
  const closing = await sampleToggle(page)
  for (const [samples, outgoing, incoming] of [
    [opening, 'preview', 'all'],
    [closing, 'all', 'preview'],
  ] as const) {
    expect(samples.every((sample) => sample.buttonCount === 1)).toBe(true)
    expect(
      samples.some(
        (sample) => sample.buttonOpacity > 0.05 && sample.buttonOpacity < 0.95
      )
    ).toBe(true)
    const duringHeight = samples.filter(
      (sample) => sample.elapsed > 250 && sample.heightAnimating
    )
    expect(duringHeight.length).toBeGreaterThan(5)
    expect(
      duringHeight.filter((sample) => sample.buttonOpacity >= 0.01)
    ).toEqual([])
    expect(
      duringHeight.every(
        (sample) => sample.buttonExpanded === String(outgoing === 'all')
      )
    ).toBe(true)
    expect(samples[samples.length - 1].buttonOpacity).toBeGreaterThan(0.95)
    expect(samples[samples.length - 1].buttonExpanded).toBe(
      String(incoming === 'all')
    )
    const leaving = samples.filter((sample) => sample.mode === outgoing)
    const entering = samples.filter((sample) => sample.mode === incoming)
    expect(
      leaving.filter((sample) => sample.opacity > 0.01 && sample.opacity < 0.99)
        .length
    ).toBeGreaterThan(2)
    expect(
      entering.filter(
        (sample) => sample.opacity > 0.01 && sample.opacity < 0.99
      ).length
    ).toBeGreaterThan(2)
    expect(leaving.some((sample) => sample.duration === '0.4s')).toBe(true)
    expect(entering.some((sample) => sample.duration === '0.4s')).toBe(true)
    expect(leaving.some((sample) => sample.delay === '0.2s')).toBe(true)
    expect(entering.some((sample) => sample.delay === '0.2s')).toBe(true)
    expect(leaving[0].opacity).toBeGreaterThan(
      leaving[leaving.length - 1].opacity
    )
    expect(entering[entering.length - 1].opacity).toBeGreaterThan(
      entering[0].opacity
    )
    const firstHeight = samples[0].height
    const lastHeight = samples[samples.length - 1].height
    expect(
      samples
        .filter((sample) => sample.elapsed < 180)
        .every((sample) => Math.abs(sample.height - firstHeight) <= 1)
    ).toBe(true)
    expect(
      samples.some(
        (sample) =>
          sample.elapsed >= 200 &&
          sample.elapsed < 450 &&
          Math.abs(sample.height - firstHeight) > 1
      )
    ).toBe(true)
    expect(
      (lastHeight - firstHeight) * (incoming === 'all' ? 1 : -1)
    ).toBeGreaterThan(100)
    expect(
      samples.filter(
        (sample) =>
          sample.height > Math.min(firstHeight, lastHeight) + 1 &&
          sample.height < Math.max(firstHeight, lastHeight) - 1
      ).length
    ).toBeGreaterThan(5)
  }
  await page.locator(gallerySelector).evaluate(async (root) => {
    const clickToggle = () =>
      root
        .querySelector<HTMLButtonElement>(
          '.flora-expand-button:not(.creative-photo-fade-leave-active .flora-expand-button)'
        )!
        .click()
    clickToggle()
    await new Promise(requestAnimationFrame)
    clickToggle()
    await new Promise(requestAnimationFrame)
    clickToggle()
  })
  await expect(
    page.locator(`${gallerySelector} .media-gallery__card`)
  ).toHaveCount(15)
  await expect(
    page.locator(`${gallerySelector} .creative-photography__all`)
  ).toBeVisible()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'island'
  )
})

test('drawing process modal loads its own directory and preserves background geometry', async ({
  page,
}) => {
  test.setTimeout(90000)
  await openCreative(page, 'reduce')
  let requests = 0
  await page.route(
    '**/__floratrium/media?pet=illustrationProcess**',
    (route) => {
      requests++
      const offset = Number(
        new URL(route.request().url()).searchParams.get('cursor') || 0
      )
      return route.fulfill({
        json: {
          items: Array.from({ length: offset ? 1 : 15 }, (_, i) => ({
            key: `Creative/illustration/prgress/${offset + i}.webp`,
            url: `https://assets.anuluca.com/Creative/illustration/prgress/20240610_014710_modified_time_compressed_862ec6b18416.webp?entry=${
              offset + i
            }`,
            type: 'image',
          })),
          totalItems: 16,
          totalPages: 2,
          nextCursor: offset ? null : '15',
        },
      })
    }
  )
  const drawing = page.locator('.creative-illustration')
  expect(requests).toBe(0)
  await drawing.locator('.creative-illustration__toggle').click()
  const trigger = drawing.getByRole('button', { name: '绘画过程', exact: true })
  await trigger.scrollIntoViewIfNeeded()
  await expect(trigger.locator('svg')).toHaveCount(1)
  await expect(trigger.locator('svg')).toHaveCSS('position', 'static')
  const gradient = await trigger.evaluate((button) => {
    const bounds = button.getBoundingClientRect()
    const pseudo = getComputedStyle(button, '::before')
    return {
      left: parseFloat(pseudo.left),
      width: bounds.width,
      right: pseudo.right,
      mask: pseudo.maskImage,
    }
  })
  expect(gradient.left).toBeCloseTo(gradient.width, 0)
  const layout = await trigger.evaluate((button) => {
    const container = button
      .closest('.creative-illustration')!
      .getBoundingClientRect()
    const bounds = button.getBoundingClientRect()
    const pagination = button
      .closest('.creative-illustration')!
      .querySelector('.flora-album-gallery__pagination')!
      .getBoundingClientRect()
    return {
      iconLeft:
        button.querySelector('svg')!.getBoundingClientRect().left - bounds.left,
      iconRight: button.querySelector('svg')!.getBoundingClientRect().right,
      textLeft: button.querySelector('span')!.getBoundingClientRect().left,
      left: bounds.left - container.left,
      center:
        (bounds.top + bounds.bottom - pagination.top - pagination.bottom) / 2,
      right: bounds.right,
      paginationLeft: pagination.left,
    }
  })
  expect(layout.iconLeft).toBeGreaterThanOrEqual(0)
  expect(layout.iconRight).toBeLessThanOrEqual(layout.textLeft)
  expect(Math.abs(layout.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(layout.center)).toBeLessThanOrEqual(1)
  expect(layout.right).toBeLessThanOrEqual(layout.paginationLeft)
  const position = () =>
    page.evaluate(() => {
      const anchor = document.querySelector('.creative-illustration')!
      return {
        top: anchor.getBoundingClientRect().top,
        width: document.body.getBoundingClientRect().width,
        scroll: anchor.closest('.scroll-viewport__scroll')?.scrollTop || 0,
      }
    })
  const before = await position()
  await trigger.click()
  const modal = page
    .locator('.modal-wrapper-dialog')
    .filter({ has: page.locator('.creative-process') })
  await expect(modal).toBeVisible()
  await expect(modal.locator('h2')).toHaveText('绘画过程')
  await expect(page.locator('.modal-background-title__track')).toContainText(
    '绘画过程'
  )
  await expect(modal.locator('.media-gallery__card')).toHaveCount(15)
  expect(await position()).toEqual(before)
  const scrollRegion = modal.locator('.modal-scroll-region')
  await expect(scrollRegion.locator('h2')).toHaveCount(0)
  await expect(modal.locator('.modal-fixed-header h2')).toHaveText('绘画过程')
  const headerTop = await modal
    .locator('h2')
    .evaluate((element) => element.getBoundingClientRect().top)
  const progress = modal.locator('.modal-scroll-progress')
  await expect(scrollRegion).toHaveCSS('scrollbar-width', 'none')
  await expect(progress).toHaveCount(1)
  await expect
    .poll(() =>
      scrollRegion.evaluate(
        (element) => element.scrollHeight - element.clientHeight
      )
    )
    .toBeGreaterThan(0)
  await scrollRegion.evaluate((element) => {
    element.scrollTop = (element.scrollHeight - element.clientHeight) / 2
  })
  await expect
    .poll(() =>
      progress.evaluate((element) =>
        parseFloat(
          (element as HTMLElement).style.getPropertyValue(
            '--page-scroll-progress-scale'
          )
        )
      )
    )
    .toBeCloseTo(0.5, 1)
  expect(await position()).toEqual(before)
  expect(
    Math.abs(
      (await modal
        .locator('h2')
        .evaluate((element) => element.getBoundingClientRect().top)) - headerTop
    )
  ).toBeLessThanOrEqual(1)
  await scrollRegion.evaluate((element) => {
    element.scrollTop = element.scrollHeight
  })
  await expect
    .poll(() =>
      progress.evaluate((element) =>
        parseFloat(
          (element as HTMLElement).style.getPropertyValue(
            '--page-scroll-progress-scale'
          )
        )
      )
    )
    .toBeCloseTo(1, 2)
  await modal.getByRole('button', { name: '第 2 页', exact: true }).click()
  await expect(modal.locator('.media-gallery__card')).toHaveCount(1)
  await modal.locator('.media-gallery__open').click()
  const viewer = page.locator('.el-image-viewer__wrapper')
  await expect(viewer).toBeVisible()
  expect(await position()).toEqual(before)
  await viewer.locator('.el-image-viewer__close').click()
  await expect(viewer).toBeHidden()
  await expect(modal).toBeVisible()
  await modal.locator('.diamond-close-btn').click()
  await expect(modal).toBeHidden()
  expect(await position()).toEqual(before)
  await trigger.click()
  await expect(modal.locator('.media-gallery__card')).toHaveCount(15)
  await page.evaluate(async () => {
    const { default: i18n } = await import('/src/locales/index.ts')
    i18n.global.locale.value = 'en'
  })
  await expect(modal.locator('h2')).toHaveText('DRAW PROGRESS')
  await expect(page.locator('.modal-background-title__track')).toContainText(
    'DRAW PROGRESS'
  )
})
