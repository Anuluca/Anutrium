<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { moveTypes, type PetMove } from '@/locales/dynamic/petMoves'

const props = defineProps<{ move: PetMove; enterIndex?: number }>()
const { locale } = useI18n()
const language = computed(() => (locale.value === 'en' ? 'en' : 'zhCn'))
const type = computed(() => moveTypes[props.move.type])
</script>

<template>
  <div
    class="flora-move-card no-rem is-clickable"
    :class="{ 'has-entrance': enterIndex !== undefined }"
    :style="{
      '--move-color': type.color,
      '--move-enter-index': enterIndex ?? 0,
    }"
    :data-move-type="move.type"
  >
    <strong class="flora-move-card__name"
      ><span>{{ move.name[language] }}</span></strong
    >
    <span class="flora-move-card__type">{{ type.name[language] }}</span>
    <span class="flora-move-card__pp">{{ move.pp }}/{{ move.pp }}</span>
  </div>
</template>

<style scoped lang="less">
.flora-move-card.no-rem {
  --move-name-duration: 220ms;
  --move-detail-duration: 550ms;
  --move-enter-step: calc(
    var(--move-name-duration) + var(--move-detail-duration) + 30ms
  );
  --move-enter-delay: calc(var(--move-enter-index) * var(--move-enter-step));
  --move-detail-delay: calc(
    var(--move-enter-delay) + var(--move-name-duration)
  );
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  min-width: 0;
  height: 48px;
  padding-left: 0;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 0 999px 999px 0;
  overflow: visible;
  color: #fffff4;
  font-family: 'alibaba-puhuiti', sans-serif;
  cursor: pointer;
  .flora-move-card__name > span,
  .flora-move-card__type,
  .flora-move-card__pp {
    -webkit-mask-image: repeating-linear-gradient(
      to bottom,
      rgb(0 0 0 / var(--flora-detail-scanline-opacity, 0.45)) 0
        var(--flora-scanline-gap, 1px),
      #000 var(--flora-scanline-gap, 1px) var(--flora-scanline-period, 3px)
    );
    mask-image: repeating-linear-gradient(
      to bottom,
      rgb(0 0 0 / var(--flora-detail-scanline-opacity, 0.45)) 0
        var(--flora-scanline-gap, 1px),
      #000 var(--flora-scanline-gap, 1px) var(--flora-scanline-period, 3px)
    );
  }
  .flora-move-card__type,
  .flora-move-card__pp {
    -webkit-text-fill-color: currentColor;
    -webkit-text-stroke: 0;
  }
  &::before,
  &::after {
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    -webkit-mask-image: linear-gradient(to right, transparent, #000 45%),
      repeating-linear-gradient(
        to bottom,
        rgb(0 0 0 / var(--flora-detail-scanline-opacity, 0.45)) 0
          var(--flora-scanline-gap, 1px),
        #000 var(--flora-scanline-gap, 1px) var(--flora-scanline-period, 3px)
      );
    mask-image: linear-gradient(to right, transparent, #000 45%),
      repeating-linear-gradient(
        to bottom,
        rgb(0 0 0 / var(--flora-detail-scanline-opacity, 0.45)) 0
          var(--flora-scanline-gap, 1px),
        #000 var(--flora-scanline-gap, 1px) var(--flora-scanline-period, 3px)
      );
    -webkit-mask-composite: source-in;
    mask-composite: intersect;
    pointer-events: none;
    transition: opacity 200ms ease;
    content: '';
  }
  &::before {
    --move-enter-opacity: 0.2;
    background: var(--move-color);
    opacity: 0.2;
  }
  &::after {
    --move-enter-opacity: 0.5;
    border: 1px solid var(--move-color);
    opacity: 0.5;
  }
  .flora-move-card__name {
    flex: 1;
    min-width: 0;
    font-family: 'UnboundedSans', sans-serif;
    font-size: 72px;
    font-weight: 400;
    color: var(--move-color);
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: 1.5px var(--move-color);
    line-height: 1;
    // 补偿 UnboundedSans 中文字形相对行盒中心约 0.06em 的向下偏移。
    transform: translateY(-0.06em);
    white-space: nowrap;
    > span {
      display: inline-block;
    }
  }
  .flora-move-card__type {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    min-width: 68px;
    box-sizing: border-box;
    padding: 4px 8px;
    margin-left: 8px;
    background: color-mix(in srgb, var(--move-color) 50%, transparent);
    font-size: 14px;
    font-weight: 900;
    text-align: center;
    transition: background-color 200ms ease;
  }
  .flora-move-card__pp {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: stretch;
    flex-shrink: 0;
    width: 120px;
    box-sizing: border-box;
    padding: 8px 18px 8px 30px;
    margin-left: 12px;
    background: #202020;
    border-radius: 0 999px 999px 0;
    clip-path: polygon(24px 0, 100% 0, 100% 100%, 0 100%);
    font-size: 24px;
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  &.has-entrance {
    .flora-move-card__name > span {
      animation: flora-move-name-enter var(--move-name-duration) ease
        var(--move-enter-delay) backwards;
    }
    &::before,
    &::after,
    .flora-move-card__type,
    .flora-move-card__pp {
      animation: flora-move-details-enter var(--move-detail-duration)
        cubic-bezier(0.22, 1, 0.36, 1) var(--move-detail-delay) backwards;
    }
  }
  @media (hover: hover) and (pointer: fine) {
    &:hover {
      &::before {
        opacity: 0.6;
      }
      &::after {
        opacity: 0.8;
      }
      .flora-move-card__name,
      .flora-move-card__type,
      .flora-move-card__pp {
        -webkit-text-fill-color: currentColor;
        -webkit-text-stroke-width: 0;
      }
      .flora-move-card__type {
        background: var(--move-color);
      }
    }
  }
  @media (max-width: 767px) {
    height: 22px;
    .flora-move-card__name {
      font-size: clamp(22px, 6vw, 28px);
      -webkit-text-stroke-width: 0.7px;
      transform: none;
    }
    .flora-move-card__type {
      min-width: 32px;
      padding: 2px 3px;
      margin-left: 2px;
      font-size: 9px;
    }
    .flora-move-card__pp {
      width: 64px;
      margin-left: 2px;
      padding: 0 9px 0 16px;
      font-size: 14px;
      clip-path: polygon(14px 0, 100% 0, 100% 100%, 0 100%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &.has-entrance {
      &::before,
      &::after,
      .flora-move-card__name > span,
      .flora-move-card__type,
      .flora-move-card__pp {
        animation: none;
      }
    }
    &,
    &::before,
    &::after,
    .flora-move-card__type {
      transition: none;
    }
  }
}
@keyframes flora-move-name-enter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes flora-move-details-enter {
  from {
    opacity: 0;
    transform: translateX(-48px);
  }
  to {
    opacity: var(--move-enter-opacity, 1);
    transform: translateX(0);
  }
}
</style>
