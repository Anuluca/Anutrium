import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import imageLog from './src/locales/dynamic/island/Photography/imageLog'
import merchPhotos from './src/locales/dynamic/island/Photography/merchPhotos'

const path = require('path')

const merchPhotographyDetailRoutes = Object.values(merchPhotos).flatMap(
  (collections) =>
    collections.map(
      (collection) => `/island/merch-photography/${collection.id}`
    )
)
const imageLogDetailRoutes = imageLog.map(
  (album) => `/island/image-log/${album.id}`
)

export default defineConfig({
  plugins: [
    vue(),
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
                maxEntries: 8,
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

          if (normalizedId.includes('/three/examples/')) {
            return 'vendor-three-addons'
          }
          if (normalizedId.includes('/three/')) return 'vendor-three'
          if (normalizedId.includes('/swiper/')) return 'vendor-swiper'
          if (normalizedId.includes('/@element-plus/icons-vue/')) {
            // Icons import Element Plus internals, so splitting them creates a
            // circular production chunk that can execute before core exports.
            return 'vendor-element-plus'
          }
          if (normalizedId.includes('/element-plus/')) {
            return 'vendor-element-plus'
          }

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
      '/craft',
      '/colorPalette',
      '/easeStudio',
      '/metronome',
      '/bounceDynamics',
      '/htmlEntities',
      '/base64Codec',
      '/imageBase64',
      '/about',
      '/pet',
      '/island',
      '/island/photography',
      '/island/merch-photography',
      ...merchPhotographyDetailRoutes,
      '/island/image-log',
      ...imageLogDetailRoutes,
      '/island/illustration',
      '/island/trainer-card',
      '/island/study-notes',
      '/games/sleepingdogs/bullsAndCows',
      '/games/sleepingdogs/saftybox',
      '/games/chineseChessCardGames/chineseChess',
      '/ai-playground/arknightxpersona3reload',
    ],
  },
  base: '/',
})
