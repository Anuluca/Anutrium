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
    // 配置路径别名
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  css: {
    // less预处理器
    preprocessorOptions: {
      less: {
        charset: false,
        // 每个 Less 文件都会自动导入此全局样式文件
        additionalData: '@import "./src/assets/style/global.less";',
      },
    },
  },
  build: {
    //打包环境移除console.log，debugger
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // 去掉静态资源（图片、字体等）的 hash
        assetFileNames: 'assets/[name][extname]',
        // 如果你也想去掉 JS 和 CSS 的 hash（慎用！）
        // chunkFileNames: 'assets/[name].js',
        // entryFileNames: 'assets/[name].js',
      },
    },
  },
  server: {
    port: 3000, // 更改端口号为3000
  },
  base: './',
})
