<template>
  <div
    class="flanerie-page main-container"
    :class="{ 'is-en': locale === 'en' }"
  >
    <PageHeader
      header-label="[241001_ACCIDENT___CYJ_Simon]"
      title-en="FLÂNERIE"
      title-cn="旅程"
      :meta-item="t('flanerie.metaItem')"
      primary-color="#e7492d"
    />

    <section class="vlog-section">
      <div ref="mapContainerRef" class="map-container">
        <div class="map-hud-label">// TRAVEL_MAP</div>
        <div id="travel-map" ref="mapRef" class="travel-map" />

        <div class="corner corner-tl" />
        <div class="corner corner-tr" />
        <div class="corner corner-bl" />
        <div class="corner corner-br" />
        <div class="map-scanlines" />
      </div>

      <div class="vlog-grid">
        <VlogCard
          v-for="vlog in vlogs"
          :id="`vlog-${vlog.id}`"
          :key="vlog.id"
          :vlog="vlog"
          :active="activeVlogId === vlog.id"
          :interactive="hasVlogPage(vlog.id)"
          @select="openVlog(vlog)"
        />
      </div>
    </section>
    <PageFooter cn-title="旅程" en-title="FLÂNERIE" />
  </div>
</template>

<script setup lang="ts">
/* eslint-disable simple-import-sort/imports */
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageHeader from '@/components/PageHeader/index.vue'
import VlogCard from '@/components/VlogCard/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

interface VlogLocation {
  id: string
  name: string
  lat: number
  lng: number
}

interface VlogItem {
  id: string
  title: string
  mapLabel: string
  date: string
  tagline: string
  device: string[]
  img: string
  img2?: string
  location: VlogLocation
}

const router = useRouter()
const { locale, t, tm } = useI18n()

const vlogs = computed<VlogItem[]>(() => {
  return tm('flanerie.dynamic.vlogs') as VlogItem[]
})

const hasVlogPage = (vlogId: string) => {
  return router
    .resolve(`/flanerie/${vlogId}`)
    .matched.some((route) => route.meta.vlogId === vlogId)
}

const openVlog = (vlog: VlogItem) => {
  if (!hasVlogPage(vlog.id)) return

  router.push(`/flanerie/${vlog.id}`)
}

const mapRef = ref<HTMLElement | null>(null)
const mapContainerRef = ref<HTMLElement | null>(null)
const activeVlogId = ref<string | null>(null)
let mapInstance: any = null
let activeVlogTimer: number | undefined

interface MapPlaceGroup extends VlogLocation {
  targets: Array<{
    label: string
    vlogId: string
  }>
}

const mapPlaces = computed<MapPlaceGroup[]>(() => {
  const places = new Map<string, MapPlaceGroup>()

  vlogs.value.forEach((vlog) => {
    const currentPlace = places.get(vlog.location.id)
    const target = {
      label: vlog.mapLabel || vlog.title,
      vlogId: vlog.id,
    }

    if (currentPlace) {
      currentPlace.targets.push(target)
      return
    }

    places.set(vlog.location.id, {
      ...vlog.location,
      targets: [target],
    })
  })

  return Array.from(places.values())
})

const clearActiveVlogTimer = () => {
  if (!activeVlogTimer) return

  window.clearTimeout(activeVlogTimer)
  activeVlogTimer = undefined
}

const scrollToVlog = (vlogId: string) => {
  const target = document.getElementById(`vlog-${vlogId}`)
  if (!target) return

  clearActiveVlogTimer()
  activeVlogId.value = vlogId

  target.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })

  activeVlogTimer = window.setTimeout(() => {
    activeVlogId.value = null
    activeVlogTimer = undefined
  }, 1000)
}

const buildPlacePopup = (place: MapPlaceGroup) => {
  const items = place.targets
    .map(
      (target) =>
        `<button class="map-place-option" type="button" data-vlog-id="${target.vlogId}">${target.label}</button>`
    )
    .join('')

  return `<div class="map-place-menu">
    <div class="map-place-title">${place.name}</div>
    <div class="map-place-list">${items}</div>
  </div>`
}

const initMap = async () => {
  if (!mapRef.value) return

  const L = (window as any).L
  if (!L) return

  mapInstance = L.map(mapRef.value, {
    center: [25, 105],
    zoom: 3,
    minZoom: 2,
    maxZoom: 8,
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
  })

  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png',
    { subdomains: 'abcd', maxZoom: 8 }
  ).addTo(mapInstance)

  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance)

  mapPlaces.value.forEach((place) => {
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
    let closeTimer: number | undefined

    const scheduleClose = () => {
      window.clearTimeout(closeTimer)
      closeTimer = window.setTimeout(() => {
        marker.closePopup()
      }, 260)
    }

    const cancelClose = () => {
      window.clearTimeout(closeTimer)
    }

    marker.bindPopup(buildPlacePopup(place), {
      closeButton: false,
      autoClose: true,
      closeOnClick: false,
      className: 'map-place-popup-wrap',
      offset: [0, -8],
    })

    marker.on('mouseover', () => {
      cancelClose()
      mapInstance.closePopup()
      marker.openPopup()
    })

    marker.on('mouseout', scheduleClose)

    marker.on('popupopen', (event: any) => {
      const popupEl = event.popup.getElement()
      if (!popupEl) return

      L.DomEvent.disableClickPropagation(popupEl)
      popupEl.addEventListener('mouseenter', cancelClose)
      popupEl.addEventListener('mouseleave', scheduleClose)
      popupEl.onclick = (clickEvent: MouseEvent) => {
        const button = (
          clickEvent.target as HTMLElement
        ).closest<HTMLButtonElement>('.map-place-option')
        const vlogId = button?.dataset.vlogId
        if (!vlogId) return

        scrollToVlog(vlogId)
        marker.closePopup()
      }
    })
  })
}

onMounted(async () => {
  if (!document.getElementById('leaflet-css')) {
    const link = document.createElement('link')
    link.id = 'leaflet-css'
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)
  }

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

watch(locale, async () => {
  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }

  await nextTick()
  initMap()
})

onUnmounted(() => {
  clearActiveVlogTimer()

  if (mapInstance) {
    mapInstance.remove()
    mapInstance = null
  }
})
</script>

<style lang="less" scoped>
@red: #e23456;
@red-dim: rgba(226, 52, 86, 0.15);
@border: rgba(255, 255, 255, 0.08);
@text-dim: rgba(255, 255, 255, 0.4);
@card-bg: rgba(13, 9, 18, 0.8);

.flanerie-page {
  width: 100%;
  color: #fff;
  overflow-x: hidden;
  overflow-x: clip;
}

.vlog-section {
  padding: 30px;
  overflow-x: hidden;
  overflow-x: clip;
}

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

.vlog-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 580px));
  justify-content: space-between;
  gap: 10px 10px;
}

.vlog-card {
  position: relative;
  cursor: default;
  width: 580px;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 8px 0 0;
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

  .vlog-img-wrap {
    position: relative;
    width: 100%;
    height: 345px;
    display: grid;
    place-items: end center;
    padding: 0;
    box-sizing: border-box;

    .vlog-img {
      width: auto;
      max-width: 100%;
      height: auto;
      max-height: 345px;
      object-fit: contain;
      display: block;
      filter: drop-shadow(10px 12px 0 rgba(0, 0, 0, 0.46))
        drop-shadow(0 0 18px rgba(226, 52, 86, 0.18));
      transition: opacity 0.62s ease, filter 0.62s ease;
      position: relative;
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

      &::before {
        left: 0;
        top: 36%;
        width: 100%;
        height: 1px;
      }
    }

    .vlog-overlay {
      display: none;
    }

    .scanlines {
      display: none;
    }
  }

  .vlog-info {
    width: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: -30px 0 0;
    padding: 0 10px;
    box-sizing: border-box;
    position: relative;
    z-index: 2;

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
    max-width: 110%;
    font-family: 'Unbounded Sans', 'source-han-sans-simplified-c', sans-serif;
    font-size: 1.8rem;
    color: #fff;
    margin: 0 0 9px;
    letter-spacing: 0;
    line-height: 1.35;
    position: relative;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 3px 3px 0 rgba(226, 52, 86, 0.42),
      -2px 0 0 rgba(54, 209, 255, 0.12), 0 0 18px rgba(0, 0, 0, 0.45);
    transition: text-shadow 0.35s ease, letter-spacing 0.35s ease;
  }

  .vlog-date {
    font-family: 'Unbounded Sans', monospace;
    font-size: 0.66rem;
    color: rgba(226, 52, 86, 0.9);
    letter-spacing: 1.2px;
    font-weight: 800;
    margin-top: -25px;
    margin-bottom: 25px;
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

      &::before,
      &::after {
        opacity: 1;
        animation: vlogBlueprintSweep 1.4s ease-in-out infinite;
      }

      &::after {
        animation-delay: 0.18s;
      }
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

.flanerie-page.is-en {
  .vlog-title {
    font-size: 1.3rem;
    font-family: 'Anton';
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

@keyframes vlogBlueprintSweep {
  0%,
  100% {
    filter: brightness(0.82);
  }

  45% {
    filter: brightness(1.45);
  }
}

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
    grid-template-columns: minmax(0, min(84vw, 560px));
    justify-content: center;
    gap: 42px;
  }

  .map-container {
    height: 380px;
  }

  .vlog-card {
    width: min(84vw, 560px);
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
  }

  .flanerie-page.is-en {
    .vlog-title {
      font-size: 0.86rem;
    }
  }
}

@media (min-width: 769px) and (max-width: 1180px) {
  .vlog-grid {
    grid-template-columns: repeat(2, minmax(0, 540px));
    justify-content: space-between;
  }

  .vlog-card {
    width: 540px;

    .vlog-img-wrap {
      height: 320px;

      .vlog-img {
        max-height: 320px;
      }
    }
  }
}
</style>

<style lang="less">
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

.map-place-popup-wrap {
  .leaflet-popup-content-wrapper {
    padding: 0;
    border-radius: 0;
    background: rgba(7, 3, 10, 0.96);
    border: 1px solid rgba(226, 52, 86, 0.45);
    box-shadow: 10px 10px 0 rgba(0, 0, 0, 0.36);
  }

  .leaflet-popup-content {
    margin: 0;
  }

  .leaflet-popup-tip {
    background: rgba(7, 3, 10, 0.96);
    border: 1px solid rgba(226, 52, 86, 0.45);
    box-shadow: none;
  }
}

.map-place-menu {
  min-width: 156px;
  padding: 10px;
}

.map-place-title {
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(226, 52, 86, 0.28);
  font-family: 'source-han-sans-simplified-c', monospace;
  font-size: 0.58rem;
  font-weight: 900;
  letter-spacing: 1.6px;
  color: #e23456;
}

.map-place-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.map-place-option {
  width: 100%;
  padding: 7px 9px;
  border: 0;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.82);
  cursor: pointer;
  text-align: left;
  font-family: 'source-han-sans-simplified-c', sans-serif;
  font-size: 0.74rem;
  font-weight: 900;
  transition: background 0.2s, color 0.2s, transform 0.2s;

  &:hover {
    background: rgba(226, 52, 86, 0.18);
    color: #fff;
  }
}
</style>
