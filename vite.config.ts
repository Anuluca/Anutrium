import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
const path = require('path')
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
const resolve = (dir: any) => path.resolve(__dirname, dir)

export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()]
    }),
    Components({
      resolvers: [ElementPlusResolver()]
    })
  ],
  resolve: {
    // 配置路径别名
    alias: {
      '@': path.resolve(__dirname, './src')
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  css: {
    // less预处理器
    preprocessorOptions: {
      less: {
        charset: false,
        // 每个 Less 文件都会自动导入此全局样式文件
        additionalData: '@import "./src/assets/style/global.less";'
      }
    }
  },
  build: {
    //打包环境移除console.log，debugger
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  base: './'
})
