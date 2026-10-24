<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useResizeObserver } from '@vueuse/core'

import {
  type HarborItem,
  useIslandHarborData,
} from '@/composables/useIslandHarborData'
import { flashActionButton } from '@/utils/flashActionButton'
import {
  getCardMobileThumbnailUrl,
  getCardThumbnailUrl,
} from '@/utils/imageVariant'

import type { IslandModelAnchors } from '../templeScene'

const props = defineProps<{
  anchors: IslandModelAnchors | null
  mobile?: boolean
}>()
const { locale } = useI18n()
const router = useRouter()
const { harborSections } = useIslandHarborData()
const groups = computed(() =>
  harborSections.map((group) => ({
    ...group,
    items: group.id === 'notes' ? [...group.items].reverse() : group.items,
  }))
)
const root = ref<HTMLElement | null>(null)
const hoveredItem = ref<{ group: string; item: string } | null>(null)
const hovered = computed(() => hoveredItem.value?.group ?? null)
const coverFilterId = `island-cover-tint-${getCurrentInstance()?.uid}`
const busy = ref(false)
const failedCovers = ref(new Set<string>())
const anchorByItem: Record<string, keyof IslandModelAnchors> = {
  LABORATORY: 'rightBraid',
  MISCELLANY: 'chest',
  'STUDY NOTES': 'rightHand',
  'GAME LIBRARY': 'leftBraid',
  COLLECTIBLES: 'leftHand',
}
const origins = ref<Record<string, { x: number; y: number }>>({})
const label = (item: { title: string; subtitle: string }) =>
  locale.value === 'en' ? item.subtitle : item.title
const measure = () => {
  if (!root.value) return
  const bounds = root.value.getBoundingClientRect()
  const next: typeof origins.value = {}
  root.value
    .querySelectorAll<HTMLElement>('.island-panels [data-flash-item]')
    .forEach((panel) => {
      const rect = panel.getBoundingClientRect()
      const group = panel.closest<HTMLElement>('[data-island-group]')!.dataset
        .islandGroup
      next[panel.dataset.flashItem!] = {
        x: (group === 'interests' ? rect.left : rect.right) - bounds.left,
        y: rect.top + rect.height / 2 - bounds.top,
      }
    })
  origins.value = next
  root.value
    .querySelectorAll<HTMLElement>('.island-panels h2')
    .forEach((title) => {
      const header = title.parentElement!
      const available =
        header.getBoundingClientRect().right -
        title.getBoundingClientRect().left -
        8
      title.style.setProperty(
        '--island-title-scale',
        String(
          Math.min(1, Math.max(0, available) / Math.max(1, title.scrollWidth))
        )
      )
    })
}
useResizeObserver(root, measure)
useResizeObserver(
  Object.keys(anchorByItem).map(
    (item) => () =>
      root.value?.querySelector<HTMLElement>(
        `.island-panels [data-flash-item="${item}"]`
      )
  ),
  measure
)

watch(root, () => nextTick(measure))
watch(locale, () => nextTick(measure))
onMounted(() => {
  void document.fonts.ready.then(measure)
})
watch(
  () => props.mobile,
  () => nextTick(measure)
)
const links = computed(() =>
  groups.value
    .flatMap((group) =>
      group.items.map((item) => ({
        id: item.subtitle,
        group: group.id,
        origin: origins.value[item.subtitle],
        anchor: props.anchors?.[anchorByItem[item.subtitle]],
      }))
    )
    .sort(
      (a, b) =>
        Number(a.id === hoveredItem.value?.item) -
        Number(b.id === hoveredItem.value?.item)
    )
)

const animations = new Set<Animation>()
let disposed = false
const openItem = async (item: HarborItem, group: string) => {
  if (busy.value) return
  busy.value = true
  const targets =
    root.value?.querySelectorAll<HTMLElement>(
      `[data-flash-header="${group}"], [data-flash-item="${item.subtitle}"], [data-link-item="${item.subtitle}"]`
    ) || []
  try {
    await Promise.all(
      Array.from(targets, (element) => {
        const animation = flashActionButton(element, 240, { colorOnly: true })
        if (!animation) return Promise.resolve()
        animations.add(animation)
        return animation.finished.finally(() => animations.delete(animation))
      })
    )
    if (!disposed) await router.push(item.path || '/404')
  } catch {
    // 离场或组件卸载会取消闪烁，不再触发滞后的导航。
  } finally {
    busy.value = false
  }
}
onBeforeUnmount(() => {
  disposed = true
  animations.forEach((animation) => animation.cancel())
})
</script>

<template>
  <div
    ref="root"
    class="island-focus no-rem"
    :class="{ 'is-mobile': mobile }"
    :style="{ '--island-cover-filter': `url(#${coverFilterId})` }"
  >
    <svg width="0" height="0" class="island-filter-defs" aria-hidden="true">
      <defs>
        <filter :id="coverFilterId" color-interpolation-filters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="linear" :slope="226 / 255" />
            <feFuncG type="linear" :slope="52 / 255" />
            <feFuncB type="linear" :slope="86 / 255" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
    <div class="island-panels" aria-hidden="true">
      <div
        class="island-reserved island-reserved--left"
        data-island-reserved="left"
      />
      <div
        class="island-reserved island-reserved--right"
        data-island-reserved="right"
      />
      <section
        v-for="group in groups"
        :key="group.id"
        class="island-window"
        :class="`island-window--${group.id}`"
        :data-island-group="group.id"
      >
        <header
          class="island-window__bar"
          :class="{ 'is-active': hovered === group.id }"
          :data-flash-header="group.id"
        >
          <span class="island-window__glyph">+</span>
          <h2 :data-title="label(group)">{{ label(group) }}</h2>
        </header>
        <div class="island-window__body">
          <figure
            v-for="item in group.items"
            :key="item.subtitle"
            class="island-item"
            :class="{ 'is-active': hoveredItem?.item === item.subtitle }"
            :data-flash-item="item.subtitle"
          >
            <span
              v-if="
                item.img.includes('placehold.co') || failedCovers.has(item.img)
              "
              class="island-placeholder"
              >{{
                item.img.includes('placehold.co') ? 'WIP' : item.subtitle
              }}</span
            >
            <picture v-else>
              <source
                media="(max-width: 768px)"
                :srcset="getCardMobileThumbnailUrl(item.img)"
              />
              <img
                :src="getCardThumbnailUrl(item.img)"
                alt=""
                loading="lazy"
                decoding="async"
                @error="failedCovers.add(item.img)"
              />
            </picture>
            <figcaption>
              <strong>{{ label(item) }}</strong
              ><span>{{ item.count }}</span>
            </figcaption>
          </figure>
        </div>
      </section>
    </div>
    <svg class="island-links" aria-hidden="true">
      <template v-for="link in links" :key="link.id">
        <g
          v-if="link.origin && link.anchor"
          :data-link-group="link.group"
          :data-link-item="link.id"
          :data-flash-group="link.id"
          :class="{ 'is-active': hoveredItem?.item === link.id }"
        >
          <line
            :x1="link.origin.x"
            :y1="link.origin.y"
            :x2="link.anchor.x"
            :y2="link.anchor.y"
          />
          <g :transform="`translate(${link.anchor.x} ${link.anchor.y})`">
            <rect
              x="-12"
              y="-12"
              width="24"
              height="24"
              class="island-anchor__square"
            />
            <path
              d="M-16 -8 V-16 H-8 M8 -16 H16 V-8 M16 8 V16 H8 M-8 16 H-16 V8"
              class="island-anchor__corners"
            />
          </g>
        </g>
      </template>
    </svg>
    <!-- 视觉层在画布之后；独立透明按钮保留键盘和点击操作，不改变模型的绘制顺序。 -->
    <nav
      class="island-targets"
      :aria-label="locale === 'en' ? 'Island modules' : '个人海湾模块'"
    >
      <section
        v-for="group in groups"
        :key="group.id"
        class="island-window"
        :class="`island-window--${group.id}`"
        :aria-label="label(group)"
      >
        <header class="island-window__bar" aria-hidden="true">
          <span>+</span><span>{{ label(group) }}</span>
        </header>
        <div class="island-window__body">
          <button
            v-for="item in group.items"
            :key="item.subtitle"
            class="island-item island-target"
            type="button"
            :aria-label="label(item)"
            :disabled="busy"
            :data-island-item="item.subtitle"
            @pointerenter="
              hoveredItem = { group: group.id, item: item.subtitle }
            "
            @pointerleave="hoveredItem = null"
            @focus="hoveredItem = { group: group.id, item: item.subtitle }"
            @blur="hoveredItem = null"
            @click.stop="openItem(item, group.id)"
          >
            <span>{{ label(item) }}</span>
          </button>
        </div>
      </section>
    </nav>
  </div>
</template>

<style scoped lang="less">
.island-focus.no-rem {
  position: absolute;
  inset: 0;
  pointer-events: none;
  --island-base: #e23456;
  --island-inverse: #1dcba9;
  --island-inline-inset: var(--temple-content-inset, 24px);
  --island-content-top: max(
    124px,
    calc(var(--layout-header-bottom, 0px) + 24px)
  );
  --island-card-gap: 16px;
  --island-title-size: 60px;
  --island-reserved-height: clamp(64px, 12svh, 120px);
  --island-title-overflow: calc(var(--island-title-size) / 2);
  .island-filter-defs {
    position: absolute;
  }
  .island-panels,
  .island-targets {
    position: absolute;
    inset: var(--island-content-top) var(--island-inline-inset)
      var(--temple-panel-bottom, 64px);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: var(--island-reserved-height) repeat(2, minmax(0, 1fr));
    gap: 16px clamp(64px, 12vw, 200px);
    pointer-events: none;
  }
  .island-panels {
    z-index: 0;
  }
  .island-targets {
    z-index: 3;
  }
  .island-reserved {
    min-width: 0;
    min-height: 0;
    &--left {
      grid-area: 1 / 1;
    }
    &--right {
      grid-area: 1 / 2;
    }
  }
  .island-window {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--island-card-gap);
    min-width: 0;
    min-height: 0;
    color: var(--island-base);
    background: transparent;
    &--ideas {
      grid-area: 2 / 1;
    }
    &--notes {
      grid-area: 3 / 1;
    }
    &--interests {
      grid-area: 2 / 2 / 4 / 3;
    }
    &__bar {
      display: flex;
      align-items: center;
      height: 28px;
      flex: 0 0 28px;
      margin-top: var(--island-title-overflow);
      padding: 0 8px;
      gap: 10px;
      border: 1px solid currentColor;
      box-sizing: border-box;
      background: transparent;
      white-space: nowrap;
      &.is-active {
        color: var(--island-inverse);
        h2::after {
          -webkit-text-fill-color: currentColor;
          -webkit-text-stroke: 0;
        }
      }
      h2 {
        position: relative;
        align-self: flex-start;
        margin: 0;
        flex: none;
        font: 400 var(--island-title-size) / 1 'UnboundedSans', sans-serif;
        transform-origin: left center;
        transform: translateY(-50%) scaleX(var(--island-title-scale, 1));
        color: inherit;
        -webkit-text-fill-color: #000;
        -webkit-text-stroke: 0;
        &::after {
          content: attr(data-title);
          position: absolute;
          inset: 0;
          color: inherit;
          -webkit-text-fill-color: transparent;
          -webkit-text-stroke: 1px currentColor;
          -webkit-mask-image: linear-gradient(to bottom, #000, transparent);
          mask-image: linear-gradient(to bottom, #000, transparent);
          pointer-events: none;
        }
      }
    }
    &__glyph {
      font: 400 20px/1 'Anton', sans-serif;
    }
    &__body {
      display: grid;
      flex: 1;
      min-height: 0;
      grid-auto-rows: minmax(0, 1fr);
      grid-template-columns: minmax(0, 1fr);
      gap: var(--island-card-gap);
      border: 0;
    }
  }
  .island-item {
    position: relative;
    min-height: 0;
    min-width: 0;
    margin: 0;
    border: 1px solid currentColor;
    box-sizing: border-box;
    overflow: hidden;
    &.is-active {
      color: var(--island-inverse);
      picture {
        opacity: 1;
      }
      img {
        filter: none;
      }
    }
    picture {
      display: block;
      height: 100%;
      opacity: 0.75;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: var(--island-cover-filter);
    }
    figcaption {
      position: absolute;
      inset: 8px 10px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-rows: auto minmax(0, 1fr);
      gap: 6px;
      pointer-events: none;
    }
    strong {
      grid-area: 2 / 1 / 3 / 3;
      min-width: 0;
      align-self: end;
      justify-self: start;
      overflow-wrap: anywhere;
      font: 900 clamp(24px, 2.1vw, 36px) / 1.3 'alibaba-puhuiti', sans-serif;
    }
    figcaption span {
      grid-area: 1 / 1 / 2 / 3;
      max-width: 100%;
      justify-self: start;
      align-self: start;
      overflow-wrap: anywhere;
      font: 400 clamp(18px, 1.6vw, 28px) / 1.2 'Anton', sans-serif;
    }
  }
  .island-window--interests .island-item figcaption span {
    justify-self: end;
    text-align: right;
  }
  .island-window--interests .island-item strong {
    grid-area: 2 / 1 / 3 / 3;
    align-self: end;
    justify-self: end;
    text-align: right;
  }
  .island-window--notes .island-window__body {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .island-targets {
    .island-window {
      pointer-events: none;
    }
    .island-window__bar {
      visibility: hidden;
    }
    .island-window__body {
      border-color: transparent;
    }
    .island-target {
      padding: 0;
      border: 1px solid transparent !important;
      background: transparent;
      color: inherit;
      cursor: pointer;
      pointer-events: auto;
      span {
        opacity: 0;
      }
      &:focus-visible {
        outline: 2px solid var(--island-inverse) !important;
        outline-offset: -3px;
      }
    }
  }
  .island-links {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
    g[data-link-group] {
      color: var(--island-base);
      &.is-active {
        color: var(--island-inverse);
      }
    }
    line,
    rect,
    path {
      fill: none;
      stroke: currentColor;
      vector-effect: non-scaling-stroke;
    }
    line {
      stroke-width: 1;
    }
    .island-anchor__square {
      stroke-width: 1;
      stroke-opacity: 0.45;
    }
    .island-anchor__corners {
      stroke-width: 2;
    }
  }
  &.is-mobile {
    --island-inline-inset: var(--temple-mobile-content-inset, 24px);
    --island-content-top: 114px;
    --island-card-gap: 12px;
    --island-title-size: 51px;
    .island-panels,
    .island-targets {
      gap: 12px clamp(40px, 12vw, 80px);
    }
    .island-window__bar {
      height: 26px;
      flex-basis: 26px;
      padding: 0 5px;
      gap: 5px;
    }
    figcaption {
      inset-inline: 5px;
    }
  }
  .island-placeholder {
    display: grid;
    height: 100%;
    place-items: center;
    font: 400 clamp(32px, 9vw, 120px) / 1 'Anton', sans-serif;
    opacity: 0.4;
  }
}
</style>
