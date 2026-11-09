<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Loading } from '@element-plus/icons-vue'

import { useFrameTask } from '@/composables/useFrameTask'
import { cursorState, visualState } from '@/stores'
import {
  PHOTO_THEMES,
  useAtriumPhotoComponents,
} from '@/stores/atriumPhotoComponents'
import { useTempleNavigation } from '@/stores/templeNavigation'

import type { AtriumPhotoFraming } from '../scene/atriumPhotoFraming'
import type { createAtriumPhotoScene } from '../scene/atriumPhotoScene'
import AtriumPhotoControls from './AtriumPhotoControls.vue'

const props = defineProps<{
  framing: AtriumPhotoFraming
  revealed: boolean
  mobile: boolean
}>()
const emit = defineEmits<{ (event: 'exit'): void; (event: 'ready'): void }>()
const { t } = useI18n()
const visual = visualState()
const photoComponents = useAtriumPhotoComponents()
const navigation = useTempleNavigation()
let originalAccent = ''
let appliedAccent = ''
const restoreAccent = () => {
  const style = document.documentElement.style
  if (
    appliedAccent &&
    style.getPropertyValue('--page-theme-color') === appliedAccent
  ) {
    if (originalAccent) style.setProperty('--page-theme-color', originalAccent)
    else style.removeProperty('--page-theme-color')
  }
  appliedAccent = ''
}
const updatePhotoTheme = () => {
  if (!photoComponents.active || !navigation.photoMode) {
    restoreAccent()
    return
  }
  const palette = PHOTO_THEMES[photoComponents.settings.background]
  appliedAccent = palette.accent
  document.documentElement.style.setProperty(
    '--page-theme-color',
    appliedAccent
  )
  instance?.setPalette(photoComponents.settings.background)
}
watch(
  [() => photoComponents.settings.background, () => navigation.photoMode],
  updatePhotoTheme
)
const cursor = cursorState()
const instantCursorSource = 'atrium-photo-studio'
const host = ref<HTMLElement>()
const ready = ref(false)
const focalLength = ref(50)
const error = ref('')
const capturing = ref(false)
const flashLayer = ref<HTMLElement>()
let shutterAnimation: Animation | undefined
const playShutter = () => {
  shutterAnimation?.cancel()
  const layer = flashLayer.value
  if (!layer || typeof layer.animate !== 'function') return Promise.resolve()
  // 参考 PhotoboothProject 的独立闪光层；只改变叠层透明度，不写入截图画布。
  // https://github.com/PhotoboothProject/photobooth/blob/dev/assets/js/core.js
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  shutterAnimation = layer.animate(
    [
      { opacity: 0, offset: 0 },
      { opacity: reduced ? 0.15 : 0.9, offset: 0.1 },
      { opacity: 0, offset: 1 },
    ],
    { duration: reduced ? 120 : 380, easing: 'ease-out' }
  )
  return shutterAnimation.finished.catch(() => {})
}
let instance: ReturnType<typeof createAtriumPhotoScene> | undefined
let disposed = false
const frame = useFrameTask(() => instance?.render())
onMounted(async () => {
  originalAccent =
    document.documentElement.style.getPropertyValue('--page-theme-color')
  // 从进入拍照前的实际背景初始化，避免工具出现时星盘亮度或模糊突然变化。
  const sky = document.querySelector('.star-container')
  const zodiac = sky?.querySelector('.zodiac-stage')
  const stars = sky?.querySelector('.particle-viewport')
  const blur = (element: Element) =>
    Number(
      getComputedStyle(element).filter.match(/blur\(([\d.]+)px\)/)?.[1] || 0
    )
  if (sky && zodiac && stars) {
    photoComponents.initialize({
      zodiacOpacity: Math.round(
        Number(getComputedStyle(sky).getPropertyValue('--stage-opacity')) * 100
      ),
      zodiacBlur: blur(zodiac),
      starsOpacity: Math.round(Number(getComputedStyle(stars).opacity) * 100),
      starsBlur: blur(stars),
      background: 'red',
      blackGradient: true,
      modelOutline: false,
      modelWireThickness: 1,
      modelWireDensity: 100,
      modelForm: 'default',
    })
  }
  photoComponents.active = true
  cursor.setInstant(instantCursorSource, true)
  try {
    const { createAtriumPhotoScene } = await import('../scene/atriumPhotoScene')
    if (disposed || !host.value) return
    instance = createAtriumPhotoScene(
      host.value,
      frame.schedule,
      visual.theme,
      props.framing,
      (value) => {
        focalLength.value = value
      },
      props.mobile
    )
    updatePhotoTheme()
    instance.setModelAppearance(
      photoComponents.settings.modelForm,
      photoComponents.settings.modelOutline,
      photoComponents.settings.modelWireThickness,
      photoComponents.settings.modelWireDensity
    )
    await instance.ready
    if (!disposed) {
      // 首次绘制完成着色器编译后再通知页面淡出背景。
      instance.render()
      ready.value = true
      emit('ready')
    }
  } catch (cause) {
    if (disposed) return
    instance?.dispose()
    instance = undefined
    frame.cancel()
    error.value = 'island.photoMode.loadError'
    console.error(cause)
  }
})
watch(
  () => visual.theme,
  (theme) => instance?.setTheme(theme)
)
watch(
  [
    () => photoComponents.settings.modelForm,
    () => photoComponents.settings.modelOutline,
    () => photoComponents.settings.modelWireThickness,
    () => photoComponents.settings.modelWireDensity,
  ],
  ([form, outline, thickness, density]) =>
    instance?.setModelAppearance(form, outline, thickness, density)
)
const capture = async () => {
  if (!ready.value || !instance || capturing.value) return
  capturing.value = true
  error.value = ''
  try {
    await Promise.all([instance.capture(), playShutter()])
  } catch (cause) {
    if (!disposed) error.value = 'island.photoMode.captureError'
    console.error(cause)
  } finally {
    shutterAnimation?.cancel()
    shutterAnimation = undefined
    capturing.value = false
  }
}
onBeforeUnmount(() => {
  cursor.setInstant(instantCursorSource, false)
  disposed = true
  photoComponents.active = false
  restoreAccent()
  shutterAnimation?.cancel()
  shutterAnimation = undefined
  frame.cancel()
  instance?.dispose()
})
</script>

<template>
  <div class="atrium-photo-studio no-rem">
    <div
      ref="host"
      class="atrium-photo-stage"
      :class="{ 'is-revealed': revealed }"
      role="img"
      :aria-label="t('island.photoMode.modelLabel')"
      :aria-busy="!ready && !error"
    />
    <p v-if="error" class="photo-status" role="alert">{{ t(error) }}</p>
    <p
      v-else-if="!ready"
      class="photo-status"
      role="status"
      :aria-label="t('island.photoMode.loading')"
    >
      <el-icon :size="28" class="is-loading" aria-hidden="true">
        <Loading />
      </el-icon>
    </p>
    <AtriumPhotoControls
      :focal-length="focalLength"
      :mobile="mobile"
      :ready="ready"
      :capturing="capturing"
      @focal-length="instance?.setFocalLength($event)"
      @exit="emit('exit')"
      @capture="capture"
      @pose="instance?.setPose($event)"
    />
    <Teleport to="body">
      <div ref="flashLayer" class="photo-capture-flash" aria-hidden="true" />
    </Teleport>
  </div>
</template>

<style lang="less" scoped>
.atrium-photo-studio.no-rem {
  position: fixed;
  inset: 0;
  z-index: 99;
  .atrium-photo-stage {
    opacity: 0;
    transition: opacity 0.6s ease;
    &.is-revealed {
      opacity: 1;
    }
    position: absolute;
    inset: 0;
    :deep(canvas) {
      display: block;
      width: 100%;
      height: 100%;
      touch-action: none;
      cursor: grab;
      &:active {
        cursor: grabbing;
      }
    }
  }
  .photo-status {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: var(--text-color, #fff);
    text-align: center;
    pointer-events: none;
  }
}
</style>

<style scoped>
.photo-capture-flash {
  position: fixed;
  inset: 0;
  z-index: 30000;
  background: #fff;
  opacity: 0;
  pointer-events: none;
}
</style>
