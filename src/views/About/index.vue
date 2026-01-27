<script lang="ts" setup>
import { ref } from 'vue'

import PokeAmice from '@/assets/img/about/pokeAmice.png'

const activeIndex = ref<number | null>(0) // 默认展开第一项，强迫症通常喜欢有序的开场

const toggleLog = (index: number) => {
  activeIndex.value = activeIndex.value === index ? null : index
}

const changelogs = ref([
  // 下一个版本号：Crystal
  {
    version: 'v0.5-alpha(Mirage)',
    date: '2026-01-21',
    title: '代码结构优化',
    details: [
      '1. 将移动端检测逻辑从组件内部迁移到Pinia store中统一管理',
      '2. 将设备检测逻辑从 main.ts 迁移到 App.vue 组件中',
      '3. 修改星空背景实现逻辑，优化性能与展示效果',
      '4. 实现字体和图片加载工具类，确保页面内容在所有资源加载完成后再显示',
      '5. 优化项目资源结构',
      '6. 重构启动动画组件并优化视觉效果',
      '7. 添加移动端语言和主题切换功能',
      '8. 移除不必要的type-check步骤',
      '9. 重构星空背景组件提升性能',
      ' - 将jQuery实现改为Vue Composition API',
      ' - 预计算星星坐标，避免运行时DOM操作',
      '10. 移除Safari浏览器特殊检测逻辑',
      '11. 添加响应式比例阈值变量',
      '12. 合并计算属性，提高代码可读性',
      '13. 优化页面交互',
      '14. 使用v-slot优化路由视图过渡动画',
      '15. 移除组件中的window resize事件监听器，提高性能',
      '16. 样式优化',
    ],
  },
  {
    version: 'v0.4-alpha',
    date: '2026-01-12',
    title: '视觉重构',
    details: [
      '1. 全面优化视觉效果：星空背景优化、404页面动效优化',
      '2. 新增菜单栏动效、菜单切换时的背景、页面过渡效果',
      '3. 新增页面资源加载动画',
      '4. 优化昼夜主题切换的效果',
      '5. 重构移动端菜单结构，添加中英文标题显示',
      '6. 新增移动端底部联系信息区域，包含社交链接和版权信息',
      '7. 优化移动端菜单动画效果和样式细节',
      '8. 调整多个组件的动画时长和触发时机和时序调整，提升用户体验的流畅性',
      '9. 添加新的cnArtTitle字体文件并更新font.less样式',
      '10. 优化页面颜色搭配',
      '11. 调整导航栏圆角、背景色和阴影效果、修改滚动状态下侧边栏的样式',
    ],
  },
  {
    version: 'v0.3-alpha',
    date: '2026-01-07',
    title: '移动端兼容',
    details: ['1.开发移动端UI界面,实现移动端/平板端判断，提供更好的小屏体验'],
  },
  {
    version: 'v0.2-alpha',
    date: '2025-12-26',
    title: '功能重构',
    details: [
      '1. 底部轮播栏重写',
      '2. 全面引入i18n，实现主题切换功能，备战国际化开发',
      '3. 新增“关于”页',
    ],
  },
  {
    version: 'v0.1-alpha',
    date: '2025-12-18',
    title: '项目初始化',
    details: [
      '1. 项目初始化，从MegaAnuluca继承项目，删减无用内容以便二次开发',
      '2. 确立以「投影」为核心的品牌风格，强调整体呼吸感，空洞/黑洞两种主题风格',
      '3. 添加路由、完成项目Netlify自动化部署、Cloudflare提供域名管理',
    ],
  },
])

const neighbors = ref([
  {
    name: 'Poke Amice - 宝可梦友会',
    url: 'http://pokeamice.com',
    logo: PokeAmice,
    description: '超极巨怪力正在施工中！',
  },
  // {
  //   name: 'Vue.js',
  //   url: 'https://vuejs.org',
  //   logo: 'https://vuejs.org/images/logo.png',
  //   description: '渐进式 JavaScript 框架',
  // },
])
</script>

<template>
  <div class="about-page main-container">
    <section class="changelog-wrapper">
      <h3 class="section-title">Changelog<span>更新日志</span></h3>
      <div class="timeline">
        <div
          v-for="(log, index) in changelogs"
          :key="index"
          class="timeline-item"
          :class="{ 'is-active': activeIndex === index }"
        >
          <div class="time-marker">
            <span class="dot" />
            <span class="version">{{ log.version }}</span>
          </div>

          <div class="log-content">
            <h4 class="log-title" @click="toggleLog(index)">
              <span class="title-text">{{ log.title }}</span>
              <div class="title-meta">
                <small>{{ log.date }}</small>
                <span class="arrow" />
              </div>
            </h4>

            <div class="expand-container">
              <div class="expand-content">
                <ul>
                  <li v-for="(item, i) in log.details" :key="i">{{ item }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="changelog-wrapper">
      <h3 class="section-title">Neighbors<span>友情链接</span></h3>
      <div class="neighbors-grid">
        <a
          v-for="(neighbor, index) in neighbors"
          :key="index"
          :href="neighbor.url"
          target="_blank"
          rel="noopener noreferrer"
          class="neighbor-card"
        >
          <div class="logo-wrapper">
            <img :src="neighbor.logo" :alt="neighbor.name" class="logo" />
          </div>
          <div class="info">
            <h4 class="name">{{ neighbor.name }}</h4>
            <p class="description">{{ neighbor.description }}</p>
          </div>
          <div class="link-icon">→</div>
        </a>
      </div>
    </section>

    <footer class="about-footer">
      <span>&lt; Drived &nbsp;by&nbsp; Passion. &gt;</span>
    </footer>
  </div>
</template>

<style lang="less" scoped>
.about-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 100px 20px;
  section {
    margin-bottom: 100px;
  }

  .changelog-wrapper {
    .section-title {
      font-size: 50px;
      margin-bottom: 60px;
      font-family: 'enTitle';
      span {
        opacity: 0.5;
        margin-left: 15px;
        font-family: 'cnTitle';
        font-size: 26px;
      }
    }

    .timeline {
      position: relative;
      padding-left: 30px;
      border-left: 1px solid rgba(255, 255, 255, 0.1);

      .timeline-item {
        position: relative;
        margin-bottom: 30px;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

        .time-marker {
          display: flex;
          align-items: center;
          margin-bottom: 15px;

          .dot {
            width: 10px;
            height: 10px;
            background: var(--star-color, #e23456);
            border-radius: 50%;
            box-shadow: 0 0 10px var(--star-color, #e23456);
            position: absolute;
            left: -35px;
          }

          .version {
            font-family: monospace;
            font-weight: bold;
            font-size: 20px;
            opacity: 0.8;
          }
        }

        .log-content {
          background-color: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px) brightness(1.5) contrast(0.9);
          border-radius: 8px;
          transition: all 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.05);
          overflow: hidden;

          .log-title {
            margin: 0;
            padding: 20px;
            font-size: 22px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background 0.3s;

            &:hover {
              background: rgba(255, 255, 255, 0.05);
              .arrow {
                border-color: var(--star-color);
              }
            }

            .title-meta {
              display: flex;
              align-items: center;
              gap: 20px;

              small {
                opacity: 0.4;
                font-size: 16px;
                font-weight: normal;
              }

              .arrow {
                width: 8px;
                height: 8px;
                border-right: 2px solid rgba(255, 255, 255, 0.3);
                border-bottom: 2px solid rgba(255, 255, 255, 0.3);
                transform: rotate(45deg);
                transition: transform 0.4s;
                margin-bottom: 4px;
              }
            }
          }

          // 关键：利用 Grid 实现高度 0 -> auto 动画
          .expand-container {
            display: grid;
            grid-template-rows: 0fr;
            transition: grid-template-rows 0.5s cubic-bezier(0.4, 0, 0.2, 1);

            .expand-content {
              min-height: 0;
              ul {
                padding: 0 20px 20px 40px;
                margin: 0;
                opacity: 0;
                transform: translateY(-10px);
                transition: all 0.4s;
                li {
                  font-size: 16px;
                  line-height: 1.8;
                  opacity: 0.6;
                  margin-bottom: 8px;
                  color: var(--text-color);
                }
              }
            }
          }
        }

        // 激活状态样式
        &.is-active {
          .log-content {
            border-color: rgba(150, 150, 150, 0.231);
            background-color: rgba(109, 109, 109, 0.079);
          }
          .expand-container {
            grid-template-rows: 1fr;
            .expand-content ul {
              opacity: 1;
              transform: translateY(0);
              padding-top: 10px;
            }
          }
          .title-meta .arrow {
            transform: rotate(-135deg);
          }
        }
      }
    }
  }

  .neighbors-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 20px;
    margin-top: 30px;

    .neighbor-card {
      display: flex;
      align-items: center;
      position: relative;
      padding: 15px;
      border-radius: 6px;
      background: linear-gradient(to right, #e23456, transparent);
      filter: drop-shadow(0 0 5px var(--star-color));
      text-decoration: none;
      transition: all 0.3s ease;
      color: var(--text-color);

      &:hover {
        transform: translateY(-5px);
        filter: drop-shadow(0 0 30px var(--star-color));

        .logo {
          transform: scale(1.1);
        }

        .link-icon {
          transform: translateX(5px);
        }
      }

      .logo-wrapper {
        width: 80px;
        height: 80px;
        position: absolute;
        bottom: 20px;
        left: 20px;
        border-radius: 8px;
        overflow: hidden;
        margin-right: 15px;

        .logo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
      }

      .info {
        flex: 1;
        margin-left: 100px;
        overflow: hidden;

        .name {
          margin: 0 0 5px 0;
          font-size: 20px;
          font-weight: 600;
          color: white;
        }

        .description {
          margin: 0;
          margin-top: 8px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .link-icon {
        font-size: 20px;
        margin-left: 10px;
        color: var(--star-color, #e23456);
        transition: transform 0.3s ease;
      }
    }
  }

  .about-footer {
    text-align: center;
    margin-top: 150px;
    margin-bottom: 500px;
    span {
      font-family: 'enTitle';
      font-size: 24px;
      color: @primary-color;
      text-decoration: underline;
      padding: 10px 20px;
      filter: drop-shadow(0 0 10px @primary-color);
    }
  }
}

@media (max-width: 768px) {
  .about-page {
    padding: 60px 15px;
    .changelog-wrapper .section-title {
      font-size: 36px;
    }
    .log-title {
      font-size: 18px !important;
    }
  }
}
</style>
