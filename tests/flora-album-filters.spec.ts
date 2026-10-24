import { expect, test } from '@playwright/test'

import { floraAlbumTags, getFloraAlbumStage } from '../src/utils/floraAlbum'
import { getFloraAssetUrl } from '../src/utils/floratriumMedia'
import { handleFloraMedia } from '../worker/src/floratrium'

const keys = [
  '20250401_CLOSEUP.webp',
  '20250531_SLEEP.webp',
  '20250601_MEME.webp',
  '20260131_BALL.webp',
  '20260201_WITHMIMI.webp',
  '20260531_BATTLE.webp',
  '20260601_STERILIZATION.webp',
  '20261023_CLOSEUP_SLEEP.webp',
].map((name) => `Floratrium/flora/${name}`)
const items = keys.map((key) => ({
  key,
  url: getFloraAssetUrl(key),
  type: 'image' as const,
}))

test('complete flora collection includes matches beyond page one and keeps other albums paginated', async () => {
  const bucket = {
    list: async ({ prefix }: { prefix: string }) => ({
      objects: Array.from({ length: 60 }, (_, i) => ({
        key: `${prefix}20260601_${String(i).padStart(3, '0')}_SLEEP.webp`,
      })),
      truncated: false,
    }),
  }
  const env = { FLORATRIUM_BUCKET: bucket } as Parameters<
    typeof handleFloraMedia
  >[1]
  const complete = await handleFloraMedia(
    new URL('https://example.com/floratrium/media?pet=flora&collection=1'),
    env
  )
  const data = (await complete.json()) as {
    items: unknown[]
    totalPages: number
    nextCursor: string | null
  }
  expect(data.items).toHaveLength(60)
  expect(data.totalPages).toBe(1)
  expect(data.nextCursor).toBeNull()
  for (const pet of ['flora', 'hei']) {
    const response = await handleFloraMedia(
      new URL(
        `https://example.com/floratrium/media?pet=${pet}${
          pet === 'hei' ? '&collection=1' : ''
        }`
      ),
      env
    )
    expect(
      ((await response.json()) as { items: unknown[] }).items
    ).toHaveLength(28)
  }
  expect(items.map(getFloraAlbumStage)).toEqual([
    'before',
    'before',
    'arrival',
    'arrival',
    'mimi',
    'mimi',
    'big',
    'big',
  ])
})

test('flora tags filter complete filenames, all shows stages, and other albums stay unchanged', async ({
  page,
}, info) => {
  const mobile = info.project.name.includes('mobile')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const requests: string[] = []
  await page.route('**/__floratrium/media?**', (route) => {
    requests.push(route.request().url())
    return route.fulfill({
      json: {
        items: [...items].reverse(),
        nextCursor: null,
        totalPages: 1,
        totalItems: items.length,
      },
    })
  })
  await page.route('https://assets.anuluca.com/**', (route) => route.abort())
  await page.route('**/flora-filter-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;background:#161616;color:white}#fixture{margin:110px 12px 0;height:600px;max-width:1100px;--flora-theme-color:#b74d62;--flora-media-title-size:44px;--text-color:white;--border-color:#555}</style><div id="fixture"></div>',
    })
  )
  await page.goto('/flora-filter-fixture')
  await page.evaluate(async (mobile) => {
    const { createApp, h, ref } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { default: Gallery } = await import(
      '/src/views/Home/components/FloraAlbumGallery.vue'
    )
    const { default: i18n } = await import('/src/locales/index.ts')
    i18n.global.locale.value = 'zhCn'
    const petId = ref('huahua')
    createApp({
      render: () => h(Gallery, { petId: petId.value, title: '相册', mobile }),
    })
      .use(i18n)
      .mount('#fixture')
    ;(window as any).albumFixture = { i18n, petId }
  }, mobile)
  const gallery = page.locator('.flora-album-gallery')
  await gallery.getByRole('button', { name: 'EXPAND', exact: true }).click()
  const filters = gallery.locator('.flora-album-gallery__filters')
  await expect(filters).toBeVisible()
  const headings = gallery.locator('.flora-album-gallery__stage-group h3')
  await expect(headings).toHaveText([
    '【领养前（2025/04～2025/06）】',
    '【初来乍到（2025/06～2026/02）】',
    '【咪咪借宿（2026/02～2026/06）】',
    '【大肥猫（2026/06～NOW）】',
  ])
  await expect(filters.locator('.filter-rail__count')).toHaveText([
    '8',
    '2',
    '2',
    '1',
    '1',
    '1',
    '1',
    '1',
  ])
  expect(requests[0]).toContain('collection=1')
  await page.screenshot({
    path: `/tmp/anutrium-flora-all-${mobile ? 'mobile' : 'desktop'}.png`,
  })
  for (const tag of floraAlbumTags.slice(1)) {
    await filters
      .getByRole('button', { name: new RegExp(`^${tag.zhCn}\\s*\\d+$`) })
      .click()
    await expect(headings).toHaveCount(0)
    await expect(gallery.locator('.media-gallery__card')).toHaveCount(
      keys.filter((key) => key.includes(tag.id)).length
    )
    const displayedUrls = await gallery
      .locator('img[data-media-url]')
      .evaluateAll((images) =>
        images.map((image) => image.getAttribute('data-media-url'))
      )
    expect(displayedUrls).toEqual(
      items.filter((item) => item.key.includes(tag.id)).map((item) => item.url)
    )
    await expect(gallery).toHaveClass(/is-expanded/)
  }
  await page.evaluate(() => {
    ;(window as any).albumFixture.i18n.global.locale.value = 'en'
  })
  await expect(filters.locator('button strong')).toHaveText(
    floraAlbumTags.map((tag) => tag.en)
  )
  await filters.getByRole('button', { name: /^ALL\s*\d+$/ }).click()
  await expect(headings.first()).toHaveText(
    '【Before Adoption（2025/04～2025/06）】'
  )
  await expect(gallery.locator('.media-gallery__card')).toHaveCount(8)
  const overflow = await gallery
    .locator('.flora-album-gallery__viewport')
    .evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
  const titleOverlap = await headings.evaluateAll((elements) =>
    elements.some((el) => {
      const toolbar = el.closest('.media-gallery__toolbar')!
      const button = toolbar.querySelector('button')!
      return (
        el.getBoundingClientRect().right >
        button.getBoundingClientRect().left + 1
      )
    })
  )
  expect(titleOverlap).toBe(false)
  await gallery.getByRole('tab', { name: 'Flora’s Neighbors' }).click()
  await expect(filters).toHaveCount(0)
  await expect(
    gallery.locator('.flora-album-gallery__friend-group')
  ).toHaveCount(4)
  const extraItems = Array.from({ length: 60 }, (_, index) => {
    const key = `Floratrium/flora/20260601_${index}_SLEEP.webp`
    return { key, url: getFloraAssetUrl(key), type: 'image' }
  })
  await page.route('**/__floratrium/media?**', (route) => {
    if (!new URL(route.request().url()).searchParams.get('collection'))
      return route.fallback()
    requests.push(route.request().url())
    return route.fulfill({
      json: {
        items: [...items, ...extraItems],
        nextCursor: null,
        totalPages: 1,
        totalItems: 68,
      },
    })
  })
  await gallery.getByRole('tab', { name: '相册', exact: true }).click()
  const pagination = gallery.locator('.flora-album-gallery__pagination')
  await expect(pagination).toContainText('68 images (3 pages)')
  await expect(filters.locator('.filter-rail__count')).toHaveText([
    '68',
    '2',
    '62',
    '1',
    '1',
    '1',
    '1',
    '1',
  ])
  const cards = gallery.locator('.media-gallery__card')
  await expect(cards).toHaveCount(28)
  const scrollGeometry = await gallery.evaluate((element) => {
    const filters = element.querySelector('.flora-album-gallery__filters')!
    const viewport = element.querySelector('.flora-album-gallery__viewport')!
    const card = viewport.querySelector('.media-gallery__card')!
    const filterTop = filters.getBoundingClientRect().top
    const cardTop = card.getBoundingClientRect().top
    viewport.scrollTop = 120
    return {
      nested: viewport.contains(filters),
      scrollTop: viewport.scrollTop,
      filterShift: filters.getBoundingClientRect().top - filterTop,
      cardShift: card.getBoundingClientRect().top - cardTop,
    }
  })
  expect(scrollGeometry.nested).toBe(false)
  expect(scrollGeometry.scrollTop).toBeGreaterThan(0)
  expect(Math.abs(scrollGeometry.filterShift)).toBeLessThanOrEqual(1)
  expect(scrollGeometry.cardShift).toBeCloseTo(-scrollGeometry.scrollTop, 0)
  await pagination.getByRole('button', { name: 'Page 3', exact: true }).click()
  await expect(cards).toHaveCount(12)
  await expect(
    pagination.getByRole('button', { name: 'Page 3', exact: true })
  ).toHaveAttribute('aria-current', 'page')
  await expect(headings).toHaveText(['【Big Fat Cat（2026/06～NOW）】'])
  await filters.getByRole('button', { name: /^SLEEP\s*\d+$/ }).click()
  await expect(pagination).toContainText('62 images (3 pages)')
  await expect(
    pagination.getByRole('button', { name: 'Page 1', exact: true })
  ).toHaveAttribute('aria-current', 'page')
  await expect(cards).toHaveCount(28)
  await expect(headings).toHaveCount(0)
  await pagination.getByRole('button', { name: 'Page 3', exact: true }).click()
  await expect(cards).toHaveCount(6)
  await expect(filters.locator('.filter-rail__count')).toHaveText([
    '68',
    '2',
    '62',
    '1',
    '1',
    '1',
    '1',
    '1',
  ])
  await expect(
    pagination.getByRole('button', { name: 'Next', exact: true })
  ).toBeDisabled()
  await filters.getByRole('button', { name: /^MEME\s*\d+$/ }).click()
  await expect(cards).toHaveCount(1)
  await expect(pagination).toContainText('1 images (1 pages)')
  await filters.getByRole('button', { name: /^ALL\s*\d+$/ }).click()
  await expect(cards).toHaveCount(28)
  await expect(headings.first()).toHaveText(
    '【Before Adoption（2025/04～2025/06）】'
  )
  await page.evaluate(() => {
    ;(window as any).albumFixture.petId.value = 'xiaohei'
  })
  await gallery.getByRole('button', { name: 'EXPAND', exact: true }).click()
  await expect(gallery.locator('.filter-rail')).toHaveCount(0)
  await expect(headings).toHaveCount(0)
  await expect(
    gallery.locator('.flora-album-gallery__pagination')
  ).toBeVisible()
  expect(requests[requests.length - 1]).not.toContain('collection=1')
})
