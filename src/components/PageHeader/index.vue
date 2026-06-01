<template>
  <header
    class="page-header"
    :style="{
      '--primary-color': primaryColor,
      '--title-cn-right': titleCnRight,
    }"
  >
    <div class="header-bg-text">{{ titleEn }}</div>
    <div class="header-content">
      <div class="header-label">{{ headerLabel }}</div>
      <div class="page-title-wrapper">
        <h1 class="page-title">
          <span class="title-en">{{ titleEn }}</span>
          <span class="title-cn">{{ titleCn }}</span>
        </h1>
      </div>
      <div class="header-meta">
        <span class="meta-item">{{ metaItem }}</span>
        <div class="header-scan-line" />
      </div>
    </div>
    <!-- HUD 装饰 -->
    <div class="corner corner-tl" />
    <div class="corner corner-tr" />
    <div class="corner corner-bl" />
    <div class="corner corner-br" />
  </header>
</template>

<script setup lang="ts">
defineProps({
  headerLabel: {
    type: String,
    required: true,
  },
  titleEn: {
    type: String,
    required: true,
  },
  titleCn: {
    type: String,
    required: true,
  },
  metaItem: {
    type: String,
    required: true,
  },
  primaryColor: {
    type: String,
    default: '#3B69F4',
  },
  titleCnRight: {
    type: String,
    default: '-3rem',
  },
})
</script>

<style lang="less" scoped>
/* ── 变量 ─────────────────────────────────────── */
@border: rgba(255, 255, 255, 0.08);
@text-dim: rgba(255, 255, 255, 0.4);

/* ══════════════════════════════════════
   页面大标题
══════════════════════════════════════ */
.page-header {
  position: relative;
  padding: 40px 0 30px;
  overflow: hidden;
  border-bottom: 1px solid @border;
  padding-left: 30px;

  // 背景大字水印
  .header-bg-text {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    font-family: 'anton', sans-serif;
    font-size: 8vw;
    line-height: 1;
    color: var(--primary-color);
    opacity: 0.06;
    pointer-events: none;
    letter-spacing: -4px;
    white-space: nowrap;
  }

  .header-content {
    position: relative;
    z-index: 1;
  }

  .header-label {
    font-family: 'Unbounded Sans', monospace;
    font-size: 0.4rem;
    color: var(--primary-color);
  }

  .page-title {
    font-family: 'anton', sans-serif;
    font-size: 2.5rem;
    line-height: 1;
    letter-spacing: -1px;
    margin-top: -10px;
    display: flex;
    align-items: baseline;
    gap: 0;
    position: relative;
    z-index: 1;

    .title-en {
      font-family: 'Unbounded Sans', monospace;
      color: #fff;
      position: relative;
      z-index: 3;
    }

    .title-cn {
      font-family: 'source-han-sans-simplified-c', sans-serif;
      font-weight: 700;
      font-size: 0.3em;
      color: #fff;
      letter-spacing: 1px;
      position: absolute;
      bottom: -0.41rem;
      right: var(--title-cn-right);
      z-index: 3;
      background: var(--primary-color);
      padding: 5px 20px;
      padding-bottom: 8px;
      clip-path: polygon(0% 50%, 12% 0%, 88% 0%, 100% 50%, 88% 100%, 12% 100%);
    }
  }

  .page-title-wrapper {
    position: relative;
    display: inline-block;
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-top: 10px;
    padding-bottom: 6px;

    .meta-item {
      font-family: 'Unbounded Sans', monospace;
      font-size: 0.4rem;
      letter-spacing: 1px;
      color: @text-dim;
    }
  }

  .header-scan-line {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 60%;
    height: 1px;
    background: linear-gradient(to right, var(--primary-color), transparent);
  }
}

/* ── 四角装饰 ─────────────────────────── */
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

/* ── 响应式 ───────────────────────────────── */
@media (max-width: 768px) {
  .page-header {
    padding: 20px 40px;
  }

  .page-title {
    flex-direction: column;
    gap: 4px;
    font-size: 1.8rem;

    .title-en {
      font-size: 1.8rem;
      word-break: break-word;
    }

    .title-cn {
      position: static;
      font-size: 0.35em;
      padding: 3px 16px;
      background: var(--primary-color);
      display: inline-block;
      margin-top: 4px;
      width: fit-content;
    }
  }

  .header-label {
    font-size: 0.5rem;
  }
}
</style>
