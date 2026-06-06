<template>
  <ModalWrapper v-model="dialogVisible" width="1480px" @close="handleClose">
    <div class="modal-crystal-logo">
      <CrystalLogo />
    </div>

    <div class="modal-body">
      <aside v-if="work" class="modal-aside">
        <div class="aside-company">
          <div v-if="work.logo" class="aside-logo">
            <img
              :src="work.logo"
              :alt="work.company"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div class="aside-company-info">
            <p class="aside-company-name">{{ work.company }}</p>
            <p class="aside-id">{{ work.id }}</p>
          </div>
        </div>

        <div class="aside-divider" />

        <h2 class="aside-title">{{ work.title }}</h2>

        <div v-if="work.time" class="aside-field">
          <span class="field-label">TIME</span>
          <span class="field-val">{{ work.time }}</span>
        </div>

        <div v-if="participationText" class="aside-field">
          <span class="field-label">{{
            t('workDetailModal.participation')
          }}</span>
          <span class="field-val">{{ participationText }}</span>
        </div>

        <div v-if="work.tags?.length" class="aside-field aside-tags">
          <span class="field-label">STACK</span>
          <div class="tags-wrap">
            <span v-for="tag in work.tags" :key="tag" class="tag">{{
              tag
            }}</span>
          </div>
        </div>

        <div v-if="work.description" class="aside-desc">
          <span class="field-label">ABOUT</span>
          <p>{{ work.description }}</p>
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
              <span class="link-text">{{ link.label }}</span>
              <span class="link-arrow">→</span>
            </a>
          </div>
        </div>
      </aside>

      <div v-if="work" class="modal-gallery">
        <div
          v-if="work.images && work.images.length"
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
                />

                <div class="slide-gradient-overlay" />

                <div
                  v-if="work.imageDescriptions && work.imageDescriptions[i]"
                  class="slide-description"
                >
                  {{ work.imageDescriptions[i] }}
                </div>
                <div class="slide-scanlines" />
              </div>
            </div>
          </div>

          <button
            v-if="work.images.length > 1"
            class="gallery-btn gallery-btn--prev"
            :disabled="imgIndex === 0"
            @click="imgIndex = Math.max(0, imgIndex - 1)"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M11 4L6 9L11 14"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
          <button
            v-if="work.images.length > 1"
            class="gallery-btn gallery-btn--next"
            :disabled="imgIndex === work.images.length - 1"
            @click="imgIndex = Math.min(work.images.length - 1, imgIndex + 1)"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M7 4L12 9L7 14"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
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
            <span class="counter-cur">{{
              String(imgIndex + 1).padStart(2, '0')
            }}</span>
            <span class="counter-sep">/</span>
            <span class="counter-total">{{
              String(work.images.length).padStart(2, '0')
            }}</span>
          </div>
        </div>

        <div v-else class="gallery-empty">
          <span>NO MEDIA AVAILABLE</span>
        </div>

        <ElImageViewer
          v-if="showImageViewer && work.images"
          :url-list="work.images"
          :initial-index="currentImageIndex"
          teleported
          @close="closeImageViewer"
        />

        <div v-if="work.details && work.details.length" class="details-section">
          <div class="details-header">
            <span class="details-label">DETAILS</span>
            <div class="details-line" />
          </div>
          <ul class="details-list">
            <li
              v-for="(detail, idx) in work.details"
              :key="idx"
              class="detail-item"
            >
              <span class="detail-index">{{
                String(idx + 1).padStart(2, '0')
              }}</span>
              <span class="detail-text">{{ detail }}</span>
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
import { ElIcon, ElImageViewer } from 'element-plus'
import { useI18n } from 'vue-i18n'
import {
  Link as LinkIcon,
  Monitor,
  Promotion,
  VideoPlay,
} from '@element-plus/icons-vue'
import ModalWrapper from '@/components/ModalWrapper/index.vue'
import CrystalLogo from '@/components/CrystalLogo/index.vue'

interface WorkItem {
  id: string
  title: string
  tags?: string[]
  img?: string
  company: string
  logo?: string
  time?: string
  description?: string
  details?: string[]
  images?: string[]
  imageDescriptions?: string[]
  link?: string
  links?: Array<{ label: string; url: string; icon?: string }>
  participation?: number
}

const props = defineProps<{
  work: WorkItem | null
  visible: boolean
}>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

const dialogVisible = ref(false)

const imgIndex = ref(0)
const showImageViewer = ref(false)
const currentImageIndex = ref(0)

const participationText = computed(() => {
  const value = props.work?.participation
  return typeof value === 'number' ? `${value}%` : ''
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

<style lang="less" scoped>
@red: #e23456;
@border: rgba(255, 255, 255, 0.08);

.modal-crystal-logo {
  position: absolute;
  bottom: 20px;
  left: 30px;
  user-select: auto;
  z-index: 5;
}

.modal-body {
  display: grid;
  grid-template-columns: 320px 1fr;
  flex: 1;
  overflow: hidden;
  position: relative;
  z-index: 1;
}

.modal-aside {
  padding: 40px 24px;
  border-right: 1px solid @border;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 16px;
  > *:last-child {
    margin-bottom: 50px;
  }

  &::-webkit-scrollbar {
    width: 2px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(226, 52, 86, 0.3);
  }
}

.aside-company {
  display: flex;
  align-items: center;
  gap: 12px;
}

.aside-logo {
  width: 40px;
  height: 40px;
  border: 1px solid @border;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(0.8);
  }
}

.aside-company-name {
  font-family: 'Unbounded Sans', monospace;
  font-size: 0.62rem;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.5px;
}

.aside-id {
  font-family: 'Unbounded Sans', monospace;
  font-size: 0.5rem;
  color: rgba(255, 255, 255, 0.25);
  margin-top: 2px;
  letter-spacing: 1px;
}

.aside-divider {
  height: 1px;
  background: @border;
}

.aside-title {
  font-family: 'anton', 'source-han-sans-simplified-c';
  font-size: 1.4rem;
  font-weight: 900;
  line-height: 1.2;
  color: #fff;
  letter-spacing: 0.5px;
}

.aside-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-family: 'Unbounded Sans', monospace;
  font-size: 0.5rem;
  letter-spacing: 2px;
  color: @red;
  opacity: 0.8;
}

.field-val {
  font-family: 'Unbounded Sans', monospace;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 1px;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  font-family: 'Unbounded Sans', monospace;
  font-size: 0.52rem;
  border: 1px solid @border;
  padding: 3px 8px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.aside-desc {
  display: flex;
  flex-direction: column;
  gap: 8px;

  p {
    font-family: 'source-han-sans-simplified-c', monospace;
    font-size: 0.75rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.7;
  }
}

.aside-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.links-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid @border;
  background: rgba(226, 52, 86, 0.04);
  text-decoration: none;
  transition: all 0.25s;

  &:hover {
    background: rgba(226, 52, 86, 0.12);
    border-color: rgba(226, 52, 86, 0.4);
    transform: translateX(3px);
  }

  .link-icon {
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  .link-text {
    font-family: 'source-han-sans-simplified-c';
    font-weight: 800 !important;
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.65);
    letter-spacing: 1px;
    flex: 1;
  }

  .link-arrow {
    font-size: 0.8rem;
    color: @red;
    opacity: 0;
    transition: all 0.25s;
    transform: translateX(-5px);
  }

  &:hover .link-arrow {
    opacity: 1;
    transform: translateX(0);
  }
}

.modal-gallery {
  position: relative;
  overflow-y: auto;
  background: #050208;
  display: flex;
  flex-direction: column;

  &::-webkit-scrollbar {
    width: 2px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(226, 52, 86, 0.3);
  }
}

.gallery-carousel {
  width: 100%;
  flex-shrink: 0;
  position: relative;
}

.gallery-track-wrap {
  width: 100%;
  height: 500px;
  overflow: hidden;
}

.gallery-track {
  display: flex;
  height: 100%;
  transition: transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
}

.gallery-slide {
  flex-shrink: 0;
  width: 100%;
  height: 100%;
  position: relative;
  cursor: pointer;
  transition: filter 0.3s ease;

  &:hover {
    img {
      filter: brightness(1) saturate(0.85);
    }
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    filter: brightness(0.85) saturate(0.75);
    transition: filter 0.3s ease;
  }

  .slide-gradient-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.7) 0%,
      rgba(0, 0, 0, 0.3) 40%,
      transparent 100%
    );
    pointer-events: none;
  }

  .slide-description {
    position: absolute;
    bottom: 20px;
    left: 20px;
    right: 60px;
    font-family: 'STSong';
    font-weight: 700;
    font-size: 0.5rem;
    color: rgba(255, 255, 255, 0.85);
    letter-spacing: 0.5px;
    line-height: 1.5;
    pointer-events: none;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  }

  .slide-scanlines {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.025) 1px,
      transparent 1px
    );
    background-size: 100% 4px;
    pointer-events: none;
    opacity: 0.5;
  }
}

.gallery-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 36px;
  height: 36px;
  background: rgba(10, 6, 14, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: all 0.2s;

  &--prev {
    left: 14px;
  }
  &--next {
    right: 14px;
  }

  &:hover:not(:disabled) {
    background: @red;
    border-color: @red;
  }

  &:disabled {
    opacity: 0.2;
    cursor: not-allowed;
  }
}

.gallery-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 3px;
  height: 3px;
  z-index: 5;
}

.progress-bar {
  flex: 1;
  height: 100%;
  background: rgba(255, 255, 255, 0.12);
  cursor: pointer;
  transition: background 0.3s;

  &.active {
    background: @red;
  }
  &:hover:not(.active) {
    background: rgba(255, 255, 255, 0.3);
  }
}

.gallery-counter {
  position: absolute;
  top: 14px;
  right: 60px;
  display: flex;
  align-items: baseline;
  gap: 2px;
  z-index: 5;

  .counter-cur {
    font-family: 'anton', monospace;
    font-size: 0.85rem;
    color: @red;
    letter-spacing: 1px;
  }
  .counter-sep,
  .counter-total {
    font-family: 'anton', monospace;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.25);
  }
}

.gallery-empty {
  font-family: 'Unbounded Sans', monospace;
  font-size: 0.6rem;
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.15);
  height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.details-section {
  padding: 30px 40px;
  border-top: 1px solid @border;
}

.details-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.details-label {
  font-family: 'Unbounded Sans', monospace;
  font-size: 0.5rem;
  letter-spacing: 3px;
  color: @red;
  opacity: 0.8;
}

.details-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, rgba(226, 52, 86, 0.3), transparent);
}

.details-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  gap: 14px;
  align-items: baseline;
}

.detail-index {
  font-family: 'anton', monospace;
  font-size: 0.7rem;
  color: @red;
  min-width: 20px;
  opacity: 0.7;
}

.detail-text {
  font-family: 'source-han-sans-simplified-c', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.7;
  flex: 1;
}

@media (max-width: 768px) {
  .modal-body {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    overflow-y: auto;
  }

  .modal-aside {
    border-right: none;
    border-bottom: 1px solid @border;
    padding: 30px 20px;
    max-height: 45vh;
  }

  .modal-gallery {
    min-height: 240px;
  }

  .gallery-track-wrap {
    height: 300px;
  }

  .details-section {
    padding: 20px;
  }
}
</style>
