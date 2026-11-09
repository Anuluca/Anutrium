import { expect, test } from '@playwright/test'

test('gallery paginates by 28, keeps preview indices, and supports external pagination', async ({
  page,
}) => {
  await page.route('**/gallery-pagination-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<meta name="viewport" content="width=device-width, initial-scale=1"><div id="fixture"></div>',
    })
  )
  await page.route('**/pagination-image-*.svg*', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>',
    })
  )
  await page.goto('/gallery-pagination-fixture')
  await page.evaluate(async () => {
    const { createApp, h, reactive } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { default: Gallery } = await import(
      '/src/components/MediaGallery/index.vue'
    )
    const { default: i18n } = await import('/src/locales/index.ts')
    const state = reactive({
      items: Array.from({ length: 61 }, (_, index) => ({
        url: `/pagination-image-${index}.svg`,
      })),
      pagination: true,
      pageSize: undefined,
    })
    createApp({ render: () => h(Gallery, state) })
      .use(i18n)
      .mount('#fixture')
    ;(window as any).paginationFixture = state
  })
  const gallery = page.locator('.media-gallery')
  const cards = gallery.locator('.media-gallery__card')
  const pagination = gallery.getByRole('navigation', { name: '相册分页' })
  await expect(cards).toHaveCount(28)
  await expect(pagination).toContainText('共61张图片 (3页)')
  await pagination.getByRole('button', { name: '第 2 页', exact: true }).click()
  await expect(cards).toHaveCount(28)
  await expect(cards.first().locator('img')).toHaveAttribute(
    'src',
    /pagination-image-28\.svg/
  )
  await cards.first().getByRole('button').click()
  await expect(page.locator('.el-image-viewer__img')).toHaveAttribute(
    'src',
    /pagination-image-28\.svg$/
  )
  await page.keyboard.press('Escape')
  await gallery.getByRole('button', { name: '大图预览', exact: true }).click()
  await expect(gallery.locator('.inline-image-preview__thumbnail')).toHaveCount(
    61
  )
  await expect(pagination).toHaveCount(0)
  await gallery.getByRole('button', { name: '列表模式', exact: true }).click()
  await pagination.getByRole('button', { name: '第 3 页', exact: true }).click()
  await expect(cards).toHaveCount(5)
  await expect(cards.first().locator('img')).toHaveAttribute(
    'src',
    /pagination-image-56\.svg/
  )
  await expect(
    pagination.getByRole('button', { name: '下一页', exact: true })
  ).toBeDisabled()

  // 替换数据回到首页，调用方可覆盖页大小或关闭内部分页。
  await page.evaluate(() => {
    const state = (window as any).paginationFixture
    state.items = state.items.slice(0, 35)
  })
  await expect(cards).toHaveCount(28)
  await expect(
    pagination.getByRole('button', { name: '第 1 页', exact: true })
  ).toHaveAttribute('aria-current', 'page')
  await page.evaluate(() => {
    ;(window as any).paginationFixture.pageSize = 10
  })
  await expect(cards).toHaveCount(10)
  await page.evaluate(() => {
    ;(window as any).paginationFixture.pagination = false
  })
  await expect(cards).toHaveCount(35)
  await expect(pagination).toHaveCount(0)
})
