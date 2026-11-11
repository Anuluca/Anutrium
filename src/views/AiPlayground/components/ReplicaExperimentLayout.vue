<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import SafeImageViewer from '@/components/SafeImageViewer/index.vue'
import ToolPageLayout from '@/components/ToolPageLayout/index.vue'
import { useFrameTask } from '@/composables/useFrameTask'
import type { AiReplicaExperiment } from '@/config/aiReplicaExperiments'
import { AI_AGENT_TEST_PATH } from '@/config/islandModules'

const props = withDefaults(
  defineProps<{
    experiment: Pick<
      AiReplicaExperiment,
      'pageTitle' | 'sceneLabel' | 'canvas' | 'description' | 'referenceImage'
    >
    backLabel?: string
    backPath?: string
    bordered?: boolean
    mobileLayout?: 'landscape' | 'flow'
  }>(),
  {
    backLabel: 'LABORATORY',
    backPath: AI_AGENT_TEST_PATH,
    bordered: true,
    mobileLayout: 'landscape',
  }
)
const { locale } = useI18n()
const showReference = ref(false)
const viewport = ref<HTMLElement | null>(null)
const frame = ref<HTMLElement | null>(null)
const credit = ref<HTMLElement | null>(null)
const desktopFrameHeight = ref<number | null>(null)
const scale = ref(1)
const mobileFlow = ref(false)
let resizeObserver: ResizeObserver | null = null

const resizeScene = () => {
  if (!viewport.value) return
  mobileFlow.value =
    props.mobileLayout === 'flow' &&
    window.matchMedia('(max-width: 768px)').matches
  if (mobileFlow.value) {
    scale.value = 1
    desktopFrameHeight.value = null
    return
  }
  const nextScale = Math.min(
    viewport.value.clientWidth / props.experiment.canvas.width,
    viewport.value.clientHeight / props.experiment.canvas.height
  )
  let nextHeight: number | null = null
  if (
    window.matchMedia('(min-width: 769px)').matches &&
    frame.value &&
    credit.value
  ) {
    // 首屏只容纳标题、画布和说明；版权页脚按正常文档流滚动查看。
    let top = 0
    let element: HTMLElement | null = frame.value
    while (element) {
      top += element.offsetTop
      element = element.offsetParent as HTMLElement | null
    }
    const creditStyle = getComputedStyle(credit.value)
    const creditHeight =
      credit.value.offsetHeight +
      parseFloat(creditStyle.marginTop) +
      parseFloat(creditStyle.marginBottom)
    const ticker = document.querySelector<HTMLElement>('.footer-com')
    const availableBottom =
      ticker && getComputedStyle(ticker).display !== 'none'
        ? Math.min(window.innerHeight, ticker.getBoundingClientRect().top)
        : window.innerHeight
    const availableHeight = availableBottom - top - creditHeight - 8
    nextHeight = Math.max(
      2,
      Math.min(
        availableHeight,
        (viewport.value.clientWidth * props.experiment.canvas.height) /
          props.experiment.canvas.width +
          (frame.value.offsetHeight - frame.value.clientHeight)
      )
    )
  }
  scale.value = nextScale
  desktopFrameHeight.value = nextHeight
}
const { schedule: scheduleSceneResize } = useFrameTask(resizeScene)

onMounted(() => {
  resizeObserver = new ResizeObserver(scheduleSceneResize)
  if (viewport.value) resizeObserver.observe(viewport.value)
  if (credit.value) resizeObserver.observe(credit.value)
  const header = frame.value
    ?.closest('.tool-page-stage')
    ?.querySelector('.detail-page-header-slot')
  if (header) resizeObserver.observe(header)
  const ticker = document.querySelector('.footer-com')
  if (ticker) resizeObserver.observe(ticker)
  window.addEventListener('resize', scheduleSceneResize, { passive: true })
  scheduleSceneResize()
})
onUnmounted(() => {
  resizeObserver?.disconnect()
  window.removeEventListener('resize', scheduleSceneResize)
})
</script>

<template>
  <ToolPageLayout
    :page-class="`replica-experiment-page no-rem${
      mobileLayout === 'flow' ? ' replica-experiment-page--flow' : ''
    }`"
    :back-label="backLabel"
    :back-path="backPath"
    :title="experiment.pageTitle"
    :show-recommendations="false"
  >
    <div class="replica-content no-rem">
      <section
        ref="frame"
        class="replica-frame no-rem"
        :class="{ 'replica-frame--borderless': !bordered }"
        :style="{
          '--replica-canvas-ratio':
            experiment.canvas.height / experiment.canvas.width,
          '--replica-frame-height':
            desktopFrameHeight == null ? undefined : `${desktopFrameHeight}px`,
        }"
        :aria-label="experiment.sceneLabel"
      >
        <div
          ref="viewport"
          class="scene-viewport"
          :data-lenis-prevent="mobileFlow ? undefined : ''"
        >
          <div
            class="scene-canvas"
            :style="{
              width: `${experiment.canvas.width * scale}px`,
              height: `${experiment.canvas.height * scale}px`,
            }"
          >
            <div
              class="replica-stage"
              :style="{
                width: `${experiment.canvas.width}px`,
                height: `${experiment.canvas.height}px`,
                transform: `scale(${scale})`,
              }"
            >
              <slot />
            </div>
          </div>
        </div>
      </section>
      <div ref="credit" class="replica-credit no-rem">
        <span class="replica-credit__description">{{
          experiment.description
        }}</span>
        <button
          v-if="experiment.referenceImage"
          class="replica-credit__reference"
          type="button"
          aria-haspopup="dialog"
          :aria-expanded="showReference"
          @click="showReference = true"
        >
          {{ locale === 'en' ? 'Reference image' : '原参考图' }}
        </button>
      </div>
    </div>
    <SafeImageViewer
      v-if="showReference && experiment.referenceImage"
      :url-list="[experiment.referenceImage]"
      :titles="[locale === 'en' ? 'Reference image' : '原参考图']"
      @close="showReference = false"
    />
  </ToolPageLayout>
</template>

<style scoped lang="less" src="./ReplicaExperimentLayout.less" />
