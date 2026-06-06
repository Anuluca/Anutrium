<script lang="ts" setup>
import { ref } from 'vue'

import PokeAmice from '@/assets/img/about/pokeAmice.png'
import PageHeader from '@/components/PageHeader/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

const activeIndex = ref<number | null>(0)

const toggleLog = (index: number) => {
  activeIndex.value = activeIndex.value === index ? null : index
}

const getNeighborHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url.replace(/^https?:\/\//, '')
  }
}

const changelogs = ref([
  {
    version: 'v0.5-alpha',
    codename: 'MIRAGE',
    date: '2026-01-21',
    title: '代码结构优化',
    details: [
      '将移动端检测逻辑从组件内部迁移到 Pinia store 中统一管理',
      '将设备检测逻辑从 main.ts 迁移到 App.vue 组件中',
      '修改星空背景实现逻辑，优化性能与展示效果',
      '实现字体和图片加载工具类，确保页面内容在所有资源加载完成后再显示',
      '优化项目资源结构',
      '重构启动动画组件并优化视觉效果',
      '添加移动端语言和主题切换功能',
      '移除不必要的 type-check 步骤',
      '重构星空背景组件提升性能 — 将 jQuery 实现改为 Vue Composition API，预计算星星坐标避免运行时 DOM 操作',
      '移除 Safari 浏览器特殊检测逻辑',
      '添加响应式比例阈值变量',
      '合并计算属性，提高代码可读性',
      '使用 v-slot 优化路由视图过渡动画',
      '移除组件中的 window resize 事件监听器，提高性能',
    ],
  },
  {
    version: 'v0.4-alpha',
    codename: null,
    date: '2026-01-12',
    title: '视觉重构',
    details: [
      '全面优化视觉效果：星空背景优化、404 页面动效优化',
      '新增菜单栏动效、菜单切换时的背景、页面过渡效果',
      '新增页面资源加载动画',
      '优化昼夜主题切换的效果',
      '重构移动端菜单结构，添加中英文标题显示',
      '新增移动端底部联系信息区域，包含社交链接和版权信息',
      '优化移动端菜单动画效果和样式细节',
      '调整多个组件的动画时长和触发时机，提升用户体验的流畅性',
      '添加新的 cnArtTitle 字体文件并更新 font.less 样式',
      '优化页面颜色搭配',
      '调整导航栏圆角、背景色和阴影效果、修改滚动状态下侧边栏的样式',
    ],
  },
  {
    version: 'v0.3-alpha',
    codename: null,
    date: '2026-01-07',
    title: '移动端兼容',
    details: ['开发移动端 UI 界面，实现移动端/平板端判断，提供更好的小屏体验'],
  },
  {
    version: 'v0.2-alpha',
    codename: null,
    date: '2025-12-26',
    title: '功能重构',
    details: [
      '底部轮播栏重写',
      '全面引入 i18n，实现主题切换功能，备战国际化开发',
      '新增「关于」页',
    ],
  },
  {
    version: 'v0.1-alpha',
    codename: null,
    date: '2025-12-18',
    title: '项目初始化',
    details: [
      '项目初始化，从 MegaAnuluca 继承项目，删减无用内容以便二次开发',
      '确立以「投影」为核心的品牌风格，强调整体呼吸感，空洞/黑洞两种主题风格',
      '添加路由、完成项目 Netlify 自动化部署、Cloudflare 提供域名管理',
    ],
  },
])

const neighbors = ref([
  {
    name: 'Poke Amice 宝可梦友会',
    url: 'http://pokeamice.com',
    logo: PokeAmice,
    description:
      '此处是由一位业余宝可梦爱好者Asimov创建的宝可梦全栈资料整理站点&个人研究据点。',
  },
])
</script>

<template>
  <div class="about-page main-container">
    <PageHeader
      header-label="[HUAHUA_THE_CAT]"
      title-en="ABOUT"
      title-cn="关于"
      meta-item="LEARN MORE ABOUT THIS PROJECT"
      primary-color="#5D3ABA"
    />

    <section class="block">
      <div class="section-header">
        <h3 class="section-title">
          &lt; CHANGELOG &gt;<span class="cn">更新日志</span>
        </h3>
        <div class="section-line" />
      </div>

      <div class="timeline">
        <div
          v-for="(log, index) in changelogs"
          :key="index"
          class="timeline-item"
          :class="{ 'is-active': activeIndex === index }"
        >
          <div class="axis">
            <div class="axis-diamond" />
            <div class="axis-line" />
          </div>

          <div class="log-card">
            <div class="log-head" @click="toggleLog(index)">
              <div class="log-meta">
                <span class="log-version">{{ log.version }}</span>
                <span v-if="log.codename" class="log-codename">{{
                  log.codename
                }}</span>
              </div>
              <div class="log-center">
                <span class="log-title">{{ log.title }}</span>
              </div>
              <div class="log-right">
                <span class="log-date">{{ log.date }}</span>
                <span class="log-arrow" />
              </div>
            </div>

            <div class="log-expand">
              <div class="log-expand-inner">
                <ul>
                  <li v-for="(item, i) in log.details" :key="i">
                    <span class="li-bullet">▸</span>{{ item }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="block">
      <div class="section-header">
        <h3 class="section-title">
          <span class="c-gear" aria-hidden="true">
            <span class="gear-diamonds">
              <i />
              <i />
              <i />
              <i class="is-hollow" />
            </span>
            <span class="gear-letters">
              <b><span>G</span></b>
              <b><span>E</span></b>
              <b><span>A</span></b>
              <b><span>R</span></b>
            </span>
          </span>
          <span class="cn">友情链接</span>
        </h3>
        <div class="section-line" />
      </div>

      <div class="neighbors-grid">
        <div v-for="nb in neighbors" :key="nb.url" class="neighbor-item">
          <a
            :href="nb.url"
            target="_blank"
            rel="noopener noreferrer"
            class="neighbor-card"
          >
            <span class="nb-node" aria-hidden="true" />

            <div class="nb-logo">
              <img
                :src="nb.logo"
                :alt="nb.name"
                loading="lazy"
                decoding="async"
              />
            </div>

            <div class="nb-info">
              <div class="nb-title-row">
                <h4 class="nb-name">{{ nb.name }}</h4>
                <span class="nb-host">{{ getNeighborHost(nb.url) }}</span>
              </div>
              <p class="nb-desc">{{ nb.description }}</p>
            </div>

            <span class="nb-arrow">↗</span>
          </a>
        </div>
      </div>
    </section>

    <!-- <footer class="about-footer">
      <span class="footer-text">&lt; DRIVEN BY PASSION. &gt;</span>
    </footer> -->
    <PageFooter cn-title="关于" en-title="ABOUT" />
  </div>
</template>

<style lang="less" scoped>
@red: #e23456;
@red-dim: rgba(226, 52, 86, 0.15);
@border: rgba(255, 255, 255, 0.07);
@text-dim: rgba(255, 255, 255, 0.4);
@card-bg: rgba(255, 255, 255, 0.025);

.about-page {
  margin: 0 auto;
  color: #fff;
}

.block {
  margin-bottom: 100px;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 10px;
  margin-top: 20px;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  font-family: 'anton', 'source-han-sans-simplified-c';
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 2px;
  line-height: 1;
  white-space: nowrap;

  .cn {
    font-family: 'source-han-sans-simplified-c';
    font-size: 1rem;
    font-weight: 800;
    opacity: 0.35;
    letter-spacing: 1px;
  }
}

.section-line {
  flex: 1;
  height: 1px;
  background: @border;
  margin-left: 8px;
  align-self: center;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 30px;
}

.timeline-item {
  display: flex;
  gap: 24px;
  position: relative;

  &.is-active {
    .axis-diamond {
      border-color: @red;
      background: @red;
      box-shadow: 0 0 10px @red, 0 0 20px rgba(226, 52, 86, 0.4);

      &::before {
        border-color: rgba(226, 52, 86, 0.3);
      }
    }

    .log-card {
      border-color: rgba(226, 52, 86, 0.3);
      background: rgba(226, 52, 86, 0.04);
    }

    .log-expand {
      grid-template-rows: 1fr;

      ul {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .log-arrow {
      transform: rotate(-135deg) !important;
      border-color: @red !important;
    }
  }
}

.axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 20px;
  flex-shrink: 0;
  padding-top: 19px;
}

.axis-diamond {
  width: 8px;
  height: 8px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transform: rotate(45deg);
  transition: background 0.3s, border-color 0.3s, box-shadow 0.3s;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: -4px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    transition: border-color 0.3s;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
          rgba(255, 255, 255, 0.3) 0%,
          rgba(255, 255, 255, 0.3) 100%
        )
        center/1px 100% no-repeat,
      linear-gradient(
          rgba(255, 255, 255, 0.3) 0%,
          rgba(255, 255, 255, 0.3) 100%
        )
        center/100% 1px no-repeat;
    opacity: 0.4;
  }
}

.axis-line {
  flex: 1;
  width: 1px;
  background: @border;
  margin-top: 8px;
}

.log-card {
  flex: 1;
  border: 1px solid @border;
  background: @card-bg;
  margin-bottom: 12px;
  transition: border-color 0.3s, background 0.3s;
  overflow: hidden;
}

.log-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
  padding: 14px 20px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.04);

    .log-arrow {
      border-color: rgba(255, 255, 255, 0.6);
    }
  }
}

.log-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.log-version {
  font-family: 'anton', monospace;
  font-size: 0.72rem;
  display: inline-block;
  width: 100px;
  letter-spacing: 1px;
  color: #fff;
  opacity: 0.9;
}

.log-codename {
  font-family: 'anton', monospace;
  font-size: 0.58rem;
  letter-spacing: 2px;
  color: #fff;
  background: @red;
  padding: 0px 6px;
  padding-bottom: 3px;
  line-height: 1.6;
}

.log-title {
  font-family: 'source-han-sans-simplified-c';
  font-size: 0.95rem;
  font-weight: 900;
  letter-spacing: 1px;
  color: #fff;
}

.log-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.log-date {
  font-family: 'anton', monospace;
  font-size: 0.62rem;
  letter-spacing: 1px;
  color: @text-dim;
}

.log-arrow {
  width: 7px;
  height: 7px;
  border-right: 1.5px solid rgba(255, 255, 255, 0.3);
  border-bottom: 1.5px solid rgba(255, 255, 255, 0.3);
  transform: rotate(45deg);
  transition: transform 0.35s, border-color 0.2s;
  flex-shrink: 0;
  margin-bottom: 3px;
}

.log-expand {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.45s cubic-bezier(0.4, 0, 0.2, 1);
  border-top: 0px solid @border;

  .is-active & {
    border-top-width: 1px;
  }
}

.log-expand-inner {
  min-height: 0;
  overflow: hidden;

  ul {
    list-style: none;
    padding: 12px 20px 16px 20px;
    margin: 0;
    opacity: 0;
    transform: translateY(-8px);
    transition: opacity 0.35s 0.05s, transform 0.35s 0.05s;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  li {
    display: flex;
    gap: 10px;
    font-family: 'source-han-sans-simplified-c', monospace;
    font-size: 15px;
    font-weight: 600;
    line-height: 1.65;
    color: rgba(255, 255, 255, 0.5);
  }
}

.li-bullet {
  color: @red;
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 15px;
}

.neighbors-grid {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 22px;
  padding-left: 38px;

  &::before {
    content: '';
    position: absolute;
    left: 9px;
    top: 10px;
    bottom: 10px;
    width: 1px;
    background: linear-gradient(
      180deg,
      transparent,
      rgba(226, 52, 86, 0.55),
      transparent
    );
  }
}

.neighbor-item {
  position: relative;
}

.c-gear {
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  vertical-align: middle;
}

.gear-diamonds {
  width: 34px;
  height: 30px;
  position: relative;
  flex-shrink: 0;
  transform: scaleY(0.78);
  transform-origin: center;

  i {
    position: absolute;
    width: 9px;
    height: 9px;
    box-sizing: border-box;
    background: #fff;
    transform: rotate(45deg);
    box-shadow: 0 0 7px rgba(255, 255, 255, 0.7);
    animation: gearDiamondBlink 1.45s ease-in-out infinite;
  }

  i:nth-child(1) {
    left: 12px;
    top: 1px;
  }

  i:nth-child(2) {
    left: 2px;
    top: 10px;
    animation-delay: 0.18s;
  }

  i:nth-child(3) {
    left: 12px;
    top: 19px;
    animation-delay: 0.36s;
  }

  .is-hollow {
    left: 22px;
    top: 10px;
    background: transparent;
    border: 1.5px solid #d91a8e;
    box-shadow: 0 0 8px rgba(217, 26, 142, 0.8);
    animation: none;
  }
}

.gear-letters {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  b {
    width: 20px;
    height: 18px;
    box-sizing: border-box;
    position: relative;
    display: block;
    clip-path: polygon(20% 0, 80% 0, 100% 50%, 80% 100%, 20% 100%, 0 50%);
    background: #fff;
    color: #111;
    font-family: Terminal, Monaco, 'Courier New', monospace;
    font-size: 0.58rem;
    font-weight: 900;
    line-height: 18px;
    box-shadow: 0 0 7px rgba(255, 255, 255, 0.62);

    span {
      position: absolute;
      left: 53%;
      top: 50%;
      display: block;
      line-height: 1;
      transform: translate(-50%, -50%) scaleY(0.78);
      transform-origin: center;
    }
  }
}

.neighbor-card {
  min-height: 72px;
  display: grid;
  grid-template-columns: 50px minmax(0, 1fr) 38px;
  align-items: center;
  gap: 16px;
  padding: 10px 0 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  text-decoration: none;
  color: #fff;
  position: relative;
  transition: border-color 0.25s, transform 0.25s;

  &::before {
    content: '';
    position: absolute;
    left: -28px;
    top: 50%;
    width: 28px;
    height: 1px;
    background: rgba(226, 52, 86, 0.52);
    transform: translateY(-50%);
  }

  &::after {
    content: '';
    position: absolute;
    left: 16px;
    right: 0;
    bottom: -1px;
    height: 1px;
    background: linear-gradient(90deg, @red, transparent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s ease;
  }

  &:hover {
    border-color: rgba(226, 52, 86, 0.55);
    transform: translateX(6px);

    &::after {
      transform: scaleX(1);
    }

    .nb-logo {
      transform: scale(1.2);

      img {
        filter: brightness(1.06) saturate(1.16);
      }
    }

    .nb-node {
      background: @red;
      box-shadow: 0 0 0 6px rgba(226, 52, 86, 0.12),
        0 0 18px rgba(226, 52, 86, 0.65);
    }

    .nb-arrow {
      color: @red;
      transform: translate(4px, -4px);
    }
  }
}

.nb-node {
  position: absolute;
  left: -34px;
  top: 50%;
  width: 9px;
  height: 9px;
  border: 1px solid @red;
  background: #050505;
  transform: translateY(-50%) rotate(45deg);
  transition: background 0.25s, box-shadow 0.25s;
}

.nb-logo {
  width: 50px;
  height: 50px;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.16);
  clip-path: polygon(22% 0, 78% 0, 100% 50%, 78% 100%, 22% 100%, 0 50%);
  background: rgba(255, 255, 255, 0.035);
  transition: border-color 0.25s, transform 0.25s;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: brightness(0.86) saturate(0.86);
    transition: filter 0.25s;
  }
}

.nb-info {
  min-width: 0;
}

.nb-title-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
  margin-bottom: 5px;
}

.nb-host {
  font-family: 'anton', monospace;
  font-size: 0.58rem;
  letter-spacing: 1.4px;
  color: rgba(226, 52, 86, 0.72);
  white-space: nowrap;
}

.nb-name {
  font-family: 'source-han-sans-simplified-c';
  font-size: 0.98rem;
  font-weight: 900;
  letter-spacing: 1px;
  color: #fff;
  min-width: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nb-host {
  color: rgba(255, 255, 255, 0.28);
}

.nb-desc {
  font-family: 'source-han-sans-simplified-c', monospace;
  font-size: 0.74rem;
  color: @text-dim;
  line-height: 1.45;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nb-arrow {
  font-family: 'anton', monospace;
  justify-self: center;
  font-size: 1.1rem;
  color: rgba(226, 52, 86, 0.45);
  transition: color 0.25s, transform 0.25s;
}

@keyframes gearDiamondBlink {
  0%,
  100% {
    opacity: 0.45;
    filter: brightness(0.75);
  }

  42% {
    opacity: 1;
    filter: brightness(1.35);
  }

  68% {
    opacity: 0.68;
    filter: brightness(0.95);
  }
}

.about-footer {
  text-align: center;
  border-top: 1px solid @border;
}

.footer-text {
  font-family: 'anton', monospace;
  font-size: 1.2rem;
  letter-spacing: 4px;
  line-height: 2rem;
  color: @red;
  filter: drop-shadow(0 0 10px @red);
}

@media (max-width: 768px) {
  .section-title {
    font-size: 1.8rem;
  }

  .log-head {
    grid-template-columns: 1fr auto;

    .log-center {
      display: none;
    }
  }

  .neighbors-grid {
    gap: 18px;
    padding-left: 28px;

    &::before {
      left: 7px;
    }
  }

  .c-gear {
    height: 34px;
    gap: 4px;
  }

  .gear-diamonds {
    width: 34px;
    height: 30px;
    transform: scale(0.86, 0.67);
    transform-origin: left center;
  }

  .gear-letters {
    gap: 3px;

    b {
      width: 18px;
      height: 16px;
      font-size: 0.52rem;
    }
  }

  .neighbor-card {
    min-height: auto;
    grid-template-columns: 42px minmax(0, 1fr) 28px;
    gap: 12px;
    padding-left: 12px;
  }

  .neighbor-card::before {
    left: -21px;
    width: 21px;
  }

  .nb-node {
    left: -27px;
    width: 8px;
    height: 8px;
  }

  .nb-logo {
    width: 38px;
    height: 38px;
  }

  .nb-name {
    font-size: 0.9rem;
  }

  .nb-desc {
    font-size: 0.72rem;
  }

  .nb-title-row {
    flex-wrap: wrap;
    gap: 5px 8px;
  }

  .nb-host {
    width: 100%;
  }

  .nb-arrow {
    font-size: 0.95rem;
  }
}
</style>
