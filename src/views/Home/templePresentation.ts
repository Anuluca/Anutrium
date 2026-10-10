import type { TempleCategoryId } from '@/config/templeNavigation'

export type TemplePresentationId = 'desktop' | 'mobile'

export interface TemplePresentation {
  id: TemplePresentationId
  routeShell: 'island-pc' | 'island-mobile'
  scene: {
    positions: Partial<Record<TempleCategoryId, { x: number; z: number }>>
    obeliskWidthScale: number
    homeCamera: { minDistance: number; aspectDistance: number }
    focus: {
      outerPlacement: number
      innerPlacement: number
      screenOffset: number
    }
  }
  raycastObelisks: boolean
  menu: {
    layout: 'sidebar' | 'fullscreen'
    styles: Record<string, string>
  }
}

const desktopMenuStyles = {
  '--temple-content-inset':
    'calc(var(--header-inline-padding) + var(--header-menu-item-padding))',
  '--temple-menu-width': 'calc(50vw - var(--temple-content-inset))',
  '--temple-menu-shade':
    'linear-gradient(var(--temple-menu-shade-direction), rgba(0,0,0,0.94) 0%, rgba(0,0,0,0.82) 28%, rgba(0,0,0,0.38) 45%, transparent 62%)',
  '--temple-menu-enter-offset': 'translateY(16px)',
  '--temple-menu-visible-offset': 'translateY(0)',
  '--temple-menu-header-gap': '40px',
}

// 两端共用页面、材质和动画；这里只描述构图、命中方式与菜单排版的差异。
export const templePresentations: Record<
  TemplePresentationId,
  TemplePresentation
> = {
  desktop: {
    id: 'desktop',
    routeShell: 'island-pc',
    scene: {
      positions: {},
      obeliskWidthScale: 1,
      homeCamera: { minDistance: 17.5, aspectDistance: 31 },
      focus: { outerPlacement: 0.6, innerPlacement: 0.5, screenOffset: 0.05 },
    },
    raycastObelisks: false,
    menu: { layout: 'sidebar', styles: desktopMenuStyles },
  },
  mobile: {
    id: 'mobile',
    routeShell: 'island-mobile',
    scene: {
      positions: {
        archive: { x: -3.05, z: 3 },
        flanerie: { x: -2.45, z: -4.8 },
        pokeyard: { x: 2.45, z: -4.8 },
        island: { x: 3.05, z: 3 },
      },
      obeliskWidthScale: 0.65,
      homeCamera: { minDistance: 22, aspectDistance: 10 },
      focus: { outerPlacement: 0, innerPlacement: 0, screenOffset: 0 },
    },
    raycastObelisks: true,
    menu: {
      layout: 'fullscreen',
      styles: {
        ...desktopMenuStyles,
        '--temple-menu-width': '100%',
        '--temple-menu-shade': '#000',
        '--temple-menu-padding':
          'max(90px, env(safe-area-inset-top)) 24px max(90px, env(safe-area-inset-bottom))',
        '--temple-menu-header-gap': '48px',
        '--temple-menu-compact-padding-top': '80px',
        '--temple-menu-compact-padding-bottom': '64px',
      },
    },
  },
}
