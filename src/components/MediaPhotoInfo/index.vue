<template>
  <div
    class="photo-info__inner"
    :style="{ '--photo-info-time-padding': `${timeDividerPadding}px` }"
  >
    <span class="photo-info__device">{{ item.device || '' }}</span>
    <span
      class="photo-info__time"
      :class="{
        'photo-info__time--divided': item.time && item.location,
      }"
    >
      {{ item.time || '' }}
    </span>
    <span class="photo-info__location">
      <Location
        v-if="item.location"
        class="photo-info__location-icon"
        aria-hidden="true"
      />
      <span>{{ item.location || '' }}</span>
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
@red: #e23456;
@mono: 'UnboundedSans', 'Courier New', monospace;
@cjk: 'alibaba-puhuiti', sans-serif;

.photo-info {
  &__inner {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    min-height: 28px;
    padding: 4px 12px 5px;
    color: #fff;
    font-family: @cjk;
    font-size: 0.48rem;
    line-height: 1.25;
    text-align: center;

    > span {
      position: relative;
      min-width: 0;
      overflow: hidden;
      padding: 0 10px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__device {
    color: @red;
    font-family: @mono;
    font-weight: 800;
    text-align: left;
  }

  &__time {
    padding-right: var(--photo-info-time-padding) !important;

    &--divided {
      background: linear-gradient(
          rgba(117, 18, 38, 0.9),
          rgba(117, 18, 38, 0.9)
        )
        right center / 8px 1px no-repeat;
    }
  }

  &__location {
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    overflow: visible !important;
    padding-left: 8px !important;
    text-align: right;
    white-space: normal !important;

    span {
      overflow-wrap: anywhere;
    }
  }

  &__location-icon {
    flex: 0 0 auto;
    width: 14px;
    height: 14px;
    color: @red;
  }
}

@media (max-width: 900px) {
  .photo-info__inner {
    min-height: 26px;
    padding: 3px 6px 4px;
    font-size: 0.4rem;

    > span {
      padding: 0 5px;
    }
  }
}
</style>
