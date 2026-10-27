import { expect, test } from './helpers/sceneDiagnostics'

const modules = [
  ['/atrium/laboratory', 'LABORATORY', 'left', -Math.PI / 2],
  ['/atrium/notes', 'NOTES', 'left', -Math.PI / 2],
  ['/atrium/games', 'GAME LIBRARY', 'right', Math.PI / 2],
  ['/atrium/collections', 'COLLECTIBLES', 'right', Math.PI],
] as const

for (const [path, moduleId, side, rotation] of modules) {
  test(`${path} restores its module pose before the canvas becomes visible`, async ({
    page,
  }, info) => {
    test.setTimeout(90000)
    await page.addInitScript(() => {
      // 在画布解除隐藏时取样，最终状态断言无法发现首帧闪现。
      const observer = new MutationObserver(() => {
        const canvas = document.querySelector<HTMLCanvasElement>(
          '.temple-stage canvas'
        )
        if (!canvas || canvas.style.visibility !== 'visible') return
        const stage = canvas.parentElement!
        ;(window as any).firstAtriumPose = {
          module: stage.dataset.islandDetailModule,
          side: stage.dataset.islandDetailSide,
          rotation: Number(stage.dataset.statueBodyRotation?.split(',')[1]),
          zoom: Number(stage.dataset.cameraZoom),
        }
        observer.disconnect()
      })
      observer.observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['style'],
      })
    })
    const checkFirstPose = async () => {
      await expect
        .poll(() => page.evaluate(() => (window as any).firstAtriumPose), {
          timeout: 45000,
        })
        .toBeTruthy()
      const pose = await page.evaluate(() => (window as any).firstAtriumPose)
      expect(pose.module).toBe(moduleId)
      expect(pose.side).toBe(side)
      expect(pose.rotation).toBeCloseTo(rotation, 4)
      expect(pose.zoom).toBeCloseTo(
        info.project.name === 'mobile-chrome' ? 1.45 : 2.15,
        4
      )
      await expect(page.locator('.island-focus')).toHaveAttribute(
        'data-detail-item',
        moduleId,
        { timeout: 45000 }
      )
      await expect(
        page.locator(`[data-link-item="${moduleId}"] .island-anchor__frame`)
      ).toBeVisible()
    }
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await checkFirstPose()
    await page.reload({ waitUntil: 'domcontentloaded' })
    await checkFirstPose()
  })
}
