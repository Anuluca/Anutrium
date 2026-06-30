<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Message } from '@element-plus/icons-vue'
import { ElLoading } from 'element-plus'

import githubImg from '@/assets/img/github_profile.png'
import twitterImg from '@/assets/img/twitter_profile.png'
import type { ContactLink, ContactType } from '@/locales/modules/contactLinks'
import { visualState } from '@/stores'
import { persistLocale, type SiteLocale } from '@/utils/locale'

import './index.less'

import 'element-plus/es/components/loading/style/css'

interface SocialItem {
  type: Extract<ContactType, 'TWITTER' | 'BILIBILI' | 'GITHUB' | 'MAIL'>
  label: string
  href: string
  image?: string
}

interface BottomLineItem {
  title: string
  sort: string
  color: string
  date: string
  href: string
}

interface BottomLineData {
  intro: string
  lastUpdate: string
  recommand: BottomLineItem[]
}

const BILIBILI_IMG = 'https://assets.anuluca.com/other/bilibili_profile.jpg'
const props = defineProps({
  entryActive: {
    type: Boolean,
    default: false,
  },
})

const WEIBO_WIDGET_URL =
  'https://widget.weibo.com/weiboshow/index.php?language=&width=0&height=520&fansRow=1&ptype=1&speed=0&skin=10&isTitle=1&noborder=1&isWeibo=1&isFans=1&uid=7738638501&verifier=4838f435&dpc=1'

const { locale, tm } = useI18n()
const router = useRouter()
const route = useRoute()
const visualStateStore = visualState()

const bottomLineData = computed(
  () => tm('bottomLine') as unknown as BottomLineData
)
const contactLinks = computed(
  () => tm('contactLinks') as unknown as ContactLink[]
)
const getContactLink = (type: ContactType) =>
  contactLinks.value.find((item) => item.type === type)
const socialItems = computed<SocialItem[]>(() => [
  {
    type: 'TWITTER',
    label: 'TWITTER',
    href: getContactLink('TWITTER')!.href,
    image: twitterImg,
  },
  {
    type: 'BILIBILI',
    label: 'BILIBILI',
    href: getContactLink('BILIBILI')!.href,
    image: BILIBILI_IMG,
  },
  {
    type: 'GITHUB',
    label: 'GITHUB',
    href: getContactLink('GITHUB')!.href,
    image: githubImg,
  },
  {
    type: 'MAIL',
    label: 'MAIL',
    href: getContactLink('MAIL')!.href,
  },
])
const mailItem = computed(
  () => socialItems.value.find((item) => item.type === 'MAIL')!
)
const weiboProfileUrl = computed(() => getContactLink('WEIBO')!.href)

const fullFooter = computed(() => router.currentRoute.value.meta.fullFooter)
const currentRouter = computed(() => route.path)
const theme = ref(false)
const isScrollingDown = ref<boolean>(false)
const isMotionPaused = ref(false)
const footerExpanded = ref(false)
const weiboSrc = ref('')
const marqueeContent = ref<HTMLElement | null>(null)
const marqueeDuration = ref('24s')
let footerAnimationTimer: number | null = null
let reducedMotionQuery: MediaQueryList | null = null
let hasPlayedEntryAnimation = false

onMounted(() => {
  nextTick(updateMarqueeDuration)
  if (props.entryActive) {
    nextTick(initFooterAnimation)
  }
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  updateMotionState()
  window.addEventListener('resize', updateMarqueeDuration, { passive: true })
  document.addEventListener('visibilitychange', updateMotionState)
  reducedMotionQuery.addEventListener('change', updateMotionState)
})

onUnmounted(() => {
  if (footerAnimationTimer !== null) {
    window.clearTimeout(footerAnimationTimer)
  }
  window.removeEventListener('resize', updateMarqueeDuration)
  document.removeEventListener('visibilitychange', updateMotionState)
  reducedMotionQuery?.removeEventListener('change', updateMotionState)
})

const updateMotionState = () => {
  isMotionPaused.value =
    document.visibilityState === 'hidden' || !!reducedMotionQuery?.matches
}

const updateMarqueeDuration = () => {
  const contentWidth = marqueeContent.value?.scrollWidth ?? 0
  if (!contentWidth) return

  const duration = Math.min(52, Math.max(12, contentWidth / 46))
  marqueeDuration.value = `${duration.toFixed(2)}s`
}

const initFooterAnimation = () => {
  if (hasPlayedEntryAnimation) return
  hasPlayedEntryAnimation = true
  footerExpanded.value = false

  footerAnimationTimer = window.setTimeout(() => {
    footerExpanded.value = true
    theme.value = localStorage.getItem('theme') === 'dark'
  }, 400)
}

const changeLanguage = (lang: SiteLocale) => {
  persistLocale(lang)
  locale.value = lang
}

const changeTheme = () => {
  const newTheme = theme.value ? 'dark' : 'light'

  if (currentRouter.value === '/') {
    const loadingInstance = ElLoading.service({
      fullscreen: true,
      background: 'rgba(0, 0, 0, 0.2)',
      spinner: '1',
    })

    setTimeout(() => {
      visualStateStore.setTheme(newTheme)
    }, 150)

    setTimeout(() => {
      loadingInstance.close()
    }, 150)
  } else {
    visualStateStore.setTheme(newTheme)
  }
}

const loadWeiboWidget = () => {
  if (!weiboSrc.value) {
    weiboSrc.value = WEIBO_WIDGET_URL
  }
}

watch(
  () => props.entryActive,
  (entryActive) => {
    if (entryActive) {
      nextTick(initFooterAnimation)
    }
  }
)

watch(locale, () => nextTick(updateMarqueeDuration))
</script>

<template>
  <div
    :class="{
      'footer-com': true,
      'full-footer': fullFooter,
      'footer-ready': props.entryActive,
      'footer-expanded': footerExpanded,
      'scrolling-down': isScrollingDown,
      'motion-paused': isMotionPaused,
    }"
  >
    <div class="left">
      <div class="language">
        <el-button
          link
          type="danger"
          class="chinese"
          :disabled="locale === 'zhCn'"
          @click="changeLanguage('zhCn')"
        >
          汉语
        </el-button>
        <el-button link type="danger" disabled>|</el-button>
        <el-button
          link
          type="danger"
          :disabled="locale === 'en'"
          @click="changeLanguage('en')"
        >
          En
        </el-button>
      </div>
    </div>

    <div class="center">
      <div class="expand">
        <div
          class="marquee-wrap"
          :style="{ '--footer-marquee-duration': marqueeDuration }"
        >
          <div ref="marqueeContent" class="marquee-content">
            <span class="recommend">
              <a
                v-for="(item, key) in bottomLineData.recommand"
                :key="key"
                style="color: white"
                :href="item.href"
              >
                「
                <span
                  :style="[
                    {
                      color: item.color || '#5F9DDD',
                      fontWeight: 600,
                    },
                  ]"
                  >{{ item.title }}{{ item.sort ? `/${item.sort}` : '' }}</span
                >
                」
                <span style="color: #ffffff96">{{ item.date }}</span>
                &nbsp;
              </a>
            </span>
            <b>{{ bottomLineData.intro }}</b>
          </div>
          <div class="marquee-content" aria-hidden="true">
            <span class="recommend">
              <a
                v-for="(item, key) in bottomLineData.recommand"
                :key="key"
                style="color: white"
                :href="item.href"
                tabindex="-1"
              >
                「
                <span
                  :style="[
                    {
                      color: item.color || '#5F9DDD',
                      fontWeight: 600,
                    },
                  ]"
                  >{{ item.title }}{{ item.sort ? `/${item.sort}` : '' }}</span
                >
                」
                <span style="color: #ffffff96">{{ item.date }}</span>
                &nbsp;
              </a>
            </span>
            <b>{{ bottomLineData.intro }}</b>
          </div>
        </div>
      </div>
    </div>

    <div class="right">
      <div class="text-links">
        <span
          v-for="social in socialItems.slice(0, 1)"
          :key="social.type"
          class="social-link"
          :class="`social-link--${social.type.toLowerCase()}`"
        >
          <a
            class="social-preview"
            :href="social.href"
            :target="social.type === 'MAIL' ? undefined : '_blank'"
            :rel="social.type === 'MAIL' ? undefined : 'noopener noreferrer'"
            :aria-label="`${social.label} profile`"
          >
            <img :src="social.image" :alt="`${social.label} profile`" />
          </a>
          <a
            class="social-trigger"
            :href="social.href"
            :target="social.type === 'MAIL' ? undefined : '_blank'"
            :rel="social.type === 'MAIL' ? undefined : 'noopener noreferrer'"
          >
            {{ social.label }}
          </a>
        </span>
        <span
          class="social-link social-link--weibo"
          @mouseenter="loadWeiboWidget"
          @focusin="loadWeiboWidget"
        >
          <div class="social-preview social-preview--weibo">
            <iframe
              v-if="weiboSrc"
              title="Anuluca Weibo"
              class="share_self"
              frameborder="0"
              scrolling="no"
              :src="weiboSrc"
            />
          </div>
          <a
            class="social-trigger"
            :href="weiboProfileUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            WEIBO
          </a>
        </span>
        <span
          v-for="social in socialItems.filter(
            (item) => item.type !== 'TWITTER' && item.type !== 'MAIL'
          )"
          :key="social.type"
          class="social-link"
          :class="`social-link--${social.type.toLowerCase()}`"
        >
          <a
            class="social-preview"
            :href="social.href"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="`${social.label} profile`"
          >
            <img :src="social.image" :alt="`${social.label} profile`" />
          </a>
          <a
            class="social-trigger"
            :href="social.href"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ social.label }}
          </a>
        </span>
        <span class="social-link social-link--mail">
          <a
            class="social-preview"
            :href="mailItem.href"
            aria-label="Open mail client"
          >
            <span class="mail-preview__icon" aria-hidden="true">
              <el-icon><Message /></el-icon>
            </span>
            <span class="mail-preview__content">tilucario@outlook.com</span>
          </a>
          <a class="social-trigger" :href="mailItem.href">MAIL</a>
        </span>
      </div>
      <button class="mark" type="button" @click="router.push('/')">
        LAST UPDATE： {{ bottomLineData.lastUpdate }}
      </button>
      <el-switch
        v-model="theme"
        class="is-clickable"
        style="
          --el-switch-on-color: #1a1a1aa8;
          --el-switch-off-color: #ffffff1f;
        "
        @change="changeTheme()"
      />
    </div>
  </div>
</template>
