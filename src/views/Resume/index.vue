<template>
  <div class="resume-page main-container">
    <PageHeader
      header-label="[RESUME_NODE]"
      title-en="RESUME"
      title-cn="简历"
      meta-item="DOWNLOAD CHANNEL — STANDBY"
      primary-color="#5AD480"
    />

    <section class="resume-terminal">
      <div class="resume-terminal__status">
        <span class="resume-terminal__signal" />
        RESUME_INTERFACE / READY
      </div>
      <h2>简历与下载通道</h2>
      <p>
        这个页面将用于放置我的正式简历、PDF 下载入口与更完整的职业信息。
        当前入口已接入作品集状态面板，后续可直接替换为真实简历内容。
      </p>
      <a
        class="resume-terminal__mail"
        href="mailto:tilucario@outlook.com?subject=Anutrium%20Resume"
      >
        <span>先通过邮箱联系</span>
        <span aria-hidden="true">↗</span>
      </a>
      <div class="resume-terminal__corner resume-terminal__corner--tl" />
      <div class="resume-terminal__corner resume-terminal__corner--br" />
    </section>

    <PageFooter cn-title="简历" en-title="RESUME" />
  </div>
</template>

<script setup lang="ts">
import PageFooter from '@/components/PageFooter/index.vue'
import PageHeader from '@/components/PageHeader/index.vue'
</script>

<style lang="less" scoped>
.resume-page {
  color: #fff;
}

.resume-terminal {
  position: relative;
  margin: 34px 0 80px;
  padding: 34px 38px;
  overflow: hidden;
  border: 1px solid rgba(90, 212, 128, 0.34);
  background: linear-gradient(110deg, rgba(90, 212, 128, 0.1), transparent 42%),
    repeating-linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.02) 0 1px,
      transparent 1px 30px
    ),
    rgba(9, 10, 12, 0.92);

  &::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: #5ad480;
    box-shadow: 0 0 18px rgba(90, 212, 128, 0.4);
  }

  h2 {
    margin: 12px 0 10px;
    color: #fff;
    font-family: 'anton', 'alibaba-puhuiti';
    font-size: 1.08rem;
    letter-spacing: 0.02em;
  }

  p {
    max-width: 760px;
    color: rgba(255, 255, 255, 0.54);
    font-family: 'alibaba-puhuiti', sans-serif;
    font-size: 0.54rem;
    line-height: 1.8;
  }
}

.resume-terminal__status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #5ad480;
  font-family: 'cn-custom', monospace;
  font-size: 0.4rem;
  letter-spacing: 0.16em;
}

.resume-terminal__signal {
  width: 7px;
  height: 7px;
  background: #5ad480;
  transform: rotate(45deg);
  box-shadow: 0 0 10px rgba(90, 212, 128, 0.9);
}

.resume-terminal__mail {
  width: fit-content;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 20px;
  margin-top: 24px;
  padding: 0 16px;
  border: 1px solid rgba(90, 212, 128, 0.42);
  color: #5ad480;
  background: rgba(90, 212, 128, 0.06);
  font-family: 'alibaba-puhuiti', sans-serif;
  font-size: 0.48rem;
  font-weight: 800;
  text-decoration: none;
  transition: color 0.22s ease, background 0.22s ease;

  &:hover,
  &:focus-visible {
    color: #071009;
    background: #5ad480;
    outline: none;
  }
}

.resume-terminal__corner {
  position: absolute;
  width: 12px;
  height: 12px;
  pointer-events: none;

  &--tl {
    top: 8px;
    left: 8px;
    border-top: 1px solid #5ad480;
    border-left: 1px solid #5ad480;
  }

  &--br {
    right: 8px;
    bottom: 8px;
    border-right: 1px solid #5ad480;
    border-bottom: 1px solid #5ad480;
  }
}

@media (max-width: 768px) {
  .resume-terminal {
    padding: 26px 22px;

    p {
      font-size: 0.68rem;
    }
  }
}
</style>
