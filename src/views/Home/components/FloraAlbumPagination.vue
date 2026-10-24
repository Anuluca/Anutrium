<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { flashActionButton } from '@/utils/flashActionButton'

const props = withDefaults(
  defineProps<{
    page: number
    pageCount: number
    totalItems?: number | null
    availablePages?: number
    mobile?: boolean
  }>(),
  { availablePages: undefined, totalItems: null, mobile: false }
)
const emit = defineEmits<{ (event: 'select', page: number): void }>()
const { locale } = useI18n()
const available = computed(() => props.availablePages ?? props.pageCount)
const labels = computed(() =>
  locale.value === 'en'
    ? { previous: 'Previous', next: 'Next', pagination: 'Album pagination' }
    : { previous: '上一页', next: '下一页', pagination: '相册分页' }
)
const selectPage = (page: number, event: MouseEvent) => {
  flashActionButton(event.currentTarget as HTMLButtonElement)
  emit('select', page)
}
</script>

<template>
  <nav
    class="flora-album-gallery__pagination no-rem"
    :class="{ 'is-mobile': mobile }"
    :aria-label="labels.pagination"
  >
    <span v-if="totalItems != null" class="flora-album-gallery__page-total">
      {{
        locale === 'en'
          ? `${totalItems} images (${pageCount} pages)`
          : `共${totalItems}张图片 (${pageCount}页)`
      }}
    </span>
    <div class="flora-album-gallery__page-controls">
      <button
        type="button"
        :aria-label="labels.previous"
        :disabled="page <= 1"
        @click="emit('select', page - 1)"
      >
        <span
          class="flora-album-gallery__page-arrow is-previous"
          aria-hidden="true"
        />
      </button>
      <div class="flora-album-gallery__page-numbers">
        <button
          v-for="number in pageCount"
          :key="number"
          type="button"
          :aria-label="locale === 'en' ? `Page ${number}` : `第 ${number} 页`"
          :aria-current="number === page ? 'page' : undefined"
          :disabled="number > available"
          @click="selectPage(number, $event)"
        >
          {{ number }}
        </button>
      </div>
      <button
        type="button"
        :aria-label="labels.next"
        :disabled="page >= available"
        @click="emit('select', page + 1)"
      >
        <span class="flora-album-gallery__page-arrow" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>

<style scoped lang="less">
.flora-album-gallery__pagination.no-rem {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  max-width: 100%;
  gap: 8px;
  color: inherit;

  .flora-album-gallery__page-total {
    flex: none;
    font: 400 14px / 1.4 'alibaba-puhuiti', sans-serif;
    white-space: nowrap;
  }

  .flora-album-gallery__page-controls {
    display: flex;
    align-items: center;
    min-width: 0;
    max-width: 100%;
    gap: inherit;

    > button {
      flex: none;
    }
  }

  button {
    padding: 4px 6px;
    border: 0;
    background: transparent;
    color: inherit;
    font: 700 14px / 1.4 'alibaba-puhuiti', sans-serif;
    cursor: pointer;

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
    &:hover {
      background: #e23456;
      color: #000;
    }
    &:focus-visible {
      outline: 1px solid currentColor !important;
      outline-offset: 2px;
    }
  }

  &.is-mobile .flora-album-gallery__page-total {
    flex-basis: 100%;
    text-align: left;
  }

  &:not(.is-mobile) {
    gap: 12px;
    button {
      padding: 6px 9px;
      font-size: 18px;
    }
  }

  .flora-album-gallery__page-numbers {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
    button[aria-current='page'] {
      background: #fffff4;
      color: #000;
    }
  }

  .flora-album-gallery__page-arrow {
    display: inline-block;
    width: 0.8em;
    height: 0.8em;
    background: currentColor;
    clip-path: polygon(0 0, 100% 50%, 0 100%);
    vertical-align: middle;
    &.is-previous {
      transform: rotate(180deg);
    }
  }
}
</style>
