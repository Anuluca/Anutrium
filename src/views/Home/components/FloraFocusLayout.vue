<script setup lang="ts">
import { computed, type ComputedRef, inject, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNow, useResizeObserver } from '@vueuse/core'

import {
  FLORA_CHARACTER_WIDTH_RATIO,
  FLORA_LAYOUT_BOTTOM_GAP,
  FLORA_LAYOUT_GAP,
  FLORA_MOBILE_CHARACTER_HEIGHT_RATIO,
  FLORA_MOBILE_CONTENT_RISE,
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
import FloraLikeButton from './FloraLikeButton.vue'
import FloraMediaLayout from './FloraMediaLayout.vue'
import FloraMovesPanel from './FloraMovesPanel.vue'
import FloraPetMemo from './FloraPetMemo.vue'
import FloraStatsChart from './FloraStatsChart.vue'

const mediaLayout = ref<InstanceType<typeof FloraMediaLayout> | null>(null)
const mobileLevelTarget = ref<HTMLElement | null>(null)
const decorationTarget = ref<HTMLElement | null>(null)
provide('flora-decoration-target', decorationTarget)
const albumExpanded = ref(false)
defineExpose({
  albumExpanded,
  closeExpandedAlbum: () => mediaLayout.value?.closeExpanded() ?? false,
})

const props = defineProps<{ mobile: boolean }>()
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
      album: '相册',
      floraAlbum: '花花相册',
      video: '视频',
    },
    en: {
      female: 'Female',
      male: 'Male',
      ball: 'Poké Ball',
      loadError: 'Model could not load. Select the Poké Ball again to retry.',
      levelRule: 'Level = months since birth',
      album: 'Album',
      floraAlbum: 'Flora Album',
      video: 'Videos',
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
  t(activePet.value.id === 'huahua' ? 'floraAlbum' : 'album')
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
    lines: props.mobile ? 32 : 16,
  })
)
const symbolMasks = computed(() =>
  Array.from({ length: 6 }, (_, index) =>
    createScanlineMask({
      seed: `flora-symbol:${index}`,
      lines: props.mobile ? 32 : 16,
    })
  )
)
const railFooterMask = computed(() =>
  createScanlineMask({
    seed: 'flora-rail-footer',
    lines: props.mobile ? 20 : 10,
    solidFrom: 1,
    irregularity: 0.65,
  })
)

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
    }"
    :style="{
      '--flora-theme-color': activePet.themeColor,
      '--flora-ball-color': activePet.ballColor ?? activePet.themeColor,
      '--flora-header-bottom': `${headerBottom}px`,
      '--flora-footer-offset': `${footerOffset}px`,
      '--flora-block-gap': `${FLORA_LAYOUT_GAP}px`,
      '--flora-bottom-gap': `${FLORA_LAYOUT_BOTTOM_GAP}px`,
      '--flora-mobile-content-rise': `${FLORA_MOBILE_CONTENT_RISE}px`,
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
          v-for="index in mobile ? 2 : 6"
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
            top: mobile
              ? `${22 + (index - 1) * 42}px`
              : `calc(${
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
          <span
            v-if="!mobile && index <= pets.length"
            class="flora-character-rail__name"
            aria-hidden="true"
          >
            {{ pets[index - 1].name[petLocale] }}
          </span>
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
        <div ref="symbolBar" class="flora-number-bar__symbols">
          <svg
            aria-hidden="true"
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
          <FloraLikeButton
            :key="activePet.id"
            :pet-id="activePet.id === 'xiaohei' ? 'xiaohei' : 'huahua'"
            :name="activePet.name[petLocale]"
            :scan-mask="symbolMasks[3]"
          />
        </div>
      </header>
      <div
        class="flora-identity-bar"
        :class="{ 'is-latin': petLocale === 'en' }"
      >
        <div :key="activePet.id" class="flora-identity-bar__details">
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
        <span
          v-if="mobile"
          ref="mobileLevelTarget"
          class="flora-identity-bar__level"
        />
      </div>
    </section>
    <section
      ref="decorationTarget"
      class="flora-focus-layout__content"
      aria-label="宠物内容模块区"
    >
      <FloraMediaLayout
        ref="mediaLayout"
        :pet-id="activePet.id"
        :mobile="mobile"
        :album-title="albumTitle"
        :video-title="t('video')"
        @expanded-change="albumExpanded = $event"
      >
        <template #profile>
          <div class="flora-pet-overview">
            <div class="flora-pet-profile">
              <div class="flora-pet-profile__header">
                <div class="flora-pet-profile__identity">
                  <Teleport
                    :to="mobileLevelTarget || 'body'"
                    :disabled="!mobile || !mobileLevelTarget"
                  >
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
                          <svg
                            class="flora-pet-level__plate"
                            width="100%"
                            height="100%"
                            aria-hidden="true"
                          >
                            <defs>
                              <pattern
                                :id="`flora-level-background-${activePet.id}`"
                                width="4"
                                :height="mobile ? 2 : 4"
                                patternUnits="userSpaceOnUse"
                              >
                                <rect
                                  :y="mobile ? 0.5 : 1"
                                  width="4"
                                  :height="mobile ? 1.5 : 3"
                                  fill="white"
                                />
                              </pattern>
                              <pattern
                                :id="`flora-level-text-${activePet.id}`"
                                width="4"
                                :height="mobile ? 2 : 4"
                                patternUnits="userSpaceOnUse"
                              >
                                <rect
                                  width="4"
                                  :height="mobile ? 0.5 : 1"
                                  fill="white"
                                  opacity="0.4"
                                />
                              </pattern>
                              <mask
                                :id="`flora-level-cutout-${activePet.id}`"
                                x="0"
                                y="0"
                                width="100%"
                                height="100%"
                              >
                                <rect
                                  width="100%"
                                  height="100%"
                                  :fill="`url(#flora-level-background-${activePet.id})`"
                                />
                                <text
                                  v-for="layer in mobile
                                    ? []
                                    : ['cutout', 'scanline']"
                                  :key="layer"
                                  :x="mobile ? '100%' : '0'"
                                  :text-anchor="mobile ? 'end' : 'start'"
                                  y="50%"
                                  dominant-baseline="central"
                                  :fill="
                                    layer === 'cutout'
                                      ? 'black'
                                      : `url(#flora-level-text-${activePet.id})`
                                  "
                                >
                                  <tspan>Lv.&#160;</tspan>
                                  <tspan
                                    v-for="(digit, index) in petLevel"
                                    :key="index"
                                    class="flora-pet-level__digit"
                                    :style="{
                                      '--flora-type-delay': `${
                                        240 + index * 320
                                      }ms`,
                                    }"
                                  >
                                    {{ digit }}
                                  </tspan>
                                </text>
                              </mask>
                            </defs>
                            <rect
                              width="100%"
                              height="100%"
                              fill="currentColor"
                              :opacity="mobile ? 0.45 : 1"
                              :mask="`url(#flora-level-cutout-${activePet.id})`"
                            />
                            <text
                              v-if="mobile"
                              x="100%"
                              y="50%"
                              text-anchor="end"
                              dominant-baseline="central"
                              fill="#000"
                            >
                              <tspan>Lv.&#160;</tspan>
                              <tspan
                                v-for="(digit, index) in petLevel"
                                :key="index"
                                class="flora-pet-level__digit"
                                :style="{
                                  '--flora-type-delay': `${
                                    240 + index * 320
                                  }ms`,
                                }"
                              >
                                {{ digit }}
                              </tspan>
                            </text>
                          </svg>
                          <span class="flora-pet-level__size" aria-hidden="true"
                            >Lv.&#160;{{ petLevel }}</span
                          >
                        </button>
                      </template>
                    </ElPopover>
                  </Teleport>
                  <FloraPetMemo :pet="activePet" />
                </div>
                <FloraStatsChart
                  class="flora-pet-stats"
                  :stats="activePet.stats"
                  :nature="activePet.nature"
                  :name="activePet.name[petLocale]"
                />
              </div>
              <div class="flora-pet-profile__moves">
                <FloraMovesPanel
                  :key="activePet.id"
                  :pet-id="activePet.id"
                  :mobile="mobile"
                />
              </div>
            </div>
          </div>
        </template>
      </FloraMediaLayout>
      <p v-if="floraPets.error" class="flora-pet-error" role="alert">
        {{ t('loadError') }}
      </p>
    </section>
  </div>
</template>

<style scoped lang="less">
@import '../styles/floraFocusLayout.less';
</style>
