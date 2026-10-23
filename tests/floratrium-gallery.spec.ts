import { expect, type Page, test } from '@playwright/test'

import { petAlbums } from '../src/locales/dynamic/petAlbums'
import { getFloraCaptureDate } from '../src/utils/floratriumMedia'
import { loadFloraMediaPage } from '../worker/src/floratrium'

test.describe.configure({ timeout: 60000 })

const dismissMobileNotice = async (page: Page) => {
  const needed = await page.evaluate(
    () =>
      matchMedia('(hover: none) and (pointer: coarse)').matches &&
      Number(
        localStorage.getItem('anutrium:mobile-experience-alert-dismiss-until')
      ) <= Date.now()
  )
  if (!needed) return
  const close = page.locator('.mobile-experience-alert .el-alert__close-btn')
  // 提示条等首次入场遮罩结束才挂载，不能仅检查当前是否可见。
  await expect(close).toBeVisible({ timeout: 20000 })
  await close.click()
  await expect(page.locator('.mobile-experience-alert')).toHaveCount(0)
}

test('responsive album sizing, expansion and character rail placement', async ({
  page,
}, info) => {
  test.setTimeout(60000)
  const mobile = info.project.name.includes('mobile')
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/__floratrium/media?**', (route) =>
    route.fulfill({
      json: {
        items: petAlbums.huahua.defaults.map((item, index) => ({
          ...item,
          key: `fixture-${index}`,
        })),
        nextCursor: null,
      },
    })
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 30000,
  })
  const point = (await stage.getAttribute('data-companion-screen'))!
    .split(',')
    .map(Number)
  await page.mouse.click(point[0], point[1])
  await dismissMobileNotice(page)
  const gallery = page.locator('.flora-album-gallery[data-album-position="0"]')
  const toggleWithMotion = () =>
    page.evaluate(async () => {
      const album = document.querySelector(
        '.flora-album-gallery[data-album-position="0"]'
      )!
      const button = album.querySelector<HTMLButtonElement>(
        '.flora-album-gallery__expand'
      )!
      const character = document.querySelector(
        '.flora-focus-layout__character'
      )!
      const initial = button.getBoundingClientRect().toJSON()
      const initialLeft = album.getBoundingClientRect().left
      const frames: Array<{
        x: number
        y: number
        width: number
        height: number
        left: number
        opacity: number
      }> = []
      button.click()
      const deadline = performance.now() + 1000
      await new Promise<void>((resolve) => {
        const sample = () => {
          const rect = button.getBoundingClientRect()
          frames.push({
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            left: album.getBoundingClientRect().left,
            opacity: Number(getComputedStyle(character).opacity),
          })
          if (performance.now() < deadline) requestAnimationFrame(sample)
          else resolve()
        }
        requestAnimationFrame(sample)
      })
      return { initial, initialLeft, frames }
    })
  const checkMotion = (
    result: Awaited<ReturnType<typeof toggleWithMotion>>
  ) => {
    for (const key of ['width', 'height'] as const)
      expect(
        Math.max(
          ...result.frames.map((frame) =>
            Math.abs(frame[key] - result.initial[key])
          )
        )
      ).toBeLessThanOrEqual(1)
    expect(
      result.frames.some((frame) => frame.opacity > 0 && frame.opacity < 1)
    ).toBe(true)
    expect(
      Math.max(
        ...result.frames.map((frame) =>
          Math.abs(frame.left - result.initialLeft)
        )
      )
    ).toBeLessThanOrEqual(1)
  }
  await expect(gallery).toBeVisible()
  const collapsedAlbumBounds = (await gallery.boundingBox())!
  await expect(page.locator('.flora-identity-bar__gender')).toHaveCSS(
    'opacity',
    mobile ? '1' : '0.6'
  )
  const titleSize = await gallery
    .locator('.flora-album-gallery__title')
    .evaluate((title) => parseFloat(getComputedStyle(title).fontSize))
  expect(titleSize).toBeCloseTo(
    Math.min(mobile ? (44 * 2) / 3 : 72, collapsedAlbumBounds.width * 0.075),
    2
  )
  await expect(gallery.locator('.flora-album-gallery__expand')).toHaveCSS(
    'font-size',
    mobile ? '18px' : '36px'
  )
  if (mobile) {
    const railGeometry = await page
      .locator('.flora-character-rail')
      .evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        const slots = element.querySelectorAll('.flora-character-rail__slot')
        const first = slots[0].getBoundingClientRect()
        const last = slots[slots.length - 1].getBoundingClientRect()
        return {
          width: bounds.width,
          height: bounds.height,
          topPadding: first.top - bounds.top,
          bottomPadding: bounds.bottom - last.bottom,
          ballSize: first.width,
          slots: slots.length,
        }
      })
    expect(railGeometry.slots).toBe(2)
    expect(railGeometry.height / railGeometry.width).toBeCloseTo(86 / 44, 2)
    expect(railGeometry.ballSize).toBeCloseTo(32 * 0.85, 1)
    expect(railGeometry.topPadding).toBeGreaterThanOrEqual(4)
    expect(railGeometry.bottomPadding).toBeGreaterThanOrEqual(4)
    expect((await gallery.boundingBox())!.height).toBeGreaterThanOrEqual(72)
    expect((await gallery.boundingBox())!.height).toBeLessThanOrEqual(
      (await page.locator('.flora-media-region').boundingBox())!.height
    )
    await expect
      .poll(() =>
        page.locator('.flora-character-rail').evaluate((rail) => {
          const symbols = document
            .querySelector('.flora-number-bar__symbols')!
            .getBoundingClientRect()
          const bounds = rail.getBoundingClientRect()
          return (
            Math.abs(bounds.right - symbols.right) <= 1 &&
            bounds.top >= symbols.bottom + 7
          )
        })
      )
      .toBe(true)
    await page.screenshot({
      path: `.tmp/flora-responsive-collapsed-${info.project.name}.png`,
    })
  }
  if (mobile) {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    checkMotion(await toggleWithMotion())
  } else
    await gallery.getByRole('button', { name: 'EXPAND', exact: true }).click()
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(10)
  if (mobile) {
    const layout = await gallery.evaluate((element) => {
      const root = document
        .querySelector('.flora-focus-layout')!
        .getBoundingClientRect()
      const bounds = element.getBoundingClientRect()
      const viewport = element.querySelector('.flora-album-gallery__viewport')!
      const footer = element.querySelector('.flora-album-gallery__footer')!
      const footerStyle = getComputedStyle(footer)
      const pager = footer.querySelector('nav')!.getBoundingClientRect()
      const control = element
        .querySelector('.flora-album-gallery__expand')!
        .getBoundingClientRect()
      return {
        height: bounds.height,
        available: root.height,
        left: bounds.left,
        right: innerWidth - bounds.right,
        inset: getComputedStyle(viewport).paddingLeft,
        viewportTopGap: viewport.getBoundingClientRect().top - bounds.top,
        titleHeight: element
          .querySelector('.flora-album-gallery__title')!
          .getBoundingClientRect().height,
        listTopGap:
          element.querySelector('.media-gallery')!.getBoundingClientRect().top -
          viewport.getBoundingClientRect().top,
        footerTop: footerStyle.paddingTop,
        pagerLeftGap: pager.left - footer.getBoundingClientRect().left,
        footerBottom: footerStyle.paddingBottom,
        controlsOverlap:
          pager.right > control.left && pager.bottom > control.top,
      }
    })
    expect(layout.height).toBeGreaterThan(layout.available * 0.8)
    expect(layout.left).toBeCloseTo(collapsedAlbumBounds.x, 0)
    expect(layout.right).toBeCloseTo(collapsedAlbumBounds.x, 0)
    expect(layout.inset).toBe('8px')
    expect(layout.viewportTopGap).toBeCloseTo(layout.titleHeight + 16, 0)
    expect(layout.listTopGap).toBeCloseTo(8, 0)
    expect(layout.footerTop).toBe('8px')
    expect(layout.pagerLeftGap).toBeCloseTo(8, 0)
    expect(layout.footerBottom).toBe('8px')
    expect(layout.controlsOverlap).toBe(false)
    await expect(page.locator('.flora-focus-layout__character')).toHaveCSS(
      'opacity',
      '0'
    )
    await expect(page.locator('.flora-pet-level')).toHaveCSS('opacity', '0')
    await expect(stage.locator('canvas')).toHaveCSS('visibility', 'hidden')
    await page.screenshot({
      path: `.tmp/flora-responsive-expanded-${info.project.name}.png`,
    })
  }
  if (mobile) checkMotion(await toggleWithMotion())
  else
    await gallery.getByRole('button', { name: 'COLLAPSE', exact: true }).click()
  await expect(page.locator('.flora-character-rail')).toBeVisible()
  await expect(stage.locator('canvas')).toHaveCSS('visibility', 'visible')
  if (mobile) {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await gallery.getByRole('button', { name: 'EXPAND', exact: true }).click()
    for (const element of [
      gallery,
      page.locator('.flora-focus-layout__character'),
    ])
      expect(
        await element.evaluate((node) =>
          getComputedStyle(node)
            .transitionDuration.split(',')
            .every((duration) => parseFloat(duration) <= 0.001)
        )
      ).toBe(true)
    await gallery.getByRole('button', { name: 'COLLAPSE', exact: true }).click()
    await page.getByRole('button', { name: '切换导航菜单' }).click()
    await expect(
      page.locator('.mobile-menu-items .little-title').first()
    ).toHaveText('首页')
    await expect(
      page.locator('.mobile-menu-items .little-title').nth(1)
    ).toHaveText('个人海湾')
  }
})

test('capture dates come from filenames and reject invalid calendar dates', ({
  browserName,
}) => {
  expect(browserName).toBe('chromium')
  expect(
    getFloraCaptureDate('Floratrium/flora/20250603_180916_compressed.webp')
  ).toBe('2025-06-03')
  expect(
    getFloraCaptureDate(
      'https://assets.anuluca.com/Floratrium/hei/20240229_100000.mp4?image=card-thumb'
    )
  ).toBe('2024-02-29')
  expect(getFloraCaptureDate('20250229_100000.webp')).toBeNull()
  expect(getFloraCaptureDate('20251301_100000.webp')).toBeNull()
  expect(getFloraCaptureDate('photo.webp')).toBeNull()
})

test('R2 pages fill twenty-eight supported media entries without dropping filtered objects', async ({
  browserName,
}, info) => {
  test.skip(
    info.project.name.includes('mobile'),
    `${browserName} 服务端分页逻辑共用`
  )
  const keys = [
    ...Array.from({ length: 13 }, (_, i) => `Floratrium/flora/.hidden-${i}`),
    ...Array.from(
      { length: 103 },
      (_, i) => `Floratrium/flora/${String(i).padStart(3, '0')}.webp`
    ),
    'Floratrium/flora/end.mp4',
  ]
  const limits: number[] = []
  const bucket = {
    list: async (options: { cursor?: string; limit: number }) => {
      limits.push(options.limit)
      const start = Number(options.cursor || 0)
      const end = Math.min(keys.length, start + Math.min(options.limit, 31))
      return {
        objects: keys.slice(start, end).map((key) => ({ key })),
        truncated: end < keys.length,
        cursor: String(end),
        delimitedPrefixes: [],
      }
    },
  } as Parameters<typeof loadFloraMediaPage>[0]
  const first = await loadFloraMediaPage(bucket, 'flora')
  const second = await loadFloraMediaPage(bucket, 'flora', first.nextCursor!)
  const third = await loadFloraMediaPage(bucket, 'flora', second.nextCursor!)
  const fourth = await loadFloraMediaPage(bucket, 'flora', third.nextCursor!)
  expect([
    first.items.length,
    second.items.length,
    third.items.length,
    fourth.items.length,
  ]).toEqual([28, 28, 28, 20])
  expect(
    new Set(
      [...first.items, ...second.items, ...third.items, ...fourth.items].map(
        (item) => item.key
      )
    ).size
  ).toBe(104)
  expect(first.items[0].type).toBe('video')
  expect(first.totalPages).toBe(4)
  expect(
    [...first.items, ...second.items, ...third.items, ...fourth.items].map(
      (item) => item.key
    )
  ).toEqual(
    keys
      .filter((key) => !key.includes('/.hidden-'))
      .sort()
      .reverse()
  )
  expect(fourth.nextCursor).toBeNull()
  expect(limits).toHaveLength(Math.ceil(keys.length / 31))
  expect(limits.every((limit) => limit > 0 && limit <= 1000)).toBe(true)
})

test('online defaults, upward expansion, paging, refresh and pet reset preserve the page', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 45000,
  })
  if (info.project.name.includes('mobile'))
    await page.locator('.mobile-experience-alert .el-alert__close-btn').click()
  const point = (await stage.getAttribute('data-companion-screen'))!
    .split(',')
    .map(Number)
  await page.mouse.click(point[0], point[1])
  await dismissMobileNotice(page)
  await page.mouse.move(0, 0)
  const gallery = page.locator('.flora-album-gallery[data-album-position="0"]')
  await expect(
    gallery.locator(
      '.flora-album-strip__group:not([aria-hidden]) .flora-album-strip__photo'
    )
  ).toHaveCount(10)
  await expect(gallery.locator('img').first()).toHaveAttribute(
    'src',
    /^https:\/\/assets\.anuluca\.com\/Floratrium\/.+\?image=card-thumb$/
  )
  await expect
    .poll(() =>
      gallery
        .locator('img')
        .first()
        .evaluate((image) => (image as HTMLImageElement).naturalWidth)
    )
    .toBeGreaterThan(0)
  await expect
    .poll(
      () =>
        gallery
          .locator('.flora-album-strip__group:not([aria-hidden]) img')
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0
            )
          ),
      { timeout: 20000 }
    )
    .toBe(true)
  await expect(gallery.locator('.media-gallery__info')).toHaveCount(0)
  const layout = await gallery.evaluate((element) => {
    const title = element.querySelector<HTMLElement>(
      '.flora-album-gallery__title'
    )!
    const images = Array.from(
      element.querySelectorAll<HTMLImageElement>(
        '.flora-album-strip__group:not([aria-hidden]) img'
      )
    )
    const rects = images.map((image) => image.getBoundingClientRect())
    const button = element.querySelector<HTMLElement>(
      '.flora-album-gallery__expand'
    )!
    const label = button.querySelector('span')!
    return {
      titleFont: getComputedStyle(title).fontFamily,
      titleWeight: getComputedStyle(title).fontWeight,
      titleSize: getComputedStyle(title).fontSize,
      titleBottom: title.getBoundingClientRect().bottom,
      titleTop: title.getBoundingClientRect().top,
      overflowBottom: element.getBoundingClientRect().top,
      overflowTop: element.getBoundingClientRect().top - 32,
      heights: rects.map((rect) => rect.height),
      gaps: rects.slice(1).map((rect, index) => rect.left - rects[index].right),
      buttonLeft: button.getBoundingClientRect().left,
      buttonRight: button.getBoundingClientRect().right,
      viewportLeft: element
        .querySelector('.flora-album-strip__viewport')!
        .getBoundingClientRect().left,
      viewportRight: element
        .querySelector('.flora-album-strip__viewport')!
        .getBoundingClientRect().right,
      stripLeft: element.getBoundingClientRect().left,
      stripRight: element.getBoundingClientRect().right,
      font: getComputedStyle(label).fontFamily,
      italic: getComputedStyle(label).fontStyle,
      rotation: getComputedStyle(label).transform,
      spacing: parseFloat(getComputedStyle(label).letterSpacing) || 0,
    }
  })
  expect(layout.titleFont).toContain('UnboundedSans')
  expect(layout.titleWeight).toBe('400')
  expect(parseFloat(layout.titleSize)).toBeCloseTo(
    Math.min(
      info.project.name.includes('mobile') ? (44 * 2) / 3 : 72,
      (layout.stripRight - layout.stripLeft) * 0.075
    ),
    2
  )
  expect(layout.titleTop).toBeLessThan(layout.overflowBottom)
  expect(layout.titleBottom).toBeGreaterThan(layout.overflowTop)
  expect(
    Math.max(...layout.heights) - Math.min(...layout.heights)
  ).toBeLessThanOrEqual(1)
  expect(layout.gaps.every((gap) => Math.abs(gap - 12) <= 1)).toBe(true)
  const repeatedLoadMeasurements = await gallery.evaluate(async (element) => {
    const group = element.querySelector<HTMLElement>(
      '.flora-album-strip__group'
    )!
    const offsetWidth = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetWidth'
    )!.get!
    let reads = 0
    Object.defineProperty(group, 'offsetWidth', {
      configurable: true,
      get() {
        reads++
        return offsetWidth.call(group)
      },
    })
    for (const image of group.querySelectorAll('img')) {
      image.dispatchEvent(new Event('load'))
      image.dispatchEvent(new Event('load'))
    }
    await new Promise((resolve) => setTimeout(resolve, 0))
    Reflect.deleteProperty(group, 'offsetWidth')
    return reads
  })
  expect(repeatedLoadMeasurements).toBe(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const strip = gallery.locator('.flora-album-strip')
  await expect(strip).toHaveClass(/is-running/)
  const loop = await strip.evaluate((element) => {
    const positions = [
      ...element.querySelectorAll<HTMLElement>('.flora-album-strip__position'),
    ]
    return positions.map((card) => {
      const animation = card.getAnimations()[0]
      const frames = (animation.effect as KeyframeEffect).getKeyframes()
      return {
        iterations: animation.effect!.getTiming().iterations,
        first: Number(frames[0].opacity),
        last: Number(frames.at(-1)!.opacity),
        transform: frames[0].transform,
      }
    })
  })
  expect(loop).toHaveLength(10)
  expect(
    loop.every(
      (card) =>
        card.iterations === Infinity &&
        card.first === 0 &&
        card.last === 0 &&
        String(card.transform).includes('translate3d')
    )
  ).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(layout.buttonRight).toBeLessThan(layout.stripRight)
  expect(layout.viewportLeft - layout.stripLeft).toBeGreaterThanOrEqual(
    info.project.name.includes('mobile') ? 7 : 19
  )
  expect(layout.font).toContain('Anton')
  expect(layout.italic).toBe('normal')
  expect(layout.rotation).toBe('none')
  expect(layout.spacing).toBe(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.mouse.move(10, 10)
  const track = gallery.locator('.flora-album-strip__position').first()
  await expect
    .poll(() =>
      track.evaluate((element) => element.getAnimations()[0]?.playState)
    )
    .toBe('running')
  const initialTransform = await track.evaluate(
    (element) => getComputedStyle(element).transform
  )
  await expect
    .poll(() =>
      track.evaluate((element) => getComputedStyle(element).transform)
    )
    .not.toBe(initialTransform)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const before = await gallery.boundingBox()
  const bodyWidth = await page.evaluate(
    () => document.body.getBoundingClientRect().width
  )
  const base = petAlbums.huahua.defaults[0].url
  const fixtures = Array.from({ length: 50 }, (_, i) => ({
    key: `fixture-${i}`,
    url: `${base}?fixture=${i}`,
    type: 'image',
  }))
  let requests = 0
  await page.route('**/__floratrium/media?**', (route) => {
    const url = new URL(route.request().url())
    if (url.searchParams.get('pet') === 'hei') return route.continue()
    requests++
    const second = !!url.searchParams.get('cursor')
    return route.fulfill({
      json: {
        items: second ? fixtures.slice(28) : fixtures.slice(0, 28),
        nextCursor: second ? null : 'page-two',
      },
    })
  })
  await gallery.getByRole('button', { name: 'EXPAND', exact: true }).click()
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(28)
  await expect(
    gallery.locator('.media-gallery__card img').first()
  ).toHaveAttribute('src', /[?&]image=card-thumb(?:&|$)/)
  await expect(gallery.locator('.photo-info__time').first()).toHaveText(
    getFloraCaptureDate(base)!
  )
  const after = (await gallery.boundingBox())!
  expect(after.y).toBeLessThan(before!.y)
  if (info.project.name.includes('mobile')) {
    expect(after.y).toBeCloseTo(0, 0)
    expect(after.height).toBeCloseTo(page.viewportSize()!.height, 0)
  } else
    expect(
      Math.abs(after.y + after.height - before!.y - before!.height)
    ).toBeLessThanOrEqual(1)
  const firstNode = await gallery
    .locator('.media-gallery__card')
    .first()
    .elementHandle()
  await expect.poll(() => requests, { timeout: 20000 }).toBeGreaterThan(1)
  expect(await firstNode!.evaluate((node) => node.isConnected)).toBe(true)
  await gallery.getByRole('button', { name: '下一页', exact: true }).click()
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(22)
  await expect(
    gallery.getByRole('button', { name: '下一页', exact: true })
  ).toBeDisabled()
  await gallery.getByRole('button', { name: '上一页', exact: true }).click()
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(28)
  if (info.project.name.includes('mobile'))
    await gallery.getByRole('button', { name: 'COLLAPSE', exact: true }).click()
  await page.locator('button[data-pet-id="xiaohei"]').click()
  await expect(stage).toHaveAttribute('data-pet-id', 'xiaohei')
  await expect(gallery).not.toHaveClass(/is-expanded/)
  await expect(
    gallery.locator(
      '.flora-album-strip__group:not([aria-hidden]) .flora-album-strip__photo'
    )
  ).toHaveCount(7)
  const heiResponse = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return (
      url.pathname === '/__floratrium/media' &&
      url.searchParams.get('pet') === 'hei'
    )
  })
  await gallery.getByRole('button', { name: 'EXPAND', exact: true }).click()
  const heiPage = await (await heiResponse).json()
  await expect(gallery.locator('video')).not.toHaveCount(0)
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(
    heiPage.items.length
  )
  await gallery.getByRole('button', { name: 'COLLAPSE', exact: true }).click()
  await gallery.locator('.flora-album-strip__photo').first().click()
  await expect(page.locator('.el-image-viewer__wrapper')).toBeVisible()
  expect(
    Math.abs(
      (await page.evaluate(() => document.body.getBoundingClientRect().width)) -
        bodyWidth
    )
  ).toBeLessThanOrEqual(1)
  await page.locator('.el-image-viewer__close').click()
  await expect(page.locator('.el-image-viewer__wrapper')).toHaveCount(0)
  expect(
    Math.abs(
      (await page.evaluate(() => document.body.getBoundingClientRect().width)) -
        bodyWidth
    )
  ).toBeLessThanOrEqual(1)
  await page.screenshot({
    path: `.tmp/floratrium-gallery-${info.project.name}.png`,
  })
})

test('cached photos remain visible after repeated full-to-selected switches', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/__floratrium/media?**', (route) =>
    route.fulfill({
      json: {
        items: petAlbums.huahua.defaults,
        nextCursor: null,
        totalPages: 1,
      },
    })
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 45000,
  })
  const point = (await stage.getAttribute('data-companion-screen'))!
    .split(',')
    .map(Number)
  await page.mouse.click(point[0], point[1])
  await dismissMobileNotice(page)
  const gallery = page.locator('.flora-album-gallery[data-album-position="0"]')
  const firstFilename = petAlbums.huahua.defaults[0].key.split('/').pop()!
  const firstImage = gallery.locator(`img[src*="${firstFilename}"]`).first()
  await expect(firstImage).toBeVisible()
  await expect
    .poll(() =>
      firstImage.evaluate((img) => (img as HTMLImageElement).naturalWidth)
    )
    .toBeGreaterThan(0)
  for (let round = 0; round < 2; round++) {
    await gallery.getByRole('button', { name: 'EXPAND', exact: true }).click()
    await expect(gallery).toHaveClass(/is-expanded/)
    await firstImage.scrollIntoViewIfNeeded()
    await expect(firstImage).toHaveCSS('opacity', '1')
    await gallery.getByRole('button', { name: 'COLLAPSE', exact: true }).click()
    await expect(gallery).not.toHaveClass(/is-expanded/)
    await expect(firstImage).toHaveCSS('opacity', '1')
    await expect
      .poll(() =>
        firstImage.evaluate((img) => (img as HTMLImageElement).naturalWidth)
      )
      .toBeGreaterThan(0)
  }
})

test('albums close before returning home', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/__floratrium/media?**', (route) =>
    route.fulfill({ json: { items: [], nextCursor: null } })
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 45000,
  })
  const point = (await stage.getAttribute('data-companion-screen'))!
    .split(',')
    .map(Number)
  await page.mouse.click(point[0], point[1])
  await dismissMobileNotice(page)
  const gallery = page.locator('.flora-album-gallery[data-album-position="0"]')
  await gallery.getByRole('button', { name: 'EXPAND', exact: true }).click()
  await expect(gallery).toHaveClass(/is-expanded/)
  if (info.project.name.includes('mobile'))
    await gallery.getByRole('button', { name: 'COLLAPSE', exact: true }).click()
  else await page.mouse.click(10, 180)
  await expect(gallery).not.toHaveClass(/is-expanded/)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'sprigatito'
  )
  await page.mouse.click(10, 180)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none'
  )
  await expect(gallery).not.toBeAttached()
})

test('triangle pagination supports direct page jumps without scanning unseen pages', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  let holdSecondPage = false
  let releaseSecondPage: (() => void) | undefined
  await page.route('**/__floratrium/media?**', async (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor')
    const index = cursor ? Number(cursor) / 28 : 0
    if (index === 1 && holdSecondPage)
      await new Promise<void>((resolve) => {
        releaseSecondPage = resolve
      })
    return route.fulfill({
      json: {
        items: [
          {
            key: `page-${index}`,
            url: `${petAlbums.huahua.defaults[0].url}?page=${index}`,
            type: 'image',
          },
        ],
        nextCursor: index < 2 ? String((index + 1) * 28) : null,
        totalPages: 3,
      },
    })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 45000,
  })
  const point = (await stage.getAttribute('data-companion-screen'))!
    .split(',')
    .map(Number)
  await page.mouse.click(point[0], point[1])
  await dismissMobileNotice(page)
  const gallery = page.locator('.flora-album-gallery[data-album-position="0"]')
  await gallery.getByRole('button', { name: 'EXPAND', exact: true }).click()
  const pages = gallery.locator('.flora-album-gallery__page-numbers button')
  await expect(pages).toHaveText(['1', '2', '3'])
  await expect(gallery.getByRole('spinbutton')).toHaveCount(0)
  await expect(pages.nth(0)).toHaveAttribute('aria-current', 'page')
  await expect(
    gallery.getByRole('button', { name: '上一页', exact: true })
  ).toBeDisabled()
  await pages.nth(2).click()
  await expect(pages.nth(2)).toHaveAttribute('aria-current', 'page')
  await expect(
    gallery.locator('.media-gallery__card img').first()
  ).toHaveAttribute('src', /page=2/)
  await expect(
    gallery.getByRole('button', { name: '下一页', exact: true })
  ).toBeDisabled()
  await pages.nth(0).click()
  await expect(
    gallery.locator('.media-gallery__card img').first()
  ).toHaveAttribute('src', /page=0/)
  holdSecondPage = true
  await pages.nth(1).click()
  await expect(pages.nth(1)).toHaveAttribute('aria-current', 'page')
  await expect.poll(() => Boolean(releaseSecondPage)).toBe(true)
  const canceled = page.waitForEvent(
    'requestfailed',
    (request) => new URL(request.url()).searchParams.get('cursor') === '28'
  )
  await pages.nth(2).click()
  await canceled
  await expect(
    gallery.locator('.media-gallery__card img').first()
  ).toHaveAttribute('src', /page=2/)
  releaseSecondPage?.()
  holdSecondPage = false
  await pages.nth(0).click()
  await expect(
    gallery.locator('.media-gallery__card img').first()
  ).toHaveAttribute('src', /page=0/)
  const delta = await gallery.evaluate((element) => {
    const container = element.getBoundingClientRect()
    const nav = element
      .querySelector('.flora-album-gallery__pagination')!
      .getBoundingClientRect()
    return Math.abs(
      (container.left + container.right - nav.left - nav.right) / 2
    )
  })
  if (!info.project.name.includes('mobile'))
    expect(delta).toBeLessThanOrEqual(1)
  await gallery.getByRole('button', { name: 'COLLAPSE', exact: true }).click()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await gallery.getByRole('button', { name: 'EXPAND', exact: true }).click()
  await expect
    .poll(() =>
      gallery.evaluate((element) =>
        element
          .getAnimations()
          .some((animation) => animation.effect?.getTiming().duration === 850)
      )
    )
    .toBe(true)
  const blades = gallery.locator('.flora-album-gallery__background span')
  await expect(blades).toHaveCount(12)
  await expect(blades.first()).toHaveCSS('animation-delay', '0s')
  await expect(blades.last()).toHaveCSS('animation-delay', '0.264s')
  await gallery.screenshot({
    path: `.tmp/flora-pagination-${info.project.name}.png`,
  })
})

test('mobile album keeps its left anchor while expanding to full width', async ({
  page,
}, info) => {
  test.skip(!info.project.name.includes('mobile'), '手机端横向边界回归')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/__floratrium/media?**', (route) =>
    route.fulfill({
      json: { items: petAlbums.huahua.defaults, nextCursor: null },
    })
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 45000,
  })
  const point = (await stage.getAttribute('data-companion-screen'))!
    .split(',')
    .map(Number)
  await page.mouse.click(point[0], point[1])
  await dismissMobileNotice(page)
  const gallery = page.locator('.flora-album-gallery[data-album-position="0"]')
  await expect(gallery).toBeVisible()
  const initialLayer = await page
    .locator('.layout-page')
    .evaluate((element) => getComputedStyle(element).zIndex)
  await expect(page.locator('.mobile-screen-frame-bottom')).toHaveCount(1)
  const layers = await page.locator('.temple-stage').evaluate((stage) => {
    const canvas = stage.querySelector('canvas')!
    const frame = stage.querySelector('.mobile-screen-frame-bottom')!
    const content = stage.querySelector('.flora-focus-layout')!
    return [canvas, frame, content].map((element) =>
      Number(getComputedStyle(element).zIndex)
    )
  })
  expect(layers[0]).toBeLessThan(layers[1])
  expect(layers[1]).toBeLessThan(layers[2])
  const frameLayer = await page
    .locator('.mobile-screen-frame-bottom')
    .evaluate((element) => Number(getComputedStyle(element).zIndex))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  for (const opening of [true, false]) {
    const result = await gallery.evaluate(async (element) => {
      const initial = element.getBoundingClientRect()
      element
        .querySelector<HTMLButtonElement>('.flora-album-gallery__expand')!
        .click()
      let maxShift = 0
      const until = performance.now() + 1000
      await new Promise<void>((resolve) => {
        const sample = () => {
          const current = element.getBoundingClientRect()
          maxShift = Math.max(maxShift, Math.abs(current.left - initial.left))
          if (performance.now() < until) requestAnimationFrame(sample)
          else resolve()
        }
        requestAnimationFrame(sample)
      })
      return {
        maxShift,
        heightChange: element.getBoundingClientRect().height - initial.height,
      }
    })
    expect(result.maxShift).toBeLessThanOrEqual(1)
    if (opening) {
      expect(
        await page
          .locator('.layout-page')
          .evaluate((element) => Number(getComputedStyle(element).zIndex))
      ).toBeGreaterThan(frameLayer)
      await expect(gallery).toHaveClass(/is-expanded/)
      const bounds = (await gallery.boundingBox())!
      expect(Math.abs(bounds.y)).toBeLessThanOrEqual(1)
      expect(
        Math.abs(bounds.y + bounds.height - page.viewportSize()!.height)
      ).toBeLessThanOrEqual(1)
      await expect(page.locator('.footer-com')).toHaveCSS('opacity', '0')
      await expect(page.locator('.el-menu-layout-all')).toHaveCSS(
        'opacity',
        '0'
      )
      await expect(page.locator('.mobile-menu-icon')).toHaveCSS('opacity', '0')
      await expect(page.locator('.flora-album-gallery__decoration')).toHaveCSS(
        'opacity',
        '0'
      )
      const control = (await gallery
        .locator('.flora-album-gallery__expand')
        .boundingBox())!
      expect(control.y + control.height).toBeCloseTo(
        page.viewportSize()!.height - 8,
        0
      )
    } else {
      await expect(page.locator('.layout-page')).toHaveCSS(
        'z-index',
        initialLayer
      )
      await expect(gallery).not.toHaveClass(/is-expanded/)
      await expect(page.locator('.footer-com')).toHaveCSS('opacity', '1')
      await expect(page.locator('.el-menu-layout-all')).toHaveCSS(
        'opacity',
        '1'
      )
      await expect(page.locator('.mobile-menu-icon')).toHaveCSS('opacity', '1')
      await expect(page.locator('.flora-album-gallery__decoration')).toHaveCSS(
        'opacity',
        '1'
      )
    }
  }
})

test('album surfaces toggle expansion while selected and full photos preview', async ({
  page,
}, info) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('**/__floratrium/media?**', (route) =>
    route.fulfill({
      json: {
        items: petAlbums.huahua.defaults,
        nextCursor: null,
        totalPages: 1,
      },
    })
  )
  await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
  const gallery = page.locator('.flora-album-gallery[data-album-position="0"]')
  await expect(gallery).toBeVisible({ timeout: 30000 })
  if (info.project.name.includes('mobile')) {
    const alert = page.locator('.mobile-experience-alert')
    await expect(alert).toBeVisible({ timeout: 20000 })
    await alert.click()
    await expect(alert).toHaveCount(0)
  }
  await gallery.click({ position: { x: 4, y: 4 } })
  await expect(gallery).toHaveClass(/is-expanded/)
  await gallery.click({ position: { x: 4, y: 4 } })
  await expect(gallery).not.toHaveClass(/is-expanded/)
  // 花花的标题用于切换相册标签，展开与收起统一由展开按钮控制。
  await gallery.getByRole('tab').first().click()
  await expect(gallery).not.toHaveClass(/is-expanded/)
  await gallery.locator('.flora-album-gallery__expand').click()
  await expect(gallery).toHaveClass(/is-expanded/)
  await gallery.locator('.flora-album-gallery__expand').click()
  await expect(gallery).not.toHaveClass(/is-expanded/)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect
    .poll(() =>
      gallery
        .locator('.flora-album-strip__position')
        .first()
        .evaluate((element) => element.getAnimations().length)
    )
    .toBe(1)
  await gallery
    .locator('.flora-album-strip__photo')
    .first()
    .evaluate((button: HTMLButtonElement) => button.click())
  await expect(page.locator('.el-image-viewer__wrapper')).toBeVisible()
  await expect(gallery).not.toHaveClass(/is-expanded/)
  await expect(page.locator('.el-image-viewer__img')).toHaveAttribute(
    'src',
    petAlbums.huahua.defaults[0].url
  )
  await page.locator('.el-image-viewer__close').click()
  await gallery
    .getByRole('button', { name: 'EXPAND', exact: true })
    .evaluate((button: HTMLButtonElement) => button.click())
  await expect(gallery.locator('.flora-album-strip')).toHaveClass(
    /album-mode-leave-active/
  )

  const leavingPhoto = gallery.locator('.flora-album-strip__position').first()
  const frozen = await leavingPhoto.evaluate((element: HTMLElement) => ({
    transform: element.style.transform,
    opacity: Number(element.style.opacity),
  }))
  expect(frozen.transform).toMatch(/^matrix/)
  expect(frozen.opacity).toBeGreaterThan(0.3)
  await page.screenshot({
    path: `.tmp/album-unfold-${test.info().project.name}.png`,
  })
  await expect(gallery).toHaveClass(/is-expanded/)
  await gallery.locator('.media-gallery__open').first().click()
  await expect(page.locator('.el-image-viewer__wrapper')).toBeVisible()
  await expect(gallery).toHaveClass(/is-expanded/)
  await page.locator('.el-image-viewer__close').click()
  await gallery.getByRole('button', { name: 'COLLAPSE', exact: true }).click()
  await expect(gallery.locator('.flora-album-gallery__viewport')).toHaveClass(
    /album-mode-leave-active/
  )
  await expect(gallery.locator('.flora-album-strip')).toBeVisible()
  await expect(gallery).not.toHaveClass(/is-expanded/)
})

test('album and video use a responsive row or column layout', async ({
  page,
}, info) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('**/__floratrium/media?**', (route) =>
    route.fulfill({
      json: {
        items: petAlbums.huahua.defaults,
        nextCursor: null,
        totalPages: 1,
      },
    })
  )
  await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
  const upper = page.locator('.flora-video-gallery')
  const lower = page.locator('.flora-album-gallery')
  await expect(upper).toBeVisible({ timeout: 30000 })
  await expect(lower).toBeVisible()
  if (info.project.name.includes('mobile')) {
    const alert = page.locator('.mobile-experience-alert')
    await expect(alert).toBeVisible({ timeout: 20000 })
    await alert.click()
    await expect(alert).toHaveCount(0)
  }
  for (const panel of [upper, lower]) {
    await expect(panel.locator('h2 svg')).toHaveCount(1)
    const heading = await panel.locator('h2').boundingBox()
    const icon = await panel.locator('h2 svg').boundingBox()
    const text = await panel.locator('h2 span').boundingBox()
    expect(heading!.x - (await panel.boundingBox())!.x).toBeGreaterThanOrEqual(
      8
    )
    expect(text!.x).toBeGreaterThan(icon!.x + icon!.width)
  }
  await expect(page.locator('.flora-album-gallery')).toHaveCount(1)
  await expect(upper.locator('.video-item')).toHaveCount(1)
  await expect(upper.locator('.flora-video-gallery__expand')).toBeVisible()
  expect((await upper.boundingBox())!.width).toBeCloseTo(
    (await lower.boundingBox())!.width,
    0
  )
  expect(
    await upper.evaluate(
      (element) => getComputedStyle(element, '::before').opacity
    )
  ).toBe('0.3')
  expect(
    await upper.evaluate(
      (element) => getComputedStyle(element, '::after').opacity
    )
  ).toBe('0.3')
  await expect(upper.locator('.flora-album-gallery__decoration')).toHaveCount(0)
  await expect(upper).toHaveCSS(
    'padding',
    info.project.name.includes('mobile') ? '18px 24px 42px' : '36px 32px'
  )
  const upperBox = (await upper.boundingBox())!
  const albumBox = (await lower.boundingBox())!
  if (info.project.name.includes('mobile')) {
    expect(upperBox.height / albumBox.height).toBeCloseTo(2 / 3, 2)
    expect(upperBox.x).toBeCloseTo(albumBox.x, 0)
    const albumHeading = (await lower.locator('h2').boundingBox())!
    expect(
      albumHeading.y - upperBox.y - upperBox.height
    ).toBeGreaterThanOrEqual(0)
    const level = (await page.locator('.flora-pet-level').boundingBox())!
    expect((await upper.locator('h2').boundingBox())!.y).toBeGreaterThanOrEqual(
      level.y + level.height + 8
    )
  } else {
    expect(upperBox.height).toBeCloseTo(albumBox.height, 0)
    expect(upperBox.y).toBeCloseTo(albumBox.y, 0)
    expect(upperBox.x - albumBox.x - albumBox.width).toBeCloseTo(16, 0)
  }
  expect((await upper.locator('h2').boundingBox())!.y).toBeGreaterThanOrEqual(
    (await page.locator('.flora-pet-level').boundingBox())!.y +
      (await page.locator('.flora-pet-level').boundingBox())!.height +
      8
  )
  const toggleIcon = lower.locator('.flora-album-gallery__expand-icon')
  await expect(toggleIcon).toBeVisible()
  const fullscreenPath = await toggleIcon.locator('path').getAttribute('d')
  await lower.getByRole('button', { name: 'EXPAND', exact: true }).click()
  await expect(lower).toHaveClass(/is-expanded/)
  await expect(toggleIcon.locator('path')).not.toHaveAttribute(
    'd',
    fullscreenPath!
  )
  await expect(upper).toBeHidden()
  await expect(lower.locator('.media-gallery__card')).toHaveCount(
    petAlbums.huahua.defaults.length
  )
  await lower.getByRole('button', { name: 'COLLAPSE', exact: true }).click()
  await expect(upper).toBeVisible()
})

test('video panel fades out and back in when the album toggles', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('**/__floratrium/media?**', (route) =>
    route.fulfill({
      json: {
        items: petAlbums.huahua.defaults,
        nextCursor: null,
        totalPages: 1,
      },
    })
  )
  await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
  const video = page.locator('.flora-video-gallery')
  await expect(video).toBeVisible({ timeout: 30000 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  for (const opening of [true, false]) {
    const faded = await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          const video = document.querySelector<HTMLElement>(
            '.flora-video-gallery'
          )!
          const finish = (value: boolean) => {
            clearTimeout(timeout)
            video.removeEventListener('transitionrun', onRun)
            resolve(value)
          }
          const onRun = (event: TransitionEvent) => {
            if (event.target === video && event.propertyName === 'opacity')
              finish(
                getComputedStyle(video)
                  .transitionDuration.split(',')
                  .some((duration) => parseFloat(duration) > 0)
              )
          }
          const timeout = setTimeout(() => finish(false), 5000)
          video.addEventListener('transitionrun', onRun)
          document
            .querySelector<HTMLButtonElement>('.flora-album-gallery__expand')!
            .click()
        })
    )
    expect(faded).toBe(true)
    if (opening) await expect(video).toBeHidden()
    else {
      await expect(video).toBeVisible()
      await expect(video).toHaveCSS('opacity', '1')
    }
  }
})
