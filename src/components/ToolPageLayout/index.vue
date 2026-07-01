<template>
  <div :class="[pageClass, 'main-container']">
    <header class="pt-header">
      <button
        class="pt-header__tag"
        type="button"
        @click="router.push(backPath)"
      >
        CRAFT
      </button>
      <div class="pt-header__title-block">
        <div class="pt-header__title-row">
          <h1 class="pt-header__title">{{ title }}</h1>
          <ToolHeaderActions
            :tool-id="toolId"
            :title="title"
            :description="shareDescription || description"
          />
        </div>
        <p class="pt-header__sub">
          {{ description }}
          <span class="pt-header__motto">// {{ motto }}</span>
        </p>
      </div>
    </header>

    <slot />

    <div class="footer-wrap">
      <PageFooter third-party :recommended-tools="recommendedTools" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

import PageFooter from '@/components/PageFooter/index.vue'
import ToolHeaderActions from '@/components/ToolHeaderActions/index.vue'

export interface RecommendedTool {
  label: string
  path: string
}

withDefaults(
  defineProps<{
    backPath?: string
    description: string
    motto?: string
    pageClass: string
    recommendedTools?: RecommendedTool[]
    shareDescription?: string
    title: string
    toolId: string
  }>(),
  {
    backPath: '/craft',
    motto: 'HUAHUA_THE_CAT',
    recommendedTools: () => [],
    shareDescription: '',
  }
)

const router = useRouter()
</script>

<style lang="less" scoped>
.pt-header {
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 20px;
  animation: tool-section-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;

  &__tag {
    position: relative;
    margin: 0 0 12px;
    padding: 0;
    border: 0;
    color: #3276fe;
    background: transparent;
    font-family: 'cn-custom';
    font-size: 17px;
    letter-spacing: 0.1em;
    transform: scaleX(0.9);
    transform-origin: left;
    cursor: pointer;
    transition: color 0.2s ease, margin 0.2s ease;
    user-select: none;

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

  &__title-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }

  &__title-block {
    padding-left: 18px;
    border-left: 8px solid #e23456;
  }

  &__title {
    flex: 1;
    min-width: 0;
    margin: 0;
    color: var(--text-color);
    font-family: 'cn-custom';
    font-size: 42px;
    letter-spacing: 0.05em;
  }

  &__sub {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0;
    font-family: 'alibaba-puhuiti';
    color: var(--text-faint);
    font-size: 13px;
  }

  &__motto {
    color: rgba(255, 255, 255, 0.15);
    font-family: 'STSong', monospace;
    font-size: 11px;
  }
}

.footer-wrap {
  animation: tool-section-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) 0.25s both;
}

@keyframes tool-section-in {
  0% {
    opacity: 0;
    transform: translateY(15px);
  }

  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 900px) {
  .pt-header__sub {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}

@media (max-width: 600px) {
  .pt-header__title {
    font-size: 32px;
  }
}
</style>
