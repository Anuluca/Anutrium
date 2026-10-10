import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const stylesheet = readFileSync(
  path.resolve('src/assets/style/fonts/unbounded.generated.less'),
  'utf8'
).replace(/^\/\/.*\n/, '')
const manifest = JSON.parse(
  readFileSync(path.resolve('scripts/fonts/generated/manifest.json'), 'utf8')
) as { shards: { url: string; codepoints: number[] }[] }

test('font shards load only for used ranges and render 谢 with the custom font', async ({
  page,
}) => {
  const requested: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.endsWith('.woff2')) requested.push(url.href)
  })
  // Isolate font matching from unrelated page text and preloads. Fonts are still
  // requested from the production R2 domain, including its CORS configuration.
  await page.route('**/__font-subsets-probe', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<style>${stylesheet}</style><span id="probe" style="display:none;font:400 48px UnboundedSans, sans-serif"></span>`,
    })
  )
  await page.goto('/__font-subsets-probe')
  expect(requested).toEqual([])

  for (const character of ['A', '谢', '摄']) {
    await page.evaluate(async (text) => {
      document.querySelector('#probe')!.textContent = text
      ;(document.querySelector('#probe') as HTMLElement).style.display =
        'inline'
      await document.fonts.load('400 48px UnboundedSans', text)
      await document.fonts.ready
    }, character)
    const expectedShard = manifest.shards.find((shard) =>
      shard.codepoints.includes(character.codePointAt(0)!)
    )!
    expect(requested).toContain(expectedShard.url)

    // A ready FontFace or computed font-family cannot prove glyph selection.
    // Chromium reports the font that actually rendered this character.
    const session = await page.context().newCDPSession(page)
    await session.send('DOM.enable')
    await session.send('CSS.enable')
    const { root } = await session.send('DOM.getDocument')
    const { nodeId } = await session.send('DOM.querySelector', {
      nodeId: root.nodeId,
      selector: '#probe',
    })
    const { fonts } = await session.send('CSS.getPlatformFontsForNode', {
      nodeId,
    })
    expect(fonts).toHaveLength(1)
    expect(fonts[0].isCustomFont).toBe(true)
    expect(fonts[0].familyName).toMatch(/Unbounded/i)
    await session.detach()
  }
  expect(new Set(requested).size).toBe(3)
})
