import { readdir } from 'node:fs/promises'
import path from 'node:path'
import type { Plugin } from 'vite'

import {
  createFloraMediaPage,
  FLORA_MEDIA_INDEX_TTL_MS,
  type FloraAlbumId,
  isAlbumMediaKey,
  isMediaAlbumId,
  mediaAlbums,
} from '../../src/utils/floratriumMedia'

const FLORA_LOCAL_ROOT = '/Users/anuluca/Work/Space_Coding/R2'
const readMedia = async (
  directory: string,
  prefix: string,
  albumId: FloraAlbumId
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
    if (entry.isDirectory()) {
      if (mediaAlbums[albumId].recursive)
        files.push(
          ...(await readMedia(
            path.join(directory, entry.name),
            `${name}/`,
            albumId
          ))
        )
    } else if (entry.isFile() && isAlbumMediaKey(name, albumId))
      files.push(name)
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
        !isMediaAlbumId(pet) ||
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
            path.join(FLORA_LOCAL_ROOT, mediaAlbums[pet].prefix),
            mediaAlbums[pet].prefix,
            pet
          )
          keys.sort().reverse()
          index = {
            keys,
            expiresAt: Date.now() + FLORA_MEDIA_INDEX_TTL_MS,
          }
          indexes.set(pet, index)
        }
        response.end(
          JSON.stringify(
            createFloraMediaPage(
              index.keys,
              pet === 'flora' && url.searchParams.get('collection') === '1'
                ? 0
                : offset,
              pet === 'flora' && url.searchParams.get('collection') === '1'
                ? Math.max(1, index.keys.length)
                : mediaAlbums[pet].pageSize
            )
          )
        )
      } catch {
        response.statusCode = 503
        response.end(JSON.stringify({ error: 'Local album unavailable' }))
      }
    })
  },
})
