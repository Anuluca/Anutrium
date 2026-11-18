<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watchEffect,
} from 'vue'
import { useI18n } from 'vue-i18n'

import { useFrameTask } from '@/composables/useFrameTask'

import {
  cylinderX,
  layerZoom,
  routes,
  type Site,
  sites,
  terrain,
  world,
} from './atlas'
import { type Camera, createCylinder, type Point } from './cylinder'

const { locale } = useI18n()
const language = computed(() => (locale.value === 'en' ? 1 : 0))
const copy = (zh: string, en: string) => (language.value ? en : zh)
const viewport = ref<HTMLElement | null>(null)
const surface = ref<HTMLCanvasElement | null>(null)
const detailClose = ref<HTMLButtonElement | null>(null)
const size = shallowRef({ width: 1200, height: 720 })
const activeSite = shallowRef(sites[1])
const detail = shallowRef<Site | null>(null)
const minZoom = 0.62
const maxZoom = 2.8
const cylinder = shallowRef<ReturnType<typeof createCylinder> | null>(null)
const camera = shallowRef<Camera>(siteCamera(activeSite.value))
const showOverview = ref(false)
const cylinderView = computed(() =>
  showOverview.value ? null : cylinder.value
)
const projection = computed(() => {
  const view = cylinderView.value
  view?.update(camera.value, size.value)
  return view ? { view } : null
})
const baseScale = computed(
  () =>
    Math.min(size.value.width / world.width, size.value.height / world.height) /
    minZoom
)
const scale = computed(() => baseScale.value * camera.value.zoom)
const terrainTransform = computed(
  () =>
    `scale(${scale.value}) translate(${-camera.value.x}px, ${-camera.value
      .y}px)`
)
const pointers = new Map<number, Point>()
const dragging = ref(false)
let flight = 0

function siteCamera(site: Site): Camera {
  return {
    x: cylinder.value ? cylinderX(site) : site.x,
    y: site.y,
    zoom: layerZoom,
  }
}

function coordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2)}° ${value < 0 ? negative : positive}`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function wrap(value: number) {
  return ((value % world.width) + world.width) % world.width
}

function project({ x, y }: Point) {
  const view = projection.value?.view
  if (view) return view.project({ x, y })
  return {
    x: size.value.width / 2 + (x - camera.value.x) * scale.value,
    y: size.value.height / 2 + (y - camera.value.y) * scale.value,
  }
}

function isOnScreen(point: Point | null, margin = 0): point is Point {
  return (
    !!point &&
    point.x >= -margin &&
    point.x <= size.value.width + margin &&
    point.y >= -margin &&
    point.y <= size.value.height + margin
  )
}

const visibleSites = computed(() =>
  sites.flatMap((site) => {
    const screen = project({
      x: cylinderView.value ? cylinderX(site) : site.x,
      y: site.y,
    })
    return isOnScreen(screen) ? [{ site, screen }] : []
  })
)
const routeLines = computed(() =>
  routes.map(({ start, end }) => {
    const points: string[] = []
    let connected = false
    const segments = cylinderView.value ? 32 : 1
    const endX = cylinderView.value ? cylinderX(end) : end.x
    for (let step = 0; step <= segments; step++) {
      const amount = step / segments
      const point = project({
        x: start.x + (endX - start.x) * amount,
        y: start.y + (end.y - start.y) * amount,
      })
      if (isOnScreen(point, size.value.width)) {
        points.push(
          `${connected ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`
        )
        connected = true
      } else {
        connected = false
      }
    }
    return { key: end.id, d: points.join(' ') }
  })
)

function updateCamera(from: Point, to: Point, zoom: number) {
  if (cylinderView.value) {
    const motion = 660 / (size.value.height * camera.value.zoom)
    camera.value = {
      x: wrap(camera.value.x + (from.x - to.x) * motion),
      y: clamp(camera.value.y + (from.y - to.y) * motion, 0, world.height),
      zoom,
    }
    return
  }
  const nextScale = baseScale.value * zoom
  camera.value = {
    x: clamp(
      camera.value.x + from.x / scale.value - to.x / nextScale,
      0,
      world.width
    ),
    y: clamp(
      camera.value.y + from.y / scale.value - to.y / nextScale,
      0,
      world.height
    ),
    zoom,
  }
}

function localPoint(
  client: Point,
  rect = viewport.value!.getBoundingClientRect()
): Point {
  const { left, top, width, height } = rect
  return {
    x: ((client.x - left) / width - 0.5) * size.value.width,
    y: ((client.y - top) / height - 0.5) * size.value.height,
  }
}

function stopFlight() {
  if (flight) cancelAnimationFrame(flight)
  flight = 0
}

function flyTo(target: Camera) {
  stopFlight()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    camera.value = target
    return
  }
  const start = camera.value
  const dx = cylinderView.value
    ? wrap(target.x - start.x + world.width / 2) - world.width / 2
    : target.x - start.x
  const started = performance.now()
  const tick = (now: number) => {
    const progress = clamp((now - started) / 760, 0, 1)
    const amount = progress * progress * (3 - 2 * progress)
    camera.value = {
      x: progress === 1 ? target.x : start.x + dx * amount,
      y: start.y + (target.y - start.y) * amount,
      zoom: start.zoom + (target.zoom - start.zoom) * amount,
    }
    flight = progress < 1 ? requestAnimationFrame(tick) : 0
  }
  flight = requestAnimationFrame(tick)
}

function focusSite(site: Site, openDetails = false) {
  activeSite.value = site
  detail.value = openDetails ? site : null
  showOverview.value = false
  flyTo(siteCamera(site))
  if (openDetails)
    nextTick(() => detailClose.value?.focus({ preventScroll: true }))
}

function overview() {
  detail.value = null
  showOverview.value = true
  stopFlight()
  camera.value = { x: world.width / 2, y: world.height / 2, zoom: minZoom }
}

function closeDetail() {
  if (!detail.value) return
  const id = detail.value.id
  detail.value = null
  nextTick(() => {
    const target =
      viewport.value?.querySelector<HTMLButtonElement>(`[data-site="${id}"]`) ??
      viewport.value
    target?.focus({ preventScroll: true })
  })
}

function zoomAt(factor: number, point: Point = { x: 0, y: 0 }) {
  stopFlight()
  updateCamera(
    point,
    point,
    clamp(camera.value.zoom * factor, minZoom, maxZoom)
  )
}

function onWheel(event: WheelEvent) {
  if (!event.deltaY) return
  const units =
    event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.value.height : 1
  zoomAt(
    Math.exp(clamp(-event.deltaY * units * 0.002, -0.4, 0.4)),
    localPoint({ x: event.clientX, y: event.clientY })
  )
}

function gesture() {
  const [first, second] = pointers.values()
  if (!second) return { center: first, distance: 0 }
  return {
    center: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
    distance: Math.hypot(first.x - second.x, first.y - second.y),
  }
}

function startDrag(event: PointerEvent) {
  if (event.button !== 0 || pointers.size >= 2) return
  stopFlight()
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (
    pointers.size === 2 ||
    !(event.target instanceof Element && event.target.closest('.atlas-site'))
  ) {
    captureGesture()
  }
}

function captureGesture() {
  for (const id of pointers.keys()) viewport.value?.setPointerCapture(id)
  dragging.value = true
}

function moveDrag(event: PointerEvent) {
  const previous = pointers.get(event.pointerId)
  if (!previous) return
  if (!dragging.value) {
    if (Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 6)
      return
    captureGesture()
  }
  const before = gesture()
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  const after = gesture()
  const factor = before.distance > 0 ? after.distance / before.distance : 1
  const rect = viewport.value?.getBoundingClientRect()
  updateCamera(
    localPoint(before.center, rect),
    localPoint(after.center, rect),
    clamp(camera.value.zoom * factor, minZoom, maxZoom)
  )
}

function endDrag(event: PointerEvent) {
  pointers.delete(event.pointerId)
  dragging.value = pointers.size > 0
}

function onKeydown(event: KeyboardEvent) {
  if (event.target !== viewport.value) return
  const directions: Record<string, Point> = {
    ArrowLeft: { x: 70, y: 0 },
    ArrowRight: { x: -70, y: 0 },
    ArrowUp: { x: 0, y: 70 },
    ArrowDown: { x: 0, y: -70 },
  }
  const direction = directions[event.key]
  if (direction) {
    stopFlight()
    updateCamera({ x: 0, y: 0 }, direction, camera.value.zoom)
  } else if (event.key === '+' || event.key === '=') zoomAt(1.25)
  else if (event.key === '-') zoomAt(0.8)
  else if (event.key === 'Home') focusSite(activeSite.value)
  else return
  event.preventDefault()
}

const { schedule: measure } = useFrameTask(() => {
  if (!viewport.value) return
  const { clientWidth: width, clientHeight: height } = viewport.value
  if (width && height) size.value = { width, height }
})
let observer: ResizeObserver | undefined

function loseCylinder() {
  cylinder.value?.dispose()
  cylinder.value = null
}

watchEffect(() => projection.value?.view.draw(), { flush: 'post' })

onMounted(() => {
  observer = new ResizeObserver(measure)
  if (viewport.value) observer.observe(viewport.value)
  if (surface.value) {
    try {
      cylinder.value = createCylinder(surface.value, () =>
        projection.value?.view.draw()
      )
    } catch {
      loseCylinder()
    }
  }
  measure()
})

onUnmounted(() => {
  observer?.disconnect()
  stopFlight()
  loseCylinder()
})
</script>

<template>
  <section class="tidal-atlas no-rem" @keydown.esc="closeDetail">
    <div
      ref="viewport"
      class="atlas-viewport no-rem"
      :class="{ 'is-dragging': dragging, 'has-detail': detail }"
      role="region"
      :aria-label="copy('世界地形图', 'World terrain map')"
      :data-camera="`${camera.x},${camera.y},${camera.zoom}`"
      :data-view="cylinderView ? 'cylinder' : 'overview'"
      tabindex="0"
      data-lenis-prevent
      @pointerdown="startDrag"
      @pointermove="moveDrag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @lostpointercapture.self="endDrag"
      @wheel.prevent="onWheel"
      @keydown="onKeydown"
    >
      <img
        v-show="!cylinderView"
        class="atlas-terrain no-rem"
        :src="terrain"
        :width="world.width"
        :height="world.height"
        :style="{ transform: terrainTransform }"
        alt=""
        draggable="false"
      />
      <canvas
        v-show="cylinderView"
        ref="surface"
        class="atlas-cylinder no-rem"
        aria-hidden="true"
        @webglcontextlost.prevent="loseCylinder"
      />
      <svg class="atlas-routes no-rem" aria-hidden="true">
        <path v-for="line in routeLines" :key="line.key" :d="line.d" />
      </svg>
      <button
        v-for="{ site, screen } in visibleSites"
        :key="site.id"
        type="button"
        class="atlas-site no-rem"
        :class="{ 'is-current': site.id === activeSite.id }"
        :data-site="site.id"
        :style="{ left: `${screen.x}px`, top: `${screen.y}px` }"
        :aria-expanded="detail?.id === site.id"
        @click="focusSite(site, true)"
      >
        <span class="atlas-site-dot no-rem" aria-hidden="true" />
        <span class="atlas-site-name no-rem">{{
          site.longitude === null
            ? copy('南极点', 'South Pole')
            : site.name[language]
        }}</span>
      </button>
    </div>

    <Transition name="atlas-detail">
      <aside
        v-if="detail"
        :key="detail.id"
        class="atlas-detail no-rem"
        :aria-label="detail.name[language]"
      >
        <div
          class="atlas-detail-backdrop"
          aria-hidden="true"
          @click="closeDetail"
        />
        <button
          ref="detailClose"
          type="button"
          class="atlas-detail-close no-rem"
          :aria-label="copy('关闭地点详情', 'Close site details')"
          @click="closeDetail"
        >
          <span aria-hidden="true">‹</span>
          {{ copy('关闭', 'Close') }}
        </button>
        <div class="atlas-detail-preview no-rem" aria-hidden="true">
          <span
            class="atlas-detail-terrain no-rem"
            :style="{
              backgroundImage: `url(${terrain})`,
              backgroundPosition: `${(detail.x / world.width) * 100}% ${
                (detail.y / world.height) * 100
              }%`,
            }"
          />
        </div>
        <div class="atlas-detail-card no-rem">
          <header>
            <span>{{ detail.region[language] }}</span>
            <h2>{{ detail.name[language] }}</h2>
          </header>
          <p class="atlas-detail-coordinates">
            <span>{{ coordinate(detail.latitude, 'N', 'S') }}</span>
            <span v-if="detail.longitude !== null">
              {{ coordinate(detail.longitude, 'E', 'W') }}
            </span>
          </p>
          <p v-if="detail.longitude === null" class="atlas-detail-note">
            {{
              copy(
                '南极洲无首都，此处为科考站',
                'Research station, Antarctica has no capital'
              )
            }}
          </p>
        </div>
      </aside>
    </Transition>
    <Transition name="atlas-menu">
      <nav
        v-if="!detail"
        class="atlas-layers no-rem"
        :aria-label="copy('地图地点', 'Map locations')"
      >
        <button
          v-for="site in sites"
          :key="site.id"
          type="button"
          :aria-label="`${site.region[language]}-${site.name[language]}`"
          :aria-pressed="site.id === activeSite.id"
          @click="focusSite(site)"
        >
          <span>{{ site.region[language] }}</span>
          <strong>{{ site.name[language] }}</strong>
        </button>
      </nav>
    </Transition>
    <Transition name="atlas-menu">
      <button
        v-if="!detail"
        type="button"
        class="atlas-overview no-rem"
        @click="showOverview ? focusSite(activeSite) : overview()"
      >
        {{
          showOverview
            ? copy('回到当前地点', 'Return to location')
            : copy('全图', 'Overview')
        }}
      </button>
    </Transition>
  </section>
</template>

<style scoped lang="less" src="./atlas.less" />
