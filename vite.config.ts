import vue from '@vitejs/plugin-vue'
import { execFileSync } from 'node:child_process'
import AutoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import { floratriumDevPlugin } from './scripts/lib/floratriumDevPlugin'
import { islandModules } from './src/config/islandModules'
import imageLog from './src/locales/dynamic/island/Photography/imageLog'
import merch from './src/locales/dynamic/island/Photography/merch'

const path = require('path')

// 使用提交时间而非构建时间，并固定北京时间，避免构建服务器时区影响日期。
const lastCommitTime = execFileSync('git', ['log', '-1', '--format=%cI'], {
  cwd: __dirname,
  encoding: 'utf8',
}).trim()
const lastUpdate = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date(lastCommitTime))

const merchDetailRoutes = Object.values(merch).flatMap((collections) =>
  collections.map((collection) => `/atrium/merch/${collection.id}`)
)
const imageLogDetailRoutes = imageLog.map(
  (album) => `/atrium/image-log/${album.id}`
)

export default defineConfig({
  define: {
    'import.meta.env.VITE_LAST_UPDATE': JSON.stringify(lastUpdate),
  },
  plugins: [
    vue(),
    floratriumDevPlugin(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
    VitePWA({
      manifest: false,
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      scope: '/',
      workbox: {
        globPatterns: ['pwa-*.png', 'apple-touch-icon.png', 'favicon.ico'],
        dontCacheBustURLsMatching: /-[a-f0-9]{8}\.(?:js|css)$/,
        navigateFallback: undefined,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /\/assets\/.*\.(?:js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'app-assets',
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern:
              /^https:\/\/assets\.anuluca\.com\/fonts\/.*\.woff2(?:\?.*)?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'r2-fonts',
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                // 当前 90 个 Unicode 分片，加上其他字体和发布切换余量。
                maxEntries: 128,
                maxAgeSeconds: 60 * 60 * 24 * 365,
                purgeOnQuotaError: true,
              },
            },
          },
          {
            urlPattern:
              /^https:\/\/assets\.anuluca\.com\/.*[?&]image=(?:card-thumb|card-mobile|home-thumb)(?:&|$)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'r2-thumbnails',
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 240,
                maxAgeSeconds: 60 * 60 * 24 * 30,
                purgeOnQuotaError: true,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  ssr: {
    noExternal: ['element-plus'],
  },
  css: {
    preprocessorOptions: {
      less: {
        charset: false,
        additionalData: '@import "./src/assets/style/variables.less";',
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 550,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')

          if (!normalizedId.includes('/node_modules/')) return undefined

          // 扩展按实际消费者拆分，避免线框入口连带预加载材质模式的后处理。
          if (normalizedId.includes('/three/examples/')) return undefined
          if (normalizedId.includes('/three/')) return 'vendor-three'
          // UI 库跟随实际消费者。强制分包会把其 Vue 共享依赖一起移入 vendor，
          // 从而让首屏为共享运行时下载仅旧页面使用的 Swiper 或路由级弹窗/表单。

          // Let Rollup keep route-only dependencies with their actual consumers.
          // A catch-all vendor chunk makes one shared framework import pull every
          // third-party package into the initial graph of every route.
          return undefined
        },
      },
    },
  },
  server: {
    port: 3000,
    watch: {
      ignored: [
        '**/.vite-ssg-temp/**',
        '**/dist/**',
        '**/playwright-report/**',
        '**/test-results/**',
      ],
    },
  },
  ssgOptions: {
    dirStyle: 'nested',
    formatting: 'minify',
    crittersOptions: false,
    includedRoutes: () => [
      '/',
      '/archive',
      '/flanerie',
      '/flanerie/changsha',
      '/flanerie/xiangtan',
      '/flanerie/shaoshan',
      '/flanerie/anqing',
      '/flanerie/chizhou',
      '/flanerie/huangshan',
      '/flanerie/chongqing',
      '/flanerie/fuzhou-jiangxi',
      '/flanerie/jingdezhen',
      '/flanerie/lushan',
      '/flanerie/donglin-buddha',
      '/flanerie/poyang-lake',
      '/flanerie/fuzhou-fujian',
      '/flanerie/shanghai',
      '/flanerie/suzhou',
      '/flanerie/nanchang',
      '/flanerie/wuhan',
      '/flanerie/shenzhen',
      '/flanerie/pikachu_costume',
      '/flanerie/super_wuhan',
      '/flanerie/poke_coco',
      '/flanerie/dyna_gaia',
      '/flanerie/ginga',
      '/flanerie/zet',
      '/flanerie/zero',
      '/flanerie/jiujiang',
      '/flanerie/nanjing',
      '/flanerie/singapore',
      '/flanerie/pingtandao',
      '/colorPalette',
      '/easeStudio',
      '/metronome',
      '/bounceDynamics',
      '/htmlEntities',
      '/base64Codec',
      '/imageBase64',
      '/about',
      '/atrium',
      ...Object.values(islandModules).map((module) => module.path),
      '/floratrium',
      '/creative',
      '/atrium/photography',
      ...merchDetailRoutes,
      '/atrium/image-log',
      ...imageLogDetailRoutes,
      '/atrium/illustration',
      '/atrium/trainer-card',
      '/games/sleepingdogs/bullsAndCows',
      '/games/sleepingdogs/saftybox',
      '/ai-playground/arknightxpersona3reload',
    ],
  },
  base: '/',
})
