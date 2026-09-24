<template>
  <ModalWrapper
    v-model="dialogVisible"
    width="1480px"
    :theme-color="themeColor"
    :title="t('workDetailModal.title')"
    flush-desktop
    @close="handleClose"
  >
    <div v-if="work?.crystal" class="modal-crystal-logo">
      <CrystalLogo
        :image="work.crystal.image"
        :links="work.crystal.links"
        :text="work.crystal.text"
      />
    </div>

    <div class="modal-body" data-lenis-nested-scroll>
      <aside v-if="work" class="modal-aside">
        <div class="aside-fixed">
          <div class="aside-company no-rem">
            <div v-if="work.logo" class="aside-logo">
              <img
                :src="work.logo"
                :alt="work.company"
                loading="lazy"
                decoding="async"
                width="160"
                height="160"
              />
            </div>
            <div class="aside-company-info">
              <p
                class="aside-company-name"
                :class="{ 'aside-company-name--english': locale === 'en' }"
              >
                <TypedText
                  :text="work.company"
                  :delay="480"
                  :speed="24"
                  :start="dialogVisible"
                  loop-overflow
                />
              </p>
            </div>
            <ShareButton
              class="project-share-button"
              :target-id="work.id"
              :target-title="work.title"
              target-type="project"
              :text="work.description || work.title"
              :title="work.title"
              :url="projectShareUrl"
              :show-arrow="false"
              show-icon
              :show-label="false"
              icon-only
              :style="{
                '--share-button-icon-color': '#71CB7D',
                '--share-button-icon-hover-color': '#E23456',
              }"
            />
          </div>

          <div class="aside-divider" />

          <h2 class="aside-title">
            <TypedText
              :text="work.title"
              :delay="520"
              :speed="30"
              :start="dialogVisible"
            />
          </h2>
        </div>

        <div class="aside-content" data-lenis-nested-scroll>
          <div v-if="work.time" class="aside-field">
            <span class="field-label">TIME</span>
            <span class="field-val">
              <TypedText
                :text="work.time"
                :delay="620"
                :speed="26"
                :start="dialogVisible"
              />
            </span>
          </div>

          <div v-if="participationText" class="aside-field">
            <span class="field-label">{{
              t('workDetailModal.participation')
            }}</span>
            <span class="field-val">
              <TypedText
                :text="participationText"
                :delay="680"
                :speed="34"
                :start="dialogVisible"
              />
            </span>
          </div>

          <div v-if="work.tags?.length" class="aside-field aside-tags">
            <span class="field-label">STACK</span>
            <div class="tags-wrap">
              <span v-for="(tag, index) in work.tags" :key="tag" class="tag">
                <TypedText
                  :text="tag"
                  :delay="720 + index * 55"
                  :speed="28"
                  :start="dialogVisible"
                />
              </span>
            </div>
          </div>

          <div v-if="work.description" class="aside-desc">
            <span class="field-label">ABOUT</span>
            <p>
              <TypedText
                :text="work.description"
                :delay="780"
                :speed="14"
                :start="dialogVisible"
              />
            </p>
          </div>

          <div v-if="work.confidential" class="confidential-notice">
            <ElIcon class="confidential-lock" aria-hidden="true">
              <Lock />
            </ElIcon>
            <strong>
              <TypedText
                :text="t('workDetailModal.confidential')"
                :delay="840"
                :speed="22"
                :start="dialogVisible"
              />
            </strong>
            <p>
              <TypedText
                :text="t('workDetailModal.confidentialDescription')"
                :delay="920"
                :speed="14"
                :start="dialogVisible"
              />
            </p>
          </div>

          <div v-if="work.links?.length" class="aside-links">
            <span class="field-label">LINKS</span>
            <div class="links-list">
              <a
                v-for="(link, idx) in work.links"
                :key="idx"
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="link-item"
              >
                <ElIcon class="link-icon" aria-hidden="true">
                  <component :is="getLinkIcon(link.icon)" />
                </ElIcon>
                <span class="link-text">
                  <TypedText
                    :text="link.label"
                    :delay="900 + idx * 90"
                    :speed="24"
                    :start="dialogVisible"
                  />
                </span>
                <span class="link-arrow">→</span>
              </a>
            </div>
          </div>
        </div>
      </aside>

      <div v-if="work" class="modal-gallery">
        <div
          v-if="work.images && work.images.length"
          :key="`${work.id}-${animationRun}`"
          class="gallery-carousel"
          @touchstart="onTouchStart"
          @touchend="onTouchEnd"
        >
          <div class="gallery-track-wrap">
            <div
              class="gallery-track"
              :style="{ transform: `translateX(-${imgIndex * 100}%)` }"
            >
              <div
                v-for="(img, i) in work.images"
                :key="i"
                class="gallery-slide"
                @click="openImageViewer(i)"
              >
                <img
                  :src="img"
                  :alt="`${work.title} ${i + 1}`"
                  :loading="i === 0 ? 'eager' : 'lazy'"
                  decoding="async"
                  width="768"
                  height="576"
                />

                <div class="slide-gradient-overlay" />

                <div
                  v-if="work.imageDescriptions && work.imageDescriptions[i]"
                  class="slide-description"
                >
                  <TypedText
                    :text="work.imageDescriptions[i]"
                    :delay="720"
                    :speed="18"
                    :start="dialogVisible"
                  />
                </div>
                <div class="slide-scanlines" />
              </div>
            </div>
          </div>

          <button
            v-if="work.images.length > 1"
            class="gallery-btn gallery-btn--prev"
            :disabled="imgIndex === 0"
            aria-label="上一张图片"
            @click="imgIndex = Math.max(0, imgIndex - 1)"
          >
            <span class="gallery-btn__triangle" aria-hidden="true" />
          </button>
          <button
            v-if="work.images.length > 1"
            class="gallery-btn gallery-btn--next"
            :disabled="imgIndex === work.images.length - 1"
            aria-label="下一张图片"
            @click="imgIndex = Math.min(work.images.length - 1, imgIndex + 1)"
          >
            <span class="gallery-btn__triangle" aria-hidden="true" />
          </button>

          <div v-if="work.images.length > 1" class="gallery-progress">
            <div
              v-for="(_, i) in work.images"
              :key="i"
              class="progress-bar"
              :class="{ active: i === imgIndex }"
              @click="imgIndex = i"
            />
          </div>

          <div class="gallery-counter">
            <span class="counter-cur">
              <TypedText
                :text="String(imgIndex + 1)"
                :delay="680"
                :speed="36"
                :start="dialogVisible"
              />
            </span>
            <span class="counter-sep">/</span>
            <span class="counter-total">
              <TypedText
                :text="String(work.images.length)"
                :delay="720"
                :speed="36"
                :start="dialogVisible"
              />
            </span>
          </div>
        </div>

        <div v-else class="gallery-empty">
          <TypedText
            text="NO MEDIA AVAILABLE"
            :delay="680"
            :speed="28"
            :start="dialogVisible"
          />
        </div>

        <SafeImageViewer
          v-if="showImageViewer && work.images"
          :url-list="work.images"
          :initial-index="currentImageIndex"
          @close="closeImageViewer"
        />

        <div v-if="work.details && work.details.length" class="details-section">
          <div class="details-header">
            <span class="details-label">DETAILS</span>
            <div class="details-line" />
          </div>
          <ul class="details-list" data-lenis-nested-scroll>
            <li
              v-for="(detail, idx) in work.details"
              :key="idx"
              class="detail-item"
            >
              <span class="detail-index">
                <TypedText
                  :text="String(idx + 1)"
                  :delay="980 + idx * 140"
                  :speed="34"
                  :start="dialogVisible"
                />
              </span>
              <span class="detail-text">
                <TypedText
                  :text="detail"
                  :delay="1020 + idx * 140"
                  :speed="14"
                  :start="dialogVisible"
                />
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </ModalWrapper>
</template>

<script setup lang="ts">
/* eslint-disable simple-import-sort/imports */
import { computed, ref, watch, type Component } from 'vue'
import { ElIcon } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  Link as LinkIcon,
  Lock,
  Monitor,
  Promotion,
  VideoPlay,
} from '@element-plus/icons-vue'
import ModalWrapper from '@/components/ModalWrapper/index.vue'
import CrystalLogo from '@/components/CrystalLogo/index.vue'
import SafeImageViewer from '@/components/SafeImageViewer/index.vue'
import ShareButton from '@/components/ShareButton/index.vue'
import TypedText from '@/components/TypedText/index.vue'
import type { ArchiveWork } from '@/types/archive'

import 'element-plus/es/components/icon/style/css'

const props = defineProps<{
  work: ArchiveWork | null
  visible: boolean
  themeColor?: string
}>()
const emit = defineEmits<{ close: [] }>()
const { locale, t } = useI18n()

const dialogVisible = ref(false)
const animationRun = ref(0)

const imgIndex = ref(0)
const showImageViewer = ref(false)
const currentImageIndex = ref(0)

const participationText = computed(() => {
  const value = props.work?.participation
  return typeof value === 'number' ? `${value}%` : ''
})

const projectShareUrl = computed(() => {
  if (!props.work?.id || typeof window === 'undefined') return ''
  return `${window.location.origin}/archive?project=${encodeURIComponent(
    props.work.id
  )}`
})

const linkIconMap: Record<string, Component> = {
  Link: LinkIcon,
  Monitor,
  Promotion,
  VideoPlay,
}

const getLinkIcon = (icon?: string) => {
  if (!icon) return LinkIcon
  return linkIconMap[icon] || LinkIcon
}

watch(
  () => props.visible,
  (newVal) => {
    dialogVisible.value = newVal
    if (newVal) {
      imgIndex.value = 0
      animationRun.value += 1
    }
  },
  { immediate: true }
)

watch(dialogVisible, (newVal) => {
  if (!newVal) {
    emit('close')
  }
})

const handleClose = () => {
  dialogVisible.value = false
}

let touchX = 0
const onTouchStart = (e: TouchEvent) => {
  touchX = e.touches[0].clientX
}
const onTouchEnd = (e: TouchEvent) => {
  const dx = e.changedTouches[0].clientX - touchX
  if (!props.work?.images) return
  if (dx < -40 && imgIndex.value < props.work.images.length - 1)
    imgIndex.value++
  if (dx > 40 && imgIndex.value > 0) imgIndex.value--
}

const openImageViewer = (index: number) => {
  currentImageIndex.value = index
  showImageViewer.value = true
}

const closeImageViewer = () => {
  showImageViewer.value = false
}
</script>

<style src="./index.less" lang="less" scoped />
