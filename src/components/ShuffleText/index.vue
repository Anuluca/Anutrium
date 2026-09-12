<template>
  <component
    :is="tag"
    ref="elementRef"
    class="shuffle-text"
    :aria-label="text"
    @mouseenter="handleOwnHover"
  >
    {{ text }}
  </component>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(SplitText)

type ShuffleDirection = 'left' | 'right' | 'up' | 'down'
type TagName = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span'

interface Props {
  text: string
  tag?: TagName
  shuffleDirection?: ShuffleDirection
  duration?: number
  shuffleTimes?: number
  ease?: string
  stagger?: number
  scrambleCharset?: string
  triggerOnHover?: boolean
  respectReducedMotion?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  tag: 'span',
  shuffleDirection: 'right',
  duration: 0.35,
  shuffleTimes: 1,
  ease: 'power3.out',
  stagger: 0.03,
  scrambleCharset: '',
  triggerOnHover: true,
  respectReducedMotion: true,
})

const elementRef = ref<HTMLElement | null>(null)
let splitText: SplitText | null = null
let wrappers: HTMLElement[] = []
let timeline: gsap.core.Timeline | null = null
let isPlaying = false

const randomCharacter = () => {
  if (!props.scrambleCharset) return ''
  const index = Math.floor(Math.random() * props.scrambleCharset.length)
  return props.scrambleCharset.charAt(index)
}

const restoreOriginalText = () => {
  wrappers.forEach((wrapper) => {
    const original = wrapper.querySelector<HTMLElement>('[data-original-char]')
    if (original && wrapper.parentNode) {
      wrapper.parentNode.replaceChild(original, wrapper)
    }
  })
  wrappers = []

  try {
    splitText?.revert()
  } catch {
    // SplitText may already be reverted after a reactive text replacement.
  }
  splitText = null
  isPlaying = false
}

const teardown = () => {
  timeline?.kill()
  timeline = null
  restoreOriginalText()
}

const buildCharacterStrips = () => {
  const element = elementRef.value
  if (!element) return []

  teardown()
  splitText = new SplitText(element, {
    type: 'chars',
    charsClass: 'shuffle-text__character',
    smartWrap: true,
    reduceWhiteSpace: false,
  })

  const characters = (splitText.chars ?? []) as HTMLElement[]
  const isVertical =
    props.shuffleDirection === 'up' || props.shuffleDirection === 'down'
  const rolls = Math.max(1, Math.floor(props.shuffleTimes))
  const strips: HTMLElement[] = []

  characters.forEach((character) => {
    const parent = character.parentElement
    if (!parent) return

    const bounds = character.getBoundingClientRect()
    const characterStyles = window.getComputedStyle(character)
    const fontSize = Number.parseFloat(characterStyles.fontSize) || 0
    const lineHeight = Number.parseFloat(characterStyles.lineHeight) || 0
    const verticalBleed = Math.max(1, fontSize * 0.08)
    const clipHeight = isVertical
      ? Math.max(bounds.height, lineHeight, fontSize) + verticalBleed
      : bounds.height
    const characterSize = isVertical ? clipHeight : bounds.width
    if (!characterSize) return

    const wrapper = document.createElement('span')
    const strip = document.createElement('span')
    wrapper.className = `shuffle-text__clip shuffle-text__clip--${
      isVertical ? 'vertical' : 'horizontal'
    }`
    strip.className = 'shuffle-text__strip'
    Object.assign(wrapper.style, {
      width: `${bounds.width}px`,
      height: `${clipHeight}px`,
      marginInlineEnd: isVertical ? `${bounds.height - clipHeight}px` : '0px',
      verticalAlign: 'bottom',
    })

    parent.insertBefore(wrapper, character)
    wrapper.appendChild(strip)

    const firstCopy = character.cloneNode(true) as HTMLElement
    firstCopy.removeAttribute('data-original-char')
    strip.appendChild(firstCopy)

    for (let index = 0; index < rolls; index += 1) {
      const copy = character.cloneNode(true) as HTMLElement
      copy.removeAttribute('data-original-char')
      if (props.scrambleCharset) copy.textContent = randomCharacter()
      strip.appendChild(copy)
    }

    character.dataset.originalChar = 'true'
    strip.appendChild(character)

    Array.from(strip.children).forEach((child) => {
      const glyph = child as HTMLElement
      glyph.className = 'shuffle-text__glyph'
      Object.assign(glyph.style, {
        width: `${bounds.width}px`,
        height: `${clipHeight}px`,
        display: isVertical ? 'block' : 'inline-block',
      })
    })

    const steps = rolls + 1
    const start =
      props.shuffleDirection === 'right' || props.shuffleDirection === 'down'
        ? -steps * characterSize
        : 0
    const end =
      props.shuffleDirection === 'left' || props.shuffleDirection === 'up'
        ? -steps * characterSize
        : 0

    if (
      props.shuffleDirection === 'right' ||
      props.shuffleDirection === 'down'
    ) {
      const original = strip.lastElementChild
      if (original) strip.insertBefore(original, strip.firstChild)
    }

    strip.dataset.shuffleStart = String(start)
    strip.dataset.shuffleEnd = String(end)
    gsap.set(strip, {
      [isVertical ? 'y' : 'x']: start,
      force3D: true,
    })

    wrappers.push(wrapper)
    strips.push(strip)
  })

  return strips
}

const play = async () => {
  if (isPlaying || !elementRef.value) return
  if (
    props.respectReducedMotion &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return
  }

  if ('fonts' in document && document.fonts.status !== 'loaded') {
    await document.fonts.ready
  }

  const strips = buildCharacterStrips()
  if (!strips.length) return

  isPlaying = true
  const isVertical =
    props.shuffleDirection === 'up' || props.shuffleDirection === 'down'
  const property = isVertical ? 'y' : 'x'
  const odd = strips.filter((_, index) => index % 2 === 1)
  const even = strips.filter((_, index) => index % 2 === 0)
  const oddDuration =
    props.duration + Math.max(0, odd.length - 1) * props.stagger

  timeline = gsap.timeline({
    onComplete: () => {
      timeline = null
      restoreOriginalText()
    },
  })

  const addTween = (targets: HTMLElement[], position: number) => {
    if (!targets.length) return
    timeline?.to(
      targets,
      {
        [property]: (_index: number, strip: HTMLElement) =>
          Number(strip.dataset.shuffleEnd ?? 0),
        duration: props.duration,
        ease: props.ease,
        stagger: props.stagger,
        force3D: true,
      },
      position
    )
  }

  addTween(odd, 0)
  addTween(even, odd.length ? oddDuration * 0.7 : 0)
}

const handleOwnHover = () => {
  if (props.triggerOnHover) void play()
}

watch(
  () => props.text,
  () => {
    teardown()
    if (elementRef.value) elementRef.value.textContent = props.text
  },
  { flush: 'post' }
)

defineExpose({ play })

onBeforeUnmount(teardown)
</script>

<style scoped lang="less">
.shuffle-text {
  display: inline;
}

:deep(.shuffle-text__clip) {
  display: inline-block;
  text-align: left;
}

:deep(.shuffle-text__clip--horizontal) {
  overflow-x: clip;
  overflow-y: visible;
}

:deep(.shuffle-text__clip--vertical) {
  overflow: clip;
}

:deep(.shuffle-text__strip) {
  display: inline-block;
  white-space: nowrap;
  transform-origin: left center;
  will-change: transform;
}
</style>
