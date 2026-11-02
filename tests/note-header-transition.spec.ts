import { expect, test } from '@playwright/test'

const id = 'a12ee06a-a95f-4cbc-9b65-ff71bbca5371'

test('note header height changes continuously when compacting and expanding', async ({
  page,
}) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const body = `---\ntitle: "Corocoro宝可梦情报"\ndate: "2024-11-12"\ncategory: pokemon\n---\n\n${'正文内容，用于验证标题滚动过渡。\n\n'.repeat(
    60
  )}`
  await page.route('https://steam-api.anuluca.com/notes**', (route) =>
    new URL(route.request().url()).pathname.endsWith(id)
      ? route.fulfill({ contentType: 'text/markdown', body })
      : route.fulfill({
          json: {
            notes: [
              {
                id,
                title: 'Corocoro宝可梦情报',
                type: 'pokemon',
                time: '2024-11-12',
                path: `/atrium/notes?note=${id}`,
              },
            ],
            nextCursor: null,
          },
        })
  )
  await page.goto(`/atrium/notes?note=${id}`, { waitUntil: 'domcontentloaded' })
  const reader = page.locator('.note-reader')
  await expect(reader).toHaveAttribute('data-note-enter', 'ready', {
    timeout: 45000,
  })

  async function record(scrollTop: number) {
    return reader.evaluate(async (root, top) => {
      const header = root.querySelector<HTMLElement>('.note-reader__header')!
      const scroll = root.querySelector<HTMLElement>(
        '.note-reader__body-scroll'
      )!
      const frames: {
        time: number
        height: number
        rows: number
        scrollTop: number
      }[] = []
      const started = performance.now()
      let triggered = false
      await new Promise<void>((resolve) => {
        const sample = () => {
          const time = performance.now() - started
          frames.push({
            time,
            height: header.getBoundingClientRect().height,
            rows: getComputedStyle(header).gridTemplateRows.split(' ').length,
            scrollTop: scroll.scrollTop,
          })
          if (!triggered && time >= 80) {
            triggered = true
            scroll.scrollTop = top
          }
          if (time >= 700) resolve()
          else requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      })
      return frames
    }, scrollTop)
  }

  for (const top of [360, 0]) {
    const frames = await record(top)
    const first = frames[0].height,
      last = frames[frames.length - 1].height
    const distance = Math.abs(first - last)
    expect(distance).toBeGreaterThan(20)
    expect(frames.every((frame) => frame.rows === 4)).toBe(true)
    // 检查实际逐帧高度，而非仅检查 transition 声明，防止网格结构变化导致首帧跳变。
    expect(
      frames.filter(
        (frame) =>
          Math.abs(frame.height - first) > 2 &&
          Math.abs(frame.height - last) > 2
      ).length
    ).toBeGreaterThanOrEqual(3)
    const steps = frames
      .slice(1)
      .map((frame, index) => ({
        duration: frame.time - frames[index].time,
        change: Math.abs(frame.height - frames[index].height),
      }))
      .filter((step) => step.duration <= 40)
    expect(steps.length).toBeGreaterThanOrEqual(3)
    expect(
      Math.max(...steps.map((step) => step.change)) / distance
    ).toBeLessThan(0.4)
    const end = frames.slice(-3)
    expect(
      Math.max(...end.map((frame) => frame.height)) -
        Math.min(...end.map((frame) => frame.height))
    ).toBeLessThanOrEqual(1)
    await expect(reader).toHaveClass(top ? /is-header-compact/ : /note-reader/)
    if (!top) await expect(reader).not.toHaveClass(/is-header-compact/)
  }
})

test('wheel, touch and keyboard input wait for the header before scrolling content', async ({
  page,
  browserName,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const source = `---\ntitle: "Corocoro宝可梦情报"\ndate: "2024-11-12"\ncategory: pokemon\n---\n\n${'正文内容。\n\n'.repeat(
    100
  )}`
  await page.route('https://steam-api.anuluca.com/notes**', (route) =>
    new URL(route.request().url()).pathname.endsWith(id)
      ? route.fulfill({ contentType: 'text/markdown', body: source })
      : route.fulfill({
          json: {
            notes: [
              {
                id,
                title: 'Corocoro宝可梦情报',
                time: '2024-11-12',
                type: 'pokemon',
              },
            ],
            nextCursor: null,
          },
        })
  )
  await page.goto(`/atrium/notes?note=${id}`, { waitUntil: 'domcontentloaded' })
  const reader = page.locator('.note-reader'),
    scroll = reader.locator('.note-reader__body-scroll')
  await expect(reader).toHaveAttribute('data-note-enter', 'ready', {
    timeout: 45000,
  })

  async function startRecording() {
    await reader.evaluate((root) => {
      const header = root.querySelector<HTMLElement>('.note-reader__header')!,
        scroll = root.querySelector<HTMLElement>('.note-reader__body-scroll')!
      const samples: {
        time: number
        height: number
        top: number
        compact: boolean
      }[] = []
      ;(window as any).noteInputSamples = samples
      const start = performance.now()
      const sample = () => {
        samples.push({
          time: performance.now() - start,
          height: header.getBoundingClientRect().height,
          top: scroll.scrollTop,
          compact: root.classList.contains('is-header-compact'),
        })
        if (performance.now() - start < 1100) requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    })
  }
  async function assertOrdered() {
    await expect
      .poll(() => scroll.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(30)
    await page.waitForFunction(
      () => (window as any).noteInputSamples.at(-1)?.time >= 1050
    )
    const samples = await page.evaluate(
      () =>
        (window as any).noteInputSamples as {
          time: number
          height: number
          top: number
          compact: boolean
        }[]
    )
    const final = samples[samples.length - 1].height
    const shrinking = samples.filter(
      (sample) => sample.compact && sample.height > final + 1
    )
    expect(shrinking.length).toBeGreaterThanOrEqual(3)
    expect(
      Math.max(...shrinking.map((sample) => sample.top))
    ).toBeLessThanOrEqual(1)
    const moving = samples.find((sample) => sample.top > 1)!
    expect(Math.abs(moving.height - final)).toBeLessThanOrEqual(1)
    expect(
      samples
        .filter((sample) => sample.top > 4)
        .every((sample) => sample.compact)
    ).toBe(true)
  }
  const mobileWebkit =
    browserName === 'webkit' && info.project.name.includes('mobile')
  async function wheel(deltaY: number) {
    if (mobileWebkit)
      await scroll.dispatchEvent('wheel', {
        deltaY,
        deltaX: 0,
        deltaMode: 0,
        bubbles: true,
        cancelable: true,
      })
    else await page.mouse.wheel(0, deltaY)
  }
  async function reset() {
    await scroll.hover()
    if (mobileWebkit)
      await scroll.evaluate((el) => el.scrollTo({ top: 0, behavior: 'auto' }))
    else await page.mouse.wheel(0, -2000)
    await expect(reader).not.toHaveClass(/is-header-compact/)
    await expect
      .poll(() =>
        reader.evaluate((root) => {
          const header = root
              .querySelector('.note-reader__header')!
              .getBoundingClientRect(),
            content = root
              .querySelector('.note-reader__heading')!
              .getBoundingClientRect()
          return Math.abs(header.height - content.height * 2)
        })
      )
      .toBeLessThanOrEqual(1)
  }

  await scroll.hover()
  await startRecording()
  await wheel(200)
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  )
  await wheel(160)
  await assertOrdered()
  await reset()

  await scroll.click({ position: { x: 10, y: 10 } })
  await startRecording()
  await page.keyboard.press('PageDown')
  await assertOrdered()
  await reset()

  if (info.project.name.includes('mobile')) {
    const box = (await scroll.boundingBox())!,
      x = box.x + box.width / 2,
      y = box.y + Math.min(box.height - 20, 180)
    const session =
      browserName === 'chromium'
        ? await page.context().newCDPSession(page)
        : null
    const send = async (
      type: 'touchStart' | 'touchMove' | 'touchEnd',
      position: number
    ) => {
      if (session)
        await session.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: type === 'touchEnd' ? [] : [{ x, y: position }],
        })
      else
        await scroll.evaluate(
          (el, { type, x, y }) => {
            // WebKit 驱动不提供触摸注入；覆盖同一 DOM 事件路径，Chromium 上使用真实触摸输入。
            const event = new Event(type.toLowerCase(), {
              bubbles: true,
              cancelable: true,
            })
            Object.defineProperty(event, 'touches', {
              value:
                type === 'touchEnd'
                  ? []
                  : [{ identifier: 1, target: el, clientX: x, clientY: y }],
            })
            el.dispatchEvent(event)
          },
          { type, x, y: position }
        )
    }
    await startRecording()
    await send('touchStart', y)
    for (let step = 1; step <= 14; step++) {
      await send('touchMove', y - step * 10)
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          )
      )
    }
    await send('touchEnd', y - 140)
    await assertOrdered()
    await session?.detach()
  }
})

test('pulling down at the top restores the header even without a scroll event', async ({
  page,
  browserName,
}, info) => {
  test.setTimeout(90000)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const source =
    '---\ntitle: "Corocoro宝可梦情报"\ndate: "2024-11-12"\ncategory: pokemon\n---\n\n只有一段正文，不产生正文滚动。'
  await page.route('https://steam-api.anuluca.com/notes**', (route) =>
    new URL(route.request().url()).pathname.endsWith(id)
      ? route.fulfill({ contentType: 'text/markdown', body: source })
      : route.fulfill({
          json: {
            notes: [
              {
                id,
                title: 'Corocoro宝可梦情报',
                time: '2024-11-12',
                type: 'pokemon',
              },
            ],
            nextCursor: null,
          },
        })
  )
  await page.goto(`/atrium/notes?note=${id}`, { waitUntil: 'domcontentloaded' })
  const reader = page.locator('.note-reader'),
    scroll = reader.locator('.note-reader__body-scroll')
  await expect(reader).toHaveAttribute('data-note-enter', 'ready', {
    timeout: 45000,
  })
  const mobile = info.project.name.includes('mobile')
  async function wheel(deltaY: number) {
    await scroll.hover()
    if (browserName === 'webkit' && mobile)
      await scroll.dispatchEvent('wheel', {
        deltaY,
        deltaX: 0,
        deltaMode: 0,
        bubbles: true,
        cancelable: true,
      })
    else await page.mouse.wheel(0, deltaY)
  }
  async function settled(compact: boolean) {
    if (compact) await expect(reader).toHaveClass(/is-header-compact/)
    else await expect(reader).not.toHaveClass(/is-header-compact/)
    await expect
      .poll(() =>
        reader.evaluate(
          (root, ratio) => {
            const header = root
                .querySelector('.note-reader__header')!
                .getBoundingClientRect(),
              content = root
                .querySelector('.note-reader__heading')!
                .getBoundingClientRect()
            return Math.abs(header.height - content.height * ratio)
          },
          compact ? 1 : 2
        )
      )
      .toBeLessThanOrEqual(1)
    expect(await scroll.evaluate((el) => el.scrollTop)).toBe(0)
  }
  await wheel(120)
  await settled(true)
  await wheel(-80)
  await settled(false)
  await wheel(-80)
  await settled(false)

  await wheel(120)
  await settled(true)
  await scroll.click({ position: { x: 10, y: 10 } })
  await page.keyboard.press('ArrowUp')
  await settled(false)

  // 过渡中反向输入也要取消暂存位移，不能随后重新收起。
  await wheel(120)
  await wheel(-120)
  await settled(false)

  if (mobile) {
    await wheel(120)
    await settled(true)
    const box = (await scroll.boundingBox())!,
      x = box.x + box.width / 2,
      y = box.y + 40
    const session =
      browserName === 'chromium'
        ? await page.context().newCDPSession(page)
        : null
    const send = async (
      type: 'touchStart' | 'touchMove' | 'touchEnd',
      position: number
    ) => {
      if (session)
        await session.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: type === 'touchEnd' ? [] : [{ x, y: position }],
        })
      else
        await scroll.evaluate(
          (el, { type, x, y }) => {
            const event = new Event(type.toLowerCase(), {
              bubbles: true,
              cancelable: true,
            })
            Object.defineProperty(event, 'touches', {
              value:
                type === 'touchEnd'
                  ? []
                  : [{ identifier: 1, target: el, clientX: x, clientY: y }],
            })
            el.dispatchEvent(event)
          },
          { type, x, y: position }
        )
    }
    await send('touchStart', y)
    await send('touchMove', y + 35)
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        )
    )
    await send('touchMove', y + 70)
    await send('touchEnd', y + 70)
    await settled(false)
    await session?.detach()
  }
})
