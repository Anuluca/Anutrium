<template>
  <button
    class="image-log-album-card"
    type="button"
    :aria-label="`${album.title} / ${album.subtitle}`"
    :style="cardStyle"
    @click="emit('select', album.id)"
  >
    <span class="image-log-album-card__media">
      <span class="image-log-album-card__glow" aria-hidden="true" />
      <span
        v-for="(photo, photoIndex) in previewPhotos"
        :key="`${album.id}-${photoIndex}`"
        class="image-log-album-card__photo"
        :class="`image-log-album-card__photo--${photoIndex + 1}`"
      >
        <img
          v-if="photo"
          :src="photo.url"
          :alt="photo.title || album.title"
          loading="lazy"
          decoding="async"
        />
        <span v-else class="image-log-album-card__color-panel" />
      </span>
      <span class="image-log-album-card__blueprint" aria-hidden="true" />
    </span>

    <span class="image-log-album-card__info">
      <strong>{{ album.title }}</strong>
      <small>{{ album.subtitle }}</small>
    </span>

    <span class="image-log-album-card__count">
      {{ album.photos.length }}
      <small>{{ countLabel }}</small>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface ImageLogAlbumCardPhoto {
  url: string
  title?: string
}

export interface ImageLogAlbumCardData {
  id: string
  title: string
  subtitle: string
  accentColor?: string
  photos: ImageLogAlbumCardPhoto[]
}

const props = defineProps<{
  album: ImageLogAlbumCardData
  countLabel: string
}>()

const emit = defineEmits<{
  (event: 'select', albumId: string): void
}>()

const previewPhotos = computed(() => [
  props.album.photos[0],
  props.album.photos[1],
  null,
])

const cardStyle = computed(() => ({
  '--album-accent-color': '#7f5cff',
}))
</script>

<style lang="less" scoped>
@red: #e23456;
@mono: 'cn-custom', 'Courier New', monospace;
@cjk: 'alibaba-puhuiti', sans-serif;

.image-log-album-card {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  width: 100%;
  max-width: 580px;
  min-height: 300px;
  padding: 8px 0 0;
  border: 0;
  color: #fff;
  background: transparent;
  cursor: pointer;
  isolation: isolate;

  &::before {
    position: absolute;
    right: 14%;
    bottom: 54px;
    left: 14%;
    z-index: -1;
    height: 34px;
    content: '';
    background: radial-gradient(
      ellipse at center,
      color-mix(in srgb, var(--album-accent-color) 42%, transparent),
      rgba(54, 209, 255, 0.12) 42%,
      transparent 72%
    );
    opacity: 0.72;
    transition: opacity 0.35s ease, filter 0.35s ease;
  }

  &::after {
    position: absolute;
    right: 14%;
    bottom: 44px;
    left: 14%;
    z-index: -1;
    height: 52px;
    content: '';
    background: repeating-linear-gradient(
        90deg,
        transparent 0 7px,
        rgba(54, 209, 255, 0.24) 7px 8px,
        color-mix(in srgb, var(--album-accent-color) 28%, transparent) 8px 9px
      ),
      radial-gradient(
        circle at 50% 50%,
        color-mix(in srgb, var(--album-accent-color) 24%, transparent),
        transparent 58%
      );
    mix-blend-mode: screen;
    opacity: 0;
    pointer-events: none;
    transform: skew(-14deg);
    transition: opacity 0.35s ease;
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--album-accent-color) 70%, #fff);
    outline-offset: 6px;
  }

  &:hover {
    &::before {
      opacity: 0.95;
      filter: hue-rotate(28deg);
    }

    &::after {
      opacity: 1;
      animation: imageLogSpectralDrift 0.9s steps(3, end) infinite;
    }

    .image-log-album-card__blueprint {
      opacity: 0.82;
      transform: scaleX(1);
    }

    .image-log-album-card__photo--1 {
      box-shadow: 16px 18px 0 rgba(0, 0, 0, 0.46);
      transform: translateX(-98%) translateY(18px) rotate(-9deg);
    }

    .image-log-album-card__photo--2 {
      box-shadow: 13px 16px 0 rgba(0, 0, 0, 0.44);
      transform: translateX(-50%) translateY(8px) rotate(-1deg);
    }

    .image-log-album-card__photo--3 {
      box-shadow: 10px 14px 0 rgba(0, 0, 0, 0.4);
      transform: translateX(-2%) translateY(18px) rotate(9deg);
    }

    .image-log-album-card__photo--1 img {
      filter: saturate(1.16) contrast(1.08) brightness(1.04);
    }

    .image-log-album-card__info::before {
      background: rgba(54, 209, 255, 0.26);
      box-shadow: -8px 0 0
        color-mix(in srgb, var(--album-accent-color) 46%, transparent);
    }

    .image-log-album-card__info strong {
      letter-spacing: 0.04em;
      text-shadow: 7px 0 0
        color-mix(in srgb, var(--album-accent-color) 72%, transparent);
    }
  }
}

.image-log-album-card__media {
  position: relative;
  display: grid;
  place-items: end center;
  width: 100%;
  height: 345px;
  box-sizing: border-box;
}

.image-log-album-card__glow {
  position: absolute;
  right: 18%;
  bottom: 34px;
  left: 18%;
  height: 88px;
  background: radial-gradient(
    ellipse at center,
    color-mix(in srgb, var(--album-accent-color) 30%, transparent),
    transparent 70%
  );
  filter: blur(12px);
  opacity: 0.64;
}

.image-log-album-card__photo {
  position: absolute;
  bottom: 28px;
  left: 50%;
  display: block;
  width: min(64%, 250px);
  aspect-ratio: 3 / 4;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: #0d0d11;
  box-shadow: 10px 12px 0 rgba(0, 0, 0, 0.44);
  transform-origin: center bottom;
  transition: transform 0.62s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.38s ease;

  &::after {
    position: absolute;
    inset: 0;
    z-index: 2;
    content: '';
    background: linear-gradient(
        to bottom,
        rgba(255, 255, 255, 0.08),
        transparent 28%,
        rgba(0, 0, 0, 0.44)
      ),
      repeating-linear-gradient(
        0deg,
        transparent 0 5px,
        rgba(255, 255, 255, 0.1) 5px 6px
      );
    opacity: 0.18;
    pointer-events: none;
  }

  img,
  .image-log-album-card__color-panel {
    display: block;
    width: 100%;
    height: 100%;
  }

  img {
    object-fit: cover;
    filter: saturate(0.94) contrast(1.06) brightness(0.9);
    transition: filter 0.34s ease, transform 0.34s ease;
  }

  &--1 {
    z-index: 3;
    transform: translateX(-84%) translateY(16px) rotate(-5deg);
    animation: imageLogFanLeft 0.78s cubic-bezier(0.2, 0.84, 0.22, 1) 0.24s
      backwards;
  }

  &--2 {
    z-index: 2;
    transform: translateX(-50%) translateY(0) rotate(0deg);
    animation: imageLogFanRight 0.78s cubic-bezier(0.2, 0.84, 0.22, 1) 0.3s
      backwards;
  }

  &--3 {
    z-index: 1;
    border: 0;
    transform: translateX(-16%) translateY(16px) rotate(5deg);
    animation: imageLogFanFront 0.7s cubic-bezier(0.2, 0.84, 0.22, 1) 0.18s
      backwards;

    &::after {
      opacity: 0.1;
    }
  }
}

.image-log-album-card__color-panel {
  background: linear-gradient(
      90deg,
      rgba(76, 13, 27, 0.02) 0%,
      rgba(76, 13, 27, 0.66) 34%,
      #4c0d1b 70%,
      rgba(76, 13, 27, 0.28) 100%
    ),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.08),
      transparent 30%,
      rgba(0, 0, 0, 0.34)
    );
}

.image-log-album-card__blueprint {
  position: absolute;
  inset: 8% 6% 0;
  z-index: 4;
  background-image: linear-gradient(
      90deg,
      transparent 0 18%,
      color-mix(in srgb, var(--album-accent-color) 58%, transparent) 18%,
      color-mix(in srgb, var(--album-accent-color) 58%, transparent)
        calc(18% + 1px),
      transparent calc(18% + 1px) 46%,
      transparent calc(46% + 1px) 74%,
      color-mix(in srgb, var(--album-accent-color) 58%, transparent)
        calc(74% + 1px),
      transparent calc(74% + 1px)
    ),
    linear-gradient(
      0deg,
      transparent 0 22%,
      color-mix(in srgb, var(--album-accent-color) 58%, transparent) 22%,
      transparent calc(22% + 1px) 51%,
      transparent calc(51% + 1px) 79%,
      color-mix(in srgb, var(--album-accent-color) 54%, transparent)
        calc(79% + 1px),
      transparent calc(79% + 1px)
    );
  mask-image: radial-gradient(ellipse at center, #000 44%, transparent 76%);
  mix-blend-mode: screen;
  opacity: 0;
  pointer-events: none;
  transform: scaleX(0.92);
  transition: opacity 0.28s ease, transform 0.42s ease;
}

.image-log-album-card__info {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: 0;
  margin: -30px 0 0;
  padding: 0 10px;
  box-sizing: border-box;

  &::before {
    position: absolute;
    bottom: 34px;
    left: 50%;
    z-index: -1;
    width: min(90%, 280px);
    height: 16px;
    content: '';
    background: color-mix(in srgb, var(--album-accent-color) 42%, transparent);
    transform: translateX(-50%) skew(-12deg);
    transition: background 0.35s ease, box-shadow 0.35s ease;
  }

  strong {
    max-width: 110%;
    margin: 0 0 9px;
    overflow: hidden;
    color: #fff;
    font-family: @mono, @cjk, sans-serif;
    font-size: 1.3rem;
    font-weight: 900;
    letter-spacing: 0;
    line-height: 1.12;
    text-align: center;
    text-overflow: ellipsis;
    text-shadow: 0 0 20px #000;
    white-space: nowrap;
    -webkit-text-stroke: 1px #000;
    transition: text-shadow 0.35s ease, letter-spacing 0.35s ease;
  }

  small {
    margin-top: -16px;
    margin-bottom: 25px;
    color: color-mix(in srgb, var(--album-accent-color) 90%, #fff);
    font-family: @mono;
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 1.2px;
    text-shadow: 0 0 10px #000;
    white-space: nowrap;
  }
}

.image-log-album-card__count {
  position: absolute;
  top: 26px;
  right: 12%;
  z-index: 7;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 5px 8px 6px;
  color: #fff;
  background: var(--album-accent-color);
  box-shadow: 4px 6px 12px rgba(0, 0, 0, 0.44);
  font-family: @mono;
  font-size: 0.6rem;
  font-weight: 900;
  transform: rotate(3deg);
  transform-origin: right top;

  small {
    font-family: inherit;
    font-size: 0.34rem;
  }
}

@keyframes imageLogSpectralDrift {
  0%,
  100% {
    transform: translateX(-6px) skew(-14deg);
  }

  50% {
    transform: translateX(8px) skew(-14deg);
  }
}

@keyframes imageLogFanLeft {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(0) rotate(0deg) scale(0.94);
  }

  to {
    opacity: 1;
    transform: translateX(-84%) translateY(16px) rotate(-5deg);
  }
}

@keyframes imageLogFanRight {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(0) rotate(0deg) scale(0.94);
  }

  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0) rotate(0deg);
  }
}

@keyframes imageLogFanFront {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(0) rotate(0deg) scale(0.94);
  }

  to {
    opacity: 1;
    transform: translateX(-16%) translateY(16px) rotate(5deg);
  }
}

@media (max-width: 768px) {
  .image-log-album-card {
    min-height: clamp(220px, 58vw, 320px);
  }

  .image-log-album-card__media {
    height: clamp(180px, 48vw, 270px);
  }

  .image-log-album-card__photo {
    width: min(68%, 190px);
    bottom: 20px;
  }

  .image-log-album-card__info {
    strong {
      font-size: clamp(0.98rem, 4.2vw, 1.24rem);
      white-space: normal;
      -webkit-text-stroke: 0;
    }

    small {
      max-width: 92%;
      overflow: hidden;
      font-size: 0.5rem;
      text-overflow: ellipsis;
    }
  }

  .image-log-album-card__count {
    top: 18px;
    right: 8%;
    padding: 3px 5px 4px;
    font-size: 0.44rem;

    small {
      font-size: 0.3rem;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .image-log-album-card,
  .image-log-album-card::before,
  .image-log-album-card::after,
  .image-log-album-card__photo,
  .image-log-album-card__blueprint,
  .image-log-album-card__info::before,
  .image-log-album-card__info strong {
    animation: none !important;
    transition: none !important;
  }
}
</style>
