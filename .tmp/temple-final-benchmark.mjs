import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { instrument } from './temple-perf-instrument.mjs'

const baseline = await readFile(new URL('./temple-perf-served.js', import.meta.url), 'utf8')
const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal'] })
const results = []
try {
  for (const version of ['before', 'after', 'before', 'after']) {
    const page = await browser.newPage({ viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 2 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.route('**/src/views/Island/islandTempleScene.ts*', async route => {
      const response = await route.fetch()
      await route.fulfill({ response, body: instrument(version === 'before' ? baseline : await response.text()) })
    })
    await page.goto('http://localhost:3000/island')
    await page.locator('.temple-stage[aria-busy="false"]').waitFor({ timeout: 30000 })
    await page.mouse.move(20, 150)
    await page.waitForTimeout(1200)
    await page.locator('[data-obelisk="creative"]').evaluate(button => button.click())
    await page.locator('.temple-page[data-settled="true"]').waitFor({ timeout: 20000 })
    await page.evaluate(() => { document.querySelector('.zodiac-stage').style.filter = 'blur(4px)' })
    await page.waitForTimeout(700)
    const result = await page.evaluate(async () => {
      const a = window.__templePerf
      const gl = a.renderer.getContext()
      const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2')
      const renderer = gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL)
      if (!ext) throw new Error('GPU timer query is required')
      const postCamera = new a.camera.constructor(38, 1, .1, 100)
      const draw = a.drawScene || (() => {
        a.renderer.setRenderTarget(a.target)
        a.renderer.render(a.scene, a.camera)
        a.renderer.setRenderTarget(null)
        a.renderer.render(a.postScene, postCamera)
      })
      const queries = [], cpu = []
      for (let index = 0; index < 44; index++) {
        await new Promise(resolve => setTimeout(resolve, 35))
        const query = gl.createQuery(), start = performance.now()
        gl.beginQuery(ext.TIME_ELAPSED_EXT, query)
        draw()
        gl.endQuery(ext.TIME_ELAPSED_EXT)
        gl.flush()
        if (index >= 4) { queries.push(query); cpu.push(performance.now() - start) }
        else gl.deleteQuery(query)
      }
      await new Promise(resolve => setTimeout(resolve, 200))
      if (gl.getParameter(ext.GPU_DISJOINT_EXT)) throw new Error('GPU timing was invalidated')
      const gpu = queries.filter(query => gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE))
        .map(query => gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6)
      queries.forEach(query => gl.deleteQuery(query))
      const summarize = values => {
        const sorted = values.slice().sort((x, y) => x - y)
        return { samples: values.length, mean: values.reduce((x, y) => x + y, 0) / values.length,
          p50: sorted[Math.floor(sorted.length * .5)], p95: sorted[Math.floor(sorted.length * .95)] }
      }
      return { renderer, canvas: [a.renderer.domElement.width, a.renderer.domElement.height],
        gpu: summarize(gpu), cpu: summarize(cpu), programs: a.renderer.info.programs.length }
    })
    results.push({ version, ...result, errors })
    console.log(JSON.stringify(results.at(-1)))
    await page.close()
  }
  await writeFile(new URL('./temple-final-ab.json', import.meta.url), JSON.stringify(results, null, 2))
} finally { await browser.close() }
