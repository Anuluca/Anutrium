import { expect, test } from '@playwright/test'

test('journey detail returns with a stable chart and header and no horizon loader', async ({
  page,
}, testInfo) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/flanerie/changsha?from=home', {
    waitUntil: 'domcontentloaded',
  })
  await expect(page.locator('.flr-page')).toBeVisible({ timeout: 30000 })
  await expect(page.locator('.entry-overlay-container')).toBeVisible({
    timeout: 15000,
  })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
  await expect(page.locator('.logo-box .logo')).toBeVisible()
  if (!testInfo.project.name.includes('mobile'))
    await expect(page.locator('.desktop-menu')).toBeVisible()
  await page.evaluate(() => {
    const probe = {
      samples: [] as {
        centered: boolean
        red: boolean
        loader: boolean
        logoX: number
        navigation: boolean
      }[],
      stop: false,
    }
    const sample = () => {
      const shell = document.querySelector('.layout-page')!
      const chart = document.querySelector('.star-container')!
      const logo = document.querySelector('.logo-box .logo')!
      const menu = document.querySelector<HTMLElement>('.desktop-menu')
      probe.samples.push({
        centered: shell.classList.contains('temple-header-default'),
        red: chart.classList.contains('is-red-layout'),
        loader: !!document.querySelector(
          '.entry-overlay-container, .site-loading-progress'
        ),
        logoX: logo.getBoundingClientRect().left,
        navigation: !!menu && getComputedStyle(menu).opacity !== '0',
      })
    }
    const observer = new MutationObserver(sample)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class'],
    })
    const frame = () => {
      if (probe.stop) return
      sample()
      requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
    ;(window as any).homeReturnProbe = { probe, observer }
  })
  await page.locator('.detail-page-header__back').click()
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'flanerie',
    { timeout: 30000 }
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 15000 }
  )
  await expect(
    page.locator('.temple-focus-content .travel-map-shell')
  ).toBeVisible()
  const samples = await page.evaluate(() => {
    const { probe, observer } = (window as any).homeReturnProbe
    probe.stop = true
    observer.disconnect()
    return probe.samples as {
      centered: boolean
      red: boolean
      loader: boolean
      logoX: number
      navigation: boolean
    }[]
  })
  expect(samples.length).toBeGreaterThan(10)
  expect(
    samples
      .filter((sample) => sample.centered || sample.red || sample.loader)
      .slice(0, 8)
  ).toEqual([])
  const endpoints = [samples[0].logoX, samples[samples.length - 1].logoX]
  expect(
    Math.max(...samples.map((sample) => sample.logoX))
  ).toBeLessThanOrEqual(Math.max(...endpoints) + 1)
  expect(
    Math.min(...samples.map((sample) => sample.logoX))
  ).toBeGreaterThanOrEqual(Math.min(...endpoints) - 1)
  if (!testInfo.project.name.includes('mobile'))
    expect(samples.every((sample) => sample.navigation)).toBe(true)
})
