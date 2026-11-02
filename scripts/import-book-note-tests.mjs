import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const directory = path.join(root, 'tests/fixtures/notes/book-reference')
const revision = '6bffcf4e80bdfe6d94fbcc7a9d155603c2c6c275'
const titles = {
  'test/hexo-unit-test/categories': '分类测试',
  'test/hexo-unit-test/elements': '网页元素测试',
  'test/hexo-unit-test/excerpts': '摘要测试',
  'test/hexo-unit-test/hello-world': '你好，世界',
  'test/hexo-unit-test/images': '图片测试',
  'test/hexo-unit-test/link-post-without-title': '无标题链接文章测试',
  'test/hexo-unit-test/long-title':
    '这是一条用于测试长标题换行与显示效果的笔记标题，包含足够多的中文字符，用于验证列表卡片和笔记详情在不同屏幕尺寸下的布局是否正常',
  'test/hexo-unit-test/no-title': '无标题文章测试',
  'test/hexo-unit-test/tag-plugins': '标签插件测试',
  'test/hexo-unit-test/videos': '视频测试',
  'demo/render/footnotes-demo': '脚注渲染演示',
  'demo/render/katex-demo': '数学公式排版演示',
  'demo/render/markdown-it-demo': '基础语法与扩展渲染演示',
  'demo/render/md-container': '提示容器渲染演示',
  'demo/lorem-ipsum/en-demo': 'The Gift of the Magi',
  'demo/lorem-ipsum/jp-demo': '日本語長文テスト',
  'demo/lorem-ipsum/sc-demo': '简体中文长文测试',
  'demo/lorem-ipsum/tc-demo': '繁体中文长文测试',
}
const assetBase = 'https://assets.anuluca.com/Island/notes/'
const assets = {
  'https://octodex.github.com/images/minion.png': 'markdown-it-demo/minion.png',
  'https://octodex.github.com/images/stormtroopocat.jpg':
    'markdown-it-demo/stormtroopocat.jpg',
  'https://octodex.github.com/images/dojocat.jpg':
    'markdown-it-demo/dojocat.jpg',
  'https://placehold.it/350x150.jpg': 'images/placeholder-350x150.svg',
  'wallpaper-2572384.jpg': 'images/wallpaper-2572384.jpg',
  'wallpaper-2311325.jpg': 'images/wallpaper-2311325.jpg',
  'wallpaper-878514.jpg': 'images/wallpaper-878514.jpg',
}
// 保留后台为图片测试添加的封面，与正文共用同一个素材路径。
const covers = {
  'test/hexo-unit-test/images': assets['wallpaper-2572384.jpg'],
}
const sha256 = (source) => createHash('sha256').update(source).digest('hex')
const previous = JSON.parse(
  await readFile(path.join(directory, 'manifest.json'), 'utf8')
)
const manifest = []
await mkdir(path.join(directory, 'published'), { recursive: true })
for (const [sourcePath, title] of Object.entries(titles)) {
  const original = await readFile(
    path.join(directory, 'original', `${sourcePath}.md`),
    'utf8'
  )
  let body = original
  // Hexo 允许省略开头的 ---；仅移除实际元信息，保留语法演示开头的水平分割线。
  if (/^(?:title:|date:)/.test(body))
    body = body.slice(body.indexOf('\n---') + 4)
  else if (body.startsWith('---\ncomments:'))
    body = body.replace(/^---\n[\s\S]*?\n---/, '')
  const originalBody = body.trim()
  const file = `${sourcePath.replaceAll('/', '__')}.md`
  // 人工翻译作为明确的发布源保留，重新生成时不会恢复成上游英文正文。
  try {
    body = await readFile(path.join(directory, 'adapted', file), 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  for (const [source, target] of Object.entries(assets))
    body = source.startsWith('https://')
      ? body.replaceAll(source, assetBase + target)
      : body.replaceAll(`(${source}`, `(${assetBase + target}`)
  const source = `---\ntitle: ${JSON.stringify(
    title
  )}\ndate: "2026-11-01"\ncategory: test\n${
    covers[sourcePath]
      ? `cover: ${JSON.stringify(assetBase + covers[sourcePath])}\n`
      : ''
  }---\n\n${body.trim()}\n`
  // 内容路径决定固定 UUID v4 外形，使重复运行可幂等重试；已发布文件从不无条件覆盖。
  const hash = sha256(`book-demo/${revision}/${sourcePath}`)
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(
    13,
    16
  )}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
  const old = previous.notes.find((note) => note.id === id)
  await writeFile(path.join(directory, 'published', file), source)
  manifest.push({
    id,
    title,
    file,
    sourcePath: `source/_posts/${sourcePath}.md`,
    sourceUrl: `https://github.com/kaiiiz/hexo-theme-book-demo/blob/${revision}/source/_posts/${sourcePath}.md`,
    originalBodySha256: sha256(originalBody),
    sha256: sha256(source),
    ...(old && { previousSha256: old.previousSha256 || old.sha256 }),
  })
}
const removedNotes = [
  ...(previous.removedNotes || []),
  ...previous.notes.filter(
    (old) => !manifest.some((note) => note.id === old.id)
  ),
]
for (const note of removedNotes) {
  await unlink(path.join(directory, 'published', note.file)).catch((error) => {
    if (error.code !== 'ENOENT') throw error
  })
}
await writeFile(
  path.join(directory, 'manifest.json'),
  JSON.stringify({ revision, assets, notes: manifest, removedNotes }, null, 2) +
    '\n'
)
console.log(`已准备 ${manifest.length} 篇 Markdown 测试笔记。`)

if (process.argv.includes('--publish')) {
  // 密钥仅从现有后台服务的私有环境文件读取，不输出、不写入仓库。
  process.loadEnvFile(path.resolve(root, '../AnuConsole/.env.local'))
  const token = process.env.HOME_FEATURES_TOKEN
  assert(token?.length >= 32, '缺少管理员鉴权配置')
  const base = new URL(
    process.env.HOME_FEATURES_URL || 'https://steam-api.anuluca.com'
  )
  assert.equal(base.origin, 'https://steam-api.anuluca.com')
  const request = (route, options = {}) =>
    fetch(new URL(route, base), {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...options.headers },
      signal: AbortSignal.timeout(30000),
      redirect: 'error',
    })
  // 先回读、核对已知版本并备份全部变更，再执行条件更新；并发修改时停止。
  const backup = path.join(
    root,
    '.tmp',
    `book-notes-${new Date().toISOString().replace(/[:.]/g, '-')}`
  )
  await mkdir(backup, { recursive: true, mode: 0o700 })
  const changes = []
  const updatedNotes = manifest.filter(
    (note) => note.sha256 !== note.previousSha256
  )
  for (const note of [...updatedNotes, ...removedNotes]) {
    const removing = removedNotes.some((removed) => removed.id === note.id)
    const current = await request(`/admin/notes/${note.id}`)
    if (current.status === 404) {
      // 已删除的文章不恢复；新增仍通过 PUT 的幂等创建路径。
      if (removing) continue
      assert(
        !previous.notes.some((old) => old.id === note.id),
        `${note.title} 已在线删除，停止，避免恢复已删除文章`
      )
      changes.push({ note, method: 'PUT' })
      continue
    }
    assert(current.ok, `${note.title} 读取失败：${current.status}`)
    const before = await current.text()
    const currentHash = sha256(before)
    if (!removing && currentHash === note.sha256) continue
    assert.equal(
      currentHash,
      removing ? note.sha256 : note.previousSha256,
      `${note.title} 线上正文已变化，停止，避免覆盖其他编辑`
    )
    const version =
      current.headers.get('X-Note-Version') || current.headers.get('ETag')
    assert.match(version || '', /^"[^"\r\n]{1,128}"$/)
    await writeFile(path.join(backup, `${note.id}.before.md`), before, {
      mode: 0o600,
    })
    changes.push({ note, method: removing ? 'DELETE' : 'PATCH', version })
  }
  await writeFile(
    path.join(backup, 'plan.json'),
    JSON.stringify(changes, null, 2) + '\n',
    { mode: 0o600 }
  )
  const results = []
  // 先更新，再删除用户指定的韩语测试；每次操作后校验公开接口。
  for (const change of changes.sort(
    (a, b) => Number(a.method === 'DELETE') - Number(b.method === 'DELETE')
  )) {
    const { note, method, version } = change
    const source =
      method === 'DELETE'
        ? undefined
        : await readFile(path.join(directory, 'published', note.file), 'utf8')
    if (source) assert.equal(sha256(source), note.sha256)
    const result = await request(`/admin/notes/${note.id}`, {
      method,
      headers: {
        ...(source && { 'Content-Type': 'text/markdown' }),
        ...(version && { 'If-Match': version }),
      },
      body: source,
    })
    assert(result.ok, `${note.title} 操作失败：${result.status}，停止同步`)
    const readback = await request(`/notes/${note.id}`)
    if (method === 'DELETE') assert.equal(readback.status, 404)
    else {
      assert(readback.ok, `${note.title} 回读失败`)
      assert.equal(
        sha256(await readback.text()),
        note.sha256,
        `${note.title} 回读校验失败`
      )
    }
    results.push({ id: note.id, method, verified: true })
    await writeFile(
      path.join(backup, 'results.json'),
      JSON.stringify(results, null, 2) + '\n',
      { mode: 0o600 }
    )
    console.log(
      `已${method === 'DELETE' ? '删除' : '更新'}并校验：${note.title}`
    )
  }
  const listing = await request('/notes').then((response) => response.json())
  assert(
    updatedNotes.every((note) =>
      listing.notes.some(
        (published) =>
          published.id === note.id && published.title === note.title
      )
    )
  )
  assert(
    removedNotes.every(
      (note) => !listing.notes.some((published) => published.id === note.id)
    )
  )
  // 全部回读通过后才推进基线，使后续翻译修订仍能按上次发布版本安全更新。
  for (const note of updatedNotes) note.previousSha256 = note.sha256
  await writeFile(
    path.join(directory, 'manifest.json'),
    JSON.stringify(
      { revision, assets, notes: manifest, removedNotes },
      null,
      2
    ) + '\n'
  )
  console.log(
    JSON.stringify({
      updated: results.length,
      total: listing.notes.length,
      backup,
    })
  )
}
