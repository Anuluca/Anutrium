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
    <svg class="hero-anchor" viewBox="0 0 80 72" aria-hidden="true">
      <path
        d="M40 5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 13v50M40 36H27m13 0h13"
      />
      <path d="M15 45c5 16 13 23 25 23s20-7 25-23" />
      <path d="M15 45l16 4-11 10M65 45l-16 4 11 10" />
    </svg>
    <div class="hero-beam" aria-hidden="true" />
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

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
  font-family: 'Unbounded Sans', monospace;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

h1 {
  margin: 0;
  color: #fff;
  font-family: 'Unbounded Sans', monospace;
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
    font-family: 'source-han-sans-simplified-c', sans-serif;
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

.hero-anchor {
  position: absolute;
  top: clamp(68px, 11svh, 90px);
  right: 24px;
  z-index: 3;
  width: 82px;
  height: 74px;
  fill: none;
  stroke: @red;
  stroke-width: 4.4;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 0 8px rgba(226, 52, 86, 0.88))
    drop-shadow(0 0 22px rgba(226, 52, 86, 0.42));
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
