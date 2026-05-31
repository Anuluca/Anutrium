<template>
  <div class="archives-page main-container">
    <section class="works-section">
      <h2 class="section-title" data-section="01">{{ $t('archieve.title01') }}</h2>
      <div class="works-grid">
        <div
          v-for="(work, index) in works"
          :key="index"
          class="work-card"
          data-magnetic
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
          <div class="tactical-text">[Mentor_XT]</div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale, tm } = useI18n()

// ── 作品集数据 ──────────────────────────────
interface WorkItem {
  id: string
  title: string
  tags: string[]
  img: string
  company: string
  logo: string
}

const works = computed<WorkItem[]>(() => {
  return tm('archieve.dynamic.WebArchieves') as WorkItem[]
})
</script>

<style lang="less" scoped>
.archives-page {
  width: 100%;
  padding-left: 8vw;
  padding-right: 8vw;
}

.section-title {
  font-family: 'anton', 'source-han-sans-simplified-c';
  font-size: 1.2rem;
  font-weight: 900;
  color: #e23456;
  border-bottom: 1px solid var(--opacity-color2);
  padding-bottom: 20px;
  margin-bottom: 20px;

  &::before {
    content: attr(data-section);
    display: inline-block;
    position: relative;
    background: #e23456;
    color: #000;
    padding: 2px 12px;
    margin-right: 8px;
    font-size: 1.1rem;
    line-height: 1.2;
    clip-path: polygon(
      0% 50%,
      15% 0%,
      85% 0%,
      100% 50%,
      85% 100%,
      15% 100%
    );
  }
}

/* ─── ✨ Heavy Re-design Works ✨ ──────────────────── */
.works-section {
  padding: 60px 0;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  width: 100%;
}

.work-card {
  position: relative;
  min-height: 350px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  overflow: hidden;
  cursor: pointer;
  background: rgba(13, 9, 18, 0.8);
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
      display: block;
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

  /* 红色切入背景板（保留原始 scaleY 动画） */
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
      border: 1px solid rgba(255, 255, 255, 0.1);
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
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 4px 10px;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.6);
      transition: all 0.3s ease;

      &:hover {
        background: #e23456;
        color: white;
        border-color: #e23456;
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
    &.time{
      background-color: rgba(255, 255, 255, 0.3);
      color: rgb(40, 40, 40);
    }
  }

  /* 投影/HUD 风格的四个直角装饰 */
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
    border-color: #e23456;
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

    .tech-label {
      border-color: rgba(255, 255, 255, 0.4);
      color: rgba(255, 255, 255, 0.8);
    }

    .company-logo {
      border-color: rgba(255, 255, 255, 0.4);
    }

    .corner {
      border-color: #e23456;
      border-width: 2px;
      width: 15px;
      height: 15px;
    }

    .ref-num,
    .project-ref-id {
      color: rgba(255, 255, 255, 0.6);
    }

    .tactical-text {
      color: rgba(255, 255, 255, 0.4);
    }
  }
}
</style>

<style lang="less">
@media screen and (max-aspect-ratio: @ratio-threshold) {
  &.archives-page {
    padding-left: 4vw !important;
    padding-right: 4vw !important;

    .works-grid {
      grid-template-columns: 1fr !important;
      gap: 15px;
    }

    .work-card {
      min-height: 280px;

      .work-name {
        font-size: 1.8rem;
      }

      .work-tags {
        justify-content: flex-start;
      }

      .company-row .company-logo {
        width: 32px;
        height: 32px;
      }
    }
  }
}
</style>
