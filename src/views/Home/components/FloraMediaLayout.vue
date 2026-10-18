<script setup lang="ts">
import {
  type ComponentPublicInstance,
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
} from 'vue'

import FloraAlbumGallery from './FloraAlbumGallery.vue'
import FloraVideoGallery from './FloraVideoGallery.vue'

type Panel = 'album' | 'video'
type PanelInstance = ComponentPublicInstance & { closeExpanded: () => boolean }

const props = defineProps<{
  petId: string
  mobile: boolean
  albumTitle: string
  videoTitle: string
}>()
const emit = defineEmits<{
  (event: 'expanded-change', expanded: boolean): void
}>()
const viewport = ref<HTMLElement | null>(null)
const expandedPanel = ref<Panel | null>(null)
const layerPanel = ref<Panel | null>(null)
const scrollOffset = ref(0)
const panelOrder = computed<Panel[]>(() =>
  props.mobile ? ['video', 'album'] : ['album', 'video']
)
const panels: Partial<Record<Panel, PanelInstance>> = {}
const setPanelRef = (
  panel: Panel,
  instance: Element | ComponentPublicInstance | null
) => {
  if (instance) panels[panel] = instance as PanelInstance
  else delete panels[panel]
}

let motion: Animation | undefined
let motionVersion = 0
const onExpandedChange = async (panel: Panel, expanded: boolean) => {
  if (!expanded && expandedPanel.value !== panel) return
  const element = panels[panel]?.$el as HTMLElement | undefined
  if (!element || !viewport.value) return
  const before = element.getBoundingClientRect()
  const version = ++motionVersion
  motion?.cancel()
  motion = undefined
  if (expanded) {
    if (layerPanel.value === null) scrollOffset.value = viewport.value.scrollTop
    expandedPanel.value = panel
    layerPanel.value = panel
  } else expandedPanel.value = null
  emit('expanded-change', expanded)

  await nextTick()
  if (version !== motionVersion || !element.isConnected) return
  const finish = async () => {
    if (version !== motionVersion) return
    motion = undefined
    if (!expanded) {
      layerPanel.value = null
      await nextTick()
      if (version === motionVersion && viewport.value)
        viewport.value.scrollTop = scrollOffset.value
    }
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await finish()
    return
  }

  // 以切换前后的实际边界驱动同一套动画，不缩放按钮或依赖定位层级的固定偏移。
  const origin = element.getBoundingClientRect()
  const slot = element.parentElement!
  const slotBounds = slot.getBoundingClientRect()
  const headingSpace = parseFloat(getComputedStyle(slot).paddingTop)
  const after = expanded
    ? origin
    : {
        left: slotBounds.left,
        top:
          slotBounds.top +
          headingSpace +
          viewport.value.scrollTop -
          scrollOffset.value,
        width: slotBounds.width,
        height: slotBounds.height - headingSpace,
      }
  motion = element.animate(
    [
      {
        transform: `translate(${before.left - origin.left}px, ${
          before.top - origin.top
        }px)`,
        width: `${before.width}px`,
        height: `${before.height}px`,
      },
      {
        transform: `translate(${after.left - origin.left}px, ${
          after.top - origin.top
        }px)`,
        width: `${after.width}px`,
        height: `${after.height}px`,
      },
    ],
    { duration: 850, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
  )
  motion.onfinish = () => void finish()
}

onBeforeUnmount(() => {
  motionVersion++
  motion?.cancel()
})
defineExpose({
  closeExpanded: () =>
    expandedPanel.value
      ? panels[expandedPanel.value]?.closeExpanded() ?? false
      : false,
})
</script>

<template>
  <div
    ref="viewport"
    class="flora-media-region no-rem"
    :class="{
      'flora-media-region--mobile': mobile,
      'is-layer-active': layerPanel !== null,
    }"
    :style="{ '--flora-media-scroll-offset': `${scrollOffset}px` }"
    data-lenis-nested-scroll
  >
    <slot name="profile" :media-active="layerPanel !== null" />
    <div class="flora-media-region__panels">
      <div
        v-for="panel in panelOrder"
        :key="panel"
        class="flora-media-region__slot"
      >
        <Transition name="flora-media-fade">
          <FloraAlbumGallery
            v-if="panel === 'album'"
            v-show="layerPanel !== 'video'"
            :ref="(instance) => setPanelRef(panel, instance)"
            :class="{ 'is-layer-panel': layerPanel === 'album' }"
            data-album-position="0"
            :pet-id="petId"
            :title="albumTitle"
            :mobile="mobile"
            @expanded-change="onExpandedChange('album', $event)"
          />
          <FloraVideoGallery
            v-else
            v-show="layerPanel !== 'album'"
            :ref="(instance) => setPanelRef(panel, instance)"
            :class="{ 'is-layer-panel': layerPanel === 'video' }"
            :pet-id="petId"
            :title="videoTitle"
            :mobile="mobile"
            @expanded-change="onExpandedChange('video', $event)"
          />
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.flora-media-region.no-rem {
  --flora-media-title-size: 72px;
  --flora-media-title-line-height: 1.2;
  --flora-media-heading-gap: -40px;
  --flora-media-heading-space: calc(
    var(--flora-media-title-size) * var(--flora-media-title-line-height) +
      var(--flora-media-heading-gap)
  );
  --flora-media-expanded-inset: calc(var(--flora-pet-level-size) + 24px);
  --flora-media-min-height: 180px;
  --flora-media-max-height: clamp(280px, 38vh, 380px);

  position: relative;
  display: grid;
  flex: 1;
  grid-template-rows:
    minmax(max-content, auto)
    minmax(
      calc(var(--flora-media-min-height) + var(--flora-media-heading-space)),
      calc(var(--flora-media-max-height) + var(--flora-media-heading-space))
    );
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  overflow: auto;
  overscroll-behavior: contain;
  overflow-anchor: none;
  pointer-events: auto;
  scrollbar-width: thin;

  &.is-layer-active {
    overflow: hidden;
  }

  .flora-media-region__panels {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    min-height: 0;
  }

  .flora-media-region__slot {
    min-width: 0;
    min-height: 0;
    padding-top: var(--flora-media-heading-space);
    box-sizing: border-box;
  }

  :deep(.flora-media-panel.is-layer-panel) {
    position: absolute;
    top: calc(
      var(--flora-media-expanded-inset) + var(--flora-media-heading-space) +
        var(--flora-media-scroll-offset)
    );
    left: 0;
    z-index: 5;
    width: 100%;
    height: calc(
      100% - var(--flora-media-expanded-inset) -
        var(--flora-media-heading-space)
    );
  }

  &.flora-media-region--mobile {
    --flora-media-title-size: 44px;
    --flora-media-title-overlap: 0px;
    --media-title-offset: 8px;
    display: flex;
    flex-direction: column;

    .flora-media-region__panels {
      display: flex;
      flex: none;
      flex-direction: column;
      gap: 12px;
      min-height: 0;
      max-height: none;
    }

    .flora-media-region__slot {
      flex: none;
      height: calc(170px + var(--flora-media-heading-space));
    }

    :deep(.flora-media-panel.is-layer-panel) {
      position: fixed;
      top: 0;
      left: calc(var(--flora-inline-inset) + 1px);
      width: calc(100% - 2 * var(--flora-inline-inset) - 2px);
      height: 100dvh;
    }
  }
}

.flora-media-fade-enter-active,
.flora-media-fade-leave-active {
  transition: opacity 350ms ease;
}
.flora-media-fade-enter-from,
.flora-media-fade-leave-to {
  opacity: 0;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .flora-media-fade-enter-active,
  .flora-media-fade-leave-active {
    transition: none;
  }
}
</style>
