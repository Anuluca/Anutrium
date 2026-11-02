import { expect, type Page, test } from '@playwright/test'

const mountSection = async (
  page: Page,
  reveal = false,
  offscreen = false,
  fadeOnly = false
) => {
  await page.route('http://localhost:3000/section-entry-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<meta name="viewport" content="width=device-width, initial-scale=1"><main id="fixture"></main>',
    })
  )
  await page.goto('/section-entry-test')
  return page.evaluate(
    async ({ reveal, offscreen, fadeOnly }) => {
      const { createApp, h, provide, ref } = await import(
        '/node_modules/.vite/deps/vue.js'
      )
      const { default: Sections } = await import(
        '/src/components/Sections/index.vue'
      )
      const { default: i18n } = await import('/src/locales/index.ts')
      const { sectionFadeOnlyKey } = await import(
        '/src/composables/useSectionBodyReveal.ts'
      )
      const size = ref(120)
      if (offscreen)
        document.querySelector<HTMLElement>('#fixture')!.style.paddingTop =
          '1800px'
      // 测试场景分别挂载独立根组件，不作为生产组件文件拆分。
      // eslint-disable-next-line vue/one-component-per-file
      const app = createApp({
        setup() {
          provide(sectionFadeOnlyKey, ref(fadeOnly))
        },
        render: () =>
          h(
            Sections,
            {
              sectionNumber: 1,
              title: '正文入场',
              navigation: false,
              reveal,
              style: { minHeight: '0' },
            },
            {
              default: () =>
                h('div', { style: { height: `${size.value}px` } }, '内容'),
            }
          ),
      })
      app.use(i18n).mount('#fixture')
      ;(window as any).sectionFixture = { app, size }
      const content = document.querySelector('.home-section-content')!
      return {
        animations: content.getAnimations().length,
        height: content.getBoundingClientRect().height,
      }
    },
    { reveal, offscreen, fadeOnly }
  )
}

test('bilingual heading fades without moving its English subtitle', async ({
  page,
}) => {
  await page.route('http://localhost:3000/section-heading-test', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<div id="fixture"></div>',
    })
  )
  await page.goto('/section-heading-test')
  await page.evaluate(async () => {
    const { createApp, h, ref } = await import(
      '/node_modules/.vite/deps/vue.js'
    )
    const { default: Sections } = await import(
      '/src/components/Sections/index.vue'
    )
    const { default: i18n } = await import('/src/locales/index.ts')
    i18n.global.locale.value = 'zhCn'
    const bilingual = ref(false)
    // eslint-disable-next-line vue/one-component-per-file
    createApp({
      render: () =>
        h(Sections, {
          sectionNumber: 1,
          title: '中文标题',
          titleEn: 'ENGLISH',
          showEnglishTitle: bilingual.value || undefined,
          navigation: false,
          reveal: false,
        }),
    })
      .use(i18n)
      .mount('#fixture')
    ;(window as any).bilingual = bilingual
  })
  const title = page.locator('.home-section-title__text')
  await expect(page.locator('.home-section-rail__num')).toHaveText('#1')
  await expect(page.locator('.home-section-title__en')).toHaveCount(0)
  await expect(title).toHaveCSS('mask-image', 'none')
  const singleLineSize = await title.evaluate((element) => ({
    title: element.getBoundingClientRect().height,
    row: element.closest('.home-section-title-row')!.getBoundingClientRect()
      .height,
  }))
  expect(singleLineSize.title).toBeGreaterThan(0)
  await page.evaluate(() => ((window as any).bilingual.value = true))
  await expect(page.locator('.home-section-title__en')).toBeVisible()
  const result = await title.evaluate((element) => {
    const heading = element.parentElement!
    const subtitle = heading.querySelector('.home-section-title__en')!
    const before = subtitle.getBoundingClientRect().top
    const transform = getComputedStyle(element).transform
    const mask = getComputedStyle(element).maskImage
    heading.classList.remove('home-section-title--bilingual')
    const after = subtitle.getBoundingClientRect().top
    heading.classList.add('home-section-title--bilingual')
    return { before, after, transform, mask }
  })
  expect(result.transform).toMatch(/^matrix\(0\.92/)
  expect(result.mask).toContain('linear-gradient')
  await page.evaluate(() => ((window as any).bilingual.value = false))
  await expect(page.locator('.home-section-title__en')).toHaveCount(0)
  await expect(title).toHaveCSS('transform', 'matrix(0.92, 0, 0, 1, 0, 0)')
  await expect(title).toHaveCSS('mask-image', 'none')
})

test('section body expands, retargets async content and releases its height afterwards', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const initial = await mountSection(page)
  expect(initial.animations).toBe(1)
  expect(initial.height).toBeLessThan(5)
  const samples = await page.evaluate(async () => {
    const content = document.querySelector<HTMLElement>(
      '.home-section-content'
    )!
    const values: number[] = []
    const start = performance.now()
    setTimeout(() => {
      ;(window as any).sectionFixture.size.value = 360
    }, 220)
    await new Promise<void>((resolve) => {
      const sample = () => {
        values.push(content.getBoundingClientRect().height)
        if (performance.now() - start < 1400) requestAnimationFrame(sample)
        else resolve()
      }
      requestAnimationFrame(sample)
    })
    return {
      values,
      height: content.style.height,
      overflow: content.style.overflow,
    }
  })
  expect(
    samples.values.filter((height) => height > 1 && height < 350).length
  ).toBeGreaterThan(5)
  expect(samples.values.at(-1)).toBeCloseTo(360, 0)
  expect(samples.height).toBe('')
  expect(samples.overflow).toBe('')
  await page.evaluate(() => {
    ;(window as any).sectionFixture.size.value = 500
  })
  await expect(page.locator('.home-section-content')).toHaveCSS(
    'height',
    '500px'
  )
  expect(
    await page
      .locator('.home-section-content')
      .evaluate((element) => element.getAnimations().length)
  ).toBe(0)
})

test('scroll reveal starts body expansion only when the section enters the viewport', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const initial = await mountSection(page, true, true)
  expect(initial.animations).toBe(0)
  await page.locator('.home-section-title').scrollIntoViewIfNeeded()
  await expect
    .poll(() =>
      page
        .locator('.home-section-content')
        .evaluate((element) =>
          element
            .getAnimations()
            .some((animation) => animation.playState === 'running')
        )
    )
    .toBe(true)
  await expect
    .poll(() =>
      page
        .locator('.home-section-content')
        .evaluate((element) => element.getAnimations().length)
    )
    .toBe(0)
  await expect(page.locator('.home-section-content')).toHaveCSS(
    'height',
    '120px'
  )
})

test('reduced motion displays the full body immediately', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const initial = await mountSection(page)
  expect(initial.animations).toBe(0)
  await expect(page.locator('.home-section-content')).toHaveCSS(
    'height',
    '120px'
  )
})

test('positioned entry keeps full body height and animates only opacity', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const initial = await mountSection(page, false, false, true)
  expect(initial.height).toBeCloseTo(120, 0)
  const frames = await page
    .locator('.home-section-content')
    .evaluate((element) =>
      element
        .getAnimations()
        .flatMap((animation) =>
          (animation.effect as KeyframeEffect).getKeyframes()
        )
    )
  expect(frames.some((frame) => 'opacity' in frame)).toBe(true)
  expect(frames.some((frame) => 'height' in frame)).toBe(false)
  await page.evaluate(() => {
    ;(window as any).sectionFixture.size.value = 360
  })
  await expect(page.locator('.home-section-content')).toHaveCSS(
    'height',
    '360px'
  )
})
