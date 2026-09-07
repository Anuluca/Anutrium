import { expect, type Page, test } from '@playwright/test'

import {
  expectPagePositionToMatch,
  readPagePosition,
} from './helpers/pagePosition'

const route = '/ai-playground/arknightxpersona3reload'
test.use({ viewport: { width: 1600, height: 1100 } })

const openPanel = async (page: Page, name: string) => {
  await page
    .locator('.ark-scene')
    .getByRole('button', { name, exact: true })
    .click()
  await expect(page.locator('.game-panel')).toBeVisible()
}
const closePanel = async (page: Page) => {
  await page.keyboard.press('Escape')
  await expect(page.locator('.el-overlay-dialog')).toBeHidden()
}

test.beforeEach(async ({ page }) => {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.ark-scene')).toHaveClass(/scene-ready/)
  await page.waitForTimeout(1600)
})

test('desktop scene renders the requested copy and every menu is clickable', async ({
  page,
}) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'GPT-6-Astra前端UI复刻'
  )
  await expect(page.locator('.replica-credit')).toHaveText(
    '使用GPT-6 Astra 高进行的《明日方舟》UI复刻'
  )
  for (const name of [
    '终端',
    '恢复理智',
    '编队',
    '干员',
    '采购中心',
    '公开招募',
    '干员寻访',
    '任务',
    '基建',
    '仓库',
    '基建通知',
    '活动剩余时间',
    '月行水上活动',
    '奇象巡展活动',
    '龙门币',
    '合成玉',
    '至纯源石',
    '设置',
    '公告',
    '邮件',
    '签到',
    '查看博士档案',
    '限时礼包',
    'FRIENDS 好友',
    'ARCHIVES 档案',
  ]) {
    await openPanel(page, name)
    await closePanel(page)
  }
})

test('operations, recovery and reward claims update resources without duplicate claims', async ({
  page,
}) => {
  await openPanel(page, '终端')
  await page.getByRole('button', { name: /1-7 暴君/ }).click()
  await page.getByRole('button', { name: /开始行动/ }).click()
  await expect(page.locator('.sanity-value')).toHaveText('46')
  await closePanel(page)
  await openPanel(page, '恢复理智')
  await page.getByRole('button', { name: /恢复 60 理智/ }).click()
  await expect(page.locator('.sanity-value')).toHaveText('106')
  await closePanel(page)
  await openPanel(page, '任务')
  const mission = page.locator('.mission-list > div').first()
  await mission.getByRole('button').click()
  await expect(mission.getByRole('button')).toBeDisabled()
  await expect(page.locator('.resource-lmd')).toContainText('13765074')
  await closePanel(page)
  await openPanel(page, '基建')
  await page.getByRole('button', { name: /一键收取/ }).click()
  await expect(page.getByRole('button', { name: /收益已收取/ })).toBeDisabled()
  await expect(page.locator('.resource-lmd')).toContainText('13777074')
})

test('purchases and headhunting reach inventory, squads and recruit tags remain independent', async ({
  page,
}) => {
  await openPanel(page, '采购中心')
  await page.getByRole('button', { name: /高级作战记录/ }).click()
  await closePanel(page)
  await openPanel(page, '仓库')
  await expect(
    page.locator('.inventory-grid > div').filter({ hasText: '高级作战记录' })
  ).toContainText('129')
  await closePanel(page)
  await openPanel(page, '干员寻访')
  await page.getByRole('button', { name: /寻访一次/ }).click()
  await expect(page.locator('.resource-orundum')).toContainText('235571')
  await closePanel(page)
  await openPanel(page, '仓库')
  await page.getByRole('button', { name: '招募凭证', exact: true }).click()
  await expect(page.locator('.inventory-grid')).toContainText('阿米娅信物')
  await expect(page.locator('.inventory-grid')).not.toContainText(
    '高级作战记录'
  )
  await closePanel(page)
  await openPanel(page, '编队')
  await page.getByRole('button', { name: /能天使/ }).click()
  await expect(page.getByRole('button', { name: /能天使/ })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await page.getByRole('button', { name: '编队 03' }).click()
  await expect(page.getByRole('button', { name: /能天使/ })).toHaveAttribute(
    'aria-pressed',
    'false'
  )
  await closePanel(page)
  await openPanel(page, '公开招募')
  for (const tag of ['近战位', '远程位', '输出', '治疗'])
    await page.getByRole('button', { name: tag, exact: true }).click()
  await expect(
    page.getByRole('button', { name: '治疗', exact: true })
  ).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: /开始公开招募/ }).click()
  await expect(page.getByRole('button', { name: /招募进行中/ })).toBeDisabled()
})

test('character follows the pointer and reduced motion disables parallax', async ({
  page,
}) => {
  const scene = (await page.locator('.ark-scene').boundingBox())!
  const character = page.locator('.protagonist')
  await page.mouse.move(
    scene.x + scene.width * 0.15,
    scene.y + scene.height * 0.4
  )
  await page.waitForTimeout(450)
  const left = await character.evaluate(
    (el) => new DOMMatrix(getComputedStyle(el).transform).m41
  )
  await page.mouse.move(
    scene.x + scene.width * 0.85,
    scene.y + scene.height * 0.4
  )
  await expect
    .poll(() =>
      character.evaluate(
        (el) => new DOMMatrix(getComputedStyle(el).transform).m41
      )
    )
    .toBeGreaterThan(left + 8)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(1100)
  await page.mouse.move(
    scene.x + scene.width * 0.1,
    scene.y + scene.height * 0.3
  )
  const still = await character.evaluate(
    (el) => new DOMMatrix(getComputedStyle(el).transform).m41
  )
  expect(Math.abs(still)).toBeLessThan(0.1)
  await expect(page.locator('.ark-scene')).toHaveClass(/motion-disabled/)
})

test('menu modal preserves and locks page position', async ({ page }) => {
  await page.evaluate(() => window.scrollTo(0, 130))
  await page.waitForTimeout(400)
  const initial = await readPagePosition(page, '.replica-frame')
  await openPanel(page, '终端')
  await page.waitForTimeout(400)
  expectPagePositionToMatch(
    await readPagePosition(page, '.replica-frame'),
    initial
  )
  await page.mouse.move(8, 8)
  await page.mouse.wheel(0, 500)
  await page.waitForTimeout(200)
  expectPagePositionToMatch(
    await readPagePosition(page, '.replica-frame'),
    initial
  )
  await closePanel(page)
  await page.waitForTimeout(300)
  expectPagePositionToMatch(
    await readPagePosition(page, '.replica-frame'),
    initial
  )
})
