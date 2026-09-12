<template>
  <button
    type="button"
    class="shared-work-card"
    :class="{
      'shared-work-card--always-visible': displayMode === 'always-visible',
      'shared-work-card--grid-background': background === 'grid',
    }"
    @click="emit('select', work)"
  >
    <img
      v-if="work.img && background !== 'grid'"
      class="work-card-image"
      :src="work.img"
      :alt="work.title"
      loading="lazy"
      decoding="async"
    />
    <span class="work-card-info">
      <small v-if="work.company">{{ work.company }}</small>
      <strong>{{ work.title }}</strong>
      <span v-if="work.tags?.length" class="work-card-stack">
        <span
          v-for="(tag, index) in work.tags"
          :key="tag"
          class="work-card-stack__tag"
          :style="{ '--work-card-stack-index': index }"
        >
          {{ tag }}
        </span>
      </span>
      <small v-if="work.time" class="work-card-info__time">
        {{ work.time }}
      </small>
    </span>
    <i class="work-card-corner work-card-corner--tl" />
    <i class="work-card-corner work-card-corner--tr" />
    <i class="work-card-corner work-card-corner--bl" />
    <i class="work-card-corner work-card-corner--br" />
  </button>
</template>

<script setup lang="ts">
import type { WorkCardItem } from '@/types/archive'

defineProps<{
  work: WorkCardItem
  displayMode?: 'always-visible'
  background?: 'grid'
}>()

const emit = defineEmits<{
  (event: 'select', work: WorkCardItem): void
}>()
</script>

<style lang="less" scoped>
.shared-work-card {
  position: relative;
  display: flex;
  min-width: 0;
  border: none;
  padding: 0;
  overflow: hidden;
  color: inherit;
  font: inherit;
  text-align: inherit;
  appearance: none;
  aspect-ratio: 16 / 10;
  background: #0d0d0e;
  box-shadow: 0 0.35rem 0.9rem rgba(0, 0, 0, 0.22);
  cursor: pointer;

  &::after {
    position: absolute;
    inset: 0;
    z-index: 1;
    content: '';
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.045) 1px,
      transparent 1px
    );
    background-size: 100% 4px;
    opacity: 0.68;
    pointer-events: none;
  }
}

.work-card-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.62);
  transition: filter 280ms ease-out,
    transform 1200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.work-card-info {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  min-height: 70%;
  box-sizing: border-box;
  padding: clamp(2rem, 4vw, 4rem) clamp(0.5rem, 1vw, 0.9rem)
    clamp(0.5rem, 1vw, 0.9rem);
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  color: #fff;
  font-family: 'alibaba-puhuiti', sans-serif;
  text-align: center;
  z-index: 2;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(17, 17, 17, 0.28) 34%,
    rgba(17, 17, 17, 0.78) 72%,
    #111 100%
  );
  opacity: 0;
  transition: opacity 160ms ease-out;
}

.work-card-info strong {
  font-size: clamp(0.68rem, 0.88vw, 0.9rem);
  font-weight: 600;
  line-height: 1.25;
}

.work-card-info small {
  color: #54a86c;
  font-family: 'cn-custom', sans-serif;
  font-size: clamp(0.38rem, 0.48vw, 0.5rem);
  font-weight: 400;
  line-height: 1.2;
}

.work-card-info small:first-child {
  margin-bottom: 0.125rem;
}

.work-card-info small:last-child {
  margin-top: 0.125rem;
}

.work-card-info__time {
  word-spacing: 0.35em;
}

.work-card-stack {
  display: flex;
  max-height: 0;
  margin-top: 0;
  width: 100%;
  align-content: flex-start;
  align-items: flex-start;
  justify-content: center;
  gap: 0.2rem;
  flex-wrap: wrap;
  overflow: hidden;
  opacity: 0;
  transition: max-height 240ms ease-out, margin 200ms ease-out,
    opacity 180ms ease-out;
}

.work-card-stack__tag {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  padding: 2px 6px;
  color: rgba(255, 255, 255, 0.5);
  font-family: 'cn-custom', monospace;
  font-size: clamp(0.36rem, 0.42vw, 0.46rem);
  font-weight: 400;
  letter-spacing: 0.5px;
  line-height: 0.56rem;
  text-transform: uppercase;
  opacity: 0;
  transform: scale(0.55);
  transform-origin: center top;
  transition: opacity 160ms ease-out,
    transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}

.work-card-corner {
  position: absolute;
  z-index: 3;
  width: 0.25rem;
  height: 0.25rem;
  background: #54a86c;
  opacity: 0;
  transform: scale(0);
  transition: opacity 160ms ease-out, transform 180ms ease-out;
  pointer-events: none;

  &--tl {
    top: 0.55rem;
    left: 0.55rem;
  }

  &--tr {
    top: 0.55rem;
    right: 0.55rem;
  }

  &--bl {
    bottom: 0.55rem;
    left: 0.55rem;
  }

  &--br {
    right: 0.55rem;
    bottom: 0.55rem;
  }
}

.shared-work-card--always-visible {
  .work-card-info {
    min-height: 78%;
  }

  .work-card-info strong {
    font-size: clamp(0.95rem, 1.25vw, 1.35rem);
  }

  .work-card-info small {
    font-size: clamp(0.5rem, 0.65vw, 0.68rem);
  }

  .work-card-info,
  .work-card-corner {
    opacity: 1;
  }

  .work-card-corner {
    transform: scale(1);
    transition: opacity 180ms ease-out, transform 180ms ease-out,
      width 720ms cubic-bezier(0.16, 1, 0.3, 1),
      height 720ms cubic-bezier(0.16, 1, 0.3, 1);
  }
}

.shared-work-card--grid-background {
  background: linear-gradient(135deg, rgba(84, 168, 108, 0.12), transparent 42%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
    linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    rgba(13, 9, 18, 0.78);
  background-size: auto, 22px 22px, 22px 22px, auto;

  .work-card-info {
    top: 0;
    min-height: 0;
    padding: 1.175rem 0.9rem 0.825rem;
    justify-content: center;
  }

  .work-card-corner {
    opacity: 0.5;
  }
}

.shared-work-card:not(.shared-work-card--always-visible) {
  box-sizing: border-box;

  .work-card-info small:first-child {
    margin-bottom: 0.05rem;
  }

  .work-card-info small:last-child {
    margin-top: 0.05rem;
  }
}

@media (hover: hover) and (pointer: fine) {
  .shared-work-card:hover {
    .work-card-image {
      filter: brightness(1);
      transform: scale(1.06);
    }

    .work-card-info,
    .work-card-corner {
      opacity: 1;
    }

    .work-card-stack {
      max-height: 2.5rem;
      margin-top: 0.2rem;
      opacity: 1;
    }

    .work-card-stack__tag {
      opacity: 1;
      transform: scale(1);
      transition-delay: calc(var(--work-card-stack-index) * 70ms);
    }
  }

  .shared-work-card--always-visible:hover {
    .work-card-image {
      filter: brightness(0.62);
    }

    .work-card-corner {
      width: 0.5rem;
      height: 0.5rem;
      opacity: 0.5;
    }
  }

  .shared-work-card:not(.shared-work-card--always-visible):hover {
    .work-card-corner {
      transform: scale(1);
    }
  }

  .shared-work-card--grid-background:hover .work-card-corner {
    opacity: 0.5;
  }
}

@media screen and (max-aspect-ratio: @ratio-threshold),
  screen and (max-width: 1024px) and (hover: none) and (pointer: coarse) {
  .shared-work-card--always-visible {
    &:not(.shared-work-card--grid-background) .work-card-info {
      padding-bottom: 0.75rem;
    }

    .work-card-info strong {
      font-size: 1.15rem;
    }

    .work-card-info small {
      font-size: 0.6rem;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .work-card-image,
  .work-card-corner {
    transition-duration: 0.01ms;
  }
}
</style>
