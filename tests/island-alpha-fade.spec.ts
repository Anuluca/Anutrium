import { expect, test } from './helpers/sceneDiagnostics'

test('atrium fades the wireframe with continuous alpha', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript(() => {
    const sources: string[] = []
    ;(window as any).atriumFadeShaders = sources
    for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const original = context.prototype.shaderSource
      context.prototype.shaderSource = function (shader, source) {
        if (source.includes('atriumCoverage')) sources.push(source)
        return original.call(this, shader, source)
      }
    }
  })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.island-focus')).toBeVisible({ timeout: 60000 })
  const shaders = await page.evaluate(
    () => (window as any).atriumFadeShaders as string[]
  )
  expect(
    shaders.some((source) => source.includes('gl_FragColor *= atriumCoverage'))
  ).toBe(true)
  expect(
    shaders.every((source) => !source.includes('coverage <= threshold'))
  ).toBe(true)
})
