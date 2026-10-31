import { nextTick, onBeforeUnmount, ref, shallowRef } from 'vue'

import type { MerchCollection } from '@/types/merch'

export function useCollectionDialog() {
  const openedCollection = shallowRef<MerchCollection | null>(null)
  const collectionOrigin = shallowRef<HTMLElement | null>(null)
  const collectionVisible = ref(false)
  const collectionClosing = ref(false)
  const collectionHost = shallowRef<HTMLElement | null>(null)
  const collectionReturning = ref(false)
  let returnGhost: HTMLElement | null = null
  let returnAnimations: Animation[] = []
  const clearCollectionReturn = () => {
    returnAnimations.forEach((animation) => animation.cancel())
    returnAnimations = []
    returnGhost?.remove()
    returnGhost = null
  }
  const returnCollectionToShelf = async (remainingMs: number) => {
    const shell = collectionHost.value?.querySelector<HTMLElement>(
      '.collection-card-shell'
    )
    if (!shell || !collectionClosing.value || collectionReturning.value) return
    clearCollectionReturn()
    // 高层仅留下无交互的封面快照，真实盒子提前回到原有层叠上下文。
    // 只复制封面与文案，避免复制画廊图片、预览节点及其大批子节点。
    const ghost = shell.cloneNode(false) as HTMLElement
    const card = shell.querySelector('.collection-card')!
    const cardGhost = card.cloneNode(false) as HTMLElement
    for (const child of Array.from(card.children)) {
      if (child.classList.contains('collection-card__media')) {
        const media = child.cloneNode(false)
        for (const layer of Array.from(child.children)) {
          if (!layer.classList.contains('collection-card__gallery'))
            media.appendChild(layer.cloneNode(true))
        }
        cardGhost.appendChild(media)
      } else cardGhost.appendChild(child.cloneNode(true))
    }
    ghost.appendChild(cardGhost)
    ghost.classList.remove('is-expanded', 'is-closing')
    ghost.classList.add('collection-return-ghost')
    ghost.setAttribute('aria-hidden', 'true')
    ghost.setAttribute('inert', '')
    Object.assign(ghost.style, {
      position: 'absolute',
      inset: '0',
      pointerEvents: 'none',
      transform: 'none',
    })
    collectionHost.value!.appendChild(ghost)
    returnGhost = ghost
    collectionReturning.value = true
    await nextTick()
    if (returnGhost !== ghost || !shell.isConnected) return
    const options: KeyframeAnimationOptions = {
      duration: remainingMs,
      easing: 'linear',
      fill: 'forwards',
    }
    // 底层卡片保持不透明；两层同时交叉淡化会降低合成不透明度，形成暗闪。
    returnAnimations = [
      ghost.animate([{ opacity: 1 }, { opacity: 0 }], options),
    ]
  }
  const finishCollectionClose = () => {
    clearCollectionReturn()
    openedCollection.value = null
    collectionReturning.value = false
    collectionClosing.value = false
  }
  onBeforeUnmount(clearCollectionReturn)

  const openCollection = (
    collection: MerchCollection,
    element: HTMLElement
  ) => {
    if (openedCollection.value) return
    collectionOrigin.value = element
    collectionReturning.value = false
    collectionClosing.value = false
    openedCollection.value = collection
    collectionVisible.value = true
  }
  return {
    openedCollection,
    collectionOrigin,
    collectionVisible,
    collectionClosing,
    collectionHost,
    collectionReturning,
    returnCollectionToShelf,
    finishCollectionClose,
    openCollection,
  }
}
