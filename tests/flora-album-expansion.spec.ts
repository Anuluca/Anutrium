import { expect, test } from '@playwright/test'

test('album fills its container and fades profile content while category titles share the mode toolbar', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  const mobile = info.project.name.includes('mobile')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/floratrium', { waitUntil: 'domcontentloaded' })
  const gallery = page.locator('.flora-album-gallery')
  await expect(gallery).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 20000,
  })
  const alert = page.locator('.mobile-experience-alert')
  if (await alert.isVisible()) await alert.click()
  await expect(
    gallery.getByRole('tab', { name: '花花相册', exact: true })
  ).toHaveAttribute('aria-selected', 'true')
  await gallery.getByRole('tab', { name: '花花的邻居们', exact: true }).click()
  await gallery.scrollIntoViewIfNeeded()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const sampleFade = () =>
    page.evaluate(async () => {
      const profile = document.querySelector<HTMLElement>(
        '.flora-media-region__profile'
      )!
      const button = document.querySelector<HTMLButtonElement>(
        '.flora-album-gallery__expand'
      )!
      const samples: { opacity: number; visibility: string }[] = []
      button.click()
      const start = performance.now()
      await new Promise<void>((resolve) => {
        const tick = () => {
          const style = getComputedStyle(profile)
          samples.push({
            opacity: Number(style.opacity),
            visibility: style.visibility,
          })
          if (performance.now() - start < 1250) requestAnimationFrame(tick)
          else resolve()
        }
        requestAnimationFrame(tick)
      })
      return samples
    })
  const leaving = await sampleFade()
  expect(
    leaving.some(
      (sample) =>
        sample.opacity > 0 &&
        sample.opacity < 1 &&
        sample.visibility === 'visible'
    )
  ).toBe(true)
  await expect(gallery).toHaveClass(/is-expanded/)
  await expect(page.locator('.flora-media-region__profile')).toBeHidden()
  await expect(page.locator('.flora-pet-level')).toBeHidden()
  await expect(gallery.getByRole('tablist')).toBeInViewport()
  const geometry = await gallery.evaluate((element) => {
    const album = element.getBoundingClientRect()
    const region = document
      .querySelector('.flora-media-region')!
      .getBoundingClientRect()
    return {
      album: album.toJSON(),
      region: region.toJSON(),
      containerTop: element
        .closest('.flora-focus-layout__content')!
        .getBoundingClientRect().top,
      title: element
        .querySelector('.flora-album-gallery__title')!
        .getBoundingClientRect()
        .toJSON(),
      viewportHeight: innerHeight,
    }
  })
  if (mobile) {
    expect(geometry.album.top).toBeCloseTo(0, 0)
    expect(geometry.album.height).toBeCloseTo(geometry.viewportHeight, 0)
    expect(geometry.title.top - geometry.album.top).toBeCloseTo(8, 0)
  } else {
    expect(geometry.title.bottom - geometry.album.top).toBeCloseTo(4, 0)
    expect(geometry.title.top).toBeCloseTo(geometry.region.top - 16, 0)
    expect(geometry.title.top).toBeGreaterThanOrEqual(geometry.containerTop - 1)
    expect(geometry.album.bottom).toBeCloseTo(geometry.region.bottom, 0)
    expect(geometry.title.bottom).toBeLessThanOrEqual(
      geometry.region.bottom + 1
    )
    for (const axis of ['left', 'width'])
      expect(
        Math.abs(geometry.album[axis] - geometry.region[axis])
      ).toBeLessThanOrEqual(1)
  }
  const rows = await gallery
    .locator('.flora-album-gallery__friend-group')
    .evaluateAll((groups) =>
      groups.map((group) => {
        const title = group.querySelector('h3')!
        const toolbar = group.querySelector('.media-gallery__toolbar')!
        const button = toolbar.querySelector('button')!
        const a = title.getBoundingClientRect(),
          b = button.getBoundingClientRect()
        const row = toolbar.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(title)
        const text = range.getBoundingClientRect()
        const style = getComputedStyle(title)
        return {
          inToolbar: toolbar.contains(title),
          centerDelta: Math.abs((a.top + a.bottom - b.top - b.bottom) / 2),
          horizontalCenterDelta: Math.abs(
            (a.left + a.right - row.left - row.right) / 2
          ),
          textCenterDelta: Math.abs(
            (text.left + text.right - row.left - row.right) / 2
          ),
          font: style.fontFamily,
          weight: style.fontWeight,
          color: style.color,
          shadow: style.textShadow,
        }
      })
    )
  expect(rows).toHaveLength(4)
  for (const row of rows) {
    expect(row.inToolbar).toBe(true)
    expect(row.centerDelta).toBeLessThanOrEqual(1)
    expect(row.horizontalCenterDelta).toBeLessThanOrEqual(1)
    expect(row.textCenterDelta).toBeLessThanOrEqual(1)
    expect(row.font).toContain('alibaba-puhuiti')
    expect(row.weight).toBe('900')
    expect(row.color).toBe('rgb(255, 255, 255)')
    expect(row.shadow).not.toBe('none')
  }
  await page.screenshot({
    path: `.tmp/flora-album-full-${info.project.name}.png`,
  })
  const entering = await sampleFade()
  expect(
    entering.some(
      (sample) =>
        sample.opacity > 0 &&
        sample.opacity < 1 &&
        sample.visibility === 'visible'
    )
  ).toBe(true)
  await expect(page.locator('.flora-media-region__profile')).toBeVisible()
  await expect(page.locator('.flora-pet-level')).toBeVisible()
  await expect(gallery).not.toHaveClass(/is-expanded/)
})
