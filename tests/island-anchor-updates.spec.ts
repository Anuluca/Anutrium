import { expect, test } from '@playwright/test'

const anchors = {
  chest: { x: 410, y: 300 },
  rightHand: { x: 350, y: 330 },
  leftHand: { x: 480, y: 330 },
  rightBraid: { x: 390, y: 210 },
  leftBraid: { x: 450, y: 210 },
}

test('anchor coordinates update without Vue renders, layout reads or repeated DOM queries', async ({
  page,
}, info) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="app" style="position:relative;width:100vw;height:100vh"></div>',
    })
  )
  await page.goto('/')
  const result = await page.evaluate(
    async ({ anchors, mobile }) => {
      const { mountIslandLayout } = await import(
        '/tests/fixtures/island-link-layout.ts'
      )
      const layout = await mountIslandLayout(mobile)
      await layout.update(anchors)
      const lines = [...layout.root.querySelectorAll('.island-links > g')]
      const mutations: MutationRecord[] = []
      const observer = new MutationObserver((records) =>
        mutations.push(...records)
      )
      observer.observe(layout.root.querySelector('.island-links')!, {
        subtree: true,
        attributes: true,
        childList: true,
      })
      const counters = { reads: 0, queries: 0 }
      const bounds = Element.prototype.getBoundingClientRect
      const query = Element.prototype.querySelector
      Element.prototype.getBoundingClientRect = function () {
        counters.reads++
        return bounds.call(this)
      }
      Element.prototype.querySelector = function (...args: any[]) {
        counters.queries++
        return query.apply(this, args as any)
      }
      const initial = { ...layout.updates }
      // 重用同一对象，验证动画源改为原地更新时阈值仍比较上次提交值。
      anchors.chest.x += 0.125
      await layout.update(anchors)
      const belowThresholdWrites = mutations.splice(0).length
      anchors.chest.x += 0.125
      await layout.update(anchors)
      const thresholdWrites = mutations.splice(0).length
      for (let frame = 0; frame < 40; frame++) {
        anchors.chest.x += 0.5
        anchors.rightBraid.y += 0.5
        await layout.update(anchors)
      }
      const during = { ...counters }
      Element.prototype.getBoundingClientRect = bounds
      Element.prototype.querySelector = query
      observer.disconnect()
      const childMutations = mutations.filter(
        (record) => record.type === 'childList'
      ).length
      const coordinate = layout.root.querySelector<SVGLineElement>(
        '[data-link-item="MISCELLANY"] line'
      )!.x2.baseVal.value
      const stableNodes = lines.every(
        (node) =>
          node ===
          layout.root.querySelector(
            `[data-link-item="${node.getAttribute('data-link-item')}"]`
          )
      )
      const updates = {
        parent: layout.updates.parent - initial.parent,
        layout: layout.updates.layout - initial.layout,
      }
      layout.unmount()
      await layout.update(anchors)
      return {
        belowThresholdWrites,
        thresholdWrites,
        childMutations,
        coordinate,
        stableNodes,
        updates,
        during,
      }
    },
    { anchors, mobile: info.project.name.includes('mobile') }
  )
  expect(result.belowThresholdWrites).toBe(0)
  expect(result.thresholdWrites).toBe(2) // 仅 x2 和端点 transform；y2 不变。
  expect(result.coordinate).toBe(430.25)
  expect(result.stableNodes).toBe(true)
  expect(result.childMutations).toBe(0)
  expect(result.updates).toEqual({ parent: 0, layout: 0 })
  expect(result.during).toEqual({ reads: 0, queries: 0 })
})

test('real model frames bypass both Vue components and rebind after layout and focus changes', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  await page.route('**/src/views/Home/templeScene.ts*', async (route) => {
    const response = await route.fetch()
    const marker = 'renderer.domElement.tabIndex = 0'
    const body = await response.text()
    expect(body).toContain(marker)
    await route.fulfill({
      response,
      body: body.replace(
        marker,
        'window.__anchorSource = () => islandModelAnchors;' + marker
      ),
    })
  })
  await page.goto('/island', { waitUntil: 'domcontentloaded' })
  const root = page.locator('.island-focus')
  const stage = page.locator('.temple-stage')
  await expect(root).toBeVisible({ timeout: 60000 })
  await expect(stage).toHaveAttribute('data-entrance-finished', 'true')
  const viewport = page.viewportSize()!
  await page.mouse.move(viewport.width * 0.5, viewport.height * 0.45)
  await page.waitForTimeout(1200)
  await root.evaluate((element: any) => {
    const instance = element.__vueParentComponent
    let parent = instance.parent
    while (parent && parent.type.__name !== 'TemplePage') parent = parent.parent
    if (!parent) throw new Error('TemplePage instance not found')
    const state = { layout: 0, parent: 0, writes: 0, triggers: [] as string[] }
    ;(instance.rtg ||= []).push((event: { key: unknown; type: string }) =>
      state.triggers.push(`${event.type}:${String(event.key)}`)
    )
    ;(instance.bu ||= []).push(() => state.layout++)
    ;(parent.bu ||= []).push(() => state.parent++)
    const nodes = [...element.querySelectorAll('.island-links > g')]
    const observer = new MutationObserver((records) => {
      state.writes += records.filter((r) =>
        ['x2', 'y2', 'transform'].includes(r.attributeName!)
      ).length
    })
    observer.observe(element.querySelector('.island-links'), {
      attributes: true,
      subtree: true,
    })
    const source = (window as any).__anchorSource()
    ;(window as any).__anchorFrames = {
      state,
      nodes,
      observer,
      source,
      points: Object.values(source),
    }
  })
  for (const x of [0.46, 0.54, 0.47, 0.53]) {
    await page.mouse.move(viewport.width * x, viewport.height * 0.45)
    await page.waitForTimeout(140)
  }
  await page.waitForTimeout(400)
  const result = await root.evaluate((element: any) => {
    const probe = (window as any).__anchorFrames
    probe.observer.disconnect()
    const source = (window as any).__anchorSource()
    const mapping = {
      LABORATORY: 'rightBraid',
      MISCELLANY: 'chest',
      'STUDY NOTES': 'rightHand',
      'GAME LIBRARY': 'leftBraid',
      COLLECTIBLES: 'leftHand',
    }
    let maxError = 0
    for (const node of probe.nodes) {
      const line = node.querySelector('line')
      const point = source[(mapping as any)[node.dataset.linkItem]]
      maxError = Math.max(
        maxError,
        Math.abs(line.x2.baseVal.value - point.x),
        Math.abs(line.y2.baseVal.value - point.y)
      )
    }
    return {
      ...probe.state,
      maxError,
      stableNodes: probe.nodes.every(
        (node: Element) =>
          node ===
          element.querySelector(
            `[data-link-item="${node.getAttribute('data-link-item')}"]`
          )
      ),
      stableSource:
        source === probe.source &&
        Object.values(source).every(
          (point, index) => point === probe.points[index]
        ),
    }
  })
  await info.attach('anchor-frame-evidence', {
    body: JSON.stringify(result, null, 2),
    contentType: 'application/json',
  })
  expect(result.parent).toBe(0)
  expect(result.layout).toBe(0)
  expect(result.writes).toBeGreaterThan(0)
  expect(result.maxError).toBeLessThan(0.251)
  expect(result.stableNodes).toBe(true)
  expect(result.stableSource).toBe(true)
  const originError = () =>
    root.evaluate((element) => {
      const bounds = element.getBoundingClientRect()
      let max = 0
      for (const panel of element.querySelectorAll<HTMLElement>(
        '.island-panels [data-flash-item]'
      )) {
        const rect = panel.getBoundingClientRect()
        const right =
          panel.closest<HTMLElement>('[data-island-group]')!.dataset
            .islandGroup !== 'interests'
        const line = element.querySelector<SVGLineElement>(
          `[data-link-item="${panel.dataset.flashItem}"] line`
        )!
        max = Math.max(
          max,
          Math.abs(
            line.x1.baseVal.value -
              ((right ? rect.right : rect.left) - bounds.left)
          ),
          Math.abs(
            line.y1.baseVal.value - (rect.top + rect.height / 2 - bounds.top)
          )
        )
      }
      return max
    })
  await page.setViewportSize({
    width: viewport.width + 30,
    height: viewport.height - 40,
  })
  await expect.poll(originError).toBeLessThan(1)
  await page.evaluate(() => {
    ;(
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$i18n.locale = 'en'
  })
  await expect(root.locator('.island-panels h2')).toHaveText([
    'IDEAS',
    'NOTES',
    'OTAKU',
  ])
  await expect.poll(originError).toBeLessThan(1)
  await root.locator('[data-island-item="STUDY NOTES"]').focus()
  await expect
    .poll(() =>
      root.locator('.island-links > g').last().getAttribute('data-link-item')
    )
    .toBe('STUDY NOTES')
  const select = (id: string | null) =>
    page.evaluate(
      (id) =>
        (
          document.querySelector('#app') as any
        ).__vue_app__.config.globalProperties.$pinia._s
          .get('temple-navigation')
          .request(id),
      id
    )
  await select(null)
  await expect(root).toHaveCount(0)
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 15000 }
  )
  await select('statue')
  await expect(root).toBeVisible({ timeout: 15000 })
  await expect(
    root.locator('.island-links > g[visibility="visible"]')
  ).toHaveCount(5)
  await expect.poll(originError).toBeLessThan(1)
  expect(
    await page.evaluate(() =>
      (window as any).__anchorFrames.nodes.every(
        (node: Element) => !node.isConnected
      )
    )
  ).toBe(true)
})
