<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import ModalWrapper from '@/components/ModalWrapper/index.vue'
import { petMoves } from '@/locales/dynamic/petMoves'

import FloraExpandButton from './FloraExpandButton.vue'
import FloraMoveCard from './FloraMoveCard.vue'

const props = defineProps<{ petId: string; mobile?: boolean }>()
const { locale } = useI18n()
const language = computed(() => (locale.value === 'en' ? 'en' : 'zhCn'))
const collection = computed(() => petMoves[props.petId])
const forgottenTitle = computed(() =>
  language.value === 'en' ? 'Forgotten moves' : '已遗忘的招式'
)
const expanded = ref(false)
watch(
  () => props.petId,
  () => {
    expanded.value = false
  }
)
</script>

<template>
  <section
    v-if="collection"
    class="flora-moves no-rem"
    :aria-label="language === 'en' ? 'Moves' : '招式'"
  >
    <ul class="flora-moves__list">
      <li v-for="move in collection.current" :key="move.id">
        <FloraMoveCard :move="move" />
      </li>
    </ul>
    <FloraExpandButton
      class="flora-moves__toggle"
      :expanded="expanded"
      :mobile="mobile"
      :label="`FORGOTTEN ×${collection.forgotten.length}`"
      aria-haspopup="dialog"
      @click="expanded = true"
    />
    <ModalWrapper
      v-model="expanded"
      width="680px"
      :title="forgottenTitle"
      :close-title="language === 'en' ? 'Close (ESC)' : '关闭 (ESC)'"
    >
      <section
        v-if="expanded"
        class="flora-moves-modal no-rem"
        :aria-label="forgottenTitle"
      >
        <h2>{{ forgottenTitle }}</h2>
        <ul class="flora-moves__list flora-moves__list--forgotten">
          <li v-for="move in collection.forgotten" :key="move.id">
            <FloraMoveCard :move="move" />
          </li>
        </ul>
      </section>
    </ModalWrapper>
  </section>
</template>

<style scoped lang="less">
.flora-moves.no-rem,
.flora-moves-modal.no-rem {
  color: #fffff4;
  font-family: 'alibaba-puhuiti', sans-serif;
  pointer-events: auto;
  h2 {
    margin: 0 0 16px;
    font-size: 24px;
    font-weight: 900;
  }
  .flora-moves__list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 24px 16px;
    margin: 0;
    padding: 6px 0;
    list-style: none;
    li {
      min-width: 0;
    }
    &.flora-moves__list--forgotten {
      grid-template-columns: minmax(0, 1fr);
    }
  }
}
.flora-moves.no-rem {
  --flora-move-scale: 1.5;
  --flora-scanline-gap: calc(1px / var(--flora-move-scale));
  --flora-scanline-period: calc(4px / var(--flora-move-scale));
  position: relative;
  display: flow-root;
  opacity: 0.4;
  .flora-moves__list,
  button.flora-moves__toggle {
    zoom: var(--flora-move-scale);
  }
  button.flora-moves__toggle {
    --flora-toggle-color: #000;
    --flora-toggle-background: repeating-linear-gradient(
      to bottom,
      transparent 0 var(--flora-scanline-gap),
      var(--flora-toggle-color) var(--flora-scanline-gap)
        var(--flora-scanline-period)
    );
    position: relative;
    right: auto;
    bottom: auto;
    z-index: 4;
    width: max-content;
    height: auto;
    margin: -12px 0 0 auto;
    background: var(--flora-toggle-background);
    &:hover,
    &:focus-visible {
      background: var(--flora-toggle-background);
    }
    :deep(span) {
      -webkit-mask-image: repeating-linear-gradient(
        to bottom,
        transparent 0 var(--flora-scanline-gap),
        #000 var(--flora-scanline-gap) var(--flora-scanline-period)
      );
      mask-image: repeating-linear-gradient(
        to bottom,
        transparent 0 var(--flora-scanline-gap),
        #000 var(--flora-scanline-gap) var(--flora-scanline-period)
      );
      -webkit-text-fill-color: transparent;
      -webkit-text-stroke: 1px currentColor;
    }
    @media (hover: hover) and (pointer: fine) {
      &:hover {
        --flora-toggle-color: #e23456;
      }
      &:hover :deep(span) {
        -webkit-text-fill-color: currentColor;
        -webkit-text-stroke-width: 0;
      }
    }
  }
  @media (max-width: 767px) {
    .flora-moves__list {
      gap: 20px 8px;
    }
  }
}
.flora-moves-modal.no-rem {
  padding: 24px;
  @media (max-width: 767px) {
    padding: 16px 8px;
  }
}
</style>
