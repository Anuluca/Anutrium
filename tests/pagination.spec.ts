import { expect, test } from '@playwright/test'

test('shared pagination supports controlled pages, availability limits and optional totals', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/shared-pagination-fixture', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<meta name="viewport" content="width=device-width, initial-scale=1"><div id="fixture"></div>',
    })
  )
  await page.goto('/shared-pagination-fixture')
  await page.evaluate(async () => {
    const { createApp, h, reactive } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { default: Pagination } = await import(
      '/src/components/Pagination/index.vue'
    )
    const { default: i18n } = await import('/src/locales/index.ts')
    const state = reactive({
      page: 1,
      pageCount: 3,
      availablePages: 2,
      totalItems: null,
      mobile: undefined,
    })
    ;(window as any).sharedPagination = state
    createApp({
      render: () =>
        h(Pagination, {
          ...state,
          ariaLabel: '笔记分页',
          onSelect: (page: number) => (state.page = page),
        }),
    })
      .use(i18n)
      .mount('#fixture')
  })
  const pager = page.getByRole('navigation', { name: '笔记分页' })
  await expect(pager).toHaveClass(/\bpagination\b/)
  await expect(pager.locator('.flora-album-gallery__page-total')).toHaveCount(0)
  await expect(
    pager.getByRole('button', { name: '上一页', exact: true })
  ).toBeDisabled()
  await expect(
    pager.getByRole('button', { name: '第 3 页', exact: true })
  ).toBeDisabled()
  await pager.getByRole('button', { name: '第 2 页', exact: true }).click()
  await expect(
    pager.getByRole('button', { name: '第 2 页', exact: true })
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    pager.getByRole('button', { name: '下一页', exact: true })
  ).toBeDisabled()
  await pager.getByRole('button', { name: '上一页', exact: true }).click()
  await expect(
    pager.getByRole('button', { name: '第 1 页', exact: true })
  ).toHaveAttribute('aria-current', 'page')
  await page.evaluate(() =>
    Object.assign((window as any).sharedPagination, {
      availablePages: 3,
      totalItems: 61,
      mobile: false,
    })
  )
  await expect(pager).toContainText('共61张图片 (3页)')
  await pager.getByRole('button', { name: '第 3 页', exact: true }).click()
  await expect(
    pager.getByRole('button', { name: '第 3 页', exact: true })
  ).toHaveAttribute('aria-current', 'page')
  await expect(
    pager.getByRole('button', { name: '下一页', exact: true })
  ).toBeDisabled()
  await expect(
    pager.getByRole('button', { name: '第 1 页', exact: true })
  ).toHaveCSS('font-size', '18px')
  await page.evaluate(() => ((window as any).sharedPagination.mobile = true))
  await expect(pager).toHaveClass(/is-mobile/)
  await expect(
    pager.getByRole('button', { name: '第 1 页', exact: true })
  ).toHaveCSS('font-size', '14px')
})
