import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const directory = path.join(root, 'tests/fixtures/notes/book-reference')
const revision = '6bffcf4e80bdfe6d94fbcc7a9d155603c2c6c275'
const titles = {
  'test/hexo-unit-test/categories': '分类测试',
  'test/hexo-unit-test/elements': '网页元素测试',
  'test/hexo-unit-test/excerpts': '摘要测试',
  'test/hexo-unit-test/gallery-post': '相册文章测试',
  'test/hexo-unit-test/hello-world': '你好，世界',
  'test/hexo-unit-test/images': '图片测试',
  'test/hexo-unit-test/link-post-without-title': '无标题链接文章测试',
  'test/hexo-unit-test/link-post': '链接文章测试',
  'test/hexo-unit-test/long-title':
    '这是一条用于测试长标题换行与显示效果的笔记标题，包含足够多的中文字符，用于验证列表卡片和笔记详情在不同屏幕尺寸下的布局是否正常',
  'test/hexo-unit-test/no-title': '无标题文章测试',
  'test/hexo-unit-test/tag-plugins': '标签插件测试',
  'test/hexo-unit-test/tags': '标签测试',
  'test/hexo-unit-test/videos': '视频测试',
  'test/hexo-unit-test/中文測試': '中文测试',
  'test/hexo-unit-test/日本語テスト': '日语测试',
  'demo/render/footnotes-demo': '脚注渲染演示',
  'demo/render/katex-demo': '数学公式排版演示',
  'demo/render/markdown-it-demo': '基础语法与扩展渲染演示',
  'demo/render/md-container': '提示容器渲染演示',
  'demo/lorem-ipsum/en-demo': '英语长文测试',
  'demo/lorem-ipsum/jp-demo': '日语长文测试',
  'demo/lorem-ipsum/kr-demo': '韩语长文测试',
  'demo/lorem-ipsum/sc-demo': '简体中文长文测试',
  'demo/lorem-ipsum/tc-demo': '繁体中文长文测试',
}
const assetBase = 'https://assets.anuluca.com/note-assets/book-demo/'
const assets = {
  'https://octodex.github.com/images/minion.png': 'minion.png',
  'https://octodex.github.com/images/stormtroopocat.jpg': 'stormtroopocat.jpg',
  'https://octodex.github.com/images/dojocat.jpg': 'dojocat.jpg',
  'https://placehold.it/350x150.jpg': 'placeholder-350x150.svg',
  'wallpaper-2572384.jpg': 'wallpaper-2572384.jpg',
  'wallpaper-2311325.jpg': 'wallpaper-2311325.jpg',
  'wallpaper-878514.jpg': 'wallpaper-878514.jpg',
}
const sha256 = (source) => createHash('sha256').update(source).digest('hex')
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
  for (const [source, target] of Object.entries(assets))
    body = body.replaceAll(source, assetBase + target)
  const source = `---\ntitle: ${JSON.stringify(
    title
  )}\ndate: "2026-11-01"\ncategory: test\n---\n\n${body.trim()}\n`
  // 内容路径决定固定 UUID v4 外形，使重复运行可幂等重试；已发布文件从不无条件覆盖。
  const hash = sha256(`book-demo/${revision}/${sourcePath}`)
  const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(
    13,
    16
  )}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
  const file = `${sourcePath.replaceAll('/', '__')}.md`
  await writeFile(path.join(directory, 'published', file), source)
  manifest.push({
    id,
    title,
    file,
    sourcePath: `source/_posts/${sourcePath}.md`,
    sourceUrl: `https://github.com/kaiiiz/hexo-theme-book-demo/blob/${revision}/source/_posts/${sourcePath}.md`,
    originalBodySha256: sha256(originalBody),
    sha256: sha256(source),
  })
}
await writeFile(
  path.join(directory, 'manifest.json'),
  JSON.stringify({ revision, assets, notes: manifest }, null, 2) + '\n'
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
  const oldId = '46625c0b-2bd5-491e-aef9-da54e9ac3700'
  const old = await request(`/admin/notes/${oldId}`)
  let oldVersion
  if (old.ok) {
    oldVersion = old.headers.get('X-Note-Version') || old.headers.get('ETag')
    assert.match(oldVersion || '', /^"[^"\r\n]+"$/)
    await writeFile(path.join(directory, 'replaced-demo.md'), await old.text())
  } else assert.equal(old.status, 404)
  for (const note of manifest) {
    const source = await readFile(
      path.join(directory, 'published', note.file),
      'utf8'
    )
    const result = await request(`/admin/notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'text/markdown' },
      body: source,
    })
    assert(
      result.ok,
      `${note.title} 发布失败：${result.status} ${await result.text()}`
    )
    const readback = await request(`/notes/${note.id}`)
    assert(readback.ok, `${note.title} 回读失败`)
    assert.equal(
      sha256(await readback.text()),
      note.sha256,
      `${note.title} 回读校验失败`
    )
    console.log(`已发布并校验：${note.title}`)
  }
  // 全部新文档成功回读后才删除旧演示，If-Match 使用首次读取的原始版本。
  if (oldVersion) {
    const removed = await request(`/admin/notes/${oldId}`, {
      method: 'DELETE',
      headers: { 'If-Match': oldVersion },
    })
    assert(removed.ok, `旧演示删除失败：${removed.status}`)
    assert.equal((await request(`/notes/${oldId}`)).status, 404)
    console.log('已按版本校验删除旧演示笔记，并保留本地备份。')
  }
  const listing = await request('/notes').then((response) => response.json())
  assert(
    manifest.every((note) =>
      listing.notes.some(
        (published) =>
          published.id === note.id && published.title === note.title
      )
    )
  )
  assert(!listing.notes.some((note) => note.id === oldId))
  console.log(`线上列表验证成功：${listing.notes.length} 篇。`)
}
