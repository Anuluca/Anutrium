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
        additionalData: '@import "./src/assets/style/global.less";',
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
      '/flanerie/jiujiang',
      '/flanerie/nanjing',
      '/flanerie/nanjinghongshan',
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
    ],
  },
  base: '/',
})
