<template>
  <nav
    class="collection-tabs"
    :class="`collection-tabs--${size}`"
    :style="{ '--collection-tab-count': items.length }"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <button
      v-for="(item, index) in items"
      :key="item.id"
      class="collection-tab"
      :class="{ 'is-active': item.id === modelValue }"
      :style="{
        '--collection-accent': item.accentColor || '#e23456',
        '--collection-cover': item.coverUrl
          ? `url(${item.coverUrl})`
          : undefined,
        '--collection-cover-position': item.coverPosition || 'right center',
      }"
      type="button"
      role="tab"
      :aria-selected="item.id === modelValue"
      @click="$emit('update:modelValue', item.id)"
    >
      <span class="collection-tab__index">{{ index + 1 }}</span>
      <span class="collection-tab__copy">
        <strong>{{ item.title }}</strong>
        <small v-if="item.subtitle">{{ item.subtitle }}</small>
      </span>
      <span class="collection-tab__count">{{ item.count }}</span>
    </button>
  </nav>
</template>

<script setup lang="ts">
export interface CollectionTabItem {
  id: string
  title: string
  subtitle?: string
  count: number
  accentColor?: string
  coverUrl?: string
  coverPosition?: string
}

withDefaults(
  defineProps<{
    ariaLabel: string
    items: CollectionTabItem[]
    modelValue: string
    size?: 'small' | 'middle' | 'big'
  }>(),
  {
    size: 'middle',
  }
)

defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()
</script>

<style lang="less" scoped>
.collection-tabs {
  --collection-tab-min-height: 96px;
  --collection-tab-padding-y: 18px;
  --collection-tab-margin-y: 10px;
  --collection-tab-title-size: clamp(0.95rem, 1.5vw, 1.2rem);
  --collection-tab-subtitle-size: 0.44rem;
  --collection-tab-index-size: 0.56rem;
  --collection-tab-count-size: clamp(1.45rem, 2.8vw, 2.65rem);
  display: grid;
  grid-template-columns: repeat(var(--collection-tab-count), minmax(0, 1fr));
  margin-block: var(--collection-tab-margin-y);
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);

  &--big {
    --collection-tab-min-height: 112px;
    --collection-tab-padding-y: 22px;
    --collection-tab-margin-y: 0;
    --collection-tab-title-size: clamp(1.05rem, 1.8vw, 1.45rem);
    --collection-tab-subtitle-size: 0.48rem;
    --collection-tab-index-size: 0.62rem;
    --collection-tab-count-size: clamp(1.7rem, 3.4vw, 3.2rem);
  }

  &--small {
    --collection-tab-min-height: 54px;
    --collection-tab-padding-y: 8px;
    --collection-tab-margin-y: 2px;
    --collection-tab-title-size: clamp(0.62rem, 1vw, 0.78rem);
    --collection-tab-subtitle-size: 0.32rem;
    --collection-tab-index-size: 0.4rem;
    --collection-tab-count-size: clamp(0.95rem, 1.8vw, 1.55rem);

    .collection-tab__copy {
      align-items: baseline;
      flex-direction: row;
      gap: 8px;

      small {
        margin-top: 0;
      }
    }
  }
}

.collection-tab {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: clamp(14px, 2vw, 30px);
  min-height: var(--collection-tab-min-height);
  padding: var(--collection-tab-padding-y) clamp(18px, 3vw, 42px);
  overflow: hidden;
  border: 0;
  color: var(--text-color);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.3s ease;

  > span {
    position: relative;
    z-index: 2;
  }

  & + & {
    border-left: 1px solid var(--border-color);
  }

  &::before {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 72%;
    content: '';
    background-image: var(--collection-cover);
    background-position: var(--collection-cover-position, right center);
    background-repeat: no-repeat;
    background-size: cover;
    opacity: 0;
    mask-image: linear-gradient(to right, transparent 0%, #000 48%, #000 100%);
    -webkit-mask-image: linear-gradient(
      to right,
      transparent 0%,
      #000 48%,
      #000 100%
    );
    pointer-events: none;
    transition: opacity 0.45s ease;
  }

  &::after {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 2px;
    content: '';
    background: var(--collection-accent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &:hover,
  &.is-active {
    background: color-mix(in srgb, var(--text-color) 3.5%, transparent);
  }

  &:hover::before {
    opacity: 0.44;
  }

  &.is-active::before {
    opacity: 0.54;
  }

  &.is-active::after {
    transform: scaleX(1);
  }

  &.is-active .collection-tab__count {
    color: color-mix(in srgb, var(--collection-accent) 78%, var(--text-color));
  }

  &__index {
    color: var(--collection-accent);
    font-family: 'cn-custom', 'Courier New', monospace;
    font-size: var(--collection-tab-index-size);
  }

  &__copy {
    display: flex;
    min-width: 0;
    flex-direction: column;

    strong {
      font-family: 'alibaba-puhuiti', sans-serif;
      font-size: var(--collection-tab-title-size);
      font-weight: 900;
    }

    small {
      margin-top: 5px;
      color: var(--text-faint);
      font-family: 'cn-custom', 'Courier New', monospace;
      font-size: var(--collection-tab-subtitle-size);
      letter-spacing: 0.08em;
    }
  }

  &__count {
    color: color-mix(in srgb, var(--text-color) 16%, transparent);
    font-family: 'cn-custom', 'Courier New', monospace;
    font-size: var(--collection-tab-count-size);
    font-weight: 900;
  }
}

@media (max-width: 900px) {
  .collection-tabs {
    --collection-tab-min-height: 76px;
    --collection-tab-padding-y: 14px;
    --collection-tab-margin-y: 8px;
    --collection-tab-title-size: 0.72rem;
    --collection-tab-subtitle-size: 0.36rem;

    &--big {
      --collection-tab-min-height: 90px;
      --collection-tab-padding-y: 16px;
      --collection-tab-margin-y: 0;
      --collection-tab-title-size: 0.8rem;
      --collection-tab-subtitle-size: 0.38rem;
    }

    &--small {
      --collection-tab-min-height: 48px;
      --collection-tab-padding-y: 6px;
      --collection-tab-margin-y: 0;
      --collection-tab-title-size: 0.56rem;
      --collection-tab-subtitle-size: 0.28rem;
    }
  }

  .collection-tab {
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px;
    padding-right: 12px;
    padding-left: 12px;

    &__count {
      display: none;
    }
  }
}
</style>
