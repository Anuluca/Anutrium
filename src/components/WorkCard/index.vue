<template>
  <div
    class="shared-work-card"
    data-magnetic
    role="button"
    tabindex="0"
    @click="emit('select', work)"
    @keydown.enter.prevent="emit('select', work)"
    @keydown.space.prevent="emit('select', work)"
  >
    <div class="work-base">
      <img :src="work.img" :alt="work.title" loading="lazy" decoding="async" />
      <div class="work-hud-overlay" />
      <div class="scanlines" />
    </div>

    <div class="work-red-plate" />

    <div class="work-content">
      <div class="work-top-info">
        <div class="company-row">
          <div class="company-logo">
            <img
              :src="work.logo"
              :alt="work.company"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div class="company-details">
            <p class="work-subtitle">{{ work.company }}</p>
            <p class="ref-num">REF. {{ referenceNumber }}</p>
          </div>
        </div>

        <div class="work-tags">
          <span v-for="tag in work.tags" :key="tag" class="tech-label">
            {{ tag }}
          </span>
        </div>
      </div>

      <div class="work-title-row">
        <h3 class="work-name" :class="{ 'cn-font': locale === 'zhCn' }">
          {{ work.title }}
        </h3>
        <div class="project-ref-id">
          <div>ID. {{ work.id }}</div>
          <div v-if="work.time" class="time">{{ work.time }}</div>
        </div>
      </div>
    </div>

    <div class="work-corner work-corner--tl" />
    <div class="work-corner work-corner--tr" />
    <div class="work-corner work-corner--bl" />
    <div class="work-corner work-corner--br" />
    <div class="tactical-text">[MENTOR_NV42]</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

interface WorkCardItem {
  id: string
  title: string
  tags: string[]
  img: string
  company: string
  logo: string
  time?: string
}

const props = defineProps<{
  work: WorkCardItem
  index: number
}>()

const emit = defineEmits<{
  (event: 'select', work: WorkCardItem): void
}>()

const { locale } = useI18n()

const referenceNumber = computed(() => `${props.index + 1}A`)
</script>

<style lang="less" scoped>
.shared-work-card {
  position: relative;
  min-width: 0;
  aspect-ratio: 16 / 9;
  display: flex;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(13, 9, 18, 0.8);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  cursor: pointer;
  transform-style: preserve-3d;
  transition: transform 0.46s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.28s ease, box-shadow 0.46s ease;

  &::before,
  &::after {
    position: absolute;
    z-index: 4;
    content: '';
    pointer-events: none;
  }

  &::before {
    inset: 8px;
    border: 1px solid rgba(226, 52, 86, 0);
    opacity: 0;
    transform: scale(0.965);
    transition: opacity 0.25s ease, border-color 0.25s ease,
      transform 0.46s cubic-bezier(0.16, 1, 0.3, 1);
  }

  &::after {
    top: 0;
    left: -42%;
    width: 36%;
    height: 2px;
    opacity: 0;
    background: linear-gradient(90deg, transparent, #fff 35%, #e23456 75%);
    box-shadow: 0 0 18px rgba(226, 52, 86, 0.8);
    transition: opacity 0.15s ease,
      transform 0.62s cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  &:focus-visible {
    border-color: rgba(226, 52, 86, 0.72);
    outline: 2px solid rgba(226, 52, 86, 0.28);
    outline-offset: 2px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .shared-work-card:hover {
    border-color: rgba(226, 52, 86, 0.84);
    box-shadow: 0 24px 54px rgba(0, 0, 0, 0.42);

    &::before {
      border-color: rgba(226, 52, 86, 0.44);
      opacity: 1;
      transform: scale(1);
    }

    &::after {
      opacity: 1;
      transform: translateX(410%);
    }

    .work-base img {
      filter: brightness(0.76) saturate(0.88) contrast(1.08);
    }

    .work-hud-overlay::after {
      opacity: 0.48;
      transform: perspective(500px) rotateX(58deg) translateY(0);
    }

    .scanlines {
      opacity: 0.86;
      animation: work-scanline-drift 0.36s linear infinite;
    }

    .work-red-plate {
      transform: translateX(0) skewX(0);
    }

    .work-name {
      color: #fff;
      letter-spacing: 0.015em;
      text-shadow: 0 0 24px rgba(226, 52, 86, 0.32);
    }

    .work-subtitle,
    .ref-num,
    .project-ref-id div {
      color: rgba(255, 255, 255, 0.78);
    }

    .tech-label,
    .company-logo {
      border-color: rgba(255, 255, 255, 0.42);
      background-color: rgba(10, 5, 10, 0.56);
    }

    .tech-label {
      color: rgba(255, 255, 255, 0.9);
    }

    .work-corner {
      width: 23px;
      height: 23px;
      border-color: #fff;
      border-width: 2px;
    }

    .work-corner--tl {
      transform: translate(-7px, -7px);
    }

    .work-corner--tr {
      transform: translate(7px, -7px);
    }

    .work-corner--bl {
      transform: translate(-7px, 7px);
    }

    .work-corner--br {
      transform: translate(7px, 7px);
    }

    .tactical-text {
      color: rgba(255, 255, 255, 0.62);
    }
  }
}

.work-base {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    filter: brightness(0.6) saturate(0.7);
    transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
}

.work-hud-overlay {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(
    to right,
    rgba(10, 5, 10, 0.5),
    rgba(10, 5, 10, 0.9)
  );
  z-index: 1;

  &::after {
    position: absolute;
    content: '';
    pointer-events: none;
  }

  &::after {
    right: -10%;
    bottom: -58%;
    left: -10%;
    height: 76%;
    opacity: 0;
    background-image: linear-gradient(
        rgba(226, 52, 86, 0.18) 1px,
        transparent 1px
      ),
      linear-gradient(90deg, rgba(226, 52, 86, 0.18) 1px, transparent 1px);
    background-size: 28px 22px;
    transform: perspective(500px) rotateX(58deg) translateY(24px);
    transform-origin: center bottom;
    transition: opacity 0.3s ease, transform 0.5s ease;
  }
}

.scanlines {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.04) 1px,
    transparent 1px
  );
  background-size: 100% 4px;
  opacity: 0.6;
  transition: opacity 0.25s ease;
  z-index: 2;
}

.work-red-plate {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    112deg,
    rgba(226, 52, 86, 0.06) 0 28%,
    rgba(226, 52, 86, 0.58) 66%,
    rgba(39, 7, 17, 0.82) 100%
  );
  transform: translateX(-106%) skewX(-9deg);
  transform-origin: left;
  transition: transform 0.52s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 1;
}

.work-content {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(18px, 1.55vw, 30px);
  z-index: 2;
}

.work-top-info {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: clamp(10px, 1vw, 20px);
}

.company-row {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: clamp(8px, 0.8vw, 15px);
}

.company-details {
  min-width: 0;
}

.company-logo {
  width: clamp(34px, 2.6vw, 50px);
  height: clamp(34px, 2.6vw, 50px);
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.3);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(0.8);
  }
}

.work-subtitle,
.ref-num {
  font-family: 'cn-custom', monospace;
}

.work-subtitle {
  overflow: hidden;
  color: var(--opacity-color);
  font-size: clamp(0.52rem, 0.55vw, 0.65rem);
  letter-spacing: 0.5px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ref-num {
  margin-top: 2px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.55rem;
}

.work-tags {
  min-width: 0;
  max-width: 48%;
  flex: 0 1 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: clamp(4px, 0.4vw, 8px);
}

.tech-label {
  padding: 3px clamp(6px, 0.5vw, 10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  font-family: 'cn-custom', monospace;
  font-size: clamp(0.45rem, 0.46vw, 0.55rem);
  text-transform: uppercase;
  transition: color 0.25s ease, border-color 0.25s ease,
    background-color 0.25s ease;
}

.work-title-row {
  min-width: 0;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: auto;
}

.work-name {
  min-width: 0;
  flex: 1 1 auto;
  margin-right: 15px;
  color: var(--text-color);
  font-family: 'anton', sans-serif;
  font-size: 40px;
  line-height: 1.1;
  overflow-wrap: anywhere;
  transition: color 0.25s ease, letter-spacing 0.42s ease, text-shadow 0.3s ease;
}

.project-ref-id {
  flex: 0 0 auto;

  div {
    color: rgba(255, 255, 255, 0.3);
    font-family: 'Anton', monospace;
    font-size: 0.6rem;
    text-align: right;

    &.time {
      color: rgb(40, 40, 40);
      background-color: rgba(255, 255, 255, 0.3);
    }
  }
}

.work-corner {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  pointer-events: none;
  transition: all 0.4s ease;
  z-index: 3;

  &--tl {
    top: 15px;
    left: 15px;
    border-right: 0;
    border-bottom: 0;
  }

  &--tr {
    top: 15px;
    right: 15px;
    border-bottom: 0;
    border-left: 0;
  }

  &--bl {
    bottom: 15px;
    left: 15px;
    border-top: 0;
    border-right: 0;
  }

  &--br {
    right: 15px;
    bottom: 15px;
    border-top: 0;
    border-left: 0;
  }
}

.tactical-text {
  position: absolute;
  top: 5px;
  right: 30px;
  color: rgba(255, 255, 255, 0.1);
  font-family: 'cn-custom', monospace;
  font-size: 0.5rem;
  pointer-events: none;
  transition: color 0.25s ease;
  z-index: 3;
}

@keyframes work-scanline-drift {
  from {
    background-position-y: 0;
  }

  to {
    background-position-y: 4px;
  }
}

@media (max-width: 768px) {
  .shared-work-card {
    aspect-ratio: auto;
    min-height: 280px;
  }

  .work-content {
    width: 100%;
    height: 100%;
    padding: 30px 20px;
  }

  .work-top-info {
    flex-direction: column;
    gap: 12px;
  }

  .company-logo {
    width: 32px;
    height: 32px;
  }

  .work-tags {
    justify-content: flex-start;
  }

  .work-name {
    font-size: 1.6rem;
  }
}
</style>
