import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'

const path = require('path')

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
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
      '/island',
      '/island/photography',
      '/island/merch-photography',
      '/island/merch-photography/pokemon-plush',
      '/island/merch-photography/shodo-arceus',
      '/island/merch-photography/shodo-dragapult',
      '/island/merch-photography/shodo-cinderace',
      '/island/merch-photography/ultraman-belial',
      '/island/merch-photography/pokemon-battle-chess',
      '/island/image-log',
      '/island/image-log/daily-fragments',
      '/island/image-log/travel-proof',
      '/island/image-log/home-archive',
    ],
  },
  base: '/',
})
