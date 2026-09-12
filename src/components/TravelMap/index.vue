<template>
  <div
    ref="mapContainerRef"
    class="travel-map-shell"
    :class="`travel-map-shell--${mode}`"
    :aria-hidden="mode === 'background'"
    @animationend="handleMapRevealEnd"
  >
    <div class="travel-map-visual">
      <div class="map-hud-label">
        <span>TRAVEL_MAP</span>
        <span v-if="locale !== 'en'" class="map-hud-label__cn"> 旅行地图 </span>
      </div>
      <div ref="mapRef" class="travel-map" />

      <div class="corner corner-tl" />
      <div class="corner corner-tr" />
      <div class="corner corner-bl" />
      <div class="corner corner-br" />
      <div class="map-scanlines" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { visualState } from '@/stores'
import {
  ensureLeafletStyles,
  loadGeoJsonBoundary,
  loadLeaflet,
} from '@/utils/leafletRuntime'

import type { JourneyItem } from '@/types/flanerie'

type TravelMapMode = 'default' | 'background'

type MapPlaceGroup = JourneyItem['location'] & {
  targets: Array<{
    label: string
    vlogId: string
  }>
}

const props = withDefaults(
  defineProps<{
    vlogs: JourneyItem[]
    mode?: TravelMapMode
  }>(),
  {
    mode: 'default',
  }
)
const emit = defineEmits<{
  select: [vlogId: string]
}>()

const { locale } = useI18n()
const visualStateStore = visualState()
const mapRef = ref<HTMLElement | null>(null)
const mapContainerRef = ref<HTMLElement | null>(null)
let mapInstance: any = null
let tileLayer: any = null
const visitedRegionLayers: any[] = []
const popupCloseTimers = new Set<number>()
let isUnmounted = false
let mapGeneration = 0

const VISITED_REGION_GEOJSON_URLS: Record<string, string> = {
  beijing: '/geo/visited-regions/beijing.geojson',
  hunan: '/geo/visited-regions/hunan.geojson',
  anhui: '/geo/visited-regions/anhui.geojson',
  chongqing: '/geo/visited-regions/chongqing.geojson',
  shanghai: '/geo/visited-regions/shanghai.geojson',
  hubei: '/geo/visited-regions/hubei.geojson',
  guangdong: '/geo/visited-regions/guangdong.geojson',
  jiangxi: '/geo/visited-regions/jiangxi.geojson',
  jiangsu: '/geo/visited-regions/jiangsu.geojson',
  fujian: '/geo/visited-regions/fujian.geojson',
  singapore: '/geo/visited-regions/singapore.geojson',
}
const mapPlaces = computed<MapPlaceGroup[]>(() => {
  const places = new Map<string, MapPlaceGroup>()

  props.vlogs.forEach((vlog) => {
    if (vlog.category === 'activity') return

    const currentPlace = places.get(vlog.location.id)
    const target = {
      label: vlog.mapLabel || vlog.title,
      vlogId: vlog.id,
    }

    if (currentPlace) currentPlace.targets.push(target)
    else {
      places.set(vlog.location.id, {
        ...vlog.location,
        targets: [target],
      })
    }
  })

  return Array.from(places.values())
})

const getMapTileUrl = () =>
  visualStateStore.theme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.jpg'

const updateMapTheme = () => {
  tileLayer?.setUrl(getMapTileUrl())
  const fillOpacity = visualStateStore.theme === 'light' ? 0.07 : 0.13
  visitedRegionLayers.forEach((layer) => layer.setStyle({ fillOpacity }))
}

const addVisitedRegionHighlights = async (L: any, map: any) => {
  const visitedRegionIds = new Set(mapPlaces.value.map((place) => place.id))
  const paneName = 'visited-region-pane'

  map.createPane(paneName)
  const pane = map.getPane(paneName)
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
        if (!geoJson || mapInstance !== map) return

        const regionLayer = L.geoJSON(geoJson, {
          pane: paneName,
          interactive: false,
          className: 'visited-region-highlight',
          style: {
            color: '#e23456',
            weight: 1.4,
            opacity: 0.68,
            fillColor: '#e23456',
            fillOpacity: visualStateStore.theme === 'light' ? 0.07 : 0.13,
          },
        }).addTo(map)
        visitedRegionLayers.push(regionLayer)
      } catch {
        // Region highlights are decorative; keep the map usable if a boundary API is unavailable.
      }
    })
  )
}

const renderZoomIcon = (selector: string, variant: 'plus' | 'minus') => {
  const button = mapContainerRef.value?.querySelector<HTMLElement>(selector)
  if (!button) return

  button.textContent = ''
  const glyph = document.createElement('span')
  glyph.className = `map-zoom-glyph map-zoom-glyph--${variant}`
  button.appendChild(glyph)
}

const renderZoomControlIcons = () => {
  renderZoomIcon('.leaflet-control-zoom-in', 'plus')
  renderZoomIcon('.leaflet-control-zoom-out', 'minus')
}

const moveBackgroundControlsToShell = () => {
  if (props.mode !== 'background') return

  const controlContainer = mapRef.value?.querySelector<HTMLElement>(
    '.leaflet-control-container'
  )
  if (!controlContainer || !mapContainerRef.value) return

  controlContainer.classList.add('travel-map-background-controls')
  mapContainerRef.value.appendChild(controlContainer)
}

const refreshMapSize = () => {
  if (!mapInstance) return

  window.requestAnimationFrame(() => {
    mapInstance?.invalidateSize({ animate: false, pan: false })
  })
}

const destroyMap = () => {
  popupCloseTimers.forEach((timer) => window.clearTimeout(timer))
  popupCloseTimers.clear()
  mapInstance?.remove()
  mapInstance = null
  tileLayer = null
  visitedRegionLayers.length = 0
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

const initMap = () => {
  if (!mapRef.value) return

  const L = (window as any).L
  if (!L) return

  const map = L.map(mapRef.value, {
    center: [25, 105],
    zoom: props.mode === 'background' ? 5 : 4,
    minZoom: 2,
    maxZoom: 8,
    zoomControl: false,
    attributionControl: false,
    scrollWheelZoom: false,
  })
  mapInstance = map

  tileLayer = L.tileLayer(getMapTileUrl(), {
    subdomains: 'abcd',
    maxZoom: 8,
  }).addTo(map)

  L.control.zoom({ position: 'bottomright' }).addTo(map)
  renderZoomControlIcons()
  moveBackgroundControlsToShell()
  refreshMapSize()

  void addVisitedRegionHighlights(L, map)

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

    const marker = L.marker([place.lat, place.lng], { icon }).addTo(map)
    let closeTimer: number | undefined

    const scheduleClose = () => {
      if (closeTimer !== undefined) {
        window.clearTimeout(closeTimer)
        popupCloseTimers.delete(closeTimer)
      }

      const timer = window.setTimeout(() => {
        popupCloseTimers.delete(timer)
        closeTimer = undefined
        if (mapInstance === map) marker.closePopup()
      }, 260)
      closeTimer = timer
      popupCloseTimers.add(timer)
    }

    const cancelClose = () => {
      if (closeTimer === undefined) return
      window.clearTimeout(closeTimer)
      popupCloseTimers.delete(closeTimer)
      closeTimer = undefined
    }

    const popupContent = document.createElement('div')
    popupContent.className = 'map-place-menu'

    const popupTitle = document.createElement('div')
    popupTitle.className = 'map-place-title'
    popupTitle.textContent = place.name

    const popupList = document.createElement('div')
    popupList.className = 'map-place-list'

    place.targets.forEach((target) => {
      const button = document.createElement('button')
      button.className = 'map-place-option'
      button.type = 'button'
      button.textContent = target.label
      button.addEventListener('click', () => {
        emit('select', target.vlogId)
        marker.closePopup()
      })
      popupList.appendChild(button)
    })

    popupContent.append(popupTitle, popupList)
    L.DomEvent.disableClickPropagation(popupContent)
    popupContent.addEventListener('mouseenter', cancelClose)
    popupContent.addEventListener('mouseleave', scheduleClose)

    marker.bindPopup(popupContent, {
      closeButton: false,
      autoClose: true,
      closeOnClick: false,
      className: 'map-place-popup-wrap',
      offset: [0, -8],
    })

    marker.on('mouseover', () => {
      cancelClose()
      map.closePopup()
      marker.openPopup()
    })

    marker.on('mouseout', scheduleClose)
  })
}

const recreateMap = async () => {
  const generation = ++mapGeneration
  destroyMap()

  await nextTick()
  if (isUnmounted || generation !== mapGeneration) return
  initMap()
}

onMounted(async () => {
  isUnmounted = false
  ensureLeafletStyles()

  try {
    await loadLeaflet()
  } catch {
    return
  }
  if (isUnmounted) return
  await recreateMap()
})

watch([locale, () => props.vlogs], () => {
  void recreateMap()
})
watch(() => visualStateStore.theme, updateMapTheme)

onUnmounted(() => {
  isUnmounted = true
  mapGeneration += 1
  destroyMap()
})
</script>

<style lang="less" scoped>
@red: #e23456;
@border: rgba(255, 255, 255, 0.08);

.travel-map-shell {
  --travel-map-height: 400px;

  position: relative;
  width: 100%;
  height: var(--travel-map-height);
  max-height: var(--travel-map-height);
  margin-bottom: 40px;
  overflow: hidden;
  border: 1px solid @border;
  background: #0a050f;
  isolation: isolate;
  animation: travelMapClipIn 0.64s cubic-bezier(0.18, 0.84, 0.28, 1) 0.18s both;
}

.travel-map-visual {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.map-hud-label {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 500;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-left: 10px;
  border-left: 10px solid #e23456;
  color: @red;
  font-family: 'cn-custom', monospace;
  font-size: 0.55rem;
  letter-spacing: 3px;
  opacity: 0.8;

  &__cn {
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.12em;
  }
}

.travel-map {
  width: 100%;
  height: var(--travel-map-height);
}

.map-scanlines {
  position: absolute;
  inset: 0;
  z-index: 400;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.015) 1px,
    transparent 1px
  );
  background-size: 100% 3px;
  opacity: 0.5;
  pointer-events: none;
}

.corner {
  position: absolute;
  z-index: 3;
  width: 10px;
  height: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  pointer-events: none;

  &-tl {
    top: 15px;
    left: 15px;
    border-right: 0;
    border-bottom: 0;
  }

  &-tr {
    top: 15px;
    right: 15px;
    border-bottom: 0;
    border-left: 0;
  }

  &-bl {
    bottom: 15px;
    left: 15px;
    border-top: 0;
    border-right: 0;
  }

  &-br {
    right: 15px;
    bottom: 15px;
    border-top: 0;
    border-left: 0;
  }
}

.travel-map-shell :deep(.visited-region-highlight) {
  filter: drop-shadow(0 0 7px rgba(226, 52, 86, 0.48));
  stroke-linejoin: round;
}

.travel-map-shell :deep(.leaflet-container) {
  background: #0a050f !important;
}

.travel-map-shell :deep(.leaflet-tile) {
  filter: brightness(0.7) saturate(0.5) hue-rotate(180deg) invert(0.05);
}

.travel-map-shell :deep(.leaflet-control-zoom a) {
  display: flex !important;
  align-items: center;
  justify-content: center;
  border-color: rgba(226, 52, 86, 0.3) !important;
  background: rgba(13, 9, 18, 0.9) !important;
  color: #e23456 !important;
  font-family: 'anton', monospace !important;
  line-height: 1 !important;

  &:hover {
    background: rgba(226, 52, 86, 0.15) !important;
  }
}

.travel-map-shell :deep(.map-zoom-glyph) {
  position: relative;
  display: block;
  width: 15px;
  height: 15px;

  &::before,
  &::after {
    position: absolute;
    background: currentcolor;
    content: '';
  }

  &::before {
    top: 6px;
    left: 0;
    width: 15px;
    height: 3px;
  }
}

.travel-map-shell :deep(.map-zoom-glyph--plus)::after {
  top: 0;
  left: 6px;
  width: 3px;
  height: 15px;
}

.travel-map-shell :deep(.map-marker) {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.travel-map-shell :deep(.marker-dot) {
  position: relative;
  z-index: 2;
  width: 8px;
  height: 8px;
  background: #e23456;
  box-shadow: 0 0 8px #e23456;
  transform: rotate(45deg);
}

.travel-map-shell :deep(.marker-pulse) {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 1px solid #e23456;
  opacity: 0;
  transform: rotate(45deg);
  animation: markerPulse 2s ease-out infinite;
}

.travel-map-shell :deep(.map-place-popup-wrap .leaflet-popup-content-wrapper) {
  padding: 0;
  border: 1px solid rgba(226, 52, 86, 0.45);
  border-radius: 0;
  background: rgba(7, 3, 10, 0.96);
  box-shadow: 10px 10px 0 rgba(0, 0, 0, 0.36);
}

.travel-map-shell :deep(.map-place-popup-wrap .leaflet-popup-content) {
  margin: 0;
}

.travel-map-shell :deep(.map-place-popup-wrap .leaflet-popup-tip) {
  border: 1px solid rgba(226, 52, 86, 0.45);
  background: rgba(7, 3, 10, 0.96);
  box-shadow: none;
}

.travel-map-shell :deep(.map-place-menu) {
  min-width: 156px;
  padding: 10px;
}

.travel-map-shell :deep(.map-place-title) {
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(226, 52, 86, 0.28);
  color: #e23456;
  font-family: 'alibaba-puhuiti', monospace;
  font-size: 0.58rem;
  font-weight: 900;
  letter-spacing: 1.6px;
}

.travel-map-shell :deep(.map-place-list) {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.travel-map-shell :deep(.map-place-option) {
  position: relative;
  width: 100%;
  padding: 3px 5px 3px 4px;
  border-color: transparent;
  border-style: solid;
  border-width: 5px 10px 5px 5px;
  box-sizing: border-box;
  background: #2a242d;
  color: rgba(255, 255, 255, 0.82);
  cursor: pointer;
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 0.58rem;
  font-weight: 900;
  text-align: center;
  transition: background 0.2s, color 0.2s, padding-right 0.2s, padding-left 0.2s;

  &::before {
    position: absolute;
    inset: -5px -10px -5px -5px;
    border-color: #19151b;
    border-style: solid;
    border-width: 5px 10px 5px 5px;
    content: '';
    pointer-events: none;
    transition: border-width 0.2s;
  }

  &:hover {
    padding-right: 2px;
    padding-left: 7px;
    background: #3a1420;
    color: #fff;
  }

  &:hover::before {
    border-width: 0;
  }
}

.travel-map-shell--background {
  --travel-map-height: 100%;

  height: 100%;
  max-height: none;
  margin: 0;
  border: 0;
  animation: none;
  pointer-events: none;

  .travel-map-visual {
    transform-origin: center;
    animation: travelMapBackgroundEnter 1.5s cubic-bezier(0.16, 1, 0.3, 1) 0.42s
      both;
  }

  .map-hud-label {
    display: none;
  }

  :deep(.leaflet-bottom.leaflet-right) {
    right: clamp(5rem, 9vw, 9rem);
    bottom: clamp(1.25rem, 3dvh, 2.5rem);
  }

  :deep(.leaflet-control-zoom) {
    display: flex;
    width: max-content;
    border-radius: 0;
    transform: scale(2);
    transform-origin: right bottom;
  }

  :deep(.leaflet-control-zoom a) {
    border-radius: 0 !important;
  }

  :deep(.leaflet-control-zoom-in) {
    border-bottom: 0 !important;
  }

  :deep(.leaflet-popup) {
    pointer-events: auto;
  }

  :deep(.travel-map-background-controls) {
    opacity: 0;
    animation: travelMapControlsEnter 0.3s ease-out 0.42s both;
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

@keyframes travelMapBackgroundEnter {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(1);
  }

  100% {
    opacity: 1;
    transform: translate(9vw, 10dvh) scale(1.75);
  }
}

@keyframes travelMapBackgroundEnterMobile {
  0% {
    opacity: 0;
    transform: translate(0, 0) scale(1);
  }

  100% {
    opacity: 1;
    transform: translate(-30vw, 10dvh) scale(1.64);
  }
}

@keyframes travelMapControlsEnter {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes markerPulse {
  0% {
    opacity: 0.8;
    transform: rotate(45deg) scale(0.5);
  }

  100% {
    opacity: 0;
    transform: rotate(45deg) scale(2);
  }
}

@media (min-width: 769px) {
  .travel-map-shell :deep(.map-place-popup-wrap .leaflet-popup-content-wrapper),
  .travel-map-shell :deep(.map-place-popup-wrap .leaflet-popup-content) {
    width: max-content !important;
    max-width: min(560px, 72vw);
  }

  .travel-map-shell :deep(.map-place-menu) {
    min-width: max-content;
    max-width: min(560px, 72vw);
  }

  .travel-map-shell :deep(.map-place-list) {
    flex-flow: row wrap;
  }

  .travel-map-shell :deep(.map-place-option) {
    width: auto;
    white-space: nowrap;
  }
}

@media (max-width: 768px) {
  .travel-map-shell:not(.travel-map-shell--background) {
    --travel-map-height: 570px;
  }

  .travel-map-shell--background {
    .travel-map-visual {
      animation-name: travelMapBackgroundEnterMobile;
    }

    :deep(.leaflet-bottom.leaflet-right) {
      top: clamp(4.25rem, 9dvh, 5rem);
      right: 1rem;
      bottom: auto;
    }

    :deep(.leaflet-control-zoom) {
      transform: none;
    }

    :deep(.leaflet-control-zoom a) {
      width: 40px !important;
      height: 40px !important;
    }

    :deep(.map-zoom-glyph) {
      width: 20px;
      height: 20px;

      &::before {
        top: 8px;
        width: 20px;
      }
    }

    :deep(.map-zoom-glyph--plus)::after {
      left: 8px;
      height: 20px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .travel-map-shell {
    clip-path: inset(0 0 0 0);
    opacity: 1;
    animation: none;
  }
}
</style>
