<template>
  <div
    ref="containerRef"
    class="bounce-cards"
    :style="{
      width: toCssLength(containerWidth),
      height: toCssLength(containerHeight),
      '--bounce-card-width': toCssLength(cardWidth),
      justifyContent: contentAlign,
    }"
    role="list"
  >
    <div
      v-for="(item, index) in items"
      :key="item.id"
      class="bounce-cards__item"
      :style="{ transform: transformStyles[index] ?? 'none' }"
      role="listitem"
      @mouseenter="pushSiblings(index)"
      @mouseleave="resetSiblings"
    >
      <slot :item="item" :index="index" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'
import { gsap } from 'gsap'

export interface BounceCardItem {
  id: string
}

interface Props {
  items: BounceCardItem[]
  containerWidth?: number | string
  containerHeight?: number | string
  cardWidth?: number | string
  animationDelay?: number
  animationStagger?: number
  easeType?: string
  transformStyles?: string[]
  enableHover?: boolean
  hoverPushDistance?: number
  entranceActive?: boolean
  contentAlign?: 'flex-start' | 'center' | 'flex-end'
}

const props = withDefaults(defineProps<Props>(), {
  containerWidth: 400,
  containerHeight: 400,
  cardWidth: 200,
  animationDelay: 0.5,
  animationStagger: 0.06,
  easeType: 'elastic.out(1, 0.8)',
  transformStyles: () => [
    'translateX(-170px) rotate(10deg)',
    'translateX(-85px) rotate(5deg)',
    'rotate(-3deg)',
    'translateX(85px) rotate(-10deg)',
    'translateX(170px) rotate(2deg)',
  ],
  enableHover: false,
  hoverPushDistance: 80,
  entranceActive: true,
  contentAlign: 'center',
})

const containerRef = ref<HTMLElement | null>(null)
const reducedMotion = usePreferredReducedMotion()
let hasPlayedEntrance = false

const toCssLength = (value: number | string) =>
  typeof value === 'number' ? `${value}px` : value

const getCards = () =>
  Array.from(containerRef.value?.children ?? []) as HTMLElement[]

const getBaseTransform = (index: number) =>
  props.transformStyles[index] ?? 'none'

const removeRotation = (transform: string) => {
  if (transform === 'none') return 'rotate(0deg)'
  if (!/rotate\([^)]*\)/.test(transform)) return `${transform} rotate(0deg)`
  return transform.replace(/rotate\([^)]*\)/, 'rotate(0deg)')
}

const addHorizontalOffset = (transform: string, offset: number) => {
  return transform === 'none'
    ? `translateX(${offset}px)`
    : `translateX(${offset}px) ${transform}`
}

const prepareEntrance = () => {
  const cards = getCards()
  gsap.killTweensOf(cards)
  gsap.set(cards, { scale: 0, transformOrigin: 'center center' })
}

const playEntrance = async () => {
  if (hasPlayedEntrance || !props.entranceActive) return

  await nextTick()
  const cards = getCards()
  if (!cards.length) return

  hasPlayedEntrance = true
  if (reducedMotion.value === 'reduce') {
    gsap.set(cards, { scale: 1 })
    return
  }

  gsap.killTweensOf(cards)
  gsap.fromTo(
    cards,
    { scale: 0, transformOrigin: 'center center' },
    {
      scale: 1,
      duration: 0.8,
      stagger: props.animationStagger,
      ease: props.easeType,
      delay: props.animationDelay,
      overwrite: 'auto',
    }
  )
}

const pushSiblings = (hoveredIndex: number) => {
  if (!props.enableHover || !hasPlayedEntrance) return

  getCards().forEach((card, index) => {
    gsap.killTweensOf(card)
    const isHovered = index === hoveredIndex
    const offset =
      index < hoveredIndex ? -props.hoverPushDistance : props.hoverPushDistance

    gsap.to(card, {
      transform: isHovered
        ? removeRotation(getBaseTransform(index))
        : addHorizontalOffset(getBaseTransform(index), offset),
      zIndex: isHovered ? props.items.length + 1 : index,
      duration: 0.4,
      ease: 'back.out(1.4)',
      delay: isHovered ? 0 : Math.abs(hoveredIndex - index) * 0.04,
      overwrite: 'auto',
    })
  })
}

const resetSiblings = () => {
  if (!props.enableHover || !hasPlayedEntrance) return

  getCards().forEach((card, index) => {
    gsap.killTweensOf(card)
    gsap.to(card, {
      transform: getBaseTransform(index),
      zIndex: index,
      duration: 0.4,
      ease: 'back.out(1.4)',
      overwrite: 'auto',
    })
  })
}

watch(
  () => props.entranceActive,
  (active) => {
    if (active) void playEntrance()
  }
)
watch(reducedMotion, (motion) => {
  if (motion !== 'reduce') return

  const cards = getCards()
  gsap.killTweensOf(cards)
  gsap.set(cards, { scale: 1 })
  hasPlayedEntrance = true
})

onMounted(async () => {
  await nextTick()
  if (props.entranceActive) void playEntrance()
  else prepareEntrance()
})

onUnmounted(() => {
  gsap.killTweensOf(getCards())
})
</script>

<style scoped lang="less">
.bounce-cards {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.bounce-cards__item {
  position: absolute;
  width: var(--bounce-card-width);
  pointer-events: auto;
  transform-origin: center center;
}
</style>
