import * as THREE from 'three'

import { expect, test } from './helpers/sceneDiagnostics'

test('all four pillar focus poses keep a restrained horizontal head turn', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('**/site/home-features', (route) =>
    route.fulfill({
      json: { lucarioHeadache: false, headacheCount: 10, updatedAt: null },
    })
  )
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 45000,
  })
  const mobile = info.project.name.includes('mobile')
  for (const [id, sign] of [
    ['archive', -1],
    ['flanerie', -1],
    ['pokeyard', 1],
    ['island', 1],
  ] as const) {
    await page
      .locator(`[data-obelisk="${id}"]`)
      .evaluate((el: HTMLButtonElement) => el.click())
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true',
      { timeout: 15000 }
    )
    await expect(stage).toHaveAttribute('data-head-turn-progress', '1.000')
    const rotation = (await stage.getAttribute('data-head-rotation'))!
      .split(',')
      .map(Number)
    const angles = new THREE.Euler().setFromQuaternion(
      new THREE.Quaternion().fromArray(rotation),
      'YXZ'
    )
    const yaw = THREE.MathUtils.radToDeg(angles.y) * sign
    // 限制实际输出姿态；旧版桌面 55°～65° 的侧转会直接失败。
    expect(yaw).toBeGreaterThan(mobile ? 15 : 30)
    expect(yaw).toBeLessThan(mobile ? 25 : 45)
    const body = (await stage.getAttribute('data-statue-body-rotation'))!
      .split(',')
      .map(Number)
    expect(Math.abs(body[1])).toBeLessThan(0.0001)
    await page.screenshot({ path: info.outputPath(`${id}-focus.png`) })
  }
  await page.keyboard.press('Escape')
  await expect(stage).toHaveAttribute('data-head-aim', 'pointer', {
    timeout: 15000,
  })
})
