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
      '/resume',
    ],
  },
  base: '/',
})
