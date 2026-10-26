import {
  zodiacGlyphPaths,
  zodiacGlyphViewBoxes,
} from '@/components/BackStars/zodiacGlyphs'
import { templeLabelLayout as layout } from '@/config/templeLabelLayout'
import type { ZodiacSignId } from '@/config/zodiacThemes'

interface LabelCanvas {
  canvas: HTMLCanvasElement
  subscribe: (listener: () => void) => () => void
}

const labels = new Map<string, LabelCanvas>()
const zodiacMasks = new Map<ZodiacSignId, { data: Uint8Array; size: number }>()

function paintZodiac(
  context: CanvasRenderingContext2D,
  sign: ZodiacSignId,
  x: number,
  y: number
) {
  const [viewX, viewY] = zodiacGlyphViewBoxes[sign].split(' ').map(Number)
  context.save()
  context.translate(x, y)
  context.scale(layout.iconSize / 100, layout.iconSize / 100)
  context.translate(-viewX, -viewY)
  context.fillStyle = layout.iconColor
  for (const path of zodiacGlyphPaths[sign])
    context.fill(new Path2D(path), 'evenodd')
  context.restore()
}

/** 九点模糊只在首次使用某星宿时执行，射线步进中只需一次纹理采样。 */
export function getTempleZodiacMask(sign: ZodiacSignId) {
  const cached = zodiacMasks.get(sign)
  if (cached) return cached
  const size = layout.iconSize
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d')!
  paintZodiac(context, sign, 0, 0)
  const pixels = context.getImageData(0, 0, size, size).data
  const data = new Uint8Array(size * size)
  const alpha = (x: number, y: number) =>
    x < 0 || y < 0 || x >= size || y >= size
      ? 0
      : pixels[(y * size + x) * 4 + 3]
  const sample = (x: number, y: number) => {
    const left = Math.floor(x)
    const top = Math.floor(y)
    const dx = x - left
    const dy = y - top
    return (
      alpha(left, top) * (1 - dx) * (1 - dy) +
      alpha(left + 1, top) * dx * (1 - dy) +
      alpha(left, top + 1) * (1 - dx) * dy +
      alpha(left + 1, top + 1) * dx * dy
    )
  }
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      let value = 0
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          value +=
            sample(
              x + dx * layout.projectionBlurRadius,
              y + dy * layout.projectionBlurRadius
            ) *
            (dx === 0 ? 0.5 : 0.25) *
            (dy === 0 ? 0.5 : 0.25)
      data[y * size + x] = Math.round(value)
    }
  const mask = { data, size }
  zodiacMasks.set(sign, mask)
  return mask
}

// CPU 绘字结果跨场景复用；CanvasTexture 仍由各场景独立创建和释放。
export function getTempleLabelCanvas(
  title: string,
  zodiacSign: ZodiacSignId
): LabelCanvas {
  const key = `${title}:${zodiacSign}`
  const cached = labels.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = layout.width
  canvas.height = layout.height
  const context = canvas.getContext('2d')!
  const listeners = new Set<() => void>()
  const titleFont = '800 100px "UnboundedSans"'
  const fontReady = () =>
    !document.fonts || document.fonts.check(titleFont, title)
  const paint = () => {
    context.clearRect(0, 0, canvas.width, canvas.height)
    paintZodiac(
      context,
      zodiacSign,
      layout.iconCenterX - layout.iconSize / 2,
      layout.iconCenterY - layout.iconSize / 2
    )
    context.save()
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.scale(0.5, 0.5)
    context.translate(128, 850)
    context.scale(1, 1.45)
    context.rotate(Math.PI / 2)
    context.fillStyle = '#fff3f5'
    context.font = `${titleFont}, sans-serif`
    const letters = Array.from(title)
    const widths = letters.map((letter) => context.measureText(letter).width)
    const spacing = 6
    let x =
      -(
        widths.reduce((sum, width) => sum + width, 0) +
        spacing * (letters.length - 1)
      ) / 2
    context.textAlign = 'left'
    letters.forEach((letter, index) => {
      context.fillText(letter, x, 0)
      x += widths[index] + spacing
    })
    context.restore()
  }
  const entry: LabelCanvas = {
    canvas,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  labels.set(key, entry)
  paint()
  if (!fontReady()) {
    // 只等待碑文实际用到的字体，不因其他页面的中文字体就绪重复重绘。
    void document.fonts
      .load(titleFont, title)
      .then(() => {
        if (!fontReady()) {
          labels.delete(key)
          return
        }
        paint()
        listeners.forEach((listener) => listener())
      })
      .catch(() => labels.delete(key))
  }
  return entry
}
