<template>
  <nav class="filter-rail" :aria-label="ariaLabel">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      :class="{ 'is-active': item.id === modelValue }"
      :style="{ '--filter-rail-accent': item.accentColor || accentColor }"
      @click="$emit('update:modelValue', item.id)"
    >
      <span
        v-if="showAvatar"
        class="filter-rail__avatar"
        :class="{ 'is-collage': item.imageUrls && item.imageUrls.length > 1 }"
        aria-hidden="true"
      >
        <img
          v-for="imageUrl in item.imageUrls?.slice(0, 2)"
          :key="imageUrl"
          :src="imageUrl"
          alt=""
          loading="lazy"
        />
        <span v-if="!item.imageUrls?.length" class="filter-rail__marker">
          {{ item.marker || item.title.slice(0, 2) }}
        </span>
      </span>
      <span class="filter-rail__copy">
        <strong>{{ item.title }}</strong>
        <small v-if="item.count !== undefined" class="filter-rail__count">
          {{ item.count }}
        </small>
      </span>
    </button>
  </nav>
</template>

<script setup lang="ts">
export interface FilterRailItem {
  id: string
  title: string
  count?: number
  marker?: string
  imageUrls?: string[]
  accentColor?: string
}

withDefaults(
  defineProps<{
    accentColor?: string
    ariaLabel: string
    items: FilterRailItem[]
    modelValue: string
    showAvatar?: boolean
  }>(),
  {
    accentColor: '#e23456',
    showAvatar: true,
  }
)

defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()
</script>

<style lang="less" scoped>
.filter-rail {
  position: sticky;
  top: 92px;
  display: flex;
  align-items: stretch;
  align-self: start;
  flex-direction: column;
  gap: 4px;
  max-height: calc(100vh - 120px);
  padding: 18px 16px 18px 0;
  overflow-y: auto;
  border-right: 1px solid var(--border-color);
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  button {
    position: relative;
    display: flex;
    width: 100%;
    min-width: 0;
    flex: 0 0 auto;
    align-items: center;
    gap: 10px;
    padding: 8px 12px 13px;
    border: 0;
    color: var(--text-muted);
    background: transparent;
    text-align: left;
    cursor: pointer;
    opacity: 0.62;
    transition: color 0.25s ease, opacity 0.25s ease, background 0.25s ease;

    &::after {
      position: absolute;
      top: 8px;
      right: -17px;
      bottom: 8px;
      width: 2px;
      content: '';
      background: var(--filter-rail-accent);
      transform: scaleY(0);
      transform-origin: top;
      transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
    }

    &:hover,
    &.is-active {
      color: var(--text-color);
      opacity: 1;
    }

    &:hover {
      background: color-mix(in srgb, var(--text-color) 3%, transparent);
    }

    &.is-active {
      &::after {
        transform: scaleY(1);
      }

      .filter-rail__avatar {
        border-color: color-mix(in srgb, var(--text-color) 36%, transparent);
      }

      .filter-rail__count {
        color: var(--filter-rail-accent);
      }
    }
  }

  &__avatar {
    display: grid;
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    place-items: center;
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--text-color) 18%, transparent);
    box-sizing: border-box;
    background: rgb(35 35 35 / 40%);
    transition: border-color 0.25s ease, box-shadow 0.25s ease;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }

    &.is-collage {
      grid-template-columns: repeat(2, minmax(0, 1fr));

      img {
        min-width: 0;
      }
    }
  }

  &__marker {
    color: var(--filter-rail-accent);
    font-family: 'cn-custom', monospace;
    font-size: 0.48rem;
    font-weight: 900;
  }

  button:hover &__avatar img,
  button.is-active &__avatar img {
    transform: scale(1.035);
  }

  &__copy {
    display: flex;
    width: 100%;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    strong {
      min-width: 0;
      overflow: hidden;
      color: currentColor;
      font-family: 'alibaba-puhuiti', sans-serif;
      font-size: 0.58rem;
      font-weight: 900;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__count {
    color: var(--text-faint);
    font-family: 'cn-custom', monospace;
    font-size: 0.44rem;
    font-weight: 700;
    letter-spacing: normal;
    transition: color 0.25s ease;
    white-space: nowrap;
  }
}

@media (max-width: 900px) {
  .filter-rail {
    position: static;
    align-items: stretch;
    flex-direction: row;
    gap: 2px;
    max-height: none;
    padding-right: 5px;
    padding-left: 5px;
    overflow-x: auto;
    overflow-y: hidden;
    border-right: 0;
    border-bottom: 1px solid var(--border-color);

    button {
      width: auto;
      min-width: 116px;
      padding-right: 9px;
      padding-left: 9px;

      &::after {
        top: auto;
        right: 9px;
        bottom: -1px;
        left: 9px;
        width: auto;
        height: 2px;
        transform: scaleX(0);
        transform-origin: left;
      }

      &.is-active::after {
        transform: scaleX(1);
      }
    }

    &__avatar {
      width: 40px;
      height: 40px;
    }
  }
}
</style>
