<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RefreshLeft } from '@element-plus/icons-vue'

import {
  PHOTO_MAX_FOCAL_LENGTH,
  PHOTO_MIN_FOCAL_LENGTH,
} from '@/config/atriumPhoto'
import {
  PHOTO_THEMES,
  useAtriumPhotoComponents,
} from '@/stores/atriumPhotoComponents'

import PhotoCameraIcon from './PhotoCameraIcon.vue'
import PhotoToolButton from './PhotoToolButton.vue'
import PhotoToolPanel from './PhotoToolPanel.vue'
import PhotoToolRange from './PhotoToolRange.vue'
import PhotoToolSwitch from './PhotoToolSwitch.vue'

const props = defineProps<{
  focalLength: number
  hidden: boolean
  mobile: boolean
  disabled: boolean
}>()
const emit = defineEmits<{ (event: 'focal-length', value: number): void }>()
const { t } = useI18n()
const open = ref(false)
const componentsOpen = ref(false)
const toggleFocal = () => {
  open.value = !open.value
  componentsOpen.value = false
}
const toggleComponents = () => {
  componentsOpen.value = !componentsOpen.value
  open.value = false
}
const photoComponents = useAtriumPhotoComponents()
const componentsAnchor = ref<HTMLElement | null>(null)
const setComponentsAnchor = (element: unknown) => {
  componentsAnchor.value =
    (element as { $el?: HTMLElement } | null)?.$el ?? null
}
const fields = [
  { key: 'zodiacOpacity', label: 'zodiacOpacity', max: 100, unit: '%' },
  { key: 'zodiacBlur', label: 'zodiacBlur', max: 20, unit: 'px' },
  { key: 'starsOpacity', label: 'starsOpacity', max: 100, unit: '%' },
  { key: 'starsBlur', label: 'starsBlur', max: 20, unit: 'px' },
] as const
const fieldGroups = [
  { id: 'zodiacGroup', fields: fields.slice(0, 2) },
  { id: 'starsGroup', fields: fields.slice(2) },
]
const themeOptions = [
  { id: 'red', label: 'backgroundRed' },
  { id: 'blue', label: 'backgroundBlue' },
  { id: 'pink', label: 'backgroundPink' },
  { id: 'cyan', label: 'backgroundCyan' },
] as const
const anchor = ref<HTMLElement | null>(null)
const setAnchor = (element: unknown) => {
  anchor.value = (element as { $el?: HTMLElement } | null)?.$el ?? null
}
watch(
  () => props.hidden,
  (hidden) => {
    if (hidden) {
      open.value = false
      componentsOpen.value = false
    }
  }
)
</script>

<template>
  <div
    class="photo-toolbar no-rem"
    :class="{
      'is-hidden': hidden,
      'has-open-panel': open || componentsOpen,
      'is-mobile': mobile,
    }"
    :inert="hidden || undefined"
  >
    <div
      class="photo-toolbar__buttons"
      role="toolbar"
      :aria-label="t('island.photoMode.tools')"
    >
      <PhotoToolButton
        :ref="setAnchor"
        :label="t('island.photoMode.focalLength')"
        :expanded="open"
        controls="photo-focal-panel"
        :disabled="disabled"
        :mobile="mobile"
        @click="toggleFocal"
        ><PhotoCameraIcon
      /></PhotoToolButton>
      <PhotoToolButton
        :ref="setComponentsAnchor"
        :label="t('island.photoMode.componentControl')"
        :expanded="componentsOpen"
        controls="photo-components-panel"
        :disabled="disabled"
        :mobile="mobile"
        @click="toggleComponents"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 3v18M12 3v18M20 3v18" />
          <path d="M1 8h6M9 16h6M17 7h6" stroke-width="3" />
        </svg>
      </PhotoToolButton>
    </div>
    <PhotoToolPanel
      id="photo-focal-panel"
      v-model="open"
      :title="t('island.photoMode.focalLength')"
      control-id="photo-focal-range"
      :value="Math.round(focalLength)"
      unit="mm"
      :anchor="anchor"
    >
      <PhotoToolRange
        id="photo-focal-range"
        :model-value="focalLength"
        :label="t('island.photoMode.focalLength')"
        :min="PHOTO_MIN_FOCAL_LENGTH"
        :max="PHOTO_MAX_FOCAL_LENGTH"
        unit="mm"
        @update:model-value="emit('focal-length', $event)"
      />
    </PhotoToolPanel>
    <PhotoToolPanel
      id="photo-components-panel"
      v-model="componentsOpen"
      :title="t('island.photoMode.componentControl')"
      :anchor="componentsAnchor"
    >
      <template #actions>
        <button
          class="photo-tool-reset"
          type="button"
          @click="photoComponents.reset()"
        >
          <RefreshLeft aria-hidden="true" />{{ t('island.photoMode.reset') }}
        </button>
      </template>
      <div
        v-for="group in fieldGroups"
        :key="group.id"
        class="photo-tool-group"
        role="group"
        :aria-label="t(`island.photoMode.${group.id}`)"
      >
        <h3 class="photo-tool-group__title">
          {{ t(`island.photoMode.${group.id}`) }}
        </h3>
        <div class="photo-tool-fields-row">
          <div
            v-for="field in group.fields"
            :key="field.key"
            class="photo-tool-field"
          >
            <div class="photo-tool-field__label">
              <label :for="`photo-${field.key}`">{{
                t(
                  `island.photoMode.${
                    field.unit === '%' ? 'opacityShort' : 'blurShort'
                  }`
                )
              }}</label>
              <output :for="`photo-${field.key}`"
                >{{ photoComponents.settings[field.key]
                }}<small>{{ field.unit }}</small></output
              >
            </div>
            <PhotoToolRange
              :id="`photo-${field.key}`"
              v-model="photoComponents.settings[field.key]"
              :label="t(`island.photoMode.${field.label}`)"
              :min="0"
              :max="field.max"
              :unit="field.unit"
            />
          </div>
        </div>
      </div>
      <div
        class="photo-tool-group"
        role="group"
        :aria-label="t('island.photoMode.modelGroup')"
      >
        <h3 class="photo-tool-group__title">
          {{ t('island.photoMode.modelGroup') }}
        </h3>
        <div class="photo-tool-fields-row">
          <div class="photo-tool-field">
            <span>{{ t('island.photoMode.formShort') }}</span>
            <div
              class="photo-tool-options"
              role="group"
              :aria-label="t('island.photoMode.modelForm')"
            >
              <button
                v-for="form in (['default', 'wireframe'] as const)"
                :key="form"
                type="button"
                :aria-pressed="photoComponents.settings.modelForm === form"
                @click="photoComponents.settings.modelForm = form"
              >
                {{
                  t(
                    `island.photoMode.${
                      form === 'default' ? 'modelDefault' : 'modelWireframe'
                    }`
                  )
                }}
              </button>
            </div>
          </div>
          <div class="photo-tool-field photo-tool-field__label">
            <span>{{ t('island.photoMode.outlineShort') }}</span>
            <PhotoToolSwitch
              v-model="photoComponents.settings.modelOutline"
              :label="t('island.photoMode.modelOutline')"
            />
          </div>
        </div>
      </div>
      <div
        class="photo-tool-group"
        role="group"
        :aria-label="t('island.photoMode.backgroundGroup')"
      >
        <h3 class="photo-tool-group__title">
          {{ t('island.photoMode.backgroundGroup') }}
        </h3>
        <div class="photo-tool-field photo-tool-field__label">
          <span>{{ t('island.photoMode.blackGradient') }}</span>
          <PhotoToolSwitch
            v-model="photoComponents.settings.blackGradient"
            :label="t('island.photoMode.blackGradient')"
          />
        </div>
        <div class="photo-tool-field">
          <span>{{ t('island.photoMode.themeColor') }}</span>
          <div
            class="photo-tool-options photo-tool-options--colors"
            role="group"
            :aria-label="t('island.photoMode.themeColor')"
          >
            <button
              v-for="color in themeOptions"
              :key="color.id"
              type="button"
              :aria-pressed="photoComponents.settings.background === color.id"
              :style="{
                '--photo-option-background': PHOTO_THEMES[color.id].preview,
              }"
              @click="photoComponents.settings.background = color.id"
            >
              {{ t(`island.photoMode.${color.label}`) }}
            </button>
          </div>
        </div>
      </div>
    </PhotoToolPanel>
  </div>
</template>

<style lang="less" scoped>
.photo-toolbar.no-rem {
  position: absolute;
  bottom: 0;
  left: 0;
  z-index: 1;
  &.is-mobile {
    top: 0;
    right: 0;
    bottom: auto;
    --photo-tool-panel-bottom: auto;
    --photo-tool-panel-top: calc(
      var(--photo-toolbar-height) + var(--photo-control-gap)
    );
    --photo-tool-panel-max-height: calc(
      var(--photo-safe-height) - var(--photo-toolbar-height) -
        var(--photo-mobile-action-size) - var(--photo-mobile-hint-height) -
        var(--photo-control-gap) * 3
    );
    .photo-toolbar__buttons {
      justify-content: center;
    }
  }
  &.has-open-panel {
    z-index: 11;
  }
  pointer-events: auto;
  transition: opacity 0.25s ease;
  &.is-hidden {
    opacity: 0;
    pointer-events: none;
  }
  .photo-toolbar__buttons {
    display: flex;
    gap: 8px;
  }
}
</style>
