import { expect, test } from '@playwright/test'

test('album rebuilds share keyframes and background suspension preserves animation instances', async ({
  page,
}) => {
  await page.route('http://localhost:3000/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body></body></html>',
    })
  )
  await page.route('https://assets.anuluca.com/audit-surfer-**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#e23456"/></svg>',
    })
  )
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { createApp, h, nextTick, ref } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { default: Strip } = await import(
      '/src/views/Home/components/FloraAlbumStrip.vue'
    )
    const { decorationActivityKey } = await import(
      '/src/composables/useDecorationActivity.ts'
    )
    const { default: i18n } = await import('/src/locales/index.ts')
    const root = document.createElement('div')
    root.style.cssText = 'width:min(440px,90vw);height:220px'
    document.body.append(root)
    const permitted = ref(true)
    const frames = new Set<Keyframe[] | PropertyIndexedKeyframes>()
    const originalAnimate = Element.prototype.animate
    let creations = 0
    Element.prototype.animate = function (keyframes, options) {
      if (this.classList.contains('flora-album-strip__position')) {
        creations++
        frames.add(keyframes!)
      }
      return originalAnimate.call(this, keyframes, options)
    }
    const app = createApp({
      render: () =>
        h(Strip, {
          title: '测试相册',
          items: Array.from({ length: 10 }, (_, index) => ({
            key: String(index),
            type: 'image',
            url: `https://assets.anuluca.com/audit-surfer-${index}.webp`,
          })),
        }),
    })
      .use(i18n)
      .provide(decorationActivityKey, permitted)
    try {
      app.mount(root)
      for (let attempt = 0; attempt < 200; attempt++) {
        if (root.querySelector('.is-running')) break
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
      // 等待首次 ResizeObserver 的 100ms 防抖重建完成，再验证休眠本身不重建动画。
      await new Promise((resolve) => setTimeout(resolve, 200))
      const positions = [
        ...root.querySelectorAll('.flora-album-strip__position'),
      ]
      const animations = positions.map((el) => el.getAnimations()[0])
      if (!animations.every((animation) => animation?.playState === 'running'))
        throw new Error('Album did not start')
      permitted.value = false
      await nextTick()
      await Promise.all(animations.map((animation) => animation.ready))
      const paused = animations.every(
        (animation) => animation.playState === 'paused'
      )
      const pausedTimes = animations.map((animation) =>
        Number(animation.currentTime)
      )
      await new Promise((resolve) => setTimeout(resolve, 120))
      const stationary = animations.every(
        (animation, index) =>
          Number(animation.currentTime) === pausedTimes[index]
      )
      permitted.value = true
      await nextTick()
      return {
        keyframeArraysPerRebuild: frames.size / (creations / 10),
        paused,
        stationary,
        resumed: animations.every(
          (animation) => animation.playState === 'running'
        ),
        reused: positions.every(
          (el, index) => el.getAnimations()[0] === animations[index]
        ),
      }
    } finally {
      app.unmount()
      Element.prototype.animate = originalAnimate
      root.remove()
    }
  })
  expect(result).toEqual({
    keyframeArraysPerRebuild: 1,
    paused: true,
    stationary: true,
    resumed: true,
    reused: true,
  })
})
