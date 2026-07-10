<template>
  <div
    class="shared-tool-card"
    :class="`shared-tool-card--${tool.category}`"
    role="button"
    tabindex="0"
    @click="emit('select', tool)"
    @keydown.enter.prevent="emit('select', tool)"
    @keydown.space.prevent="emit('select', tool)"
  >
    <div class="tl-card__index">
      <span class="tl-card__index-num">{{ index + 1 }}</span>
      <span class="tl-card__index-slash">/</span>
      <span class="tl-card__index-total">{{ total }}</span>
    </div>

    <div class="tl-card__img-wrap">
      <div class="tl-card__img-bg" />
      <img
        v-if="tool.img"
        :src="tool.img"
        :alt="tool.title"
        class="tl-card__img"
        loading="lazy"
        decoding="async"
      />
      <div v-else class="tl-card__img-placeholder">
        <span class="tl-card__placeholder-icon">{{ tool.icon }}</span>
      </div>
      <div class="tl-card__scan" />
    </div>

    <div class="tl-card__body">
      <div class="tl-card__tags">
        <button
          v-for="tag in tool.tags"
          :key="tag"
          class="tl-card__tag"
          type="button"
          @click.stop="emit('tag-select', tag)"
        >
          {{ tag }}
        </button>
      </div>
      <h3 class="tl-card__title" :class="locale === 'zhCn' && 'cn-font'">
        {{ tool.title }}
      </h3>
      <p class="tl-card__sub">{{ tool.sub }}</p>
      <div class="tl-card__footer">
        <span class="tl-card__status tl-card__status--live">
          <span class="tl-card__status-dot" />
          {{ tool.statusLabel }}
        </span>
        <span class="tl-card__cta">USE →</span>
      </div>

      <div class="tl-card__corner tl-card__corner--tl" />
      <div class="tl-card__corner tl-card__corner--br" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface ToolCardItem {
  id: string
  title: string
  sub: string
  tags: string[]
  category: 'work' | 'general'
  icon: string
  img?: string
  statusLabel: string
  link: string
}

defineProps<{
  tool: ToolCardItem
  index: number
  total: number
}>()

const emit = defineEmits<{
  (event: 'select', tool: ToolCardItem): void
  (event: 'tag-select', tag: string): void
}>()

const { locale } = useI18n()
</script>

<style lang="less" scoped>
@red: #e8284a;
@red-dim: rgba(232, 40, 74, 0.15);
@red-glow: rgba(232, 40, 74, 0.06);
@blue: #3c5de8;
@blue-dim: rgba(60, 93, 232, 0.18);
@blue-glow: rgba(60, 93, 232, 0.08);
@bg: #0d0608;
@surface: #140a0c;
@border: rgba(255, 255, 255, 0.159);
@border2: rgba(255, 255, 255, 0.069);
@text: #ffffff;
@muted: rgb(83, 83, 83);
@faint: rgb(88, 88, 88);
@mono: 'Anton', monospace;

.shared-tool-card {
  --card-accent: @red;
  --card-accent-dim: @red-dim;
  --card-accent-glow: @red-glow;
  position: relative;
  overflow: visible;
  cursor: pointer;
  transform-origin: center top;
  animation: toolCardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) var(--delay, 0s) both;
  transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1),
    border-color 0.3s ease, box-shadow 0.3s ease;

  &--work {
    --card-accent: @blue;
    --card-accent-dim: @blue-dim;
    --card-accent-glow: @blue-glow;
  }

  &:hover {
    transform: translateY(-6px);
    z-index: 10;

    .tl-card__img-wrap {
      width: 100%;
    }

    .tl-card__body {
      border-color: var(--card-accent-dim);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
      color: var(--card-accent);
    }

    .tl-card__index-num,
    .tl-card__cta {
      color: var(--card-accent);
    }

    .tl-card__status-dot {
      animation: pulse 2s ease-in-out infinite;
    }

    .tl-card__scan {
      animation: scan 1.2s linear infinite;
    }

    .tl-card__img {
      transform: scale(1.04) translateY(-4px);
      filter: none;
    }

    .tl-card__cta {
      letter-spacing: 0.2em;
    }

    .tl-card__corner {
      opacity: 1;
    }
  }
}

.tl-card__index {
  position: absolute;
  top: -18px;
  right: 14px;
  display: flex;
  align-items: baseline;
  gap: 2px;
  padding: 3px 10px;
  z-index: 2;
  animation: toolCardMediaRise 0.52s cubic-bezier(0.16, 1, 0.3, 1)
    calc(var(--delay, 0s) + 0.14s) both;

  &-num,
  &-slash,
  &-total {
    font-family: @mono;
    line-height: 1;
  }

  &-num {
    color: @muted;
    font-size: 20px;
    font-weight: 700;
  }

  &-slash,
  &-total {
    color: @faint;
    font-size: 16px;
  }

  &-slash {
    margin: 0 2px;
  }
}

.tl-card__img-wrap {
  position: relative;
  width: 95%;
  height: 180px;
  margin: 0 auto;
  overflow: hidden;
  background: @bg;
  animation: toolCardMediaRise 0.52s cubic-bezier(0.16, 1, 0.3, 1)
    calc(var(--delay, 0s) + 0.14s) both;
  transition: width 0.2s;
}

.tl-card__img-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 110%,
    var(--card-accent-glow) 0%,
    transparent 70%
  );
}

.tl-card__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 16px;
  object-fit: contain;
  filter: saturate(0.85) brightness(0.95);
  transform-origin: center bottom;
  transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), filter 0.3s ease;
  z-index: 1;
}

.tl-card__img-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;

  .tl-card__placeholder-icon {
    color: @text;
    font-family: @mono;
    font-size: 56px;
    letter-spacing: -0.05em;
    opacity: 0.18;
    user-select: none;
  }
}

.tl-card__scan {
  position: absolute;
  top: -100%;
  left: 0;
  right: 0;
  height: 40%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(255, 255, 255, 0.025) 50%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 3;
}

.tl-card__body {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 18px 20px 20px;
  border: 1px solid @border2;
  background: @surface;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  z-index: 1;
}

.tl-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tl-card__tag {
  display: inline-block;
  align-self: flex-start;
  padding: 2px 8px;
  border: 1px solid var(--card-accent);
  border-radius: 0;
  color: var(--card-accent);
  background: transparent;
  cursor: pointer;
  font-family: @mono;
  font-size: 9px;
  letter-spacing: 0.22em;
  transition: color 0.2s ease, background 0.2s ease;

  &:hover {
    color: #050505;
    background: var(--card-accent);
  }
}

.tl-card__title {
  margin: 2px 0 0;
  color: @text;
  font-family: 'cn-custom';
  font-size: 17px;
  letter-spacing: 0.04em;
  line-height: 1.15;
  text-transform: uppercase;
}

.tl-card__sub {
  height: 40px;
  margin: 0;
  color: @muted;
  font-size: 12px;
  line-height: 1.6;
}

.tl-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid @border;
}

.tl-card__status {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4ade80;
  font-family: @mono;
  font-size: 9px;
  letter-spacing: 0.18em;

  &-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 6px #4ade80;
  }
}

.shared-tool-card:focus-within .tl-card__status-dot {
  animation: pulse 2s ease-in-out infinite;
}

.tl-card__cta {
  color: @faint;
  font-family: @mono;
  font-size: 10px;
  letter-spacing: 0.15em;
  transition: color 0.2s ease, letter-spacing 0.3s ease;
}

.tl-card__corner {
  position: absolute;
  width: 10px;
  height: 10px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;

  &--tl {
    top: -1px;
    left: -1px;
    border-top: 2px solid var(--card-accent);
    border-left: 2px solid var(--card-accent);
  }

  &--br {
    right: -1px;
    bottom: -1px;
    border-right: 2px solid var(--card-accent);
    border-bottom: 2px solid var(--card-accent);
  }
}

@keyframes toolCardIn {
  from {
    opacity: 0;
    transform: translate3d(0, 18px, 0) rotateX(-8deg);
  }

  to {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotateX(0);
  }
}

@keyframes toolCardMediaRise {
  from {
    opacity: 0;
    clip-path: inset(100% 0 0);
    transform: translate3d(0, 32px, 0);
  }

  to {
    opacity: 1;
    clip-path: inset(0);
    transform: translate3d(0, 0, 0);
  }
}

@keyframes scan {
  from {
    top: -40%;
  }
  to {
    top: 120%;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
