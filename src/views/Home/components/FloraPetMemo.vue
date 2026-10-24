<script setup lang="ts">
import { computed } from 'vue'
import { I18nT, useI18n } from 'vue-i18n'

import { petNatures, type PetProfile } from '@/locales/dynamic/pets'

const props = defineProps<{ pet: PetProfile }>()
const { locale } = useI18n({
  useScope: 'local',
  messages: {
    zhCn: {
      nature: '{nature}的性格。',
      encounter: '在{place}遇到了它。',
    },
    en: { nature: '{nature} nature.', encounter: 'Met in {place}.' },
  },
})
const language = computed(() => (locale.value === 'en' ? 'en' : 'zhCn'))
const nature = computed(() => petNatures[props.pet.nature].name[language.value])
const date = computed(() => {
  const { year, month } = props.pet.birthMonth
  // 出生年月只作为展示来源，不补造具体出生日或相遇日。
  return language.value === 'zhCn'
    ? `${year}年${String(month).padStart(2, '0')}月`
    : new Intl.DateTimeFormat('en', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(Date.UTC(year, month - 1, 1)))
})
</script>

<template>
  <div :key="`${pet.id}:${language}`" class="flora-pet-memo no-rem" @click.stop>
    <p>
      <span class="flora-pet-memo__content">
        <I18nT
          keypath="nature"
          scope="parent"
          tag="span"
          class="flora-pet-memo__line"
        >
          <template #nature
            ><strong>{{ nature }}</strong></template
          >
        </I18nT>
      </span>
    </p>
    <p class="flora-pet-memo__date">
      <span class="flora-pet-memo__content">
        <span class="flora-pet-memo__line"
          ><strong>{{ date }}</strong></span
        >
      </span>
    </p>
    <p>
      <span class="flora-pet-memo__content">
        <I18nT
          keypath="encounter"
          scope="parent"
          tag="span"
          class="flora-pet-memo__line"
        >
          <template #place
            ><strong>{{ pet.metPlace[language] }}</strong></template
          >
        </I18nT>
      </span>
    </p>
    <p>
      <span class="flora-pet-memo__content">
        <span class="flora-pet-memo__line"
          ><strong>{{ pet.characteristic[language] }}</strong></span
        >
      </span>
    </p>
  </div>
</template>

<style scoped lang="less">
.flora-pet-memo.no-rem {
  --flora-memo-enter-duration: 700ms;
  --flora-memo-enter-delay: 200ms;
  --flora-memo-reveal-delay: calc(
    var(--flora-memo-enter-delay) + var(--flora-memo-enter-duration) - 300ms
  );
  min-width: 0;
  margin-top: var(--flora-profile-memo-gap, 20px);
  color: var(--text-color);
  font-family: 'UnboundedSans', sans-serif;
  font-size: var(--flora-profile-memo-size, clamp(45px, 4.7cqw, 62px));
  line-height: 1.15;
  overflow-wrap: anywhere;
  opacity: var(--flora-memo-opacity, 0.3);
  animation: flora-memo-enter var(--flora-memo-enter-duration)
    cubic-bezier(0.22, 1, 0.36, 1) var(--flora-memo-enter-delay) both;
  -webkit-mask-image: repeating-linear-gradient(
    to bottom,
    rgb(0 0 0 / var(--flora-detail-scanline-opacity, 0.45)) 0
      var(--flora-detail-scanline-gap, 1px),
    #000 var(--flora-detail-scanline-gap, 1px)
      var(--flora-detail-scanline-period, 3px)
  );
  mask-image: repeating-linear-gradient(
    to bottom,
    rgb(0 0 0 / var(--flora-detail-scanline-opacity, 0.45)) 0
      var(--flora-detail-scanline-gap, 1px),
    #000 var(--flora-detail-scanline-gap, 1px)
      var(--flora-detail-scanline-period, 3px)
  );

  // 内容与遮罩使用相同进度，避免半透明模块提前透出文字。
  p::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--flora-theme-color);
    pointer-events: none;
    transform-origin: left center;
    animation: flora-memo-cover-out 850ms cubic-bezier(0.65, 0, 0.35, 1)
      var(--flora-memo-reveal-delay) both;
  }
  .flora-pet-memo__content {
    display: block;
    animation: flora-memo-reveal 850ms cubic-bezier(0.65, 0, 0.35, 1)
      var(--flora-memo-reveal-delay) both;
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;

    p::after {
      display: none;
      animation: none;
    }
    .flora-pet-memo__content {
      animation: none;
    }
  }

  p {
    position: relative;
    width: fit-content;
    max-width: 100%;
    margin: 0;
    padding: 0;
  }
  .flora-pet-memo__date {
    margin-bottom: calc(-0.3em + 3px);
  }
  .flora-pet-memo__line {
    padding: 0 6px;
    background-image: linear-gradient(
      color-mix(in srgb, var(--flora-theme-color) 50%, transparent),
      color-mix(in srgb, var(--flora-theme-color) 50%, transparent)
    );
    background-size: 100% 0.9em;
    background-position: center;
    background-repeat: no-repeat;
    -webkit-box-decoration-break: clone;
    box-decoration-break: clone;
  }
  strong {
    font-weight: 400;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: 1px currentColor;
  }
}
@keyframes flora-memo-enter {
  from {
    opacity: 0;
    transform: translateX(80px);
  }
  to {
    opacity: var(--flora-memo-opacity, 0.3);
    transform: translateX(0);
  }
}
@keyframes flora-memo-cover-out {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}
@keyframes flora-memo-reveal {
  from {
    clip-path: inset(0 0 0 100%);
  }
  to {
    clip-path: inset(0);
  }
}
</style>
