<template>
  <div class="home-page main-container">
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

          <div
            class="cards-viewport"
            @touchstart.passive="handleCarouselTouchStart"
            @touchmove.passive="handleCarouselTouchMove"
            @touchend="handleCarouselTouchEnd"
            @touchcancel="handleCarouselTouchCancel"
          >
            <transition-group name="slide" tag="div" class="cards-inner">
              <div
                v-for="(item, i) in newsItems"
                v-show="i === activeIndex"
                :key="item.id"
                class="news-card"
              >
                <div class="card-img">
                  <img
                    :src="item.img"
                    :alt="item.title"
                    :loading="i === activeIndex ? 'eager' : 'lazy'"
                    :fetchpriority="i === activeIndex ? 'high' : 'low'"
                    decoding="async"
                  />
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
            <p class="passion-line">
              <span class="passion" data-text="PASSION">PASSION</span>.
            </p>
            <div>WELCOME TO Anuluca'S SECRET BASE.</div>
          </div>
          <div v-else class="moto moto-cn">
            <p class="passion-line">
              <span class="passion" data-text="热情">热情</span>
            </p>
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
                '.jpg'
              "
              alt=""
              loading="lazy"
              decoding="async"
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
                '.jpg'
              "
              alt=""
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
        <p>我是 <span style="color: #e23456">路卡</span>。</p>
        <p class="highlight">{{ $t('home.highlight') }}</p>
        <p class="desc">
          在这里，我呈现我的作品、观察与生活碎片。<br />
          我想要打造一个有灵魂与创意的数字空间。
        </p>
      </div>
    </section>

    <section class="works-section">
      <div class="section-title-row">
        <h2 class="section-title" data-section="02">
          {{ $t('home.title02') }}
        </h2>
        <RouterLink class="archive-entry" to="/archive">
          <span class="archive-entry__code">ARCHIVE_INDEX</span>
          <span class="archive-entry__text">
            {{ locale === 'en' ? 'VIEW ALL' : '全部项目' }}
          </span>
          <span class="archive-entry__arrow">→</span>
        </RouterLink>
      </div>
      <div class="home-module-grid">
        <div class="works-grid">
          <WorkCard
            v-for="(work, index) in works"
            :key="work.id"
            :work="work"
            :index="index"
            @select="openWorkDetail(work)"
          />
        </div>
        <RouterLink class="and-more-entry" to="/archive">
          AND MORE...
        </RouterLink>
      </div>
    </section>

    <section class="journey-section">
      <div class="section-title-row">
        <h2 class="section-title" data-section="03">
          {{ $t('home.title03') }}
        </h2>
        <RouterLink class="archive-entry" to="/flanerie">
          <span class="archive-entry__code">FLANERIE_INDEX</span>
          <span class="archive-entry__text">
            {{ $t('home.journeyViewAll') }}
          </span>
          <span class="archive-entry__arrow">→</span>
        </RouterLink>
      </div>

      <div class="home-module-grid">
        <div class="journey-grid">
          <VlogCard
            v-for="vlog in journeyVlogs"
            :key="vlog.id"
            :vlog="vlog"
            :interactive="true"
            @select="openVlog(vlog.id)"
          />
        </div>
        <RouterLink class="and-more-entry" to="/flanerie">
          AND MORE...
        </RouterLink>
      </div>
    </section>

    <section class="craft-section">
      <div class="section-title-row">
        <h2 class="section-title" data-section="04">
          {{ $t('home.title04') }}
        </h2>
        <RouterLink class="archive-entry" to="/craft">
          <span class="archive-entry__code">CRAFT_INDEX</span>
          <span class="archive-entry__text">
            {{ $t('home.craftViewAll') }}
          </span>
          <span class="archive-entry__arrow">→</span>
        </RouterLink>
      </div>

      <div class="home-module-grid">
        <div class="home-craft-grid">
          <ToolCard
            v-for="(tool, index) in homeTools"
            :key="tool.id"
            :tool="tool"
            :index="index"
            :total="homeTools.length"
            @select="router.push(tool.link)"
          />
        </div>
        <RouterLink class="and-more-entry" to="/craft">
          AND MORE...
        </RouterLink>
      </div>
    </section>

    <PageFooter />
    <WorkDetailModal
      :work="selectedWork"
      :visible="!!selectedWork"
      @close="selectedWork = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import LogoOnly3D from '@/components/LogoOnly3D/index.vue'
import MarqueeShowcase from '@/components/MarqueeShowcase/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import ToolCard from '@/components/ToolCard/index.vue'
import VlogCard from '@/components/VlogCard/index.vue'
import WorkCard from '@/components/WorkCard/index.vue'
import WorkDetailModal from '@/components/WorkDetailModal/index.vue'

const { locale, tm } = useI18n()
const router = useRouter()

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

let touchStartX = 0
let touchStartY = 0
let touchDeltaX = 0
let touchDeltaY = 0

const resetCarouselTouch = () => {
  touchStartX = 0
  touchStartY = 0
  touchDeltaX = 0
  touchDeltaY = 0
}

const handleCarouselTouchStart = (event: TouchEvent) => {
  const touch = event.touches[0]
  if (!touch) return

  pauseAuto()
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  touchDeltaX = 0
  touchDeltaY = 0
}

const handleCarouselTouchMove = (event: TouchEvent) => {
  const touch = event.touches[0]
  if (!touch || !touchStartX) return

  touchDeltaX = touch.clientX - touchStartX
  touchDeltaY = touch.clientY - touchStartY
}

const handleCarouselTouchEnd = () => {
  const absX = Math.abs(touchDeltaX)
  const absY = Math.abs(touchDeltaY)

  if (absX > 48 && absX > absY * 1.25) {
    if (touchDeltaX < 0) {
      nextSlide()
    } else {
      prevSlide()
    }
  }

  resetCarouselTouch()
  resumeAuto()
}

const handleCarouselTouchCancel = () => {
  resetCarouselTouch()
  resumeAuto()
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

interface WorkItem {
  id: string
  title: string
  tags: string[]
  img: string
  company: string
  logo: string
  time: string
  description?: string
  details?: string[]
  images?: string[]
  imageDescriptions?: string[]
  links?: Array<{ label: string; url: string; icon?: string }>
  participation?: number
  confidential?: boolean
}

const selectedWorkIds = ['W001', 'W003', 'W005', 'W002', 'W006', 'P003']

const works = computed<WorkItem[]>(() => {
  const webArchives = tm('archive.dynamic.WebArchives') as WorkItem[]
  const personalArchives = tm('archive.dynamic.PersonalArchives') as WorkItem[]
  const archives = [...webArchives, ...personalArchives]

  return selectedWorkIds
    .map((id) => archives.find((work) => work.id === id))
    .filter((work): work is WorkItem => Boolean(work))
})

const selectedWork = ref<WorkItem | null>(null)

const openWorkDetail = (work: WorkItem) => {
  selectedWork.value = work
}

interface JourneyVlog {
  id: string
  title: string
  date: string
  img: string
  img2?: string
}

const journeyVlogIds = ['jiujiang', 'nanjing', 'singapore']

const journeyVlogs = computed<JourneyVlog[]>(() => {
  const vlogs = tm('flanerie.dynamic.vlogs') as JourneyVlog[]
  return journeyVlogIds
    .map((id) => vlogs.find((vlog) => vlog.id === id))
    .filter((vlog): vlog is JourneyVlog => Boolean(vlog))
})

const openVlog = (vlogId: string) => {
  router.push(`/flanerie/${vlogId}`)
}

interface HomeTool {
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

const homeToolIds = ['bounce-dynamics', 'metronome', 'palette', 'image-base64']

const homeTools = computed<HomeTool[]>(() => {
  const tools = tm('craft.dynamic.tools') as HomeTool[]
  return homeToolIds
    .map((id) => tools.find((tool) => tool.id === id))
    .filter((tool): tool is HomeTool => Boolean(tool))
})
</script>

<style lang="less" scoped>
.home-page {
  width: 100%;
}

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
      padding-right: 130px;
      * {
        font-family: 'Unbounded Sans';
      }
      > p {
        line-height: 1.6rem;
      }
      > div {
        font-family: 'Unbounded Sans';
        font-size: 1.2rem;
        height: 0.1rem;
        margin-top: 35px;
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
    > p {
      line-height: 3.7rem;
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
      margin-top: -1rem;
      margin-left: -5px;

      .passion {
        position: relative;
        isolation: isolate;
        font-size: 6.5rem;
        color: #e23456;
        display: inline-block;
        opacity: 0;
        transform: translateY(30px);
        animation: motoFadeIn 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
        animation-delay: 0.8s;
        transition: color 0.25s ease, filter 0.25s ease,
          letter-spacing 0.35s cubic-bezier(0.2, 0.8, 0.2, 1),
          text-shadow 0.25s ease;

        &::before,
        &::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          z-index: -1;
          opacity: 0;
          pointer-events: none;
        }

        &::before {
          color: #01ddc0;
          transform: translateX(-5px);
          clip-path: inset(8% 0 57% 0);
        }

        &::after {
          color: #ffed47;
          transform: translateX(5px);
          clip-path: inset(58% 0 8% 0);
        }

        &:hover {
          color: #fff;
          letter-spacing: 0.04em;
          filter: saturate(1.3);
          text-shadow: -3px 0 0 rgba(1, 221, 192, 0.8),
            3px 0 0 rgba(226, 52, 86, 0.85), 0 0 28px rgba(226, 52, 86, 0.72);

          &::before {
            opacity: 0.9;
            animation: passionGlitchTop 0.6s steps(2, end) infinite;
          }

          &::after {
            opacity: 0.8;
            animation: passionGlitchBottom 0.72s steps(2, end) infinite reverse;
          }
        }
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

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid var(--opacity-color2);
  margin-bottom: 20px;

  .section-title {
    flex: 1;
    border-bottom: 0;
    margin-bottom: 0;
  }
}

.archive-entry {
  position: relative;
  min-width: 178px;
  height: 34px;
  display: inline-grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-bottom: 1px solid rgba(226, 52, 86, 0.42);
  color: rgba(255, 255, 255, 0.72);
  background: linear-gradient(90deg, rgba(226, 52, 86, 0.16), transparent 65%);
  text-decoration: none;
  overflow: hidden;
  transition: border-color 0.25s ease, color 0.25s ease, transform 0.25s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      110deg,
      transparent 0%,
      transparent 42%,
      rgba(255, 255, 255, 0.18) 50%,
      transparent 58%,
      transparent 100%
    );
    transform: translateX(-100%);
    transition: transform 0.35s ease;
  }

  &::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    width: 46%;
    height: 2px;
    background: #e23456;
  }

  &:hover {
    color: #fff;
    border-color: #e23456;
    transform: translateX(4px);

    &::before {
      transform: translateX(100%);
    }

    .archive-entry__arrow {
      transform: translateX(3px);
    }
  }

  &__code,
  &__text,
  &__arrow {
    position: relative;
    z-index: 1;
    font-family: 'Unbounded Sans', monospace;
    white-space: nowrap;
  }

  &__code {
    min-width: 0;
    overflow: hidden;
    color: rgba(255, 255, 255, 0.28);
    font-size: 0.45rem;
    letter-spacing: 1px;
    text-overflow: ellipsis;
  }

  &__text {
    color: #e23456;
    font-size: 0.56rem;
    letter-spacing: 1px;
  }

  &__arrow {
    color: #e23456;
    font-size: 0.8rem;
    transition: transform 0.25s ease;
  }
}

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

.works-section {
  padding: 30px 0;
}

.journey-section {
  padding: 30px 0;
}

.craft-section {
  padding: 30px 0;
}

.home-module-grid {
  position: relative;
}

.and-more-entry {
  position: absolute;
  right: 0;
  bottom: -20px;
  color: #e23456;
  font-family: 'Unbounded Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  opacity: 0.2;
  transition: opacity 0.25s ease, transform 0.25s ease;

  &:hover,
  &:focus-visible {
    opacity: 1;
    transform: translateX(-3px);
  }

  &:focus-visible {
    outline: 1px solid rgba(226, 52, 86, 0.55);
    outline-offset: 5px;
  }
}

.home-craft-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.home-craft-card {
  position: relative;
  min-height: 250px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 22px;
  overflow: hidden;
  border: 1px solid rgba(59, 105, 244, 0.25);
  color: var(--text-color);
  background: linear-gradient(135deg, rgba(59, 105, 244, 0.12), transparent 42%),
    rgba(13, 9, 18, 0.72);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.3s ease, transform 0.3s ease, background 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      110deg,
      transparent 0%,
      transparent 42%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 58%,
      transparent 100%
    );
    transform: translateX(-100%);
    transition: transform 0.45s ease;
  }

  &:hover {
    border-color: #3b69f4;
    background: linear-gradient(
        135deg,
        rgba(59, 105, 244, 0.2),
        transparent 52%
      ),
      rgba(13, 9, 18, 0.82);
    transform: translateY(-4px);

    &::before {
      transform: translateX(100%);
    }

    .home-craft-card__icon {
      color: #fff;
      transform: scale(1.08) rotate(-4deg);
      text-shadow: 6px 6px 0 rgba(59, 105, 244, 0.38);
    }

    .home-craft-card__cta {
      transform: translateX(4px);
    }
  }

  &__head,
  &__content,
  &__footer {
    position: relative;
    z-index: 1;
  }

  &__head,
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__index,
  &__status,
  &__cta,
  &__tags span {
    font-family: 'Unbounded Sans', monospace;
  }

  &__index {
    color: rgba(255, 255, 255, 0.22);
    font-size: 0.54rem;
    letter-spacing: 2px;
  }

  &__status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: rgba(255, 255, 255, 0.42);
    font-size: 0.5rem;

    i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #5ad480;
      box-shadow: 0 0 8px rgba(90, 212, 128, 0.72);
    }
  }

  &__content {
    display: flex;
    align-items: center;
    gap: 24px;
    margin: 28px 0;
  }

  &__icon {
    min-width: 76px;
    color: #3b69f4;
    font-family: 'Unbounded Sans', monospace;
    font-size: 3.4rem;
    line-height: 1;
    text-align: center;
    text-shadow: 4px 4px 0 rgba(59, 105, 244, 0.2);
    transition: color 0.3s ease, text-shadow 0.3s ease, transform 0.3s ease;
  }

  &__copy {
    min-width: 0;

    h3 {
      margin-bottom: 9px;
      overflow: hidden;
      font-family: 'source-han-sans-simplified-c', sans-serif;
      font-size: 1.05rem;
      font-weight: 900;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    p {
      display: -webkit-box;
      overflow: hidden;
      color: var(--opacity-color);
      font-size: 0.62rem;
      line-height: 1.7;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    span {
      padding: 4px 7px;
      border: 1px solid rgba(59, 105, 244, 0.25);
      color: rgba(255, 255, 255, 0.42);
      font-size: 0.46rem;
    }
  }

  &__cta {
    color: #3b69f4;
    font-size: 0.58rem;
    transition: transform 0.25s ease;
  }

  &__corner {
    position: absolute;
    width: 12px;
    height: 12px;
    border-color: rgba(59, 105, 244, 0.55);
    border-style: solid;
    pointer-events: none;

    &--tl {
      top: 8px;
      left: 8px;
      border-width: 1px 0 0 1px;
    }

    &--br {
      right: 8px;
      bottom: 8px;
      border-width: 0 1px 1px 0;
    }
  }
}

.journey-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 580px));
  justify-content: space-between;
  gap: 10px;
}

.journey-card {
  position: relative;
  min-width: 0;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.09);
  color: var(--text-color);
  background: rgba(13, 9, 18, 0.72);
  text-align: left;
  transition: border-color 0.3s ease, transform 0.3s ease;

  &:disabled {
    cursor: default;
  }

  &.has-detail {
    cursor: pointer;

    &:hover {
      border-color: #e23456;
      transform: translateY(-4px);

      img {
        transform: scale(1.04);
        filter: brightness(0.9) saturate(1);
      }
    }
  }

  &__visual {
    height: 190px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: radial-gradient(
      circle at center,
      rgba(226, 52, 86, 0.14),
      rgba(0, 0, 0, 0.42) 66%
    );

    img {
      width: auto;
      height: auto;
      max-width: 88%;
      max-height: 90%;
      object-fit: contain;
      filter: brightness(0.72) saturate(0.72);
      transition: filter 0.35s ease, transform 0.35s ease;
    }
  }

  &__info {
    padding: 16px 16px 22px;

    h3 {
      margin: 6px 0 8px;
      overflow: hidden;
      font-family: 'source-han-sans-simplified-c', sans-serif;
      font-size: 0.88rem;
      font-weight: 900;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    p {
      display: -webkit-box;
      overflow: hidden;
      color: var(--opacity-color);
      font-size: 0.58rem;
      line-height: 1.6;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }
  }

  &__date,
  &__id {
    font-family: 'Unbounded Sans', monospace;
    font-size: 0.5rem;
    letter-spacing: 1px;
  }

  &__date {
    color: #e23456;
  }

  &__id {
    position: absolute;
    top: 10px;
    right: 12px;
    color: rgba(255, 255, 255, 0.22);
    text-transform: uppercase;
  }
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  width: 100%;
}

@media (max-width: 1199px) and (min-width: 769px) {
  .works-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

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

@keyframes passionGlitchTop {
  0%,
  100% {
    transform: translate(-5px, 0);
    clip-path: inset(8% 0 57% 0);
  }
  35% {
    transform: translate(8px, -2px);
    clip-path: inset(22% 0 48% 0);
  }
  70% {
    transform: translate(-2px, 3px);
    clip-path: inset(4% 0 68% 0);
  }
}

@keyframes passionGlitchBottom {
  0%,
  100% {
    transform: translate(5px, 0);
    clip-path: inset(58% 0 8% 0);
  }
  40% {
    transform: translate(-7px, 2px);
    clip-path: inset(68% 0 3% 0);
  }
  75% {
    transform: translate(3px, -3px);
    clip-path: inset(48% 0 24% 0);
  }
}
</style>

<style lang="less">
@media screen and (max-aspect-ratio: @ratio-threshold) {
  .home-page {
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
          zoom: 1 !important;
          width: min(100%, 26rem);
          max-width: calc(100vw - 32px);
          height: clamp(13.5rem, 58vw, 16rem);
          margin-top: 0;
          margin-right: auto;
          margin-left: auto;
          overflow: visible;
          touch-action: pan-y;
        }
      }
    }

    .cards-viewport,
    .cards-inner,
    .news-card {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }

    .cards-viewport {
      touch-action: pan-y;
    }

    .news-card {
      left: 0;
      right: 0;
    }

    .card-content {
      left: 0;
      right: 0;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      overflow: hidden;
      padding: 12px 14px 34px;
    }

    .card-top {
      min-width: 0;
      gap: 10px;
    }

    .card-cat {
      flex-shrink: 0;
      white-space: nowrap;
      letter-spacing: 2px;
    }

    .card-date {
      min-width: 0;
      flex: 1;
      overflow: hidden;
      text-align: right;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .card-title,
    .card-subtitle {
      width: 100%;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      overflow-wrap: anywhere;
    }

    .card-title {
      font-size: clamp(0.9rem, 4.3vw, 1.08rem);
      -webkit-line-clamp: 1;
    }

    .card-subtitle {
      font-size: clamp(0.58rem, 3.3vw, 0.68rem);
      -webkit-line-clamp: 2;
    }

    .nav-btn {
      width: 32px;
      height: 32px;
      background: rgba(0, 0, 0, 0.22);

      &--prev {
        left: 6px;
      }

      &--next {
        right: 6px;
      }
    }

    .carousel-counter {
      top: 8px;
      right: 10px;
    }

    .card-watermark {
      display: none;
    }

    .section-title-row {
      gap: 10px;
    }

    .section-title-row .section-title {
      min-width: 0;
      font-size: 1rem;
    }

    .archive-entry {
      min-width: 112px;
      height: 30px;
      grid-template-columns: auto auto;
      padding: 0 10px;

      &__code {
        display: none;
      }

      &__text {
        font-size: 0.5rem;
      }
    }

    .square-image {
      zoom: 0.3;
    }
    .works-grid {
      grid-template-columns: 1fr !important;
      gap: 15px;
    }

    .journey-grid {
      grid-template-columns: minmax(0, min(84vw, 560px));
      justify-content: center;
      gap: 10px;
    }

    .home-craft-grid {
      grid-template-columns: 1fr;
    }

    .home-craft-card {
      min-height: 210px;
      padding: 18px;

      &__content {
        gap: 16px;
        margin: 20px 0;
      }

      &__icon {
        min-width: 54px;
        font-size: 2.6rem;
      }

      &__copy h3 {
        font-size: 0.86rem;
      }
    }

    .journey-card {
      min-height: 230px;

      &__visual {
        height: 128px;
      }

      &__info {
        padding: 12px;

        h3 {
          font-size: 0.72rem;
        }
      }
    }
  }
}
</style>
