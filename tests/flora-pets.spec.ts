import { expect, type Page, test } from '@playwright/test'

import { pets } from '../src/locales/dynamic/pets'

const openFlora = async (page: Page, animate = false) => {
  await page.emulateMedia({
    reducedMotion: animate ? 'no-preference' : 'reduce',
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 30000,
  })
  const point = (await stage.getAttribute('data-companion-screen'))!
    .split(',')
    .map(Number)
  await page.mouse.click(point[0], point[1])
  await expect(page.locator('.flora-focus-layout')).toBeVisible()
  return stage
}
const selectPet = async (page: Page, id: string) => {
  await page.locator(`button[data-pet-id="${id}"]`).click()
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-pet-id',
    id,
    { timeout: 30000 }
  )
  await expect(page.locator(`button[data-pet-id="${id}"]`)).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(page.locator('.flora-focus-layout__character')).toHaveAttribute(
    'aria-busy',
    'false'
  )
}

test.beforeEach(async ({ page }) => {
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
})

test('pets switch their model, identity and theme, survive home and route returns, reset on refresh', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  const downloads = new Map<string, number>()
  page.on('request', (request) => {
    const match = request.url().match(/\/models\/(mightyena)-sleep\.bin\.gz/)
    if (match) downloads.set(match[1], (downloads.get(match[1]) || 0) + 1)
  })
  const stage = await openFlora(page)
  const root = page.locator('.temple-page')
  const canvas = await stage.locator('canvas').elementHandle()
  await expect(stage).toHaveAttribute('data-pet-id', 'huahua')
  await expect(page.locator('.flora-character-rail button')).toHaveCount(
    pets.length
  )
  expect(downloads.size).toBe(0)
  await expect(stage).toHaveAttribute('data-companion-pose', 'battle-idle')
  await expect(stage).toHaveAttribute('data-companion-screen-bounds', /.+/)
  const referenceBounds = (await stage.getAttribute(
    'data-companion-screen-bounds'
  ))!
    .split(',')
    .map(Number)
  const referenceExtent = Math.max(referenceBounds[2], referenceBounds[3])
  const initialGeometries = Number(
    await stage.getAttribute('data-gpu-geometries')
  )
  for (const pet of pets.slice(1)) {
    await selectPet(page, pet.id)
    await expect(stage).toHaveAttribute('data-companion', pet.model)
    if (pet.id === 'xiaohei') {
      const metadata = await (
        await page.request.get('/models/mightyena-sleep.json')
      ).json()
      expect(metadata.pose).toBe('sit')
      expect(metadata.faceEdits.eyesRemoved).toBe(true)
      expect(metadata.faceEdits.clawsRemoved).toBe(false)
      expect(metadata.faceEdits.clawVertices).toBe(0)
      expect(metadata.faceEdits.removedFaces).toBeGreaterThan(0)
      expect(metadata.faceEdits.cappedFaces).toBeGreaterThan(0)
      expect(metadata.faceEdits.chinPreserved).toBe(true)
    }
    await expect(stage).toHaveAttribute(
      'data-companion-material',
      'chrome-wireframe'
    )
    await expect(stage).toHaveAttribute(
      'data-companion-material-phase',
      'wireframe'
    )
    await expect(stage).toHaveAttribute('data-companion-wire-opacity', '1.000')
    await expect(stage).toHaveAttribute(
      'data-companion-reflection-scale-y',
      '1'
    )
    expect(
      Number(await stage.getAttribute('data-companion-ground-y'))
    ).toBeCloseTo(0.035, 6)
    expect(
      Number(await stage.getAttribute('data-companion-width'))
    ).toBeCloseTo((info.project.name.includes('mobile') ? 0.7 : 1.1) * 2.6, 6)
    await expect(stage).toHaveAttribute('data-companion-pose', pet.pose)
    await expect(stage).toHaveAttribute(
      'data-companion-rotation',
      pet.rotationY.focus.toFixed(2)
    )
    await expect(stage).toHaveAttribute('data-companion-entrance', pet.entrance)
    await expect(stage).toHaveAttribute('data-companion-head-pose', '1.000')
    await expect(stage).toHaveAttribute('data-companion-screen-bounds', /.+/)
    const bounds = (await stage.getAttribute('data-companion-screen-bounds'))!
      .split(',')
      .map(Number)
    expect(Math.max(bounds[2], bounds[3]) / referenceExtent).toBeGreaterThan(
      0.9 * (pet.focusScale ?? 1)
    )
    expect(Math.max(bounds[2], bounds[3]) / referenceExtent).toBeLessThan(
      1.1 * (pet.focusScale ?? 1)
    )
    expect(
      Number(await stage.getAttribute('data-companion-facing-dot'))
    ).toBeGreaterThan(0.75)
    await expect(stage).toHaveAttribute('data-theme-color', pet.themeColor)
    await expect(page.locator('.flora-identity-bar__text')).toContainText(
      pet.name.zhCn
    )
    await expect(page.locator('.flora-identity-bar__type')).toContainText(
      pet.type.zhCn
    )
    await expect(page.locator('.flora-identity-bar__gender')).toHaveCSS(
      'color',
      'rgb(50, 118, 254)'
    )
    await expect(page.locator('.flora-identity-bar__ball')).toHaveCSS(
      'color',
      'rgb(50, 118, 254)'
    )
    await expect(page.locator('.flora-identity-bar__gender')).toHaveText(
      pet.gender === 'female' ? '♀' : '♂'
    )
    await expect(
      page.locator('.flora-number-bar__number')
    ).toHaveAccessibleName(`编号 00${pet.number}`)
    await expect
      .poll(() =>
        page.evaluate(() =>
          document.documentElement.style.getPropertyValue('--page-theme-color')
        )
      )
      .toBe(pet.themeColor)
    await expect(page.locator(`button[data-pet-id="${pet.id}"] svg`)).toHaveCSS(
      'color',
      'rgb(50, 118, 254)'
    )
    expect(Number(await stage.getAttribute('data-gpu-geometries'))).toBe(
      initialGeometries
    )
    await page.mouse.move(page.viewportSize()!.width - 4, 20)
    await page.screenshot({
      path: `.tmp/flora-${pet.id}-${info.project.name}.png`,
    })
  }
  await page.keyboard.press('Escape')
  await expect(root).toHaveAttribute('data-selected', 'none')
  await expect(root).toHaveAttribute('data-settled', 'true')
  await expect(stage).toHaveAttribute('data-companion', 'mightyena')
  await expect(stage).toHaveAttribute('data-companion-head-pose', '0.000')
  await expect(stage).toHaveAttribute('data-companion-material-phase', 'chrome')
  await expect(stage).toHaveAttribute(
    'data-companion-rotation',
    pets.find((pet) => pet.id === 'xiaohei')!.rotationY.home.toFixed(2)
  )
  await page.screenshot({
    path: `.tmp/flora-home-xiaohei-${info.project.name}.png`,
  })
  const homePoint = (await stage.getAttribute('data-companion-screen'))!
    .split(',')
    .map(Number)
  await page.mouse.click(homePoint[0], homePoint[1])
  await expect(page.locator('.flora-focus-layout')).toBeVisible()
  await expect(page.locator('button[data-pet-id="xiaohei"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await selectPet(page, 'huahua')
  await selectPet(page, 'xiaohei')
  expect(downloads.get('mightyena')).toBe(1)
  expect(
    await canvas!.evaluate(
      (el) => el === document.querySelector('.temple-stage canvas')
    )
  ).toBe(true)
  await page.evaluate(() =>
    (
      document.querySelector('.layout-page') as any
    ).__vueParentComponent.proxy.$router.push('/colorPalette')
  )
  await expect(root).toHaveCount(0)
  await page.evaluate(() =>
    (
      document.querySelector('.layout-page') as any
    ).__vueParentComponent.proxy.$router.push('/')
  )
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 30000,
  })
  await expect(stage).toHaveAttribute('data-companion', 'mightyena')
  await expect(stage).toHaveAttribute('data-pet-id', 'xiaohei')
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 30000,
  })
  await expect(stage).toHaveAttribute('data-companion', 'sprigatito')
  await expect(stage).toHaveAttribute('data-pet-id', 'huahua')
})

test('a slow earlier model cannot overwrite the last selection; failed models preserve the current pet and retry', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'), '异步加载逻辑两端共享')
  test.setTimeout(90000)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/models/mightyena-sleep.bin.gz*', async (route) => {
    await gate
    await route.continue()
  })
  const stage = await openFlora(page)
  const pending = page.waitForRequest('**/models/mightyena-sleep.bin.gz*')
  await page.locator('button[data-pet-id="xiaohei"]').click()
  await pending
  await selectPet(page, 'huahua')
  release()
  await expect(page.locator('.flora-focus-layout__character')).toHaveAttribute(
    'aria-busy',
    'false'
  )
  await expect(stage).toHaveAttribute('data-pet-id', 'huahua')
  await selectPet(page, 'xiaohei')
  // 清除已缓存的另一模型不可模拟下载失败，刷新后在首次下载时拦截。
  // 直接进入宠物模块，避免刷新后的会话恢复与模型命中采样竞态。
  await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.flora-focus-layout')).toBeVisible({
    timeout: 30000,
  })
  await page.route('**/models/mightyena-sleep.bin.gz*', (route) =>
    route.abort()
  )
  await page.locator('button[data-pet-id="xiaohei"]').click()
  await expect(page.getByRole('alert')).toContainText('模型加载失败')
  await expect(stage).toHaveAttribute('data-pet-id', 'huahua')
  await expect(page.locator('button[data-pet-id="huahua"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await page.unroute('**/models/mightyena-sleep.bin.gz*')
  await selectPet(page, 'xiaohei')
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('each pet fades and moves the camera, replays its number, follows the mouse and stops rendering', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'), '动作及休眠调度两端共享')
  test.setTimeout(90000)
  const stage = await openFlora(page, true)
  for (const id of ['xiaohei', 'huahua']) {
    const previousNumber = await page
      .locator('.flora-number-bar__number')
      .elementHandle()
    const beforeCamera = await stage.getAttribute('data-camera-position')
    await page.evaluate(() => {
      const stage = document.querySelector<HTMLElement>('.temple-stage')!
      const samples: { camera: string; visibility: number }[] = []
      ;(window as any).petTransitionSamples = samples
      const start = performance.now()
      // 模型提交时透明度为 0；该边界可能短于一帧，不能只靠 RAF 采样。
      const observer = new MutationObserver(() => {
        samples.push({
          camera: stage.dataset.cameraPosition!,
          visibility: Number(stage.dataset.companionVisibility),
        })
      })
      observer.observe(stage, {
        attributes: true,
        attributeFilter: ['data-companion-visibility'],
      })
      const sample = () => {
        samples.push({
          camera: stage.dataset.cameraPosition!,
          visibility: Number(stage.dataset.companionVisibility),
        })
        if (performance.now() - start < 3500) requestAnimationFrame(sample)
        else observer.disconnect()
      }
      sample()
    })
    await selectPet(page, id)
    await expect(stage).not.toHaveAttribute('data-companion-head-pose', '1.000')
    await expect(stage).toHaveAttribute('data-companion-head-pose', '1.000', {
      timeout: 10000,
    })
    expect(await previousNumber!.evaluate((node) => node.isConnected)).toBe(
      false
    )
    // 姿态诊断先于时间线完成回调更新，等其结束后再发鼠标事件。
    await page.waitForTimeout(150)
    await page.mouse.move(1200, 10)
    await expect
      .poll(async () =>
        Number(
          (await stage.getAttribute('data-companion-head-follow'))!.split(
            ','
          )[1]
        )
      )
      .toBeLessThan(-1.8)
    // 两只宠物都正面朝向镜头：右侧鼠标应产生正向 yaw，左侧应产生负向 yaw。
    await expect
      .poll(async () =>
        Number(
          (await stage.getAttribute('data-companion-head-follow'))!.split(
            ','
          )[0]
        )
      )
      .toBeGreaterThan(0.4)
    await page.mouse.move(5, 10)
    await expect
      .poll(async () =>
        Number(
          (await stage.getAttribute('data-companion-head-follow'))!.split(
            ','
          )[0]
        )
      )
      .toBeLessThan(-0.4)
    await page.waitForTimeout(1800)
    const samples = await page.evaluate(
      () =>
        (window as any).petTransitionSamples as {
          camera: string
          visibility: number
        }[]
    )
    expect(
      new Set(samples.map((sample) => sample.camera)).size
    ).toBeGreaterThan(3)
    expect(
      Math.min(...samples.map((sample) => sample.visibility))
    ).toBeLessThan(0.1)
    expect(await stage.getAttribute('data-camera-position')).not.toBe(
      beforeCamera
    )
    await expect(page.locator('.flora-identity-bar__gender')).toHaveCSS(
      'color',
      id === 'huahua' ? 'rgb(206, 76, 135)' : 'rgb(50, 118, 254)'
    )
    const frames = await stage.getAttribute('data-render-frames')
    await page.waitForTimeout(1000)
    expect(await stage.getAttribute('data-render-frames')).toBe(frames)
  }
  // 在小黑入场途中切向花花，再立即选回小黑，不能停在半个姿势或半透明状态。
  await selectPet(page, 'xiaohei')
  await page.locator('button[data-pet-id="huahua"]').click()
  await expect
    .poll(async () =>
      Number(await stage.getAttribute('data-companion-visibility'))
    )
    .toBeLessThan(0.9)
  await selectPet(page, 'xiaohei')
  await expect(stage).toHaveAttribute('data-companion-head-pose', '1.000')
  await expect(stage).toHaveAttribute('data-companion-visibility', '1.000')
  await expect(stage).toHaveAttribute(
    'data-companion-rotation',
    pets.find((pet) => pet.id === 'xiaohei')!.rotationY.focus.toFixed(2)
  )
})
