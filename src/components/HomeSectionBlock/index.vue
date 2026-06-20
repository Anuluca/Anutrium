<template>
  <div class="home-section-layout">
    <aside class="home-section-rail" aria-hidden="true">
      <span class="home-section-rail__num">{{ sectionNumber }}</span>
      <span class="home-section-rail__label">{{ railLabel }}</span>
    </aside>

    <div class="home-section-panel">
      <div v-if="$slots.actions" class="home-section-title-row">
        <h2 class="home-section-title">
          <span v-if="shouldShowEnglishTitle" class="home-section-title__en">
            {{ titleEn }}
          </span>
          {{ title }}
        </h2>
        <slot name="actions" />
      </div>
      <h2 v-else class="home-section-title">
        <span v-if="shouldShowEnglishTitle" class="home-section-title__en">
          {{ titleEn }}
        </span>
        {{ title }}
      </h2>

      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  sectionNumber: string
  railLabel: string
  title: string
  titleEn?: string
}>()

const { locale } = useI18n()

const shouldShowEnglishTitle = computed(
  () => locale.value !== 'en' && !!props.titleEn
)
</script>

<style lang="less" scoped>
.home-section-layout {
  position: relative;
  display: grid;
  grid-template-columns: minmax(88px, 120px) minmax(0, 1fr);
  gap: clamp(10px, 1.5vw, 20px);
  min-height: 100%;

  &::before {
    content: '';
    position: absolute;
    top: -10px;
    bottom: -30px;
    left: clamp(42px, 4.2vw, 58px);
    width: 1px;
    background: linear-gradient(
      to bottom,
      transparent,
      rgba(226, 52, 86, 0.82) 12%,
      rgba(226, 52, 86, 0.34) 72%,
      transparent
    );
    box-shadow: 0 0 12px rgba(226, 52, 86, 0.5);
    mask-image: linear-gradient(
      to bottom,
      #000 0,
      #000 2.08rem,
      transparent 2.3rem,
      transparent 5rem,
      #000 5.3rem
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      #000 0,
      #000 2.08rem,
      transparent 2.3rem,
      transparent 5rem,
      #000 5.3rem
    );
    pointer-events: none;
  }
}

.home-section-rail {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr;
  justify-items: center;
  min-height: 180px;
  padding-top: 6px;
  background-image: linear-gradient(
    to right,
    transparent,
    rgba(255, 255, 255, 0.42) 32%,
    rgba(255, 255, 255, 0.42) 68%,
    transparent
  );
  background-repeat: no-repeat;
  background-position: center calc(0.58rem + 7px);
  background-size: min(100%, 112px) 1px;

  &::before {
    content: '';
    position: absolute;
    top: 0.58rem;
    left: calc(50% - 1px);
    width: 14px;
    height: 14px;
    border: 1px solid rgba(226, 52, 86, 0.9);
    background: #0c0b11;
    box-shadow: 0 0 0 4px rgba(226, 52, 86, 0.1),
      0 0 18px rgba(226, 52, 86, 0.72);
    transform: translateX(-50%) rotate(45deg);
    z-index: 1;
  }

  &::after {
    content: '';
    position: absolute;
    top: calc(0.58rem + 6px);
    left: calc(50% - 1px);
    width: 4px;
    height: 4px;
    background: #e23456;
    box-shadow: 0 0 14px rgba(226, 52, 86, 0.95);
    transform: translateX(-50%);
    z-index: 2;
  }
}

.home-section-rail__num {
  position: relative;
  z-index: 1;
  margin-top: 1.3rem;
  color: transparent;
  font-family: 'anton', monospace;
  font-size: clamp(1.9rem, 4vw, 3.2rem);
  line-height: 0.9;
  -webkit-text-stroke: 1px #e23456;
  text-shadow: 0 0 10px rgba(226, 52, 87, 0.27);
}

.home-section-rail__label {
  margin-top: 24px;
  margin-right: 50px;
  color: rgba(255, 255, 255, 0.25);
  font-family: 'cn-custom', monospace;
  font-size: 0.64rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  writing-mode: vertical-rl;
}

.home-section-panel {
  min-width: 0;
  padding-top: 10px;
}

.home-section-title {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  margin-bottom: 20px;
  padding-bottom: 10px;
  color: #e23456;
  font-family: 'anton', 'source-han-sans-simplified-c';
  font-size: 1.3rem;
  font-weight: 900;
}

.home-section-title__en {
  color: rgba(255, 255, 255, 0.36);
  font-family: 'anton', monospace;
  font-size: 0.66em;
  font-weight: 400;
  line-height: 1;
  text-transform: uppercase;
}

.home-section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;

  .home-section-title {
    flex: 1;
    margin-bottom: 0;
  }
}

@media screen and (max-aspect-ratio: @ratio-threshold) {
  .home-section-layout {
    grid-template-columns: 46px minmax(0, 1fr);
    gap: 16px;

    &::before {
      left: 22px;
      bottom: -18px;
      mask-image: linear-gradient(
        to bottom,
        #000 0,
        #000 1.65rem,
        transparent 1.65rem,
        transparent 3.35rem,
        #000 3.35rem
      );
      -webkit-mask-image: linear-gradient(
        to bottom,
        #000 0,
        #000 1.65rem,
        transparent 1.65rem,
        transparent 3.35rem,
        #000 3.35rem
      );
    }
  }

  .home-section-rail {
    min-height: 120px;
    padding-top: 2px;
    background-position: center calc(0.42rem + 5px);
    background-size: min(100%, 44px) 1px;

    &::before {
      top: 0.42rem;
      width: 10px;
      height: 10px;
    }

    &::after {
      top: calc(0.42rem + 3px);
      width: 3px;
      height: 3px;
    }
  }

  .home-section-rail__num {
    margin-top: 1.2rem;
    font-size: 1.8rem;
  }

  .home-section-rail__label {
    margin-top: 8px;
    margin-right: 16px;
    font-size: 0.48rem;
    letter-spacing: 0.12em;
  }

  .home-section-panel {
    padding-top: 6px;
  }

  .home-section-title-row {
    gap: 10px;
  }

  .home-section-title-row .home-section-title {
    min-width: 0;
    font-size: 1rem;
  }
}
</style>
