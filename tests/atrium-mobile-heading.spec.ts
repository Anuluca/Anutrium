import { expect, test } from '@playwright/test'

test('mobile detail headings stay proportional and close to navigation', async ({
  page,
}, info) => {
  test.skip(!info.project.name.includes('mobile'), '仅检查移动端详情布局')
  test.setTimeout(120000)
  await page.emulateMedia({ reducedMotion: 'reduce' })

  for (const width of [320, 402]) {
    await page.setViewportSize({ width, height: 780 })
    for (const module of ['laboratory', 'collections']) {
      await page.goto(`/atrium/${module}`, { waitUntil: 'domcontentloaded' })
      const root = page.locator('.island-focus:not(.island-closing-snapshot)')
      await expect(root.locator('.island-detail')).toBeVisible({
        timeout: 45000,
      })
      await page.evaluate(() => document.fonts.ready)

      const layout = await root.evaluate((element) => {
        const window = Array.from(
          element.querySelectorAll<HTMLElement>('.island-window')
        ).find((node) => node.getClientRects().length)!
        const item = Array.from(
          window.querySelectorAll<HTMLElement>('.island-item')
        ).find((node) => node.getClientRects().length)!
        const bounds = (node: Element) => {
          const rect = node.getBoundingClientRect()
          const transform = new DOMMatrixReadOnly(
            getComputedStyle(node).transform
          )
          return {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            height: rect.height,
            scaleX: transform.a,
            scaleY: transform.d,
          }
        }
        const header = bounds(window.querySelector('.island-window__bar')!)
        const tabs = element.querySelector('.collection-tabs')
        const stage = element.closest('.temple-stage')!
        return {
          layers: {
            background: Number(
              getComputedStyle(stage.querySelector('canvas')!).zIndex
            ),
            fade: Number(getComputedStyle(stage, '::after').zIndex),
            content: Number(getComputedStyle(element).zIndex),
          },
          navigationBottom: document
            .querySelector('.el-menu-layout-all')!
            .getBoundingClientRect().bottom,
          header,
          heading: bounds(window.querySelector('h2')!),
          title: bounds(item.querySelector('.island-item__title-text')!),
          count: bounds(item.querySelector('.island-item__count')!),
          routes: Array.from(
            element.querySelectorAll('.island-detail-nav__item'),
            (node) => ({
              ...bounds(node),
              font: parseFloat(getComputedStyle(node).fontSize),
            })
          ),
          collectionColumns: element.querySelector('.collection-grid')
            ? getComputedStyle(
                element.querySelector('.collection-grid')!
              ).gridTemplateColumns.split(' ').length
            : null,
          tabs: tabs
            ? {
                width: tabs.clientWidth,
                scrollWidth: tabs.scrollWidth,
                buttons: Array.from(tabs.querySelectorAll('button'), bounds),
              }
            : null,
        }
      })

      const topGap = layout.header.top - layout.navigationBottom
      expect(layout.layers.background).toBeLessThan(layout.layers.fade)
      expect(layout.layers.fade).toBeLessThan(layout.layers.content)
      expect(topGap).toBeGreaterThanOrEqual(8)
      expect(topGap).toBeLessThanOrEqual(24)
      for (const node of [layout.heading, layout.title, layout.count]) {
        expect(node.height).toBeGreaterThanOrEqual(24)
        expect(node.height).toBeLessThanOrEqual(44)
        expect(
          Math.abs(
            node.top +
              node.height / 2 -
              (layout.header.top + layout.header.height / 2)
          )
        ).toBeLessThanOrEqual(1)
        expect(node.scaleX).toBe(1)
        expect(node.scaleY).toBe(1)
      }
      expect(layout.heading.right).toBeLessThan(layout.title.left)
      expect(layout.title.right).toBeLessThan(layout.count.left)
      for (const route of layout.routes) {
        expect(route.font).toBeGreaterThanOrEqual(24)
        expect(route.font).toBeLessThanOrEqual(32)
        expect(Math.abs(route.height - route.font)).toBeLessThanOrEqual(1)
      }
      if (layout.collectionColumns !== null) {
        expect(layout.collectionColumns).toBe(2)
      }
      if (layout.tabs) {
        expect(layout.tabs.scrollWidth).toBeLessThanOrEqual(
          layout.tabs.width + 1
        )
        for (const button of layout.tabs.buttons) {
          expect(button.height).toBeGreaterThanOrEqual(44)
          expect(
            Math.abs(button.top - layout.tabs.buttons[0].top)
          ).toBeLessThanOrEqual(1)
        }
      }
    }
  }
})
