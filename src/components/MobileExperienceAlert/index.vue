<template>
  <Teleport to="body">
    <Transition
      appear
      name="mobile-experience-alert"
      :duration="transitionDuration"
      @after-leave="emit('closed')"
    >
      <div
        v-if="visible"
        class="mobile-experience-alert no-rem"
        :class="{ 'is-en': locale === 'en' }"
      >
        <div class="el-alert el-alert--error" role="alert">
          <div class="el-alert__message">
            <span class="el-alert__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="currentColor" />
                <path d="M11 10h2v7h-2zm0-4h2v2h-2z" fill="#0f0d11" />
              </svg>
            </span>
            <div class="el-alert__content">
              <span class="el-alert__title">
                <slot>{{ displayMessage }}</slot>
              </span>
            </div>
          </div>
          <button
            v-if="closable"
            class="el-alert__close-btn is-customed"
            type="button"
            @click="close"
          >
            <slot name="action">{{ displayCloseText }}</slot>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    message?: string
    closeText?: string
    closable?: boolean
  }>(),
  {
    modelValue: true,
    closable: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  closed: []
}>()

const transitionDuration = { enter: 280, leave: 220 }
const { locale, t } = useI18n()
const displayMessage = computed(
  () => props.message ?? t('mobileExperienceAlert.message')
)
const displayCloseText = computed(
  () => props.closeText ?? t('mobileExperienceAlert.dismiss')
)
const visible = ref(props.modelValue)

watch(
  () => props.modelValue,
  (value) => {
    visible.value = value
  }
)

const close = () => {
  if (!visible.value) return
  visible.value = false
  emit('update:modelValue', false)
  emit('close')
}
</script>

<style scoped lang="less">
.mobile-experience-alert {
  display: none;
}

@media screen and (max-aspect-ratio: @ratio-threshold),
  screen and (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .mobile-experience-alert.no-rem {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 10000;
    display: block;
    width: 100vw;
    max-width: none;
    pointer-events: none;

    .el-alert {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 0;
      max-width: none;
      padding: 16px 5.5rem;
      border-right: 0;
      border-bottom: 0;
      border-left: 0;
      box-sizing: border-box;
      background: linear-gradient(
        to top,
        rgb(0 0 0 / 96%) 0%,
        rgb(0 0 0 / 96%) 1%,
        rgb(0 0 0 / 38%) 28%,
        rgb(0 0 0 / 0%) 100%
      ) !important;
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      box-shadow: 0 18px 52px 10px rgb(0 0 0 / 74%);
      pointer-events: auto;
    }

    .el-alert::before {
      display: none;
    }

    .el-alert__message {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
    }

    .el-alert__icon {
      display: inline-flex;
      flex: none;
      width: 0.95rem;
      margin: 0;
      font-size: 0.95rem;

      svg {
        display: block;
        width: 100%;
        height: auto;
      }
    }

    .el-alert__content {
      flex: 0 1 auto;
      text-align: center;
    }

    .el-alert__title {
      font-size: 0.94rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .el-alert__close-btn.is-customed {
      position: absolute;
      top: 50%;
      right: 16px;
      padding: 0;
      border: 0;
      color: #71cb7d !important;
      background: transparent;
      appearance: none;
      font-family: 'alibaba-puhuiti', sans-serif;
      font-size: 0.78rem;
      font-weight: 600;
      line-height: 1.2;
      transform: translateY(-50%);

      &:hover,
      &:focus-visible {
        color: #91e59c !important;
        background: transparent;
        transform: translateY(-50%);
      }
    }

    &.is-en {
      .el-alert,
      .el-alert__title,
      .el-alert__close-btn.is-customed {
        font-family: 'Anton', sans-serif;
        font-weight: 600;
      }
    }
  }
}

.mobile-experience-alert-enter-active {
  transition: opacity 0.28s ease-out;
}

.mobile-experience-alert-leave-active {
  transition: opacity 0.22s ease-in;
}

.mobile-experience-alert-enter-from,
.mobile-experience-alert-leave-to {
  opacity: 0;
}
</style>
