import { expect, test } from '@playwright/test'

const pages = [
  ['/', '.temple-page'],
  ['/archive', '.archive-content'],
  ['/flanerie', '.journey-content'],
  ['/creative', '.creative-content'],
  ['/pokeyard', '.temple-page'],
  ['/floratrium', '.temple-page'],
  ['/atrium', '.temple-page'],
  ['/atrium/laboratory', '.temple-page'],
  ['/atrium/notes', '.temple-page'],
  ['/atrium/games', '.temple-page'],
  ['/atrium/collections', '.island-collections-content'],
  ['/about', '.about-page'],
  ['/404', '.not-found-page'],
  ['/test', '[data-route-shell]'],
  ['/test2', '.home-page'],
  ['/flanerie/nanchang', '.flr-page'],
  ['/atrium/photography', '.photography-page'],
  ['/atrium/merch/lucarioNoArm', '.merch-detail-page'],
  ['/atrium/image-log', '.image-log-page'],
  ['/atrium/image-log/covid', '.image-log-detail-page'],
  ['/atrium/illustration', '.works-gallery-page'],
  ['/atrium/trainer-card', '.works-gallery-page'],
  ['/colorPalette', '.palette-tool'],
  ['/easeStudio', '.ease-tool'],
  ['/metronome', '.metronome-tool'],
  ['/bounceDynamics', '.bounce-tool'],
  ['/htmlEntities', '.entity-tool'],
  ['/base64Codec', '.codec-tool'],
  ['/imageBase64', '.image64-tool'],
  ['/ai-playground/arknightxpersona3reload', '.arknight-page'],
  ['/games/sleepingdogs/bullsAndCows', '.sleeping-dogs-game'],
  ['/games/sleepingdogs/saftybox', '.sleeping-dogs-safety-box'],
] as const

for (const [path, selector] of pages) {
  test(`${path} renders without horizontal page overflow`, async ({ page }) => {
    test.setTimeout(60000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator(selector).first()).toBeVisible({ timeout: 45000 })
    await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
      timeout: 45000,
    })
    await expect
      .poll(() =>
        page.evaluate(() => {
          const root = document.documentElement
          return (
            Math.max(root.scrollWidth, document.body.scrollWidth) -
            root.clientWidth
          )
        })
      )
      .toBeLessThanOrEqual(1)
    expect(errors).toEqual([])
  })
}

test('tool grids contain long content on narrow phones and tablets', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [320, 393, 820]) {
    await page.setViewportSize({ width, height: 900 })
    for (const path of [
      '/colorPalette',
      '/easeStudio',
      '/metronome',
      '/bounceDynamics',
      '/base64Codec',
      '/imageBase64',
    ]) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      const grid = page.locator('.pt-grid')
      await expect(grid).toBeVisible()
      const bounds = await grid.evaluate((element) => {
        const panel = element.firstElementChild as HTMLElement
        const probe = document.createElement('span')
        probe.textContent = 'LONG_UNBREAKABLE_CONTENT_'.repeat(100)
        panel.append(probe)
        const rect = element.getBoundingClientRect()
        const result = {
          width: rect.width,
          panelWidth: panel.getBoundingClientRect().width,
          columns:
            getComputedStyle(element).gridTemplateColumns.split(' ').length,
        }
        probe.remove()
        return result
      })
      expect(bounds.panelWidth).toBeLessThanOrEqual(bounds.width + 1)
      expect(bounds.columns).toBe(1)
    }
  }
})
