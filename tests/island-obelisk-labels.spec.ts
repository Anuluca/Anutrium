import { expect, test } from './helpers/sceneDiagnostics'

test('obelisk inscriptions draw after their stone while entering Island and returning home', async ({
  page,
}) => {
  test.setTimeout(60000)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true', {
    timeout: 30000,
  })
  await page.evaluate(async () => {
    const { installObeliskLabelProbe } = await import(
      '/tests/fixtures/island-obelisk-label-probe.ts'
    )
    ;(window as any).obeliskLabelProbe = installObeliskLabelProbe()
  })
  const checkLabels = async () => {
    const samples = await page.evaluate(() => {
      const probe = (window as any).obeliskLabelProbe
      const samples = [...probe.samples]
      probe.reset()
      return samples as {
        reveal: number
        alpha: number
        rear: boolean
        stoneDrawn: boolean
      }[]
    })
    expect(samples.some((sample) => sample.rear)).toBe(true)
    expect(
      samples
        .filter((sample) => sample.rear)
        .every((sample) => sample.stoneDrawn)
    ).toBe(true)
  }
  await stage.locator('canvas').focus()
  await page.keyboard.press('Enter')
  await expect(stage).toHaveAttribute('data-material-phase', 'wireframe', {
    timeout: 15000,
  })
  await checkLabels()
  await page.keyboard.press('Escape')
  await expect(stage).toHaveAttribute('data-statue-restoring', 'false', {
    timeout: 15000,
  })
  await expect(stage).toHaveAttribute('data-temple-reveal', '1.000')
  await checkLabels()
  await page.evaluate(() => (window as any).obeliskLabelProbe.restore())
})
