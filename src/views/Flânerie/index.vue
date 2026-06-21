<template>
  <div
    class="flanerie-page main-container"
    :class="{ 'is-en': locale === 'en' }"
  >
    <PageHeader
      header-label="[241001_ACCIDENT]"
      title-en="FLÂNERIE"
      title-cn="旅程"
      :meta-item="t('flanerie.metaItem')"
      primary-color="#e7492d"
      mobile-tall
    />

    <section class="vlog-section">
      <div
        ref="mapContainerRef"
        class="map-container"
        @animationend="handleMapRevealEnd"
      >
        <div class="map-hud-label">
          <span>TRAVEL_MAP</span>
          <span v-if="locale !== 'en'" class="map-hud-label__cn">
            旅行地图
          </span>
        </div>
        <div id="travel-map" ref="mapRef" class="travel-map" />

        <div class="corner corner-tl" />
        <div class="corner corner-tr" />
        <div class="corner corner-bl" />
        <div class="corner corner-br" />
        <div class="map-scanlines" />
      </div>

      <div class="vlog-groups">
        <section
          v-for="(group, index) in vlogGroups"
          :key="group.id"
          class="vlog-group"
        >
          <HomeSectionBlock
            :section-number="String(index + 1).padStart(2, '0')"
            :rail-label="group.railLabel"
            :title="group.title"
            :title-en="group.titleEn"
          >
            <div class="vlog-grid">
              <VlogCard
                v-for="vlog in group.items"
                :id="`vlog-${vlog.id}`"
                :key="vlog.id"
                :vlog="vlog"
                :active="activeVlogId === vlog.id"
                :interactive="true"
                @select="openVlog(vlog)"
              />
            </div>
          </HomeSectionBlock>
        </section>
      </div>
    </section>
    <PageFooter cn-title="旅程" en-title="FLÂNERIE" />
  </div>
</template>

<script setup lang="ts">
/* eslint-disable simple-import-sort/imports */
import {
  type Component,
  computed,
  createVNode,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  render,
  watch,
} from 'vue'
import { Minus, Plus } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import HomeSectionBlock from '@/components/HomeSectionBlock/index.vue'
import PageHeader from '@/components/PageHeader/index.vue'
import VlogCard from '@/components/VlogCard/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'
import { visualState } from '@/stores'

type VlogCategory = 'visited' | 'resident' | 'activity'

interface VlogGroup {
  id: VlogCategory
  title: string
  titleEn?: string
  railLabel: string
}

interface VlogLocation {
  id: string
  name: string
  lat: number
  lng: number
}

interface VlogItem {
  id: string
  category?: VlogCategory
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
const visualStateStore = visualState()

const vlogs = computed<VlogItem[]>(() => {
  return tm('flanerie.dynamic.vlogs') as VlogItem[]
})

const vlogGroups = computed(() => {
  const groups = tm('flanerie.dynamic.groups') as VlogGroup[]

  return groups.map((group) => ({
    ...group,
    items: vlogs.value.filter(
      (vlog) => (vlog.category || 'visited') === group.id
    ),
  }))
})

const openVlog = (vlog: VlogItem) => {
  router.push(`/flanerie/${vlog.id}`)
}

const mapRef = ref<HTMLElement | null>(null)
const mapContainerRef = ref<HTMLElement | null>(null)
const activeVlogId = ref<string | null>(null)
let mapInstance: any = null
let activeVlogTimer: number | undefined
let mapRevealRefreshTimer: number | undefined

interface MapPlaceGroup extends VlogLocation {
  targets: Array<{
    label: string
    vlogId: string
  }>
}

const VISITED_REGION_GEOJSON_URLS: Record<string, string> = {
  beijing: 'https://geo.datav.aliyun.com/areas_v3/bound/110000.json',
  hunan: 'https://geo.datav.aliyun.com/areas_v3/bound/430000.json',
  anhui: 'https://geo.datav.aliyun.com/areas_v3/bound/340000.json',
  chongqing: 'https://geo.datav.aliyun.com/areas_v3/bound/500000.json',
  shanghai: 'https://geo.datav.aliyun.com/areas_v3/bound/310000.json',
  hubei: 'https://geo.datav.aliyun.com/areas_v3/bound/420000.json',
  guangdong: 'https://geo.datav.aliyun.com/areas_v3/bound/440000.json',
  jiangxi: 'https://geo.datav.aliyun.com/areas_v3/bound/360000.json',
  jiangsu: 'https://geo.datav.aliyun.com/areas_v3/bound/320000.json',
  fujian: 'https://geo.datav.aliyun.com/areas_v3/bound/350000.json',
  singapore: 'https://www.geoboundaries.org/api/current/gbOpen/SGP/ADM0',
}

const mapPlaces = computed<MapPlaceGroup[]>(() => {
  const places = new Map<string, MapPlaceGroup>()

  vlogs.value
    .filter((vlog) => vlog.category !== 'activity')
    .forEach((vlog) => {
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

const getMapTileUrl = () =>
  visualStateStore.theme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.jpg'

const loadGeoJsonBoundary = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) return null

  const data = await response.json()
  if (data?.type === 'FeatureCollection' || data?.type === 'Feature') {
    return data
  }
  if (!data?.gjDownloadURL) return null

  const geoJsonResponse = await fetch(data.gjDownloadURL)
  if (!geoJsonResponse.ok) return null

  return geoJsonResponse.json()
}

const addVisitedRegionHighlights = async (L: any) => {
  const visitedRegionIds = new Set(mapPlaces.value.map((place) => place.id))
  const paneName = 'visited-region-pane'

  mapInstance.createPane(paneName)
  const pane = mapInstance.getPane(paneName)
  if (pane) {
    pane.style.zIndex = '350'
    pane.style.pointerEvents = 'none'
  }

  await Promise.all(
    Array.from(visitedRegionIds).map(async (regionId) => {
      const geoJsonUrl = VISITED_REGION_GEOJSON_URLS[regionId]
      if (!geoJsonUrl) return

      try {
        const geoJson = await loadGeoJsonBoundary(geoJsonUrl)
        if (!geoJson) return

        L.geoJSON(geoJson, {
          pane: paneName,
          interactive: false,
          className: 'visited-region-highlight',
          style: {
            color: '#e23456',
            weight: 1.4,
            opacity: 0.88,
            fillColor: '#e23456',
            fillOpacity: visualStateStore.theme === 'light' ? 0.1 : 0.18,
          },
        }).addTo(mapInstance)
      } catch {
        // Region highlights are decorative; keep the map usable if a boundary API is unavailable.
      }
    })
  )
}

const renderZoomIcon = (selector: string, Icon: Component) => {
  const button = mapContainerRef.value?.querySelector<HTMLElement>(selector)
  if (!button) return

  button.textContent = ''
  button.classList.add('map-zoom-button')
  render(createVNode(Icon), button)
}

const renderZoomControlIcons = () => {
  renderZoomIcon('.leaflet-control-zoom-in', Plus)
  renderZoomIcon('.leaflet-control-zoom-out', Minus)
}

const refreshMapSize = () => {
  if (!mapInstance) return

  window.requestAnimationFrame(() => {
    mapInstance?.invalidateSize({ animate: false, pan: false })
  })
}

const scheduleMapSizeRefresh = (delay = 0) => {
  window.clearTimeout(mapRevealRefreshTimer)
  mapRevealRefreshTimer = window.setTimeout(() => {
    refreshMapSize()
    mapRevealRefreshTimer = undefined
  }, delay)
}

const handleMapRevealEnd = (event: AnimationEvent) => {
  if (
    event.target !== mapContainerRef.value ||
    !event.animationName.includes('travelMapClipIn')
  ) {
    return
  }

  refreshMapSize()
}

const initMap = async () => {
  if (!mapRef.value) return

  const L = (window as any).L
  if (!L) return

  mapInstance = L.map(mapRef.value, {
    center: [25, 105],
    zoom: 4,
    minZoom: 2,
    maxZoom: 8,
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
  })

  L.tileLayer(getMapTileUrl(), { subdomains: 'abcd', maxZoom: 8 }).addTo(
    mapInstance
  )

  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance)
  renderZoomControlIcons()
  refreshMapSize()
  scheduleMapSizeRefresh(900)

  await addVisitedRegionHighlights(L)

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

watch(
  () => visualStateStore.theme,
  async () => {
    if (mapInstance) {
      mapInstance.remove()
      mapInstance = null
    }

    await nextTick()
    initMap()
  }
)

onUnmounted(() => {
  clearActiveVlogTimer()
  window.clearTimeout(mapRevealRefreshTimer)

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
  padding: 30px 0;
  overflow-x: hidden;
  overflow-x: clip;
}

.vlog-grid {
  content-visibility: auto;
  contain-intrinsic-size: 760px;
}

.vlog-groups {
  display: flex;
  flex-direction: column;
  gap: 54px;
}

.vlog-group {
  min-width: 0;
}

.map-container {
  --travel-map-height: 400px;

  position: relative;
  width: 100%;
  height: var(--travel-map-height);
  max-height: var(--travel-map-height);
  border: 1px solid @border;
  overflow: hidden;
  margin-bottom: 40px;
  background: #0a050f;
  isolation: isolate;
  animation: travelMapClipIn 0.64s cubic-bezier(0.18, 0.84, 0.28, 1) 0.18s both;

  .map-hud-label {
    position: absolute;
    top: 20px;
    left: 20px;
    display: flex;
    flex-direction: column;
    padding-left: 10px;
    border-left: 10px solid #e23456;
    gap: 3px;
    font-family: 'cn-custom', monospace;
    font-size: 0.55rem;
    letter-spacing: 3px;
    color: @red;
    z-index: 500;
    opacity: 0.8;

    &__cn {
      font-family: 'source-han-sans-simplified-c', sans-serif;
      font-size: 0.72rem;
      font-weight: 900;
      letter-spacing: 0.12em;
    }
  }

  .travel-map {
    width: 100%;
    height: var(--travel-map-height);
  }

  :deep(.visited-region-highlight) {
    filter: drop-shadow(0 0 7px rgba(226, 52, 86, 0.48));
    stroke-linejoin: round;
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

@keyframes travelMapClipIn {
  0% {
    clip-path: inset(0 0 100% 0);
    opacity: 0;
  }

  100% {
    clip-path: inset(0 0 0 0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .map-container {
    animation: none;
    clip-path: inset(0 0 0 0);
    opacity: 1;
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
    font-family: 'cn-custom', 'source-han-sans-simplified-c', sans-serif;
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
    font-family: 'cn-custom', monospace;
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
    isolation: isolate;
    padding: 0;
  }

  .page-title {
    flex-direction: column;
    gap: 4px;
    font-size: 2.5rem;
  }

  .vlog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    justify-content: stretch;
    gap: 28px 10px;
  }

  .map-container {
    --travel-map-height: 570px;
  }

  .vlog-grid :deep(.shared-vlog-card) {
    max-width: none;
    min-height: clamp(220px, 58vw, 320px);

    .vlog-img-wrap {
      height: clamp(180px, 48vw, 270px);

      .vlog-img {
        max-height: clamp(180px, 48vw, 270px);
      }
    }

    .vlog-title {
      font-size: clamp(0.98rem, 4.2vw, 1.24rem);
      white-space: normal;
    }
  }

  .flanerie-page.is-en {
    .vlog-grid :deep(.shared-vlog-card .vlog-title) {
      font-size: clamp(0.86rem, 3.7vw, 1.06rem);
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
  display: flex !important;
  align-items: center;
  justify-content: center;
  background: rgba(13, 9, 18, 0.9) !important;
  color: #e23456 !important;
  border-color: rgba(226, 52, 86, 0.3) !important;
  font-family: 'anton', monospace !important;
  line-height: 1 !important;

  &:hover {
    background: rgba(226, 52, 86, 0.15) !important;
  }

  svg {
    width: 16px;
    height: 16px;
    display: block;
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

@media (min-width: 769px) {
  .map-place-popup-wrap {
    .leaflet-popup-content-wrapper,
    .leaflet-popup-content {
      width: max-content !important;
      max-width: min(560px, 72vw);
    }
  }

  .map-place-menu {
    min-width: max-content;
    max-width: min(560px, 72vw);
  }

  .map-place-list {
    flex-direction: row;
    flex-wrap: wrap;
  }

  .map-place-option {
    width: auto;
    white-space: nowrap;
  }
}
</style>
