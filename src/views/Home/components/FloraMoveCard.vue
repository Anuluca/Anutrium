<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { moveTypes, type PetMove } from '@/locales/dynamic/petMoves'

const props = defineProps<{ move: PetMove }>()
const { locale } = useI18n()
const language = computed(() => (locale.value === 'en' ? 'en' : 'zhCn'))
const type = computed(() => moveTypes[props.move.type])
</script>

<template>
  <div
    class="flora-move-card no-rem is-clickable"
    :style="{ '--move-color': type.color }"
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
      transparent 0 var(--flora-scanline-gap, 1px),
      #000 var(--flora-scanline-gap, 1px) var(--flora-scanline-period, 4px)
    );
    mask-image: repeating-linear-gradient(
      to bottom,
      transparent 0 var(--flora-scanline-gap, 1px),
      #000 var(--flora-scanline-gap, 1px) var(--flora-scanline-period, 4px)
    );
  }
  .flora-move-card__type,
  .flora-move-card__pp {
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: 0.6px currentColor;
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
        transparent 0 var(--flora-scanline-gap, 1px),
        #000 var(--flora-scanline-gap, 1px) var(--flora-scanline-period, 4px)
      );
    mask-image: linear-gradient(to right, transparent, #000 45%),
      repeating-linear-gradient(
        to bottom,
        transparent 0 var(--flora-scanline-gap, 1px),
        #000 var(--flora-scanline-gap, 1px) var(--flora-scanline-period, 4px)
      );
    -webkit-mask-composite: source-in;
    mask-composite: intersect;
    pointer-events: none;
    transition: opacity 200ms ease;
    content: '';
  }
  &::before {
    background: var(--move-color);
    opacity: 0.2;
  }
  &::after {
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
    height: 44px;
    .flora-move-card__name {
      font-size: 62px;
    }
    .flora-move-card__type {
      min-width: 36px;
      padding: 3px 4px;
      margin-left: 4px;
      font-size: 10px;
    }
    .flora-move-card__pp {
      width: 64px;
      margin-left: 4px;
      padding: 6px 9px 6px 16px;
      font-size: 14px;
      clip-path: polygon(14px 0, 100% 0, 100% 100%, 0 100%);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &,
    &::before,
    &::after,
    .flora-move-card__type {
      transition: none;
    }
  }
}
</style>
