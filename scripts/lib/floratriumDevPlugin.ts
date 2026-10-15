import { readdir } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

import {
  createFloraMediaPage,
  FLORA_MEDIA_INDEX_TTL_MS,
  type FloraAlbumId,
  getFloraMediaType,
} from '../../src/utils/floratriumMedia'

const FLORA_LOCAL_ROOT = '/Users/anuluca/Work/Space_Coding/R2'
const readMedia = async (
  directory: string,
  prefix: string
): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []
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
    else if (entry.isFile() && getFloraMediaType(name)) files.push(name)
  }
  return files
}
export const floratriumDevPlugin = (): Plugin => ({
  name: 'floratrium-local-media',
  apply: 'serve',
  configureServer(server) {
    const indexes = new Map<
      FloraAlbumId,
      { keys: string[]; expiresAt: number }
    >()
    server.middlewares.use('/__floratrium/media', async (request, response) => {
      const url = new URL(request.url || '/', 'http://localhost')
      const pet = url.searchParams.get('pet')
      const cursor = url.searchParams.get('cursor') || '0'
      const offset = Number(cursor)
      if (
        (pet !== 'flora' && pet !== 'hei') ||
        !/^\d+$/.test(cursor) ||
        !Number.isSafeInteger(offset) ||
        request.method !== 'GET'
      ) {
        response.statusCode = 400
        response.end('Invalid album request')
        return
      }
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.setHeader('Cache-Control', 'no-store')
      try {
        let index = indexes.get(pet)
        if (!index || index.expiresAt <= Date.now()) {
          // 本地只枚举键名，图片和视频仍直接请求线上 R2。
          const keys = await readMedia(
            path.join(FLORA_LOCAL_ROOT, 'Floratrium', pet),
            `Floratrium/${pet}/`
          )
          keys.sort().reverse()
          index = { keys, expiresAt: Date.now() + FLORA_MEDIA_INDEX_TTL_MS }
          indexes.set(pet, index)
        }
        response.end(JSON.stringify(createFloraMediaPage(index.keys, offset)))
      } catch {
        response.statusCode = 503
        response.end(JSON.stringify({ error: 'Local album unavailable' }))
      }
    })
  },
})
