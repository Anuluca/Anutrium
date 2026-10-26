import { expect, test } from '@playwright/test'

const diagnosticFields = [
  'templeScale',
  'cameraPosition',
  'bodyColors',
  'headacheStickerOpacity',
  'companionGroundY',
  'scanGeometryBytes',
  'sceneDrawCalls',
  'renderPixelRatio',
]

test('ordinary visits skip diagnostics while focus and theme still work', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 60000,
  })
  await expect(stage).toHaveAttribute('aria-busy', 'false')
  expect(
    await page.evaluate(() => window.__ANUTRIUM_HOME_DIAGNOSTICS__)
  ).toBeUndefined()
  const assertNoDiagnostics = async () => {
    const published = await stage.evaluate(
      (element, fields) =>
        fields.filter((field) => field in (element as HTMLElement).dataset),
      diagnosticFields
    )
    expect(published).toEqual([])
  }
  await assertNoDiagnostics()
  await page.evaluate(() => {
    const pinia = (document.querySelector('#app') as any).__vue_app__.config
      .globalProperties.$pinia
    pinia._s.get('visualState').setTheme('light')
    pinia._s.get('temple-navigation').request('statue')
  })
  await expect(stage).toHaveAttribute('data-color-mode', 'light')
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'statue'
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 15000 }
  )
  await assertNoDiagnostics()
  expect(
    await stage.evaluate((element) =>
      element.style.getPropertyValue('--temple-horizon-y')
    )
  ).not.toBe('')
})

test('explicit diagnostics skip formatting and projection when off without changing pixels', async ({
  page,
}, info) => {
  test.skip(info.project.name.includes('mobile'))
  test.setTimeout(120000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    window.__ANUTRIUM_HOME_DIAGNOSTICS__ = true
  })
  await page.route('**/src/views/Home/templeScene.ts*', async (route) => {
    const response = await route.fetch()
    const source = await response.text()
    const declaration =
      'const diagnosticsEnabled = isHomeSceneDiagnosticsEnabled();'
    const marker = 'renderer.domElement.tabIndex = 0'
    expect(source).toContain(declaration)
    expect(source).toContain(marker)
    // 仅测试时注入同步采样器：同一姿态、同一时刻切换诊断，对比完整画布像素。
    const measure = `
      window.__measureSceneDiagnostics = () => {
        const savedEnabled = diagnosticsEnabled;
        const savedLastDraw = lastDraw;
        const savedMotionIdle = motionIdle;
        const fixed = Number.prototype.toFixed;
        const project = THREE.Vector3.prototype.project;
        const now = performance.now();
        let current;
        const samples = [];
        const pixels = [];
        Number.prototype.toFixed = function (...args) {
          current.formats++; return fixed.apply(this, args);
        };
        THREE.Vector3.prototype.project = function (...args) {
          current.projections++; return project.apply(this, args);
        };
        try {
          for (const enabled of [false, true, false]) {
            diagnosticsEnabled = enabled;
            diagnosticsDirty = true;
            lastDraw = now - 17;
            motionIdle = true;
            current = { enabled, formats: 0, projections: 0 };
            render(now);
            const gl = renderer.getContext();
            const data = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
            gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);
            pixels.push(data);
            samples.push(current);
          }
        } finally {
          Number.prototype.toFixed = fixed;
          THREE.Vector3.prototype.project = project;
          diagnosticsEnabled = savedEnabled;
          lastDraw = savedLastDraw;
          motionIdle = savedMotionIdle;
        }
        let maxDelta = 0;
        let changedPixels = 0;
        for (let index = 0; index < pixels[0].length; index += 4) {
          let changed = false;
          for (let sample = 1; sample < pixels.length; sample++)
            for (let channel = 0; channel < 4; channel++) {
              const delta = Math.abs(pixels[0][index + channel] - pixels[sample][index + channel]);
              maxDelta = Math.max(maxDelta, delta);
              changed ||= delta > 0;
            }
          if (changed) changedPixels++;
        }
        return { samples, maxDelta, changedPixels, totalPixels: pixels[0].length / 4 };
      };
    `
    await route.fulfill({
      response,
      body: source
        .replace(declaration, declaration.replace('const ', 'let '))
        .replace(marker, measure + marker),
    })
  })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 60000,
  })
  await expect(stage).toHaveAttribute('data-shader-warmup', 'complete')
  await expect(stage).toHaveAttribute('data-scan-geometry-bytes', /\d+/)
  await expect(stage).toHaveAttribute('data-camera-position', /,/)
  const results: Record<string, unknown> = {}
  for (const selection of [null, 'statue', 'sprigatito']) {
    await page.evaluate((selection) => {
      ;(
        document.querySelector('#app') as any
      ).__vue_app__.config.globalProperties.$pinia._s
        .get('temple-navigation')
        .request(selection)
    }, selection)
    const root = page.locator('.temple-page')
    await expect(root).toHaveAttribute('data-selected', selection || 'none')
    if (selection)
      await expect(root).toHaveAttribute('data-settled', 'true', {
        timeout: 20000,
      })
    await page.waitForTimeout(1200)
    const result = await page.evaluate(() =>
      (window as any).__measureSceneDiagnostics()
    )
    expect(result.samples[1].formats).toBeGreaterThan(result.samples[0].formats)
    expect(result.samples[1].projections).toBeGreaterThan(
      result.samples[0].projections
    )
    expect(result.samples[2]).toEqual(result.samples[0])
    expect(result.maxDelta).toBe(0)
    results[selection || 'home'] = result
  }
  await info.attach('diagnostic-work-and-pixel-comparison', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  })
})
