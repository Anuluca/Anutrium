<template>
  <section class="mobile-hero">
    <div class="hero-corners" aria-hidden="true" />
    <div class="hero-copy">
      <span class="hero-label">[Crying-Yet-Joyless]</span>
      <h1>ISLAND</h1>
      <div class="hero-cn">
        <span>个人海湾</span>
      </div>
      <p>{{ t('island.headerMeta') }}</p>
    </div>
    <div class="hero-watermark" aria-hidden="true">ANULUCA'S ISLAND</div>
    <div class="hero-route-icon" aria-hidden="true">
      <Ship />
    </div>
    <div class="hero-beam" aria-hidden="true" />
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Ship } from '@element-plus/icons-vue'

const { t } = useI18n()
</script>

<style lang="less" scoped>
@red: #e23456;
@soft-white: rgba(255, 255, 255, 0.62);

.mobile-hero {
  position: relative;
  display: grid;
  align-items: end;
  min-height: 0;
  padding: clamp(18px, 3svh, 30px) 18px clamp(14px, 2.4svh, 28px);
  overflow: hidden;
}

.hero-corners {
  position: absolute;
  inset: 8px 2px 22px;
  background: linear-gradient(@soft-white 0 0) left top / 16px 1px no-repeat,
    linear-gradient(@soft-white 0 0) left top / 1px 16px no-repeat,
    linear-gradient(@soft-white 0 0) left bottom / 16px 1px no-repeat,
    linear-gradient(@soft-white 0 0) left bottom / 1px 16px no-repeat,
    linear-gradient(@soft-white 0 0) right top / 16px 1px no-repeat,
    linear-gradient(@soft-white 0 0) right top / 1px 16px no-repeat,
    linear-gradient(@soft-white 0 0) right bottom / 16px 1px no-repeat,
    linear-gradient(@soft-white 0 0) right bottom / 1px 16px no-repeat;
  opacity: 0.28;
}

.hero-copy {
  position: relative;
  z-index: 4;
  margin-bottom: 20px;
}

.hero-label {
  display: block;
  color: @red;
  font-family: 'cn-custom', monospace;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

h1 {
  margin: 0;
  color: #fff;
  font-family: 'cn-custom', monospace;
  font-size: clamp(38px, 14vw, 86px);
  font-weight: 900;
  line-height: 0.9;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
}

.hero-cn {
  display: inline-block;
  margin-top: clamp(6px, 1.2svh, 12px);
  padding: 10px;
  padding-top: 0;
  background: @red;
  box-shadow: 0 0 24px rgba(226, 52, 86, 0.34);

  span {
    color: #fff;
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 20px;
    font-weight: 900;
    line-height: 1;
  }
}

.hero-copy p {
  margin: clamp(6px, 1.1svh, 12px) 0 0;
  color: rgba(255, 255, 255, 0.38);
  font-size: 14px;
  font-weight: 900;
}

.hero-watermark {
  position: absolute;
  right: -12px;
  bottom: 40px;
  z-index: 1;
  max-width: 62%;
  color: rgba(226, 52, 87, 0.045);
  font-family: 'anton', sans-serif;
  font-size: clamp(54px, 17vw, 96px);
  font-weight: 900;
  line-height: 0.9;
  word-break: break-word;
}

.hero-route-icon {
  position: absolute;
  right: 18px;
  bottom: 32px;
  z-index: 3;
  width: clamp(104px, 29vw, 128px);
  height: clamp(104px, 29vw, 128px);
  padding: 14px;
  box-sizing: border-box;
  color: @red;
  opacity: 0.3;
  pointer-events: none;
  filter: drop-shadow(0 0 14px rgba(226, 52, 86, 0.8));

  &::before {
    position: absolute;
    inset: 7px;
    border: 1px solid currentColor;
    content: '';
    opacity: 0.46;
    transform: rotate(45deg) scale(0.72);
  }

  &::after {
    position: absolute;
    top: 50%;
    right: -18px;
    left: -18px;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      currentColor 24%,
      currentColor 76%,
      transparent
    );
    content: '';
    opacity: 0.34;
  }

  svg {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    stroke-width: 1.4;
  }
}

.hero-beam {
  position: absolute;
  top: clamp(102px, 16svh, 138px);
  right: -36px;
  left: 42%;
  z-index: 2;
  height: 2px;
  background: linear-gradient(90deg, transparent, @red 28%, transparent);
  box-shadow: 0 0 16px rgba(226, 52, 86, 0.9), 0 0 36px rgba(226, 52, 86, 0.38);
}
</style>
