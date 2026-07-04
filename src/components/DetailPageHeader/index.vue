<template>
  <header class="detail-page-header" :class="{ 'has-divider': divider }">
    <button class="detail-page-header__back" type="button" @click="goBack">
      <span>{{ backLabel }}</span>
    </button>

    <div class="detail-page-header__title-block">
      <div class="detail-page-header__title-row">
        <h1>{{ title }}</h1>
        <slot name="title-extra" />
        <div
          v-if="counter || $slots.actions"
          class="detail-page-header__actions"
        >
          <span v-if="counter" class="detail-page-header__counter">
            <strong>{{ counter.value }}</strong>
            <span>{{ counter.label }}</span>
          </span>
          <slot name="actions" />
        </div>
      </div>

      <div
        v-if="subtitle || $slots['subtitle-extra']"
        class="detail-page-header__subtitle-row"
      >
        <p v-if="subtitle">{{ subtitle }}</p>
        <slot name="subtitle-extra" />
      </div>

      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

export interface DetailPageHeaderCounter {
  value: number | string
  label: string
}

const props = withDefaults(
  defineProps<{
    backLabel: string
    backPath: string
    counter?: DetailPageHeaderCounter
    divider?: boolean
    subtitle?: string
    title: string
  }>(),
  {
    counter: undefined,
    divider: false,
    subtitle: '',
  }
)

const router = useRouter()
const goBack = () => {
  const previousPath = window.history.state?.back
  const expectedPath = router.resolve(props.backPath).fullPath

  if (
    typeof previousPath === 'string' &&
    router.resolve(previousPath).fullPath === expectedPath
  ) {
    router.back()
    return
  }

  router.push(props.backPath)
}
</script>

<style lang="less" scoped>
.detail-page-header {
  margin-bottom: 0;
  opacity: 0;
  animation: detailPageHeaderFadeIn 0.42s ease-out 0.08s both;

  &.has-divider {
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--border-color);
  }

  &__back {
    position: relative;
    display: inline-block;
    margin: 0 0 12px;
    padding: 0;
    border: 0;
    color: #3276fe;
    background: transparent;
    font-family: 'cn-custom', 'Courier New', monospace;
    font-size: 17px;
    letter-spacing: 0.1em;
    transform: scaleX(0.9);
    transform-origin: left;
    cursor: pointer;
    transition: color 0.2s ease, margin 0.2s ease;
    user-select: none;
    animation: detailPageHeaderBackIn 0.34s ease-out 0.14s both;

    &::before {
      content: '// ';
    }

    &:hover {
      margin-left: -4px;
      color: #e8284a;

      &::before {
        color: #e8284a;
        content: '<< ';
      }
    }
  }

  &__title-block {
    padding-left: 18px;
    border-left: 8px solid #e23456;
    animation: detailPageHeaderTitleIn 0.46s cubic-bezier(0.2, 0.8, 0.2, 1)
      0.22s both;
  }

  &__title-row {
    display: flex;
    align-items: flex-end;
    gap: 12px;

    h1 {
      min-width: 0;
      margin: 0 0 6px;
      color: var(--text-color);
      font-family: 'cn-custom', 'Courier New', monospace;
      font-size: clamp(1.35rem, 2.6vw, 2rem);
      font-weight: 900;
      line-height: 1;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
  }

  &__counter {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    margin-bottom: 6px;
    color: var(--text-faint);
    font-family: 'cn-custom', 'Courier New', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    white-space: nowrap;

    strong {
      color: #e23456;
      font-family: 'Anton', 'cn-custom', 'Courier New', monospace;
      font-size: 16px;
      line-height: 1;
    }
  }

  &__subtitle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    animation: detailPageHeaderMetaIn 0.34s ease-out 0.44s both;

    p {
      margin: 0;
      color: var(--text-faint);
      font-family: 'alibaba-puhuiti', sans-serif;
      font-size: 13px;
    }
  }

  &__title-block > :not(&__title-row):not(&__subtitle-row) {
    animation: detailPageHeaderMetaIn 0.34s ease-out 0.5s both;
  }
}

@keyframes detailPageHeaderFadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes detailPageHeaderBackIn {
  from {
    opacity: 0;
    clip-path: inset(0 100% 0 0);
  }

  to {
    opacity: 1;
    clip-path: inset(0);
  }
}

@keyframes detailPageHeaderTitleIn {
  from {
    opacity: 0;
    transform: translateY(14px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes detailPageHeaderMetaIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .detail-page-header__subtitle-row {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .detail-page-header,
  .detail-page-header__back,
  .detail-page-header__title-block,
  .detail-page-header__subtitle-row,
  .detail-page-header__title-block
    > :not(.detail-page-header__title-row):not(
      .detail-page-header__subtitle-row
    ) {
    opacity: 1;
    animation: none !important;
    transform: none;
  }
}
</style>
