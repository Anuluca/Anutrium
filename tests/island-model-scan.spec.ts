import { expect, type Page, test } from './helpers/sceneDiagnostics'

const navigate = (page: Page, path: string) =>
  page.evaluate(async (path) => {
    const app = document.querySelector('#app') as any
    await app.__vue_app__.config.globalProperties.$router.push(path)
  }, path)

test('Island zooms in sync with scanning and shrinks directly along its return camera path', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (
      message.type() === 'error' &&
      /WebGLProgram|Shader Error/.test(message.text())
    )
      errors.push(message.text())
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 60000,
  })
  await page.evaluate(() => {
    const samples: {
      progress: number
      moving: boolean
      chrome: number
      phase: string
      restoring: boolean
      camera: string
      height: string
      environment: string
      following: boolean
      returnPhase: string
      head: string
      body: string
      zoom: number
      fov: number
      nod: number
      drop: number
    }[] = []
    ;(window as any).islandScanSamples = samples
    const sample = () => {
      const stage = document.querySelector<HTMLElement>('.temple-stage')
      if (!stage) return
      samples.push({
        progress: Number(stage.dataset.statueScanProgress),
        moving: stage.dataset.cameraMoving === 'true',
        chrome: Number(stage.dataset.statueChromeOpacity),
        phase: stage.dataset.materialPhase || '',
        restoring: stage.dataset.statueRestoring === 'true',
        camera: stage.dataset.cameraPosition || '',
        height: stage.dataset.statueY || '',
        environment: stage.dataset.templeReveal || '',
        following: stage.dataset.statueMouseFollow === 'true',
        returnPhase: stage.dataset.statueReturnPhase || '',
        head: stage.dataset.statueHeadPointer || '',
        body: stage.dataset.statueBodyRotation || '',
        zoom: Number(stage.dataset.cameraZoom),
        fov: Number(stage.dataset.cameraFov),
        nod: Number(stage.dataset.headNodAngle),
        drop: Number(stage.dataset.statueZoomDrop),
      })
      if (samples.length < 1500) requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
  await navigate(page, '/island')
  await expect(stage).toHaveAttribute('data-material-phase', 'wireframe', {
    timeout: 20000,
  })
  await expect(stage).toHaveAttribute('data-camera-zoom', '1.3000')
  await expect(stage).toHaveAttribute('data-camera-fov', '48')
  await expect(stage).toHaveAttribute('data-head-nod-angle', '5.000')
  await expect(stage).toHaveAttribute('data-statue-zoom-drop', '0.0600')
  const samples = await page.evaluate(
    () =>
      (window as any).islandScanSamples as {
        progress: number
        moving: boolean
        chrome: number
        phase: string
        restoring: boolean
        camera: string
        height: string
        environment: string
        following: boolean
        returnPhase: string
        head: string
        body: string
        zoom: number
        fov: number
        nod: number
        drop: number
      }[]
  )
  const moving = samples.filter((sample) => sample.moving)
  const scanning = samples.filter((sample) => sample.phase === 'scanning')
  expect(moving.length).toBeGreaterThan(0)
  expect(moving.every((sample) => sample.chrome === 1)).toBe(true)
  expect(moving.some((sample) => sample.progress === 0)).toBe(true)
  expect(
    moving
      .filter((sample) => sample.progress === 0)
      .every((sample) => sample.fov === 38)
  ).toBe(true)
  expect(
    moving
      .filter((sample) => sample.progress === 0)
      .every((sample) => sample.nod === 10)
  ).toBe(true)
  expect(moving.every((sample) => sample.fov >= 38 && sample.fov <= 48)).toBe(
    true
  )
  expect(scanning.length).toBeGreaterThan(0)
  expect(
    scanning.every(
      (sample) =>
        !sample.following &&
        sample.chrome === 1 &&
        sample.progress >= 0 &&
        sample.progress <= 1
    )
  ).toBe(true)
  expect(scanning.some((sample) => sample.zoom > 1)).toBe(true)
  expect(scanning.some((sample) => sample.fov > 38 && sample.fov < 48)).toBe(
    true
  )
  for (const sample of scanning)
    expect(
      Math.abs((sample.fov - 38) / 10 - (sample.zoom - 1) / 0.3)
    ).toBeLessThan(0.001)
  for (const sample of scanning)
    expect(
      Math.abs((10 - sample.nod) / 5 - (sample.zoom - 1) / 0.3)
    ).toBeLessThan(0.001)
  expect(scanning.some((sample) => sample.drop > 0 && sample.drop < 0.06)).toBe(
    true
  )
  for (const sample of scanning)
    expect(
      Math.abs(sample.drop - ((sample.zoom - 1) / 0.3) * 0.06)
    ).toBeLessThan(0.0001)
  // 放大柔和起步、长尾收束，独立于扫描速率，仅共享起止时刻。
  for (const sample of scanning.filter(
    (sample) => sample.progress > 0.05 && sample.progress < 0.95
  )) {
    const time =
      sample.progress < 0.5
        ? Math.sqrt(sample.progress / 2)
        : 1 - Math.sqrt((1 - sample.progress) / 2)
    const zoomProgress = (sample.zoom - 1) / 0.3
    expect(zoomProgress).toBeGreaterThanOrEqual(0)
    expect(zoomProgress).toBeLessThanOrEqual(1)
    if (time < 0.25) expect(zoomProgress).toBeLessThan(time)
    if (time > 0.75) expect(zoomProgress).toBeGreaterThan(time)
  }
  for (let i = 1; i < scanning.length; i++)
    expect(scanning[i].progress).toBeGreaterThanOrEqual(
      scanning[i - 1].progress
    )
  await expect(stage).toHaveAttribute('data-statue-fill-opacity', '0.550')
  await expect(stage).toHaveAttribute('data-statue-scan-glow', 'false')
  await expect(stage).toHaveAttribute('data-statue-mouse-follow', 'true')
  const viewport = page.viewportSize()!
  await page.mouse.move(viewport.width * 0.8, viewport.height * 0.3)
  await expect
    .poll(async () =>
      Math.abs(
        Number(
          (await stage.getAttribute('data-statue-head-pointer'))!.split(',')[0]
        )
      )
    )
    .toBeGreaterThan(0.15)
  await expect
    .poll(async () =>
      Math.abs(
        Number(
          (await stage.getAttribute('data-statue-body-rotation'))!.split(',')[1]
        )
      )
    )
    .toBeGreaterThan(0.01)

  const canvas = page.locator('canvas[aria-label="路卡利欧三维模型"]')
  const returnHome = async () => {
    const sampleStart = await page.evaluate(
      () => (window as any).islandScanSamples.length
    )
    await page.keyboard.press('Escape')
    await expect(stage).toHaveAttribute('data-statue-restoring', 'true')
    await expect(stage).toHaveAttribute('data-statue-mouse-follow', 'false')
    // 回正及扫描期间移动指针，不能把模型再次带偏。
    await page.mouse.move(viewport.width * 0.2, viewport.height * 0.7)
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-selected',
      'none',
      { timeout: 10000 }
    )
    await expect(stage).toHaveAttribute('data-statue-restoring', 'false', {
      timeout: 10000,
    })
    await expect(stage).toHaveAttribute('data-camera-zoom', '1.0000')
    await expect(stage).toHaveAttribute('data-statue-zoom-drop', '0.0000')
    await expect(stage).toHaveAttribute('data-camera-fov', '38')
    await expect(stage).toHaveAttribute('data-head-nod-angle', '10.000')
    const restoreSamples = (await page.evaluate(
      (start) => (window as any).islandScanSamples.slice(start),
      sampleStart
    )) as typeof samples
    const restoring = restoreSamples.filter((sample) => sample.restoring)
    expect(restoring.length).toBeGreaterThan(0)
    const aligning = restoring.filter(
      (sample) => sample.returnPhase === 'aligning'
    )
    const scanningBack = restoring.filter(
      (sample) => sample.returnPhase === 'scanning'
    )
    expect(aligning.length).toBeGreaterThan(0)
    const before = aligning[0]
    expect(restoring.every((sample) => !sample.following)).toBe(true)
    // 回正后直接退镜；倍率恢复与机位同步，不得先在原地单独缩小。
    expect(
      aligning.every(
        (sample) =>
          !sample.moving &&
          sample.camera === before.camera &&
          sample.height === before.height &&
          sample.environment === '0.000'
      )
    ).toBe(true)
    expect(
      scanningBack.some(
        (sample) =>
          sample.progress > 0 &&
          sample.progress < 1 &&
          sample.camera !== before.camera
      )
    ).toBe(true)
    if (before.zoom > 1)
      expect(
        scanningBack.some(
          (sample) =>
            sample.progress > 0 &&
            sample.progress < 1 &&
            sample.zoom < before.zoom
        )
      ).toBe(true)
    expect(
      scanningBack.every(
        (sample) =>
          sample.camera !== before.camera || sample.zoom === before.zoom
      )
    ).toBe(true)
    expect(aligning.length).toBeGreaterThan(0)
    expect(
      aligning.every((sample) => sample.progress === aligning[0].progress)
    ).toBe(true)
    expect(scanningBack.length).toBeGreaterThan(0)
    expect(
      scanningBack.every((sample) =>
        [...sample.head.split(','), ...sample.body.split(',')].every(
          (value) => Math.abs(Number(value)) < 0.00002
        )
      )
    ).toBe(true)
    for (let i = 1; i < restoring.length; i++) {
      expect(restoring[i].progress).toBeLessThanOrEqual(
        restoring[i - 1].progress
      )
      expect(restoring[i].zoom).toBeLessThanOrEqual(restoring[i - 1].zoom)
    }
    await expect(stage).toHaveAttribute('data-camera-moving', 'false', {
      timeout: 10000,
    })
    await expect(stage).toHaveAttribute('data-statue-scan-progress', '0.0000')
  }
  await returnHome()
  await expect(stage).toHaveAttribute('data-material-phase', 'chrome')
  await canvas.press('Enter')
  await expect
    .poll(
      async () => Number(await stage.getAttribute('data-statue-scan-progress')),
      { timeout: 15000 }
    )
    .toBeGreaterThan(0.2)
  await returnHome()
  // 等待超过被中断扫描的剩余时长，检查旧回调没有再次切换材质。
  await page.waitForTimeout(1600)
  await expect(stage).toHaveAttribute('data-material-phase', 'chrome')
  await expect(stage).toHaveAttribute('data-statue-wire-opacity', '0.000')
  await canvas.press('Enter')
  await expect(stage).toHaveAttribute('data-material-phase', 'wireframe', {
    timeout: 15000,
  })
  await page.screenshot({
    path: `/tmp/island-scan-complete-${info.project.name}.png`,
  })
  // 切换到其他模块时取消恢复等待，沿用原有并行运镜，旧回调不能把新模块退出。
  await page.keyboard.press('Escape')
  await expect(stage).toHaveAttribute('data-statue-restoring', 'true')
  await navigate(page, '/creative')
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'island'
  )
  await expect(stage).toHaveAttribute('data-statue-restoring', 'false')
  await expect(stage).toHaveAttribute('data-camera-zoom', '1.0000')
  await expect(stage).toHaveAttribute('data-camera-moving', 'false', {
    timeout: 15000,
  })
  await page.waitForTimeout(2400)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'island'
  )
  expect(errors).toEqual([])
})
