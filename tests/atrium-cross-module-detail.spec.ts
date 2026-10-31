import { expect, type Page, test } from './helpers/sceneDiagnostics'

const navigate = (page: Page, path: string) =>
  page.evaluate(
    (path) =>
      (
        document.querySelector('#app') as any
      ).__vue_app__.config.globalProperties.$router.push(path),
    path
  )

const ready = async (page: Page, selection: string) => {
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 45000 }
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    selection
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 15000 }
  )
}

const readFraming = (page: Page) =>
  page.locator('.temple-page').evaluate((node) => {
    const scene = (node as any).__vueParentComponent.setupState.scene
    const stage = node.querySelector<HTMLElement>('.temple-stage')!
    return {
      ...scene.getPhotoFraming(),
      rotation: stage.dataset.statueBodyRotation!.split(',').map(Number),
    }
  })

test('cross-module detail entry cannot be overwritten by the remaining overview scan', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await ready(page, 'archive')
  const canvas = await page.locator('.temple-stage canvas').elementHandle()
  await navigate(page, '/atrium/collections')
  await ready(page, 'statue')
  const stage = page.locator('.temple-stage')
  await expect(stage).toHaveAttribute(
    'data-island-detail-module',
    'COLLECTIBLES'
  )
  await expect(stage).toHaveAttribute('data-material-phase', 'wireframe', {
    timeout: 15000,
  })
  await expect
    .poll(async () => (await readFraming(page)).rotation[1])
    .toBeCloseTo(Math.PI, 4)
  await expect(stage).toHaveAttribute(
    'data-camera-zoom',
    test.info().project.name.includes('mobile') ? '1.4500' : '2.1500'
  )
  expect(
    await canvas!.evaluate(
      (node) => node === document.querySelector('.temple-stage canvas')
    )
  ).toBe(true)
})

const sources = [
  ['/archive', 'archive'],
  ['/flanerie', 'flanerie'],
  ['/creative', 'island'],
  ['/pokeyard', 'pokeyard'],
  ['/floratrium', 'sprigatito'],
] as const
const details = [
  ['/atrium/laboratory', 'LABORATORY'],
  ['/atrium/notes', 'NOTES'],
  ['/atrium/games', 'GAME LIBRARY'],
  ['/atrium/collections', 'COLLECTIBLES'],
] as const

const framingValues = async (page: Page) => {
  const { camera, model, rotation } = await readFraming(page)
  return [
    ...camera.position,
    ...camera.quaternion,
    camera.fov,
    camera.zoom,
    ...Object.values(camera.offset),
    ...model.position,
    ...model.scale,
    ...rotation,
  ] as number[]
}

// 每个二级入口独立计时，避免整组真实入场动画累计触发单个测试超时。
const directEntryFraming = new Map<string, number[]>()
for (const [source, selection] of sources)
  test(`${source} enters every Atrium detail with its direct-entry framing`, async ({
    page,
  }) => {
    test.setTimeout(180000)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    if (!directEntryFraming.size)
      for (const [path, id] of details) {
        await page.goto(path, { waitUntil: 'domcontentloaded' })
        await ready(page, 'statue')
        await expect(page.locator('.temple-stage')).toHaveAttribute(
          'data-island-detail-module',
          id
        )
        directEntryFraming.set(id, await framingValues(page))
      }
    await page.goto(source, { waitUntil: 'domcontentloaded' })
    await ready(page, selection)
    for (const [path, id] of details)
      await test.step(`${source} → ${path}`, async () => {
        await navigate(page, source)
        await ready(page, selection)
        const canvas = await page
          .locator('.temple-stage canvas')
          .elementHandle()
        await navigate(page, path)
        await ready(page, 'statue')
        await expect(page.locator('.temple-stage')).toHaveAttribute(
          'data-island-detail-module',
          id
        )
        await expect(page.locator('.temple-stage')).toHaveAttribute(
          'data-material-phase',
          'wireframe',
          { timeout: 15000 }
        )
        await expect
          .poll(
            async () => {
              const actual = await framingValues(page)
              return Math.max(
                ...actual.map((value, index) =>
                  Math.abs(value - directEntryFraming.get(id)![index])
                )
              )
            },
            { timeout: 15000 }
          )
          .toBeLessThan(0.0001)
        expect(
          await canvas!.evaluate(
            (node) => node === document.querySelector('.temple-stage canvas')
          )
        ).toBe(true)
      })
  })
