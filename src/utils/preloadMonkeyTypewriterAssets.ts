export const monkeyTypewriterImages = {
  typewriter:
    'https://assets.anuluca.com/Island/laboratory/monkey-typewriter/20261109_140508_typewriter.webp',
  library:
    'https://assets.anuluca.com/Island/laboratory/monkey-typewriter/20261109_171447_babel-library.webp',
} as const

const images = new Map<string, Promise<HTMLImageElement>>()

function loadImage(src: string) {
  const cached = images.get(src)
  if (cached) return cached
  const image = new Image()
  const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error(`Image loading timed out: ${src}`))
    }, 20000)
    image.decoding = 'async'
    image.src = src
    image.decode().then(
      () => {
        window.clearTimeout(timeout)
        resolve(image)
      },
      (error) => {
        window.clearTimeout(timeout)
        reject(error)
      }
    )
  }).catch((error) => {
    images.delete(src)
    throw error
  })
  images.set(src, loaded)
  return loaded
}

export async function preloadMonkeyTypewriterAssets() {
  if (typeof window === 'undefined') return
  await Promise.all(Object.values(monkeyTypewriterImages).map(loadImage))
}
