<template>
  <div
    class="shared-vlog-card"
    :class="{
      'is-map-target': active,
      'has-detail': interactive,
      'is-en': locale === 'en',
    }"
    :role="interactive ? 'button' : undefined"
    :tabindex="interactive ? 0 : undefined"
    @click="selectVlog"
    @keydown.enter.prevent="selectVlog"
    @keydown.space.prevent="selectVlog"
  >
    <div class="vlog-img-wrap">
      <img
        class="vlog-img vlog-img--base"
        :src="vlog.img"
        :alt="vlog.title"
        loading="lazy"
        decoding="async"
      />
      <img
        class="vlog-img vlog-img--hover"
        :src="vlog.img2 || vlog.img"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
      />
      <div class="vlog-blueprint-lines" aria-hidden="true" />
    </div>
    <div class="vlog-info">
      <h4 class="vlog-title">{{ vlog.title }}</h4>
      <span class="vlog-date">{{ vlog.date }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

interface VlogCardItem {
  id: string
  title: string
  date: string
  img: string
  img2?: string
}

const props = withDefaults(
  defineProps<{
    vlog: VlogCardItem
    active?: boolean
    interactive?: boolean
  }>(),
  {
    active: false,
    interactive: false,
  }
)

const emit = defineEmits<{
  (event: 'select', vlog: VlogCardItem): void
}>()

const { locale } = useI18n()

const selectVlog = () => {
  if (!props.interactive) return
  emit('select', props.vlog)
}
</script>

<style lang="less" scoped>
.shared-vlog-card {
  position: relative;
  width: 100%;
  max-width: 580px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 8px 0 0;
  cursor: default;
  isolation: isolate;

  &.has-detail {
    cursor: pointer;
  }

  &::before {
    content: '';
    position: absolute;
    left: 14%;
    right: 14%;
    bottom: 54px;
    height: 34px;
    background: radial-gradient(
      ellipse at center,
      rgba(226, 52, 86, 0.32),
      rgba(54, 209, 255, 0.12) 42%,
      transparent 72%
    );
    filter: blur(6px);
    opacity: 0.72;
    z-index: -1;
    transition: opacity 0.35s ease, filter 0.35s ease;
  }

  &::after {
    content: '';
    position: absolute;
    left: 14%;
    right: 14%;
    bottom: 44px;
    height: 52px;
    background: repeating-linear-gradient(
        90deg,
        transparent 0 7px,
        rgba(54, 209, 255, 0.24) 7px 8px,
        rgba(226, 52, 86, 0.18) 8px 9px
      ),
      radial-gradient(
        circle at 50% 50%,
        rgba(226, 52, 86, 0.2),
        transparent 58%
      );
    mix-blend-mode: screen;
    opacity: 0;
    transform: skew(-14deg);
    pointer-events: none;
    z-index: -1;
    transition: opacity 0.35s ease;
  }

  &:hover,
  &.is-map-target {
    &::before {
      opacity: 0.95;
      filter: blur(12px) hue-rotate(28deg);
    }

    &::after {
      opacity: 1;
      animation: vlogSpectralDrift 0.9s steps(3, end) infinite;
    }

    .vlog-img--base {
      opacity: 0;
    }

    .vlog-img--hover {
      opacity: 1;
      filter: drop-shadow(10px 12px 0 rgba(0, 0, 0, 0.46))
        drop-shadow(0 0 22px rgba(226, 52, 86, 0.24));
    }

    .vlog-blueprint-lines {
      opacity: 0.82;
      transform: scaleX(1);
    }

    .vlog-info::before {
      background: rgba(54, 209, 255, 0.26);
      box-shadow: -8px 0 0 rgba(226, 52, 86, 0.36),
        8px 0 0 rgba(255, 255, 255, 0.12);
    }

    .vlog-title {
      letter-spacing: 0.04em;
      text-shadow: 7px 0 0 rgba(226, 52, 86, 0.72),
        -7px 0 0 rgba(54, 209, 255, 0.58), 0 3px 0 rgba(255, 255, 255, 0.16),
        0 0 24px rgba(255, 255, 255, 0.22);
    }
  }
}

.vlog-img-wrap {
  position: relative;
  width: 100%;
  height: 345px;
  display: grid;
  place-items: end center;
  box-sizing: border-box;

  .vlog-img {
    position: relative;
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 345px;
    object-fit: contain;
    display: block;
    filter: drop-shadow(10px 12px 0 rgba(0, 0, 0, 0.46))
      drop-shadow(0 0 18px rgba(226, 52, 86, 0.18));
    transition: opacity 0.62s ease, filter 0.62s ease;
    z-index: 1;
  }

  .vlog-img--hover {
    position: absolute;
    left: 50%;
    bottom: 0;
    opacity: 0;
    transform: translateX(-50%);
    z-index: 2;
  }
}

.vlog-blueprint-lines {
  position: absolute;
  inset: 8% 6% 0;
  background-image: linear-gradient(
      90deg,
      transparent 0 18%,
      rgba(226, 52, 86, 0.48) 18%,
      rgba(226, 52, 86, 0.48) calc(18% + 1px),
      transparent calc(18% + 1px) 46%,
      transparent calc(46% + 1px) 74%,
      rgba(226, 52, 86, 0.48) calc(74% + 1px),
      transparent calc(74% + 1px)
    ),
    linear-gradient(
      0deg,
      transparent 0 22%,
      rgba(226, 52, 86, 0.48) 22%,
      transparent calc(22% + 1px) 51%,
      transparent calc(51% + 1px) 79%,
      rgba(226, 52, 86, 0.44) calc(79% + 1px),
      transparent calc(79% + 1px)
    );
  mask-image: radial-gradient(ellipse at center, #000 44%, transparent 76%);
  opacity: 0;
  mix-blend-mode: screen;
  pointer-events: none;
  z-index: 2;
  transform: scaleX(0.92);
  transition: opacity 0.28s ease, transform 0.42s ease;
}

.vlog-info {
  position: relative;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: -30px 0 0;
  padding: 0 10px;
  box-sizing: border-box;
  z-index: 3;

  &::before {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 34px;
    width: min(90%, 280px);
    height: 16px;
    background: rgba(226, 52, 86, 0.4);
    transform: translateX(-50%) skew(-12deg);
    z-index: -1;
    transition: background 0.35s ease, box-shadow 0.35s ease;
  }
}

.vlog-title {
  position: relative;
  max-width: 110%;
  margin: 0 0 9px;
  overflow: hidden;
  color: #fff;
  font-family: 'cn-custom', 'source-han-sans-simplified-c', sans-serif;
  font-size: 1.8rem;
  letter-spacing: 0;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-shadow: 3px 3px 0 rgba(226, 52, 86, 0.42),
    -2px 0 0 rgba(54, 209, 255, 0.12), 0 0 18px rgba(0, 0, 0, 0.45);
  transition: text-shadow 0.35s ease, letter-spacing 0.35s ease;
}

.vlog-date {
  margin-top: -25px;
  margin-bottom: 25px;
  color: rgba(226, 52, 86, 0.9);
  font-family: 'cn-custom', monospace;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 1.2px;
}

.shared-vlog-card.is-en {
  .vlog-title {
    font-family: 'Anton';
    font-size: 1.3rem;
  }

  .vlog-date {
    margin-top: -10px;
  }
}

@keyframes vlogSpectralDrift {
  0%,
  100% {
    transform: translateX(-6px) skew(-14deg);
  }

  50% {
    transform: translateX(8px) skew(-14deg);
  }
}

@media (max-width: 768px) {
  .shared-vlog-card {
    min-height: 384px;

    .vlog-img-wrap {
      height: 326px;

      .vlog-img {
        max-height: 326px;
      }
    }

    .vlog-title {
      font-size: 1.05rem;
      white-space: normal;
    }

    &.is-en .vlog-title {
      font-size: 0.86rem;
    }
  }
}

@media (min-width: 769px) and (max-width: 1180px) {
  .vlog-img-wrap {
    height: 320px;

    .vlog-img {
      max-height: 320px;
    }
  }
}
</style>
