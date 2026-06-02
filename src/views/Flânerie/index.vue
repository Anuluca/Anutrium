<template>
  <div class="flanerie-page main-container">
    <PageHeader
      header-label="[241001_ACCIDENT]"
      title-en="FLÂNERIE"
      title-cn="旅程"
      meta-item="通过自己的双眼捕捉世界。"
      primary-color="#e7492d"
    />

    <!-- ══════════════════════════════════════
         Vlog 旅行记录
    ══════════════════════════════════════ -->
    <section class="vlog-section">
      <!-- 世界地图 -->
      <div ref="mapContainerRef" class="map-container">
        <div class="map-hud-label">// TRAVEL_MAP</div>
        <div id="travel-map" ref="mapRef" class="travel-map" />
        <!-- 地图 HUD 装饰 -->
        <div class="corner corner-tl" />
        <div class="corner corner-tr" />
        <div class="corner corner-bl" />
        <div class="corner corner-br" />
        <div class="map-scanlines" />
      </div>

      <!-- Vlog 卡片网格 -->
      <div class="vlog-grid">
        <div
          v-for="(vlog, index) in vlogs"
          :key="index"
          class="vlog-card"
          @click="goTo404"
        >
          <div class="vlog-img-wrap">
            <img :src="vlog.img" :alt="vlog.title" />
            <div class="vlog-overlay" />
            <div class="scanlines" />
          </div>
          <div class="vlog-info">
            <h4
              class="vlog-title"
              :data-index="String(index + 1).padStart(2, '0')"
            >
              {{ vlog.title }}
            </h4>
            <div class="vlog-meta">
              <span class="vlog-date">{{ vlog.date }}</span>
              <span class="vlog-device">{{ vlog.device }}</span>
            </div>
          </div>
          <div class="corner corner-tl" />
          <div class="corner corner-tr" />
          <div class="corner corner-bl" />
          <div class="corner corner-br" />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
/* eslint-disable simple-import-sort/imports */
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import PageHeader from '@/components/PageHeader/index.vue'

// ── 类型定义 ───────────────────────────────────
interface VlogItem {
  title: string
  date: string
  device: string
  img: string
}

// ── Vlog 数据（示例数据，替换成你的真实数据） ─
const vlogs = ref<VlogItem[]>([
  {
    title: '南京｜初春漫步',
    date: '2025.03',
    device: 'Sony ZV-E10',
    img: 'https://picsum.photos/seed/nj1/600/400',
  },
  {
    title: '南京红山动物园',
    date: '2025.03',
    device: 'Sony ZV-E10',
    img: 'https://picsum.photos/seed/nj2/600/400',
  },
  {
    title: '福州｜三坊七巷',
    date: '2024.11',
    device: 'iPhone 15 Pro',
    img: 'https://picsum.photos/seed/fz1/600/400',
  },
  {
    title: '平潭岛｜蓝眼泪',
    date: '2024.06',
    device: 'iPhone 15 Pro',
    img: 'https://picsum.photos/seed/pt1/600/400',
  },
])

// ── 404 跳转 ───────────────────────────────────
const goTo404 = () => {
  /* router.push('/404') */
}

// ══════════════════════════════════════════════
// Leaflet 世界地图（禁用滚轮缩放）
// ══════════════════════════════════════════════
const mapRef = ref<HTMLElement | null>(null)
const mapContainerRef = ref<HTMLElement | null>(null)
let mapInstance: any = null

// 去过的地点
const visitedPlaces = [
  { name: '南京', lat: 32.06, lng: 118.79 },
  { name: 'Singapore', lat: 1.35, lng: 103.82 },
]

const initMap = async () => {
  if (!mapRef.value) return

  // 动态加载 Leaflet（避免 SSR 问题）
  const L = (window as any).L
  if (!L) return

  mapInstance = L.map(mapRef.value, {
    center: [20, 50],
    zoom: 2,
    minZoom: 2,
    maxZoom: 8,
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false, // 禁用滚轮缩放
  })

  // 使用 CartoDB 暗色底图，风格契合网站
  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    { subdomains: 'abcd', maxZoom: 8 }
  ).addTo(mapInstance)

  // 自定义缩放控件位置
  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance)

  // 添加地点标记
  visitedPlaces.forEach((place) => {
    const icon = L.divIcon({
      className: '',
      html: `<div class="map-marker">
               <div class="marker-pulse"></div>
               <div class="marker-dot"></div>
             </div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    const marker = L.marker([place.lat, place.lng], { icon }).addTo(mapInstance)

    marker.on('click', () => {
      // 点击跳转 404
      window.location.href = '/404'
    })

    // Tooltip
    marker.bindTooltip(`<div class="map-tooltip">${place.name}</div>`, {
      permanent: false,
      direction: 'top',
      offset: [0, -12],
      className: 'map-tooltip-wrap',
    })
  })
}

onMounted(async () => {
  // 确保 Leaflet CSS 已加载
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link')
    link.id = 'leaflet-css'
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
  }
  // 确保 Leaflet JS 已加载
  if (!(window as any).L) {
    await new Promise<void>((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => resolve()
      document.head.appendChild(script)
    })
  }
  await nextTick()
  initMap()
})

onUnmounted(() => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<style lang="less" scoped>
/* ── 变量 ─────────────────────────────────────── */
@red: #e23456;
@red-dim: rgba(226, 52, 86, 0.15);
@border: rgba(255, 255, 255, 0.08);
@text-dim: rgba(255, 255, 255, 0.4);
@card-bg: rgba(13, 9, 18, 0.8);

/* ── 页面容器 ─────────────────────────────────── */
.flanerie-page {
  width: 100%;
  color: #fff;
}

/* ══════════════════════════════════════
   Vlog 旅行记录
══════════════════════════════════════ */
.vlog-section {
  padding: 40px 0 80px;
}

/* 世界地图 */
.map-container {
  position: relative;
  width: 100%;
  height: 400px;
  border: 1px solid @border;
  overflow: hidden;
  margin-bottom: 40px;
  background: #0a050f;

  .map-hud-label {
    position: absolute;
    top: 20px;
    left: 20px;
    font-family: 'Unbounded Sans', monospace;
    font-size: 0.55rem;
    letter-spacing: 3px;
    color: @red;
    z-index: 500;
    opacity: 0.8;
  }

  .travel-map {
    width: 100%;
    height: 100%;
  }

  .map-scanlines {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.015) 1px,
      transparent 1px
    );
    background-size: 100% 3px;
    z-index: 400;
    pointer-events: none;
    opacity: 0.5;
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
}

/* Vlog 卡片 */
.vlog-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.vlog-card {
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid @border;
  transition: transform 0.3s ease, border-color 0.3s ease;
  background: @card-bg;
  display: flex;
  flex-direction: column;

  .vlog-img-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: brightness(0.7) saturate(0.6);
      transition: all 0.5s ease;
    }

    .vlog-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        transparent 30%,
        rgba(10, 5, 10, 0.95) 100%
      );
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
      opacity: 0.5;
    }
  }

  .vlog-info {
    padding: 24px 20px;
    background: rgba(10, 5, 10, 0.95);
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    z-index: 2;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 1px;
      background: linear-gradient(to right, @red, transparent);
      opacity: 0.5;
    }
  }

  .vlog-title {
    font-family: 'anton', 'source-han-sans-simplified-c';
    font-size: 1.3rem;
    font-weight: 900;
    color: #fff;
    margin-bottom: 12px;
    letter-spacing: 0.5px;
    line-height: 1.2;
    position: relative;
    display: inline-block;

    &::before {
      content: attr(data-index);
      display: inline-block;
      background: @red;
      color: #000;
      padding: 2px 10px;
      margin-right: 8px;
      font-size: 0.9rem;
      font-weight: 900;
      line-height: 1;
      clip-path: polygon(0% 50%, 10% 0%, 90% 0%, 100% 50%, 90% 100%, 10% 100%);
      font-family: 'anton', monospace;
    }
  }

  .vlog-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .vlog-date {
    font-family: 'anton', sans-serif;
    font-size: 0.75rem;
    color: @red;
    letter-spacing: 1px;
    font-weight: 700;
  }

  .vlog-device {
    font-family: 'Unbounded Sans', monospace;
    font-size: 0.5rem;
    color: rgba(255, 255, 255, 0.35);
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .corner {
    position: absolute;
    width: 10px;
    height: 10px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    z-index: 3;
    pointer-events: none;
    transition: all 0.3s ease;

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

  &:hover {
    transform: translateY(-6px);
    border-color: @red;

    .vlog-img-wrap img {
      transform: scale(1.06);
      filter: brightness(0.85) saturate(0.85);
    }

    .corner {
      border-color: @red;
      width: 14px;
      height: 14px;
    }

    .vlog-title {
      color: #fff;
    }
  }
}

/* ── 响应式 ───────────────────────────────────── */
@media (max-width: 768px) {
  .flanerie-page {
    padding: 0 4vw;
  }

  .page-title {
    flex-direction: column;
    gap: 4px;
    font-size: 2.5rem;
  }

  .vlog-grid {
    grid-template-columns: 1fr;
  }

  .map-container {
    height: 280px;
  }

  .vlog-card {
    .vlog-title {
      font-size: 1.1rem;
    }
  }
}
</style>

<!-- 全局样式：Leaflet 主题覆写 + 地图标记 -->
<style lang="less">
/* Leaflet 容器深色主题 */
.leaflet-container {
  background: #0a050f !important;
}
.leaflet-tile {
  filter: brightness(0.7) saturate(0.5) hue-rotate(180deg) invert(0.05);
}
.leaflet-control-zoom a {
  background: rgba(13, 9, 18, 0.9) !important;
  color: #e23456 !important;
  border-color: rgba(226, 52, 86, 0.3) !important;
  font-family: 'anton', monospace !important;

  &:hover {
    background: rgba(226, 52, 86, 0.15) !important;
  }
}

/* 自定义地图标记 */
.map-marker {
  position: relative;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.marker-dot {
  width: 8px;
  height: 8px;
  background: #e23456;
  transform: rotate(45deg);
  position: relative;
  z-index: 2;
  box-shadow: 0 0 8px #e23456;
}
.marker-pulse {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 1px solid #e23456;
  transform: rotate(45deg);
  animation: markerPulse 2s ease-out infinite;
  opacity: 0;
}
@keyframes markerPulse {
  0% {
    transform: rotate(45deg) scale(0.5);
    opacity: 0.8;
  }
  100% {
    transform: rotate(45deg) scale(2);
    opacity: 0;
  }
}

/* 地图 Tooltip */
.map-tooltip-wrap {
  background: rgba(13, 9, 18, 0.95) !important;
  border: 1px solid rgba(226, 52, 86, 0.4) !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;

  &::before {
    display: none !important;
  }
}
.map-tooltip {
  font-family: 'Unbounded Sans', monospace;
  font-size: 0.6rem;
  letter-spacing: 2px;
  color: #e23456;
  padding: 4px 10px;
  white-space: nowrap;
}
</style>
