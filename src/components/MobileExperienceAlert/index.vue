<template>
  <Transition
    name="mobile-experience-alert"
    :duration="transitionDuration"
    @after-leave="emit('closed')"
  >
    <div v-if="visible" class="mobile-experience-alert no-rem">
      <div class="el-alert el-alert--error" role="alert">
        <span v-if="showIcon" class="el-alert__icon" aria-hidden="true">
          <slot name="icon">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="currentColor" />
              <path d="M11 10h2v7h-2zm0-4h2v2h-2z" fill="#0f0d11" />
            </svg>
          </slot>
        </span>
        <div class="el-alert__content">
          <span class="el-alert__title">
            <slot>{{ message }}</slot>
          </span>
        </div>
        <button
          v-if="closable"
          class="el-alert__close-btn is-customed"
          type="button"
          @click="close"
        >
          <slot name="action">{{ closeText }}</slot>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    message?: string
    closeText?: string
    showIcon?: boolean
    closable?: boolean
  }>(),
  {
    modelValue: true,
    message: '使用电脑访问以获得最佳体验',
    closeText: '别说了！',
    showIcon: true,
    closable: true,
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  closed: []
}>()

const transitionDuration = { enter: 580, leave: 460 }
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
    right: auto;
    bottom: calc(env(safe-area-inset-bottom) + 112px);
    left: 50%;
    z-index: 10000;
    display: block;
    width: max-content;
    max-width: calc(100vw - 24px);
    pointer-events: none;
    transform: translateX(-50%);

    .el-alert {
      display: flex;
      align-items: center;
      width: max-content;
      min-height: 0;
      max-width: 100%;
      padding: 10px 6rem 10px 12px;
      box-sizing: border-box;
      background: rgb(15 13 17 / 60%) !important;
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      box-shadow: 0 18px 52px 10px rgb(0 0 0 / 74%);
      pointer-events: auto;
      transform-origin: center;
      animation: mobileExperienceAlertCrtOn 0.58s cubic-bezier(0.19, 1, 0.22, 1)
        both;
    }

    .el-alert__icon {
      display: inline-flex;
      flex: none;
      width: 1.22rem;
      margin-left: 4px;
      margin-right: 4px;
      font-size: 1.22rem;

      svg {
        display: block;
        width: 100%;
        height: auto;
      }
    }

    .el-alert__title {
      font-size: 1.08rem;
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
      font-size: 0.9rem;
      font-weight: 700;
      line-height: 1.2;
      transform: translateY(-50%);

      &:hover,
      &:focus-visible {
        color: #91e59c !important;
        background: transparent;
        transform: translateY(-50%);
      }
    }

    .el-alert::after {
      position: absolute;
      inset: 0;
      z-index: 3;
      content: '';
      background: #fff;
      opacity: 0;
      mix-blend-mode: screen;
      pointer-events: none;
      animation: mobileExperienceAlertCrtFlashOn 0.58s linear both;
    }

    &.mobile-experience-alert-leave-active .el-alert {
      animation: mobileExperienceAlertCrtOff 0.46s cubic-bezier(0.2, 1, 0.22, 1)
        forwards !important;

      &::after {
        animation: mobileExperienceAlertCrtFlashOff 0.46s linear forwards;
      }
    }
  }
}

@keyframes mobileExperienceAlertCrtOn {
  0% {
    opacity: 0;
    filter: brightness(8) contrast(2);
    transform: scale3d(0, 0.015, 1);
  }

  45% {
    opacity: 1;
    filter: brightness(4) contrast(1.5);
    transform: scale3d(1, 0.015, 1);
  }

  100% {
    opacity: 1;
    filter: brightness(1) contrast(1);
    transform: scale3d(1, 1, 1);
  }
}

@keyframes mobileExperienceAlertCrtFlashOn {
  0%,
  22%,
  48%,
  74%,
  100% {
    opacity: 0;
  }

  34% {
    opacity: 0.68;
  }

  60% {
    opacity: 0.46;
  }
}

@keyframes mobileExperienceAlertCrtOff {
  0% {
    opacity: 1;
    filter: brightness(1);
    transform: scale3d(1, 1, 1);
  }

  55% {
    opacity: 1;
    filter: brightness(4) contrast(1.5);
    transform: scale3d(1, 0.015, 1);
  }

  100% {
    opacity: 0;
    filter: brightness(10);
    transform: scale3d(0, 0, 1);
  }
}

@keyframes mobileExperienceAlertCrtFlashOff {
  0%,
  10%,
  34%,
  64%,
  100% {
    opacity: 0;
  }

  20% {
    opacity: 0.58;
  }

  48% {
    opacity: 0.72;
  }
}
</style>
