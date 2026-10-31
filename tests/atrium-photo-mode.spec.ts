import { expect, test } from './helpers/sceneDiagnostics'

test('Atrium photo UI fades in both directions while the star background remains visible', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  const entry = page.getByRole('button', { name: '进入拍照模式' })
  await expect(entry).toBeVisible({ timeout: 45000 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const sampleFade = async (selector: string, duration: number) =>
    page.evaluate(
      async ({ selector, duration }) => {
        const element = document.querySelector<HTMLElement>('.island-focus')!
        ;(document.querySelector(selector) as HTMLElement).click()
        await new Promise<void>((resolve) => {
          const wait = () =>
            document.querySelector('.temple-photo-snapshot')
              ? resolve()
              : requestAnimationFrame(wait)
          wait()
        })
        const snapshot = document.querySelector<HTMLCanvasElement>(
          '.temple-photo-snapshot'
        )!
        const pixels = snapshot
          .getContext('2d')!
          .getImageData(0, 0, snapshot.width, snapshot.height).data
        const hasBackground = pixels.some(
          (value, index) => index % 4 === 3 && value > 0
        )
        const samples: {
          time: number
          opacity: number
          background: number
          studio: number
          canvasAlive: boolean
        }[] = []
        const snapshotBounds = snapshot.getBoundingClientRect()
        const stageBounds = snapshot.parentElement!.getBoundingClientRect()
        const snapshotOffset = Math.max(
          Math.abs(snapshotBounds.top - stageBounds.top),
          Math.abs(snapshotBounds.left - stageBounds.left),
          Math.abs(snapshotBounds.width - stageBounds.width),
          Math.abs(snapshotBounds.height - stageBounds.height)
        )
        if (selector === '.island-photo-entry') {
          await new Promise<void>((resolve) => {
            const waitForReady = () => {
              if (
                document.documentElement.classList.contains('atrium-photo-mode')
              )
                resolve()
              else requestAnimationFrame(waitForReady)
            }
            waitForReady()
          })
        }
        const start = performance.now()
        await new Promise<void>((resolve) => {
          const sample = () => {
            const studio = document.querySelector<HTMLElement>(
              '.atrium-photo-studio'
            )
            const canvas = studio?.querySelector('canvas')
            samples.push({
              time: performance.now() - start,
              opacity: Number(getComputedStyle(element).opacity),
              background: snapshot.isConnected
                ? Number(getComputedStyle(snapshot).opacity)
                : 1,
              studio: studio ? Number(getComputedStyle(studio).opacity) : 0,
              canvasAlive: !!canvas && canvas.width > 0,
            })
            if (performance.now() - start >= duration) resolve()
            else requestAnimationFrame(sample)
          }
          requestAnimationFrame(sample)
        })
        return { samples, hasBackground, snapshotOffset }
      },
      { selector, duration }
    )
  const entering = await sampleFade('.island-photo-entry', 750)
  expect(entering.hasBackground).toBe(true)
  expect(entering.snapshotOffset).toBeLessThanOrEqual(1)
  expect(
    entering.samples.some(
      ({ background }) => background > 0.01 && background < 0.99
    )
  ).toBe(true)
  expect(
    entering.samples.some(({ opacity }) => opacity > 0.01 && opacity < 0.99)
  ).toBe(true)
  await expect(page.locator('.atrium-photo-stage')).toHaveAttribute(
    'data-ready',
    'true'
  )
  await expect(page.locator('.star-container')).toBeVisible()
  const leaving = await sampleFade('[aria-label="退出拍照模式"]', 1050)
  expect(leaving.hasBackground).toBe(true)
  expect(leaving.snapshotOffset).toBeLessThanOrEqual(1)
  expect(
    leaving.samples.some(
      ({ time, background, studio, canvasAlive }) =>
        time > 600 &&
        background > 0.01 &&
        background < 0.99 &&
        studio > 0 &&
        canvasAlive
    )
  ).toBe(true)
  await expect(page.locator('.temple-photo-snapshot')).toHaveCount(0)
  await expect(page.locator('.atrium-photo-studio')).toHaveCount(0)
  await expect(page.locator('.island-focus')).toBeVisible()
})

test('Atrium photo mode rotates, zooms, downloads and restores its controls', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  const homeStage = page.locator('.temple-stage')
  const homeCanvas = await homeStage
    .locator('canvas:not(.temple-photo-snapshot)')
    .elementHandle()
  const stage = page.locator('.atrium-photo-stage')
  await expect(page.getByRole('button', { name: '进入拍照模式' })).toBeVisible({
    timeout: 45000,
  })
  await page.getByRole('button', { name: '进入拍照模式' }).click()
  await expect(homeStage).toHaveAttribute('data-photo-mode', 'true')
  await expect(stage).toHaveAttribute('data-ready', 'true')
  const expectMatchingFraming = async () => {
    const source = (await homeStage.getAttribute(
      'data-photo-framing-projection'
    ))!
      .split(',')
      .map(Number)
    await expect
      .poll(async () => {
        const actual = (
          await stage.getAttribute('data-photo-framing-projection')
        )
          ?.split(',')
          .map(Number)
        return actual?.length === 16
          ? Math.max(
              ...actual.map((value, index) => Math.abs(value - source[index]))
            )
          : Infinity
      })
      .toBeLessThan(1e-8)
  }
  await expectMatchingFraming()
  await expect(stage).toHaveAttribute(
    'data-statue-body-rotation',
    '0.00000,0.00000'
  )
  await expect(stage).toHaveAttribute('data-pose', 'standing')
  await expect(
    homeStage.locator('canvas:not(.temple-photo-snapshot)')
  ).toBeHidden()
  const homeRotation = await homeStage.getAttribute('data-statue-body-rotation')
  const homeZoom = await homeStage.getAttribute('data-camera-zoom')
  await expect(page.locator('.island-focus')).toBeHidden()
  await expect(page.locator('.el-menu-layout-all')).toBeHidden()
  await expect(page.locator('.footer-com')).toBeHidden()
  await expect(page.locator('.star-container')).toBeVisible()
  await expect(page.locator('.photo-poses button')).toHaveCount(0)
  await expect(page.getByRole('option', { name: '站立' })).toHaveCSS(
    'font-family',
    /alibaba-puhuiti/
  )
  await expect(page.getByRole('button', { name: '截图并保存' })).toHaveCSS(
    'border-top-width',
    '2px'
  )
  const shutter = page.getByRole('button', { name: '截图并保存' })
  await expect(shutter.locator('svg')).toHaveCount(0)
  await expect(shutter.locator('.photo-shutter__disk')).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)'
  )
  const shutterBounds = (await shutter.boundingBox())!
  const closeBounds = (await page
    .getByRole('button', { name: '退出拍照模式' })
    .boundingBox())!
  const toggleBounds = (await page
    .getByRole('button', { name: '隐藏拍照工具' })
    .boundingBox())!
  const viewport = page.viewportSize()!
  const mobile = info.project.name.includes('mobile')
  if (mobile) {
    expect(toggleBounds.x).toBeLessThan(shutterBounds.x)
    expect(shutterBounds.x).toBeLessThan(closeBounds.x)
    expect(Math.abs(toggleBounds.y - shutterBounds.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(closeBounds.y - shutterBounds.y)).toBeLessThanOrEqual(1)
  } else {
    expect(
      Math.abs(shutterBounds.y + shutterBounds.height / 2 - viewport.height / 2)
    ).toBeLessThanOrEqual(1)
    expect(Math.abs(closeBounds.x - shutterBounds.x)).toBeLessThanOrEqual(1)
    expect(Math.abs(toggleBounds.x - shutterBounds.x)).toBeLessThanOrEqual(1)
    expect(closeBounds.y).toBeLessThan(shutterBounds.y)
    expect(toggleBounds.y).toBeGreaterThan(shutterBounds.y)
  }
  await expect(
    page.locator('.photo-close.diamond-close-btn .diamond-shape')
  ).toHaveCSS('border-top-color', 'rgb(255, 255, 255)')
  await expect(page.locator('.photo-close .close-icon')).toHaveCSS(
    'color',
    'rgb(255, 255, 255)'
  )
  expect(closeBounds.width).toBe(88)
  expect(toggleBounds.width).toBe(88)
  await expect(page.locator('.fullscreen')).toBeHidden()
  await expect(page.locator('.mobile-menu-icon')).toBeHidden()
  await expect(page.locator('.photo-poses__label')).toHaveText('姿势')
  await expect(page.locator('.photo-hint')).toHaveText(
    mobile ? '单指旋转 / 双指移动' : '左键旋转 / 右键移动 / 滚动缩放'
  )
  const setLocale = (locale: string) =>
    page.evaluate((locale) => {
      ;(
        document.querySelector('#app') as any
      ).__vue_app__.config.globalProperties.$i18n.locale = locale
    }, locale)
  await setLocale('en')
  await expect(page.getByRole('listbox', { name: 'Pose list' })).toBeVisible()
  await expect(page.locator('.photo-poses__label')).toHaveText('POSES')
  await expect(page.getByRole('option', { name: 'STANDING' })).toBeVisible()
  await expect(page.locator('.photo-hint')).toHaveText(
    mobile
      ? 'ONE FINGER TO ROTATE / TWO FINGERS TO PAN'
      : 'LEFT DRAG TO ROTATE / RIGHT DRAG TO PAN / SCROLL TO ZOOM'
  )
  await expect(
    page.getByRole('button', { name: 'Capture and save' })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Hide photo tools' }).click()
  await page.getByRole('button', { name: 'Show photo tools' }).click()
  await expect(
    page.getByRole('button', { name: 'Exit photo mode' })
  ).toBeVisible()
  await setLocale('zhCn')
  if (!info.project.name.includes('mobile')) {
    const cursor = page.locator('.cursor-position')
    await page.getByRole('option', { name: '站立' }).hover()
    await expect(cursor.locator('.cursor-shape')).toBeVisible()
    await expect(cursor).toHaveCSS('visibility', 'visible')
    await expect(cursor).toHaveCSS('opacity', '1')
    await expect(cursor.locator('.cursor-shape')).toHaveClass(/is-active/)
    await page.getByRole('button', { name: '截图并保存' }).hover()
    await expect(cursor.locator('.cursor-shape')).toHaveClass(/is-active/)
    await expect(page.getByRole('button', { name: '截图并保存' })).toHaveCSS(
      'cursor',
      'none'
    )
  }
  const rotation = await stage.getAttribute('data-statue-body-rotation')
  const canvasBounds = (await stage.locator('canvas').boundingBox())!
  const dragX = canvasBounds.x + canvasBounds.width * 0.6
  const dragY = canvasBounds.y + canvasBounds.height * 0.45
  await page.mouse.move(dragX, dragY)
  await page.mouse.down()
  await page.mouse.move(dragX + 60, dragY + 20, { steps: 5 })
  await page.mouse.up()
  await expect
    .poll(() => stage.getAttribute('data-statue-body-rotation'))
    .not.toBe(rotation)
  const rotated = await stage.getAttribute('data-statue-body-rotation')
  await page.mouse.move(dragX - 60, dragY + 50)
  await page.mouse.down({ button: 'right' })
  await page.mouse.move(dragX + 30, dragY + 80, { steps: 5 })
  await page.mouse.up({ button: 'right' })
  await expect(stage).toHaveAttribute(
    'data-photo-pan',
    /^(?!0,0$)[\d.-]+,[\d.-]+$/
  )
  await expect(stage).toHaveAttribute('data-statue-body-rotation', rotated!)
  expect(
    await stage
      .locator('canvas')
      .evaluate((canvas) =>
        canvas.dispatchEvent(
          new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
        )
      )
  ).toBe(false)
  const dolly = Number(await stage.getAttribute('data-dolly-scale'))
  const lensBeforeWheel = await stage.getAttribute('data-focal-length')
  const positionBeforeWheel = await stage.getAttribute('data-camera-position')
  await page.mouse.move(
    canvasBounds.x + canvasBounds.width * 0.4,
    canvasBounds.y + canvasBounds.height * 0.65
  )
  await page.mouse.wheel(0, -120)
  await expect
    .poll(async () => Number(await stage.getAttribute('data-dolly-scale')))
    .toBeGreaterThan(dolly)
  await expect(stage).not.toHaveAttribute(
    'data-camera-position',
    positionBeforeWheel!
  )
  await expect(stage).toHaveAttribute('data-focal-length', lensBeforeWheel!)
  // 相机缩放也会更新投影；保存的画布应与当前姿态一致。
  await page.screenshot({ path: `/tmp/atrium-photo-${info.project.name}.png` })
  await page.getByRole('option', { name: '站立', exact: true }).click()
  await expect(stage).toHaveAttribute(
    'data-statue-body-rotation',
    '0.00000,0.00000'
  )
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '截图并保存' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^atrium-.*\.png$/)
  expect(await download.failure()).toBeNull()
  await download.saveAs(`/tmp/atrium-capture-${info.project.name}.png`)
  await page.getByRole('button', { name: '隐藏拍照工具' }).click()
  await expect(page.locator('.atrium-photo-controls')).toHaveClass(/is-hidden/)
  await page.getByRole('button', { name: '显示拍照工具' }).click()
  await expect(homeStage).toHaveAttribute(
    'data-statue-body-rotation',
    homeRotation!
  )
  await expect(homeStage).toHaveAttribute('data-camera-zoom', homeZoom!)
  const photoCanvas = await stage.locator('canvas').elementHandle()
  await page.getByRole('button', { name: '退出拍照模式' }).click()
  await expect(homeStage).toHaveAttribute('data-photo-mode', 'false')
  await expect(stage).toHaveCount(0)
  await expect(
    homeStage.locator('canvas:not(.temple-photo-snapshot)')
  ).toBeVisible()
  expect(await homeCanvas!.evaluate((canvas) => canvas.isConnected)).toBe(true)
  await expect(page.locator('.island-focus')).toBeVisible()
  await expect(page.locator('.el-menu-layout-all')).toBeVisible()
  expect(await photoCanvas!.evaluate((canvas) => canvas.isConnected)).toBe(
    false
  )
  await page.getByRole('button', { name: '进入拍照模式' }).click()
  await expect(stage).toHaveAttribute('data-ready', 'true')
  await expect(stage).toHaveAttribute('data-photo-pan', '0,0')
  await expectMatchingFraming()
  expect(Number(await stage.getAttribute('data-camera-zoom'))).toBeCloseTo(
    Number(homeZoom),
    4
  )
  if (!info.project.name.includes('mobile')) {
    await page.setViewportSize({ width: 980, height: 760 })
    await expect(stage.locator('canvas')).toHaveCSS('width', '980px')
    await expect(stage.locator('canvas')).toHaveCSS('height', '760px')
  }
  await page.screenshot({
    path: `/tmp/atrium-photo-independent-${info.project.name}.png`,
  })
  await page.getByRole('button', { name: '退出拍照模式' }).click()
  await expect(stage).toHaveCount(0)
})

test('Atrium module headers use English and its desktop menu links directly to modules', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/collections', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus')
  await expect(root).toHaveAttribute('data-detail-phase', 'detail', {
    timeout: 45000,
  })
  const title = root.locator(
    '.island-panels .island-item:visible .island-item__title'
  )
  await expect(title).toHaveText('COLLECTIONS')
  await expect(title).toHaveCSS('font-family', /Anton/)
  const heading = root.locator(
    '.island-panels .island-window:visible .island-window__bar h2'
  )
  await expect(heading).toHaveText('宅')
  await expect(heading).toHaveCSS('font-family', /UnboundedSans/)
  await expect(heading).toHaveCSS('mask-image', /linear-gradient/)
  const insets = await root
    .locator('.island-panels .island-window:visible')
    .evaluate((element) => {
      const bar = element.querySelector('.island-window__bar')!
      const title = bar.querySelector('h2')!
      const item = element.querySelector(
        '.island-item:not([style*="display: none"])'
      )!
      const count = item.querySelector('.island-item__count')!
      return {
        left:
          title.getBoundingClientRect().left - bar.getBoundingClientRect().left,
        right:
          item.getBoundingClientRect().right -
          count.getBoundingClientRect().right,
      }
    })
  expect(Math.abs(insets.left)).toBeLessThanOrEqual(1)
  expect(Math.abs(insets.right)).toBeLessThanOrEqual(1)
  await page.evaluate(() => {
    ;(
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$i18n.locale = 'en'
  })
  await expect(heading).toHaveText('OTAKU')
  await page.screenshot({ path: `/tmp/atrium-header-${info.project.name}.png` })
  if (!info.project.name.includes('mobile')) {
    await page.locator('[data-temple-nav="statue"]').hover()
    const link = page
      .locator('.atrium-submenu')
      .getByRole('link', { name: 'NOTES&CHATS' })
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/atrium\/notes$/)
    await expect(
      root.locator('.island-panels .island-item:visible .island-item__title')
    ).toHaveText('NOTES&CHATS')
  }
})

test('photo mode keeps the background visible until the independent model is ready', async ({
  page,
}) => {
  test.setTimeout(90000)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(
    '**/src/views/Home/scene/atriumPhotoScene.ts*',
    async (route) => {
      await gate
      await route.continue()
    }
  )
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  await page
    .getByRole('button', { name: '进入拍照模式' })
    .click({ timeout: 45000 })
  try {
    await expect(page.locator('.photo-status .is-loading svg')).toBeVisible()
    await page.waitForTimeout(800)
    await expect(page.locator('html')).toHaveClass(/atrium-photo-pending/)
    await expect(page.locator('.temple-photo-snapshot')).toHaveCSS(
      'opacity',
      '1'
    )
    await expect(page.locator('.island-focus')).toHaveCSS('opacity', '1')
  } finally {
    release()
  }
  await expect(page.locator('.atrium-photo-stage')).toHaveAttribute(
    'data-ready',
    'true'
  )
  await expect(page.locator('.temple-photo-snapshot')).toHaveCSS('opacity', '0')
  await page.getByRole('button', { name: '退出拍照模式' }).click()
  await expect(page.locator('.temple-photo-snapshot')).toHaveCount(0)
})

test('photo focal length toolbar changes perspective independently with an icon-only button', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  await page
    .getByRole('button', { name: '进入拍照模式' })
    .click({ timeout: 45000 })
  const stage = page.locator('.atrium-photo-stage')
  await expect(stage).toHaveAttribute('data-ready', 'true')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const button = page.getByRole('button', { name: '焦距畸变调整', exact: true })
  await expect(button).toHaveAttribute('aria-expanded', 'false')
  await expect(button).toHaveCSS('background-color', 'rgba(24, 24, 27, 0.65)')
  await expect(button).toHaveCSS('backdrop-filter', 'blur(12px)')
  await expect(
    page.getByRole('toolbar', { name: '拍照工具栏' }).getByRole('button')
  ).toHaveCount(2)
  await expect(button.locator('.photo-tool__label')).toHaveCount(0)
  await expect(button).toHaveText('')
  if (!info.project.name.includes('mobile')) {
    await button.hover()
    await expect(button).toHaveText('')
  }
  const initialZoom = await stage.getAttribute('data-camera-zoom')
  const initialPosition = await stage.getAttribute('data-camera-position')
  const initialRotation = await stage.getAttribute('data-statue-body-rotation')
  await button.click()
  await expect(button).toHaveAttribute('aria-expanded', 'true')
  const panel = page.getByRole('region', { name: '焦距畸变调整', exact: true })
  await expect(panel).toBeVisible()
  await expect(panel).toHaveCSS('animation-name', 'anutriumCrtOn')
  await expect(panel).toHaveCSS('background-color', 'rgba(24, 24, 27, 0.65)')
  await expect(panel).toHaveCSS('backdrop-filter', 'blur(12px)')
  await expect(panel).not.toHaveClass(/crt-effect-enter-active/)
  const slider = page.getByRole('slider', { name: '焦距畸变调整', exact: true })
  await expect(slider).toHaveAttribute('min', '14')
  await expect(slider).toHaveAttribute('max', '200')
  const track = panel.locator('.photo-tool-range__track')
  const fill = panel.locator('.photo-tool-range__fill')
  const thumb = panel.locator('.photo-tool-range__thumb')
  await expect(track).toBeVisible()
  await expect(track).toHaveCSS('height', '10px')
  await expect(track).toHaveCSS('background-color', 'rgb(61, 61, 66)')
  await expect(thumb).toBeVisible()
  await expect(thumb).toHaveCSS('background-color', 'rgb(24, 198, 166)')

  await expect(panel.locator('.photo-tool-range__limits span')).toHaveText([
    '14mm',
    '200mm',
  ])
  await slider.focus()
  await slider.press('Home')
  await expect
    .poll(async () => Number(await stage.getAttribute('data-focal-length')))
    .toBeCloseTo(14, 4)
  await expect(fill).toHaveCSS('width', '0px')
  const wideFov = Number(await stage.getAttribute('data-camera-fov'))
  const wideDepth = Number(await stage.getAttribute('data-camera-depth'))
  await expect(stage).not.toHaveAttribute(
    'data-camera-position',
    initialPosition!
  )
  await page.screenshot({
    path: `/tmp/atrium-perspective-14-${info.project.name}.png`,
  })
  await slider.press('End')
  await expect
    .poll(async () => Number(await stage.getAttribute('data-focal-length')))
    .toBeCloseTo(200, 4)
  expect(Number(await stage.getAttribute('data-camera-fov'))).toBeLessThan(
    wideFov
  )
  await expect(stage).toHaveAttribute('data-camera-zoom', initialZoom!)
  expect(Number(await stage.getAttribute('data-camera-depth'))).toBeGreaterThan(
    wideDepth * 10
  )
  await page.screenshot({
    path: `/tmp/atrium-perspective-200-${info.project.name}.png`,
  })
  await expect(stage).toHaveAttribute(
    'data-statue-body-rotation',
    initialRotation!
  )
  await expect(panel.locator('output')).toHaveText('200mm')
  const trackBounds = (await track.boundingBox())!
  const fillBounds = (await fill.boundingBox())!
  const thumbBounds = (await thumb.boundingBox())!
  expect(Math.abs(fillBounds.width - trackBounds.width)).toBeLessThanOrEqual(1)
  expect(
    Math.abs(
      thumbBounds.x + thumbBounds.width - trackBounds.x - trackBounds.width
    )
  ).toBeLessThanOrEqual(1)

  await slider.press('ArrowLeft')
  await expect
    .poll(async () => Number(await stage.getAttribute('data-focal-length')))
    .toBeCloseTo(199, 4)
  // 工具框内操作不会触发背景旋转；Escape 先收起设置，不退出拍照。
  await slider.press('Escape')
  await expect(panel).toHaveCSS('animation-name', 'anutriumCrtOff')
  await expect(panel).toHaveCount(0)
  await expect(stage).toBeAttached()
  await button.click()
  await slider.focus()
  await slider.press('Home')
  await expect(panel).not.toHaveClass(/crt-effect-enter-active/)
  const viewport = page.viewportSize()!
  const bounds = (await panel.boundingBox())!
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1)
  await page.screenshot({ path: `/tmp/atrium-focal-${info.project.name}.png` })
  await page.evaluate(() => {
    ;(
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$i18n.locale = 'en'
  })
  await expect(
    page.getByRole('region', {
      name: 'Focal distortion adjustment',
      exact: true,
    })
  ).toBeVisible()
  await page.getByRole('button', { name: 'Hide photo tools' }).click()
  await expect(page.locator('#photo-focal-panel')).toHaveCount(0)
  await page.getByRole('button', { name: 'Show photo tools' }).click()
  await page.getByRole('button', { name: 'Exit photo mode' }).click()
  await expect(stage).toHaveCount(0)
})

test('photo mode snaps its custom cursor to the latest input without inertia and restores smooth following on exit', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'))
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  await page
    .getByRole('button', { name: '进入拍照模式' })
    .waitFor({ timeout: 45000 })
  await page.mouse.move(100, 100)
  const cursor = page.locator('.cursor-position')
  await expect(cursor).not.toHaveClass(/is-hidden/)
  await expect(cursor).not.toHaveClass(/is-instant/)
  const sample = (points: { x: number; y: number }[]) =>
    page.evaluate(async (points) => {
      const cursor = document.querySelector<HTMLElement>('.cursor-position')!
      let writes = 0
      const observer = new MutationObserver((records) => {
        writes += records.length
      })
      observer.observe(cursor, { attributes: true, attributeFilter: ['style'] })
      for (const point of points)
        document.body.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            clientX: point.x,
            clientY: point.y,
            pointerType: 'mouse',
          })
        )
      await new Promise(requestAnimationFrame)
      writes += observer.takeRecords().length
      observer.disconnect()
      const matrix = new DOMMatrixReadOnly(getComputedStyle(cursor).transform)
      const last = points[points.length - 1]
      return {
        error: Math.hypot(matrix.m41 - last.x, matrix.m42 - last.y),
        writes,
      }
    }, points)
  expect((await sample([{ x: 800, y: 400 }])).error).toBeGreaterThan(1)
  await page.getByRole('button', { name: '进入拍照模式' }).click()
  await expect(cursor).toHaveClass(/is-instant/)
  await expect(page.locator('.atrium-photo-stage')).toHaveAttribute(
    'data-ready',
    'true'
  )
  const result = await sample([
    { x: 100, y: 200 },
    { x: 300, y: 250 },
    { x: 840, y: 360 },
  ])
  expect(result.error).toBeLessThanOrEqual(0.01)
  expect(result.writes).toBe(1)
  await page.getByRole('button', { name: '退出拍照模式' }).click()
  await expect(page.locator('.atrium-photo-studio')).toHaveCount(0)
  await expect(cursor).not.toHaveClass(/is-instant/)
  expect((await sample([{ x: 200, y: 150 }])).error).toBeGreaterThan(1)
})

test('photo shutter flashes across the viewport, prevents duplicate exports and keeps the flash out of the saved image', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  await page
    .getByRole('button', { name: '进入拍照模式' })
    .click({ timeout: 45000 })
  await expect(page.locator('.atrium-photo-stage')).toHaveAttribute(
    'data-ready',
    'true'
  )
  const button = page.getByRole('button', { name: '截图并保存' })
  await expect(button).toBeEnabled()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  if (!info.project.name.includes('mobile')) {
    await button.hover()
    await expect(button.locator('.photo-shutter__disk')).toHaveCSS(
      'background-color',
      'rgb(212, 212, 212)'
    )
  }
  let downloads = 0
  page.on('download', () => {
    downloads++
  })
  const downloadPromise = page.waitForEvent('download')
  const samples = await page.evaluate(async () => {
    const button = document.querySelector<HTMLButtonElement>('.photo-shutter')!
    const flash = document.querySelector<HTMLElement>('.photo-capture-flash')!
    const start = performance.now()
    button.click()
    button.click()
    const rect = flash.getBoundingClientRect()
    const opacity: number[] = []
    let disabledDuringFlash = false
    await new Promise<void>((resolve) => {
      const sample = () => {
        opacity.push(Number(getComputedStyle(flash).opacity))
        if (performance.now() - start < 200 && button.disabled)
          disabledDuringFlash = true
        if (performance.now() - start > 500) resolve()
        else requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
    return {
      opacity,
      disabledDuringFlash,
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    }
  })
  expect(samples.opacity.some((value) => value > 0.4)).toBe(true)
  expect(samples.opacity.some((value) => value > 0 && value < 0.4)).toBe(true)
  expect(samples.disabledDuringFlash).toBe(true)
  expect(samples.top).toBe(0)
  expect(samples.left).toBe(0)
  expect(samples.width).toBe(page.viewportSize()!.width)
  expect(samples.height).toBe(page.viewportSize()!.height)
  const download = await downloadPromise
  expect(await download.failure()).toBeNull()
  expect(downloads).toBe(1)
  await expect(button).toBeEnabled()
  await expect(page.locator('.photo-capture-flash')).toHaveCSS('opacity', '0')
  const savedPath = (await download.path())!
  await page.route('**/__photo-flash-export.png', (route) =>
    route.fulfill({ path: savedPath, contentType: 'image/png' })
  )
  const corner = await page.evaluate(async () => {
    const picture = new Image()
    picture.src = '/__photo-flash-export.png'
    await picture.decode()
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d')!
    context.drawImage(picture, 0, 0)
    return [...context.getImageData(0, 0, 1, 1).data]
  })
  expect(Math.max(...corner.slice(0, 3))).toBeLessThan(240)
  await page.getByRole('button', { name: '退出拍照模式' }).click()
  await expect(page.locator('.photo-capture-flash')).toHaveCount(0)
})

test('photo controls and tool panels share the same four-sided safe area', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  await page
    .getByRole('button', { name: '进入拍照模式' })
    .click({ timeout: 45000 })
  await expect(page.locator('.atrium-photo-stage')).toHaveAttribute(
    'data-ready',
    'true'
  )
  const viewport = page.viewportSize()!
  const mobile = info.project.name.includes('mobile')
  const measure = () =>
    page.evaluate(() => {
      const box = (selector: string) => {
        const rect = document.querySelector(selector)!.getBoundingClientRect()
        return {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          height: rect.height,
        }
      }
      return {
        safe: box('.photo-safe-area'),
        close: box('.photo-close'),
        shutter: box('.photo-shutter'),
        toggle: box('.photo-toggle'),
        toolbar: box('.photo-toolbar'),
        poses: box('.photo-poses'),
        hint: box('.photo-hint'),
      }
    })
  const original = await measure()
  expect(original.safe.left).toBe(40)
  expect(original.safe.top).toBe(40)
  expect(viewport.width - original.safe.right).toBe(40)
  expect(viewport.height - original.safe.bottom).toBe(40)
  for (const boxes of [original]) {
    expect(boxes.toolbar.left).toBe(boxes.safe.left)
    if (mobile) {
      expect(boxes.toolbar.top).toBe(boxes.safe.top)
      expect(boxes.toolbar.right).toBe(boxes.safe.right)
      expect(boxes.poses.top).toBeGreaterThanOrEqual(boxes.toolbar.bottom + 16)
      expect(boxes.close.bottom).toBe(boxes.safe.bottom)
    } else {
      expect(boxes.toolbar.bottom).toBe(boxes.safe.bottom)
      expect(boxes.close.top).toBe(boxes.safe.top)
    }
    expect(boxes.poses.left).toBe(boxes.safe.left)
    expect(boxes.close.right).toBe(boxes.safe.right)
    expect(boxes.toggle.bottom).toBe(boxes.safe.bottom)
    expect(boxes.hint.left).toBeGreaterThanOrEqual(boxes.safe.left - 1)
    expect(boxes.hint.right).toBeLessThanOrEqual(boxes.safe.right + 1)
  }
  // 模拟非对称设备遮挡，验证共享控件会跟随四边安全区更新。
  await page.locator('.atrium-photo-controls').evaluate((root) => {
    const style = (root as HTMLElement).style
    for (const [edge, value] of Object.entries({
      top: 52,
      right: 60,
      bottom: 56,
      left: 64,
    }))
      style.setProperty(`--photo-safe-${edge}`, `${value}px`)
  })
  const changed = await measure()
  expect(changed.toolbar.left).toBe(64)
  if (mobile) {
    expect(changed.toolbar.top).toBe(52)
    expect(changed.toolbar.right).toBe(viewport.width - 60)
    expect(changed.poses.top).toBe(52 + 76 + 16)
    expect(changed.close.bottom).toBe(viewport.height - 56)
    expect(changed.shutter.bottom).toBe(viewport.height - 56)
  } else {
    expect(changed.toolbar.bottom).toBe(viewport.height - 56)
    expect(changed.close.top).toBe(52)
    expect(
      Math.abs(
        changed.shutter.top +
          changed.shutter.height / 2 -
          (52 + viewport.height - 56) / 2
      )
    ).toBeLessThanOrEqual(1)
  }
  expect(changed.poses.left).toBe(64)
  expect(changed.close.right).toBe(viewport.width - 60)
  expect(changed.toggle.bottom).toBe(viewport.height - 56)
  await page.getByRole('button', { name: '焦距畸变调整', exact: true }).click()
  const panel = page.getByRole('region', { name: '焦距畸变调整', exact: true })
  await expect(panel).toBeVisible()
  const panelBounds = (await panel.boundingBox())!
  expect(panelBounds.x).toBe(64)
  if (mobile) {
    expect(panelBounds.y).toBe(52 + 76 + 16)
    expect(panelBounds.y + panelBounds.height).toBeLessThanOrEqual(
      changed.hint.top
    )
  }
  expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(
    viewport.width - 60 + 1
  )
  await page.screenshot({ path: `/tmp/photo-safe-area-${viewport.width}.png` })
  await page.getByRole('button', { name: '退出拍照模式' }).click()
  await expect(page.locator('.atrium-photo-studio')).toHaveCount(0)
})

test('photo component controls adjust independent background layers and restore them on exit', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  await page
    .getByRole('button', { name: '进入拍照模式' })
    .click({ timeout: 45000 })
  await expect(page.locator('.atrium-photo-stage')).toHaveAttribute(
    'data-ready',
    'true'
  )
  const tool = page.getByRole('button', { name: '组件控制', exact: true })
  await expect(tool).toHaveText('')
  const initialAccent = await page
    .locator('html')
    .evaluate((node) =>
      (node as HTMLElement).style.getPropertyValue('--page-theme-color')
    )
  const cameraIcon = page
    .getByRole('button', { name: '焦距畸变调整', exact: true })
    .locator('svg')
  await expect(cameraIcon).toHaveCSS('opacity', '0.6')
  await expect(cameraIcon).toHaveCSS('stroke', 'rgb(255, 255, 244)')
  await tool.click()
  const panel = page.getByRole('region', { name: '组件控制', exact: true })
  await expect(panel).toBeVisible()
  const initialValues = await panel
    .getByRole('slider')
    .evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLInputElement).value)
    )
  const set = async (label: string, value: number) => {
    const slider = panel.getByRole('slider', { name: label, exact: true })
    await slider.fill(String(value))
    await slider.dispatchEvent('input')
  }
  await set('十二星宿透明度', 72)
  await set('十二星宿模糊度', 8)
  await set('星空透明度', 43)
  await set('星空模糊度', 3)
  const sky = page.locator('.star-container')
  await expect(sky.locator('.zodiac-stage')).toHaveCSS('filter', 'blur(8px)')
  await expect(sky.locator('.zodiac-stage')).toHaveCSS('opacity', '0.72')
  await expect(sky.locator('.zodiac-static-art').first()).toHaveCSS(
    'opacity',
    '1'
  )
  await set('十二星宿透明度', 0)
  await expect(sky.locator('.zodiac-stage')).toHaveCSS('opacity', '0')
  await set('十二星宿透明度', 100)
  await expect(sky.locator('.zodiac-stage')).toHaveCSS('opacity', '1')
  await set('十二星宿透明度', 72)
  await expect(sky.locator('.particle-viewport')).toHaveCSS('opacity', '0.43')
  await expect(sky.locator('.particle-viewport')).toHaveCSS(
    'filter',
    'blur(3px)'
  )
  await panel.getByRole('button', { name: '蓝色', exact: true }).click()
  await expect(sky.locator('.backdrop-color-base')).toHaveCSS(
    'background-color',
    'rgb(7, 26, 54)'
  )
  await expect(page.locator('.atrium-photo-stage')).toHaveAttribute(
    'data-photo-theme',
    'blue'
  )
  await expect
    .poll(() =>
      page
        .locator('html')
        .evaluate((node) =>
          getComputedStyle(node).getPropertyValue('--page-theme-color').trim()
        )
    )
    .toBe('#408bfa')
  const blue = panel.getByRole('button', { name: '蓝色', exact: true })
  await expect(blue).toHaveCSS('border-top-color', 'rgb(24, 198, 166)')
  await expect(blue).toHaveCSS('background-color', 'rgb(64, 139, 250)')
  const resetControl = panel.getByRole('button', { name: '重置', exact: true })
  await resetControl.scrollIntoViewIfNeeded()
  await expect(resetControl).toHaveCSS('background-image', 'none')
  await expect(resetControl).toHaveCSS('background-color', 'rgb(61, 61, 66)')
  await expect(panel.locator('.photo-tool-panel__header')).toHaveCSS(
    'position',
    'static'
  )
  const resetBounds = await panel
    .getByRole('button', { name: '重置', exact: true })
    .boundingBox()
  const panelBounds = await panel.boundingBox()
  expect(resetBounds!.width).toBeLessThan(panelBounds!.width / 2)
  expect(resetBounds!.y).toBeGreaterThanOrEqual(panelBounds!.y)
  expect(resetBounds!.y + resetBounds!.height).toBeLessThanOrEqual(
    panelBounds!.y + panelBounds!.height
  )
  await page.screenshot({
    path: `/tmp/photo-components-blue-${info.project.name}.png`,
  })
  const pink = panel.getByRole('button', { name: '粉色', exact: true })
  await pink.click()
  await expect(pink).toHaveCSS('background-color', 'rgb(198, 70, 101)')
  await expect(pink).toHaveCSS('border-top-color', 'rgb(24, 198, 166)')
  await expect(page.locator('.atrium-photo-stage')).toHaveAttribute(
    'data-photo-theme',
    'pink'
  )
  await expect
    .poll(() =>
      page
        .locator('html')
        .evaluate((node) =>
          getComputedStyle(node)
            .getPropertyValue('--page-theme-color')
            .trim()
            .toLowerCase()
        )
    )
    .toBe('#c64665')
  const cyan = panel.getByRole('button', { name: '青色', exact: true })
  await cyan.click()
  await expect(cyan).toHaveCSS('background-color', 'rgb(24, 198, 166)')
  await expect(cyan).toHaveCSS('border-top-width', '3px')
  for (const name of ['热情红', '蓝色', '粉色', '青色']) {
    await expect(panel.getByRole('button', { name, exact: true })).toHaveCSS(
      'color',
      'rgb(0, 0, 0)'
    )
  }
  const stage = page.locator('.atrium-photo-stage')
  const outline = panel.getByRole('switch', { name: '模型描边', exact: true })
  await expect(outline).toHaveAttribute('aria-checked', 'false')
  if (!info.project.name.includes('mobile')) {
    await outline.hover()
    await expect(page.locator('.cursor-shape')).toHaveClass(/is-active/)
  }

  await expect(stage).toHaveAttribute('data-model-form', 'default')
  await outline.click()
  await expect(outline).toHaveAttribute('aria-checked', 'true')
  await expect(outline).toHaveCSS('width', '46px')
  await expect(outline).toHaveCSS('height', '26px')
  const core = outline.locator('..').locator('.el-switch__core')
  const action = core.locator('.el-switch__action')
  await expect(core).toHaveCSS('border-radius', '0px')
  await expect(action).toHaveCSS('border-radius', '0px')
  await expect(action).toHaveCSS('box-shadow', /rgba/)
  expect((await action.boundingBox())!.height).toBeGreaterThan(
    (await core.boundingBox())!.height
  )

  await expect(stage).toHaveAttribute('data-model-outline', 'true')
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await page.screenshot({
    path: `/tmp/photo-model-outline-${info.project.name}.png`,
  })
  await tool.click()
  await panel.getByRole('button', { name: '网格', exact: true }).click()
  await expect(stage).toHaveAttribute('data-model-form', 'wireframe')
  await expect
    .poll(async () =>
      Number(await stage.getAttribute('data-wire-vertex-count'))
    )
    .toBeGreaterThan(0)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(stage).toHaveAttribute('data-wire-flow-active', 'true')
  const flowBefore = Number(await stage.getAttribute('data-wire-flow-time'))
  await expect
    .poll(async () => Number(await stage.getAttribute('data-wire-flow-time')))
    .toBeGreaterThan(flowBefore)

  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await page.screenshot({
    path: `/tmp/photo-model-wireframe-${info.project.name}.png`,
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(stage).toHaveAttribute('data-wire-flow-active', 'false')
  await tool.click()
  await expect(panel.locator('.photo-tool-group__title')).toHaveText([
    '十二星宿',
    '星空',
    '模型',
    '颜色',
  ])
  for (const heading of await panel.locator('.photo-tool-group__title').all()) {
    await expect(heading).toHaveCSS('text-align', 'left')
    await expect(heading).toHaveCSS('font-family', /alibaba-puhuiti/)
    await expect(heading).toHaveCSS('font-weight', '900')
    await expect(heading).toHaveCSS('margin-bottom', '0px')
    await expect(heading).toHaveCSS('mask-image', /linear-gradient/)
  }
  for (const group of (await panel.locator('.photo-tool-group').all()).slice(
    1
  )) {
    await expect(group).toHaveCSS('border-top-width', '1px')
  }
  if (!info.project.name.includes('mobile'))
    expect((await panel.boundingBox())!.width).toBe(600)
  const groups = await panel.locator('.photo-tool-group').evaluateAll((nodes) =>
    nodes.map((node) => ({
      label: node.getAttribute('aria-label'),
      gap: parseFloat(getComputedStyle(node).marginTop),
    }))
  )
  expect(groups.map((group) => group.label)).toEqual([
    '十二星宿',
    '星空',
    '模型',
    '颜色',
  ])
  expect(groups.slice(1).every((group) => group.gap === 20)).toBe(true)
  const gradient = panel.getByRole('switch', { name: '背景黑色渐变' })
  await expect(gradient).toHaveAttribute('aria-checked', 'true')
  await gradient.click()
  await expect(gradient).toHaveAttribute('aria-checked', 'false')
  expect(
    await sky.evaluate((node) => getComputedStyle(node, '::before').opacity)
  ).toBe('0')
  await page.screenshot({
    path: `/tmp/photo-components-pink-${info.project.name}.png`,
  })
  const reset = panel.getByRole('button', { name: '重置', exact: true })
  await expect(reset.locator('svg')).toHaveCount(1)
  await reset.click()
  await expect(gradient).toHaveAttribute('aria-checked', 'true')
  await expect(outline).toHaveAttribute('aria-checked', 'false')
  await expect(stage).toHaveAttribute('data-model-form', 'default')
  await expect(stage).toHaveAttribute('data-model-outline', 'false')
  expect(
    await sky.evaluate((node) => getComputedStyle(node, '::before').opacity)
  ).toBe('1')
  expect(
    await panel
      .getByRole('slider')
      .evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLInputElement).value)
      )
  ).toEqual(initialValues)
  await expect(page.locator('.atrium-photo-stage')).toHaveAttribute(
    'data-photo-theme',
    'red'
  )
  await expect(
    panel.getByRole('button', { name: '热情红', exact: true })
  ).toHaveAttribute('aria-pressed', 'true')
  await panel.getByRole('button', { name: '蓝色', exact: true }).click()
  await panel.getByRole('button', { name: '热情红', exact: true }).click()
  await expect(sky.locator('.backdrop-color-base')).toHaveCSS(
    'background-color',
    'rgb(40, 9, 20)'
  )
  const bounds = await panel.boundingBox()
  expect(bounds!.y).toBeGreaterThanOrEqual(39)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height - 39
  )
  await page.screenshot({
    path: `/tmp/photo-components-${info.project.name}.png`,
  })
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(page.locator('html')).toHaveClass(/atrium-photo-mode/)
  await page.getByRole('button', { name: '焦距畸变调整', exact: true }).click()
  await expect(
    page.getByRole('region', { name: '焦距畸变调整', exact: true })
  ).toBeVisible()
  await tool.click()
  await expect(
    page.getByRole('region', { name: '焦距畸变调整', exact: true })
  ).toBeHidden()
  await page.getByRole('button', { name: '隐藏拍照工具' }).click()
  await expect(panel).toBeHidden()
  await page.getByRole('button', { name: '显示拍照工具' }).click()
  await page.locator('.photo-close').click()
  await expect(page.locator('.atrium-photo-studio')).toHaveCount(0)
  await expect(sky).not.toHaveClass(/is-photo-controlled/)
  expect(
    await page
      .locator('html')
      .evaluate((node) =>
        (node as HTMLElement).style.getPropertyValue('--page-theme-color')
      )
  ).toBe(initialAccent)
  expect(
    await sky
      .locator('.zodiac-stage')
      .evaluate((node) => getComputedStyle(node).filter)
  ).not.toBe('blur(8px)')
})

test('photo route supports direct entry, refresh, history and leaving for other routes', async ({
  page,
  isMobile,
}) => {
  test.setTimeout(120000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/photo', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.atrium-photo-stage')
  await expect(stage).toHaveAttribute('data-ready', 'true', { timeout: 45000 })
  await expect(page).toHaveURL(/\/atrium\/photo$/)
  if (isMobile)
    await expect(page.locator('.mobile-screen-frame-bottom')).toBeHidden()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(stage).toHaveAttribute('data-ready', 'true', { timeout: 45000 })
  await page.getByRole('button', { name: '退出拍照模式', exact: true }).click()
  await expect(page).toHaveURL(/\/atrium$/)
  await expect(page.locator('.atrium-photo-studio')).toHaveCount(0)
  if (isMobile)
    await expect(page.locator('.mobile-screen-frame-bottom')).toBeVisible()
  await page.goBack()
  await expect(stage).toHaveAttribute('data-ready', 'true', { timeout: 45000 })
  await page.goForward()
  await expect(page).toHaveURL(/\/atrium$/)
  await expect(page.locator('.atrium-photo-studio')).toHaveCount(0)
  await page.getByRole('button', { name: '进入拍照模式', exact: true }).click()
  await expect(page).toHaveURL(/\/atrium\/photo$/)
  await expect(stage).toHaveAttribute('data-ready', 'true')
  await page.evaluate(async () => {
    const roots = [
      document.querySelector('.temple-page')!,
      document.querySelector('.router-container')!,
    ]
    const read = () =>
      roots.map((node) => {
        const box = node.getBoundingClientRect()
        return [box.top, box.left]
      })
    const geometry = { before: read(), frames: [read()] }
    ;(window as any).photoLeaveGeometry = geometry
    const sample = () => {
      if (!roots[0].isConnected) return
      geometry.frames.push(read())
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    await (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push('/colorPalette')
  })
  await expect(page).toHaveURL(/\/colorPalette$/)
  await expect(page.locator('.atrium-photo-studio')).toHaveCount(0)
  await expect(page.locator('html')).not.toHaveClass(
    /atrium-photo-mode|atrium-photo-pending/
  )
  const geometry = await page.evaluate(
    () =>
      (window as any).photoLeaveGeometry as {
        before: number[][]
        frames: number[][][]
      }
  )
  for (const frame of geometry.frames)
    for (let index = 0; index < 2; index++)
      for (let axis = 0; axis < 2; axis++)
        expect(
          Math.abs(frame[index][axis] - geometry.before[index][axis])
        ).toBeLessThanOrEqual(1)
})

test('mobile photo mode rotates with one finger and pans with two without gesture jumps', async ({
  page,
  isMobile,
}, info) => {
  test.skip(!isMobile, '真实双指手势在移动端验证')
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/photo', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.atrium-photo-stage')
  await expect(stage).toHaveAttribute('data-ready', 'true', { timeout: 45000 })
  await expect(page.locator('.photo-hint')).toHaveText('单指旋转 / 双指移动')
  const cdp = await page.context().newCDPSession(page)
  const viewport = page.viewportSize()!
  const first = {
    id: 1,
    x: Math.round(viewport.width * 0.35),
    y: Math.round(viewport.height * 0.5),
  }
  const second = { id: 2, x: Math.round(viewport.width * 0.65), y: first.y }
  const touch = (type: string, points: (typeof first)[]) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map((point) => ({
        ...point,
        radiusX: 2,
        radiusY: 2,
        force: 1,
      })),
    })
  const read = () =>
    stage.evaluate((node) => ({
      pan: node.getAttribute('data-photo-pan')!.split(',').map(Number),
      rotation: node.getAttribute('data-statue-body-rotation'),
    }))
  const initial = await read()
  await touch('touchStart', [first])
  first.x += 24
  first.y += 12
  await touch('touchMove', [first])
  const rotated = await read()
  expect(rotated.rotation).not.toBe(initial.rotation)
  expect(rotated.pan).toEqual(initial.pan)
  await touch('touchStart', [first, second])
  expect(await read()).toEqual(rotated)
  first.x += 32
  first.y += 24
  second.x += 32
  second.y += 24
  await touch('touchMove', [first, second])
  const panned = await read()
  expect(panned.rotation).toBe(rotated.rotation)
  expect(panned.pan[0] - rotated.pan[0]).toBeCloseTo(32 / viewport.width, 3)
  expect(panned.pan[1] - rotated.pan[1]).toBeCloseTo(24 / viewport.height, 3)
  // CDP 的非空 touchEnd 列表表示本次抬起的触点。
  await touch('touchEnd', [second])
  expect(await read()).toEqual(panned)
  first.x += 6
  first.y += 8
  await touch('touchMove', [first])
  const resumed = await read()
  expect(resumed.rotation).not.toBe(panned.rotation)
  expect(resumed.pan).toEqual(panned.pan)
  await touch('touchCancel', [])
  const third = { id: 3, x: 150, y: first.y }
  await touch('touchStart', [third])
  expect(await read()).toEqual(resumed)
  third.x += 10
  await touch('touchMove', [third])
  expect((await read()).rotation).not.toBe(resumed.rotation)
  await touch('touchEnd', [])
  expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1)
  await page.screenshot({
    path: `/tmp/photo-mobile-controls-${info.project.name}.png`,
  })
  await page.getByRole('button', { name: '退出拍照模式', exact: true }).click()
  await expect(page.locator('.atrium-photo-studio')).toHaveCount(0)
})
