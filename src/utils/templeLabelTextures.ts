interface LabelCanvas {
  canvas: HTMLCanvasElement
  subscribe: (listener: () => void) => () => void
}

const labels = new Map<string, LabelCanvas>()

// CPU 绘字结果跨场景复用；CanvasTexture 仍由各场景独立创建和释放。
export function getTempleLabelCanvas(
  roman: string,
  title: string
): LabelCanvas {
  const key = `${roman}:${title}`
  const cached = labels.get(key)
  if (cached) return cached

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 768
  const context = canvas.getContext('2d')!
  const listeners = new Set<() => void>()
  const romanFont = '700 72px "UnboundedSans"'
  const titleFont = '800 100px "UnboundedSans"'
  const fontReady = () =>
    !document.fonts ||
    (document.fonts.check(romanFont, roman) &&
      document.fonts.check(titleFont, title))
  const paint = () => {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.save()
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.scale(0.5, 0.5)
    context.fillStyle = '#f52e5b'
    context.font = `${romanFont}, sans-serif`
    context.fillText(roman, 128, 130)
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
    void Promise.all([
      document.fonts.load(romanFont, roman),
      document.fonts.load(titleFont, title),
    ])
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

// 发作文字随每次场景创建生成，避免把不断增长的次数永久缓存到 labels。
export function createHeadacheLabelCanvas(text: string): LabelCanvas {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 160
  const context = canvas.getContext('2d')!
  const listeners = new Set<() => void>()
  const font = '800 96px "UnboundedSans"'
  const paint = () => {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.font = `${font}, sans-serif`
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = '#fff3f5'
    context.fillText(
      text,
      canvas.width / 2,
      canvas.height / 2,
      canvas.width - 64
    )
  }
  paint()
  if (document.fonts && !document.fonts.check(font, text))
    void document.fonts
      .load(font, text)
      .then(() => {
        paint()
        listeners.forEach((listener) => listener())
      })
      .catch(() => {})
  return {
    canvas,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
