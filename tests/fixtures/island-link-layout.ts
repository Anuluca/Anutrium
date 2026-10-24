import { createApp, h, nextTick, onBeforeUpdate, ref, shallowRef } from 'vue'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'

import IslandFocusLayout from '../../src/views/Home/components/IslandFocusLayout.vue'
import type { IslandModelAnchors } from '../../src/views/Home/templeScene'

export async function mountIslandLayout(
  mobile = false,
  reactiveAnchors = false
) {
  const layout = shallowRef<{
    updateAnchors: (anchors: IslandModelAnchors) => void
  }>()
  const anchors = shallowRef<IslandModelAnchors | null>(null)
  const isMobile = ref(mobile)
  const updates = { parent: 0, layout: 0 }
  const i18n = createI18n({
    legacy: false,
    locale: 'zh',
    messages: {
      zh: {
        island: {
          modules: {
            notes: { studyNotes: { data: [] } },
            photography: {
              merch: { data: {}, img: 'https://placehold.co/32x32' },
            },
          },
        },
      },
      en: {
        island: {
          modules: {
            notes: { studyNotes: { data: [] } },
            photography: {
              merch: { data: {}, img: 'https://placehold.co/32x32' },
            },
          },
        },
      },
    },
  })
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => null } },
      { path: '/:pathMatch(.*)*', component: { render: () => null } },
    ],
  })
  const app = createApp({
    setup() {
      onBeforeUpdate(() => updates.parent++)
      return () =>
        h(IslandFocusLayout, {
          ref: layout,
          mobile: isMobile.value,
          ...(reactiveAnchors ? { anchors: anchors.value } : {}),
        })
    },
  })
  app.use(router).use(i18n)
  await router.push('/')
  app.mount('#app')
  await document.fonts.ready
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  const root = document.querySelector('.island-focus') as HTMLElement & {
    __vueParentComponent: any
  }
  const instance = root.__vueParentComponent
  ;(instance.bu ||= []).push(() => updates.layout++)
  const updateAnchors = layout.value?.updateAnchors
  return {
    root,
    updates,
    router,
    async update(value: IslandModelAnchors) {
      if (reactiveAnchors) anchors.value = value
      else updateAnchors!(value)
      await nextTick()
    },
    async setMobile(value: boolean) {
      isMobile.value = value
      await nextTick()
    },
    async setLocale(value: 'zh' | 'en') {
      i18n.global.locale.value = value
      await nextTick()
    },
    unmount: () => app.unmount(),
  }
}
