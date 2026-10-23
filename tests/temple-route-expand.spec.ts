import { expect, type Page, test } from '@playwright/test'

const modules = [
  { path: '/archive', id: 'archive' },
  { path: '/flanerie', id: 'flanerie' },
  { path: '/pokeyard', id: 'pokeyard' },
  { path: '/creative', id: 'island' },
]
const push = (page: Page, path: string) =>
  page.evaluate(async (path) => {
    const app = document.querySelector('#app') as any
    await app.__vue_app__.config.globalProperties.$router.push(path)
  }, path)
const expectModule = async (page: Page, id: string, expanded: boolean) => {
  const root = page.locator('.temple-page')
  await expect(root).toHaveAttribute('data-selected', id, { timeout: 30000 })
  await expect(root).toHaveAttribute('data-settled', 'true', { timeout: 30000 })
  await expect(root).toHaveClass(
    expanded ? /temple-page--expanded/ : /^(?!.*temple-page--expanded)/
  )
}

for (const module of modules)
  test(`${module.path} applies isExpand on entry, query changes, history and reload`, async ({
    page,
  }) => {
    test.setTimeout(90000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`${module.path}?isExpand=true`, {
      waitUntil: 'domcontentloaded',
    })
    await expectModule(page, module.id, true)
    await push(page, `${module.path}?isExpand=false`)
    await expectModule(page, module.id, false)
    await page.goBack()
    await expectModule(page, module.id, true)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expectModule(page, module.id, true)
    await push(page, module.path)
    await expectModule(page, module.id, false)
  })

test('module switches and explicit false override a fullscreen return', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/archive?isExpand=true', { waitUntil: 'domcontentloaded' })
  await expectModule(page, 'archive', true)
  await push(page, '/creative?isExpand=true')
  await expectModule(page, 'island', true)
  await push(page, '/colorPalette')
  await expect(page.locator('.palette-tool')).toBeVisible()
  await push(page, '/creative?isExpand=false')
  await expectModule(page, 'island', false)
  await push(page, '/?module=flanerie&isExpand=1')
  await expectModule(page, 'flanerie', true)
  await push(page, '/?module=flanerie&isExpand=0')
  await expectModule(page, 'flanerie', false)
})
