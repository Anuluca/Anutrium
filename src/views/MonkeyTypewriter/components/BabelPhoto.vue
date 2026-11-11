<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { monkeyTypewriterImages } from '@/utils/preloadMonkeyTypewriterAssets'

import FuzzyImage from './FuzzyImage.vue'
import FuzzyPhoto from './FuzzyPhoto.vue'

const { t, locale } = useI18n()

const ready = ref(false)
watch(
  locale,
  () => {
    ready.value = false
  },
  { flush: 'sync' }
)
withDefaults(defineProps<{ active?: boolean; animated?: boolean }>(), {
  active: true,
  animated: true,
})
</script>

<template>
  <FuzzyPhoto
    class="babel-photo"
    :active="active"
    :animated="animated"
    :src="monkeyTypewriterImages.library"
    :alt="t('monkeyTypewriter.shelfAlt')"
    :width="240"
    :height="298"
  >
    <span
      class="babel-title"
      :class="{ 'is-ready': ready && animated, 'is-english': locale === 'en' }"
      aria-hidden="true"
    >
      <span class="babel-title-fallback">{{
        t('monkeyTypewriter.library')
      }}</span>
      <FuzzyImage
        v-if="animated"
        :key="locale"
        class="babel-title-canvas"
        :active="active"
        :text="t('monkeyTypewriter.library')"
        :width="185"
        :height="44"
        :font="
          locale === 'en' ? '400 26px Anton' : `900 36px 'alibaba-puhuiti'`
        "
        :letter-spacing="locale === 'en' ? 0 : -2.52"
        color="#e23456"
        @ready="ready = true"
      />
    </span>
  </FuzzyPhoto>
</template>

<style scoped lang="less">
.babel-photo.no-rem {
  container-type: inline-size;
  width: 240px;
  height: auto;
  aspect-ratio: 240 / 298;
  filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.45));
}
.babel-title {
  position: absolute;
  top: calc(3% - 4px);
  left: 15%;
  width: 77%;
  aspect-ratio: 185 / 44;
  color: #e23456;
  font: 900 15cqw/1 'alibaba-puhuiti', sans-serif;
  text-align: center;
  letter-spacing: -0.07em;
  white-space: nowrap;
  transform: rotate(-2deg) skewX(-3deg) scaleX(0.82);
  transform-origin: center;
  filter: brightness(1.45) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.9));
  -webkit-mask-image: repeating-linear-gradient(
    to bottom,
    #000 0 2px,
    rgba(0, 0, 0, 0.45) 2px 3px
  );
  mask-image: repeating-linear-gradient(
    to bottom,
    #000 0 2px,
    rgba(0, 0, 0, 0.45) 2px 3px
  );
}
.babel-title.is-english {
  font: 400 10.8cqw/1 'Anton', sans-serif;
  letter-spacing: 0;
}
.babel-title-fallback,
.babel-title-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.babel-title-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}
.babel-title-canvas {
  opacity: 0;
}
.babel-title.is-ready {
  .babel-title-fallback {
    opacity: 0;
  }
  .babel-title-canvas {
    opacity: 1;
  }
}
</style>
