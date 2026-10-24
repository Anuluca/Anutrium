import { createApp, h } from 'vue'
import { createPinia } from 'pinia'

import CursorMove from '../../src/components/CursorMove/index.vue'

// 隔离页面其他动画，测量光标形状过渡本身的布局次数。
createApp({ render: () => h(CursorMove) })
  .use(createPinia())
  .mount('#cursor-fixture')
