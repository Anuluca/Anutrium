import { expect, type Page, test } from './helpers/sceneDiagnostics'

const open = async (page: Page, path: string, selection: string) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'aria-busy',
    'false',
    { timeout: 45000 }
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    selection
  )
  if (selection === 'none')
    await expect(page.locator('.temple-stage')).toHaveAttribute(
      'data-entrance-finished',
      'true',
      { timeout: 45000 }
    )
  else
    await expect(page.locator('.temple-page')).toHaveAttribute(
      'data-settled',
      'true',
      { timeout: 15000 }
    )
  await expect(page.locator('.entry-overlay-container')).toHaveCount(0, {
    timeout: 30000,
  })
}

const record = (page: Page) =>
  page.evaluate(() => {
    const root = document.querySelector('.temple-page')!
    const container = document.querySelector('.router-container')!
    const read = () =>
      [root, container].map((element) => {
        const rect = element.getBoundingClientRect()
        return [rect.top, rect.left]
      })
    const data = {
      before: read(),
      frames: [] as number[][][],
      phases: [] as Array<{
        phase: string
        path: string
        selected: string | undefined
      }>,
    }
    ;(window as any).templeCurtainSamples = data
    const sample = () => {
      if (root.isConnected) data.frames.push(read())
      const curtain = document.querySelector<HTMLElement>('.route-curtain')
      if (curtain)
        data.phases.push({
          phase: curtain.dataset.phase!,
          path: location.pathname,
          selected:
            document.querySelector<HTMLElement>('.temple-page')?.dataset
              .selected,
        })
      if ((window as any).templeCurtainSampling) requestAnimationFrame(sample)
    }
    ;(window as any).templeCurtainSampling = true
    requestAnimationFrame(sample)
  })

const push = (page: Page, path: string) =>
  page.evaluate((path) => {
    void (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push(path)
  }, path)

const verify = async (
  page: Page,
  from: string,
  to: string,
  oldSelection: string,
  selection: string
) => {
  const curtain = page.locator('.route-curtain')
  await expect(curtain).toHaveAttribute('data-phase', 'cover')
  await expect(page).toHaveURL(new RegExp(`${from.replaceAll('/', '\\/')}$`))
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    oldSelection
  )
  await expect(curtain).toHaveCount(0, { timeout: 45000 })
  await expect(page).toHaveURL(new RegExp(`${to.replaceAll('/', '\\/')}$`))
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    selection
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true'
  )
  const samples = await page.evaluate(() => {
    ;(window as any).templeCurtainSampling = false
    return (window as any).templeCurtainSamples
  })
  expect(
    samples.phases.some(
      (s: any) =>
        s.phase === 'cover' && s.path === from && s.selected === oldSelection
    )
  ).toBe(true)
  expect(
    samples.phases.some(
      (s: any) =>
        s.phase === 'reveal' && s.path === to && s.selected === selection
    )
  ).toBe(true)
  expect(samples.frames.length).toBeGreaterThan(2)
  for (const frame of samples.frames)
    for (let element = 0; element < 2; element++)
      for (let axis = 0; axis < 2; axis++)
        expect(
          Math.abs(frame[element][axis] - samples.before[element][axis])
        ).toBeLessThanOrEqual(1)
}

for (const [from, oldSelection, to, selection] of [
  ['/archive', 'archive', '/atrium/collections', 'statue'],
] as const)
  test(`${from} to ${to} switches only behind the route curtain`, async ({
    page,
  }) => {
    test.setTimeout(90000)
    await open(page, from, oldSelection)
    await record(page)
    await push(page, to)
    await verify(page, from, to, oldSelection, selection)
    if (selection === 'statue') {
      await expect(page.locator('.temple-stage')).toHaveAttribute(
        'data-camera-zoom',
        test.info().project.name.includes('mobile') ? '1.4500' : '2.1500'
      )
      await expect
        .poll(async () =>
          Number(
            (await page
              .locator('.temple-stage')
              .getAttribute('data-statue-body-rotation'))!.split(',')[1]
          )
        )
        .toBeCloseTo(Math.PI, 4)
    }
  })

test('menu title returns a tertiary page to the initial home behind the curtain', async ({
  page,
}) => {
  test.setTimeout(90000)
  await open(page, '/atrium/collections', 'statue')
  await record(page)
  await page.locator('.site-brand.header-home-link').click()
  await verify(page, '/atrium/collections', '/', 'statue', 'none')
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-camera-zoom',
    '1.0000'
  )
  await page.waitForTimeout(700)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none'
  )
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-camera-zoom',
    '1.0000'
  )
})

test('initial home and Atrium overview keep their original scene transition without a curtain', async ({
  page,
}) => {
  test.setTimeout(90000)
  await open(page, '/', 'none')
  await record(page)
  await push(page, '/atrium')
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'statue',
    { timeout: 20000 }
  )
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-material-phase',
    'wireframe',
    { timeout: 20000 }
  )
  await page.locator('.site-brand.header-home-link').click()
  await expect(page).toHaveURL(/\/$/, { timeout: 20000 })
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none',
    { timeout: 20000 }
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 20000 }
  )
  const phases = await page.evaluate(() => {
    ;(window as any).templeCurtainSampling = false
    return (window as any).templeCurtainSamples.phases
  })
  expect(phases).toEqual([])
})
