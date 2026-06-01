<template>
  <div class="archives-page main-container">
    <PageHeader
      header-label="[MENTOR_NV42]"
      title-en="ARCHIEVE"
      title-cn="作品集"
      :meta-item="'TOTAL — ' + (works.length + miscWorks.length) + ' PROJECTS'"
      primary-color="#3B69F4"
    />

    <!-- ══════════════════════════════════════
         01 代表作品
    ══════════════════════════════════════ -->
    <section class="works-section">
      <h2 class="section-title" data-section="01">
        {{ $t('archieve.title01') }}
      </h2>
      <div class="works-grid">
        <div
          v-for="(work, index) in works"
          :key="index"
          class="work-card"
          data-magnetic
          @click="openDetail(work)"
        >
          <div class="work-base">
            <img :src="work.img" :alt="work.title" />
            <div class="work-hud-overlay" />
            <div class="scanlines" />
          </div>
          <div class="work-red-plate" />
          <div class="work-content">
            <div class="work-top-info">
              <div class="company-row">
                <div class="company-logo">
                  <img :src="work.logo" :alt="work.company" />
                </div>
                <div class="company-details">
                  <p class="work-subtitle">{{ work.company }}</p>
                  <p class="ref-num">REF. 0{{ index + 1 }}A</p>
                </div>
              </div>
              <div class="work-tags">
                <span v-for="tag in work.tags" :key="tag" class="tech-label">{{
                  tag
                }}</span>
              </div>
            </div>
            <div class="work-title-row">
              <h3 :class="'work-name ' + (locale === 'zhCn' && 'cn-font')">
                {{ work.title }}
              </h3>
              <div class="project-ref-id">
                <div>ID. {{ work.id }}</div>
                <div class="time">{{ work.time }}</div>
              </div>
            </div>
          </div>
          <div class="corner corner-tl" />
          <div class="corner corner-tr" />
          <div class="corner corner-bl" />
          <div class="corner corner-br" />
          <div class="tactical-text">[MENTOR_NV42]</div>
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════
         02 其他项目
    ══════════════════════════════════════ -->
    <section class="misc-section">
      <h2 class="section-title" data-section="02">
        {{ $t('archieve.title02') }}
      </h2>
      <div class="misc-grid">
        <div
          v-for="(item, index) in miscWorks"
          :key="index"
          class="misc-card"
          :style="{ backgroundImage: item.logo ? `url(${item.logo})` : 'none' }"
        >
          <div class="misc-card-content">
            <div>
              <div class="misc-card-index">
                {{ String(index + 1).padStart(2, '0') }}
              </div>
              <h4 class="misc-card-title">{{ item.title }}</h4>
            </div>
            <div>
              <div class="misc-card-company">{{ item.company }}</div>
              <div class="misc-card-id">{{ item.id }}</div>
            </div>
          </div>
          <div class="corner corner-tl" />
          <div class="corner corner-tr" />
          <div class="corner corner-bl" />
          <div class="corner corner-br" />
        </div>
      </div>
    </section>

    <!-- ══════════════════════════════════════
         项目详情弹窗
    ══════════════════════════════════════ -->
    <WorkDetailModal
      :work="selectedWork"
      :visible="!!selectedWork"
      @close="selectedWork = null"
    />
  </div>
</template>

<script setup lang="ts">
/* eslint-disable simple-import-sort/imports */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import WorkDetailModal from './WorkDetailModal.vue'
import PageHeader from '@/components/PageHeader/index.vue'

const { locale, tm } = useI18n()

// ── 类型定义 ───────────────────────────────────
interface WorkItem {
  id: string
  title: string
  tags: string[]
  img: string
  company: string
  logo: string
  time?: string
  description?: string
  images?: string[]
  link?: string
}

interface MiscWork {
  id: string
  title: string
  company: string
  logo?: string
  description?: string
  images?: string[]
  link?: string
  tags?: string[]
}

// ── 代表作品（来自 i18n） ──────────────────────
const works = computed<WorkItem[]>(
  () => tm('archieve.dynamic.WebArchieves') as WorkItem[]
)

// ── 其他项目（示例数据，替换成你的真实数据） ──
const miscWorks = ref<MiscWork[]>([
  { id: 'M001', title: '内部管理系统 v2', company: '国家电网' },
  { id: 'M002', title: '数据可视化大屏', company: '国家电网' },
  { id: 'M003', title: '移动端巡检 App', company: '国家电网' },
  { id: 'M004', title: 'Chrome 插件工具集', company: 'Personal' },
])

// ── 弹窗状态 ───────────────────────────────────
const selectedWork = ref<WorkItem | MiscWork | null>(null)
const openDetail = (work: WorkItem | MiscWork) => {
  selectedWork.value = work
}
</script>

<style lang="less" scoped>
/* ── 变量 ─────────────────────────────────────── */
@red: #e23456;
@red-dim: rgba(226, 52, 86, 0.15);
@border: rgba(255, 255, 255, 0.08);
@text-dim: rgba(255, 255, 255, 0.4);
@card-bg: rgba(13, 9, 18, 0.8);

/* ── 页面容器 ─────────────────────────────────── */
.archives-page {
  width: 100%;
  color: #fff;
}

/* ── 通用区块标题 ─────────────────────────────── */
.section-title {
  font-family: 'anton', 'source-han-sans-simplified-c';
  font-size: 1.2rem;
  font-weight: 900;
  color: @red;
  border-bottom: 1px solid var(--opacity-color2);
  padding-bottom: 20px;
  margin-bottom: 20px;

  .section-cn {
    font-family: 'source-han-sans-simplified-c';
    font-size: 0.9rem;
    opacity: 0.6;
    margin-left: 10px;
  }

  &::before {
    content: attr(data-section);
    display: inline-block;
    background: @red;
    color: #000;
    padding: 2px 12px;
    margin-right: 8px;
    font-size: 1.1rem;
    line-height: 1.2;
    clip-path: polygon(0% 50%, 15% 0%, 85% 0%, 100% 50%, 85% 100%, 15% 100%);
  }
}

/* ── 四角装饰（通用） ─────────────────────────── */
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

/* ══════════════════════════════════════
   01 代表作品 Grid
══════════════════════════════════════ */
.works-section {
  padding: 60px 0 40px;
  padding-top: 30px;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.work-card {
  position: relative;
  min-height: 350px;
  border: 1px solid @border;
  display: flex;
  overflow: hidden;
  cursor: pointer;
  background: @card-bg;
  transition: transform 0.4s ease, border-color 0.4s ease;

  .work-base {
    position: absolute;
    inset: 0;
    overflow: hidden;
    z-index: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: brightness(0.6) saturate(0.7);
      transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    .work-hud-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to right,
        rgba(10, 5, 10, 0.5),
        rgba(10, 5, 10, 0.9)
      );
      z-index: 1;
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
      z-index: 2;
      opacity: 0.6;
    }
  }

  .work-red-plate {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      transparent 0%,
      rgba(226, 52, 86, 0.7) 100%
    );
    transform: scaleY(0);
    transform-origin: bottom;
    transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    z-index: 1;
  }

  .work-content {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: calc(100% - 60px);
    height: calc(100% - 60px);
    padding: 30px;
    z-index: 2;
  }

  .work-top-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
  }

  .company-row {
    display: flex;
    gap: 15px;
    align-items: center;

    .company-logo {
      width: 50px;
      height: 50px;
      border: 1px solid @border;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.3);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: brightness(0.8);
      }
    }

    .company-details {
      .work-subtitle {
        font-family: 'Unbounded Sans', monospace;
        font-size: 0.65rem;
        color: var(--opacity-color);
        letter-spacing: 0.5px;
        line-height: 1.4;
      }
      .ref-num {
        font-family: 'Unbounded Sans', monospace;
        font-size: 0.55rem;
        color: rgba(255, 255, 255, 0.4);
        margin-top: 2px;
      }
    }
  }

  .work-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;

    .tech-label {
      font-family: 'Unbounded Sans', monospace;
      font-size: 0.55rem;
      border: 1px solid @border;
      padding: 4px 10px;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.6);
      transition: all 0.3s ease;

      &:hover {
        background: @red;
        color: white;
        border-color: @red;
      }
    }
  }

  .work-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: auto;
    width: 100%;
  }

  .work-name {
    font-family: 'anton', sans-serif;
    font-size: 2rem;
    line-height: 1.1;
    color: var(--text-color);
    width: 80%;
    margin-right: 15px;
  }

  .project-ref-id div {
    font-family: 'Anton', monospace;
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.3);
    text-align: right;

    &.time {
      background-color: rgba(255, 255, 255, 0.3);
      color: rgb(40, 40, 40);
    }
  }

  .tactical-text {
    position: absolute;
    top: 5px;
    right: 30px;
    font-family: 'Unbounded Sans', monospace;
    font-size: 0.5rem;
    color: rgba(255, 255, 255, 0.1);
    z-index: 3;
    pointer-events: none;
  }

  &:hover {
    border-color: @red;
    transform: translateY(-5px);

    .work-base img {
      transform: scale(1.05);
      filter: brightness(0.7) saturate(0.9);
    }
    .work-red-plate {
      transform: scaleY(1);
    }
    .work-content * {
      color: white;
    }
    .company-logo {
      border-color: rgba(255, 255, 255, 0.4);
    }
    .corner {
      border-color: @red;
      border-width: 2px;
      width: 15px;
      height: 15px;
    }
    .tactical-text {
      color: rgba(255, 255, 255, 0.4);
    }
  }
}

/* ══════════════════════════════════════
   02 其他项目 Grid
══════════════════════════════════════ */
.misc-section {
  padding: 40px 0;
}

.misc-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.misc-card {
  position: relative;
  min-height: 100px;
  border: 1px solid @border;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  background-attachment: fixed;
  transition: transform 0.4s ease, border-color 0.4s ease,
    background-color 0.4s ease;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 0;
  }

  .misc-card-content {
    width: calc(100% - 36px);
    height: calc(100% - 36px);
    position: relative;
    display: flex;
    align-items: end;
    justify-content: space-between;
    padding: 18px;
    z-index: 2;
  }

  .misc-card-index {
    font-family: 'Unbounded Sans', monospace;
    font-size: 0.5rem;
    color: rgba(255, 255, 255, 0.3);
    letter-spacing: 1.5px;
    transition: color 0.3s ease;
    margin-bottom: 4px;
  }

  .misc-card-title {
    font-family: 'anton', 'source-han-sans-simplified-c';
    font-size: 0.75rem;
    line-height: 1.2;
    color: rgba(255, 255, 255, 0.95);
    letter-spacing: 0.3px;
    margin-bottom: 3px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .misc-card-company {
    font-family: 'Unbounded Sans', monospace;
    font-size: 0.48rem;
    color: @text-dim;
    letter-spacing: 0.3px;
    margin-bottom: 2px;
    text-transform: uppercase;
  }

  .misc-card-id {
    font-family: 'Unbounded Sans', monospace;
    font-size: 0.43rem;
    color: rgba(255, 255, 255, 0.15);
    letter-spacing: 0.8px;
  }

  .corner {
    position: absolute;
    width: 8px;
    height: 8px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    z-index: 3;
    pointer-events: none;
    transition: all 0.4s ease;

    &-tl {
      top: 8px;
      left: 8px;
      border-right: 0;
      border-bottom: 0;
    }
    &-tr {
      top: 8px;
      right: 8px;
      border-left: 0;
      border-bottom: 0;
    }
    &-bl {
      bottom: 8px;
      left: 8px;
      border-right: 0;
      border-top: 0;
    }
    &-br {
      bottom: 8px;
      right: 8px;
      border-left: 0;
      border-top: 0;
    }
  }

  &:hover {
    border-color: @red;
    transform: translateY(-2px);

    &::before {
      background: rgba(0, 0, 0, 0.7);
    }

    .misc-card-index {
      color: @red;
    }

    .misc-card-title {
      color: white;
    }

    .corner {
      border-color: @red;
      border-width: 1.2px;
      width: 10px;
      height: 10px;
    }
  }
}

/* ── 响应式 ───────────────────────────────────── */
@media (max-width: 768px) {

  .page-title {
    flex-direction: column;
    gap: 4px;
    font-size: 1.8rem;

    .title-en {
      font-size: 2.5rem;
      word-break: break-word;
    }

    .title-cn {
      font-size: 0.35em !important;
      padding: 3px 20px !important;
      display: block !important;
      margin-left: 0 !important;
      right: -3rem !important;
      bottom: -0.5rem !important;
    }
  }

  .works-grid {
    grid-template-columns: 1fr;
  }

  .work-card {
    min-height: 280px;
  }

  .misc-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .misc-card {
    min-height: 120px;
  }
}
</style>
