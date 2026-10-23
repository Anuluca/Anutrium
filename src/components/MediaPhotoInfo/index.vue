<template>
  <div
    class="photo-info__inner"
    :style="{
      '--photo-info-meta-gap': `${Math.max(0, timeDividerPadding / 2)}px`,
    }"
  >
    <span class="photo-info__device">{{ item.device || '' }}</span>
    <span class="photo-info__meta">
      <span v-if="item.time" class="photo-info__time">{{ item.time }}</span>
      <span
        v-if="item.time && item.location"
        class="photo-info__divider"
        aria-hidden="true"
      />
      <span v-if="item.location" class="photo-info__location">
        <Location class="photo-info__location-icon" aria-hidden="true" />
        <span>{{ item.location }}</span>
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { Location } from '@element-plus/icons-vue'

interface PhotoInfo {
  device?: string
  location?: string
  time?: string
}

withDefaults(
  defineProps<{
    item: PhotoInfo
    timeDividerPadding?: number
  }>(),
  {
    timeDividerPadding: 16,
  }
)
</script>

<style lang="less" scoped>
@mono: 'UnboundedSans', 'Courier New', monospace;
@cjk: 'alibaba-puhuiti', sans-serif;

.photo-info {
  &__inner {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: ~'4PX';
    align-items: center;
    min-height: 28px;
    padding: 4px 12px 5px;
    color: #fff;
    font-family: @cjk;
    font-size: 0.48rem;
    line-height: 1.25;
    text-align: left;

    > span {
      position: relative;
      min-width: 0;
      overflow: hidden;
      padding: 0;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__device {
    color: var(--page-theme-color, #e23456);
    font-family: @mono;
    font-weight: 800;
    text-align: left;
  }

  &__time {
    font-family: @cjk;
    font-weight: 900;
    white-space: nowrap;
  }

  &__inner > &__meta {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--photo-info-meta-gap);
    overflow: visible;
    padding: 0;
  }

  &__divider {
    flex: 0 0 ~'8PX';
    height: ~'1PX';
    background: color-mix(
      in srgb,
      var(--page-theme-color, #e23456) 52%,
      transparent
    );
  }

  &__location {
    font-family: @cjk;
    font-weight: 900;
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 4px;
    overflow: visible !important;
    text-align: left;
    white-space: normal !important;

    span {
      overflow-wrap: anywhere;
    }
  }

  &__location-icon {
    flex: 0 0 auto;
    width: 14px;
    height: 14px;
    color: var(--page-theme-color, #e23456);
  }
}

@media (max-width: 900px) {
  .photo-info__inner {
    min-height: 26px;
    padding: 3px 6px 4px;
    font-size: 0.4rem;
  }
}

@media (max-width: 768px) {
  .photo-info__inner {
    grid-template-columns: minmax(0, 1fr);
    padding-left: ~'18PX';
  }

  .photo-info__inner > .photo-info__meta {
    justify-content: flex-start;
  }
}
</style>
