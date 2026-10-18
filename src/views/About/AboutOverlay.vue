<script setup lang="ts">
import { defineAsyncComponent, nextTick, ref, watch } from 'vue'
import { useEventListener, useMediaQuery } from '@vueuse/core'

import ScrollViewport from '@/components/ScrollViewport/index.vue'
import { useTempleNavigation } from '@/stores/templeNavigation'

import { loadAboutContent } from './aboutContentLoader'

const emit = defineEmits<{ (event: 'closed'): void }>()
const navigation = useTempleNavigation()
const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
const dialog = ref<HTMLElement | null>(null)
const maskReady = ref(false)
let returnFocus: HTMLElement | null = null
const AboutContent = defineAsyncComponent(loadAboutContent)
const close = () => {
  navigation.aboutOpen = false
}
// 遮罩完成渐显后才挂载异步内容，避免内容早于遮罩出现。
const finishMaskEnter = () => {
  if (navigation.aboutOpen) maskReady.value = true
}
const finishMaskLeave = () => {
  if (navigation.aboutOpen) return
  maskReady.value = false
  emit('closed')
  void nextTick(() => {
    if (!navigation.aboutOpen) returnFocus?.focus({ preventScroll: true })
  })
}
watch(
  () => navigation.aboutOpen,
  async (open) => {
    if (open) {
      // 下载与遮罩渐显并行，仍由 after-enter 决定实际挂载时机。
      void loadAboutContent().catch(() => undefined)
      maskReady.value = false
      returnFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      await nextTick()
      dialog.value?.focus({ preventScroll: true })
    }
  },
  { immediate: true }
)
useEventListener(
  typeof document === 'undefined' ? undefined : document,
  'keydown',
  (event: KeyboardEvent) => {
    if (navigation.aboutOpen && event.key === 'Escape') {
      event.preventDefault()
      event.stopImmediatePropagation()
      close()
    } else if (navigation.aboutOpen && event.key === 'Tab' && dialog.value) {
      const focusable = Array.from(
        dialog.value.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], [tabindex="0"]'
        )
      ).filter((el) => el.getClientRects().length > 0)
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first) {
        event.preventDefault()
        dialog.value.focus()
      } else if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialog.value)
      ) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  },
  { capture: true }
)
</script>

<template>
  <Transition
    name="about-menu"
    appear
    :duration="reducedMotion ? 10 : 400"
    @after-enter="finishMaskEnter"
    @after-leave="finishMaskLeave"
  >
    <section
      v-if="navigation.aboutOpen"
      ref="dialog"
      class="about-overlay no-rem"
      role="dialog"
      aria-modal="true"
      aria-label="关于"
      :data-mask-ready="maskReady"
      tabindex="-1"
      @click.self="close"
    >
      <div class="about-overlay__mask" aria-hidden="true" @click="close" />
      <div class="about-overlay__content no-rem" @click="close">
        <ScrollViewport v-if="maskReady" edge-progress :progress-z-index="1200">
          <Transition name="about-content" appear>
            <AboutContent embedded @click.stop @close="close" />
          </Transition>
        </ScrollViewport>
      </div>
    </section>
  </Transition>
</template>

<style lang="less" scoped>
.about-overlay.no-rem {
  position: absolute;
  inset: 0;
  z-index: 110;
  outline: none;
  isolation: isolate;
  transition: opacity 0.4s ease;
}
.about-overlay.no-rem .about-overlay__mask {
  position: absolute;
  z-index: 0;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  transition: background-color 0.4s ease;
}
.about-overlay__content.no-rem {
  --about-content-top: max(
    124px,
    calc(var(--layout-header-bottom, 0px) + 24px)
  );
  --about-content-bottom: calc(128px / 3);
  --about-hero-height: calc(
    100dvh - var(--about-content-top) - var(--about-content-bottom)
  );
  position: absolute;
  z-index: 1;
  inset: var(--about-content-top) var(--temple-content-inset)
    var(--about-content-bottom);
  :deep(.scroll-viewport__scroll) {
    padding-right: 0;
  }
  :deep(.about-page) {
    width: 100%;
    margin: 0;
  }
}
.about-menu-enter-active,
.about-menu-leave-active {
  transition: opacity 0.4s ease;
}
.about-overlay.no-rem.about-menu-enter-from,
.about-overlay.no-rem.about-menu-leave-to {
  .about-overlay__mask {
    background-color: rgba(0, 0, 0, 0);
  }
}
.about-menu-leave-to {
  opacity: 0;
}
.about-content-enter-active,
.about-content-leave-active {
  transition: opacity 0.4s ease, filter 0.4s ease;
}
.about-content-enter-from,
.about-content-leave-to {
  opacity: 0;
  filter: blur(10px);
}
@media (max-width: 768px) {
  .about-overlay__content.no-rem {
    --about-content-top: 114px;
    --about-content-bottom: max(32px, env(safe-area-inset-bottom));
    inset: var(--about-content-top) 24px var(--about-content-bottom);
  }
}
@media (prefers-reduced-motion: reduce) {
  .about-menu-enter-active,
  .about-menu-leave-active,
  .about-overlay.no-rem .about-overlay__mask,
  .about-content-enter-active,
  .about-content-leave-active {
    transition-duration: 0.01s;
  }
}
</style>
