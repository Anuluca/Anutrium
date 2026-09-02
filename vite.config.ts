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
        globPatterns: [
          'assets/**/*.{js,css}',
          'pwa-*.png',
          'apple-touch-icon.png',
          'favicon.ico',
        ],
        dontCacheBustURLsMatching: /-[a-f0-9]{8}\.(?:js|css)$/,
        navigateFallback: undefined,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [],
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
        assetFileNames: 'assets/[name][extname]',
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')

          if (!normalizedId.includes('/node_modules/')) return undefined

          if (normalizedId.includes('/three/examples/')) {
            return 'vendor-three-addons'
          }
          if (normalizedId.includes('/three/')) return 'vendor-three'
          if (normalizedId.includes('/swiper/')) return 'vendor-swiper'
          if (
            normalizedId.includes('/motion-v/') ||
            normalizedId.includes('/framer-motion/') ||
            normalizedId.includes('/motion-dom/') ||
            normalizedId.includes('/motion-utils/') ||
            normalizedId.includes('/hey-listen/')
          ) {
            return 'vendor-motion'
          }
          if (
            normalizedId.includes('/@inspira-ui/') ||
            normalizedId.includes('/tailwind-merge/') ||
            normalizedId.includes('/clsx/')
          ) {
            return 'vendor-inspira-ui'
          }
          if (
            normalizedId.includes('/element-plus/') ||
            normalizedId.includes('/@element-plus/')
          ) {
            return 'vendor-element-plus'
          }
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 3000,
  },
  ssgOptions: {
    dirStyle: 'nested',
    formatting: 'minify',
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
    ],
  },
  base: '/',
})
