import { expect, test } from '@playwright/test'

import {
  floraFriendAlbums,
  floraFriendsFeatured,
} from '../src/locales/dynamic/floraFriends'
import { isAlbumMediaKey } from '../src/utils/floratriumMedia'

test('friend tabs switch featured and grouped static albums without listing or pagination', async ({
  page,
}, info) => {
  const mobile = info.project.name.includes('mobile')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  let listings = 0
  await page.route('**/__floratrium/media?**', (route) => {
    listings++
    return route.fulfill({
      json: { items: [], nextCursor: null, totalPages: 1 },
    })
  })
  await page.route('**/friends-tab-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;background:#161616;color:white}#fixture{margin:110px 12px 0;height:480px;max-width:620px;--flora-theme-color:#b74d62;--flora-media-title-size:44px}</style><div id="fixture"></div>',
    })
  )
  await page.goto('/friends-tab-fixture')
  await page.evaluate(async (mobile) => {
    const { createApp, h, ref } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { default: Gallery } = await import(
      '/src/views/Home/components/FloraAlbumGallery.vue'
    )
    const { default: i18n } = await import('/src/locales/index.ts')
    const petId = ref('huahua')
    createApp({
      render: () =>
        h(Gallery, {
          petId: petId.value,
          title: i18n.global.locale.value === 'en' ? 'Album' : '相册',
          mobile,
        }),
    })
      .use(i18n)
      .mount('#fixture')
    ;(window as any).friendsFixture = { petId, i18n }
  }, mobile)
  const gallery = page.locator('.flora-album-gallery')
  const main = gallery.getByRole('tab', { name: '相册', exact: true })
  const friends = gallery.getByRole('tab', {
    name: '花花的邻居们',
    exact: true,
  })
  await expect(main).toHaveAttribute('aria-selected', 'true')
  await expect(friends).toHaveCSS('opacity', '0.5')
  await expect(friends.locator('span')).toHaveCSS(
    '-webkit-text-fill-color',
    'rgba(0, 0, 0, 0)'
  )
  await main.focus()
  await page.keyboard.press('ArrowRight')
  await expect(friends).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(main).toBeFocused()
  await friends.click()
  await expect(friends).toHaveAttribute('aria-selected', 'true')
  await expect(friends).toHaveCSS('opacity', '1')
  await expect(main).toHaveCSS('opacity', '0.5')
  await expect(gallery).not.toHaveClass(/is-expanded/)
  await expect(
    gallery.locator('.flora-album-strip__group:not([aria-hidden]) img')
  ).toHaveCount(8)
  const featured = await gallery
    .locator('.flora-album-strip__group:not([aria-hidden]) img')
    .evaluateAll((images) =>
      images.map((image) => (image as HTMLImageElement).src.split('?')[0])
    )
  expect(featured).toEqual(floraFriendsFeatured.map((item) => item.url))
  const bounds = await gallery.getByRole('tablist').evaluate((el) => ({
    left: el.getBoundingClientRect().left,
    right: el.getBoundingClientRect().right,
    childrenRight: Math.max(
      ...Array.from(el.querySelectorAll('button')).map(
        (button) => button.getBoundingClientRect().right
      )
    ),
  }))
  expect(bounds.childrenRight).toBeLessThanOrEqual(bounds.right + 1)
  await gallery.getByRole('button', { name: 'EXPAND', exact: true }).click()
  await expect(gallery).toHaveClass(/is-expanded/)
  await expect(
    gallery.locator('.flora-album-gallery__friend-group h3')
  ).toHaveText(['咪咪（花妈妈）', '兄弟姐妹', '圈圈', '楼下宠物店的小猫'])
  for (const [index, group] of floraFriendAlbums.entries()) {
    await expect(
      gallery
        .locator('.flora-album-gallery__friend-group')
        .nth(index)
        .locator('.media-gallery__card')
    ).toHaveCount(group.items.length)
  }
  await expect(gallery.locator('.flora-album-gallery__footer')).toHaveCount(0)
  expect(listings).toBe(0)
  await main.click()
  await expect(main).toHaveAttribute('aria-selected', 'true')
  await expect.poll(() => listings).toBeGreaterThan(0)
  await expect(gallery.locator('.flora-album-gallery__footer')).toHaveCount(1)
  await friends.click()
  await expect(
    gallery.locator('.flora-album-gallery__friend-group')
  ).toHaveCount(4)
  await page.evaluate(() => {
    ;(window as any).friendsFixture.i18n.global.locale.value = 'en'
  })
  await expect(
    gallery.getByRole('tab', { name: 'Flora’s Neighbors' })
  ).toHaveAttribute('aria-selected', 'true')
  await expect(
    gallery.locator('.flora-album-gallery__friend-group h3')
  ).toHaveText([
    'Mimi (Flora’s Mom)',
    'Siblings',
    'Quanquan',
    'Kitten Downstairs',
  ])
  const englishBounds = await gallery.getByRole('tablist').evaluate((el) => ({
    right: el.getBoundingClientRect().right,
    contentRight: Math.max(
      ...Array.from(el.querySelectorAll('button')).map(
        (button) => button.getBoundingClientRect().right
      )
    ),
  }))
  expect(englishBounds.contentRight).toBeLessThanOrEqual(
    englishBounds.right + 1
  )
  await page.evaluate(() => {
    ;(window as any).friendsFixture.i18n.global.locale.value = 'zhCn'
    ;(window as any).friendsFixture.petId.value = 'xiaohei'
  })
  await expect(gallery.getByRole('tab')).toHaveCount(0)
  await expect(gallery).not.toHaveClass(/is-expanded/)
  await page.evaluate(() => {
    ;(window as any).friendsFixture.petId.value = 'huahua'
  })
  await expect(main).toHaveAttribute('aria-selected', 'true')
})

test('friend inventory is isolated from the main album and includes each featured photo', () => {
  expect(floraFriendAlbums.map((group) => group.id)).toEqual([
    'Mimi',
    'Siblings',
    'Quanquan',
    'KittenDownstairs',
  ])
  const all = floraFriendAlbums.flatMap((group) => group.items)
  expect(new Set(all.map((item) => item.key)).size).toBe(all.length)
  for (const item of floraFriendsFeatured) {
    expect(all.some((media) => media.key === item.key)).toBe(true)
    expect(isAlbumMediaKey(item.key, 'flora')).toBe(false)
  }
  expect(isAlbumMediaKey('Floratrium/flora/photo.webp', 'flora')).toBe(true)
})
