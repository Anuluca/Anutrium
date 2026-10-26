import { expect, test } from '@playwright/test'

test('Lucario removes four forehead diagonals and exposes the chest spike root without changing its solid mesh', async ({
  page,
}, info) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<body style="margin:0;background:black">',
    })
  )
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { inspectLucarioWire } = await import(
      '/tests/fixtures/lucario-wire-inspection.ts'
    )
    const fixture = await inspectLucarioWire()
    ;(window as any).lucarioWireInspection = fixture
    return {
      hiddenSides: fixture.hiddenSides,
      removedEdges: fixture.removedEdges,
      sourceUnchanged: fixture.sourceUnchanged,
      triangles: fixture.triangles,
      originalTriangles: fixture.originalTriangles,
    }
  })
  expect(result.hiddenSides).toBe(8)
  expect(result.removedEdges).toEqual([
    '850:851',
    '850:852',
    '851:853',
    '852:853',
  ])
  expect(result.sourceUnchanged).toBe(true)
  expect(result.triangles).toBe(result.originalTriangles)
  for (const part of ['face', 'chest'] as const)
    for (const improved of [false, true]) {
      await page.evaluate(
        ({ part, improved }) =>
          (window as any).lucarioWireInspection.render(part, improved),
        { part, improved }
      )
      await page.locator('canvas').screenshot({
        path: `/tmp/lucario-wire-${part}-${improved ? 'after' : 'before'}-${
          info.project.name
        }.png`,
      })
    }
  await page.evaluate(() => (window as any).lucarioWireInspection.dispose())
})
