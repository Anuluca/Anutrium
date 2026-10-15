<script setup lang="ts">
import {
  computed,
  type ComputedRef,
  inject,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { useNow, useResizeObserver } from '@vueuse/core'

import {
  FLORA_CHARACTER_WIDTH_RATIO,
  FLORA_LAYOUT_BOTTOM_GAP,
  FLORA_LAYOUT_GAP,
  FLORA_MOBILE_CHARACTER_HEIGHT_RATIO,
} from '@/config/floraLayout'
import { pageThemeColors } from '@/config/pageThemes'
import { pets } from '@/locales/dynamic/pets'
import { useFloraPets } from '@/stores/floraPets'
import { useLayoutBorders } from '@/stores/layoutBorders'
import {
  createScanlineCharacters,
  createScanlineMask,
} from '@/utils/scanlineMask'

import { useFooterViewportOffset } from '../composables/useFooterViewportOffset'
import FloraAlbumGallery from './FloraAlbumGallery.vue'

const albumGallery = ref<InstanceType<typeof FloraAlbumGallery> | null>(null)
const albumExpanded = ref(false)
const albumLayerActive = ref(false)
let albumLayerTimer: ReturnType<typeof setTimeout> | undefined
watch(albumExpanded, (expanded) => {
  clearTimeout(albumLayerTimer)
  if (expanded) albumLayerActive.value = true
  else if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    albumLayerActive.value = false
  else
    albumLayerTimer = setTimeout(() => {
      albumLayerActive.value = false
    }, 850)
})
onBeforeUnmount(() => clearTimeout(albumLayerTimer))
defineExpose({
  closeExpandedAlbum: () => albumGallery.value?.closeExpanded() ?? false,
})

defineProps<{ mobile: boolean }>()
const emit = defineEmits<{ (event: 'select-pet', id: string): void }>()
const floraPets = useFloraPets()
const { t, locale } = useI18n({
  useScope: 'local',
  messages: {
    zhCn: {
      female: '女性',
      male: '男性',
      ball: '精灵球',
      loadError: '模型加载失败，请重新点击精灵球重试。',
      levelRule: '等级 = 当前年月 − 出生年月（月数）',
      album: '{name}的相册',
    },
    en: {
      female: 'Female',
      male: 'Male',
      ball: 'Poké Ball',
      loadError: 'Model could not load. Select the Poké Ball again to retry.',
      levelRule: 'Level = months since birth',
      album: "{name}'s Album",
    },
  },
})
const activePet = computed(() => floraPets.activePet)
const now = useNow({ interval: 60000 })
const monthFormatter = new Intl.DateTimeFormat('en', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: 'numeric',
})
const petLevel = computed(() => {
  const parts = monthFormatter.formatToParts(now.value)
  const year = Number(parts.find((part) => part.type === 'year')!.value)
  const month = Number(parts.find((part) => part.type === 'month')!.value)
  const birth = activePet.value.birthMonth
  // 仅按年月相减，出生当月为 0；不假定未知的出生日。
  const months = Math.max(0, (year - birth.year) * 12 + month - birth.month)
  return String(months).padStart(2, '0')
})
const activeBallIndex = computed(() => pets.indexOf(activePet.value) + 1)
const petLocale = computed(() => (locale.value === 'en' ? 'en' : 'zhCn'))
const albumTitle = computed(() =>
  t('album', { name: activePet.value.name[petLocale.value] })
)
const petNumber = computed(() =>
  String(activePet.value.number).padStart(3, '0')
)
const selectPet = (index: number) => {
  const pet = pets[index - 1]
  if (pet) emit('select-pet', pet.id)
}

const numberPrefix = '№ '
const numberCharacters = computed(() =>
  createScanlineCharacters(`${numberPrefix}${petNumber.value}`, {
    seed: 'flora-number',
  })
)
const symbolMasks = Array.from({ length: 6 }, (_, index) =>
  createScanlineMask({ seed: `flora-symbol:${index}` })
)
const railFooterMask = createScanlineMask({
  seed: 'flora-rail-footer',
  lines: 10,
  solidFrom: 1,
  irregularity: 0.65,
})

const headerBottom = inject<ComputedRef<number>>(
  'site-header-bottom',
  computed(() => 0)
)
const numberBar = ref<HTMLElement | null>(null)
const symbolBar = ref<HTMLElement | null>(null)
const numberBarHeight = ref(0)
const symbolsBottom = ref(0)
useResizeObserver([numberBar, symbolBar], () => {
  numberBarHeight.value = numberBar.value?.getBoundingClientRect().height ?? 0
  if (symbolBar.value && numberBar.value?.parentElement)
    symbolsBottom.value =
      symbolBar.value.getBoundingClientRect().bottom -
      numberBar.value.parentElement.getBoundingClientRect().top
})
const footerOffset = useFooterViewportOffset()
const layoutBorders = useLayoutBorders()
</script>

<template>
  <div
    class="flora-focus-layout no-rem"
    :class="{
      'is-border-hidden': !layoutBorders.visible,
      'flora-focus-layout--mobile': mobile,
      'is-album-expanded': albumExpanded,
      'is-album-layer-active': albumLayerActive,
    }"
    :style="{
      '--flora-theme-color': activePet.themeColor,
      '--flora-ball-color': activePet.ballColor ?? activePet.themeColor,
      '--flora-header-bottom': `${headerBottom}px`,
      '--flora-footer-offset': `${footerOffset}px`,
      '--flora-block-gap': `${FLORA_LAYOUT_GAP}px`,
      '--flora-bottom-gap': `${FLORA_LAYOUT_BOTTOM_GAP}px`,
      gridTemplateRows: mobile
        ? `minmax(0, ${FLORA_MOBILE_CHARACTER_HEIGHT_RATIO}fr) minmax(0, ${
            1 - FLORA_MOBILE_CHARACTER_HEIGHT_RATIO
          }fr)`
        : undefined,
      gridTemplateColumns: mobile
        ? 'minmax(0, 1fr)'
        : `minmax(0, calc(${
            FLORA_CHARACTER_WIDTH_RATIO * 100
          }vw - 2 * var(--flora-inline-inset))) minmax(0, 1fr)`,
    }"
    role="group"
    aria-label="花花小窝"
  >
    <section
      class="flora-focus-layout__character"
      :style="{
        '--flora-number-bar-height': `${numberBarHeight}px`,
        '--flora-symbols-bottom': `${symbolsBottom}px`,
      }"
      :aria-label="`${activePet.name[petLocale]}模型区`"
      :aria-busy="!!floraPets.loadingPetId"
    >
      <div
        class="flora-character-rail"
        :style="{
          '--rail-footer-mask': railFooterMask.replace('to bottom', 'to top'),
        }"
      >
        <component
          :is="index <= pets.length ? 'button' : 'span'"
          v-for="index in 6"
          :key="index"
          class="flora-character-rail__slot"
          :class="{ 'is-clickable': index <= pets.length }"
          :type="index <= pets.length ? 'button' : undefined"
          :aria-label="
            index <= pets.length
              ? `${t('ball')} ${index}：${pets[index - 1].name[petLocale]}`
              : undefined
          "
          :aria-pressed="
            index <= pets.length ? index === activeBallIndex : undefined
          "
          :aria-hidden="index > pets.length ? true : undefined"
          :style="{
            top: `calc(${
              ((index - 0.5) / 6) * 100
            }% + var(--rail-slot-inset) * ${1 - (index - 0.5) / 3})`,
          }"
          :data-pet-id="pets[index - 1]?.id"
          @click.stop="selectPet(index)"
        >
          <svg
            class="flora-character-rail__ball"
            :class="{
              'flora-character-rail__ball--solid': index <= pets.length,
              'flora-character-rail__ball--active': index === activeBallIndex,
            }"
            aria-hidden="true"
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
          >
            <template v-if="index <= pets.length">
              <defs>
                <mask :id="`flora-solid-ball-${index}`">
                  <rect width="32" height="32" fill="white" stroke="none" />
                  <path d="M0 16h32" stroke="black" />
                  <circle cx="16" cy="16" r="6" fill="black" stroke="none" />
                  <circle cx="16" cy="16" r="2.5" fill="white" stroke="none" />
                </mask>
              </defs>
              <circle
                cx="16"
                cy="16"
                r="16"
                fill="currentColor"
                stroke="none"
                :mask="`url(#flora-solid-ball-${index})`"
              />
            </template>
            <template v-else>
              <path d="M0 16h10m12 0h10" />
              <circle cx="16" cy="16" r="6" />
            </template>
          </svg>
        </component>
      </div>
      <header ref="numberBar" class="flora-number-bar">
        <span
          :key="activePet.id"
          class="flora-number-bar__number"
          :aria-label="`编号 ${petNumber}`"
        >
          <span
            v-for="(item, index) in numberCharacters"
            :key="index"
            class="flora-number-bar__character-slot"
            :class="{ 'is-typing-digit': index >= numberPrefix.length }"
            :style="{
              '--flora-type-delay': `${
                240 + Math.max(0, index - numberPrefix.length) * 320
              }ms`,
            }"
            aria-hidden="true"
          >
            <span
              class="flora-number-bar__character"
              :style="{ '--flora-scan-mask': item.maskImage }"
              >{{ item.character }}</span
            >
          </span>
        </span>
        <div
          ref="symbolBar"
          class="flora-number-bar__symbols"
          aria-hidden="true"
        >
          <svg
            class="flora-number-bar__symbol--outline"
            viewBox="0 0 24 24"
            :style="{ '--flora-scan-mask': symbolMasks[0] }"
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
          <svg
            class="flora-number-bar__symbol--outline"
            viewBox="0 0 24 24"
            :style="{ '--flora-scan-mask': symbolMasks[1] }"
          >
            <rect x="2" y="2" width="20" height="20" />
          </svg>
          <svg
            class="flora-number-bar__symbol--outline"
            viewBox="0 0 24 24"
            :style="{ '--flora-scan-mask': symbolMasks[2] }"
          >
            <path d="M12 2 23 22H1Z" />
          </svg>
          <svg
            class="flora-number-bar__symbol--outline"
            viewBox="0 0 24 24"
            :style="{ '--flora-scan-mask': symbolMasks[4] }"
          >
            <path
              d="M12 2 15.09 9.27H22l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27h6.91Z"
            />
          </svg>
          <svg
            class="flora-number-bar__symbol--outline"
            viewBox="0 0 24 24"
            :style="{ '--flora-scan-mask': symbolMasks[5] }"
          >
            <path d="M12 2 22 12 12 22 2 12Z" />
          </svg>
          <svg
            viewBox="0 0 24 24"
            :style="{ '--flora-scan-mask': symbolMasks[3] }"
          >
            <path
              d="M12 22 2.6 12.6C-3.3 6.7 5.7-2.3 12 4c6.3-6.3 15.3 2.7 9.4 8.6Z"
            />
          </svg>
        </div>
      </header>
      <div
        class="flora-identity-bar"
        :class="{ 'is-latin': petLocale === 'en' }"
      >
        <div class="flora-identity-bar__name">
          <svg
            class="flora-identity-bar__ball"
            viewBox="0 0 32 32"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <circle cx="16" cy="16" r="13" />
            <path d="M3 16h8m10 0h8" />
            <circle cx="16" cy="16" r="5" />
            <circle cx="16" cy="16" r="2" fill="currentColor" stroke="none" />
          </svg>
          <div class="flora-identity-bar__text">
            <span class="flora-identity-bar__pet-name">{{
              activePet.name[petLocale]
            }}</span>
            <span class="flora-identity-bar__slash" aria-hidden="true" />
            <span class="flora-identity-bar__type">{{
              activePet.type[petLocale]
            }}</span>
          </div>
        </div>
        <span
          class="flora-identity-bar__gender"
          :style="{
            color:
              pageThemeColors[
                activePet.gender === 'male' ? 'ARCHIVE' : 'ISLAND'
              ],
          }"
          role="img"
          :aria-label="t(activePet.gender)"
          >{{ activePet.gender === 'female' ? '♀' : '♂' }}</span
        >
      </div>
    </section>
    <section class="flora-focus-layout__content" aria-label="宠物内容模块区">
      <ElPopover
        :key="activePet.id"
        placement="right"
        trigger="hover"
        :width="320"
        :show-after="0"
        :hide-after="100"
        :show-arrow="false"
      >
        {{ t('levelRule') }}
        <template #reference>
          <button
            :key="`${activePet.id}:${petLevel}`"
            type="button"
            class="flora-pet-level"
            :aria-label="`Lv. ${petLevel}`"
            @click.stop
          >
            <span aria-hidden="true">Lv.&nbsp;</span>
            <span
              v-for="(digit, index) in petLevel"
              :key="index"
              class="flora-number-bar__character-slot is-typing-digit"
              :style="{ '--flora-type-delay': `${240 + index * 320}ms` }"
              aria-hidden="true"
              ><span class="flora-number-bar__character">{{
                digit
              }}</span></span
            >
          </button>
        </template>
      </ElPopover>
      <FloraAlbumGallery
        ref="albumGallery"
        :pet-id="activePet.id"
        :title="albumTitle"
        :mobile="mobile"
        @expanded-change="albumExpanded = $event"
      />
      <p v-if="floraPets.error" class="flora-pet-error" role="alert">
        {{ t('loadError') }}
      </p>
    </section>
  </div>
</template>

<style scoped lang="less">
.flora-focus-layout.no-rem {
  --flora-inline-inset: var(--temple-content-inset, 24px);

  position: absolute;
  top: calc(var(--flora-header-bottom) + var(--flora-block-gap));
  right: var(--flora-inline-inset);
  bottom: calc(var(--flora-footer-offset) + var(--flora-bottom-gap));
  left: var(--flora-inline-inset);
  // 边框位于三维画布上方，避免地面遮挡；点击仍穿透到场景。
  z-index: 2;
  display: grid;
  gap: var(--flora-block-gap);
  pointer-events: none;

  > section {
    min-width: 0;
    box-sizing: border-box;
    border: 1px solid var(--border-color-strong, rgba(255, 255, 255, 0.22));
  }

  &.is-border-hidden > section {
    // 仅隐藏边框颜色，保留盒模型，避免编号栏与分区在切换时移动。
    border-color: transparent;
  }

  .flora-focus-layout__character {
    position: relative;
    container-type: inline-size;
  }

  .flora-focus-layout__content {
    --flora-content-inset: 24px;

    position: relative;
    container-type: inline-size;
    padding: var(--flora-content-inset);
  }

  .flora-pet-level {
    display: inline-flex;
    align-items: flex-start;
    padding: 0;
    border: 0;
    margin: 0;
    background: transparent;
    pointer-events: auto;
    cursor: help;
    color: var(--flora-theme-color);
    font-family: 'UnboundedSans', sans-serif;
    font-size: clamp(36px, 8cqw, 88px);
    font-weight: 400;
    line-height: 1;
    animation: flora-number-enter 600ms ease-out both;

    span {
      font-family: inherit;
      font-weight: inherit;
    }
    -webkit-mask-image: repeating-linear-gradient(
      to bottom,
      #000 0 3px,
      transparent 3px 4px
    );
    mask-image: repeating-linear-gradient(
      to bottom,
      #000 0 3px,
      transparent 3px 4px
    );
  }

  .flora-pet-error {
    margin: 16px;
    font-size: 14px;
    line-height: 1.5;
  }

  .flora-character-rail {
    --rail-opacity: 0.2;
    --rail-ball-opacity: 0.6;
    --rail-width: 48px;
    --rail-slot-inset: 0px;
    --rail-footer-height: 42px;
    --rail-hole-radius: min(16px, 7cqh);

    position: absolute;
    top: var(--flora-number-bar-height);
    height: calc((100% - 2 * clamp(6px, 4cqw, 24px)) / 3);
    left: 4px;
    width: var(--rail-width);
    container-type: size;
    color: #808080;
    pointer-events: auto;

    &:hover {
      --rail-opacity: 0.4;
      --rail-ball-opacity: 0.8;
    }
    // 实色槽位由宠物列表决定，余下的四个位置镂空。
    --rail-mask: radial-gradient(
        circle at 50% calc(41.666667% + var(--rail-slot-inset) / 6),
        transparent var(--rail-hole-radius),
        #000 calc(var(--rail-hole-radius) + 0.5px)
      ),
      radial-gradient(
        circle at 50% calc(58.333333% - var(--rail-slot-inset) / 6),
        transparent var(--rail-hole-radius),
        #000 calc(var(--rail-hole-radius) + 0.5px)
      ),
      radial-gradient(
        circle at 50% calc(75% - var(--rail-slot-inset) / 2),
        transparent var(--rail-hole-radius),
        #000 calc(var(--rail-hole-radius) + 0.5px)
      ),
      radial-gradient(
        circle at 50% calc(91.666667% - var(--rail-slot-inset) * 5 / 6),
        transparent var(--rail-hole-radius),
        #000 calc(var(--rail-hole-radius) + 0.5px)
      );
    // 仅镂空底板，孔内的分隔线与圆环保留，组成透明精灵球图案。
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: currentColor;
      opacity: var(--rail-opacity);
      -webkit-mask-image: var(--rail-mask);
      mask-image: var(--rail-mask);
      -webkit-mask-composite: source-in;
      mask-composite: intersect;
    }

    &::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 0;
      width: 100%;
      height: var(--rail-footer-height);
      background: currentColor;
      opacity: var(--rail-opacity);
      -webkit-mask-image: var(--rail-footer-mask);
      mask-image: var(--rail-footer-mask);
    }
  }

  .flora-character-rail__slot {
    position: absolute;
    left: 50%;
    width: min(32px, 14cqh);
    height: min(32px, 14cqh);
    transform: translate(-50%, -50%);
    padding: 0;
    border: 0;
    background: none;
    color: inherit;

    &.is-clickable {
      cursor: pointer;
      transition: transform 200ms ease;

      &:hover {
        transform: translate(-50%, -50%) scale(1.15);
      }

      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }

      &:hover .flora-character-rail__ball {
        animation: flora-ball-spin 700ms ease-in-out;

        &.flora-character-rail__ball--active {
          animation: flora-ball-spin 700ms ease-in-out,
            flora-ball-blink 1800ms ease-in-out infinite;
        }
      }

      &:focus-visible {
        outline: 2px solid #e23456;
        outline-offset: 3px;
      }
    }
  }

  .flora-character-rail::before,
  .flora-character-rail::after,
  .flora-character-rail__ball {
    transition: opacity 200ms ease;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .flora-character-rail__slot.is-clickable:hover .flora-character-rail__ball,
    .flora-character-rail__slot.is-clickable:hover
      .flora-character-rail__ball.flora-character-rail__ball--active,
    .flora-character-rail__ball--active {
      animation: none !important;
    }
  }

  .flora-character-rail__ball {
    display: block;
    width: 100%;
    height: 100%;
    transform-origin: center;
    opacity: var(--rail-opacity);

    &.flora-character-rail__ball--solid {
      color: #555;
      opacity: var(--rail-ball-opacity);
    }

    &.flora-character-rail__ball--active {
      color: var(--flora-ball-color);
      animation: flora-ball-spin 10s linear infinite,
        flora-ball-blink 1800ms ease-in-out infinite;
    }
  }

  .flora-identity-bar {
    position: absolute;
    right: clamp(6px, 4cqw, 24px);
    bottom: clamp(6px, 4cqw, 24px);
    left: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-family: 'UnboundedSans', sans-serif;
    font-size: clamp(28px, 11.25cqw, 80px);
    font-weight: 400;
    line-height: 1.15;
    transform: translateY(4px);

    svg {
      width: 1em;
      height: 1em;
      flex: none;
    }
  }

  .flora-identity-bar__name {
    display: flex;
    align-items: center;
    gap: 0.3em;
    min-width: 0;
    flex: 1;
    font-family: inherit;
    font-weight: inherit;
  }

  .flora-identity-bar__text {
    display: flex;
    align-items: center;
    min-width: 0;
    font-family: inherit;
    font-weight: inherit;

    > span {
      font-family: 'UnboundedSans', sans-serif !important;
      font-weight: 400 !important;
    }
  }

  .flora-identity-bar.is-latin .flora-identity-bar__text {
    font-size: 0.62em;
  }

  .flora-identity-bar__pet-name {
    flex: none;
    clip-path: polygon(0 0, 100% 0, calc(100% - 0.24em) 100%, 0 100%);
    -webkit-mask-image: linear-gradient(
      to right,
      #000 calc(100% - 0.14em),
      transparent
    );
    mask-image: linear-gradient(
      to right,
      #000 calc(100% - 0.14em),
      transparent
    );
  }

  .flora-identity-bar__slash {
    flex: none;
    width: 0.035em;
    height: 1.1em;
    margin-left: -0.12em;
    margin-right: 0;
    background: currentColor;
    transform: skewX(-18deg);
  }

  .flora-identity-bar__type {
    opacity: 0.8;
    color: color-mix(in srgb, var(--text-color) 55%, #808080);
    flex: none;
    white-space: nowrap;
    font-size: 0.5em;
    line-height: 1.4;
    margin-left: -0.1em;
    transform: translateY(0.5em);
    clip-path: polygon(0.07em 0, 100% 0, 100% 100%, 0 100%);
    -webkit-mask-image: linear-gradient(to right, transparent, #000 0.6em);
    mask-image: linear-gradient(to right, transparent, #000 0.6em);
  }

  .flora-identity-bar__ball {
    color: var(--flora-ball-color);
    transition: color 350ms ease;
    opacity: 0.5;
  }

  .flora-identity-bar__gender {
    flex: none;
    opacity: 0.6;
    font-family: 'UnboundedSans', sans-serif;
    font-weight: 900;
    line-height: 1;
    transform: translateY(4px);
  }

  &.flora-focus-layout--mobile {
    --flora-inline-inset: calc(var(--temple-mobile-content-inset) * 5 / 6);
    z-index: 3;
    row-gap: calc(var(--flora-block-gap) * 3);

    .flora-focus-layout__character::after {
      position: absolute;
      right: 0;
      bottom: calc(var(--flora-block-gap) * -1.5);
      left: 0;
      height: 1px;
      background: rgba(255, 255, 255, 0.1);
      content: '';
      pointer-events: none;
    }

    .flora-focus-layout__content {
      --flora-content-inset: 0px;
      padding: 0;
      // 收起与展开共用定位边界，宽高过渡期间不切换包含块。
      position: static;
      container-type: normal;
    }

    .flora-character-rail {
      --rail-slot-inset: 8px;
      --rail-footer-height: 43.75cqw;
      --rail-hole-radius: min(12px, calc((400cqw - 16px) / 14));

      top: calc(var(--flora-symbols-bottom) + 8px);
      right: 0;
      left: auto;
      width: auto;
      height: calc(
        clamp(96px, calc(100% - var(--flora-symbols-bottom) - 76px), 144px) *
          1.3
      );
      aspect-ratio: 1 / 5.2;
    }

    .flora-character-rail__slot {
      width: min(24px, calc((400cqw - 16px) / 7));
      height: min(24px, calc((400cqw - 16px) / 7));
    }

    .flora-focus-layout__character,
    .flora-pet-level {
      opacity: 1;
      transition: opacity 250ms ease, visibility 0s;
    }

    &.is-album-expanded {
      .flora-focus-layout__character,
      .flora-pet-level {
        opacity: 0;
        visibility: hidden;
        transition: opacity 250ms ease, visibility 0s 250ms;
      }

      .flora-pet-level {
        // 移除入场动画的填充状态，避免其 opacity: 1 覆盖展开时的渐隐。
        animation: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      &.is-album-expanded {
        .flora-focus-layout__character,
        .flora-pet-level {
          transition: none;
        }
      }

      .flora-focus-layout__character,
      .flora-pet-level {
        transition: none;
      }
    }

    .flora-identity-bar {
      right: 0;
      bottom: 0;
      left: 0;
      font-size: clamp(28px, 10cqw, 45px);
    }

    .flora-identity-bar__name {
      transform: translateX(-0.15em);
    }

    .flora-number-bar {
      padding: 0;
    }

    .flora-number-bar__number {
      font-size: 45px;
    }

    .flora-number-bar__symbols svg {
      width: 22px;
      height: 22px;
    }
  }

  .flora-number-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    padding: clamp(6px, 4cqw, 24px);
    padding-left: 0;
  }

  .flora-number-bar__number {
    --flora-number-fade-mask: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.7),
      rgba(0, 0, 0, 0.1)
    );

    box-sizing: border-box;
    height: 1em;
    padding: 0;
    // 变换不增加布局占位，补足拉伸高度，避免换行后的符号与编号重叠。
    margin-bottom: 0.5em;
    font-family: 'Anton', 'Arial', sans-serif;
    font-size: clamp(37.5px, 26.25cqw, 120px);
    font-weight: 400;
    line-height: 1;
    white-space: nowrap;
    // 父层统一渐隐编号，字符自身仍保留独立扫描线遮罩。
    -webkit-mask-image: var(--flora-number-fade-mask);
    mask-image: var(--flora-number-fade-mask);
    transform: scaleY(1.5);
    transform-origin: center top;
    animation: flora-number-enter 600ms ease-out both;
  }

  .flora-number-bar__symbols {
    display: flex;
    align-items: center;
    gap: clamp(1px, 1cqw, 5px);
    color: var(--flora-theme-color);
    margin-left: auto;

    svg {
      display: block;
      width: clamp(16px, 10cqw, 48px);
      height: clamp(16px, 10cqw, 48px);
      flex: none;
      fill: currentColor;

      &.flora-number-bar__symbol--outline {
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
      }
    }
  }

  .flora-number-bar__character-slot {
    position: relative;
    display: inline-block;
    vertical-align: top;
    white-space: pre;

    &.is-typing-digit {
      // 预留完整字符宽度；每位独立出现并在 240ms 内快速闪烁两次。
      .flora-number-bar__character {
        animation: flora-digit-reveal 1ms linear var(--flora-type-delay) both,
          flora-digit-flash 240ms steps(1, end) var(--flora-type-delay) both;
      }
    }
  }

  .flora-number-bar__character {
    display: inline-block;
    white-space: pre;
  }

  .flora-number-bar__character,
  .flora-number-bar__symbols svg {
    -webkit-mask-image: var(--flora-scan-mask);
    mask-image: var(--flora-scan-mask);
  }

  .flora-number-bar__symbols svg.flora-number-bar__symbol--outline {
    --flora-icon-fade-mask: linear-gradient(to right, #000, transparent);

    // 两层遮罩取交集，使镂空图标独立渐隐并保留原来的扫描线。
    -webkit-mask-image: var(--flora-scan-mask), var(--flora-icon-fade-mask);
    mask-image: var(--flora-scan-mask), var(--flora-icon-fade-mask);
    -webkit-mask-composite: source-in;
    mask-composite: intersect;
  }

  @media (prefers-reduced-motion: reduce) {
    .flora-number-bar__number,
    .flora-pet-level,
    .flora-number-bar__character-slot.is-typing-digit
      .flora-number-bar__character {
      animation: none;
    }
  }
}

@keyframes flora-ball-blink {
  0%,
  100% {
    opacity: var(--rail-ball-opacity);
  }
  50% {
    opacity: calc(var(--rail-ball-opacity) * 0.45);
  }
}

@keyframes flora-ball-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes flora-number-enter {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes flora-digit-reveal {
  from {
    visibility: hidden;
  }
  to {
    visibility: visible;
  }
}

@keyframes flora-digit-flash {
  0%,
  40%,
  80%,
  100% {
    opacity: 1;
  }
  20%,
  60% {
    opacity: 0;
  }
}
</style>
