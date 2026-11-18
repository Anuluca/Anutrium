import {
  expectPagePositionToMatch,
  readPagePosition,
} from './helpers/pagePosition'
import { expect, test } from './helpers/sceneDiagnostics'

test('agent list modal preserves position and supports history, expansion and replica navigation', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/laboratory', { waitUntil: 'domcontentloaded' })
  const entry = page.getByRole('button', { name: /AI Agent能力测试/ })
  await expect(entry).toBeVisible({ timeout: 45000 })
  const expand = page.getByRole('button', { name: '展开全屏内容', exact: true })
  if (!info.project.name.includes('mobile')) await expect(expand).toBeEnabled()
  await entry.scrollIntoViewIfNeeded()
  const before = await readPagePosition(
    page,
    '.island-laboratory-content .tl-grid'
  )
  await entry.click()
  const modal = page.locator('.modal-wrapper-dialog:visible')
  const cards = modal.locator('.shared-work-card')
  const card = cards.filter({ hasText: 'GPT-6 Astra' })
  const columns = () =>
    modal
      .locator('.ai-agent-tests__grid')
      .evaluate(
        (element) =>
          getComputedStyle(element).gridTemplateColumns.split(' ').length
      )
  await expect(modal).toBeVisible()
  await expect(cards).toHaveCount(2)
  await expect(cards.filter({ hasText: '仿Fgo卷轴式地图交互' })).toContainText(
    'GPT-6.2 Sol High'
  )
  await expect(card).toContainText('GPT-6 Astra')
  await expect(card.locator('.work-card-stack')).toHaveCount(0)
  await expect.poll(columns).toBe(2)
  expectPagePositionToMatch(
    await readPagePosition(page, '.island-laboratory-content .tl-grid'),
    before
  )
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(page).toHaveURL(/\/atrium\/laboratory$/)
  expectPagePositionToMatch(
    await readPagePosition(page, '.island-laboratory-content .tl-grid'),
    before
  )
  if (!info.project.name.includes('mobile')) {
    await expand.click()
    await expect(
      page.getByRole('button', { name: '恢复半屏内容', exact: true })
    ).toBeEnabled()
    await entry.click()
    await expect.poll(columns).toBe(4)
    await page.keyboard.press('Escape')
    await expect(modal).toHaveCount(0)
    await page
      .getByRole('button', { name: '恢复半屏内容', exact: true })
      .click()
    await expect(expand).toBeEnabled()
  }
  await entry.click()
  await page.goBack()
  await expect(modal).toHaveCount(0)
  await page.goForward()
  await expect(modal).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(modal).toBeVisible({ timeout: 45000 })
  await expect
    .poll(() =>
      card
        .locator('img')
        .evaluate((image: HTMLImageElement) => image.naturalWidth)
    )
    .toBeGreaterThan(0)
  await card.click()
  await expect(page).toHaveURL(/\/ai-playground\/arknightxpersona3reload$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'GPT-6-Astra前端UI复刻'
  )
})

test('opens the world terrain map and moves between its views on mouse or touch', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium/laboratory/ai-agent', {
    waitUntil: 'domcontentloaded',
  })
  await page.getByRole('button', { name: /仿Fgo卷轴式地图交互/ }).click({
    timeout: 45000,
  })
  await expect(page).toHaveURL(/\/ai-playground\/tidal-atlas$/)
  const map = page.getByRole('region', { name: '世界地形图', exact: true })
  const layerList = page.getByRole('navigation', { name: '地图地点' })
  const terrain = map.locator('.atlas-terrain')
  await expect(map).toHaveAttribute('data-view', 'cylinder')
  const locations = [
    '俄罗斯-莫斯科',
    '中国-北京',
    '新加坡-新加坡',
    '印度尼西亚-雅加达',
    '澳大利亚-堪培拉',
    '新西兰-惠灵顿',
    '南极洲-阿蒙森–斯科特南极站',
  ]
  for (const [index, location] of locations.entries()) {
    await expect(layerList.getByRole('button').nth(index)).toHaveAccessibleName(
      location
    )
  }
  await expect(
    page.getByText(
      'GPT6.2 Sol 仿照《Fate/Grand Order》第七异闻带“黄金树海纪行 纳维·米克特兰”制作的卷轴式地图',
      { exact: true }
    )
  ).toBeVisible()
  await page.getByRole('button', { name: '原参考图' }).click()
  const reference = page.locator('.el-image-viewer__img')
  await expect(reference).toHaveAttribute('src', /fgo-reference\.webp/)
  await expect
    .poll(() =>
      reference.evaluate((image: HTMLImageElement) => image.naturalWidth)
    )
    .toBe(2240)
  await page.keyboard.press('Escape')
  await expect(reference).toHaveCount(0)
  await expect
    .poll(() =>
      terrain.evaluate((image: HTMLImageElement) => image.naturalWidth)
    )
    .toBe(4096)

  const getTransform = () => map.getAttribute('data-camera')
  const beforeJump = await getTransform()
  const australia = layerList.getByRole('button', { name: '澳大利亚' })
  const layerBounds = (await layerList.boundingBox())!
  const mapBounds = (await map.boundingBox())!
  expect(layerBounds.x).toBeGreaterThan(mapBounds.x + mapBounds.width / 2)
  await australia.click()
  await expect(australia).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(getTransform).not.toBe(beforeJump)
  const australiaCamera = await getTransform()
  await map.press('ArrowLeft')
  await expect.poll(getTransform).not.toBe(australiaCamera)
  const canberra = map.getByRole('button', { name: '堪培拉' })
  await canberra.click()
  await expect(page.getByRole('heading', { name: '堪培拉' })).toBeVisible()
  await expect(
    page.getByRole('complementary', { name: '堪培拉' })
  ).toContainText('澳大利亚')
  await expect.poll(getTransform).toBe(australiaCamera)
  await expect(layerList).toBeHidden()
  await page.getByRole('heading', { name: '堪培拉' }).click()
  await page.locator('.atlas-detail-preview').click()
  await expect(canberra).toHaveAttribute('aria-expanded', 'true')
  const backdrop = page.locator('.atlas-detail-backdrop')
  const backdropBounds = (await backdrop.boundingBox())!
  const position = {
    x: backdropBounds.width * 0.5,
    y: backdropBounds.height * 0.85,
  }
  if (info.project.name.includes('mobile')) await backdrop.tap({ position })
  else await backdrop.click({ position })
  await expect(page.getByRole('heading', { name: '堪培拉' })).toHaveCount(0)
  await expect(layerList).toBeVisible()
  await expect(canberra).toBeFocused()
  const beforeGesture = await getTransform()
  const box = (await map.boundingBox())!
  const x = Math.round(box.x + box.width * 0.25)
  const y = Math.round(box.y + box.height * 0.36)

  if (info.project.name.includes('mobile')) {
    const client = await page.context().newCDPSession(page)
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x, y, id: 1 },
        { x: x + 70, y, id: 2 },
      ],
    })
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: x - 25, y, id: 1 },
        { x: x + 95, y, id: 2 },
      ],
    })
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    await expect.poll(getTransform).not.toBe(beforeGesture)
  } else {
    const pin = (await canberra.boundingBox())!
    const pinX = pin.x + pin.width / 2
    const pinY = pin.y + pin.height / 2
    await page.mouse.move(pinX, pinY)
    await page.mouse.down()
    await page.mouse.move(pinX - 90, pinY + 48, { steps: 4 })
    await page.mouse.up()
    await expect.poll(getTransform).not.toBe(beforeGesture)
    await expect(page.getByRole('heading', { name: '堪培拉' })).toHaveCount(0)
    const beforeWheel = await getTransform()
    await page.mouse.wheel(0, -120)
    await expect.poll(getTransform).not.toBe(beforeWheel)
  }

  await page.getByRole('button', { name: '全图' }).click()
  await expect(map).toHaveAttribute('data-view', 'overview')
  await expect(map).toHaveAttribute('data-camera', '1024,512,0.62')
  await page.getByRole('button', { name: '回到当前地点' }).click()
  await expect(map).toHaveAttribute('data-view', 'cylinder')
  await expect(australia).toHaveAttribute('aria-pressed', 'true')

  await layerList.getByRole('button', { name: '新西兰' }).click()
  await map.press('ArrowRight')
  expect(Number((await getTransform())?.split(',')[0])).toBeLessThan(100)

  await layerList.getByRole('button', { name: '南极洲' }).click()
  await expect(map.getByRole('button', { name: '惠灵顿' })).toBeVisible()
  const antarcticCamera = await getTransform()
  await page.getByRole('button', { name: '全图' }).click()
  await map.getByRole('button', { name: '南极点' }).click()
  await expect(map).toHaveAttribute('data-view', 'cylinder')
  await expect.poll(getTransform).toBe(antarcticCamera)
  await expect(
    page.getByRole('heading', { name: '阿蒙森–斯科特南极站' })
  ).toBeVisible()
  await expect(page.getByText(/南极洲无首都/)).toBeVisible()
})
