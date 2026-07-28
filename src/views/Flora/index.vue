<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const FLORA_ASSETS = {
  cat: 'https://assets.anuluca.com/other/cat_full.png',
} as const

const FLORA_SHELL_CLASS = 'flora-shell'
const { locale } = useI18n()
const floraTitle = computed(() =>
  locale.value === 'en' ? 'Floratrium' : '花花庭院'
)

onMounted(() => {
  document.body.classList.remove('flora-shell-leaving')
  document.body.classList.add(FLORA_SHELL_CLASS)
})

onUnmounted(() => {
  document.body.classList.remove(FLORA_SHELL_CLASS)
})
</script>

<template>
  <main class="flora-page" data-route-shell="flora">
    <section class="flora-hero" aria-labelledby="flora-title">
      <p class="flora-status">页面开发中</p>

      <div class="flora-visual">
        <div class="flora-cat-frame">
          <img
            class="flora-cat"
            :src="FLORA_ASSETS.cat"
            alt="花花举起两只前爪的狸花猫"
            decoding="async"
            fetchpriority="high"
          />
        </div>
      </div>

      <header class="flora-lockup">
        <span class="flora-title-copy" aria-hidden="true">{{
          floraTitle
        }}</span>
        <h1 id="flora-title" class="flora-title">{{ floraTitle }}</h1>
      </header>

      <aside class="flora-profile" aria-label="花花的宠物档案">
        <div class="flora-profile__badge" aria-hidden="true">
          <svg class="flora-paw" viewBox="0 0 100 100">
            <ellipse
              cx="19"
              cy="36"
              rx="10"
              ry="14"
              transform="rotate(-24 19 36)"
            />
            <ellipse
              cx="40"
              cy="22"
              rx="10"
              ry="15"
              transform="rotate(-9 40 22)"
            />
            <ellipse
              cx="63"
              cy="22"
              rx="10"
              ry="15"
              transform="rotate(9 63 22)"
            />
            <ellipse
              cx="83"
              cy="39"
              rx="10"
              ry="14"
              transform="rotate(24 83 39)"
            />
            <path
              d="M51 45c-17 0-31 14-31 30 0 11 8 18 18 14 8-3 18-3 26 0 10 4 18-3 18-14 0-16-14-30-31-30Z"
            />
          </svg>
        </div>

        <div class="flora-profile__content">
          <div class="flora-profile__identity">
            <strong>花花</strong>
            <span class="flora-profile__gender" aria-label="性别：母">♀</span>
            <span class="flora-profile__level">Lv.14</span>
          </div>

          <div class="flora-profile__types" aria-label="属性：草、恶">
            <span class="flora-type flora-type--grass">草</span>
            <span class="flora-type flora-type--dark">恶</span>
          </div>
        </div>
      </aside>
    </section>
  </main>
</template>

<style scoped lang="less">
.flora-page {
  --flora-pink: #e23456;
  --flora-pink-hot: #ff2f73;
  --flora-purple: #6d246f;
  --flora-text: #f5f0ec;
  --flora-text-muted: #c8bcc2;
  --flora-line: rgba(255, 44, 113, 0.66);
  --flora-panel: rgba(22, 5, 13, 0.82);

  position: relative;
  isolation: isolate;
  width: 100vw;
  width: 100dvw;
  height: max(100svh, 680px);
  margin-top: -120px;
  margin-left: calc(50% - 50vw);
  margin-left: calc(50% - 50dvw);
  overflow: visible;
  color: var(--flora-text);
}

.flora-hero {
  position: relative;
  width: 100%;
  height: 100%;
}

.flora-status {
  position: absolute;
  top: 50%;
  left: clamp(72px, 8vw, 154px);
  z-index: 4;
  margin: 0;
  color: var(--flora-pink);
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: clamp(2.5em, 2.9vw, 3.75em);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1;
  transform: translateY(-50%);
}

.flora-visual {
  position: absolute;
  top: 9%;
  left: 50%;
  z-index: 2;
  width: clamp(530px, 74vh, 1000px);
  aspect-ratio: 1;
  transform: translateX(-50%);
}

.flora-cat-frame {
  position: absolute;
  inset: -1% 3% -4%;
  z-index: 2;
  animation: flora-cat-enter 0.86s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.flora-cat {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center bottom;
  filter: drop-shadow(0 0 13px rgba(255, 84, 135, 0.72));
  user-select: none;
  -webkit-user-drag: none;
}

.flora-lockup {
  position: absolute;
  top: 77%;
  left: 50%;
  z-index: 4;
  display: grid;
  grid-template-areas: 'title';
  justify-items: center;
  width: min(72vw, 1300px);
  transform: translateX(-50%);
  animation: flora-lockup-enter 0.72s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both;
}

.flora-title,
.flora-title-copy {
  grid-area: title;
  margin: 0;
  font-family: 'cn-custom', sans-serif;
  font-size: clamp(51px, 6.67vw, 160px);
  font-weight: 900;
  letter-spacing: 0;
  white-space: nowrap;
}

.flora-title {
  position: relative;
  z-index: 1;
  text-shadow: 0 0 0.12em rgba(0, 0, 0, 0.78);
  transform: scaleX(0.9);
  transform-origin: center;
}

.flora-title-copy {
  z-index: 0;
  color: #e23456;
  transform: scale(0.99, 1.06);
  transform-origin: center;
}

.flora-profile {
  position: absolute;
  right: 0;
  bottom: clamp(74px, 9.5vh, 112px);
  z-index: 5;
  display: grid;
  grid-template-columns: clamp(112px, 8.5vw, 154px) 1fr;
  align-items: center;
  width: clamp(430px, 28vw, 750px);
  min-height: clamp(180px, 17vh, 240px);
  box-sizing: border-box;
  padding: 24px 38px 22px 24px;
  border: 1px solid rgba(255, 58, 117, 0.82);
  border-right: 0;
  border-radius: 999px 0 0 999px;
  outline: 1px solid rgba(255, 58, 117, 0.26);
  outline-offset: -7px;
  background: linear-gradient(
    105deg,
    rgba(52, 6, 24, 0.94),
    var(--flora-panel) 42%,
    rgba(7, 3, 7, 0.93)
  );
  box-shadow: 0 0 22px rgba(225, 29, 91, 0.25);
  animation: flora-profile-enter 0.78s cubic-bezier(0.16, 1, 0.3, 1) 0.34s both;
}

.flora-profile__badge {
  display: grid;
  place-items: center;
  width: clamp(88px, 6.5vw, 150px);
  aspect-ratio: 1;
  border: 1px solid rgba(255, 54, 112, 0.58);
  border-radius: 50%;
  outline: 1px solid rgba(255, 90, 137, 0.18);
  outline-offset: 6px;
  background: rgba(116, 10, 48, 0.6);
  transition: transform 0.36s cubic-bezier(0.16, 1, 0.3, 1);

  &:hover {
    transform: rotate(-5deg) scale(1.05);
  }
}

.flora-paw {
  display: block;
  width: 60%;
  height: auto;
  fill: #1b0710;
  transform: rotate(-8deg);
}

.flora-profile__content {
  min-width: 0;
}

.flora-profile__identity {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: baseline;
  gap: clamp(13px, 1.3vw, 25px);

  strong {
    color: #fff9f3;
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: clamp(27px, 2vw, 48px);
    font-weight: 900;
    line-height: 1;
  }
}

.flora-profile__gender {
  color: var(--flora-pink-hot);
  font-family: 'Arial Black', sans-serif;
  font-size: clamp(25px, 1.8vw, 44px);
  font-weight: 900;
}

.flora-profile__level {
  color: var(--flora-text-muted);
  font-family: 'cn-custom', monospace;
  font-size: clamp(17px, 1.35vw, 32px);
  font-weight: 500;
  white-space: nowrap;
}

.flora-profile__types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}

.flora-type {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 7px 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  color: #fff8f4;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: clamp(17px, 1.18vw, 28px);
  font-weight: 900;
  line-height: 1;

  &--grass {
    background: linear-gradient(90deg, #a8163c, #db2c58);
  }

  &--dark {
    background: linear-gradient(90deg, #4e174e, #792565);
  }
}

@keyframes flora-cat-enter {
  from {
    opacity: 0;
    transform: translateY(34px) rotate(2deg);
  }

  to {
    opacity: 1;
    transform: translateY(0) rotate(0);
  }
}

@keyframes flora-lockup-enter {
  from {
    opacity: 0;
    transform: translate(-50%, 24px);
  }

  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@keyframes flora-profile-enter {
  from {
    opacity: 0;
    transform: translateX(54px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes flora-lockup-enter-mobile {
  from {
    opacity: 0;
    transform: translateY(24px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

:global(.router-container:has(.flora-page)) {
  display: flow-root;
}

:global(body.flora-shell),
:global(body.flora-shell-leaving) {
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding-right: 0;
  padding-left: 0;
}

:global(body.flora-shell #app),
:global(body.flora-shell-leaving #app),
:global(body.flora-shell .layout-page),
:global(body.flora-shell-leaving .layout-page),
:global(body.flora-shell .router-container),
:global(body.flora-shell-leaving .router-container) {
  width: 100%;
}

:global(body.flora-shell .router-container),
:global(body.flora-shell-leaving .router-container) {
  padding-right: 0;
  padding-left: 0;
}

:global(body:has(.flora-page) .page-scroll-progress.no-rem),
:global(body:has(.flora-page) .back-to-top-button.no-rem) {
  display: none !important;
}

@media screen and (min-width: 768px) and (max-width: 1199px) {
  .flora-visual {
    top: 8%;
    width: min(67vw, 70vh);
  }

  .flora-lockup {
    top: 73%;
    left: 43%;
    width: 64vw;
  }

  .flora-title,
  .flora-title-copy {
    font-size: clamp(51px, 7.33vw, 173px);
  }

  .flora-profile {
    bottom: 48px;
    width: 48vw;
    min-height: 14vw;
  }
}

@media screen and (max-width: 767px) {
  .flora-page {
    height: auto;
    min-height: max(100svh, 820px);
    padding: max(14vw, calc(env(safe-area-inset-top) + 10vw)) 4vw
      max(10vw, calc(env(safe-area-inset-bottom) + 7vw));
    box-sizing: border-box;
  }

  .flora-hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: auto;
  }

  .flora-status {
    left: 8vw;
    font-size: min(14vw, 3em);
  }

  .flora-visual {
    position: relative;
    top: auto;
    left: auto;
    flex: 0 0 auto;
    width: min(100%, 72vw);
    margin-top: 6vw;
    transform: none;
  }

  .flora-cat-frame {
    inset: 0;
  }

  .flora-lockup {
    position: relative;
    top: auto;
    left: auto;
    width: 100%;
    margin-top: 7vw;
    transform: none;
    animation-name: flora-lockup-enter-mobile;
  }

  .flora-title,
  .flora-title-copy {
    font-size: 10vw;
  }

  .flora-profile {
    position: relative;
    right: auto;
    bottom: auto;
    grid-template-columns: 15vw 1fr;
    width: 100%;
    min-height: 18vw;
    margin-top: 5vw;
    padding: 3vw;
    border-right: 1px solid rgba(255, 58, 117, 0.82);
    border-radius: clamp(28px, 7vw, 48px);
  }

  .flora-profile__badge {
    width: 13vw;
  }

  .flora-profile__identity strong {
    font-size: 4.2vw;
  }

  .flora-profile__gender {
    font-size: 4vw;
  }

  .flora-profile__level {
    font-size: 2.6vw;
  }

  .flora-type {
    font-size: 2.7vw;
  }
}

@media screen and (max-width: 520px) {
  .flora-page {
    min-height: max(100svh, 760px);
    padding: max(22vw, calc(env(safe-area-inset-top) + 18vw)) 4vw
      max(20vw, calc(env(safe-area-inset-bottom) + 14vw));
  }

  .flora-visual {
    width: 100%;
  }

  .flora-lockup {
    margin-top: 4vw;
  }

  .flora-title,
  .flora-title-copy {
    font-size: 11.67vw;
  }

  .flora-profile {
    grid-template-columns: 20vw 1fr;
    min-height: 34vw;
    padding: 3vw;
  }

  .flora-profile__badge {
    width: 16vw;
    outline-offset: 4px;
  }

  .flora-profile__identity {
    gap: 10px;

    strong {
      font-size: 6.4vw;
    }
  }

  .flora-profile__gender {
    font-size: 6vw;
  }

  .flora-profile__level {
    font-size: 4vw;
  }

  .flora-profile__types {
    gap: 8px;
    margin-top: 9px;
  }

  .flora-type {
    padding: 6px 10px;
    font-size: 4vw;
  }
}

@media (prefers-reduced-motion: reduce) {
  .flora-cat-frame,
  .flora-lockup,
  .flora-profile {
    animation: none;
  }

  .flora-profile__badge {
    transition: none;
  }
}
</style>
