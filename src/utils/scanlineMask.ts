import { createSeededRandom, hashSeed } from './dailyRandom'

export interface ScanlineMaskOptions {
  gapOpacity?: number
  direction?: 'to bottom' | 'to right'
  /** 相同种子生成相同图案；给不同字符传入不同种子即可错开条纹。 */
  seed?: string | number
  /** 条纹数量，限制在 1–128。 */
  lines?: number
  /** 固定扫描线区域终点（0–1）；显式设置时覆盖 heightRange。 */
  solidFrom?: number
  /** 每个种子的扫描线覆盖高度范围；默认 42%–72%，底部始终留实心。 */
  heightRange?: readonly [number, number]
  /** 上、下端每条带中实心部分的占比（0.01–0.99）。 */
  topCoverage?: number
  bottomCoverage?: number
  /** 条带高度与条纹起点的不规则程度（0–0.95）。 */
  irregularity?: number
}

const bounded = (
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
) => Math.min(max, Math.max(min, Number.isFinite(value) ? value! : fallback))

const resolveScanlineHeight = (options: ScanlineMaskOptions) => {
  if (Number.isFinite(options.solidFrom))
    return bounded(options.solidFrom, 0.72, 0, 1)
  const first = bounded(options.heightRange?.[0], 0.42, 0.05, 0.95)
  const second = bounded(options.heightRange?.[1], 0.72, 0.05, 0.95)
  const lower = Math.min(first, second)
  const upper = Math.max(first, second)
  // 高度使用独立种子流：调整条纹数量／粗细不会改变字符的扫描线终点。
  const random = createSeededRandom(
    hashSeed('scanline-height', String(options.seed ?? 0))
  )
  return lower + (upper - lower) * random()
}

/**
 * 生成 CSS mask-image：上部条纹细密，下部逐渐变厚并连接实心区域。
 * 使用归一化坐标，不依赖字体、字号、Vue 或 DOM；文字、SVG、图片均可复用。
 */
export const createScanlineMask = (options: ScanlineMaskOptions = {}) => {
  const lines = Math.floor(bounded(options.lines, 16, 1, 128))
  const solidFrom = resolveScanlineHeight(options)
  const topCoverage = bounded(options.topCoverage, 0.3, 0.01, 0.99)
  const bottomCoverage = bounded(options.bottomCoverage, 0.94, 0.01, 0.99)
  const irregularity = bounded(options.irregularity, 0.3, 0, 0.95)
  const random = createSeededRandom(
    hashSeed('scanline', String(options.seed ?? 0))
  )
  const percent = (position: number) => `${(position * 100).toFixed(4)}%`

  // 将随机条带归一化，使不规则条纹始终终止于 solidFrom，不随种子越界。
  const weights = Array.from(
    { length: lines },
    () => 1 + (random() * 2 - 1) * irregularity
  )
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  const gapOpacity = bounded(options.gapOpacity, 0, 0, 1)
  const gapColor =
    gapOpacity === 0 ? 'transparent' : `rgb(0 0 0 / ${gapOpacity})`
  const stops = [`${gapColor} 0%`]
  let cursor = 0
  weights.forEach((weight, index) => {
    const height = (weight / total) * solidFrom
    const progress = lines === 1 ? 0 : index / (lines - 1)
    const coverage = topCoverage + (bottomCoverage - topCoverage) * progress
    const gap = height * (1 - coverage)
    const start = cursor + gap * (0.5 + (random() - 0.5) * irregularity)
    const end = start + height * coverage

    // 同一位置使用双重色标形成硬边，不产生模糊渐变；不同种子错开起点。
    stops.push(
      `${gapColor} ${percent(start)}`,
      `#000 ${percent(start)}`,
      `#000 ${percent(end)}`,
      `${gapColor} ${percent(end)}`
    )
    cursor += height
  })
  stops.push(
    `${gapColor} ${percent(solidFrom)}`,
    `#000 ${percent(solidFrom)}`,
    '#000 100%'
  )
  return `linear-gradient(${options.direction ?? 'to bottom'}, ${stops.join(
    ', '
  )})`
}

/** 按 Unicode 码点拆分文本；字符内容及位置共同参与种子，重复字符也有不同条纹。 */
export const createScanlineCharacters = (
  text: string,
  options: ScanlineMaskOptions = {}
) =>
  Array.from(text, (character, index) => {
    const characterOptions = {
      ...options,
      seed: `${options.seed ?? 0}:${index}:${character}`,
    }
    const scanHeight = resolveScanlineHeight(characterOptions)
    return {
      character,
      scanHeight,
      maskImage: createScanlineMask({
        ...characterOptions,
        solidFrom: scanHeight,
      }),
    }
  })
