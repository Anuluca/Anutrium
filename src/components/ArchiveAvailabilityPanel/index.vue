<template>
  <section
    class="availability-panel"
    :class="{ 'availability-panel--en': locale === 'en' }"
    aria-labelledby="availability-title"
    @animationend="startTyping"
  >
    <div class="availability-copy">
      <span class="availability-copy__crystal" aria-hidden="true">
        <span class="availability-copy__crystal-body" />
        <span
          class="availability-copy__crystal-tip availability-copy__crystal-tip--top"
        />
        <span
          class="availability-copy__crystal-tip availability-copy__crystal-tip--bottom"
        />
      </span>
      <h2 id="availability-title">
        <TypedText
          class="availability-type--title"
          :text="t('archive.statusTitle')"
          :delay="820"
          :speed="38"
          :start="typingReady"
        />
      </h2>
      <p>
        <TypedText
          class="availability-type--desc"
          :text="t('archive.statusDescription')"
          :delay="1060"
          :speed="20"
          :start="typingReady"
        />
      </p>
    </div>

    <div class="availability-grid">
      <div
        v-for="item in availabilityItems"
        :key="item.id"
        class="availability-item"
      >
        <span>{{ item.label }}</span>
        <strong>
          <TypedText
            :text="item.value"
            :delay="item.delay"
            :speed="30"
            :start="typingReady"
          />
        </strong>
      </div>
    </div>

    <div class="availability-actions">
      <a
        class="availability-cta"
        href="mailto:tilucario@outlook.com?subject=Anutrium%20Collaboration"
      >
        <span class="availability-cta__content">
          <Message class="availability-cta__icon" aria-hidden="true" />
          <span>{{ t('archive.statusCta') }}</span>
        </span>
      </a>
      <button
        type="button"
        class="availability-cta availability-cta--resume"
        @click="requestResume"
      >
        <span class="availability-cta__content">
          <Paperclip class="availability-cta__icon" aria-hidden="true" />
          <span>{{ t('archive.statusResumeCta') }}</span>
        </span>
      </button>
    </div>

    <div class="availability-flash" aria-hidden="true" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Message, Paperclip } from '@element-plus/icons-vue'

import TypedText from '@/components/TypedText/index.vue'
import { trackEvent } from '@/utils/analytics'
import { confirmWithoutPageShift } from '@/utils/scrollSafeMessageBox'

const { locale, t } = useI18n()
const typingReady = ref(false)

const availabilityItemKeys = [
  ['work', 'statusWorkLabel', 'statusWorkValue'],
  ['freelance', 'statusFreelanceLabel', 'statusFreelanceValue'],
  ['location', 'statusLocationLabel', 'statusLocationValue'],
] as const

const availabilityItems = computed(() =>
  availabilityItemKeys.map(([id, labelKey, valueKey], index) => ({
    id,
    label: t(`archive.${labelKey}`),
    value: t(`archive.${valueKey}`),
    delay: 760 + index * 220,
  }))
)

const startTyping = (event: AnimationEvent) => {
  if (
    typingReady.value ||
    event.target !== event.currentTarget ||
    !event.animationName.includes('availabilityCrtOn')
  ) {
    return
  }

  typingReady.value = true
}

const requestResume = async () => {
  trackEvent('resume_click', { source: 'availability_panel' })

  const isEnglish = locale.value === 'en'
  const copy = isEnglish
    ? {
        message: 'Would you like to email Anuluca to request a resume?',
        title: 'Request Resume',
        confirm: 'Send Request',
        cancel: 'Cancel',
        subject: 'Resume Request via Anutrium',
        body: 'Hi Anuluca,\n\nI would like to request your resume.\n\nCompany / Team:\nRole / Opportunity:\nAdditional context:\n',
      }
    : {
        message: '是否向 Anuluca 发送简历请求？',
        title: '请求简历',
        confirm: '发送请求',
        cancel: '取消',
        subject: '通过 Anutrium 请求简历',
        body: '你好 Anuluca：\n\n我希望获取你的完整简历。\n\n公司 / 团队：\n职位 / 合作机会：\n补充说明：\n',
      }

  try {
    await confirmWithoutPageShift(copy.message, copy.title, {
      confirmButtonText: copy.confirm,
      cancelButtonText: copy.cancel,
      type: 'info',
    })

    window.location.href = `mailto:tilucario@outlook.com?subject=${encodeURIComponent(
      copy.subject
    )}&body=${encodeURIComponent(copy.body)}`
  } catch {
    // The user cancelled or closed the confirmation dialog.
  }
}
</script>

<style lang="less" scoped>
.availability-panel {
  position: relative;
  display: grid;
  grid-template-columns: minmax(360px, 1.2fr) minmax(420px, 1fr) 178px;
  align-items: stretch;
  margin: 0 0 24px;
  overflow: visible;
  border: 1px solid rgba(90, 212, 128, 0.34);
  background: linear-gradient(90deg, rgba(90, 212, 128, 0.09), transparent 34%),
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.018) 0 1px,
      transparent 1px 28px
    ),
    rgba(9, 10, 12, 0.92);
  opacity: 0;
  transform-origin: center;
  animation: availabilityCrtOn 0.52s cubic-bezier(0.19, 1, 0.22, 1) 0.08s both;

  &::before {
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 2;
    width: 3px;
    background: #5ad480;
    box-shadow: 0 0 18px rgba(90, 212, 128, 0.4);
    content: '';
    pointer-events: none;
  }

  &::after {
    position: absolute;
    top: 0;
    left: 3px;
    z-index: 2;
    width: 28%;
    height: 1px;
    background: linear-gradient(90deg, #5ad480, transparent);
    content: '';
    pointer-events: none;
  }

  &--en {
    grid-template-columns: minmax(360px, 1.2fr) minmax(420px, 1fr) 258px;
  }
}

.availability-flash {
  position: absolute;
  inset: 0;
  z-index: 4;
  background: rgba(255, 255, 255, 0.62);
  mix-blend-mode: screen;
  opacity: 0;
  pointer-events: none;
  animation: anutriumCrtFlashOn 0.52s linear 0.08s both;
}

.availability-panel :deep(.typed-text__active) {
  transform: translateY(-0.06em);
}

.availability-copy {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  padding: 13px 22px 12px 3.3rem;
  flex-direction: column;
  align-self: stretch;
  justify-content: center;
  border-right: 1px solid rgba(255, 255, 255, 0.09);

  h2 {
    margin: 0 0 0.3rem;
    color: #fff;
    font-family: 'anton', 'cn-custom';
    font-size: 1rem;
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  p {
    max-width: 720px;
    margin: 0;
    color: rgba(255, 255, 255, 0.48);
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 0.4rem;
    line-height: 1.5;
  }
}

.availability-type--title,
.availability-type--desc {
  display: inline-block;
  max-width: 100%;
}

.availability-type--title {
  transform: scale(1.16);
  transform-origin: left center;
}

.availability-type--desc {
  transform: scale(1.18);
  transform-origin: left center;
  white-space: normal;
}

.availability-copy__crystal {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0.75rem;
  width: 2rem;
  opacity: 0.6;
  pointer-events: none;
}

.availability-copy__crystal-body,
.availability-copy__crystal-tip {
  position: absolute;
  background: repeating-linear-gradient(
    to bottom,
    #5ad480 0,
    #5ad480 1px,
    transparent 1px,
    transparent 4px
  );
}

.availability-copy__crystal-body {
  inset: 0;
}

.availability-copy__crystal-tip {
  left: 0;
  width: 100%;
  height: 0.8rem;

  &--top {
    top: -0.8rem;
    clip-path: polygon(50% 0, 100% 100%, 0 100%);
  }

  &--bottom {
    bottom: -0.8rem;
    clip-path: polygon(0 0, 100% 0, 50% 100%);
  }
}

.availability-grid {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  background: rgba(255, 255, 255, 0.012);
}

.availability-item {
  position: relative;
  display: flex;
  min-width: 0;
  padding: 12px 14px;
  flex-direction: column;
  justify-content: center;
  gap: 6px;

  & + & {
    border-left: 1px solid rgba(255, 255, 255, 0.09);
  }

  &::after {
    position: absolute;
    right: 7px;
    bottom: 7px;
    width: 4px;
    height: 4px;
    border-right: 1px solid rgba(90, 212, 128, 0.45);
    border-bottom: 1px solid rgba(90, 212, 128, 0.45);
    content: '';
  }

  > span {
    color: rgba(255, 255, 255, 0.3);
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 0.42rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  > strong {
    overflow: hidden;
    color: rgba(255, 255, 255, 0.88);
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 0.7rem;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.availability-actions {
  display: grid;
  min-width: 0;
  border-left: 1px solid rgba(90, 212, 128, 0.28);
}

.availability-cta {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  color: #5ad480;
  background: linear-gradient(135deg, rgba(90, 212, 128, 0.09), transparent);
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 0.54rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  line-height: 1.5;
  text-decoration: none;
  transition: color 0.25s ease, background 0.25s ease;

  &:hover,
  &:focus-visible {
    color: #071009;
    background: #5ad480;
    outline: none;
  }
}

.availability-cta__content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}

.availability-cta__icon {
  width: 0.66rem;
  height: 0.66rem;
  flex: none;
}

.availability-cta--resume {
  width: 100%;
  appearance: none;
  cursor: pointer;
  border: 0;
  border-top: 1px solid rgba(90, 212, 128, 0.22);
}

@keyframes availabilityCrtOn {
  0% {
    opacity: 0;
    transform: scale3d(0, 0.005, 1);
  }
  45% {
    opacity: 0.36;
    transform: scale3d(1, 0.005, 1);
  }
  72% {
    opacity: 0.72;
    transform: scale3d(1, 0.7, 1);
  }
  100% {
    opacity: 1;
    transform: scale3d(1, 1, 1);
  }
}

@media (max-width: 1199px) and (min-width: 769px) {
  .availability-panel {
    grid-template-columns: minmax(320px, 0.9fr) minmax(420px, 1.1fr);
  }

  .availability-actions {
    min-height: 48px;
    grid-column: 1 / -1;
    border-top: 1px solid rgba(90, 212, 128, 0.22);
    border-left: 0;
  }

  .availability-cta {
    min-height: 42px;
  }
}

@media (max-width: 768px) {
  .availability-panel,
  .availability-panel--en {
    grid-template-columns: 1fr;
    margin: 0 0 18px;
  }

  .availability-copy {
    grid-column: 1 / -1;
    padding: 16px 18px 14px 2.35rem;
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.09);

    h2 {
      font-size: 0.95rem;
    }

    p {
      font-size: 0.55rem;
    }
  }

  .availability-copy__crystal {
    top: 0.9rem;
    bottom: 0.9rem;
    left: 0.8rem;
    width: 0.9rem;
  }

  .availability-copy__crystal-tip {
    height: 0.32rem;

    &--top {
      top: -0.32rem;
    }

    &--bottom {
      bottom: -0.32rem;
    }
  }

  .availability-grid {
    min-height: 84px;
    grid-column: 1 / -1;
    margin-left: 4px;
  }

  .availability-item {
    align-items: center;
    padding: 9px 6px;
    text-align: center;

    span {
      font-size: 0.62rem;
    }

    strong {
      font-size: 0.55rem;
    }
  }

  .availability-actions {
    display: flex;
    min-height: 64px;
    grid-column: 1 / -1;
    align-items: center;
    justify-content: center;
    border-top: 1px solid rgba(90, 212, 128, 0.22);
    border-left: 0;
  }

  .availability-cta {
    width: 100%;
    min-height: 64px;
    padding: 0 16px;
    font-size: 0.74rem;
  }

  .availability-cta--resume {
    border-top: 0;
  }
}
</style>
