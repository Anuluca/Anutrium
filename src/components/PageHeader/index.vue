<template>
  <header
    class="page-header"
    :class="{ 'page-header--mobile-tall': mobileTall }"
    :style="{
      '--primary-color': primaryColor,
      '--title-cn-right': titleCnRight,
    }"
  >
    <div class="header-bg-icon" aria-hidden="true">
      <component :is="headerIcon" />
    </div>
    <div class="header-content">
      <div class="header-label">{{ headerLabel }}</div>
      <div class="page-title-wrapper">
        <h1 class="page-title">
          <TypedText
            class="title-en"
            :text="titleEn"
            :delay="220"
            :speed="42"
          />
          <span class="title-cn">{{ titleCn }}</span>
        </h1>
      </div>
      <div class="header-meta">
        <TypedText
          class="meta-item"
          :text="metaItem"
          :delay="520"
          :speed="24"
        />
        <div class="header-scan-line" />
      </div>
    </div>

    <div class="corner corner-tl" />
    <div class="corner corner-tr" />
    <div class="corner corner-bl" />
    <div class="corner corner-br" />
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Collection,
  HomeFilled,
  MapLocation,
  Ship,
  Tools,
  UserFilled,
} from '@element-plus/icons-vue'

import TypedText from '@/components/TypedText/index.vue'
import type { HeaderIconName } from '@/router'

const route = useRoute()
const headerIconMap: Record<HeaderIconName, typeof Collection> = {
  Collection,
  HomeFilled,
  MapLocation,
  Ship,
  Tools,
  UserFilled,
}

const headerIcon = computed(
  () =>
    headerIconMap[
      (route.meta.headerIcon as HeaderIconName | undefined) || 'HomeFilled'
    ]
)

defineProps({
  headerLabel: {
    type: String,
    required: true,
  },
  titleEn: {
    type: String,
    required: true,
  },
  titleCn: {
    type: String,
    required: true,
  },
  metaItem: {
    type: String,
    required: true,
  },
  primaryColor: {
    type: String,
    default: '#3B69F4',
  },
  titleCnRight: {
    type: String,
    default: '-3rem',
  },
  mobileTall: {
    type: Boolean,
    default: false,
  },
})
</script>

<style lang="less" scoped>
@border: rgba(255, 255, 255, 0.08);
@text-dim: rgba(255, 255, 255, 0.4);

.page-header {
  position: relative;
  padding: 40px 0 30px;
  overflow: hidden;
  padding-left: 30px;
  opacity: 0;
  animation: pageHeaderFadeIn 0.42s ease-out 0.08s both;

  .header-bg-icon {
    position: absolute;
    top: 50%;
    right: 28px;
    display: grid;
    place-items: center;
    width: clamp(78px, 7vw, 116px);
    height: clamp(78px, 7vw, 116px);
    padding: 13px;
    box-sizing: border-box;
    transform: translateY(-50%);
    color: var(--primary-color);
    opacity: 0;
    pointer-events: none;
    filter: drop-shadow(0 0 14px var(--primary-color));
    animation: headerBgIconFadeIn 0.58s ease-out 0.78s both;

    &::before {
      position: absolute;
      inset: 7px;
      border: 1px solid currentColor;
      content: '';
      opacity: 0.46;
      transform: rotate(45deg) scale(0.72);
    }

    &::after {
      position: absolute;
      top: 50%;
      right: -18px;
      left: -18px;
      height: 1px;
      background: linear-gradient(
        to right,
        transparent,
        currentColor 24%,
        currentColor 76%,
        transparent
      );
      content: '';
      opacity: 0.34;
    }

    svg {
      position: relative;
      z-index: 1;
      width: 100%;
      height: 100%;
      stroke-width: 1.4;
    }
  }

  .header-content {
    position: relative;
    z-index: 1;
  }

  .header-label {
    font-family: 'cn-custom', monospace;
    font-size: 0.4rem;
    color: var(--primary-color);
  }

  .page-title {
    font-family: 'anton', sans-serif;
    font-size: 2.5rem;
    line-height: 1;
    letter-spacing: -1px;
    margin-top: -10px;
    display: flex;
    align-items: end;
    gap: 0;
    position: relative;
    z-index: 1;

    .title-en {
      font-family: 'cn-custom', monospace;
      color: #fff;
      position: relative;
      z-index: 3;
    }

    .title-cn {
      font-family: 'alibaba-puhuiti', sans-serif;
      font-weight: 700;
      font-size: 0.3em;
      color: #fff;
      letter-spacing: 1px;
      right: var(--title-cn-right);
      z-index: 3;
      background: var(--primary-color);
      padding: 5px 20px;
      padding-bottom: 8px;
      margin-left: 10px;
    }
  }

  .page-title-wrapper {
    position: relative;
    display: inline-block;
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 4px;
    padding-bottom: 6px;

    .meta-item {
      font-family: 'alibaba-puhuiti', monospace;
      font-weight: 600;
      font-size: 0.4rem;
      color: @text-dim;
    }
  }

  .header-scan-line {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 60%;
    height: 1px;
    background: linear-gradient(to right, var(--primary-color), transparent);
  }
}

.corner {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 3;
  pointer-events: none;
  transition: all 0.4s ease;

  &-tl {
    top: 15px;
    left: 0;
    border-right: 0;
    border-bottom: 0;
  }
  &-tr {
    top: 15px;
    right: 15px;
    border-left: 0;
    border-bottom: 0;
  }
  &-bl {
    bottom: 15px;
    left: 0;
    border-right: 0;
    border-top: 0;
  }
  &-br {
    bottom: 15px;
    right: 15px;
    border-left: 0;
    border-top: 0;
  }
}

@keyframes pageHeaderFadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes headerBgIconFadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 0.5;
  }
}

@media (max-width: 768px) {
  .page-header {
    padding: 20px 40px;
    padding-left: 20px;
  }

  .page-header--mobile-tall {
    display: flex;
    align-items: center;
    min-height: clamp(150px, 40vw, 188px);
    padding-top: clamp(24px, 5svh, 40px);
    padding-bottom: clamp(24px, 5svh, 40px);

    .header-bg-icon {
      top: auto;
      right: clamp(12px, 4vw, 24px);
      bottom: clamp(12px, 3vw, 22px);
      width: clamp(76px, 24vw, 112px);
      height: clamp(76px, 24vw, 112px);
      padding: clamp(10px, 3vw, 14px);
      transform: none;
    }

    .header-content {
      width: 100%;
    }

    .page-title {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      margin-top: 4px;
      letter-spacing: 0;

      .title-en {
        font-size: clamp(2.25rem, 10.5vw, 3.5rem);
        line-height: 0.92;
      }

      .title-cn {
        display: block;
        width: fit-content;
        margin-left: 0;
        font-size: clamp(0.7rem, 3.2vw, 0.9rem);
        line-height: 1;
      }
    }
  }

  .page-title {
    gap: 4px;
    font-size: 1.8rem;

    .title-en {
      font-size: 1.8rem;
      word-break: break-word;
    }

    .title-cn {
      position: static;
      font-size: 0.35em;
      padding: 3px 16px;
      background: var(--primary-color);
      display: inline-block;
      width: fit-content;
    }
  }

  .header-label {
    font-size: 0.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .page-header {
    animation: none;
    opacity: 1;

    .header-bg-icon {
      animation: none;
      opacity: 0.5;
    }
  }
}
</style>
