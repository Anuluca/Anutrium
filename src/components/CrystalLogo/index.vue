<template>
  <div ref="rootRef" class="crystal-logo">
    <button
      ref="triggerRef"
      class="crystal-trigger no-cursor"
      :class="{ 'is-open': isOpen }"
      type="button"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-label="ariaLabel"
      @mouseenter="openPopover"
      @mouseleave="scheduleClose"
      @focus="openPopover"
      @blur="scheduleClose"
    >
      <span class="crystal-shape">
        <span class="shine-effect" />
      </span>
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen && hasContent"
        ref="popoverRef"
        class="crystal-popover"
        :style="popoverStyle"
        role="dialog"
        :aria-label="ariaLabel"
        @click.stop
        @mouseenter="cancelScheduledClose"
        @mouseleave="scheduleClose"
      >
        <span class="popover-scanlines" aria-hidden="true" />
        <div class="popover-tip">TIPS：</div>

        <button
          v-if="normalizedImage"
          class="popover-image"
          type="button"
          :aria-label="imageAlt"
          @click="showImageViewer = true"
        >
          <img :src="normalizedImage" :alt="imageAlt" />
        </button>

        <p v-if="normalizedText" class="popover-text">
          {{ normalizedText }}
        </p>

        <nav
          v-if="normalizedLinks.length"
          class="popover-links"
          aria-label="Related links"
        >
          <a
            v-for="link in normalizedLinks"
            :key="`${link.label}-${link.href}`"
            :href="link.href"
            :target="link.target || '_blank'"
            :rel="
              (link.target || '_blank') === '_blank'
                ? 'noopener noreferrer'
                : undefined
            "
          >
            <span>{{ link.label }}</span>
            <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </div>

      <ElImageViewer
        v-if="showImageViewer && normalizedImage"
        :url-list="[normalizedImage]"
        :z-index="7000"
        hide-on-click-modal
        teleported
        @close="handleImageViewerClose"
      />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ElImageViewer } from 'element-plus'

import 'element-plus/es/components/image-viewer/style/css'

interface CrystalLink {
  href: string
  label: string
  target?: '_blank' | '_self'
}

const props = withDefaults(
  defineProps<{
    ariaLabel?: string
    image?: string
    imageAlt?: string
    links?: CrystalLink[]
    text?: string
  }>(),
  {
    ariaLabel: 'Open crystal details',
    image: '',
    imageAlt: 'Crystal detail image',
    links: () => [],
    text: '',
  }
)

const emit = defineEmits<{
  close: []
  open: []
}>()

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const showImageViewer = ref(false)
const popoverPosition = ref({
  bottom: 0,
  left: 0,
})
let closeTimer: number | null = null

const normalizedImage = computed(() => props.image.trim())
const normalizedText = computed(() => props.text.trim())
const normalizedLinks = computed(() =>
  props.links.filter((link) => link.label.trim() && link.href.trim())
)
const hasContent = computed(
  () =>
    Boolean(normalizedImage.value) ||
    Boolean(normalizedText.value) ||
    normalizedLinks.value.length > 0
)
const popoverStyle = computed(() => ({
  bottom: `${popoverPosition.value.bottom}px`,
  left: `${popoverPosition.value.left}px`,
}))

const updatePosition = () => {
  if (!isOpen.value || !triggerRef.value || !popoverRef.value) return

  const triggerRect = triggerRef.value.getBoundingClientRect()
  const popoverWidth = popoverRef.value.offsetWidth
  const viewportPadding = 12
  const desiredLeft = triggerRect.left + triggerRect.width / 2
  const minimumLeft = viewportPadding + popoverWidth / 2
  const maximumLeft = window.innerWidth - viewportPadding - popoverWidth / 2

  popoverPosition.value = {
    bottom: window.innerHeight - triggerRect.top + 12,
    left: Math.min(Math.max(desiredLeft, minimumLeft), maximumLeft),
  }
}

const closePopover = () => {
  if (!isOpen.value) return
  if (closeTimer !== null) {
    window.clearTimeout(closeTimer)
    closeTimer = null
  }
  isOpen.value = false
  showImageViewer.value = false
  emit('close')
}

const openPopover = () => {
  if (!hasContent.value) return
  if (closeTimer !== null) {
    window.clearTimeout(closeTimer)
    closeTimer = null
  }
  if (isOpen.value) return

  isOpen.value = true
  emit('open')
  nextTick(updatePosition)
}

const cancelScheduledClose = () => {
  if (closeTimer === null) return
  window.clearTimeout(closeTimer)
  closeTimer = null
}

const scheduleClose = () => {
  cancelScheduledClose()
  closeTimer = window.setTimeout(() => {
    closeTimer = null
    if (!showImageViewer.value) closePopover()
  }, 160)
}

const handleImageViewerClose = () => {
  showImageViewer.value = false
  closePopover()
}

const handleDocumentClick = (event: MouseEvent) => {
  const target = event.target
  if (!(target instanceof Node)) return
  if (
    target instanceof Element &&
    target.closest('.el-image-viewer__wrapper')
  ) {
    return
  }
  if (rootRef.value?.contains(target) || popoverRef.value?.contains(target)) {
    return
  }
  closePopover()
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && !showImageViewer.value) closePopover()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('scroll', updatePosition, true)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', updatePosition, { passive: true })
})

onUnmounted(() => {
  if (closeTimer !== null) window.clearTimeout(closeTimer)
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('scroll', updatePosition, true)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', updatePosition)
})

watch(hasContent, (hasValue) => {
  if (!hasValue) closePopover()
})
</script>

<style scoped lang="less">
.crystal-logo {
  position: relative;
  display: inline-block;
  line-height: 0;
}

.crystal-trigger {
  display: block;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  line-height: 0;
  cursor: pointer;
  transition: filter 0.3s ease;

  &:hover,
  &:focus-visible,
  &.is-open {
    filter: drop-shadow(0 0 10px #e23456) drop-shadow(0 0 20px #e23456)
      drop-shadow(0 0 30px rgba(226, 52, 86, 0.5));
    outline: none;

    .crystal-shape {
      background-color: rgba(0, 0, 0, 0.9);

      .shine-effect {
        opacity: 0.1;
      }
    }
  }
}

.crystal-shape {
  position: relative;
  display: block;
  width: 20px;
  height: 40px;
  overflow: hidden;
  background-color: #e23456;
  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
  transition: background-color 0.3s ease;

  .shine-effect {
    position: absolute;
    top: -100%;
    left: -100%;
    width: 300%;
    height: 300%;
    background: linear-gradient(
      45deg,
      transparent 0%,
      transparent 40%,
      rgba(255, 255, 255, 0.8) 50%,
      transparent 60%,
      transparent 100%
    );
    opacity: 0.6;
    animation: shine-scan 3s ease-in-out infinite;
  }
}

.crystal-popover {
  position: fixed;
  z-index: 6500;
  width: min(380px, calc(100vw - 24px));
  max-height: min(560px, calc(100vh - 40px));
  padding: 14px 14px 12px;
  border: 1px solid rgba(226, 52, 86, 0.58);
  background: linear-gradient(145deg, rgba(226, 52, 86, 0.12), transparent 42%),
    rgba(8, 5, 10, 0.97);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.72),
    inset 0 0 30px rgba(226, 52, 86, 0.05);
  box-sizing: border-box;
  color: #fff;
  line-height: 1.5;
  transform: translateX(-50%);
  transform-origin: bottom center;
  overflow: visible;
  animation: crystal-popover-in 0.34s cubic-bezier(0.16, 1, 0.3, 1) both;

  &::before,
  &::after {
    position: absolute;
    left: 50%;
    width: 0;
    height: 0;
    border-right: 8px solid transparent;
    border-left: 8px solid transparent;
    content: '';
    transform: translateX(-50%);
  }

  &::before {
    bottom: -9px;
    border-top: 9px solid rgba(226, 52, 86, 0.72);
  }

  &::after {
    bottom: -7px;
    border-top: 8px solid #0b070d;
  }
}

.popover-scanlines {
  position: absolute;
  z-index: 0;
  inset: 0;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent 3px,
    rgba(255, 255, 255, 0.018) 3px,
    rgba(255, 255, 255, 0.018) 4px
  );
  pointer-events: none;
}

.popover-tip,
.popover-image,
.popover-text,
.popover-links {
  position: relative;
  z-index: 1;
}

.popover-tip {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 6px 8px;
  color: #e23456;
  font-family: 'cn-custom', monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;

  &::after {
    height: 1px;
    background: rgba(226, 52, 86, 0.36);
    content: '';
    flex: 1;
  }
}

.popover-image {
  position: relative;
  display: block;
  width: calc(100% - 12px);
  aspect-ratio: 16 / 9;
  margin: 4px 6px 12px;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #030304;
  box-sizing: border-box;
  cursor: zoom-in;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: filter 0.25s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }

  &::after {
    position: absolute;
    inset: 0;
    border: 1px solid rgba(226, 52, 86, 0.18);
    content: '';
    pointer-events: none;
  }

  &:hover,
  &:focus-visible {
    border-color: rgba(226, 52, 86, 0.65);
    outline: none;

    img {
      filter: brightness(0.72);
      transform: scale(1.025);
    }
  }
}

.popover-text {
  margin: 0 0 12px;
  padding: 11px 12px;
  color: rgba(255, 255, 255, 0.86);
  background: rgba(226, 52, 86, 0.16);
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.7;
  white-space: pre-line;
}

.popover-image + .popover-text {
  border-top: 1px solid rgba(226, 52, 86, 0.48);
}

.popover-image:last-child,
.popover-text:last-child {
  margin-bottom: 4px;
}

.popover-links {
  display: grid;
  gap: 6px;

  a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 30px;
    padding: 0 9px;
    border: 1px solid rgba(255, 255, 255, 0.09);
    color: rgba(255, 255, 255, 0.72);
    background: rgba(255, 255, 255, 0.025);
    font-family: 'cn-custom', monospace;
    font-size: 10px;
    letter-spacing: 0.07em;
    text-decoration: none;
    transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;

    &:hover,
    &:focus-visible {
      border-color: rgba(226, 52, 86, 0.68);
      color: #e23456;
      background: rgba(226, 52, 86, 0.08);
      outline: none;
    }
  }
}

@keyframes shine-scan {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(45deg);
  }

  20%,
  80% {
    opacity: 0.6;
  }

  100% {
    opacity: 0;
    transform: translate(50%, 50%) rotate(45deg);
  }
}

@keyframes crystal-popover-in {
  from {
    opacity: 0;
    transform: translate(-50%, 12px) scale(0.72);
  }

  to {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
}

@media (max-width: 600px) {
  .crystal-popover {
    padding: 12px 12px 10px;
  }
}
</style>
