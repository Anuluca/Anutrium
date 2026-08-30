import { expect, test } from '@playwright/test'

const PAGE_LOAD_TIMEOUT = 20_000

test('PASSION uses large yellow non-rotating Inspira sparkles only on hover', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const passionLine = page.locator('.passion-line')
  const passionText = passionLine.locator('.passion')
  const radiantText = passionLine.locator('.passion-radiant')
  const sparkles = passionLine.locator('.sparkles-text__sparkle')
  await expect(passionText).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(passionText).toHaveCSS('opacity', '1')
  await expect(radiantText).toHaveText('PASSION')
  await expect(radiantText).not.toHaveClass(/radiant-text--active/)
  await expect(radiantText.locator('.radiant-text__shine')).toHaveCount(0)
  await expect(passionLine).not.toHaveClass(/no-cursor/)
  await expect(sparkles).toHaveCount(0)
  const layoutBeforeHover = await passionText.evaluate((element) => ({
    left: (element as HTMLElement).offsetLeft,
    width: (element as HTMLElement).offsetWidth,
  }))

  for (const horizontalPosition of [0.1, 0.5, 0.7, 0.9]) {
    await page.mouse.move(0, 0)
    await expect(radiantText).not.toHaveClass(/radiant-text--active/)
    const passionBounds = await passionText.boundingBox()
    expect(passionBounds).not.toBeNull()
    await page.mouse.move(
      passionBounds!.x + passionBounds!.width * horizontalPosition,
      passionBounds!.y + passionBounds!.height / 2
    )
    await expect(radiantText).toHaveClass(/radiant-text--active/)
  }

  await passionText.hover()
  await expect(passionLine.locator('..')).not.toHaveClass(/hide-cursor/)
  await expect(radiantText).toHaveClass(/radiant-text--active/)
  const radiantShine = radiantText.locator('.radiant-text__shine')
  await expect(radiantShine).toHaveCount(1)
  await expect(sparkles).toHaveCount(10)
  const layoutAfterHover = await passionText.evaluate((element) => ({
    left: (element as HTMLElement).offsetLeft,
    width: (element as HTMLElement).offsetWidth,
  }))
  expect(
    Math.abs(layoutAfterHover.left - layoutBeforeHover.left)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(layoutAfterHover.width - layoutBeforeHover.width)
  ).toBeLessThanOrEqual(1)

  const sparklePositions = await sparkles.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).position)
  )
  expect(new Set(sparklePositions)).toEqual(new Set(['absolute']))

  const sparkleOffsets = await sparkles.evaluateAll((elements) =>
    elements.map((element) => ({
      left: Number.parseFloat((element as SVGElement).style.left),
      top: Number.parseFloat((element as SVGElement).style.top),
    }))
  )
  expect(sparkleOffsets.some(({ left }) => left < 0)).toBe(true)
  expect(sparkleOffsets.every(({ left }) => left >= -8 && left <= 104)).toBe(
    true
  )
  expect(sparkleOffsets.every(({ top }) => top >= -8 && top <= 105)).toBe(true)

  const sparkleSizes = await sparkles.evaluateAll((elements) =>
    elements.map((element) => ({
      width: element.getAttribute('width'),
      height: element.getAttribute('height'),
    }))
  )
  expect(new Set(sparkleSizes.map(({ width }) => width))).toEqual(
    new Set(['42'])
  )
  expect(new Set(sparkleSizes.map(({ height }) => height))).toEqual(
    new Set(['42'])
  )

  const sparkleColors = await sparkles
    .locator('path')
    .evaluateAll((paths) => paths.map((path) => path.getAttribute('fill')))
  expect(new Set(sparkleColors)).toEqual(new Set(['#e2c28a']))

  await expect(radiantText.locator('.radiant-text__base')).toHaveCSS(
    'color',
    'rgb(226, 52, 86)'
  )
  const radiantLayerBounds = await radiantText.evaluate((element) => {
    const baseRect = element
      .querySelector('.radiant-text__base')
      ?.getBoundingClientRect()
    const shineRect = element
      .querySelector('.radiant-text__shine')
      ?.getBoundingClientRect()
    return {
      base: baseRect
        ? {
            top: baseRect.top,
            right: baseRect.right,
            bottom: baseRect.bottom,
            left: baseRect.left,
          }
        : null,
      shine: shineRect
        ? {
            top: shineRect.top,
            right: shineRect.right,
            bottom: shineRect.bottom,
            left: shineRect.left,
          }
        : null,
    }
  })
  expect(radiantLayerBounds.base).not.toBeNull()
  expect(radiantLayerBounds.shine).not.toBeNull()
  expect(
    radiantLayerBounds.base!.top - radiantLayerBounds.shine!.top
  ).toBeGreaterThan(1)
  expect(
    Math.abs(radiantLayerBounds.shine!.left - radiantLayerBounds.base!.left)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(radiantLayerBounds.shine!.right - radiantLayerBounds.base!.right)
  ).toBeLessThanOrEqual(1)
  expect(
    radiantLayerBounds.shine!.bottom - radiantLayerBounds.base!.bottom
  ).toBeGreaterThan(1)

  const radiantStyles = await radiantShine.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      animationDuration: style.animationDuration,
      animationName: style.animationName,
      backgroundImage: style.backgroundImage,
      mixBlendMode: style.mixBlendMode,
      textShadow: style.textShadow,
    }
  })
  expect(radiantStyles.animationDuration).toBe('5s')
  expect(radiantStyles.animationName).toMatch(/^radiant/)
  expect(radiantStyles.backgroundImage).toContain('linear-gradient')
  expect(radiantStyles.mixBlendMode).toBe('screen')
  expect(radiantStyles.textShadow).toBe('none')

  const sparkleKeyframes = await sparkles.first().evaluate((sparkle) => {
    const effect = sparkle.getAnimations()[0]?.effect as
      | KeyframeEffect
      | undefined
    return effect?.getKeyframes().map((keyframe) => keyframe.transform) || []
  })
  expect(
    sparkleKeyframes.every((transform) => !`${transform}`.includes('rotate'))
  ).toBe(true)

  await page.mouse.move(0, 0)
  await expect(sparkles).toHaveCount(0)
  await expect(radiantText).not.toHaveClass(/radiant-text--active/)
  await expect(radiantShine).toHaveCount(0)
})
