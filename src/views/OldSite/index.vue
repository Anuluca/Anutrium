<template>
  <div class="old-site-container">
    <iframe 
      :src="oldSiteUrl" 
      frameborder="0" 
      class="old-site-frame" 
      ref="iframeRef"
      @load="onIframeLoad"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue'

// 使用完整的绝对路径确保 iframe 及其内部资源都能正确加载
const oldSiteUrl = '/childWebsites/AnulucaCom/index.html'
const iframeRef = ref<HTMLIFrameElement | null>(null)
let interval: number | null = null

// 当iframe加载完成后执行
const onIframeLoad = () => {
  try {
    const iframe = iframeRef.value
    if (!iframe || !iframe.contentDocument) return
    
    const doc = iframe.contentDocument
    
    // 添加base标签以确保链接在当前iframe中打开
    let baseTag = doc.querySelector('base')
    if (!baseTag) {
      baseTag = doc.createElement('base')
      baseTag.target = '_self'
      doc.head.appendChild(baseTag)
    } else {
      baseTag.target = '_self'
    }
    
    // 重写window.open方法，使其在当前iframe中打开链接而不是新窗口
    if (iframe.contentWindow) {
      iframe.contentWindow.open = function(url, target, features) {
        if (url) {
          iframe.contentWindow.location.href = url
        }
        return iframe.contentWindow
      }
    }
    
    // 遍历所有链接并确保它们在当前iframe中打开
    const links = doc.querySelectorAll('a[href]')
    links.forEach(link => {
      // 保存原始的href值
      const originalHref = link.getAttribute('href')
      
      // 如果链接已经是完整URL或者是javascript:void(0)等特殊链接，则跳过
      if (!originalHref || 
          originalHref.startsWith('javascript:') ||
          originalHref.startsWith('#') ||
          originalHref.startsWith('mailto:')) {
        return
      }
      
      // 移除现有的点击事件监听器并添加新的
      const handleClick = function(e: Event) {
        // 阻止默认行为
        e.preventDefault()
        e.stopPropagation()
        
        // 在当前iframe中导航
        if (originalHref && iframe.contentWindow) {
          iframe.contentWindow.location.href = originalHref
        }
        
        return false
      }
      
      link.removeEventListener('click', handleClick)
      link.addEventListener('click', handleClick)
      
      // 设置target属性
      link.setAttribute('target', '_self')
    })
    
    console.log('已处理iframe中的链接')
  } catch (error) {
    console.warn('无法修改iframe内容，可能是跨域限制:', error)
  }
}

onMounted(() => {
  // 当组件挂载时，更新页面标题
  document.title = '路卡的自由庭院岛 - 旧版'
  
  // 定时检查并处理iframe中的链接（应对动态加载的内容）
  interval = window.setInterval(() => {
    onIframeLoad()
  }, 1000) as any as number
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
})
</script>

<style scoped>
.old-site-container {
  position:fixed;
  top:0;
  left:0;
  right:0;
  bottom:0;
  z-index: 9999999;
}

.old-site-frame {
  width: 100%;
  height: 100%;
}
</style>
<style >
.footer-com{
  display: none;
}
</style>