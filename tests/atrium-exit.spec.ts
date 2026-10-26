import { expect, test } from './helpers/sceneDiagnostics'

test('Atrium closes cards in sequence without replaying the zodiac entrance', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  await page.routeWebSocket('ws://localhost:3000/**', (socket) =>
    socket.close()
  )
  const shaderErrors: string[] = []
  page.on('console', (message) => {
    if (/THREE.WebGLProgram|VALIDATE_STATUS/.test(message.text()))
      shaderErrors.push(message.text())
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/atrium', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.island-focus')).toBeVisible({ timeout: 45000 })
  await expect(page.locator('.temple-stage')).toHaveAttribute(
    'data-entrance-finished',
    'true'
  )
  await expect(page.locator('.star-container')).toHaveClass(/is-entry-ready/)
  await page.screenshot({
    path: `/tmp/atrium-lower-fade-${info.project.name}.png`,
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  // 媒体查询恢复会启动 CSS 动画，先等待这一次样式切换，探针只记录实际退出。
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  )
  await page.evaluate(async () => {
    const animations = document
      .querySelector('.star-container')!
      .getAnimations({ subtree: true })
    await Promise.all(
      animations
        .filter(
          (animation) =>
            animation instanceof CSSAnimation &&
            /^zodiac-.*enter/.test(animation.animationName)
        )
        .map((animation) => animation.finished.catch(() => undefined))
    )
  })
  await page.evaluate(() => {
    const wheel = document.querySelector('.zodiac-html-wheel')!
    const probe = {
      wheel,
      entries: [] as string[],
      overlapsReturn: false,
      closing: [] as { id: string | null; animation: string; delay: string }[],
    }
    ;(window as any).atriumExitProbe = probe
    const cards = document.querySelector('.island-focus')!
    const observer = new MutationObserver(() => {
      if ((cards as HTMLElement).dataset.overviewLeaving !== 'true') return
      probe.closing = Array.from(
        cards.querySelectorAll('.island-panels .island-item'),
        (element) => ({
          id: element.getAttribute('data-flash-item'),
          animation: getComputedStyle(element).animationName,
          delay: getComputedStyle(element).animationDelay,
        })
      )
      observer.disconnect()
    })
    observer.observe(cards, {
      attributes: true,
      attributeFilter: ['data-overview-leaving'],
    })
    const sampleReturn = () => {
      if (!cards.isConnected) return
      if (
        document.querySelector<HTMLElement>('.temple-page')?.dataset
          .selected === 'none'
      )
        probe.overlapsReturn = true
      requestAnimationFrame(sampleReturn)
    }
    requestAnimationFrame(sampleReturn)
    document.addEventListener(
      'animationstart',
      (event) => {
        const animation = event as AnimationEvent
        if (/^zodiac-.*enter/.test(animation.animationName))
          (window as any).atriumExitProbe.entries.push(animation.animationName)
      },
      true
    )
  })
  await page.locator('.temple-stage canvas').focus()
  await page.keyboard.press('Escape')
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).atriumExitProbe.closing.length)
    )
    .toBe(4)
  const closing = await page.evaluate(
    () => (window as any).atriumExitProbe.closing
  )
  expect(closing).toEqual([
    { id: 'LABORATORY', animation: 'anutriumCrtOff', delay: '0.24s' },
    { id: 'NOTES', animation: 'anutriumCrtOff', delay: '0.72s' },
    { id: 'GAME LIBRARY', animation: 'anutriumCrtOff', delay: '0.56s' },
    { id: 'COLLECTIBLES', animation: 'anutriumCrtOff', delay: '0.4s' },
  ])
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-selected',
    'none',
    { timeout: 15000 }
  )
  await expect(page.locator('.temple-page')).toHaveAttribute(
    'data-settled',
    'true',
    { timeout: 15000 }
  )
  expect(
    await page.evaluate(() => ({
      sameWheel:
        (window as any).atriumExitProbe.wheel ===
        document.querySelector('.zodiac-html-wheel'),
      entries: (window as any).atriumExitProbe.entries,
      overlapsReturn: (window as any).atriumExitProbe.overlapsReturn,
    }))
  ).toEqual({ sameWheel: true, entries: [], overlapsReturn: true })
  expect(shaderErrors).toEqual([])
})
