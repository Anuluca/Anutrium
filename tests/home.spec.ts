import { expect, type Page, test } from '@playwright/test'

const PAGE_LOAD_TIMEOUT = 20_000
const ISLAND_EXIT_MAX_GEOMETRY_SHIFT = 1

interface IslandExitGeometrySample {
  bodyClass: string
  pageLeft: number
  pageTop: number
  routerLeft: number
  routerTop: number
}

interface IslandExitGeometryProbe {
  done: boolean
  initial: IslandExitGeometrySample
  samples: IslandExitGeometrySample[]
}

const readHeroExitMotion = (page: Page) =>
  page.locator('.hero-content').evaluate((heroContent) => {
    const readMotion = (selector: string) => {
      const element = heroContent.querySelector<HTMLElement>(selector)!
      return {
        x: Number.parseFloat(element.style.getPropertyValue('--hero-exit-x')),
        scale: Number.parseFloat(
          element.style.getPropertyValue('--hero-exit-scale')
        ),
        opacity: Number.parseFloat(
          element.style.getPropertyValue('--hero-exit-opacity')
        ),
      }
    }

    return {
      slogan: readMotion('.main-slogan'),
      carousel: readMotion('.recommend'),
    }
  })

const pageRoutes = [
  { path: '/', selector: '.home-page', title: /HOME|Anutrium/ },
  { path: '/archive', selector: '.archives-page', title: /ARCHIVE|作品集/ },
  { path: '/flanerie', selector: '.flanerie-page', title: /FLÂNERIE|旅程/ },
  { path: '/craft', selector: '.craft-page', title: /CRAFT|工具/ },
  { path: '/about', selector: '.about-page', title: /ABOUT|关于/ },
  {
    path: '/test',
    selector: '.island-page, .island-mobile-page',
    title: /ISLAND|个人海湾/,
  },
  {
    path: '/island/photography',
    selector: '.photography-page',
    title: /PHOTOGRAPHY|摄影作品/,
  },
  {
    path: '/island/merch-photography',
    selector: '.merch-page',
    title: /MERCH PHOTOGRAPHY|周边摄影/,
  },
  {
    path: '/island/illustration',
    selector: '.works-gallery-page',
    title: /ILLUSTRATION|绘画/,
  },
  {
    path: '/island/trainer-card',
    selector: '.works-gallery-page',
    title: /TRAINER CARD|训练家卡/,
  },
  {
    path: '/island/study-notes',
    selector: '.study-notes-page',
    title: /STUDY NOTES|学习笔记/,
  },
]

test.describe('top-level pages', () => {
  for (const route of pageRoutes) {
    test(`${route.path} renders page content`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })

      await expect(page.locator(route.selector).first()).toBeVisible({
        timeout: PAGE_LOAD_TIMEOUT,
      })
      await expect(page).toHaveTitle(route.title, {
        timeout: PAGE_LOAD_TIMEOUT,
      })
      await expect(page.locator('.not-found-page')).toHaveCount(0)
    })
  }
})

test('page hero title stays fixed and collapses upward without resizing text', async ({
  page,
}) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page.waitForTimeout(800)

  const titleViewport = page.locator('.page-hero-title__clip')
  const readTitleMetrics = () =>
    titleViewport.evaluate((viewport) => {
      const bounds = viewport.getBoundingClientRect()
      const heading = viewport.querySelector('h1')!
      const text = viewport.querySelector('.page-hero-title__text')!

      return {
        bottom: bounds.bottom,
        fontSize: getComputedStyle(heading).fontSize,
        height: bounds.height,
        overflow: getComputedStyle(viewport).overflow,
        textTransform: getComputedStyle(text).transform,
        top: bounds.top,
      }
    })

  const initial = await readTitleMetrics()
  expect(initial.height).toBeGreaterThan(20)
  expect(initial.overflow).toBe('hidden')

  await page.mouse.wheel(0, 100)
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          Math.max(
            window.scrollY,
            document.scrollingElement?.scrollTop || 0,
            document.documentElement.scrollTop,
            document.body.scrollTop
          )
        ),
      { timeout: 3_000 }
    )
    .toBeGreaterThan(20)
  await expect
    .poll(async () => (await readTitleMetrics()).height, { timeout: 3_000 })
    .toBeLessThan(initial.height - 5)

  const collapsed = await readTitleMetrics()
  expect(Math.abs(collapsed.top - initial.top)).toBeLessThanOrEqual(1)
  expect(collapsed.bottom).toBeLessThan(initial.bottom - 5)
  expect(collapsed.fontSize).toBe(initial.fontSize)
  expect(collapsed.textTransform).toBe(initial.textTransform)
})

test('page hero title stages a random direction before animating', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const animatedCharacterIndex = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const title = document.querySelector('.page-hero-title')
        if (!title) {
          resolve(-1)
          return
        }

        let preparedCharacter: Element | null = null

        const observer = new MutationObserver((records) => {
          records.forEach((record) => {
            const character = record.target as Element
            const previousDirection =
              record.oldValue?.match(/is-moving-\w+/)?.[0]
            const currentDirection =
              character.className.match(/is-moving-\w+/)?.[0]

            if (
              previousDirection !== currentDirection &&
              !character.classList.contains('is-animating')
            ) {
              preparedCharacter = character
              return
            }

            if (
              preparedCharacter !== character ||
              !character.classList.contains('is-animating')
            ) {
              return
            }

            window.clearTimeout(timeoutId)
            observer.disconnect()
            resolve(
              Array.from(
                title.querySelectorAll('.page-hero-title__char')
              ).indexOf(character)
            )
          })
        })
        const timeoutId = window.setTimeout(() => {
          observer.disconnect()
          resolve(-1)
        }, 7_000)

        observer.observe(title, {
          attributeFilter: ['class'],
          attributeOldValue: true,
          attributes: true,
          subtree: true,
        })
      })
  )

  expect(animatedCharacterIndex).toBeGreaterThanOrEqual(0)
})

test('page hero title only highlights the hovered character', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })

  const title = page.locator('.page-hero-title')
  const characters = title.locator('.page-hero-title__char')
  await expect(title).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await characters.first().hover()

  const characterFilters = await characters.evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).filter)
  )
  expect(characterFilters[0]).not.toBe('none')
  expect(characterFilters[1]).toBe('none')
})

test('page hero title stays fixed while switching between title pages', async ({
  page,
}, testInfo) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page.evaluate(() => {
    const initialTitle = document.querySelector('.page-hero-title__clip')
    const probe = {
      done: false,
      initialTop: initialTitle?.getBoundingClientRect().top || 0,
      samples: [] as number[],
      startedAt: null as number | null,
    }
    ;(
      window as typeof window & {
        __pageHeroTitleTransitionProbe?: typeof probe
      }
    ).__pageHeroTitleTransitionProbe = probe

    const sampleTitlePosition = () => {
      if (location.pathname !== '/craft') {
        requestAnimationFrame(sampleTitlePosition)
        return
      }

      probe.startedAt ??= performance.now()
      const clips = Array.from(
        document.querySelectorAll('.page-hero-title__clip')
      )
      const visibleClip = clips
        .map((clip) => ({
          clip,
          top: clip.getBoundingClientRect().top,
        }))
        .sort(
          (first, second) =>
            Math.abs(first.top - probe.initialTop) -
            Math.abs(second.top - probe.initialTop)
        )[0]
      if (visibleClip) probe.samples.push(visibleClip.top)

      if (performance.now() - probe.startedAt < 1_200) {
        requestAnimationFrame(sampleTitlePosition)
      } else {
        probe.done = true
      }
    }

    requestAnimationFrame(sampleTitlePosition)
  })

  if (testInfo.project.name.includes('mobile')) {
    await page.locator('.mobile-menu-icon').click()
    await page.locator('.mobile-menu-items a[href="/craft"]').click()
  } else {
    await page.locator('.menu-box a[href="/craft"]').click()
  }

  await expect(page.locator('.craft-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.archives-page')).toHaveCount(0)
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (
              window as typeof window & {
                __pageHeroTitleTransitionProbe?: { done: boolean }
              }
            ).__pageHeroTitleTransitionProbe?.done || false
        ),
      { timeout: 3_000 }
    )
    .toBe(true)

  const titleLayout = await page.evaluate(() => {
    const placeholder = document.querySelector('.craft-page .page-hero-title')!
    const viewport = placeholder.querySelector('.page-hero-title__clip')!
    const placeholderBounds = placeholder.getBoundingClientRect()
    const viewportBounds = viewport.getBoundingClientRect()
    const samples =
      (
        window as typeof window & {
          __pageHeroTitleTransitionProbe?: { samples: number[] }
        }
      ).__pageHeroTitleTransitionProbe?.samples || []

    return {
      height: viewportBounds.height,
      positionRange: Math.max(...samples) - Math.min(...samples),
      sampleCount: samples.length,
      topDelta: Math.abs(viewportBounds.top - placeholderBounds.top),
    }
  })
  expect(titleLayout.height).toBeGreaterThan(20)
  expect(titleLayout.sampleCount).toBeGreaterThan(5)
  expect(titleLayout.positionRange).toBeLessThanOrEqual(1)
  expect(titleLayout.topDelta).toBeLessThanOrEqual(1)
})

test('home entry animation does not remount hydrated content', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const homePage = page.locator('.home-page')
  await expect(homePage).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

  await homePage.evaluate((element) => {
    element.setAttribute('data-mount-probe', 'stable')
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await expect(homePage).toHaveAttribute('data-mount-probe', 'stable')
})

test('home keeps the marquee fixed to the viewport outside the hero', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const hero = page.locator('.hero-section')
  await expect(
    hero.locator(':scope > .hero-content > .marquee-showcase')
  ).toHaveCount(0)
  await expect(
    page.locator('.home-page > .home-marquee-fixed-layer > .marquee-showcase')
  ).toHaveCount(1)
  await expect(
    page.locator(
      '.home-scroll-scene, .home-scroll-sticky, .home-content-slider, .home-marquee-section'
    )
  ).toHaveCount(0)
  await expect(page.locator('#page-footer-portal > .bottom-text')).toHaveCount(
    1
  )
  await expect(
    page.locator('#page-footer-portal > .bottom-text')
  ).toHaveAttribute('aria-hidden', 'true')

  const geometry = await hero.evaluate((element) => {
    const heroBounds = element.getBoundingClientRect()
    const heroContentBounds = element
      .querySelector<HTMLElement>('.hero-content')!
      .getBoundingClientRect()
    const homeBounds = element.parentElement!.getBoundingClientRect()
    const marqueeLayer = document.querySelector<HTMLElement>(
      '.home-marquee-fixed-layer'
    )!
    const marqueeBounds = marqueeLayer.getBoundingClientRect()
    return {
      documentScrollHeight: document.documentElement.scrollHeight,
      heroBottom: heroBounds.bottom,
      heroContentBottom: heroContentBounds.bottom,
      heroContentCenter: heroContentBounds.top + heroContentBounds.height / 2,
      heroHeight: heroBounds.height,
      heroTop: heroBounds.top,
      homeBottom: homeBounds.bottom,
      homeHeight: homeBounds.height,
      homeTop: homeBounds.top,
      marqueeBottom: marqueeBounds.bottom,
      marqueePosition: getComputedStyle(marqueeLayer).position,
      marqueeTop: marqueeBounds.top,
      viewportHeight: window.innerHeight,
    }
  })
  expect(Math.abs(geometry.homeTop)).toBeLessThanOrEqual(1)
  expect(Math.abs(geometry.heroTop)).toBeLessThanOrEqual(1)
  expect(
    Math.abs(geometry.homeHeight - geometry.viewportHeight)
  ).toBeLessThanOrEqual(1)
  expect(geometry.marqueePosition).toBe('fixed')
  expect(
    Math.abs(geometry.heroHeight - geometry.viewportHeight)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(geometry.homeBottom - geometry.viewportHeight)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(geometry.heroBottom - geometry.viewportHeight)
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(
      geometry.heroContentCenter -
        (geometry.viewportHeight / 2 - geometry.viewportHeight * 0.1)
    )
  ).toBeLessThanOrEqual(1)
  expect(
    Math.abs(
      geometry.marqueeTop -
        geometry.heroContentBottom -
        geometry.viewportHeight * 0.1
    )
  ).toBeLessThanOrEqual(1)
  expect(geometry.documentScrollHeight).toBeLessThanOrEqual(
    geometry.viewportHeight + 1
  )
  expect(geometry.marqueeTop).toBeGreaterThanOrEqual(geometry.heroTop)
  expect(geometry.marqueeBottom).toBeLessThanOrEqual(geometry.heroBottom + 1)
})

test('home marquee uses a real nested 3D perspective', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const marquee = page.locator('.marquee-wrapper')
  const perspectivePlane = marquee.locator('.marquee-3d-container')
  await expect(marquee).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(perspectivePlane).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

  const perspective = await perspectivePlane.evaluate((element) => {
    const wrapperStyles = getComputedStyle(element.parentElement!)
    const planeStyles = getComputedStyle(element)
    return {
      clipPath: wrapperStyles.clipPath,
      matrix: new DOMMatrix(planeStyles.transform),
      perspective: wrapperStyles.perspective,
      transformStyle: planeStyles.transformStyle,
    }
  })

  expect(perspective.clipPath).toBe('none')
  expect(Number.parseFloat(perspective.perspective)).toBeGreaterThan(0)
  expect(perspective.transformStyle).toBe('preserve-3d')
  expect(Math.abs(perspective.matrix.m23)).toBeGreaterThan(0)
  expect(Math.abs(perspective.matrix.m32)).toBeGreaterThan(0)
})

test('home keeps its geometry stable throughout route leave', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await page.evaluate(() => {
    const hero = document.querySelector<HTMLElement>('.hero-section')!
    const initial = hero.getBoundingClientRect()
    const probe = {
      done: false,
      initialLeft: initial.left,
      initialTop: initial.top,
      samples: [] as Array<{ left: number; top: number }>,
    }
    ;(
      window as typeof window & { __homeLeaveGeometryProbe?: typeof probe }
    ).__homeLeaveGeometryProbe = probe

    const sample = () => {
      const leavingHero = document.querySelector<HTMLElement>('.hero-section')
      if (!leavingHero) {
        probe.done = true
        return
      }
      const bounds = leavingHero.getBoundingClientRect()
      probe.samples.push({ left: bounds.left, top: bounds.top })
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)

    const app = document.querySelector<
      HTMLElement & {
        __vue_app__?: {
          config: {
            globalProperties: { $router: { push: (path: string) => void } }
          }
        }
      }
    >('#app')
    app?.__vue_app__?.config.globalProperties.$router.push('/archive')
  })

  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as typeof window & {
              __homeLeaveGeometryProbe?: { done: boolean }
            }
          ).__homeLeaveGeometryProbe?.done
      )
    )
    .toBe(true)

  const geometry = await page.evaluate(() => {
    const probe = (
      window as typeof window & {
        __homeLeaveGeometryProbe?: {
          initialLeft: number
          initialTop: number
          samples: Array<{ left: number; top: number }>
        }
      }
    ).__homeLeaveGeometryProbe!
    return {
      leftDelta: Math.max(
        ...probe.samples.map(({ left }) => Math.abs(left - probe.initialLeft))
      ),
      sampleCount: probe.samples.length,
      topDelta: Math.max(
        ...probe.samples.map(({ top }) => Math.abs(top - probe.initialTop))
      ),
    }
  })

  expect(geometry.sampleCount).toBeGreaterThan(2)
  expect(geometry.leftDelta).toBeLessThanOrEqual(ISLAND_EXIT_MAX_GEOMETRY_SHIFT)
  expect(geometry.topDelta).toBeLessThanOrEqual(ISLAND_EXIT_MAX_GEOMETRY_SHIFT)
})

test('desktop custom cursor is ready during entry and hides outside viewport', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const cursor = page.locator('.cursor-position')
  await expect(cursor).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(page.locator('.layout-page')).toHaveCSS('cursor', /dot\.svg/)

  await page.mouse.move(240, 180)
  await expect(cursor).not.toHaveClass(/\bis-hidden\b/)
  await expect(page.locator('html')).toHaveClass(/\bcustom-cursor-enabled\b/)

  await page.evaluate(() => {
    window.dispatchEvent(new MouseEvent('mouseout', { relatedTarget: null }))
  })
  await expect(cursor).toHaveClass(/\bis-hidden\b/)
  await expect(page.locator('html')).not.toHaveClass(
    /\bcustom-cursor-enabled\b/
  )

  await page.mouse.move(280, 220)
  await expect(cursor).not.toHaveClass(/\bis-hidden\b/)
  await expect(page.locator('html')).toHaveClass(/\bcustom-cursor-enabled\b/)
})

test('desktop navigation rolls text without moving route logos', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const archiveMenuItem = page.locator('.el-menu-item.ARCHIVE')
  await expect(archiveMenuItem).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(archiveMenuItem.locator('.menu-route-icon')).toHaveCount(0)

  const initial = await archiveMenuItem
    .locator('.main-title')
    .evaluate((roll) => {
      const characters = [
        ...roll.querySelectorAll<HTMLElement>('.text-roll__char--current'),
      ]

      return {
        label: roll.getAttribute('aria-label'),
        characterCount: characters.length,
        delays: characters.map((character) =>
          Number.parseFloat(getComputedStyle(character).transitionDelay)
        ),
      }
    })

  expect(initial.label).toBe('ARCHIVE')
  expect(initial.characterCount).toBe(7)
  expect(initial.delays[3]).toBeLessThan(initial.delays[0])
  expect(initial.delays[3]).toBeLessThan(initial.delays[6])

  await archiveMenuItem.hover()
  await page.waitForTimeout(650)

  const hovered = await archiveMenuItem
    .locator('.main-title')
    .evaluate((roll) => {
      const bounds = roll.getBoundingClientRect()
      const currentCharacters = [
        ...roll.querySelectorAll<HTMLElement>('.text-roll__char--current'),
      ]
      const incomingCharacters = [
        ...roll.querySelectorAll<HTMLElement>('.text-roll__char--incoming'),
      ]

      return {
        currentMovedOut: currentCharacters.every(
          (character) => character.getBoundingClientRect().bottom < bounds.top
        ),
        filter: getComputedStyle(roll).filter,
        incomingAligned: incomingCharacters.every(
          (character) =>
            Math.abs(character.getBoundingClientRect().top - bounds.top) < 1
        ),
      }
    })

  expect(hovered.currentMovedOut).toBeTruthy()
  expect(hovered.filter).toContain('drop-shadow')
  expect(hovered.incomingAligned).toBeTruthy()
})

test('desktop footer social links roll text without glow', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const socialLink = page.locator(
    '.footer-com .text-links .social-link--twitter'
  )
  const roll = socialLink.locator('.text-roll')
  await expect(roll).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(roll).toHaveAttribute('aria-label', 'X / TWITTER')

  await socialLink.hover()
  await page.waitForTimeout(550)

  const hovered = await roll.evaluate((element) => {
    const currentCharacters = [
      ...element.querySelectorAll<HTMLElement>('.text-roll__char--current'),
    ]
    const incomingCharacters = [
      ...element.querySelectorAll<HTMLElement>('.text-roll__char--incoming'),
    ]
    const getTranslateY = (character: HTMLElement) =>
      new DOMMatrixReadOnly(getComputedStyle(character).transform).m42
    const style = getComputedStyle(element)

    return {
      currentMovedOut: currentCharacters.every(
        (character) => getTranslateY(character) < 0
      ),
      filter: style.filter,
      incomingAligned: incomingCharacters.every(
        (character) => Math.abs(getTranslateY(character)) < 0.1
      ),
      textShadow: style.textShadow,
    }
  })

  expect(hovered.currentMovedOut).toBeTruthy()
  expect(hovered.filter).toBe('none')
  expect(hovered.incomingAligned).toBeTruthy()
  expect(hovered.textShadow).toBe('none')
})

test('archive and craft use their exchanged representative zodiac signs', async ({
  page,
}) => {
  const routeSigns = [
    { path: '/archive', sign: 'AQUARIUS' },
    { path: '/craft', sign: 'GEMINI' },
  ]

  for (const routeSign of routeSigns) {
    await page.goto(routeSign.path, { waitUntil: 'domcontentloaded' })
    await expect(
      page.locator('.zodiac-sign-face.is-active .zodiac-name')
    ).toHaveText(routeSign.sign, { timeout: PAGE_LOAD_TIMEOUT })
  }
})

test('archive section headings show their dynamic project totals', async ({
  page,
}) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const sectionCounts = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        '.archives-page .home-section-layout'
      )
    ).map((section) => {
      const count = section.querySelector<HTMLElement>(
        '.archive-section-count strong'
      )

      return {
        displayed: Number(count?.textContent),
        actual: section.querySelectorAll('.shared-work-card, .misc-card')
          .length,
        fontFamily: count ? window.getComputedStyle(count).fontFamily : '',
      }
    })
  )

  expect(sectionCounts).toHaveLength(3)
  for (const sectionCount of sectionCounts) {
    expect(sectionCount.displayed).toBe(sectionCount.actual)
    expect(sectionCount.fontFamily.toLowerCase()).toContain('anton')
  }
})

/*
test('updated stamp follows the desktop nav rail and keeps its mobile header placement', async ({
  page,
}, testInfo) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const metrics = await page.evaluate(() => {
    const stamp = document.querySelector<HTMLElement>('.header-updated')
    const header = document.querySelector<HTMLElement>('.page-header')
    const navigation = document.querySelector<HTMLElement>(
      '.sections-fixed-nav'
    )

    if (!stamp || !header) throw new Error('Updated stamp is unavailable')

    const stampBounds = stamp.getBoundingClientRect()
    const headerBounds = header.getBoundingClientRect()
    const navigationBounds = navigation?.getBoundingClientRect()
    const stampStyle = window.getComputedStyle(stamp)

    return {
      color: stampStyle.color,
      headerBottom: headerBounds.bottom,
      headerTop: headerBounds.top,
      navigationBottom: navigationBounds?.bottom ?? 0,
      opacityTarget: stampStyle.getPropertyValue('--updated-opacity').trim(),
      position: stampStyle.position,
      stampBottom: stampBounds.bottom,
      stampLeft: stampBounds.left,
      stampTop: stampBounds.top,
    }
  })

  expect(metrics.color).toBe('rgb(226, 52, 86)')

  if (testInfo.project.name.includes('mobile')) {
    expect(metrics.position).toBe('absolute')
    expect(metrics.stampTop).toBeGreaterThanOrEqual(metrics.headerTop)
    expect(metrics.stampBottom).toBeLessThanOrEqual(metrics.headerBottom)
    return
  }

  expect(metrics.position).toBe('fixed')
  expect(metrics.opacityTarget).toBe('0.16')
  expect(metrics.stampLeft).toBeLessThan(40)
  expect(metrics.stampTop).toBeGreaterThan(metrics.navigationBottom)
})
*/

test('home uses centered display headings and keeps scroll-aware navigation', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await expect(page.locator('.home-page .home-section-layout')).toHaveCount(0)
  await expect(page.locator('.home-indexed-section')).toHaveCount(4)
  await expect(page.locator('.home-page .archive-entry')).toHaveCount(0)

  const navigationItems = page.locator(
    '.home-sections-nav .sections-fixed-nav__item'
  )
  await expect(navigationItems).toHaveCount(4)
  await navigationItems.nth(1).click()

  const worksSection = page.locator('#home-section-works')
  await expect
    .poll(() =>
      worksSection.evaluate((section) =>
        Math.abs(section.getBoundingClientRect().top)
      )
    )
    .toBeLessThan(180)
  await expect(navigationItems.nth(1)).toHaveAttribute(
    'aria-current',
    'location'
  )
  await expect(worksSection.locator('.scroll-reveal-title')).toHaveClass(
    /\bis-revealed\b/
  )

  const worksHeading = worksSection.locator('.home-section-title')
  await expect
    .poll(() =>
      worksHeading.evaluate((heading) => {
        const headingBounds = heading.getBoundingClientRect()
        const sectionBounds = heading
          .closest('section')!
          .getBoundingClientRect()

        return Math.abs(
          headingBounds.left +
            headingBounds.width / 2 -
            (sectionBounds.left + sectionBounds.width / 2)
        )
      })
    )
    .toBeLessThanOrEqual(1)

  const headingMetrics = await worksHeading.evaluate((heading) => {
    const headingBounds = heading.getBoundingClientRect()
    const headingWrapperBounds = heading.parentElement!.getBoundingClientRect()
    const englishTitleBounds = heading
      .querySelector('.home-section-title__en')!
      .getBoundingClientRect()
    const mainTitleBounds = heading
      .querySelector('.home-section-title__main')!
      .getBoundingClientRect()
    const englishTitleStyle = getComputedStyle(
      heading.querySelector('.home-section-title__en')!
    )
    const mainTitleStyle = getComputedStyle(
      heading.querySelector('.home-section-title__main')!
    )
    const headingWrapperStyle = getComputedStyle(heading.parentElement!)
    const shell = heading.closest('.home-section-shell') as HTMLElement
    const shellScale = shell.getBoundingClientRect().width / shell.offsetWidth
    const sectionBounds = heading.closest('section')!.getBoundingClientRect()
    const style = getComputedStyle(heading)

    return {
      animationName: headingWrapperStyle.animationName,
      bottomClearance:
        (headingWrapperBounds.bottom - mainTitleBounds.bottom) / shellScale,
      centerOffset: Math.abs(
        headingBounds.left +
          headingBounds.width / 2 -
          (sectionBounds.left + sectionBounds.width / 2)
      ),
      englishGap: mainTitleBounds.top - englishTitleBounds.bottom,
      englishFontFamily: englishTitleStyle.fontFamily,
      englishLetterSpacing: englishTitleStyle.letterSpacing,
      fontSize: Number.parseFloat(style.fontSize),
      lineHeight: Number.parseFloat(style.lineHeight),
      mainFontSize: Number.parseFloat(mainTitleStyle.fontSize),
      textAlign: style.textAlign,
      wrapperTransform: headingWrapperStyle.transform,
    }
  })

  expect(headingMetrics.bottomClearance).toBeGreaterThanOrEqual(8)
  expect(headingMetrics.animationName).toContain('home-section-heading-fade-in')
  expect(headingMetrics.wrapperTransform).toBe('none')
  expect(headingMetrics.centerOffset).toBeLessThanOrEqual(1)
  expect(headingMetrics.englishGap).toBeGreaterThanOrEqual(0)
  expect(headingMetrics.englishGap).toBeLessThanOrEqual(2)
  expect(headingMetrics.englishFontFamily.toLowerCase()).toContain('cn-custom')
  expect(headingMetrics.englishLetterSpacing).toBe('normal')
  expect(headingMetrics.fontSize).toBeGreaterThanOrEqual(21)
  expect(headingMetrics.fontSize).toBeLessThan(56)
  expect(headingMetrics.lineHeight).toBeGreaterThanOrEqual(
    headingMetrics.fontSize * 0.95
  )
  expect(headingMetrics.lineHeight).toBeLessThanOrEqual(headingMetrics.fontSize)
  expect(headingMetrics.mainFontSize).toBeLessThan(
    headingMetrics.fontSize * 0.9
  )
  expect(headingMetrics.textAlign).toBe('center')
})

test('about content uses the full-width feathered hover field without a glass plate', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const aboutSection = page.locator('#home-section-about')
  const aboutContent = aboutSection.locator('.manifesto-content')
  const hoverPattern = aboutContent.locator('.manifesto-hover-pattern')

  await page
    .locator('.home-sections-nav .sections-fixed-nav__item')
    .first()
    .click()
  await expect(aboutContent).toBeVisible()
  await expect(aboutSection.locator('.manifesto-visual')).toHaveCount(0)
  await expect(aboutSection.locator('.background-squares')).toHaveCount(0)

  const styles = await aboutContent.evaluate((element) => {
    const contentStyle = getComputedStyle(element)
    const copyStyle = getComputedStyle(
      element.querySelector('.manifesto-copy')!
    )
    const hoverPatternStyle = getComputedStyle(
      element.querySelector('.manifesto-hover-pattern')!
    )
    const edgeFeatherStyle = getComputedStyle(
      element.querySelector('.manifesto-hover-pattern__edge-feather')!
    )
    const spotlightStyle = getComputedStyle(
      element.querySelector('.manifesto-hover-pattern__spotlight')!
    )
    const gradientStyle = getComputedStyle(
      element.querySelector('.manifesto-hover-pattern__gradient')!
    )
    const cipherStyle = getComputedStyle(
      element.querySelector('.manifesto-hover-pattern__cipher')!
    )
    const highlightStyle = getComputedStyle(
      element.querySelector('.highlight')!
    )
    const descriptionStyle = getComputedStyle(element.querySelector('.desc')!)
    const linkStyle = getComputedStyle(
      element.querySelector('.manifesto-link')!
    )

    return {
      backdropFilter: gradientStyle.backdropFilter,
      backgroundImage: contentStyle.backgroundImage,
      borderTopWidth: contentStyle.borderTopWidth,
      boxShadow: contentStyle.boxShadow,
      cipherColor: cipherStyle.color,
      descriptionColor: descriptionStyle.color,
      edgeMaskImage: edgeFeatherStyle.maskImage,
      gradientColor: gradientStyle.backgroundColor,
      highlightColor: highlightStyle.color,
      highlightStrokeWidth: Number.parseFloat(
        highlightStyle.webkitTextStrokeWidth
      ),
      linkTextShadow: linkStyle.textShadow,
      maskImage: hoverPatternStyle.maskImage,
      spotlightMaskImage: spotlightStyle.maskImage,
      textAlign: copyStyle.textAlign,
      textShadow: copyStyle.textShadow,
    }
  })
  expect(styles.backdropFilter).toBe('none')
  expect(styles.backgroundImage).toBe('none')
  expect(styles.borderTopWidth).toBe('0px')
  expect(styles.boxShadow).toBe('none')
  expect(styles.cipherColor).toBe('rgba(255, 255, 255, 0.28)')
  expect(styles.descriptionColor).toBe('rgba(255, 255, 255, 0.62)')
  expect(styles.gradientColor).toBe('rgba(226, 52, 86, 0.46)')
  expect(styles.highlightColor).toBe('rgba(0, 0, 0, 0)')
  expect(styles.highlightStrokeWidth).toBeGreaterThan(1)
  expect(styles.linkTextShadow).toContain('rgb(0, 0, 0)')
  expect(styles.maskImage).toContain('linear-gradient')
  expect(styles.maskImage).toContain('18%')
  expect(styles.edgeMaskImage).toContain('linear-gradient')
  expect(styles.edgeMaskImage).toContain('12%')
  expect(styles.spotlightMaskImage).toContain('radial-gradient')
  expect(styles.textAlign).toBe('center')
  expect(styles.textShadow).not.toBe('none')

  await aboutContent.hover()
  await expect
    .poll(() =>
      hoverPattern.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity)
      )
    )
    .toBeGreaterThan(0.95)
  await expect
    .poll(() =>
      hoverPattern
        .locator('.manifesto-hover-pattern__cipher')
        .evaluate((element) => element.textContent?.length ?? 0)
    )
    .toBeGreaterThan(3_000)
})

test('home titles and content move as one monotonic parallax group', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const navigationItems = page.locator(
    '.home-sections-nav .sections-fixed-nav__item'
  )
  const revealItems = page.locator(
    '.home-indexed-section .scroll-reveal-title, .home-indexed-section .scroll-reveal-content'
  )
  const moduleShells = page.locator('.home-indexed-section .home-section-shell')
  const worksSection = page.locator('#home-section-works')
  const worksShell = worksSection.locator('.home-section-shell')
  const readWorksMotion = () =>
    worksShell.evaluate((element) => ({
      offset: Number.parseFloat(
        (element as HTMLElement).style.getPropertyValue(
          '--home-reveal-parallax-y'
        )
      ),
      scale: Number.parseFloat(
        (element as HTMLElement).style.getPropertyValue(
          '--home-reveal-parallax-scale'
        )
      ),
    }))
  const readPageScrollTop = () =>
    page.evaluate(() =>
      Math.max(
        window.scrollY,
        document.scrollingElement?.scrollTop ?? 0,
        document.documentElement.scrollTop,
        document.body.scrollTop
      )
    )

  await navigationItems.nth(1).click()
  await expect
    .poll(() =>
      worksSection.evaluate((element) =>
        Math.abs(element.getBoundingClientRect().top)
      )
    )
    .toBeLessThan(180)
  await expect(revealItems).toHaveCount(8)
  await expect(moduleShells).toHaveCount(4)
  await expect
    .poll(() =>
      moduleShells.evaluateAll((elements) =>
        elements.every((element) =>
          ['--home-reveal-parallax-y', '--home-reveal-parallax-opacity'].every(
            (property) =>
              (element as HTMLElement).style.getPropertyValue(property)
          )
        )
      )
    )
    .toBe(true)
  await expect
    .poll(() =>
      revealItems.evaluateAll((elements) =>
        elements.every((element) => {
          const target = element as HTMLElement
          return (
            !target.style.getPropertyValue('--home-reveal-parallax-y') &&
            !target.style.getPropertyValue('--home-reveal-parallax-scale')
          )
        })
      )
    )
    .toBe(true)

  await page.waitForTimeout(700)
  const initialScrollTop = await readPageScrollTop()
  const initialMotion = await readWorksMotion()

  await page.mouse.wheel(0, 320)
  await expect.poll(readPageScrollTop).toBeGreaterThan(initialScrollTop + 40)
  await expect
    .poll(() =>
      worksShell.evaluate(
        (element, initialOffset) =>
          Math.abs(
            Number.parseFloat(
              (element as HTMLElement).style.getPropertyValue(
                '--home-reveal-parallax-y'
              )
            ) - Number(initialOffset)
          ),
        initialMotion.offset
      )
    )
    .toBeGreaterThan(0.5)

  const currentMotion = await readWorksMotion()
  const offsetDelta = currentMotion.offset - initialMotion.offset
  const scaleDelta = currentMotion.scale - initialMotion.scale
  expect(offsetDelta * scaleDelta).toBeGreaterThan(0)
  expect(Math.abs(scaleDelta / offsetDelta)).toBeCloseTo(0.22 / 120, 3)

  const motionValues = await moduleShells.evaluateAll((elements) =>
    elements.map((element) => {
      const target = element as HTMLElement
      return {
        offset: Math.abs(
          Number.parseFloat(
            target.style.getPropertyValue('--home-reveal-parallax-y')
          )
        ),
        scale:
          Number.parseFloat(
            target.style.getPropertyValue('--home-reveal-parallax-scale')
          ) || 1,
        opacity: Number.parseFloat(
          target.style.getPropertyValue('--home-reveal-parallax-opacity')
        ),
      }
    })
  )
  expect(motionValues.every(({ offset }) => offset <= 120.01)).toBe(true)
  expect(
    motionValues.every(({ scale }) => scale >= 0.78 && scale <= 1.22)
  ).toBe(true)
  expect(
    motionValues.every(({ opacity }) => opacity >= 0 && opacity <= 1)
  ).toBe(true)
  expect(motionValues.some(({ opacity }) => opacity < 0.99)).toBe(true)
})

test('desktop first-screen wheel snap keeps both directions exact and unlocked', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  test.skip(true, '旧版首屏切换测试已由 home-pagination.spec.ts 替代')
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const heroTransformOrigins = await page
    .locator('.hero-content')
    .evaluate((heroContent) => {
      const readOrigin = (selector: string, verticalRatio: number) => {
        const element = heroContent.querySelector<HTMLElement>(selector)!
        const bounds = element.getBoundingClientRect()
        const [x, y] = getComputedStyle(element)
          .transformOrigin.split(' ')
          .map(Number.parseFloat)

        return {
          x,
          y,
          expectedX: bounds.width / 2,
          expectedY: bounds.height * verticalRatio,
        }
      }

      return {
        slogan: readOrigin('.main-slogan', 0.58),
        carousel: readOrigin('.recommend', 0.5),
      }
    })
  expect(heroTransformOrigins.slogan.x).toBeCloseTo(
    heroTransformOrigins.slogan.expectedX,
    0
  )
  expect(heroTransformOrigins.slogan.y).toBeCloseTo(
    heroTransformOrigins.slogan.expectedY,
    0
  )
  expect(heroTransformOrigins.carousel.x).toBeCloseTo(
    heroTransformOrigins.carousel.expectedX,
    0
  )
  expect(heroTransformOrigins.carousel.y).toBeCloseTo(
    heroTransformOrigins.carousel.expectedY,
    0
  )

  const secondScreen = page.locator('#home-section-about')
  const secondScreenTopAtPageStart = await secondScreen.evaluate(
    (section) => section.getBoundingClientRect().top
  )

  await page.mouse.move(40, 180)
  // 自动滚动期间的残余滚轮输入不应延长锁定时间。
  await page.mouse.wheel(0, 360)
  await page.waitForTimeout(200)
  await page.mouse.wheel(0, 120)
  await page.waitForTimeout(750)

  await expect
    .poll(
      () =>
        secondScreen.evaluate((section) =>
          Math.abs(section.getBoundingClientRect().top)
        ),
      { timeout: 3_000 }
    )
    .toBeLessThanOrEqual(1)

  const settledTop = await secondScreen.evaluate(
    (section) => section.getBoundingClientRect().top
  )
  expect(Math.abs(settledTop)).toBeLessThanOrEqual(1)

  const exitedHeroMotion = await readHeroExitMotion(page)
  expect(exitedHeroMotion.slogan.x).toBeLessThan(-30)
  expect(exitedHeroMotion.carousel.x).toBeGreaterThan(30)
  expect(exitedHeroMotion.slogan.scale).toBeGreaterThan(1.5)
  expect(exitedHeroMotion.carousel.scale).toBeGreaterThan(1.5)
  expect(exitedHeroMotion.slogan.opacity).toBe(0)
  expect(exitedHeroMotion.carousel.opacity).toBe(0)

  await page.mouse.wheel(0, -360)
  await expect
    .poll(
      () =>
        secondScreen.evaluate(
          (section, initialTop) =>
            Math.abs(section.getBoundingClientRect().top - Number(initialTop)),
          secondScreenTopAtPageStart
        ),
      { timeout: 3_000 }
    )
    .toBeLessThanOrEqual(1)

  expect(await page.evaluate(() => window.scrollY)).toBeLessThanOrEqual(1)
  const returnedSecondScreenTop = await secondScreen.evaluate(
    (section) => section.getBoundingClientRect().top
  )
  expect(
    Math.abs(returnedSecondScreenTop - secondScreenTopAtPageStart)
  ).toBeLessThanOrEqual(1)

  const returnedHeroMotion = await readHeroExitMotion(page)
  expect(Math.abs(returnedHeroMotion.slogan.x)).toBeLessThanOrEqual(0.01)
  expect(Math.abs(returnedHeroMotion.carousel.x)).toBeLessThanOrEqual(0.01)
  expect(returnedHeroMotion.slogan.scale).toBe(1)
  expect(returnedHeroMotion.carousel.scale).toBe(1)
  expect(returnedHeroMotion.slogan.opacity).toBe(1)
  expect(returnedHeroMotion.carousel.opacity).toBe(1)

  await page.waitForTimeout(950)
  await page.mouse.wheel(0, 360)
  await expect
    .poll(
      () =>
        secondScreen.evaluate((section) =>
          Math.abs(section.getBoundingClientRect().top)
        ),
      { timeout: 3_000 }
    )
    .toBeLessThanOrEqual(1)

  await page.waitForTimeout(950)
  await page.mouse.wheel(0, 700)
  await expect
    .poll(
      () =>
        secondScreen.evaluate((section) => section.getBoundingClientRect().top),
      { timeout: 3_000 }
    )
    .toBeLessThan(-80)
})

test('mobile first-screen swipe snap supports return gesture and button', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))
  test.skip(true, '旧版首屏切换测试已由 home-pagination.spec.ts 替代')
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const secondScreen = page.locator('#home-section-about')
  const backButton = secondScreen.locator('.back-first-screen')
  const swipe = (startY: number, endY: number) =>
    page.evaluate(
      ({ startY: touchStartY, endY: touchEndY }) => {
        const dispatchTouch = (type: string, clientY: number) => {
          const event = new Event(type, { bubbles: true, cancelable: true })
          Object.defineProperty(event, 'touches', {
            value: [{ clientY }],
          })
          window.dispatchEvent(event)
        }

        dispatchTouch('touchstart', touchStartY)
        dispatchTouch('touchmove', touchEndY)
      },
      { startY, endY }
    )
  const expectSecondScreenAligned = () =>
    expect
      .poll(
        () =>
          secondScreen.evaluate((section) =>
            Math.abs(section.getBoundingClientRect().top)
          ),
        { timeout: 3_000 }
      )
      .toBeLessThanOrEqual(1)
  const expectFirstScreenAligned = () =>
    expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 3_000 })
      .toBeLessThanOrEqual(1)

  await swipe(560, 460)
  await expectSecondScreenAligned()
  await expect(backButton).toBeVisible()
  await expect
    .poll(
      () =>
        page.locator('.zodiac-stage').evaluate((stage) => {
          const bounds = stage.getBoundingClientRect()
          return Math.abs(
            bounds.top + bounds.height / 2 - window.innerHeight / 2
          )
        }),
      { timeout: 3_000 }
    )
    .toBeLessThanOrEqual(1)
  await expect
    .poll(
      () =>
        page.locator('.zodiac-stage').evaluate((stage) => {
          const bounds = stage.getBoundingClientRect()
          return bounds.width / window.innerWidth
        }),
      { timeout: 3_000 }
    )
    .toBeCloseTo(1.9, 2)

  await backButton.click()
  await expectFirstScreenAligned()
  await page.waitForTimeout(950)

  await swipe(560, 460)
  await expectSecondScreenAligned()
  await swipe(260, 360)
  await expectFirstScreenAligned()
})

test('home reveal items fade out and replay whenever they re-enter the viewport', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const navigationItems = page.locator(
    '.home-sections-nav .sections-fixed-nav__item'
  )
  const worksSection = page.locator('#home-section-works')
  const worksHeading = worksSection.locator('.scroll-reveal-title')
  const worksContent = worksSection.locator('.scroll-reveal-content')
  const revealItems = page.locator(
    '.home-indexed-section .scroll-reveal-title, .home-indexed-section .scroll-reveal-content'
  )
  const readWorksHeadingEntryStartTime = () =>
    worksHeading.evaluate((element) => {
      const animation = element
        .getAnimations()
        .find(({ animationName }) =>
          animationName.includes('home-section-heading-fade-in')
        )
      return animation?.startTime ?? -1
    })

  await expect(revealItems).toHaveCount(8)
  await navigationItems.nth(1).click()
  await expect
    .poll(() =>
      worksHeading.evaluate((element) => {
        const bounds = element.getBoundingClientRect()
        return bounds.top < window.innerHeight * 0.92 && bounds.bottom > 0
      })
    )
    .toBe(true)
  await expect(worksHeading).toHaveClass(/\bis-revealed\b/)
  await expect(worksContent).toHaveClass(/\bis-revealed\b/)

  await expect.poll(readWorksHeadingEntryStartTime).toBeGreaterThanOrEqual(0)
  const firstEntryStartTime = await readWorksHeadingEntryStartTime()

  await page.waitForTimeout(950)
  await page.mouse.move(40, 180)
  await page.mouse.wheel(0, -5000)
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeLessThanOrEqual(1)
  await expect(worksHeading).not.toHaveClass(/\bis-revealed\b/)
  await expect(worksHeading).toHaveClass(/\bis-reveal-exiting\b/)
  await expect(worksContent).not.toHaveClass(/\bis-revealed\b/)
  await expect(worksContent).toHaveClass(/\bis-reveal-exiting\b/)
  await expect
    .poll(() =>
      worksHeading.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).opacity)
      )
    )
    .toBeLessThanOrEqual(0.01)

  await navigationItems.nth(1).click()
  await expect(worksHeading).toHaveClass(/\bis-revealed\b/)
  await expect(worksHeading).not.toHaveClass(/\bis-reveal-exiting\b/)
  await expect(worksContent).toHaveClass(/\bis-revealed\b/)
  await expect(worksContent).not.toHaveClass(/\bis-reveal-exiting\b/)
  await expect
    .poll(readWorksHeadingEntryStartTime)
    .toBeGreaterThan(firstEntryStartTime)
})

test('home defers secondary journey images until interaction', async ({
  page,
}, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const journeyCards = page.locator('.journey-grid .shared-vlog-card')
  const firstJourneyCard = journeyCards.first()

  await expect(journeyCards).toHaveCount(3)
  if (testInfo.project.name.includes('mobile')) {
    await expect
      .poll(() =>
        journeyCards.first().evaluate((card) => {
          const grid = card.closest('.journey-grid')!
          return getComputedStyle(grid).gridTemplateColumns.split(' ').length
        })
      )
      .toBe(1)
    await expect
      .poll(() =>
        journeyCards.evaluateAll((cards) => {
          const gridBounds = cards[0]
            .closest('.journey-grid')!
            .getBoundingClientRect()
          const gridCenter = gridBounds.left + gridBounds.width / 2

          return cards.every((card) => {
            const cardBounds = card.getBoundingClientRect()
            return (
              Math.abs(cardBounds.left + cardBounds.width / 2 - gridCenter) <= 1
            )
          })
        })
      )
      .toBe(true)
  }
  await expect(firstJourneyCard).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(firstJourneyCard.locator('.vlog-img--base')).toHaveAttribute(
    'src',
    /singapore/
  )
  await expect(journeyCards.nth(1).locator('.vlog-img--base')).toHaveAttribute(
    'src',
    /live_jolinPleasure/
  )
  await expect(journeyCards.nth(2).locator('.vlog-img--base')).toHaveAttribute(
    'src',
    /ultramanZero/
  )
  await expect(firstJourneyCard.locator('.vlog-img--hover')).toHaveCount(0)
  await firstJourneyCard.hover()
  await expect(firstJourneyCard.locator('.vlog-img--hover')).toHaveCount(1)
})

test('home loads the work detail modal on demand', async ({
  page,
}, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const firstWorkCard = page.locator('.works-grid .shared-work-card').first()

  await expect(firstWorkCard).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(page.locator('.modal-wrapper-dialog')).toHaveCount(0)
  await firstWorkCard.click()
  const dialog = page.locator('.modal-wrapper-dialog')
  await expect(dialog).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  if (testInfo.project.name.includes('mobile')) {
    const mobileLayout = await dialog.evaluate((element) => {
      const closeRow = element.querySelector('.modal-close-row')!
      const modalBody = element.querySelector('.modal-body')!
      const asideCompany = element.querySelector('.aside-company')!
      const asideDivider = element.querySelector('.aside-divider')!
      const asideLogo = element.querySelector('.aside-logo')!
      const modalAside = element.querySelector('.modal-aside')!
      const companyInfo = element.querySelector('.aside-company-info')!
      const companyName = element.querySelector('.aside-company-name')!
      const companyId = element.querySelector('.aside-id')!
      const shareButton = element.querySelector('.project-share-button')!

      return {
        asideCompanyAlignItems: getComputedStyle(asideCompany).alignItems,
        asideCompanyHeight: (asideCompany as HTMLElement).offsetHeight,
        asideCompanyBottomGap:
          (asideDivider as HTMLElement).offsetTop -
          ((asideCompany as HTMLElement).offsetTop +
            (asideCompany as HTMLElement).offsetHeight),
        asideCompanyTopGap:
          (asideCompany as HTMLElement).offsetTop -
          (modalAside as HTMLElement).offsetTop,
        asideLogoWidth: (asideLogo as HTMLElement).offsetWidth,
        bodyStartsAfterCloseRow:
          (modalBody as HTMLElement).offsetTop >=
          (closeRow as HTMLElement).offsetTop +
            (closeRow as HTMLElement).offsetHeight -
            1,
        closeRowHeight: (closeRow as HTMLElement).offsetHeight,
        companyIdFontSize: Number.parseFloat(
          getComputedStyle(companyId).fontSize
        ),
        companyInfoJustifyContent: getComputedStyle(companyInfo).justifyContent,
        companyNameFontSize: Number.parseFloat(
          getComputedStyle(companyName).fontSize
        ),
        dialogBottomGap:
          window.innerHeight -
          ((element as HTMLElement).offsetTop +
            (element as HTMLElement).offsetHeight),
        dialogTop: (element as HTMLElement).offsetTop,
        shareButtonAlignSelf: getComputedStyle(shareButton).alignSelf,
      }
    })

    expect(mobileLayout.bodyStartsAfterCloseRow).toBe(true)
    expect(mobileLayout.closeRowHeight).toBeGreaterThanOrEqual(52)
    expect(mobileLayout.asideCompanyHeight).toBeGreaterThanOrEqual(44)
    expect(mobileLayout.asideCompanyAlignItems).toBe('center')
    expect(
      Math.abs(
        mobileLayout.asideCompanyTopGap - mobileLayout.asideCompanyBottomGap
      )
    ).toBeLessThanOrEqual(1)
    expect(mobileLayout.asideLogoWidth).toBeGreaterThanOrEqual(44)
    expect(mobileLayout.companyNameFontSize).toBeGreaterThanOrEqual(15)
    expect(mobileLayout.companyIdFontSize).toBeGreaterThanOrEqual(11)
    expect(mobileLayout.companyInfoJustifyContent).toBe('center')
    expect(mobileLayout.shareButtonAlignSelf).toBe('center')
    expect(mobileLayout.dialogTop).toBeGreaterThanOrEqual(92)
    expect(mobileLayout.dialogBottomGap).toBeGreaterThanOrEqual(92)
    expect(
      Math.abs(mobileLayout.dialogTop - mobileLayout.dialogBottomGap)
    ).toBeLessThanOrEqual(1)
  }
})

test('personal bay menu entry redirects to 404', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  if (testInfo.project.name.includes('mobile')) {
    await page.locator('.mobile-menu-icon').click()
    await page.locator('.mobile-menu-items a[href="/island"]').click()
  } else {
    await page.locator('.menu-box a[href="/island"]').click()
  }

  await expect(page).toHaveURL(/\/404$/)
  await expect(page.locator('.not-found-page')).toBeVisible()
})

test('404 page remains locked at the top', async ({ page }) => {
  await page.goto('/404', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.not-found-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('html')).toHaveClass(/\bnot-found-no-scroll\b/)
  await expect(page.locator('body')).toHaveClass(/\bnot-found-no-scroll\b/)

  await page.mouse.wheel(0, 600)
  await page.waitForTimeout(300)

  const scrollTop = await page.evaluate(() =>
    Math.max(
      window.scrollY,
      document.documentElement.scrollTop,
      document.body.scrollTop
    )
  )
  expect(scrollTop).toBe(0)

  await page.locator('.last-show-text').click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.locator('html')).not.toHaveClass(/\bnot-found-no-scroll\b/)
  await expect(page.locator('body')).not.toHaveClass(/\bnot-found-no-scroll\b/)
})

test('hidden footer debug entry opens the personal bay test route', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const testEntry = page.getByRole('button', { name: '打开开发测试页' })
  await expect(testEntry).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await testEntry.click()

  await expect(page).toHaveURL(/\/test$/)
  await expect(
    page.locator('.island-page, .island-mobile-page').first()
  ).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
})

test('mobile personal bay works use a taller two-by-two grid', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.goto('/test', { waitUntil: 'domcontentloaded' })
  const worksGrid = page.locator('.mobile-port--works .mobile-card-row')
  await expect(worksGrid).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

  const gridTracks = await worksGrid.evaluate((element) => {
    const style = window.getComputedStyle(element)
    return {
      columns: style.gridTemplateColumns.split(' ').length,
      rows: style.gridTemplateRows.split(' ').length,
    }
  })

  expect(gridTracks).toEqual({ columns: 2, rows: 2 })

  const moduleHeights = await page.evaluate(() => ({
    works:
      document.querySelector('.mobile-port--works')?.getBoundingClientRect()
        .height ?? 0,
    notes:
      document.querySelector('.mobile-port--notes')?.getBoundingClientRect()
        .height ?? 0,
  }))

  expect(moduleHeights.works - moduleHeights.notes).toBeGreaterThanOrEqual(12)
})

test('cards and harbor panels use the changelog flip entrance', async ({
  page,
}, testInfo) => {
  await page.goto('/craft', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.craft-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const craftAnimations = await page.evaluate(() => {
    const getAnimationName = (selector: string) =>
      getComputedStyle(document.querySelector(selector) as Element)
        .animationName

    return {
      filter: getAnimationName('.craft-filter'),
      card: getAnimationName('.shared-tool-card'),
      image: getAnimationName('.shared-tool-card .tl-card__img-wrap'),
      index: getAnimationName('.shared-tool-card .tl-card__index'),
      imageDelay: getComputedStyle(
        document.querySelector(
          '.shared-tool-card .tl-card__img-wrap'
        ) as Element
      ).animationDelay,
      indexDelay: getComputedStyle(
        document.querySelector('.shared-tool-card .tl-card__index') as Element
      ).animationDelay,
    }
  })
  expect(craftAnimations.filter).toContain('craftFilterIn')
  expect(craftAnimations.card).toContain('toolCardIn')
  expect(craftAnimations.image).toContain('toolCardMediaRise')
  expect(craftAnimations.index).toContain('toolCardMediaRise')
  expect(craftAnimations.indexDelay).toBe(craftAnimations.imageDelay)

  await page.goto('/test', { waitUntil: 'domcontentloaded' })
  const panelSelector = testInfo.project.name.includes('mobile')
    ? '.mobile-port'
    : '.port-panel'
  await expect(page.locator(panelSelector).first()).toBeAttached({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  const panelAnimation = await page
    .locator(panelSelector)
    .first()
    .evaluate((element) => getComputedStyle(element).animationName)
  expect(panelAnimation).toContain(
    testInfo.project.name.includes('mobile')
      ? 'mobile-port-enter'
      : 'port-enter'
  )
})

test('desktop personal bay releases temporary compositor layers after entrance', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))

  await page.setViewportSize({ width: 1920, height: 900 })
  await page.goto('/test', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.port-panel')).toHaveCount(4, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page.waitForTimeout(1_600)

  const renderingState = await page.evaluate(() => ({
    cursorBlendMode: getComputedStyle(
      document.querySelector('.cursor-position') as Element
    ).mixBlendMode,
    latestClipPath: getComputedStyle(
      document.querySelector('.latest-pages') as Element
    ).clipPath,
    panelClipPaths: Array.from(document.querySelectorAll('.port-panel')).map(
      (panel) => getComputedStyle(panel).clipPath
    ),
    panelTransforms: Array.from(document.querySelectorAll('.port-panel')).map(
      (panel) => getComputedStyle(panel).transform
    ),
    portLineFilters: Array.from(document.querySelectorAll('.port-panel')).map(
      (panel) => getComputedStyle(panel, '::before').filter
    ),
  }))

  expect(renderingState.cursorBlendMode).toBe('normal')
  expect(renderingState.latestClipPath).toBe('none')
  expect(renderingState.panelClipPaths).toEqual(Array(4).fill('none'))
  expect(renderingState.panelTransforms).toEqual(Array(4).fill('none'))
  expect(renderingState.portLineFilters).toEqual(Array(4).fill('none'))
})

test('mobile menu locks background scrolling', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.about-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await page.evaluate(() => window.scrollTo(0, 500))

  await page.locator('.mobile-menu-icon').click()
  const mobileMenu = page.locator('.mobile-menu-panel')
  await expect(mobileMenu).toHaveClass(/\bactive\b/)
  await expect(mobileMenu).toHaveCSS(
    'background-image',
    /rgba\(0, 0, 0, 0\.22\)/
  )
  await expect(page.locator('html')).toHaveClass(/mobile-menu-scroll-locked/)
  await expect(page.locator('.router-container')).not.toHaveCSS(
    'filter',
    'none'
  )
  const lockedScrollPosition = await page.evaluate(() => window.scrollY)

  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(100)

  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(lockedScrollPosition)

  await page.locator('.mobile-menu-icon').click()
  await expect(page.locator('html')).not.toHaveClass(
    /mobile-menu-scroll-locked/
  )
  await expect(page.locator('.router-container')).toHaveCSS('filter', 'none')
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBe(lockedScrollPosition)
})

test('mobile menu reuses the footer social link bar', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('.mobile-menu-icon').click()

  const menu = page.locator('.mobile-menu-panel')
  const linkBar = menu.locator('.mobile-menu-social-links')
  await expect(menu).toHaveClass(/\bactive\b/)
  await expect(linkBar.locator('.footer-social-links')).toBeVisible()
  await expect(linkBar.locator('.footer-social-links__item')).toHaveCount(7)
  await expect(menu.locator('.contact-item')).toHaveCount(0)

  const followsSwitches = await linkBar.evaluate((element) =>
    element.previousElementSibling?.classList.contains('switches')
  )
  expect(followsSwitches).toBe(true)

  await linkBar
    .locator('.footer-social-links__item[aria-label="SWITCH"]')
    .click()
  const switchPanel = linkBar.locator('.switch-friend-panel')
  await expect(switchPanel).toBeVisible()
  const centerDelta = await switchPanel.evaluate((element) => {
    const bounds = element.getBoundingClientRect()
    return Math.abs(bounds.left + bounds.width / 2 - window.innerWidth / 2)
  })
  expect(centerDelta).toBeLessThanOrEqual(1)
})

test('mobile home content uses tripled spacing between modules', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const spacing = await page.evaluate(() => {
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize
    )
    const originalSpacing = Math.max(
      (72 / 30) * rootFontSize,
      Math.min(window.innerWidth * 0.07, (112 / 30) * rootFontSize)
    )
    const sectionPadding = [
      '.works-section',
      '.journey-section',
      '.craft-section',
    ].map((selector) =>
      Number.parseFloat(
        getComputedStyle(document.querySelector<HTMLElement>(selector)!)
          .paddingTop
      )
    )

    return { originalSpacing, sectionPadding }
  })

  for (const paddingTop of spacing.sectionPadding) {
    expect(paddingTop).toBeCloseTo(spacing.originalSpacing * 3, 0)
  }
})

test('mobile tool grids use one taller card per row', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  const samples = [
    { grid: '.home-craft-grid', path: '/' },
    { grid: '.tl-grid', path: '/craft' },
  ]

  for (const sample of samples) {
    await page.goto(sample.path, { waitUntil: 'domcontentloaded' })
    const grid = page.locator(sample.grid)
    await expect(grid).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
    await grid.scrollIntoViewIfNeeded()

    const cards = grid.locator('.shared-tool-card')
    await expect.poll(() => cards.count()).toBeGreaterThan(1)

    const geometry = await grid.evaluate((element) => {
      const cards = element.querySelectorAll<HTMLElement>('.shared-tool-card')
      const firstCard = cards[0].getBoundingClientRect()
      const secondCard = cards[1].getBoundingClientRect()
      const image = cards[0].querySelector<HTMLElement>('.tl-card__img-wrap')!
      const imageHeight = Number.parseFloat(getComputedStyle(image).height)
      const rootFontSize = Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize
      )
      const fontSizes = Object.fromEntries(
        [
          ['.tl-card__index-num', 29.3333],
          ['.tl-card__index-slash', 23.4667],
          ['.tl-card__index-total', 23.4667],
          ['.tl-card__tag', 13.2],
          ['.tl-card__title', 24.9333],
          ['.tl-card__sub', 17.6],
          ['.tl-card__status', 13.2],
          ['.tl-card__cta', 14.6667],
        ].map(([selector, sourceSize]) => [
          selector,
          {
            actual: Number.parseFloat(
              getComputedStyle(cards[0].querySelector<HTMLElement>(selector)!)
                .fontSize
            ),
            expected: (Number(sourceSize) / 30) * rootFontSize,
          },
        ])
      )
      const bodyStyle = getComputedStyle(
        cards[0].querySelector<HTMLElement>('.tl-card__body')!
      )
      const footerStyle = getComputedStyle(
        cards[0].querySelector<HTMLElement>('.tl-card__footer')!
      )

      return {
        bodySpacing: {
          gap: Number.parseFloat(bodyStyle.gap),
          paddingLeft: Number.parseFloat(bodyStyle.paddingLeft),
          paddingTop: Number.parseFloat(bodyStyle.paddingTop),
        },
        expectedImageHeight: (280 / 30) * rootFontSize,
        expectedSpacing: {
          bodyGap: (10.6667 / 30) * rootFontSize,
          bodyPaddingLeft: (26.6667 / 30) * rootFontSize,
          bodyPaddingTop: (24 / 30) * rootFontSize,
          footerMarginTop: (10.6667 / 30) * rootFontSize,
          footerPaddingTop: (16 / 30) * rootFontSize,
        },
        fontSizes,
        footerSpacing: {
          marginTop: Number.parseFloat(footerStyle.marginTop),
          paddingTop: Number.parseFloat(footerStyle.paddingTop),
        },
        imageHeight,
        leftDelta: Math.abs(firstCard.left - secondCard.left),
        rowGap: secondCard.top - firstCard.bottom,
      }
    })

    expect(geometry.leftDelta).toBeLessThanOrEqual(1)
    expect(geometry.rowGap).toBeGreaterThanOrEqual(0)
    expect(geometry.imageHeight).toBeCloseTo(geometry.expectedImageHeight, 0)
    for (const fontSize of Object.values(geometry.fontSizes)) {
      expect(fontSize.actual).toBeCloseTo(fontSize.expected, 0)
    }
    expect(geometry.bodySpacing.gap).toBeCloseTo(
      geometry.expectedSpacing.bodyGap,
      0
    )
    expect(geometry.bodySpacing.paddingLeft).toBeCloseTo(
      geometry.expectedSpacing.bodyPaddingLeft,
      0
    )
    expect(geometry.bodySpacing.paddingTop).toBeCloseTo(
      geometry.expectedSpacing.bodyPaddingTop,
      0
    )
    expect(geometry.footerSpacing.marginTop).toBeCloseTo(
      geometry.expectedSpacing.footerMarginTop,
      0
    )
    expect(geometry.footerSpacing.paddingTop).toBeCloseTo(
      geometry.expectedSpacing.footerPaddingTop,
      0
    )
  }
})

test('mobile pages share wider gutters without clipping home overflow', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  for (const path of ['/', '/archive', '/craft', '/about', '/flanerie']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.main-container')).toBeAttached({
      timeout: PAGE_LOAD_TIMEOUT,
    })

    const gutter = await page
      .locator('.router-container')
      .evaluate((element) => {
        const style = getComputedStyle(element)

        return {
          left: Number.parseFloat(style.paddingLeft),
          minimumExpected: window.innerWidth * 0.06,
          right: Number.parseFloat(style.paddingRight),
        }
      })

    expect(gutter.left).toBeGreaterThan(gutter.minimumExpected)
    expect(gutter.right).toBeCloseTo(gutter.left, 1)
  }

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const overflow = await page.locator('.home-page').evaluate((element) => ({
    home: getComputedStyle(element).overflowX,
    router: getComputedStyle(element.parentElement!).overflowX,
  }))

  expect(overflow).toEqual({ home: 'visible', router: 'visible' })
})

test('mobile collection tabs double all shared text sizes', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  const samples = [
    {
      indexSize: 0.8,
      minHeight: 96,
      paddingTop: 12,
      path: '/craft',
      subtitleSize: 0.56,
      titleSize: 1.12,
    },
    {
      indexSize: 1.24,
      minHeight: 180,
      paddingTop: 32,
      path: '/island/photography',
      subtitleSize: 0.76,
      titleSize: 1.6,
    },
  ]

  for (const sample of samples) {
    await page.goto(sample.path, { waitUntil: 'domcontentloaded' })
    const tabs = page.locator('.collection-tabs')
    await expect(tabs).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

    const typography = await tabs.evaluate((element) => {
      const tab = element.querySelector<HTMLElement>('.collection-tab')!
      const tabStyle = getComputedStyle(tab)
      const readFontSize = (selector: string) =>
        Number.parseFloat(
          getComputedStyle(element.querySelector<HTMLElement>(selector)!)
            .fontSize
        )

      return {
        gap: Number.parseFloat(tabStyle.columnGap),
        index: readFontSize('.collection-tab__index'),
        minHeight: Number.parseFloat(tabStyle.minHeight),
        paddingLeft: Number.parseFloat(tabStyle.paddingLeft),
        paddingTop: Number.parseFloat(tabStyle.paddingTop),
        root: Number.parseFloat(
          getComputedStyle(document.documentElement).fontSize
        ),
        subtitle: readFontSize('.collection-tab__copy small'),
        title: readFontSize('.collection-tab__copy strong'),
      }
    })

    expect(typography.index).toBeCloseTo(typography.root * sample.indexSize, 0)
    expect(typography.gap).toBeCloseTo((20 / 30) * typography.root, 0)
    expect(typography.minHeight).toBeCloseTo(
      (sample.minHeight / 30) * typography.root,
      0
    )
    expect(typography.paddingLeft).toBeCloseTo((24 / 30) * typography.root, 0)
    expect(typography.paddingTop).toBeCloseTo(
      (sample.paddingTop / 30) * typography.root,
      0
    )
    expect(typography.subtitle).toBeCloseTo(
      typography.root * sample.subtitleSize,
      0
    )
    expect(typography.title).toBeCloseTo(typography.root * sample.titleSize, 0)
  }
})

test('mobile changelog gives more width to update content', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  const majorItem = page.locator('.timeline-item.is-major')
  const regularCard = page.locator('.log-card.is-regular-card').first()
  await expect(majorItem).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(regularCard).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })

  const geometry = await page.evaluate(() => {
    const changelog = document.querySelector<HTMLElement>('.changelog-block')!
    const major = document.querySelector<HTMLElement>(
      '.timeline-item.is-major'
    )!
    const majorSide = major.querySelector<HTMLElement>('.log-side.is-major')!
    const majorVersion = majorSide.querySelector<HTMLElement>('strong')!
    const majorLabel = majorSide.querySelector<HTMLElement>('small')!
    const regular = document.querySelector<HTMLElement>(
      '.log-card.is-regular-card'
    )!
    const regularVersion = regular.querySelector<HTMLElement>(
      '.log-inline-version'
    )!
    const latestLabel = regular.querySelector<HTMLElement>('.log-latest')!
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize
    )
    const changelogBounds = changelog.getBoundingClientRect()
    const cardRightEdges = Array.from(
      changelog.querySelectorAll<HTMLElement>('.log-card')
    ).map((card) => card.getBoundingClientRect().right)

    return {
      cardRightEdges,
      changelogRight: changelogBounds.right,
      expectedMajorSideWidth: (112 / 30) * rootFontSize,
      expectedRegularColumnWidth: (80 / 30) * rootFontSize,
      latestLabelSize: Number.parseFloat(
        getComputedStyle(latestLabel).fontSize
      ),
      majorGap: Number.parseFloat(getComputedStyle(major).columnGap),
      majorLabelSize: Number.parseFloat(getComputedStyle(majorLabel).fontSize),
      majorSideWidth: Number.parseFloat(
        getComputedStyle(major).gridTemplateColumns.split(' ')[1]
      ),
      majorVersionSize: Number.parseFloat(
        getComputedStyle(majorVersion).fontSize
      ),
      regularColumnWidth: Number.parseFloat(
        getComputedStyle(regular).gridTemplateColumns.split(' ')[0]
      ),
      regularVersionSize: Number.parseFloat(
        getComputedStyle(regularVersion).fontSize
      ),
      rootFontSize,
    }
  })

  expect(geometry.majorSideWidth).toBeCloseTo(
    geometry.expectedMajorSideWidth,
    0
  )
  expect(geometry.regularColumnWidth).toBeCloseTo(
    geometry.expectedRegularColumnWidth,
    0
  )
  expect(geometry.majorGap).toBeCloseTo((10 / 30) * geometry.rootFontSize, 0)
  expect(geometry.majorVersionSize).toBeCloseTo(geometry.rootFontSize, 0)
  expect(geometry.majorLabelSize).toBeCloseTo(geometry.rootFontSize * 0.56, 0)
  expect(geometry.regularVersionSize).toBeCloseTo(
    geometry.rootFontSize * 0.84,
    0
  )
  expect(geometry.latestLabelSize).toBeCloseTo(geometry.rootFontSize * 0.42, 0)
  for (const rightEdge of geometry.cardRightEdges) {
    expect(rightEdge).toBeLessThan(geometry.changelogRight)
  }
})

test('mobile roadmap and neighbour cards use revised typography', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  const roadmapCard = page.locator('.roadmap-tag').first()
  const neighbourCard = page.locator('.neighbor-card').first()
  await expect(roadmapCard).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(neighbourCard).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })

  const typography = await page.evaluate(() => {
    const roadmap = document.querySelector<HTMLElement>('.roadmap-tag')!
    const neighbourDescription =
      document.querySelector<HTMLElement>('.nb-desc')!
    const neighbourTitle = document.querySelector<HTMLElement>('.nb-name')!
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize
    )
    const readFontSize = (selector: string) =>
      Number.parseFloat(
        getComputedStyle(document.querySelector<HTMLElement>(selector)!)
          .fontSize
      )

    return {
      neighbourDescription: readFontSize('.nb-desc'),
      neighbourDescriptionWhiteSpace:
        getComputedStyle(neighbourDescription).whiteSpace,
      neighbourTitle: readFontSize('.nb-name'),
      neighbourTitleWhiteSpace: getComputedStyle(neighbourTitle).whiteSpace,
      roadmapHeight: roadmap.getBoundingClientRect().height,
      roadmapIndex: readFontSize('.roadmap-tag__index'),
      roadmapMinHeight: Number.parseFloat(getComputedStyle(roadmap).minHeight),
      roadmapText: readFontSize('.roadmap-tag__text'),
      rootFontSize,
    }
  })

  expect(typography.roadmapIndex).toBeCloseTo(
    typography.rootFontSize * 1.3333,
    0
  )
  expect(typography.roadmapText).toBeCloseTo(typography.rootFontSize * 0.72, 0)
  expect(typography.roadmapHeight).toBeCloseTo(
    typography.roadmapMinHeight + 2,
    0
  )
  expect(typography.neighbourTitle).toBeCloseTo(
    typography.rootFontSize * 0.76,
    0
  )
  expect(typography.neighbourDescription).toBeCloseTo(
    typography.rootFontSize * 0.48,
    0
  )
  expect(typography.neighbourTitleWhiteSpace).toBe('nowrap')
  expect(typography.neighbourDescriptionWhiteSpace).toBe('normal')
})

test('mobile menu stays above fixed page navigation', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })
  const pageNavigation = page.locator('.detail-sections-nav')
  await expect(pageNavigation).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

  await page.locator('.mobile-menu-icon').click()
  await expect(page.locator('.mobile-menu-panel')).toHaveClass(/\bactive\b/)
  await expect(pageNavigation).toHaveCSS('visibility', 'hidden')

  const menuOwnsNavigationPoint = await pageNavigation.evaluate((nav) => {
    const navBounds = nav.getBoundingClientRect()
    const menuBounds = document
      .querySelector('.mobile-menu-panel')!
      .getBoundingClientRect()
    const topElement = document.elementFromPoint(
      navBounds.left + navBounds.width / 2,
      Math.min(navBounds.bottom, menuBounds.bottom) - 1
    )
    return Boolean(topElement?.closest('.mobile-menu-panel'))
  })
  expect(menuOwnsNavigationPoint).toBe(true)

  await page.locator('.mobile-menu-icon').click()
  await expect(pageNavigation).toBeVisible()
})

test('mobile fixed page navigation hides at the page bottom', async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))

  const routeSamples = [
    { path: '/', selector: '.home-sections-nav' },
    {
      path: '/archive',
      selector: '.sections-fixed-nav:not(.home-sections-nav)',
    },
    { path: '/flanerie/changsha', selector: '.detail-sections-nav' },
  ]

  for (const sample of routeSamples) {
    await page.goto(sample.path, { waitUntil: 'domcontentloaded' })
    const pageNavigation = page.locator(sample.selector)
    await expect(pageNavigation).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

    await expect
      .poll(async () => {
        await page.evaluate(() => {
          const scrollTop =
            Math.max(
              document.body.scrollHeight,
              document.documentElement.scrollHeight
            ) -
            window.innerHeight -
            60
          window.scrollTo(0, scrollTop)
          document.scrollingElement?.scrollTo(0, scrollTop)
          document.documentElement.scrollTop = scrollTop
          document.body.scrollTop = scrollTop
        })
        return pageNavigation.evaluate((element) => ({
          isPageEnd: element.classList.contains('is-page-end'),
          pointerEvents: getComputedStyle(element).pointerEvents,
          visibility: getComputedStyle(element).visibility,
        }))
      })
      .toEqual({
        isPageEnd: true,
        pointerEvents: 'none',
        visibility: 'hidden',
      })

    await page.evaluate(() => {
      const scrollTop = Math.max(
        window.scrollY,
        document.scrollingElement?.scrollTop || 0,
        document.documentElement.scrollTop,
        document.body.scrollTop
      )
      window.scrollTo(0, scrollTop - 100)
      document.scrollingElement?.scrollTo(0, scrollTop - 100)
      document.documentElement.scrollTop = scrollTop - 100
      document.body.scrollTop = scrollTop - 100
    })
    await expect(pageNavigation).not.toHaveClass(/\bis-page-end\b/)
    await expect(pageNavigation).toBeVisible()
  }
})

test('particle background remains active after route navigation', async ({
  page,
}, testInfo) => {
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.about-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await expect(page.locator('.particles-bg')).toHaveAttribute(
    'data-motion-state',
    'running'
  )

  if (testInfo.project.name.includes('mobile')) {
    await page.locator('.mobile-menu-icon').click()
    await page.locator('.mobile-menu-items a[href="/craft"]').click()
  } else {
    await page.locator('.menu-box a[href="/craft"]').click()
  }

  await expect(page.locator('.craft-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect
    .poll(() =>
      page
        .locator('.star-container')
        .evaluate((container) => [
          getComputedStyle(
            container.querySelector('.zodiac-static-art') as Element
          ).animationName,
          (container.querySelector('.particles-bg') as HTMLCanvasElement)
            .dataset.motionState,
        ])
    )
    .toEqual(['none', 'running'])
})

test('particle field stays bounded and uses one Canvas 2D surface', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const particleField = page.locator('.particles-bg')
  await expect(particleField).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })
  await expect(page.locator('.layout-page')).toHaveClass(/\blayout-show\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(particleField).toHaveAttribute('data-motion-state', 'running')

  const metrics = await particleField.evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const container = canvas.closest('.star-container') as HTMLElement
    const particleViewport = canvas.closest('.particle-viewport') as HTMLElement
    const zodiacStage = container.querySelector('.zodiac-stage') as HTMLElement
    const triangleStage = container.querySelector(
      '.zodiac-triangle-stage'
    ) as HTMLElement
    const haloStyle = getComputedStyle(container, '::before')

    return {
      contextAvailable: !!context,
      renderer: canvas.dataset.renderer,
      particleCount: Number(canvas.dataset.particleCount),
      backingWidth: canvas.width,
      backingHeight: canvas.height,
      maxBackingWidth: Math.ceil(rect.width * 1.5),
      maxBackingHeight: Math.ceil(rect.height * 1.5),
      particleLayer: Number(getComputedStyle(particleViewport).zIndex),
      zodiacLayer: Number(getComputedStyle(zodiacStage).zIndex),
      triangleLayer: Number(getComputedStyle(triangleStage).zIndex),
      haloBackground: haloStyle.backgroundImage,
      haloAnimation: haloStyle.animationName,
      haloFilter: haloStyle.filter,
    }
  })

  expect(metrics.contextAvailable).toBe(true)
  expect(metrics.renderer).toBe('canvas-2d')
  expect(metrics.particleCount).toBe(100)
  expect(metrics.backingWidth).toBeLessThanOrEqual(metrics.maxBackingWidth)
  expect(metrics.backingHeight).toBeLessThanOrEqual(metrics.maxBackingHeight)
  expect(metrics.particleLayer).toBeGreaterThan(metrics.zodiacLayer)
  expect(metrics.particleLayer).toBeGreaterThan(metrics.triangleLayer)
  expect(metrics.haloBackground).toContain('repeating-linear-gradient')
  expect(metrics.haloAnimation).toBe('none')
  expect(metrics.haloFilter).toBe('none')
  await expect(page.locator('.star-field, .star-vector-layer')).toHaveCount(0)
})

test('leaving personal bay clears document scroll locks', async ({
  page,
}, testInfo) => {
  await page.goto('/test', { waitUntil: 'domcontentloaded' })
  await expect(
    page.locator('.island-page, .island-mobile-page').first()
  ).toBeVisible({ timeout: PAGE_LOAD_TIMEOUT })

  if (testInfo.project.name.includes('mobile')) {
    await page.locator('.mobile-menu-icon').click()
    await page.locator('.mobile-menu-items a[href="/"]').click()
  } else {
    await page.locator('.menu-box a[href="/"]').click()
  }

  await expect(page.locator('.home-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('body')).not.toHaveClass(
    /island-(?:pc|mobile)-shell/
  )
  await expect(page.locator('html')).not.toHaveClass(
    /mobile-menu-scroll-locked/
  )
  await expect(page.locator('body')).not.toHaveClass(
    /mobile-menu-scroll-locked/
  )
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).overflowY))
    .not.toBe('hidden')
})

test('personal bay keeps its geometry stable throughout route leave', async ({
  page,
}, testInfo) => {
  const isMobileProject = testInfo.project.name.includes('mobile')
  const islandSelector = isMobileProject
    ? '.island-mobile-page'
    : '.island-page'

  await page.goto('/test', { waitUntil: 'domcontentloaded' })
  await expect(page.locator(islandSelector)).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  if (isMobileProject) {
    await page.locator('.mobile-menu-icon').click()
    await expect(page.locator('.mobile-menu-panel')).toHaveClass(/\bactive\b/)
  }

  await page.evaluate((selector) => {
    const probeWindow = window as typeof window & {
      __islandExitGeometryProbe?: IslandExitGeometryProbe
    }
    const readGeometry = (): IslandExitGeometrySample | null => {
      const islandPage = document.querySelector(selector)
      const routerContainer = document.querySelector('.router-container')
      if (!islandPage || !routerContainer) return null

      const pageBounds = islandPage.getBoundingClientRect()
      const routerBounds = routerContainer.getBoundingClientRect()
      return {
        bodyClass: document.body.className,
        pageLeft: pageBounds.left,
        pageTop: pageBounds.top,
        routerLeft: routerBounds.left,
        routerTop: routerBounds.top,
      }
    }

    const initial = readGeometry()
    if (!initial) throw new Error('Personal bay geometry probe is unavailable')

    const probe: IslandExitGeometryProbe = {
      done: false,
      initial,
      samples: [],
    }
    probeWindow.__islandExitGeometryProbe = probe

    let missingFrames = 0
    let sampledFrames = 0
    const sampleFrame = () => {
      const geometry = readGeometry()
      sampledFrames += 1

      if (geometry) {
        probe.samples.push(geometry)
        missingFrames = 0
      } else {
        missingFrames += 1
      }

      if (missingFrames >= 3 || sampledFrames >= 120) {
        probe.done = true
        return
      }

      window.requestAnimationFrame(sampleFrame)
    }

    sampleFrame()
  }, islandSelector)

  const destinationLink = isMobileProject
    ? page.locator('.mobile-menu-items a[href="/craft"]')
    : page.locator('.menu-box a[href="/craft"]')
  await destinationLink.click()
  await expect(page.locator('.craft-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await expect
    .poll(() =>
      page.evaluate(() => {
        const probeWindow = window as typeof window & {
          __islandExitGeometryProbe?: IslandExitGeometryProbe
        }
        return probeWindow.__islandExitGeometryProbe?.done ?? false
      })
    )
    .toBe(true)

  const probe = await page.evaluate(() => {
    const probeWindow = window as typeof window & {
      __islandExitGeometryProbe?: IslandExitGeometryProbe
    }
    return probeWindow.__islandExitGeometryProbe
  })
  expect(probe).toBeDefined()
  expect(probe!.samples.length).toBeGreaterThan(1)
  expect(
    probe!.samples.some((sample) =>
      sample.bodyClass.includes(
        isMobileProject
          ? 'island-mobile-shell-leaving'
          : 'island-pc-shell-leaving'
      )
    )
  ).toBe(true)

  const maxShifts = probe!.samples.reduce(
    (currentMax, sample) => ({
      pageLeft: Math.max(
        currentMax.pageLeft,
        Math.abs(sample.pageLeft - probe!.initial.pageLeft)
      ),
      pageTop: Math.max(
        currentMax.pageTop,
        Math.abs(sample.pageTop - probe!.initial.pageTop)
      ),
      routerLeft: Math.max(
        currentMax.routerLeft,
        Math.abs(sample.routerLeft - probe!.initial.routerLeft)
      ),
      routerTop: Math.max(
        currentMax.routerTop,
        Math.abs(sample.routerTop - probe!.initial.routerTop)
      ),
    }),
    { pageLeft: 0, pageTop: 0, routerLeft: 0, routerTop: 0 }
  )
  expect(maxShifts.pageLeft).toBeLessThanOrEqual(ISLAND_EXIT_MAX_GEOMETRY_SHIFT)
  expect(maxShifts.pageTop).toBeLessThanOrEqual(ISLAND_EXIT_MAX_GEOMETRY_SHIFT)
  expect(maxShifts.routerLeft).toBeLessThanOrEqual(
    ISLAND_EXIT_MAX_GEOMETRY_SHIFT
  )
  expect(maxShifts.routerTop).toBeLessThanOrEqual(
    ISLAND_EXIT_MAX_GEOMETRY_SHIFT
  )
})

test('flanerie detail page renders', async ({ page }) => {
  await page.goto('/flanerie/changsha', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('.flr-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page).toHaveTitle(/长沙|CHANGSHA|FLÂNERIE/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page.locator('.not-found-page')).toHaveCount(0)
})

test('flanerie photos use sequential shutter entrances', async ({ page }) => {
  await page.goto('/flanerie/nanchang', { waitUntil: 'domcontentloaded' })
  const gallery = page.locator('.flr-gallery .media-gallery')
  await gallery.scrollIntoViewIfNeeded()
  await expect(gallery).toHaveClass(/\bis-entered\b/, {
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const shutterAnimations = await gallery.evaluate((element) => {
    const frames = element.querySelectorAll('.media-gallery__frame')
    return [...frames].slice(0, 2).map((frame) => {
      const style = getComputedStyle(frame)
      const cornerStyle = getComputedStyle(frame, '::after')
      return {
        name: style.animationName,
        delay: Number.parseFloat(style.animationDelay),
        cornerName: cornerStyle.animationName,
        cornerBackground: cornerStyle.backgroundImage,
      }
    })
  })

  expect(shutterAnimations).toHaveLength(2)
  expect(
    shutterAnimations.every((animation) =>
      animation.name.includes('media-gallery-shutter-in')
    )
  ).toBeTruthy()
  expect(
    shutterAnimations.every(
      (animation) =>
        animation.cornerName.includes('media-gallery-corners-expand') &&
        !animation.cornerBackground.includes('transparent')
    )
  ).toBeTruthy()
  expect(shutterAnimations[1].delay).toBeGreaterThan(shutterAnimations[0].delay)
})

test('detail back navigation restores the previous scroll position', async ({
  page,
}) => {
  await page.goto('/flanerie', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.flanerie-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const maxScrollTop = await page.evaluate(
    () =>
      Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight
      ) - window.innerHeight
  )
  test.skip(maxScrollTop < 300, 'Page is not tall enough to test scrolling')

  const expectedScrollTop = Math.min(700, maxScrollTop)
  await page.evaluate((top) => {
    window.scrollTo(0, top)
    document.documentElement.scrollTop = top
    document.body.scrollTop = top
  }, expectedScrollTop)
  await expect
    .poll(() =>
      page.evaluate(() =>
        Math.max(
          window.scrollY,
          document.documentElement.scrollTop,
          document.body.scrollTop
        )
      )
    )
    .toBeGreaterThanOrEqual(expectedScrollTop - 1)

  await page
    .locator('.shared-vlog-card[role="button"]')
    .first()
    .evaluate((element: HTMLElement) => element.click())
  await expect(page).toHaveURL(/\/flanerie\/[^/?#]+/)
  await page.locator('.detail-page-header__back').click()
  await expect(page).toHaveURL(/\/flanerie$/)
  await expect
    .poll(() =>
      page.evaluate(
        (expected) =>
          Math.abs(
            Math.max(
              window.scrollY,
              document.documentElement.scrollTop,
              document.body.scrollTop
            ) - expected
          ),
        expectedScrollTop
      )
    )
    .toBeLessThanOrEqual(2)
})

test('merch photography detail page renders', async ({ page }) => {
  await page.goto('/island/merch-photography/pokemondoll', {
    waitUntil: 'domcontentloaded',
  })

  await expect(page.locator('.merch-detail-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await expect(page).toHaveTitle(/MERCH PHOTOGRAPHY|周边摄影/)
})

test('personal bay work cards match their gallery item counts', async ({
  page,
}) => {
  const workModules = [
    { title: '绘画', path: '/island/illustration' },
    { title: '训练家卡', path: '/island/trainer-card' },
  ]

  await page.goto('/test', { waitUntil: 'domcontentloaded' })

  for (const workModule of workModules) {
    const card = page
      .locator('.bay-card:visible, .mobile-bay-card:visible')
      .filter({ hasText: workModule.title })
    await expect(card).toHaveCount(1)
    const cardCount = Number(
      await card
        .locator('.card-count-number, .mobile-card-info b > span')
        .innerText()
    )

    await page.goto(workModule.path, { waitUntil: 'domcontentloaded' })
    const galleryCount = await page.locator('.media-gallery__card').count()

    expect(cardCount).toBe(galleryCount)
    await page.goto('/test', { waitUntil: 'domcontentloaded' })
  }
})

test('image log groups fall back when English labels are missing', async ({
  page,
}) => {
  await page.goto('/island/image-log/million', {
    waitUntil: 'domcontentloaded',
  })

  await expect(page.locator('.image-log-detail-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  await page
    .getByRole('button', { name: 'Switch to English' })
    .evaluate((button: HTMLButtonElement) => button.click())

  await expect
    .poll(() => page.locator('.detail-section-header__label').allTextContents())
    .toEqual(['老房子', '文档', '旧照片'])
})

for (const galleryRoute of [
  '/island/photography',
  '/island/merch-photography/pokemondoll',
]) {
  test(`${galleryRoute} uses the journey detail shutter entrance`, async ({
    page,
  }) => {
    await page.goto(galleryRoute, { waitUntil: 'domcontentloaded' })
    const gallery = page.locator('.media-gallery--staggered').first()
    await expect(gallery).toBeAttached({ timeout: PAGE_LOAD_TIMEOUT })
    await gallery.scrollIntoViewIfNeeded()
    await expect(gallery).toHaveClass(/is-entered/, {
      timeout: PAGE_LOAD_TIMEOUT,
    })

    const entrance = await gallery.evaluate((element) => {
      const cards = [
        ...element.querySelectorAll('.media-gallery__frame'),
      ].slice(0, 2)

      return {
        cardAnimations: cards.map(
          (card) => getComputedStyle(card).animationName
        ),
        cardDelays: cards.map((card) =>
          Number.parseFloat(getComputedStyle(card).animationDelay)
        ),
      }
    })

    expect(
      entrance.cardAnimations.every((name) =>
        name.includes('media-gallery-shutter-in')
      )
    ).toBeTruthy()
    expect(entrance.cardDelays[1]).toBeGreaterThan(entrance.cardDelays[0])
  })
}

test('work detail modal plays text and gallery entrance animations', async ({
  page,
}) => {
  await page.goto('/archive', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.archives-page')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  await page.locator('.shared-work-card').first().click()
  await expect(page.locator('.modal-wrapper-dialog')).toBeVisible()
  await expect(page.locator('.aside-title .typed-text')).toHaveCount(1)

  const galleryAnimation = await page
    .locator('.gallery-carousel')
    .evaluate((element) => getComputedStyle(element).animationName)
  expect(galleryAnimation).toContain('galleryVertical3dIn')

  const confidentialAnimation = await page
    .locator('.confidential-notice')
    .evaluate((element) => getComputedStyle(element, '::after').animationName)
  expect(confidentialAnimation).toContain('confidentialMetalSheen')
})

test('about modules use sequenced entrance animations', async ({ page }) => {
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.changelog-block')).toBeAttached({
    timeout: PAGE_LOAD_TIMEOUT,
  })

  const animation = await page.locator('.changelog-block').evaluate((block) => {
    const aboutPage = block.closest('.about-page')!
    const items = [...block.querySelectorAll('.timeline-item')]
    const headerStyle = getComputedStyle(
      block.querySelector('.section-header') as Element
    )
    const passionStyle = getComputedStyle(
      aboutPage.querySelector('.passion-back') as Element
    )
    const passionLogo = aboutPage.querySelector(
      '.passion-logo-bg'
    ) as HTMLElement
    const passionLogoStyle = getComputedStyle(passionLogo)
    const passionLogoKeyframes =
      (
        passionLogo.getAnimations()[0]?.effect as KeyframeEffect | undefined
      )?.getKeyframes() ?? []
    const neighborsBlock = aboutPage.querySelector('.neighbors-block')
    const neighborsBlockStyle = getComputedStyle(neighborsBlock as Element)
    return {
      headerName: headerStyle.animationName,
      headerDelay: Number.parseFloat(headerStyle.animationDelay),
      itemNames: items.map((item) => getComputedStyle(item).animationName),
      itemDelays: items.map((item) =>
        Number.parseFloat(getComputedStyle(item).animationDelay)
      ),
      itemDurations: items.map((item) =>
        Number.parseFloat(getComputedStyle(item).animationDuration)
      ),
      passionName: passionStyle.animationName,
      passionDelay: Number.parseFloat(passionStyle.animationDelay),
      passionDuration: Number.parseFloat(passionStyle.animationDuration),
      passionLogoName: passionLogoStyle.animationName,
      passionLogoDelay: Number.parseFloat(passionLogoStyle.animationDelay),
      passionLogoDuration: Number.parseFloat(
        passionLogoStyle.animationDuration
      ),
      passionLogoKeyframeCount: passionLogoKeyframes.length,
      neighborsBlockName: neighborsBlockStyle.animationName,
      neighborsBlockDelay: Number.parseFloat(
        neighborsBlockStyle.animationDelay
      ),
    }
  })

  expect(animation.headerName).toContain('changelogHeaderIn')
  expect(animation.passionName).toContain('passionCrtOn')
  expect(animation.passionLogoName).toContain('passionLogoDropIn')
  expect(animation.passionDelay).toBeGreaterThan(animation.headerDelay)
  expect(animation.passionDelay - animation.headerDelay).toBeLessThanOrEqual(
    0.2
  )
  expect(animation.passionLogoDelay).toBeGreaterThanOrEqual(
    animation.passionDelay + animation.passionDuration
  )
  expect(animation.passionLogoDuration).toBeGreaterThan(1.7)
  expect(animation.passionLogoKeyframeCount).toBe(2)
  expect(animation.neighborsBlockName).toContain('neighborsBlockIn')
  expect(animation.neighborsBlockDelay).toBeGreaterThanOrEqual(
    animation.passionDelay + animation.passionDuration
  )
  expect(
    animation.itemNames.every((name) => name.includes('changelogItemIn'))
  ).toBeTruthy()
  expect(animation.itemDelays[0] - animation.headerDelay).toBeLessThanOrEqual(
    0.16
  )
  expect(animation.itemDelays[1]).toBeGreaterThan(animation.itemDelays[0])

  await expect
    .poll(() =>
      page.locator('.passion-logo-bg canvas').evaluate((canvas) => {
        const element = canvas as HTMLCanvasElement
        const bounds = element.getBoundingClientRect()
        return Math.min(
          element.width,
          element.height,
          bounds.width,
          bounds.height
        )
      })
    )
    .toBeGreaterThan(0)
})

test('about friend links use responsive rows and reveal complete descriptions on hover', async ({
  page,
}, testInfo) => {
  const isMobile = testInfo.project.name.includes('mobile')
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  const grid = page.locator('.neighbors-grid')
  const cards = grid.locator('.neighbor-card')

  await expect(cards).toHaveCount(2, { timeout: PAGE_LOAD_TIMEOUT })
  await cards.first().scrollIntoViewIfNeeded()

  const metrics = await grid.evaluate((element) => {
    const gridBounds = element.getBoundingClientRect()
    const rows = [...element.querySelectorAll('.neighbor-card')].map((card) => {
      const bounds = card.getBoundingClientRect()
      const description = card.querySelector('.nb-desc') as HTMLElement
      const logo = card.querySelector('.nb-logo img') as HTMLImageElement
      const centeredContent = card
        .querySelector('.nb-centered-content')!
        .getBoundingClientRect()
      const headingBounds = card
        .querySelector('.nb-heading')!
        .getBoundingClientRect()
      const logoBounds = card.querySelector('.nb-logo')!.getBoundingClientRect()

      return {
        bottom: bounds.bottom,
        centeredContentOffset:
          centeredContent.left +
          centeredContent.width / 2 -
          (bounds.left + bounds.width / 2),
        description: description.textContent?.trim() ?? '',
        descriptionClipPath: getComputedStyle(description).clipPath,
        descriptionOpacity: getComputedStyle(description).opacity,
        descriptionWhiteSpace: getComputedStyle(description).whiteSpace,
        dividerAfterHeight: Number.parseFloat(
          getComputedStyle(card.parentElement!, '::after').height
        ),
        dividerBeforeWidth: Number.parseFloat(
          getComputedStyle(card.parentElement!, '::before').width
        ),
        headingTextAlign: getComputedStyle(
          card.querySelector('.nb-heading') as Element
        ).textAlign,
        host: card.querySelector('.nb-host')?.textContent?.trim() ?? '',
        href: (card as HTMLAnchorElement).href,
        headingCenterY: headingBounds.top + headingBounds.height / 2,
        left: bounds.left,
        logoAlt: logo.alt,
        logoCenterY: logoBounds.top + logoBounds.height / 2,
        name: card.querySelector('.nb-name')?.textContent?.trim() ?? '',
        cardBorderBottomWidth: Number.parseFloat(
          getComputedStyle(card).borderBottomWidth
        ),
        right: bounds.right,
        top: bounds.top,
        width: bounds.width,
      }
    })

    return {
      columnGap: Number.parseFloat(getComputedStyle(element).columnGap),
      gridBorderTopWidth: Number.parseFloat(
        getComputedStyle(element).borderTopWidth
      ),
      gridWidth: gridBounds.width,
      rows,
    }
  })

  expect(metrics.rows).toHaveLength(2)
  expect(metrics.gridBorderTopWidth).toBe(0)
  expect(
    metrics.rows.every(
      ({ cardBorderBottomWidth }) => cardBorderBottomWidth === 0
    )
  ).toBe(true)
  if (isMobile) {
    expect(
      metrics.rows.every(({ width }) => Math.abs(width - metrics.gridWidth) < 1)
    ).toBe(true)
    expect(metrics.rows[1].top).toBeGreaterThanOrEqual(
      metrics.rows[0].bottom - 1
    )
    expect(metrics.rows[1].dividerAfterHeight).toBeGreaterThan(0)
  } else {
    const expectedCardWidth = (metrics.gridWidth - metrics.columnGap * 2) / 3
    expect(
      metrics.rows.every(({ width }) => Math.abs(width - expectedCardWidth) < 1)
    ).toBe(true)
    expect(Math.abs(metrics.rows[1].top - metrics.rows[0].top)).toBeLessThan(1)
    expect(metrics.rows[1].left).toBeGreaterThanOrEqual(metrics.rows[0].right)
    expect(metrics.rows[1].dividerBeforeWidth).toBeGreaterThan(0)
  }
  expect(
    metrics.rows.every(
      ({
        centeredContentOffset,
        description,
        descriptionClipPath,
        descriptionOpacity,
        descriptionWhiteSpace,
        headingTextAlign,
        host,
        href,
        logoAlt,
        name,
      }) =>
        Boolean(description && host && href && logoAlt && name) &&
        (isMobile || Math.abs(centeredContentOffset) < 1) &&
        descriptionWhiteSpace === 'normal' &&
        (isMobile
          ? descriptionOpacity === '1' && descriptionClipPath === 'none'
          : descriptionOpacity === '0' &&
            descriptionClipPath.includes('100%')) &&
        headingTextAlign === (isMobile ? 'left' : 'center')
    )
  ).toBe(true)

  await cards.first().hover()
  await expect(cards.first().locator('.nb-name')).toHaveCSS(
    'color',
    'rgb(5, 5, 5)'
  )
  await expect(cards.first().locator('.nb-host')).toHaveCSS(
    'color',
    'rgb(22, 56, 199)'
  )
  await expect(cards.first().locator('.nb-desc')).toHaveCSS('opacity', '1')
  if (isMobile) {
    await expect(cards.first().locator('.nb-desc')).toHaveCSS(
      'clip-path',
      'none'
    )
    await expect(cards.first().locator('.nb-logo')).toHaveCSS('opacity', '1')
  } else {
    await expect(cards.first().locator('.nb-desc')).toHaveCSS(
      'clip-path',
      'inset(0px)'
    )
    await expect(cards.first().locator('.nb-logo')).toHaveCSS('opacity', '0')
    const swappedPositions = await cards.first().evaluate((card) => {
      const heading = card.querySelector('.nb-heading')!.getBoundingClientRect()
      const description = card
        .querySelector('.nb-desc')!
        .getBoundingClientRect()
      return {
        descriptionCenterY: description.top + description.height / 2,
        headingCenterY: heading.top + heading.height / 2,
      }
    })
    expect(
      swappedPositions.headingCenterY - metrics.rows[0].logoCenterY
    ).toBeGreaterThan(6)
    expect(
      swappedPositions.headingCenterY - metrics.rows[0].logoCenterY
    ).toBeLessThan(10)
    expect(swappedPositions.descriptionCenterY).toBeGreaterThan(
      swappedPositions.headingCenterY
    )
  }
  await expect
    .poll(() =>
      cards
        .first()
        .evaluate((card) => getComputedStyle(card, '::after').transform)
    )
    .toMatch(/^matrix\(1, 0, 0, 1, 0, 0\)$/)

  for (const card of await cards.all()) {
    await card.hover()
    await expect(card.locator('.nb-desc')).toHaveCSS('opacity', '1')
    expect(
      await card.evaluate((element) => element.getBoundingClientRect().height)
    ).toBeLessThan(220)
    await expect
      .poll(() =>
        card.locator('.nb-desc').evaluate((description) => {
          const element = description as HTMLElement
          return (
            element.scrollHeight <= element.clientHeight + 1 &&
            element.scrollWidth <= element.clientWidth + 1
          )
        })
      )
      .toBe(true)
  }
})

test('about page keeps a free-scrolling full-height hero above an aligned 2:1 updates grid', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))
  await page.goto('/about', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('.about-updates-grid')).toBeVisible({
    timeout: PAGE_LOAD_TIMEOUT,
  })
  const metrics = await page.locator('.about-updates-grid').evaluate((grid) => {
    const aboutPage = grid.closest('.about-page')!
    const animatedBlocks = grid.querySelectorAll(
      '.changelog-block, .roadmap-block'
    )
    animatedBlocks.forEach((block) =>
      block
        .getAnimations({ subtree: true })
        .forEach((animation) => animation.finish())
    )
    const bounds = grid.getBoundingClientRect()
    const heroBounds = aboutPage
      .querySelector('.about-hero-section')!
      .getBoundingClientRect()
    const passionSection = aboutPage.querySelector('.passion-section')!
    const passionBounds = passionSection.getBoundingClientRect()
    const passionBack = passionSection.querySelector('.passion-back')!
    const passionCrosshair = passionSection.querySelector('.passion-crosshair')!
    const passionContent = passionSection.querySelector('.passion-content')!
    const passionContentBounds = passionContent.getBoundingClientRect()
    const passionLogo = passionSection.querySelector(
      '.passion-logo-bg'
    ) as HTMLElement
    const passionLogoBounds = passionLogo.getBoundingClientRect()
    const scrollHint = aboutPage.querySelector('.about-scroll-hint')!
    const scrollHintBounds = scrollHint.getBoundingClientRect()
    const passionCodeFontSize = Number.parseFloat(
      getComputedStyle(passionSection.querySelector('.passion-color-code')!)
        .fontSize
    )
    const changelog = grid.querySelector('.changelog-block')!
    const changelogBounds = changelog.getBoundingClientRect()
    const changelogHeaderBounds = changelog
      .querySelector('.section-header')!
      .getBoundingClientRect()
    const changelogEnglishSize = Number.parseFloat(
      getComputedStyle(changelog.querySelector('.section-title .changelog')!)
        .fontSize
    )
    const roadmap = grid.querySelector('.roadmap-block')!
    const roadmapBounds = roadmap.getBoundingClientRect()
    const roadmapHeaderBounds = roadmap
      .querySelector('.section-header')!
      .getBoundingClientRect()
    const roadmapEnglishSize = Number.parseFloat(
      getComputedStyle(roadmap.querySelector('.section-title .changelog')!)
        .fontSize
    )
    const roadmapTagLefts = [...roadmap.querySelectorAll('.roadmap-tag')].map(
      (tag) => tag.getBoundingClientRect().left
    )
    const passionBackMask = getComputedStyle(passionBack).maskImage
    const passionCrosshairMask = getComputedStyle(passionCrosshair).maskImage
    const passionLogoMask = getComputedStyle(passionLogo).maskImage

    return {
      changelogEnglishSize,
      changelogHeaderHeight: changelogHeaderBounds.height,
      changelogHeaderTop: changelogHeaderBounds.top,
      changelogTop: changelogBounds.top,
      columnsRatio: changelogBounds.width / roadmapBounds.width,
      defaultChangelogCount: grid.querySelectorAll(
        '.timeline-item:not(.is-changelog-preview)'
      ).length,
      heroBottom: heroBounds.bottom,
      heroHeight: heroBounds.height,
      heroTop: heroBounds.top,
      jumpControlCount: aboutPage.querySelectorAll('.about-screen-jump').length,
      passionBackMask,
      passionCodeFontSize,
      passionContentBottomGap:
        passionBounds.bottom - passionContentBounds.bottom,
      passionCopyCount: passionSection.querySelectorAll('.passion-copy').length,
      passionCrosshairMask,
      passionBottom: passionBounds.bottom,
      passionHeight: passionBounds.height,
      passionLogoAspectRatio:
        passionLogo.offsetWidth / passionLogo.offsetHeight,
      passionLogoMask,
      passionLogoTop: passionLogoBounds.top,
      passionTop: passionBounds.top,
      passionWidth: passionBounds.width,
      roadmapEnglishSize,
      roadmapHeaderHeight: roadmapHeaderBounds.height,
      roadmapHeaderTop: roadmapHeaderBounds.top,
      roadmapTagLefts,
      roadmapTagTitle:
        roadmap
          .querySelector('.section-title .changelog')
          ?.textContent?.trim() ?? '',
      changelogTagTitle:
        changelog
          .querySelector('.section-title .changelog')
          ?.textContent?.trim() ?? '',
      roadmapTop: roadmapBounds.top,
      scrollHintBottom: scrollHintBounds.bottom,
      scrollHintText: scrollHint.textContent?.trim() ?? '',
      scrollHintTop: scrollHintBounds.top,
      updatesDocumentTop: bounds.top + document.body.scrollTop,
      updatesTop: bounds.top,
      viewportHeight: window.innerHeight,
      width: bounds.width,
      secondaryTitleCount: grid.querySelectorAll('.section-title > .cn').length,
      previewChangelogCount: grid.querySelectorAll(
        '.timeline-item.is-changelog-preview'
      ).length,
    }
  })

  expect(metrics.heroHeight).toBeCloseTo(
    metrics.viewportHeight - metrics.heroTop,
    0
  )
  expect(metrics.heroBottom).toBeCloseTo(metrics.viewportHeight, 0)
  expect(metrics.updatesTop).toBeCloseTo(metrics.heroBottom, 0)
  expect(metrics.jumpControlCount).toBe(0)
  expect(metrics.scrollHintText).toBe('向下滚动')
  expect(metrics.scrollHintTop).toBeGreaterThanOrEqual(
    metrics.passionBottom - 1
  )
  expect(metrics.scrollHintBottom).toBeLessThan(metrics.heroBottom)
  expect(metrics.heroBottom - metrics.scrollHintBottom).toBeGreaterThan(28)
  expect(metrics.defaultChangelogCount).toBe(3)
  expect(metrics.previewChangelogCount).toBe(1)
  expect(metrics.passionBackMask).toContain('linear-gradient')
  expect(metrics.passionCrosshairMask).toContain('linear-gradient')
  expect(metrics.passionLogoMask).toBe('none')
  expect(metrics.passionLogoAspectRatio).toBeCloseTo(1, 2)
  expect(metrics.passionLogoTop).toBeLessThan(metrics.passionTop)
  expect(metrics.passionTop).toBeLessThan(metrics.changelogTop)
  expect(metrics.passionCopyCount).toBe(0)
  expect(metrics.passionCodeFontSize).toBeGreaterThan(60)
  expect(metrics.passionContentBottomGap).toBeGreaterThan(40)
  expect(Math.abs(metrics.changelogTop - metrics.roadmapTop)).toBeLessThan(1)
  expect(
    Math.abs(metrics.changelogHeaderTop - metrics.roadmapHeaderTop)
  ).toBeLessThan(1)
  expect(metrics.changelogHeaderTop - metrics.updatesTop).toBeCloseTo(0, 0)
  expect(metrics.changelogHeaderHeight).toBe(metrics.roadmapHeaderHeight)
  expect(metrics.changelogEnglishSize).toBe(metrics.roadmapEnglishSize)
  expect(metrics.secondaryTitleCount).toBe(0)
  expect(metrics.columnsRatio).toBeCloseTo(2, 1)
  expect(metrics.passionWidth).toBeCloseTo(metrics.width, 0)
  expect(metrics.heroBottom - metrics.passionBottom).toBeGreaterThan(65)
  expect(metrics.heroBottom - metrics.passionBottom).toBeLessThan(100)
  expect(metrics.passionHeight).toBeGreaterThan(metrics.width / 2.7)
  expect(new Set(metrics.roadmapTagLefts.map(Math.round)).size).toBe(1)
  expect(metrics.changelogTagTitle).toBe('< 更新日志 />')
  expect(metrics.roadmapTagTitle).toBe('< 未来更新 />')

  const passionSection = page.locator('.passion-section')
  await passionSection.hover({ position: { x: 100, y: 80 } })
  await expect(passionSection).toHaveClass(/\bis-crosshair-active\b/)
  const crosshairPosition = await passionSection.evaluate((section) => ({
    x: Number.parseFloat(section.style.getPropertyValue('--passion-cross-x')),
    y: Number.parseFloat(section.style.getPropertyValue('--passion-cross-y')),
  }))
  expect(Math.abs(crosshairPosition.x - 100)).toBeLessThanOrEqual(1)
  expect(Math.abs(crosshairPosition.y - 80)).toBeLessThanOrEqual(1)
  await page.mouse.move(0, 0)
  await expect(passionSection).not.toHaveClass(/\bis-crosshair-active\b/)

  await page.mouse.wheel(0, 160)
  await page.waitForTimeout(120)
  const nativeScrollTop = await page.evaluate(() => document.body.scrollTop)
  expect(nativeScrollTop).toBeGreaterThan(0)
  expect(nativeScrollTop).toBeLessThan(metrics.updatesDocumentTop - 40)
})

test('about hero keeps its title, passion panel, and screen spacing across viewport sizes', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name.includes('mobile'))

  for (const viewport of [
    { width: 1280, height: 560 },
    { width: 844, height: 390 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/about', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.about-hero-section')).toBeVisible({
      timeout: PAGE_LOAD_TIMEOUT,
    })

    const metrics = await page
      .locator('.about-hero-section')
      .evaluate((hero) => {
        const heroBounds = hero.getBoundingClientRect()
        const titleBounds = hero
          .querySelector('.page-hero-title')!
          .getBoundingClientRect()
        const passionSection = hero.querySelector('.passion-section')!
        const passionBounds = passionSection.getBoundingClientRect()
        const passionLogo = passionSection.querySelector(
          '.passion-logo-bg'
        ) as HTMLElement
        passionLogo.getAnimations().forEach((animation) => animation.finish())
        const passionLogoBounds = passionLogo.getBoundingClientRect()
        const passionLogoStyle = getComputedStyle(passionLogo)
        const passionContent = passionSection.querySelector(
          '.passion-content'
        ) as HTMLElement
        const passionCanvasTransform = getComputedStyle(
          passionLogo.querySelector('canvas')!
        ).transform
        const passionCodeFontSize = Number.parseFloat(
          getComputedStyle(passionSection.querySelector('.passion-color-code')!)
            .fontSize
        )
        const passionNameStyle = getComputedStyle(
          passionSection.querySelector('.passion-field-name')!
        )
        const passionNameFontSize = Number.parseFloat(
          getComputedStyle(
            passionSection.querySelector('.passion-field-name strong')!
          ).fontSize
        )
        const passionMetaStyle = getComputedStyle(
          passionSection.querySelector('.passion-field-meta')!
        )
        const updates = document.querySelector('.about-updates-grid')!
        const updatesBounds = updates.getBoundingClientRect()
        const scrollHintBounds = hero
          .querySelector('.about-scroll-hint')!
          .getBoundingClientRect()

        return {
          heroBottom: heroBounds.bottom,
          heroTop: heroBounds.top,
          passionBottom: passionBounds.bottom,
          passionHeight: passionBounds.height,
          passionCanvasScaleX: new DOMMatrixReadOnly(passionCanvasTransform).a,
          passionCodeFontSize,
          passionContentTransform: getComputedStyle(passionContent).transform,
          passionLogoAnchorRatio:
            Number.parseFloat(passionLogoStyle.top) / passionBounds.height,
          passionLogoCenterLift:
            passionBounds.top +
            passionBounds.height / 2 -
            (passionLogoBounds.top + passionLogoBounds.height / 2),
          passionMetaAlignment: passionMetaStyle.justifyContent,
          passionNameAlignment: passionNameStyle.justifyContent,
          passionNameFontSize,
          passionTop: passionBounds.top,
          scrollHintBottom: scrollHintBounds.bottom,
          scrollHintTop: scrollHintBounds.top,
          secondScreenPaddingTop: Number.parseFloat(
            getComputedStyle(updates).paddingTop
          ),
          titleBottom: titleBounds.bottom,
          titleHeight: titleBounds.height,
          titleTop: titleBounds.top,
          updatesTop: updatesBounds.top,
          viewportHeight: window.innerHeight,
        }
      })

    expect(metrics.heroBottom).toBeCloseTo(metrics.viewportHeight, 0)
    expect(metrics.updatesTop).toBeCloseTo(metrics.heroBottom, 0)
    expect(metrics.titleTop).toBeGreaterThanOrEqual(metrics.heroTop - 1)
    expect(metrics.titleHeight).toBeGreaterThan(0)
    expect(metrics.passionTop).toBeGreaterThanOrEqual(metrics.titleBottom - 1)
    expect(metrics.passionHeight).toBeGreaterThan(0)
    expect(metrics.passionLogoAnchorRatio).toBeCloseTo(0.5, 2)
    if (viewport.width <= 768) {
      expect(metrics.passionLogoCenterLift).toBeCloseTo(0, 1)
      expect(metrics.passionCanvasScaleX).toBeCloseTo(4, 2)
      expect(metrics.passionContentTransform).toBe('none')
      expect(metrics.passionNameAlignment).toBe('center')
      expect(metrics.passionMetaAlignment).toBe('center')
      expect(metrics.passionCodeFontSize).toBeGreaterThan(
        metrics.passionNameFontSize * 4
      )
      expect(metrics.scrollHintTop - metrics.passionBottom).toBeGreaterThan(18)
    } else {
      expect(metrics.passionLogoCenterLift / viewport.width).toBeCloseTo(
        0.0955,
        2
      )
    }
    expect(metrics.passionBottom).toBeLessThan(metrics.heroBottom - 25)
    expect(metrics.scrollHintTop).toBeGreaterThanOrEqual(
      metrics.passionBottom - 3
    )
    expect(metrics.scrollHintBottom).toBeLessThan(metrics.heroBottom)
    expect(metrics.secondScreenPaddingTop).toBe(0)
  }
})

const craftToolRoutes = [
  {
    path: '/colorPalette',
    selector: '.palette-tool',
    title: /COLOR EXTRACTOR|配色提取器/,
  },
  {
    path: '/easeStudio',
    selector: '.ease-tool',
    title: /EASE STUDIO|可视化贝塞尔曲线调整/,
  },
  {
    path: '/metronome',
    selector: '.metronome-tool',
    title: /METRONOME|节拍器/,
  },
  {
    path: '/bounceDynamics',
    selector: '.bounce-tool',
    title: /BOUNCING BALL|弹力球/,
  },
  {
    path: '/htmlEntities',
    selector: '.entity-tool',
    title: /HTML ENTITIES|HTML常用转义字符/,
  },
  {
    path: '/base64Codec',
    selector: '.codec-tool',
    title: /BASE64 CODEC|Base64加解密/,
  },
  {
    path: '/imageBase64',
    selector: '.image64-tool',
    title: /IMAGE BASE64|图片转Base64/,
  },
]

test.describe('craft tool pages', () => {
  for (const route of craftToolRoutes) {
    test(`${route.path} renders tool page`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })

      await expect(page.locator(route.selector)).toBeVisible({
        timeout: PAGE_LOAD_TIMEOUT,
      })
      await expect(page).toHaveTitle(route.title, {
        timeout: PAGE_LOAD_TIMEOUT,
      })
      await expect(page.locator('.not-found-page')).toHaveCount(0)
    })
  }
})
