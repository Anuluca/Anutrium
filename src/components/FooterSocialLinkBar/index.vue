<template>
  <nav class="footer-social-links no-rem" aria-label="社交平台">
    <template v-for="social in socialLinks" :key="social.type">
      <button
        v-if="social.type === 'WEIBO'"
        class="footer-social-links__item"
        type="button"
        :aria-label="social.label"
        @click="emit('openWeibo')"
      >
        <svg
          class="footer-social-links__icon"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path :d="social.icon" />
        </svg>
        <span class="footer-social-links__label" aria-hidden="true">
          {{ social.label }}
        </span>
      </button>
      <a
        v-else
        class="footer-social-links__item"
        :href="social.href"
        :aria-label="social.label"
        :target="social.type === 'MAIL' ? undefined : '_blank'"
        :rel="social.type === 'MAIL' ? undefined : 'noopener noreferrer'"
      >
        <svg
          class="footer-social-links__icon"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path :d="social.icon" />
        </svg>
        <span class="footer-social-links__label" aria-hidden="true">
          {{ social.label }}
        </span>
      </a>
    </template>

    <span class="footer-social-links__divider" aria-hidden="true" />

    <button
      class="footer-social-links__item footer-social-links__item--steam"
      type="button"
      aria-label="STEAM"
      @click="emit('openSteam')"
    >
      <svg
        class="footer-social-links__icon"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path :d="steamPlatform.icon" fill-rule="evenodd" />
      </svg>
      <span class="footer-social-links__label" aria-hidden="true">STEAM</span>
    </button>

    <span class="footer-social-links__switch">
      <button
        class="footer-social-links__item"
        :class="{ 'is-active': switchActive }"
        type="button"
        aria-label="SWITCH"
        aria-haspopup="dialog"
        :aria-expanded="switchActive"
        @click="emit('toggleSwitch')"
      >
        <svg
          class="footer-social-links__icon"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path :d="switchPlatform.icon" fill-rule="evenodd" />
        </svg>
        <span class="footer-social-links__label" aria-hidden="true">
          SWITCH
        </span>
      </button>
      <slot name="switch-panel" />
    </span>
  </nav>
</template>

<script setup lang="ts">
import contactLinks, {
  FOOTER_SOCIAL_ORDER,
  type FooterSocialType,
} from '@/locales/modules/contactLinks'

interface FooterSocialLink {
  type: FooterSocialType
  href: string
  label: string
  icon: string
}

interface FooterPlatformItem {
  icon: string
}

withDefaults(
  defineProps<{
    switchActive?: boolean
  }>(),
  {
    switchActive: false,
  }
)

const emit = defineEmits<{
  openSteam: []
  openWeibo: []
  toggleSwitch: []
}>()

const iconPaths: Record<FooterSocialType, string> = {
  TWITTER:
    'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  WEIBO:
    'M9.72 19.69c-4.61.46-8.59-1.62-8.9-4.64-.31-3.02 3.17-5.83 7.78-6.29 4.61-.46 8.6 1.62 8.9 4.64.31 3.02-3.17 5.83-7.78 6.29zm.61-8.67c-2.29-.59-4.88.55-5.78 2.55-.91 2 .21 4.1 2.5 4.69 2.29.59 4.88-.55 5.79-2.55.9-2-.22-4.1-2.51-4.69zm-2.1 5.61c-.79.17-1.56-.28-1.73-1-.17-.73.33-1.46 1.12-1.63.79-.17 1.56.27 1.73 1 .17.72-.33 1.45-1.12 1.63zm2.39-2.07c-.28.06-.56-.1-.62-.36-.06-.26.12-.52.4-.58.29-.06.57.1.63.36.06.26-.12.52-.41.58zM20.5 13.1c.13-2.29-1.75-4.23-4.2-4.34l.17-1.67c3.47.16 6.13 2.92 5.94 6.17zm-2.67-.12c.05-.91-.7-1.68-1.67-1.72l.17-1.67c1.99.09 3.52 1.68 3.41 3.55zM14.76 9.1c-.56-.16-.37-.75-.37-.75s1.2-3.15-2.3-2.06c0 0-2.3.79-4.3 2.44l-.06.05c-.33.28-.63.6-.9.93l-.08.1c-.82 1.13.08 1.21.08 1.21l1.43.44c.63.2 1.06-.28 1.06-.28s1.45-1.43 3.22-1.94c1.77-.51 2.22-.14 2.22-.14z',
  BILIBILI:
    'M7.17 2.25 9.6 5.2h4.8l2.43-2.95 1.3 1.08-1.54 1.87H19a3 3 0 0 1 3 3v9.55a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V8.2a3 3 0 0 1 3-3h2.41L5.87 3.33zM5 7a1.2 1.2 0 0 0-1.2 1.2v9.55A1.2 1.2 0 0 0 5 18.95h14a1.2 1.2 0 0 0 1.2-1.2V8.2A1.2 1.2 0 0 0 19 7zm2.1 4.15h1.8v3.7H7.1zm8 0h1.8v3.7h-1.8z',
  GITHUB:
    'M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.79-.26.79-.58v-2.23c-3.34.72-4.03-1.42-4.03-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23A11.5 11.5 0 0 1 12 5.8c1.02 0 2.05.14 3.01.4 2.29-1.55 3.3-1.23 3.3-1.23.65 1.65.24 2.87.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.82 1.1.82 2.22v3.3c0 .32.19.69.8.57A12 12 0 0 0 12 0z',
  MAIL: 'M2 4h20v16H2zm2 2v1.18l8 5.34 8-5.34V6zm16 12V9.58l-8 5.33-8-5.33V18z',
}

const socialLabels: Record<FooterSocialType, string> = {
  TWITTER: 'X',
  WEIBO: 'WEIBO',
  BILIBILI: 'BILIBILI',
  GITHUB: 'GITHUB',
  MAIL: 'MAIL',
}

const contactLinkMap = new Map(contactLinks.map((link) => [link.type, link]))

const socialLinks = FOOTER_SOCIAL_ORDER.map((type): FooterSocialLink => {
  const link = contactLinkMap.get(type)
  if (!link) throw new Error(`Missing footer social link: ${type}`)

  return {
    ...link,
    label: socialLabels[type],
    type,
    icon: iconPaths[type],
  }
})

const steamPlatform: FooterPlatformItem = {
  icon: 'M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658a3.39 3.39 0 0 1 1.912-.59h.188l2.861-4.142v-.059a4.524 4.524 0 1 1 4.419 4.528l-4.076 2.911v.159a3.396 3.396 0 0 1-6.721.669L.436 15.27A12.004 12.004 0 1 0 11.979 0ZM7.54 18.21l-1.473-.61a2.55 2.55 0 1 0 3.274-3.457 2.53 2.53 0 0 0-1.878-.03l1.523.63a1.878 1.878 0 1 1-1.446 3.467Zm8.4-12.318a3.015 3.015 0 1 0 0 6.03 3.015 3.015 0 0 0 0-6.03Zm.007.744a2.266 2.266 0 1 1 0 4.531 2.266 2.266 0 0 1 0-4.531Z',
}

const switchPlatform: FooterPlatformItem = {
  icon: 'M10.5 2H7a5 5 0 0 0-5 5v10a5 5 0 0 0 5 5h3.5V2ZM8.5 20H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1.5v16ZM5.25 8a1.75 1.75 0 1 0 3.5 0 1.75 1.75 0 0 0-3.5 0ZM13.5 2H17a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5h-3.5V2Zm2 2v16H17a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3h-1.5Zm.75 12a1.75 1.75 0 1 1 3.5 0 1.75 1.75 0 0 1-3.5 0Z',
}
</script>

<style lang="less" scoped>
.footer-social-links {
  --collapsed-links-width: 292px;

  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
  padding-left: max(0px, calc((100% - var(--collapsed-links-width)) / 2));
  margin: 0 0 20px;
}

.footer-social-links__item {
  position: relative;
  display: grid;
  width: auto;
  height: 40px;
  box-sizing: border-box;
  grid-template-columns: 18px minmax(0, 0fr);
  column-gap: 0;
  flex: 0 0 auto;
  align-items: center;
  padding: 0 11px;
  overflow: hidden;
  border: 0;
  color: #696969;
  background: transparent;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.3s ease,
    grid-template-columns 0.4s cubic-bezier(0.16, 1, 0.3, 1),
    column-gap 0.4s cubic-bezier(0.16, 1, 0.3, 1);

  &::before {
    position: absolute;
    inset: 4px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    opacity: 0;
    content: '';
    transform: scale(0.9);
    transition: opacity 0.3s ease, transform 0.3s ease;
  }

  &::after {
    position: absolute;
    bottom: 6px;
    left: 50%;
    z-index: 1;
    width: 0;
    height: 2px;
    border-radius: 1px;
    background: #e23456;
    opacity: 0;
    content: '';
    transform: translateX(-50%);
    transition: width 0.3s ease, opacity 0.3s ease;
  }

  &:hover,
  &:focus-visible,
  &.is-active {
    color: #e23456;

    &::before {
      opacity: 1;
      transform: scale(1);
    }

    .footer-social-links__icon {
      transform: scale(1.1);
    }

    &::after {
      width: calc(100% - 32px);
      opacity: 1;
    }
  }

  &:focus-visible {
    outline: 1px solid #e23456;
    outline-offset: 1px;
  }
}

.footer-social-links__switch {
  --switch-icon-center: 20px;

  position: relative;
  display: flex;
  flex: 0 0 auto;
}

.footer-social-links__divider {
  position: relative;
  width: 12px;
  height: 18px;
  flex: 0 0 12px;

  &::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    background: rgba(105, 105, 105, 0.55);
    content: '';
    transform: translateX(-50%);
  }
}

.footer-social-links__icon {
  position: relative;
  z-index: 1;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  transition: color 0.3s ease, transform 0.3s ease;
}

.footer-social-links__item--steam {
  .footer-social-links__icon {
    width: 16px;
    height: 16px;
    flex-basis: 16px;
    margin-left: 1px;
  }

  &:hover,
  &:focus-visible,
  &.is-active {
    .footer-social-links__icon {
      transform: scale(1.08);
    }
  }
}

.footer-social-links__label {
  position: relative;
  z-index: 1;
  display: block;
  min-width: 0;
  overflow: hidden;
  font-family: 'anton', 'alibaba-puhuiti', sans-serif;
  font-size: 11px;
  letter-spacing: 0.7px;
  line-height: 1;
  white-space: nowrap;
  opacity: 0;
  transform: translateX(-6px);
  transition: opacity 0.2s ease 0.08s,
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (hover: hover) and (pointer: fine) {
  .footer-social-links__item:hover,
  .footer-social-links__item:focus-visible,
  .footer-social-links__item.is-active {
    grid-template-columns: 18px minmax(0, 1fr);
    column-gap: 8px;

    .footer-social-links__label {
      opacity: 1;
      transform: translateX(0);
    }
  }
}

@media screen and (max-aspect-ratio: 1) {
  .footer-social-links.no-rem {
    justify-content: center;
    padding-left: 0;
    margin-bottom: 18px;
  }

  .footer-social-links.no-rem .footer-social-links__item {
    display: flex;
    width: clamp(32px, 9vw, 36px);
    height: clamp(32px, 9vw, 36px);
    justify-content: center;
    padding: 0;
  }

  .footer-social-links.no-rem .footer-social-links__icon {
    width: clamp(16px, 4.4vw, 18px);
    height: clamp(16px, 4.4vw, 18px);
    flex-basis: clamp(16px, 4.4vw, 18px);
  }

  .footer-social-links.no-rem .footer-social-links__label {
    display: none;
    margin-left: 0;
  }

  .footer-social-links.no-rem
    .footer-social-links__item--steam
    .footer-social-links__icon {
    width: clamp(14px, 3.9vw, 16px);
    height: clamp(14px, 3.9vw, 16px);
    flex-basis: clamp(14px, 3.9vw, 16px);
    margin-left: 0;
  }

  .footer-social-links.no-rem .footer-social-links__switch {
    --switch-icon-center: clamp(16px, 4.5vw, 18px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .footer-social-links__item::before,
  .footer-social-links__item::after,
  .footer-social-links__item,
  .footer-social-links__icon,
  .footer-social-links__label {
    transition: none;
  }
}
</style>
