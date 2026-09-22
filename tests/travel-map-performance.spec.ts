import { expect, test } from '@playwright/test'

test('travel map uses one local optimized boundary payload', async ({
  page,
}) => {
  const boundaryRequests: string[] = []
  const unpkgRequests: string[] = []

  page.on('request', (request) => {
    const url = request.url()
    if (url.includes('/geo/visited-regions')) boundaryRequests.push(url)
    if (url.includes('unpkg.com/leaflet')) unpkgRequests.push(url)
  })

  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.travel-map .leaflet-map-pane')).toBeAttached({
    timeout: 15_000,
  })
  await expect(
    page.locator('.travel-map .visited-region-highlight').first()
  ).toBeAttached()
  await expect.poll(() => boundaryRequests.length, { timeout: 15_000 }).toBe(1)

  expect(boundaryRequests[0]).toMatch(/\/geo\/visited-regions\.geojson$/)
  expect(unpkgRequests).toHaveLength(0)

  const boundary = await page.request.get('/geo/visited-regions.geojson')
  const payload = await boundary.json()
  expect(payload.type).toBe('FeatureCollection')
  expect(payload.features).toHaveLength(11)
})
