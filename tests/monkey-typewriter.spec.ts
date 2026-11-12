import { expect, test } from '@playwright/test'
import jsQR from 'jsqr'
import { writeFileSync } from 'node:fs'
import { PNG } from 'pngjs'

import {
  analyzeEnglishWords,
  highlightEnglishWords,
} from '../src/utils/englishWordAnalysis'

const path = '/laboratory/monkey-typewriter'
const id = '8200000000000-00000000-0000-4000-8000-000000000001'
const content = 'Axzb qplm. '.repeat(140) + '\n\nZxyq abc!'
const article = {
  id,
  title: 'Axzb qplm',
  createdAt: '2026-11-09T01:00:00.000Z',
  words: 282,
  characters: content.length,
  content,
  preview: content.slice(0, 110),
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
})

test('generate, share catalogue, reopen, download, pagination and failed-request retry', async ({
  page,
  context,
}, info) => {
  test.setTimeout(60000)
  let attempts = 0
  const sentIds: string[] = []
  await page.route(
    'https://steam-api.anuluca.com/monkey-articles**',
    async (route) => {
      const request = route.request()
      if (request.url().endsWith('/generate'))
        return route.fulfill({ json: { ...article, id: '' } })
      if (request.method() === 'POST') {
        attempts++
        sentIds.push(request.postDataJSON().id)
        if (attempts === 1) return route.abort('failed')
        return route.fulfill({
          json: { ...article, ...request.postDataJSON() },
          status: 201,
        })
      }
      if (request.url().includes('?cursor='))
        return route.fulfill({
          json: {
            articles: [
              {
                ...article,
                id: id.replace(/1$/, '2'),
                title: 'Second archive',
              },
            ],
            nextCursor: null,
          },
        })
      if (request.url().endsWith(`/${id}`))
        return route.fulfill({ json: article })
      return route.fulfill({
        json: { articles: [article], nextCursor: 'page-two' },
      })
    }
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  // 全站开场完成后会延迟 900ms 重挂载子页面，等待该既有过渡结束再操作。
  await page.waitForTimeout(1600)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('猴子打字')
  await expect(page.locator('.monkey-lab')).toBeVisible()
  await expect(page.locator('.typewriter-photo > img')).toHaveJSProperty(
    'naturalWidth',
    1448
  )
  const layout = await page.evaluate(() => {
    const photo = document
      .querySelector('.typewriter-photo')!
      .getBoundingClientRect()
    const root = document.querySelector('.monkey-lab')!.getBoundingClientRect()
    const stage = document.querySelector('.typewriter-photo') as HTMLElement
    const holder = stage.parentElement!
    const book = document.querySelector<HTMLElement>('.babel-entrance')!
    const left = Math.min(stage.offsetLeft, book.offsetLeft)
    const right = Math.max(
      stage.offsetLeft + stage.offsetWidth,
      book.offsetLeft + book.offsetWidth
    )
    return {
      centerError: Math.abs(
        holder.offsetLeft +
          new DOMMatrix(getComputedStyle(holder).transform).m41 +
          (left + right) / 2 -
          holder.parentElement!.clientWidth / 2
      ),
      perspective: !new DOMMatrix(
        getComputedStyle(document.querySelector('.start-button')!).transform
      ).is2D,
      fits: photo.width <= Math.max(root.width, root.height),
    }
  })
  expect(layout.centerError).toBeLessThanOrEqual(1)
  expect(layout.perspective).toBe(false)
  expect(layout.fits).toBe(true)

  await page.getByRole('button', { name: 'START' }).click()
  await expect(page.getByRole('textbox', { name: '文章正文' })).toHaveValue(
    content
  )
  expect(attempts).toBe(0)
  await page.getByRole('textbox', { name: '文章标题' }).fill('My edited title')
  await page
    .getByRole('textbox', { name: '文章正文' })
    .fill(content + '\nEdited by me.')
  await page
    .getByRole('button', { name: '保存至巴别图书馆', exact: true })
    .click()
  await expect(page.locator('.el-message--error')).toContainText('连接未完成')
  await page
    .getByRole('button', { name: '保存至巴别图书馆', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: '已保存至巴别图书馆', exact: true })
  ).toBeHidden()
  await expect(
    page
      .locator('.el-message--success')
      .filter({ hasText: '已保存至巴别图书馆' })
  ).toBeVisible()
  await expect(page.locator('.lab-feedback')).toBeEmpty()
  expect(sentIds[0]).toBe(sentIds[1])
  await expect(page.getByRole('button', { name: 'RESTART' })).toBeEnabled()
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: '复制全文' }).click()
  await expect(
    page.locator('.el-message--success').filter({ hasText: '已复制全文' })
  ).toBeVisible()
  await expect(page.locator('.lab-feedback')).not.toContainText('已复制全文')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    content
  )
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, 'write', {
      configurable: true,
      value: async (items: ClipboardItem[]) => {
        const blob = await items[0].getType('image/png')
        ;(window as any).monkeyCopiedImage = {
          type: blob.type,
          size: blob.size,
        }
      },
    })
  })
  if (info.project.name.includes('mobile')) {
    const png = page.waitForEvent('download')
    await page.getByRole('button', { name: '分享', exact: true }).click()
    expect((await png).suggestedFilename()).toBe('monkey-manuscript.png')
    await expect(
      page.locator('.el-message--success').filter({ hasText: '已开始保存图片' })
    ).toBeVisible()
  } else {
    await page.getByRole('button', { name: '分享', exact: true }).click()
    await expect
      .poll(
        () => page.evaluate(() => (window as any).monkeyCopiedImage?.type),
        { timeout: 30000 }
      )
      .toBe('image/png')
    await expect(
      page.locator('.el-message--success').filter({ hasText: '图片已复制' })
    ).toBeVisible()
  }
  await expect(page.locator('.share-loading')).toHaveCount(0)
  await expect(page.locator('.share-options')).toHaveCount(0)
  const downloaded = page.waitForEvent('download')
  await page.getByRole('button', { name: '下载 .txt' }).click()
  await expect(
    page
      .locator('.el-message--success')
      .filter({ hasText: '已开始下载 .txt 文件' })
  ).toBeVisible()
  expect((await downloaded).suggestedFilename()).toMatch(/^monkey-.*\.txt$/)
  await page.locator('.babel-entrance').click()
  await expect(page.locator('.library-book')).toHaveCount(1)
  await page.getByRole('button', { name: '加载更多书本' }).click()
  await expect(page.locator('.library-book')).toHaveCount(2)
  await expect(page.getByRole('button', { name: '加载更多书本' })).toHaveCount(
    0
  )
  await page.locator('.library-book').first().click()
  await expect(page.locator('.babel-reader .manuscript-highlights')).toHaveText(
    content
  )
  await page.keyboard.press('Escape')
  await expect(page.locator('.babel-library-dialog')).toBeHidden()
  await expect(page.getByRole('textbox', { name: '文章正文' })).toHaveValue(
    content + '\nEdited by me.'
  )
  await page.screenshot({
    path: `test-results/monkey-${info.project.name}.png`,
  })
  const bounds = await page.locator('.monkey-lab').evaluate((element) => {
    const root = element.getBoundingClientRect()
    const frame = document
      .querySelector('.scene-viewport')!
      .getBoundingClientRect()
    return Math.max(
      frame.left - root.left,
      frame.top - root.top,
      root.right - frame.right,
      root.bottom - frame.bottom
    )
  })
  expect(bounds).toBeLessThanOrEqual(1)
})

test('library failures can be retried and rate limits have a useful message', async ({
  page,
}) => {
  let fail = true
  await page.route(
    'https://steam-api.anuluca.com/monkey-articles**',
    (route) => {
      if (route.request().method() === 'POST')
        return route.fulfill({ status: 429, json: { error: 'rate_limited' } })
      return fail
        ? route.fulfill({ status: 503, json: { error: 'unavailable' } })
        : route.fulfill({ json: { articles: [], nextCursor: null } })
    }
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  // 全站开场完成后会延迟 900ms 重挂载子页面，等待该既有过渡结束再操作。
  await page.waitForTimeout(1600)
  await page.getByRole('button', { name: 'START' }).click()
  await expect(page.locator('.lab-feedback [role=alert]')).toContainText(
    '每分钟最多 5 次'
  )
  await page.locator('.babel-entrance').click()
  await expect(page.locator('.el-message--error')).toContainText('暂时不可用')
  fail = false
  await page.getByRole('button', { name: '刷新书架' }).click()
  await expect(page.locator('.library-scroll')).toHaveAttribute(
    'aria-busy',
    'false'
  )
  await expect(page.locator('.library-book')).toHaveCount(0)
})

test('leaving preserves desktop and mobile geometry', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  // 全站开场完成后会延迟 900ms 重挂载子页面，等待该既有过渡结束再操作。
  await page.waitForTimeout(1600)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await expect(page.locator('.monkey-lab')).toBeVisible()
  await page.waitForTimeout(1000)
  await page.evaluate(() => {
    const root = document.querySelector('.replica-experiment-page')!
    const container = document.querySelector('.router-container')!
    const read = () =>
      [root, container].map((element) => {
        const rect = element.getBoundingClientRect()
        return [rect.top, rect.left]
      })
    const probe = { before: read(), frames: [] as number[][][] }
    ;(window as any).monkeyLeave = probe
    const sample = () => {
      if (!root.isConnected) return
      probe.frames.push(read())
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    void (
      document.querySelector('#app') as any
    ).__vue_app__.config.globalProperties.$router.push('/')
  })
  await expect(page.locator('.replica-experiment-page')).toHaveCount(0, {
    timeout: 20000,
  })
  const probe = await page.evaluate(() => (window as any).monkeyLeave)
  expect(probe.frames.length).toBeGreaterThan(0)
  for (const frame of probe.frames)
    for (let i = 0; i < frame.length; i++)
      for (let axis = 0; axis < 2; axis++)
        expect(
          Math.abs(frame[i][axis] - probe.before[i][axis])
        ).toBeLessThanOrEqual(1)
})

test('typing can be skipped and the laboratory return path is reused', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.route('https://steam-api.anuluca.com/monkey-articles**', (route) =>
    route.fulfill({ status: 201, json: article })
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  await page.getByRole('button', { name: 'START' }).click()
  await expect(
    page.getByRole('button', { name: 'SKIP', exact: true })
  ).toBeVisible()
  await expect(page.locator('.skip-typing')).toHaveCount(0)
  await page.getByRole('button', { name: 'SKIP' }).click()
  await expect(page.getByRole('textbox', { name: '文章正文' })).toHaveValue(
    content
  )
  await expect(page.getByRole('button', { name: 'RESTART' })).toBeEnabled()
  await page.getByRole('button', { name: '实验室', exact: true }).click()
  await expect(page).toHaveURL(/\/atrium\/laboratory$/)
  await expect(
    page.locator('.shared-tool-card').filter({ hasText: '猴子打字' })
  ).toBeVisible({ timeout: 20000 })
  await page
    .locator('.shared-tool-card')
    .filter({ hasText: '猴子打字' })
    .click()
  await expect(page).toHaveURL(/\/laboratory\/monkey-typewriter$/)
})

test('empty state has no manual creation; generated drafts remain editable and save as new records', async ({
  page,
}) => {
  const saved: { id: string; title: string; content: string }[] = []
  await page.route(
    'https://steam-api.anuluca.com/monkey-articles**',
    (route) => {
      expect(route.request().method()).toBe('POST')
      const data = route.request().postDataJSON()
      if (route.request().url().endsWith('/generate'))
        return route.fulfill({ json: { ...article, id: '' } })
      saved.push(data)
      return route.fulfill({ json: { ...article, ...data }, status: 201 })
    }
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  await expect(page.getByRole('button', { name: '手动写一篇' })).toHaveCount(0)
  await expect(page.locator('.share-button')).toBeHidden()
  await expect(page.locator('.empty-manuscript')).toHaveText(
    '点击“START”，生成一篇随机文章'
  )
  await expect(
    page.locator('.tray-label, .paper-meta, .paper-tools, .empty-number')
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'START' }).click()
  await page.getByRole('textbox', { name: '文章正文' }).fill('')
  await expect(
    page.getByRole('button', { name: '保存至巴别图书馆', exact: true })
  ).toBeHidden()
  await page.getByRole('textbox', { name: '文章标题' }).fill('手动修改的标题')
  await page
    .getByRole('textbox', { name: '文章正文' })
    .fill('<script>alert(1)</script>\nA manually edited article.')
  expect(saved).toHaveLength(0)
  await page
    .getByRole('button', { name: '保存至巴别图书馆', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: '已保存至巴别图书馆', exact: true })
  ).toBeHidden()
  expect(saved[0].content).toContain('<script>')
  await page
    .getByRole('textbox', { name: '文章正文' })
    .fill('A second edition.')
  await page
    .getByRole('button', { name: '保存至巴别图书馆', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: '已保存至巴别图书馆', exact: true })
  ).toBeHidden()
  expect(saved).toHaveLength(2)
  expect(saved[0].id).not.toBe(saved[1].id)
})

test('button colors match the design and actions wait for two cyan flashes without duplicate dispatch', async ({
  page,
}, info) => {
  let calls = 0
  let requestedAt = 0
  await page.route(
    'https://steam-api.anuluca.com/monkey-articles/generate',
    (route) => {
      calls++
      requestedAt = Date.now()
      return route.fulfill({ json: { ...article, id: '' } })
    }
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  await expect(page.locator('.babel-entrance')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)'
  )
  await expect(page.locator('.save-button')).toHaveCSS(
    'background-color',
    'rgb(226, 52, 86)'
  )
  await expect(page.locator('.share-button')).toBeHidden()
  if (!info.project.name.includes('mobile')) {
    await page.locator('.babel-entrance').hover()
    await expect(page.locator('.babel-entrance')).toHaveCSS(
      'filter',
      'brightness(1)'
    )
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const started = Date.now()
  const frames = await page
    .locator('.start-button')
    .evaluate((button: HTMLButtonElement) => {
      button.click()
      button.click()
      const effect = button.getAnimations()[0]?.effect as
        | KeyframeEffect
        | undefined
      return effect
        ?.getKeyframes()
        .filter(
          (frame) =>
            frame.backgroundColor === 'rgb(29, 203, 169)' ||
            frame.backgroundColor === '#1dcba9'
        ).length
    })
  expect(frames).toBe(2)
  expect(calls).toBe(0)
  await expect.poll(() => calls).toBe(1)
  expect(requestedAt - started).toBeGreaterThanOrEqual(200)
})

test('fuzzy image draws displaced single-pixel rows and stops for reduced motion', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const draw = CanvasRenderingContext2D.prototype.drawImage
    ;(window as any).fuzzyRows = 0
    ;(window as any).fuzzyTitleRows = 0
    CanvasRenderingContext2D.prototype.drawImage = function (...args: any[]) {
      if (
        this.canvas.classList.contains('photo-fuzzy-canvas') &&
        args[4] === 1 &&
        args[8] === 1
      )
        (window as any).fuzzyRows++
      if (
        this.canvas.classList.contains('babel-title-canvas') &&
        args[4] === 1 &&
        args[8] === 1
      )
        (window as any).fuzzyTitleRows++
      return (draw as any).apply(this, args)
    }
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  await expect
    .poll(() => page.evaluate(() => (window as any).fuzzyRows))
    .toBeGreaterThan(500)
  await expect
    .poll(() => page.evaluate(() => (window as any).fuzzyTitleRows))
    .toBeGreaterThan(50)
  await expect(
    page.locator('.typewriter-photo .photo-fuzzy-canvas')
  ).toBeVisible()
  await expect(page.locator('.monkey-lab')).toHaveCSS(
    'background-color',
    'rgba(0, 0, 0, 0)'
  )
  await expect(page.locator('.start-button')).toHaveCSS(
    'font-size',
    test.info().project.name === 'mobile-chrome' ? '22px' : '27px'
  )
  const frame = await page
    .locator('.monkey-lab')
    .evaluate((el) => getComputedStyle(el, '::after').content)
  expect(['none', 'normal']).toContain(frame)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(
    page.locator('.typewriter-photo .photo-fuzzy-canvas')
  ).toBeHidden()
  const stopped = await page.evaluate(() => (window as any).fuzzyRows)
  await page.waitForTimeout(150)
  expect(await page.evaluate(() => (window as any).fuzzyRows)).toBe(stopped)
})

test('article progress replaces the scrollbar and action buttons fade when hidden', async ({
  page,
}) => {
  await page.route('https://steam-api.anuluca.com/monkey-articles**', (route) =>
    route.fulfill({ json: { ...article, id: '' } })
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  await page.getByRole('button', { name: 'START', exact: true }).click()
  const editor = page.getByRole('textbox', { name: '文章正文' })
  await expect(editor).toBeVisible()
  await expect(page.locator('.analysis-reveal')).toHaveCSS('height', '84px')
  await editor.fill('Random words. '.repeat(850))
  expect(
    await editor.evaluate((el) => getComputedStyle(el).scrollbarWidth)
  ).toBe('none')
  await editor.evaluate((el) => {
    el.scrollTop = el.scrollHeight
    el.dispatchEvent(new Event('scroll'))
  })
  const progress = page.locator('.manuscript-frame .page-scroll-progress')
  await expect
    .poll(() =>
      progress.evaluate((el) =>
        el.style.getPropertyValue('--page-scroll-progress')
      )
    )
    .toBe('100%')
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.abs(
          document.querySelector('.manuscript-highlights')!.scrollTop -
            document.querySelector('.manuscript-editor')!.scrollTop
        )
      )
    )
    .toBeLessThanOrEqual(1)
  await editor.evaluate((el) => {
    el.scrollTop = 0
    el.dispatchEvent(new Event('scroll'))
  })
  await expect
    .poll(() =>
      progress.evaluate((el) =>
        el.style.getPropertyValue('--page-scroll-progress')
      )
    )
    .toBe('0%')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const save = page.getByRole('button', {
    name: '保存至巴别图书馆',
    exact: true,
  })
  expect(await save.evaluate((el) => getComputedStyle(el).paddingLeft)).toBe(
    '3px'
  )
  // 逐帧检查真实透明度，防止禁用样式覆盖过渡却仍有过渡类名。
  const sampleOpacity = async (content: string) =>
    page.evaluate(async (value) => {
      const editor =
        document.querySelector<HTMLTextAreaElement>('.manuscript-editor')!
      const button = document.querySelector<HTMLElement>('.save-button')!
      const samples: number[] = []
      ;(window as any).actionOffsets = []
      editor.value = value
      editor.dispatchEvent(new Event('input', { bubbles: true }))
      const start = performance.now()
      while (performance.now() - start < 650) {
        await new Promise(requestAnimationFrame)
        const style = getComputedStyle(button)
        if (style.display !== 'none') {
          samples.push(Number(style.opacity))
          ;(window as any).actionOffsets.push(
            new DOMMatrix(style.transform).m42
          )
        }
      }
      return samples
    }, content)
  const leaving = await sampleOpacity('')
  expect(leaving.some((opacity) => opacity > 0.05 && opacity < 0.95)).toBe(true)
  expect(Math.min(...leaving)).toBeLessThan(0.1)
  await expect(save).toBeHidden()
  const entering = await sampleOpacity('A new draft.')
  expect(entering.some((opacity) => opacity > 0.05 && opacity < 0.95)).toBe(
    true
  )
  const offsets = await page.evaluate(
    () => (window as any).actionOffsets as number[]
  )
  expect(offsets.some((y) => y > 0.2 && y < 11.8)).toBe(true)
  await expect(save).toHaveCSS('opacity', '1')
  await expect(save).toBeVisible()
})

test('workspace stays fixed while actions enter and leave', async ({
  page,
}) => {
  await page.route('https://steam-api.anuluca.com/monkey-articles**', (route) =>
    route.fulfill({ json: { ...article, id: '' } })
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  // 切换动态效果偏好会恢复公共容器的入场动画，待其结束后测量按钮布局。
  await page.waitForTimeout(1100)
  await page.getByRole('button', { name: 'START', exact: true }).click()
  await expect(page.locator('.photo-header')).toHaveCSS(
    'flex-basis',
    test.info().project.name === 'mobile-chrome' ? '200px' : '270px'
  )
  await expect(page.locator('.lab-workspace')).not.toHaveClass(
    /crt-effect-enter-active/
  )
  await page.evaluate(() => {
    const samples: { top: number; height: number; copyLeft?: number }[] = []
    ;(window as any).manuscriptGeometry = samples
    const measure = () => {
      const rect = document
        .querySelector(
          matchMedia('(max-width: 768px)').matches
            ? '.manuscript-frame'
            : '.paper-tray'
        )!
        .getBoundingClientRect()
      const copy = document.querySelector<HTMLElement>(
        '.draft-actions-left > button:not(.skip-typing)'
      )!
      const style = getComputedStyle(copy)
      samples.push({
        top: rect.top,
        height: rect.height,
        copyLeft:
          style.display !== 'none' && Number(style.opacity) > 0.02
            ? copy.offsetLeft
            : undefined,
      })
      ;(window as any).manuscriptGeometryFrame = requestAnimationFrame(measure)
    }
    measure()
  })
  await page.getByRole('button', { name: 'SKIP', exact: true }).click()
  const editor = page.getByRole('textbox', { name: '文章正文' })
  await expect(editor).toBeVisible()
  await editor.fill('')
  await expect(page.locator('.save-button')).toBeHidden()
  await editor.fill('Another random manuscript.')
  await page.waitForTimeout(400)
  const samples = await page.evaluate(() => {
    cancelAnimationFrame((window as any).manuscriptGeometryFrame)
    return (window as any).manuscriptGeometry as {
      top: number
      height: number
      copyLeft?: number
    }[]
  })
  const copyPositions = samples.flatMap((sample) =>
    sample.copyLeft === undefined ? [] : [sample.copyLeft]
  )
  expect(copyPositions.length).toBeGreaterThan(5)
  expect(
    Math.max(...copyPositions) - Math.min(...copyPositions)
  ).toBeLessThanOrEqual(1)
  expect(samples.length).toBeGreaterThan(10)
  for (const key of ['top', 'height'] as const) {
    const values = samples.map((sample) => sample[key])
    expect(Math.max(...values) - Math.min(...values), key).toBeLessThanOrEqual(
      1
    )
  }
})

test('analysis panel expands after generation and collapses on restart', async ({
  page,
}, info) => {
  await page.route('https://steam-api.anuluca.com/monkey-articles**', (route) =>
    route.fulfill({ json: { ...article, id: '' } })
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  await expect(page.getByRole('region', { name: '文章分析' })).toBeHidden()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.waitForTimeout(1100)
  await page.getByRole('button', { name: 'START', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'SKIP', exact: true })
  ).toBeVisible()
  await expect(page.getByRole('region', { name: '文章分析' })).toBeHidden()
  const record = () =>
    page.evaluate(() => {
      const samples: { height: number; opacity: number }[] = []
      ;(window as any).analysisSamples = samples
      const sample = () => {
        const style = getComputedStyle(
          document.querySelector('.analysis-reveal')!
        )
        samples.push({
          height: style.display === 'none' ? 0 : parseFloat(style.height),
          opacity: Number(style.opacity),
        })
        ;(window as any).analysisFrame = requestAnimationFrame(sample)
      }
      sample()
    })
  const stop = () =>
    page.evaluate(() => {
      cancelAnimationFrame((window as any).analysisFrame)
      return (window as any).analysisSamples as {
        height: number
        opacity: number
      }[]
    })
  await record()
  await page.getByRole('button', { name: 'SKIP', exact: true }).click()
  await expect(page.getByRole('region', { name: '文章分析' })).toBeVisible()
  await page.waitForTimeout(400)
  const entering = await stop()
  expect(
    entering.some(
      (frame) =>
        frame.height > 1 &&
        frame.height < 83 &&
        frame.opacity > 0 &&
        frame.opacity < 1
    )
  ).toBe(true)
  await expect(page.getByRole('region', { name: '文章分析' })).toContainText(
    '很遗憾，本次生成了0个正常单词。'
  )
  await expect(page.locator('.analysis-frame')).toHaveCSS('height', '72px')
  await page.screenshot({
    path: `test-results/monkey-analysis-${info.project.name}.png`,
  })
  await record()
  await page.getByRole('button', { name: 'RESTART', exact: true }).click()
  await expect(page.getByRole('region', { name: '文章分析' })).toBeHidden()
  const leaving = await stop()
  expect(
    leaving.some(
      (frame) =>
        frame.height > 1 &&
        frame.height < 83 &&
        frame.opacity > 0 &&
        frame.opacity < 1
    )
  ).toBe(true)
})

test('word matching uses complete ASCII words and preserves first occurrence order', () => {
  const words = new Set(['cat', 'dog', 'sun', 'book', 'cats'])
  expect(
    analyzeEnglishWords(
      "CAT, cat dog DOG! sun book cats a an us to xcaty cat123 123dog cat_name don't cat-like café 漢cat ca\u0301t",
      words
    )
  ).toEqual({
    words: [
      { word: 'cat', count: 2 },
      { word: 'dog', count: 2 },
      { word: 'sun', count: 1 },
      { word: 'book', count: 1 },
      { word: 'cats', count: 1 },
    ],
    occurrences: 7,
  })
  expect(analyzeEnglishWords('', words)).toEqual({ words: [], occurrences: 0 })
})

test('real wordlist analyzes generated and edited content, excludes titles and is reused for archived articles', async ({
  page,
}, info) => {
  let dictionaryRequests = 0
  const generated = {
    ...article,
    id: '',
    title: 'title only elephant',
    content:
      "CAT, cat dog DOG! sun book cats a an us to xcaty cat123 123dog cat_name don't cat-like café 漢cat",
  }
  await page.route('**/english-words*.txt*', async (route) => {
    if (route.request().resourceType() !== 'fetch') return route.continue()
    dictionaryRequests++
    await route.continue()
  })
  await page.route(
    'https://steam-api.anuluca.com/monkey-articles**',
    (route) => {
      if (route.request().url().endsWith('/generate'))
        return route.fulfill({ json: generated })
      if (route.request().url().endsWith(`/${id}`))
        return route.fulfill({ json: { ...article, content: 'book BOOK sun' } })
      return route.fulfill({ json: { articles: [article], nextCursor: null } })
    }
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  await page.getByRole('button', { name: 'START', exact: true }).click()
  const analysis = page.getByRole('region', { name: '文章分析' })
  await expect(analysis).toContainText('本次生成了 5 个正常单词：')
  await expect(analysis.getByRole('listitem')).toHaveText([
    'cat ×2',
    'dog ×2',
    'sun',
    'book',
    'cats',
  ])
  await expect(page.locator('.manuscript-highlights mark')).toHaveText([
    'CAT',
    'cat',
    'dog',
    'DOG',
    'sun',
    'book',
    'cats',
  ])
  // 手机端画布可能整体旋转，使用布局坐标验证同一行与垂直居中。
  await expect(page.locator('.analysis-reveal')).toHaveCSS('height', '84px')
  const alignment = await analysis.evaluate((element) => {
    const summary = element.querySelector<HTMLElement>('.analysis-summary')!
    const list = element.querySelector<HTMLElement>('.analysis-words')!
    const region = element.parentElement!
    return {
      row: Math.abs(summary.offsetTop - list.offsetTop),
      center: Math.abs(
        summary.offsetTop +
          summary.offsetHeight / 2 -
          region.offsetTop -
          region.offsetHeight / 2
      ),
    }
  })
  expect(alignment.row).toBeLessThanOrEqual(1)
  // 分析行按设计向下偏移 6px，保持同一行。
  expect(Math.abs(alignment.center - 6)).toBeLessThanOrEqual(1)
  expect(dictionaryRequests).toBe(1)
  await page.getByRole('textbox', { name: '文章正文' }).fill('Sun SUN book')
  await expect(analysis).toContainText('本次生成了 2 个正常单词：')
  await expect(analysis.getByRole('listitem')).toHaveText(['sun ×2', 'book'])
  await expect(page.locator('.manuscript-highlights mark')).toHaveText([
    'Sun',
    'SUN',
    'book',
  ])
  await page.getByRole('textbox', { name: '文章正文' }).fill('xzqv wxqz a an')
  await expect(analysis).toContainText('很遗憾，本次生成了0个正常单词。')
  await expect(analysis.getByRole('listitem')).toHaveCount(0)
  await expect(page.locator('.manuscript-highlights mark')).toHaveCount(0)
  await page.getByRole('button', { name: '巴别图书馆', exact: true }).click()
  await page.locator('.library-book').first().click()
  await expect(
    page.locator('.babel-reader .manuscript-highlights')
  ).toContainText('book BOOK sun')
  await page.keyboard.press('Escape')
  await expect(page.locator('.babel-library-dialog')).toBeHidden()
  await expect(page.getByRole('textbox', { name: '文章正文' })).toHaveValue(
    'xzqv wxqz a an'
  )
  await expect(analysis).toContainText('很遗憾，本次生成了0个正常单词。')
  expect(dictionaryRequests).toBe(1)
  await page.mouse.move(0, 0)
  await page
    .locator('.typewriter-photo > img')
    .evaluate((img: HTMLImageElement) => img.decode())
  await page.screenshot({
    path: `test-results/monkey-word-analysis-${info.project.name}.png`,
  })
})

test('dictionary failures allow retry without blocking article tools', async ({
  page,
}) => {
  let attempts = 0
  let allowDictionary = false
  await page.route('**/english-words*.txt*', async (route) => {
    if (route.request().resourceType() !== 'fetch') return route.continue()
    attempts++
    if (!allowDictionary)
      return route.fulfill({ status: 503, body: 'unavailable' })
    return route.continue()
  })
  await page.route('https://steam-api.anuluca.com/monkey-articles**', (route) =>
    route.fulfill({ json: { ...article, id: '', content: 'cat cat dog' } })
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  await page.getByRole('button', { name: 'START', exact: true }).click()
  const analysis = page.getByRole('region', { name: '文章分析' })
  await expect(analysis).toContainText('词表加载失败')
  await expect(page.getByRole('textbox', { name: '文章正文' })).toBeEditable()
  await expect(
    page.getByRole('button', { name: '保存至巴别图书馆', exact: true })
  ).toBeEnabled()
  const attemptsBeforeRetry = attempts
  allowDictionary = true
  await page.getByRole('button', { name: '重新加载词表', exact: true }).click()
  await expect(analysis).toContainText('本次生成了 2 个正常单词：')
  expect(attempts).toBe(attemptsBeforeRetry + 1)
})

test('highlights keep exact text and use the same full-word boundaries as analysis', () => {
  const content = 'Cat cat123 xcaty cat-name 漢cat <script>dog</script> CAT!'
  const segments = highlightEnglishWords(content, ['cat', 'dog'])
  expect(segments.map((segment) => segment.text).join('')).toBe(content)
  expect(
    segments
      .filter((segment) => segment.highlighted)
      .map((segment) => segment.text)
  ).toEqual(['Cat', 'dog', 'CAT'])
})

test('bookshelf image enters the library and shares the photo effects without moving the editor', async ({
  page,
}, info) => {
  await page.route('https://steam-api.anuluca.com/monkey-articles**', (route) =>
    route.fulfill({ json: { articles: [], nextCursor: null } })
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  const entry = page.getByRole('button', { name: '巴别图书馆', exact: true })
  await expect(page.locator('.library-button')).toHaveCount(0)
  await expect(page.locator('.babel-photo > img')).toHaveJSProperty(
    'naturalWidth',
    1127
  )
  await expect(entry).toHaveCSS('filter', 'brightness(0.65)')
  await expect(entry).toHaveCSS('border-width', '0px')
  const layout = await page.evaluate(() => {
    const monkey = document.querySelector<HTMLElement>('.typewriter-photo')!
    const book = document.querySelector<HTMLElement>('.babel-entrance')!
    const title = getComputedStyle(document.querySelector('.babel-title')!)
    return {
      overlaps:
        book.offsetLeft < monkey.offsetLeft &&
        book.offsetLeft + book.offsetWidth > monkey.offsetLeft,
      startCenterError: (() => {
        const button = document.querySelector<HTMLElement>('.start-button')!
        const style = getComputedStyle(button)
        const matrix = new DOMMatrix(style.transform)
        return Math.abs(
          button.offsetLeft +
            matrix.m41 +
            button.offsetWidth / 2 -
            book.parentElement!.clientWidth / 2
        )
      })(),
      overlap: book.offsetLeft + book.offsetWidth - monkey.offsetLeft,
      centerError: Math.abs(
        book.parentElement!.offsetLeft +
          new DOMMatrix(getComputedStyle(book.parentElement!).transform).m41 +
          (book.offsetLeft + monkey.offsetLeft + monkey.offsetWidth) / 2 -
          book.parentElement!.parentElement!.clientWidth / 2
      ),
      weight: title.fontWeight,
      width: book.offsetWidth,
      verticalScale: (() => {
        const matrix = new DOMMatrix(title.transform)
        return (
          (matrix.a * matrix.d - matrix.b * matrix.c) /
          Math.hypot(matrix.a, matrix.b)
        )
      })(),
      mask: getComputedStyle(document.querySelector('.babel-photo > img')!)
        .maskImage,
      shadow: getComputedStyle(document.querySelector('.babel-photo')!).filter,
      scanlines: getComputedStyle(
        document.querySelector('.babel-photo .photo-scanlines')!
      ).backgroundImage,
    }
  })
  expect(layout.overlaps).toBe(true)
  expect(layout.weight).toBe('900')
  expect(
    await page
      .locator('.babel-title')
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
  ).toBeCloseTo(layout.width * 0.15, 1)
  expect(
    await page
      .locator('.babel-title')
      .evaluate((el) => getComputedStyle(el).filter)
  ).toContain('drop-shadow')
  expect(
    await page
      .locator('.babel-title')
      .evaluate((el) => getComputedStyle(el).filter)
  ).toContain('brightness(1.45)')
  await expect(page.locator('.babel-title')).toHaveCSS(
    'color',
    'rgb(226, 52, 86)'
  )
  expect(
    await page
      .locator('.babel-title')
      .evaluate((el) => getComputedStyle(el).maskImage)
  ).toContain('repeating-linear-gradient')
  await expect(page.locator('.babel-title-canvas')).toBeVisible()
  if (info.project.name === 'mobile-chrome')
    expect(layout.width).toBeLessThanOrEqual(144)
  else expect(layout.width).toBe(240)
  expect(Math.abs(layout.overlap - layout.width * 0.375)).toBeLessThanOrEqual(1)
  expect(layout.startCenterError).toBeLessThanOrEqual(1)
  expect(layout.centerError).toBeLessThanOrEqual(1)
  expect(layout.verticalScale).toBeCloseTo(1, 4)
  expect(layout.mask).toContain('linear-gradient')
  expect(layout.shadow).toContain('drop-shadow')
  expect(layout.scanlines).toContain('repeating-linear-gradient')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.waitForTimeout(1100)
  await expect(page.locator('.babel-photo .photo-fuzzy-canvas')).toBeVisible()
  const frame = await page.locator('.photo-header').boundingBox()
  if (!info.project.name.includes('mobile')) {
    await entry.hover()
    await expect(entry).toHaveCSS('filter', 'brightness(1)')
    await expect(entry).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -5)')
    const after = await page.locator('.photo-header').boundingBox()
    expect(Math.abs(after!.y - frame!.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(after!.height - frame!.height)).toBeLessThanOrEqual(1)
  }
  await entry.click()
  await expect(
    page.locator('.babel-library-dialog .babel-library')
  ).toBeVisible()
  await page.locator('.babel-library-dialog .diamond-close-btn').click()
  await expect(page.locator('.babel-library-dialog')).toBeHidden()
  await expect(entry).toBeVisible()
  await entry.focus()
  await page.keyboard.press('Enter')
  await expect(
    page.locator('.babel-library-dialog .babel-library')
  ).toBeVisible()
})

test('intro hides the manuscript, centers enlarged photos and opens the workspace with the shared CRT animation', async ({
  page,
}) => {
  // 请求故意慢于 1280ms 的缩小动画，确认 busy 不会隐藏书架及文字。
  await page.route(
    'https://steam-api.anuluca.com/monkey-articles**',
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1800))
      await route.fulfill({ json: { ...article, id: '' } })
    }
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  await expect(page.locator('.lab-workspace')).toBeHidden()
  await expect(page.locator('.empty-manuscript')).toBeHidden()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.waitForTimeout(1100)
  const intro = await page.locator('.photo-composition').evaluate((element) => {
    const holder = element as HTMLElement
    const matrix = new DOMMatrix(getComputedStyle(holder).transform)
    return {
      scale: matrix.a,
      centerX: holder.offsetLeft + matrix.m41 + holder.offsetWidth / 2,
      centerY:
        holder.offsetTop +
        matrix.m42 +
        holder.offsetHeight / 2 +
        (matchMedia('(max-width: 768px)').matches ? 0 : 15 * matrix.d),
      headerWidth: holder.parentElement!.clientWidth,
      headerHeight: holder.parentElement!.clientHeight,
    }
  })
  const mobileFlow = test.info().project.name === 'mobile-chrome'
  expect(intro.scale).toBeCloseTo(mobileFlow ? 1 : 1.7, 2)
  expect(Math.abs(intro.centerX - intro.headerWidth / 2)).toBeLessThanOrEqual(1)
  expect(Math.abs(intro.centerY - intro.headerHeight / 2)).toBeLessThanOrEqual(
    1
  )
  await expect(page.locator('.babel-title-canvas')).toHaveCSS('opacity', '1')
  await page.evaluate(() => {
    ;(window as any).introFrames = []
    ;(window as any).bookFrames = []
    ;(window as any).crtOpened = false
    document
      .querySelector('.lab-workspace')!
      .addEventListener('animationstart', (event) => {
        if ((event as AnimationEvent).animationName === 'anutriumCrtOn')
          (window as any).crtOpened = true
      })
    const record = () => {
      const book = document.querySelector<HTMLElement>('.babel-entrance')!
      const title = document.querySelector<HTMLElement>('.babel-title-canvas')!
      const style = getComputedStyle(book)
      ;(window as any).bookFrames.push({
        shown: style.display !== 'none' && Number(style.opacity) > 0.99,
        width: book.getBoundingClientRect().width,
        titleShown: getComputedStyle(title).opacity === '1',
        disabled: (book as HTMLButtonElement).disabled,
      })
      ;(window as any).introFrames.push(
        new DOMMatrix(
          getComputedStyle(
            document.querySelector('.photo-composition')!
          ).transform
        ).a
      )
      ;(window as any).introFrame = requestAnimationFrame(record)
    }
    record()
  })
  await page.getByRole('button', { name: 'START', exact: true }).click()
  await expect(page.locator('.photo-header')).toHaveCSS(
    'flex-basis',
    test.info().project.name === 'mobile-chrome' ? '200px' : '270px'
  )
  await expect(page.locator('.lab-workspace')).not.toHaveClass(
    /crt-effect-enter-active/
  )
  await expect(page.locator('.lab-workspace')).toBeVisible()
  const motion = await page.evaluate(() => {
    cancelAnimationFrame((window as any).introFrame)
    return {
      frames: (window as any).introFrames as number[],
      crt: (window as any).crtOpened,
      books: (window as any).bookFrames as {
        shown: boolean
        width: number
        titleShown: boolean
        disabled: boolean
      }[],
    }
  })
  expect(motion.crt).toBe(true)
  expect(motion.books.length).toBeGreaterThan(10)
  expect(
    motion.books.every(
      (frame) => frame.shown && frame.titleShown && frame.width > 0
    )
  ).toBe(true)
  expect(motion.books.some((frame) => frame.disabled)).toBe(true)
  if (mobileFlow) {
    expect(motion.frames.every((scale) => Math.abs(scale - 1) < 0.01)).toBe(
      true
    )
    await expect(page.locator('.replica-content')).toHaveCSS(
      'transform',
      'none'
    )
  } else {
    const firstWidth = motion.books[0].width
    const lastWidth = motion.books[motion.books.length - 1].width
    expect(
      motion.books.some(
        (frame) => frame.width > lastWidth + 1 && frame.width < firstWidth - 1
      )
    ).toBe(true)
    expect(motion.frames.some((scale) => scale > 1.01 && scale < 1.69)).toBe(
      true
    )
    expect(motion.frames[motion.frames.length - 1]).toBeCloseTo(1, 2)
  }
  await expect(page.getByRole('textbox', { name: '文章标题' })).toHaveCSS(
    'text-align',
    'center'
  )
})

test('restart keeps the same button as SKIP and remembers skipping during a pending request', async ({
  page,
}) => {
  let requests = 0
  let release: (() => void) | undefined
  await page.route(
    'https://steam-api.anuluca.com/monkey-articles**',
    async (route) => {
      requests++
      if (requests === 2)
        await new Promise<void>((resolve) => {
          release = resolve
        })
      await route.fulfill({
        json: {
          ...article,
          id: '',
          content:
            requests === 1
              ? content
              : 'Second generated manuscript. '.repeat(100),
        },
      })
    }
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  await page.getByRole('button', { name: 'START', exact: true }).click()
  const restart = page.getByRole('button', { name: 'RESTART', exact: true })
  await expect(restart).toBeEnabled()
  const originalButton = await restart.elementHandle()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await restart.click()
  const skip = page.getByRole('button', { name: 'SKIP', exact: true })
  await expect(skip).toBeEnabled()
  expect(
    await originalButton!.evaluate(
      (element) => element === document.querySelector('.start-button')
    )
  ).toBe(true)
  await expect(page.locator('.skip-typing')).toHaveCount(0)
  await expect.poll(() => requests).toBe(2)
  await skip.click()
  release!()
  await expect(page.getByRole('textbox', { name: '文章正文' })).toHaveValue(
    'Second generated manuscript. '.repeat(100)
  )
  await expect(restart).toBeEnabled()
  expect(requests).toBe(2)
})

test('one click shares the full page composition with a centered monkey, no controls, and a decodable QR', async ({
  page,
}, info) => {
  const fullContent =
    'Xqzr CAT dog zqpvv. '.repeat(180) + '\n<unsafe>FULL_TEXT_TAIL_123</unsafe>'
  await page.addInitScript(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLImageElement.prototype,
      'src'
    )!
    Object.defineProperty(HTMLImageElement.prototype, 'src', {
      ...descriptor,
      set(value: string) {
        if (
          value.startsWith('data:image/svg+xml') &&
          value.includes('foreignObject')
        ) {
          const xml = new DOMParser().parseFromString(
            decodeURIComponent(value.slice(value.indexOf(',') + 1)),
            'image/svg+xml'
          )
          const content = xml.querySelector('foreignObject')!
          const host = document.querySelector<HTMLElement>(
            '[data-monkey-share-export]'
          )!
          const photo = host.querySelector<HTMLElement>(
            '[data-share-role="photo"]'
          )!
          const composition = photo.parentElement!.parentElement as HTMLElement
          const matrix = new DOMMatrix(getComputedStyle(composition).transform)
          ;(window as any).shareComposition = {
            text: content.textContent,
            buttons: content.querySelectorAll('button').length,
            images: content.querySelectorAll('img').length,
            titleRasterized: content
              .querySelector('[data-share-role="page-title"]')
              ?.getAttribute('style')
              ?.includes('data:image/png'),
            centerError: Math.abs(
              composition.offsetLeft +
                matrix.m41 +
                photo.offsetLeft +
                photo.offsetWidth / 2 -
                (composition.offsetParent as HTMLElement).clientWidth / 2
            ),
            photoNaturalWidth: (photo as HTMLImageElement).naturalWidth,
            alignment: (() => {
              const article = host.querySelector<HTMLElement>(
                '[data-share-role="article"]'
              )!
              const url = host.querySelector<HTMLElement>(
                '[data-share-role="url"]'
              )!
              const qr = host.querySelector<HTMLElement>(
                '[data-share-role="qr"]'
              )!
              const left = (element: HTMLElement) => {
                let value = 0
                for (
                  let node: HTMLElement | null = element;
                  node && node !== host;
                  node = node.offsetParent as HTMLElement | null
                )
                  value += node.offsetLeft
                return value
              }
              return {
                articleLeft: left(article),
                articleRight: left(article) + article.offsetWidth,
                brandLeft: left(
                  host.querySelector<HTMLElement>('[data-share-role="brand"]')!
                ),
                urlRight: left(url) + url.offsetWidth,
                qrLeft: left(qr),
                qrRight: left(qr) + qr.offsetWidth,
              }
            })(),
          }
        }
        descriptor.set!.call(this, value)
      },
    })
    Object.defineProperty(navigator.clipboard, 'write', {
      configurable: true,
      value: async (items: ClipboardItem[]) => {
        ;(window as any).clipboardActive = navigator.userActivation.isActive
        ;(window as any).pageShareFile = await items[0].getType('image/png')
      },
    })
    const click = HTMLAnchorElement.prototype.click
    HTMLAnchorElement.prototype.click = function () {
      if (this.download === 'monkey-manuscript.png') {
        void fetch(this.href)
          .then((response) => response.blob())
          .then((blob) => {
            ;(window as any).pageShareFile = blob
          })
      }
      click.call(this)
    }
  })
  await page.route('https://steam-api.anuluca.com/monkey-articles**', (route) =>
    route.fulfill({
      json: {
        ...article,
        id: '',
        title: 'Full article export',
        content: fullContent,
      },
    })
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  await page.getByRole('button', { name: 'START', exact: true }).click()
  const editor = page.getByRole('textbox', { name: '文章正文' })
  await expect(editor).toHaveValue(fullContent)
  await expect(page.locator('.analysis-reveal')).toHaveCSS('height', '84px')
  await expect(page.locator('.analysis-frame')).toHaveAttribute(
    'aria-busy',
    'false'
  )
  await editor.evaluate((el) => {
    el.scrollTop = 120
  })
  const before = await editor.evaluate((el) => ({
    top: el.scrollTop,
    width: el.clientWidth,
    height: el.clientHeight,
  }))
  await page.getByRole('button', { name: '分享', exact: true }).click()
  await expect(page.locator('.share-loading')).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => !!(window as any).pageShareFile), {
      timeout: 30000,
    })
    .toBe(true)
  const composition = await page.evaluate(
    () => (window as any).shareComposition
  )
  expect(composition.text).toContain(fullContent)
  expect(composition.text).toContain('Full article export')
  expect(composition.text).toContain('Anuluca.com/laboratory/monkey-typewriter')
  if (!info.project.name.includes('mobile'))
    expect(await page.evaluate(() => (window as any).clipboardActive)).toBe(
      true
    )
  await expect(page.locator('.share-loading')).toHaveCount(0)
  expect(composition.text).not.toContain('RESTART')
  expect(composition.text).not.toContain('保存至巴别图书馆')
  expect(composition.buttons).toBe(0)
  expect(composition.images).toBe(3)
  expect(composition.titleRasterized).toBe(true)
  expect(composition.text).toContain('Anutrium')
  expect(composition.text).toContain('DESIGNED & ENGINEERED BY ANULUCA.')
  expect(composition.photoNaturalWidth).toBe(1448)
  expect(composition.centerError).toBeLessThanOrEqual(1)
  expect(composition.alignment.articleLeft).toBe(70)
  expect(composition.alignment.brandLeft).toBe(
    composition.alignment.articleLeft
  )
  expect(composition.alignment.qrLeft - composition.alignment.urlRight).toBe(24)
  expect(composition.alignment.qrRight).toBe(composition.alignment.articleRight)
  const after = await editor.evaluate((el) => ({
    top: el.scrollTop,
    width: el.clientWidth,
    height: el.clientHeight,
  }))
  expect(after).toEqual(before)
  await expect(
    page.getByRole('button', { name: '巴别图书馆', exact: true })
  ).toBeVisible()
  await expect(page.locator('[data-monkey-share-export]')).toHaveCount(0)
  const bytes = await page.evaluate(async () =>
    Array.from(
      new Uint8Array(await (window as any).pageShareFile.arrayBuffer())
    )
  )
  const png = PNG.sync.read(Buffer.from(bytes))
  expect(png.width).toBe(1200)
  expect(png.height).toBeGreaterThan(1000)
  const size = 260
  const crop = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const pixel =
        ((png.height - size + y) * png.width + png.width - size + x) * 4
      crop.set(png.data.subarray(pixel, pixel + 4), (y * size + x) * 4)
    }
  expect(jsQR(crop, size, size)?.data).toBe(
    'https://anuluca.com/laboratory/monkey-typewriter'
  )
  writeFileSync(
    `test-results/monkey-page-share-${info.project.name}.png`,
    Buffer.from(bytes)
  )
})

test('clipboard denial reports an error and restores the share icon without claiming success', async ({
  page,
}, info) => {
  test.skip(
    info.project.name.includes('mobile'),
    'Mobile saves the file instead of using clipboard permission'
  )
  await page.addInitScript(() =>
    Object.defineProperty(navigator.clipboard, 'write', {
      configurable: true,
      value: async () => {
        throw new DOMException('Denied', 'NotAllowedError')
      },
    })
  )
  await page.route('https://steam-api.anuluca.com/monkey-articles**', (route) =>
    route.fulfill({ json: { ...article, id: '' } })
  )
  await page.goto(path)
  await expect(page.locator('.footer-bottom-gradient--ready')).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1600)
  await page.getByRole('button', { name: 'START', exact: true }).click()
  await page.getByRole('button', { name: '分享', exact: true }).click()
  await expect(page.locator('.el-message--error')).toContainText(
    '请允许剪贴板权限'
  )
  await expect(page.locator('.el-message--success')).toHaveCount(0)
  await expect(page.locator('.share-loading')).toHaveCount(0)
  await expect(page.locator('.share-button')).toHaveAttribute(
    'aria-busy',
    'false'
  )
})
