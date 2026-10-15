import { readdir } from 'node:fs/promises'
import path from 'node:path'

export const FLORA_LOCAL_ROOT = '/Users/anuluca/Work/Space_Coding/R2'
const mediaType = (file) =>
  /\.(?:jpe?g|png|webp|avif|gif)$/i.test(file)
    ? 'image'
    : /\.(?:mp4|mov|webm|m4v|ogv)$/i.test(file)
    ? 'video'
    : null
const readMedia = async (directory, prefix = '') => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (
      entry.name.startsWith('.') ||
      /_(?:originals|transform|failed|原文件)$/i.test(entry.name) ||
      entry.isSymbolicLink()
    )
      continue
    const name = `${prefix}${entry.name}`
    if (entry.isDirectory())
      files.push(
        ...(await readMedia(path.join(directory, entry.name), `${name}/`))
      )
    else if (entry.isFile() && mediaType(entry.name)) files.push(name)
  }
  return files.sort()
}
export const floratriumDevPlugin = () => ({
  name: 'floratrium-local-media',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__floratrium/media', async (request, response) => {
      const url = new URL(request.url || '/', 'http://localhost')
      const pet = url.searchParams.get('pet')
      const cursor = url.searchParams.get('cursor') || '0'
      if (
        !['flora', 'hei'].includes(pet) ||
        !/^\d+$/.test(cursor) ||
        request.method !== 'GET'
      ) {
        response.statusCode = 400
        response.end('Invalid album request')
        return
      }
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.setHeader('Cache-Control', 'no-store')
      try {
        // 本地只用于枚举资源，浏览器始终通过线上 R2 加载图片和视频。
        const files = await readMedia(
          path.join(FLORA_LOCAL_ROOT, 'Floratrium', pet)
        )
        files.sort().reverse()
        const offset = Number(cursor)
        const items = files.slice(offset, offset + 28).map((file) => ({
          key: `Floratrium/${pet}/${file}`,
          url: `https://assets.anuluca.com/Floratrium/${pet}/${file
            .split('/')
            .map(encodeURIComponent)
            .join('/')}`,
          type: mediaType(file),
        }))
        response.end(
          JSON.stringify({
            items,
            totalPages: Math.max(1, Math.ceil(files.length / 28)),
            nextCursor: offset + 28 < files.length ? String(offset + 28) : null,
          })
        )
      } catch {
        response.statusCode = 503
        response.end(JSON.stringify({ error: 'Local album unavailable' }))
      }
    })
  },
})
