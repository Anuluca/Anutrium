import { expect, test } from '@playwright/test'

import {
  createScanlineCharacters,
  createScanlineMask,
} from '../src/utils/scanlineMask'

test('scanline patterns are stable, vary by seed, and can disable irregularity', () => {
  expect(createScanlineMask({ seed: 'a' })).toBe(
    createScanlineMask({ seed: 'a' })
  )
  expect(createScanlineMask({ seed: 'a' })).not.toBe(
    createScanlineMask({ seed: 'b' })
  )
  expect(
    createScanlineMask({ seed: 'a', irregularity: 0, solidFrom: 0.6 })
  ).toBe(createScanlineMask({ seed: 'b', irregularity: 0, solidFrom: 0.6 }))
})

test('scanline text preserves Unicode and spaces while repeated characters have independent patterns', () => {
  const characters = createScanlineCharacters('№ 001😀', { seed: 'number' })
  expect(characters.map((item) => item.character).join('')).toBe('№ 001😀')
  expect(characters).toHaveLength(6)
  expect(characters[2].maskImage).not.toBe(characters[3].maskImage)
  expect(new Set(characters.map((item) => item.scanHeight)).size).toBe(
    characters.length
  )
  for (const item of characters) {
    expect(item.scanHeight).toBeGreaterThanOrEqual(0.42)
    expect(item.scanHeight).toBeLessThanOrEqual(0.72)
  }
})

test('scanline height ranges are normalized and fixed heights take priority', () => {
  const variants = createScanlineCharacters('0000', { heightRange: [0.8, 0.3] })
  for (const item of variants) {
    expect(item.scanHeight).toBeGreaterThanOrEqual(0.3)
    expect(item.scanHeight).toBeLessThanOrEqual(0.8)
  }
  expect(
    createScanlineCharacters('0000', { solidFrom: 0.55 }).every(
      (item) => item.scanHeight === 0.55
    )
  ).toBe(true)
  for (const item of createScanlineCharacters('0000', { heightRange: [1, 9] }))
    expect(item.scanHeight).toBeLessThan(1)
})

test('scanline masks remain ordered and valid CSS at option boundaries', async ({
  page,
}) => {
  for (const options of [
    {},
    { lines: 1, solidFrom: 0 },
    { lines: 128, solidFrom: 1, irregularity: 0.95 },
    { lines: Infinity, solidFrom: NaN, topCoverage: -4, bottomCoverage: 7 },
  ]) {
    const mask = createScanlineMask(options)
    const positions = Array.from(mask.matchAll(/([\d.]+)%/g), (match) =>
      Number(match[1])
    )
    expect(positions[0]).toBe(0)
    expect(positions[positions.length - 1]).toBe(100)
    for (let index = 1; index < positions.length; index++)
      expect(positions[index]).toBeGreaterThanOrEqual(positions[index - 1])
    expect(
      await page.evaluate((value) => CSS.supports('mask-image', value), mask)
    ).toBe(true)
  }
})
