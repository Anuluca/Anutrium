<template>
  <div class="home-page main-container" @mousewheel="wheelEvent">
    <section class="hero-section">
      <div class="hero-content">
        <div class="recommend" @mouseenter="pauseAuto" @mouseleave="resumeAuto">
          <button class="nav-btn nav-btn--prev" @click="prevSlide">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M13 4L7 10L13 16"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <div class="cards-viewport">
            <transition-group name="slide" tag="div" class="cards-inner">
              <div
                v-for="(item, i) in newsItems"
                v-show="i === activeIndex"
                :key="item.id"
                class="news-card"
              >
                <div class="card-img">
                  <img :src="item.img" :alt="item.title" />
                  <div class="card-img-overlay" />
                </div>

                <div class="card-content">
                  <div class="card-top">
                    <span class="card-cat">{{ item.category }}</span>
                    <span class="card-date">{{ item.date }}</span>
                  </div>
                  <h3 class="card-title">{{ item.title }}</h3>
                  <p class="card-subtitle">{{ item.subtitle }}</p>
                  <div class="card-read">READ MORE <span>→</span></div>
                </div>

                <div class="card-watermark">
                  {{ String(i + 1).padStart(2, '0') }}
                </div>
              </div>
            </transition-group>
          </div>

          <button class="nav-btn nav-btn--next" @click="nextSlide">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M7 4L13 10L7 16"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <div class="carousel-progress">
            <div
              v-for="(_, i) in newsItems"
              :key="i"
              class="progress-bar"
              :class="{ active: i === activeIndex }"
              @click="goTo(i)"
            />
          </div>

          <div class="carousel-counter">
            <span class="counter-cur">{{
              String(activeIndex + 1).padStart(2, '0')
            }}</span>
            <span class="counter-sep">/</span>
            <span class="counter-total">{{
              String(newsItems.length).padStart(2, '0')
            }}</span>
          </div>
        </div>

        <div class="main-slogan">
          <div v-if="locale === 'en'" class="moto">
            <p>DRIVEN</p>
            <p>BY</p>
            <p class="passion-line"><span class="passion">PASSION</span>.</p>
            <div>WELCOME TO Anuluca'S SECRET BASE.</div>
          </div>
          <div v-else class="moto moto-cn">
            <p class="passion-line"><span class="passion">热情</span></p>
            <p>驱动。</p>
            <div>欢迎来到路卡的秘密基地。</div>
          </div>
          <LogoOnly3D class="logoWith3d" data-magnetic />
        </div>
      </div>

      <MarqueeShowcase class="marquee-showcase" />

      <div class="scroll-indicator">
        <span class="scroll-text">{{ $t('scroll') }}</span>
        <div class="scroll-line" />
      </div>
    </section>

    <section class="manifesto-section">
      <h2 class="section-title" data-section="01">{{ $t('home.title01') }}</h2>
      <div v-if="locale === 'en'" class="manifesto-content">
        <div class="background-squares">
          <div
            v-for="(img, index) in backgroundImages"
            :key="img.id"
            class="square-image"
            :class="{ rotating: rotatingImageIndex === index }"
            :style="{
              left: `${img.left}%`,
              top: `${img.top}%`,
              width: `${img.size}px`,
              height: `${img.size}px`,
              transform: `rotate(${img.rotation}deg)`,
            }"
          >
            <img
              :src="
                'https://agzhrzaeerclitlfnhhz.supabase.co/storage/v1/object/public/assets/Logo/' +
                (index + 1) +
                '.JPG'
              "
              alt=""
            />
          </div>
        </div>
        <p>I'm <span style="color: #e23456">Anu</span>luca.</p>
        <p class="highlight">{{ $t('home.highlight') }}</p>
        <p class="desc">
          This is the place where I can share my work, thoughts, and fragments
          of my life.<br />
          I want to build digital experiences that live on the edge of
          creativity and performance.
        </p>
      </div>
      <div v-else class="manifesto-content cn-font">
        <div class="background-squares">
          <div
            v-for="(img, index) in backgroundImages"
            :key="img.id"
            class="square-image"
            :class="{ rotating: rotatingImageIndex === index }"
            :style="{
              left: `${img.left}%`,
              top: `${img.top}%`,
              width: `${img.size}px`,
              height: `${img.size}px`,
              transform: `rotate(${img.rotation}deg)`,
            }"
          >
            <img
              :src="
                'https://agzhrzaeerclitlfnhhz.supabase.co/storage/v1/object/public/assets/Logo/' +
                (index + 1) +
                '.JPG'
              "
              alt=""
            />
          </div>
        </div>
        <p>我是 <span style="color: #e23456">路卡</span>。</p>
        <p class="highlight">{{ $t('home.highlight') }}</p>
        <p class="desc">
          在这里，我呈现我的作品、观察与生活碎片。<br />
          I'm trying to build a digital space with soul and creativity.
        </p>
      </div>
    </section>

    <section class="works-section">
      <h2 class="section-title" data-section="02">{{ $t('home.title02') }}</h2>
      <div class="works-grid">
        <div
          v-for="(work, index) in works"
          :key="index"
          class="work-card"
          data-magnetic
        >
          <div class="work-base">
            <img :src="work.img" :alt="work.title" />
            <div class="work-hud-overlay" />
            <div class="scanlines" />
          </div>

          <div class="work-red-plate" />

          <div class="work-content">
            <div class="work-top-info">
              <div class="company-row">
                <div class="company-logo">
                  <img :src="work.logo" :alt="work.company" />
                </div>
                <div class="company-details">
                  <p class="work-subtitle">{{ work.company }}</p>
                  <p class="ref-num">REF. 0{{ index + 1 }}A</p>
                </div>
              </div>

              <div class="work-tags">
                <span v-for="tag in work.tags" :key="tag" class="tech-label">{{
                  tag
                }}</span>
              </div>
            </div>

            <div class="work-title-row">
              <h3 :class="'work-name ' + (locale === 'zhCn' && 'cn-font')">
                {{ work.title }}
              </h3>
              <div class="project-ref-id">
                <div>ID. {{ work.id }}</div>
                <div class="time">{{ work.time }}</div>
              </div>
            </div>
          </div>

          <div class="corner corner-tl" />
          <div class="corner corner-tr" />
          <div class="corner corner-bl" />
          <div class="corner corner-br" />
          <div class="tactical-text">[MENTOR_NV42]</div>
        </div>
      </div>
    </section>

    <PageFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import LogoOnly3D from '@/components/LogoOnly3D/index.vue'
import MarqueeShowcase from '@/components/MarqueeShowcase/index.vue'
import PageFooter from '@/components/PageFooter/index.vue' // 引入新组件

const { locale, tm } = useI18n()

// ── 轮播数据 ──────────────────────────────
interface NewsItem {
  id: number
  title: string
  subtitle: string
  category: string
  date: string
  img: string
}

const newsItems = computed<NewsItem[]>(() => {
  return tm('home.dynamic.recommend') as NewsItem[]
})

const activeIndex = ref(0)
let autoTimer: ReturnType<typeof setInterval> | null = null
let rotationTimer: ReturnType<typeof setInterval> | null = null

const prevSlide = () => {
  activeIndex.value =
    (activeIndex.value - 1 + newsItems.value.length) % newsItems.value.length
}
const nextSlide = () => {
  activeIndex.value = (activeIndex.value + 1) % newsItems.value.length
}
const goTo = (i: number) => {
  activeIndex.value = i
}
const startAuto = () => {
  if (document.visibilityState === 'hidden') return
  pauseAuto()
  autoTimer = setInterval(nextSlide, 4000)
}
const pauseAuto = () => {
  if (!autoTimer) return
  clearInterval(autoTimer)
  autoTimer = null
}
const resumeAuto = () => startAuto()

// ── 背景图片 ─────────────────────────────────
interface BackgroundImage {
  id: string
  left: number
  top: number
  size: number
  rotation: number
}
const backgroundImages = ref<BackgroundImage[]>([])
const rotatingImageIndex = ref(-1)

const generateBackgroundImages = () => {
  backgroundImages.value = Array.from({ length: 6 }, (_, i) => ({
    id: `sq-${i}`,
    left: Math.random() * 90,
    top: Math.random() * 90,
    size: 80 + Math.random() * 120,
  }))
}
const startRandomRotation = () => {
  if (document.visibilityState === 'hidden') return
  if (rotationTimer) clearInterval(rotationTimer)
  rotationTimer = setInterval(() => {
    rotatingImageIndex.value = Math.floor(
      Math.random() * backgroundImages.value.length
    )
    setTimeout(() => {
      rotatingImageIndex.value = -1
    }, 2000)
  }, 3000)
}

const stopRandomRotation = () => {
  if (!rotationTimer) return
  clearInterval(rotationTimer)
  rotationTimer = null
  rotatingImageIndex.value = -1
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    pauseAuto()
    stopRandomRotation()
    return
  }

  startRandomRotation()
  startAuto()
}

onMounted(() => {
  generateBackgroundImages()
  startRandomRotation()
  startAuto()
  document.addEventListener('visibilitychange', handleVisibilityChange)
})
onUnmounted(() => {
  pauseAuto()
  stopRandomRotation()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})

// ── 作品集数据 ──────────────────────────────
interface WorkItem {
  id: string
  title: string
  tags: string[]
  img: string
  company: string
  logo: string
  time: string
}

const works = computed<WorkItem[]>(() => {
  return tm('home.dynamic.SelectedArchieves') as WorkItem[]
})

const wheelEvent = (_e: WheelEvent) => {}
</script>

<style lang="less" scoped>
.home-page {
  width: 100%;
}

/* ─── HERO ──────────────────────────────────── */
.hero-section {
  position: relative;
  min-height: calc(100vh - 220px);
  display: flex;
  align-items: end;
  flex-wrap: wrap;
  padding-bottom: 50px;
}

.hero-content {
  width: 100%;
  display: flex;
  align-items: end;
  justify-content: center;
  gap: 1rem;
}

/* ─── RECOMMEND ─────────────────────────────── */
.recommend {
  width: 26rem;
  height: 15rem;
  flex-shrink: 0;
  position: relative;
  overflow: visible;
}

.cards-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.cards-inner {
  width: 100%;
  height: 100%;
  position: relative;
}

.news-card {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;

  &:hover {
    .card-img img {
      transform: scale(1.04);
    }
    .card-read span {
      transform: translateX(5px);
    }
  }
}

.card-img {
  position: relative;
  width: 100%;
  flex: 1;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    filter: brightness(0.8) saturate(0.8);
    transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .card-img-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      transparent 30%,
      rgba(10, 5, 10, 0.85) 100%
    );
  }
}

.card-content {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 14px 16px 40px;
  z-index: 2;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
}

.card-cat {
  font-family: 'anton', 'source-han-sans-simplified-c';
  font-size: 0.55rem;
  letter-spacing: 3px;
  color: #fff;
  background: #e23456;
  padding: 3px 8px;
  padding-top: 0px;
  padding-right: 6px;
  line-height: 1.6;
}

.card-date {
  font-family: 'Unbounded Sans', monospace;
  font-size: 0.58rem;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.4);
}

.card-title {
  font-family: 'Unbounded Sans', sans-serif;
  font-size: 1.15rem;
  line-height: 1.2;
  color: #fff;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-subtitle {
  font-size: 0.6rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-read {
  font-family: 'anton', monospace;
  font-size: 0.6rem;
  letter-spacing: 1px;
  color: #e23456;
  display: flex;
  align-items: center;
  gap: 4px;

  span {
    display: inline-block;
    transition: transform 0.25s ease;
  }
}

.card-watermark {
  position: absolute;
  top: 8px;
  right: 10px;
  font-family: 'anton', sans-serif;
  font-size: 3.5rem;
  line-height: 1;
  color: rgba(255, 255, 255, 0.06);
  z-index: 1;
  pointer-events: none;
  letter-spacing: -2px;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 34px;
  height: 34px;
  background: rgba(10, 5, 10, 0);
  border: 0px solid rgba(255, 255, 255, 0.15);
  color: var(--text-color);
  display: flex;
  align-items: center;
  border-radius: 100px;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(2px);
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease,
    transform 0.2s ease;

  &--prev {
    left: -17px;
  }
  &--next {
    right: -17px;
  }

  &:hover {
    background: #e23456;
    border-color: #e23456;
    color: var(--text-color);
  }

  &:active {
    transform: translateY(-50%) scale(0.92);
  }
}

.carousel-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 3px;
  z-index: 5;
  height: 3px;
}

.progress-bar {
  flex: 1;
  height: 100%;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition: background 0.3s ease;

  &.active {
    background: #e23456;
  }

  &:hover:not(.active) {
    background: rgba(255, 255, 255, 0.3);
  }
}

.carousel-counter {
  position: absolute;
  top: -40px;
  right: 0;
  display: flex;
  align-items: baseline;
  gap: 2px;
  z-index: 5;

  .counter-cur {
    font-family: 'anton', monospace;
    font-size: 1.2rem;
    color: #e23456;
    letter-spacing: 1px;
  }
  .counter-sep {
    font-family: 'anton', monospace;
    font-size: 0.9rem;
    color: var(--opacity-color);
  }
  .counter-total {
    font-family: 'anton', monospace;
    font-size: 0.7rem;
    color: var(--opacity-color);
    letter-spacing: 1px;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.4s ease,
    transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* ─── MAIN SLOGAN ────────────────────────── */
.main-slogan {
  position: relative;
  overflow: visible;
  padding-right: 1rem;

  .logoWith3d {
    zoom: 1.6;
    opacity: 0;
    position: absolute;
    right: -100px;
    top: -30px;
    z-index: -1;
    animation: logoFadeInScale 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)
      forwards;
    animation-delay: 0.5s;
  }

  .moto {
    &.moto-cn {
      * {
        font-weight: 900;
      }
      > div {
        font-family: 'source-han-sans-simplified-c';
        font-size: 1.1rem;
        height: 0.1rem;
        margin-top: 20px;
      }
    }

    * {
      font-family: 'anton', 'source-han-sans-simplified-c';
      font-size: 4rem;
      opacity: 0;
      transform: translateY(30px);
      animation: motoFadeIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      line-height: 1.1;
    }

    > div {
      font-size: 0.88rem;
      animation: motoFadeIn2 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
      animation-delay: 1s;
      font-family: 'Unbounded Sans';
      border-top: 1px solid var(--text-color);
      margin-top: 10px;
      display: inline-block;
    }

    p:nth-child(1) {
      animation-delay: 0.2s;
    }
    p:nth-child(2) {
      animation-delay: 0.4s;
    }
    p:nth-child(3) {
      animation-delay: 0.6s;
    }

    .passion-line {
      font-size: 6.5rem;
      margin-top: -0.5rem;
      margin-left: -5px;

      .passion {
        font-size: 6.5rem;
        color: #e23456;
        display: inline-block;
        opacity: 0;
        transform: translateY(30px);
        animation: motoFadeIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        animation-delay: 0.8s;
      }
    }
  }
}

.marquee-showcase {
  margin-top: 40px;
}

.scroll-indicator {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  opacity: 0.6;

  .scroll-text {
    font-family: 'anton', 'source-han-sans-simplified-c';
    font-size: 12px;
    letter-spacing: 2px;
    margin-bottom: 10px;
  }

  .scroll-line {
    width: 1px;
    height: 40px;
    background: rgba(255, 255, 255, 0.2);
    position: relative;
    overflow: hidden;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #e23456;
      animation: scrollDrop 1.5s cubic-bezier(0.77, 0, 0.175, 1) infinite;
    }
  }
}

.section-title {
  font-family: 'anton', 'source-han-sans-simplified-c';
  font-size: 1.2rem;
  font-weight: 900;
  color: #e23456;
  border-bottom: 1px solid var(--opacity-color2);
  padding-bottom: 10px;
  margin-bottom: 20px;

  &::before {
    content: attr(data-section);
    display: inline-block;
    position: relative;
    background: #e23456;
    color: #000;
    padding: 2px 20px;
    padding-bottom: 4px;
    padding-top: 0;
    margin-right: 12px;
    font-size: 1.1rem;
    line-height: 1.2;
    clip-path: polygon(0% 50%, 20% 0%, 80% 0%, 100% 50%, 80% 100%, 20% 100%);
  }
}

/* ─── MANIFESTO ────────────────────────────── */
.manifesto-section {
  padding: 60px 0;

  .manifesto-content {
    position: relative;
    font-family: 'anton';
    font-size: 2.2rem;
    line-height: 1.1;
    text-transform: uppercase;

    .background-squares {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;

      .square-image {
        position: absolute;
        opacity: 0.2;
        transition: all 0.3s ease;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        &.rotating {
          animation: rotate3D 2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      }
    }

    p {
      position: relative;
      z-index: 1;
      font-family: 'anton';
      * {
        font-family: 'anton';
      }
    }

    .highlight {
      color: transparent;
      -webkit-text-stroke: 2px var(--text-color);
    }

    .desc {
      font-size: 1rem;
      text-transform: none;
      margin-top: 20px;
      color: var(--text-color);
      opacity: 0.5;
      line-height: 1.6;
    }
  }
}

/* ─── WORKS ────────────────────────────────── */
.works-section {
  padding: 60px 0;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  width: 100%;
}

.work-card {
  position: relative;
  min-height: 350px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  overflow: hidden;
  cursor: pointer;
  background: rgba(13, 9, 18, 0.8);
  transition: transform 0.4s ease, border-color 0.4s ease;

  .work-base {
    position: absolute;
    inset: 0;
    overflow: hidden;
    z-index: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      filter: brightness(0.6) saturate(0.7);
      transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .work-hud-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to right,
        rgba(10, 5, 10, 0.5),
        rgba(10, 5, 10, 0.9)
      );
      z-index: 1;
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
      z-index: 2;
      opacity: 0.6;
    }
  }

  .work-red-plate {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(226, 52, 86, 0.7) 100%
    );
    transform: scaleY(0);
    transform-origin: bottom;
    transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    z-index: 1;
  }

  .work-content {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: calc(100% - 60px);
    height: calc(100% - 60px);
    padding: 30px;
    z-index: 2;
  }

  .work-top-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
  }

  .company-row {
    display: flex;
    gap: 15px;
    align-items: center;

    .company-logo {
      width: 50px;
      height: 50px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.3);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: brightness(0.8);
      }
    }

    .company-details {
      .work-subtitle {
        font-family: 'Unbounded Sans', monospace;
        font-size: 0.65rem;
        color: var(--opacity-color);
        letter-spacing: 0.5px;
        line-height: 1.4;
      }
      .ref-num {
        font-family: 'Unbounded Sans', monospace;
        font-size: 0.55rem;
        color: rgba(255, 255, 255, 0.4);
        margin-top: 2px;
      }
    }
  }

  .work-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;

    .tech-label {
      font-family: 'Unbounded Sans', monospace;
      font-size: 0.55rem;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 4px 10px;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.6);
      transition: all 0.3s ease;

      &:hover {
        background: #e23456;
        color: white;
        border-color: #e23456;
      }
    }
  }

  .work-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: auto;
    width: 100%;
  }

  .work-name {
    font-family: 'anton', sans-serif;
    font-size: 2rem;
    line-height: 1.1;
    color: var(--text-color);
    width: 80%;
    margin-right: 15px;
  }
  .project-ref-id div {
    font-family: 'Anton', monospace;
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.3);
    text-align: right;
    &.time {
      background-color: rgba(255, 255, 255, 0.3);
      color: rgb(40, 40, 40);
    }
  }

  .corner {
    position: absolute;
    width: 10px;
    height: 10px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    z-index: 3;
    pointer-events: none;
    transition: all 0.4s ease;

    &-tl {
      top: 15px;
      left: 15px;
      border-right: 0;
      border-bottom: 0;
    }
    &-tr {
      top: 15px;
      right: 15px;
      border-left: 0;
      border-bottom: 0;
    }
    &-bl {
      bottom: 15px;
      left: 15px;
      border-right: 0;
      border-top: 0;
    }
    &-br {
      bottom: 15px;
      right: 15px;
      border-left: 0;
      border-top: 0;
    }
  }

  .tactical-text {
    position: absolute;
    top: 5px;
    right: 30px;
    font-family: 'Unbounded Sans', monospace;
    font-size: 0.5rem;
    color: rgba(255, 255, 255, 0.1);
    z-index: 3;
    pointer-events: none;
  }

  &:hover {
    border-color: #e23456;
    transform: translateY(-5px);

    .work-base img {
      transform: scale(1.05);
      filter: brightness(0.7) saturate(0.9);
    }

    .work-red-plate {
      transform: scaleY(1);
    }
    .work-content * {
      color: white;
    }

    .tech-label {
      border-color: rgba(255, 255, 255, 0.4);
      color: rgba(255, 255, 255, 0.8);
    }

    .company-logo {
      border-color: rgba(255, 255, 255, 0.4);
    }

    .corner {
      border-color: #e23456;
      border-width: 2px;
      width: 15px;
      height: 15px;
    }

    .ref-num,
    .project-ref-id {
      color: rgba(255, 255, 255, 0.6);
    }
    .tactical-text {
      color: rgba(255, 255, 255, 0.4);
    }
  }
}

/* ─── KEYFRAMES ─────────────────────────────── */
@keyframes motoFadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes motoFadeIn2 {
  to {
    opacity: 0.2;
    transform: translateY(0);
  }
}
@keyframes logoFadeInScale {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 0.5;
    transform: scale(1);
  }
}
@keyframes scrollDrop {
  0% {
    transform: translateY(-100%);
  }
  100% {
    transform: translateY(100%);
  }
}
@keyframes rotate3D {
  0% {
    transform: rotateY(0deg) rotateX(0deg);
  }
  50% {
    transform: rotateY(180deg) rotateX(180deg);
  }
  100% {
    transform: rotateY(360deg) rotateX(360deg);
  }
}
</style>

<style lang="less">
@media screen and (max-aspect-ratio: @ratio-threshold) {
  &.home-page {
    .hero-section {
      .hero-content {
        display: flex !important;
        flex-direction: column-reverse !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 4rem !important;

        .main-slogan {
          zoom: 0.9;
          padding-right: 0;
        }

        .recommend {
          zoom: 0.7 !important;
          margin-top: 0;
        }
      }
    }

    .square-image {
      zoom: 0.3;
    }
    .works-grid {
      grid-template-columns: 1fr !important;
      gap: 15px;
    }

    .work-card {
      min-height: 280px;
      .work-name {
        font-size: 1.8rem;
      }
      .work-tags {
        justify-content: flex-start;
      }
      .company-row .company-logo {
        width: 32px;
        height: 32px;
      }
    }
  }
}
</style>
