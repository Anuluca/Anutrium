<template>
  <div class="entity-tool main-container">
    <div class="pt-header">
      <div class="pt-header__tag" @click="handleTagClick">CRAFT</div>
      <h1 class="pt-header__title">HTML常用转义字符</h1>
      <p class="pt-header__sub">
        搜索常用 HTML 实体，点击字符、实体名或编号即可复制。
        <span class="pt-header__motto">// HUAHUA_THE_CAT</span>
      </p>
    </div>

    <div class="pt-grid">
      <div class="pt-panel entity-stage">
        <label class="search-box">
          <span>SEARCH</span>
          <input
            v-model.trim="keyword"
            type="search"
            placeholder="搜索：空格 / amp / 引号 / <"
          />
        </label>

        <div class="entity-grid">
          <button
            v-for="entity in filteredEntities"
            :key="entity.name"
            class="entity-card"
            @click="copyText(entity.name)"
          >
            <strong>{{ visibleChar(entity.char) }}</strong>
            <span>{{ entity.label }}</span>
            <code>{{ entity.name }}</code>
          </button>
        </div>

        <div v-if="filteredEntities.length === 0" class="empty-state">
          <span>没有匹配的常用转义字符</span>
        </div>

        <div class="corner-img corner--tl" />
        <div class="corner-img corner--tr" />
        <div class="corner-img corner--bl" />
        <div class="corner-img corner--br" />
      </div>

      <div class="right-panel entity-detail">
        <div class="pt-panel-title">
          <span>[ 快速复制 ]</span>
        </div>

        <div class="quick-list">
          <div
            v-for="entity in filteredEntities"
            :key="entity.name"
            class="quick-row"
          >
            <div>
              <strong>{{ entity.label }}</strong>
              <span>{{ entity.desc }}</span>
            </div>
            <button class="pt-btn glyph-btn" @click="copyText(entity.char)">
              <span>{{ visibleChar(entity.char) }}</span>
            </button>
            <button class="pt-btn" @click="copyText(entity.name)">
              <span>{{ entity.name }}</span>
            </button>
          </div>
        </div>

        <div class="copy-status">
          <span>{{
            copiedText ? `已复制：${copiedText}` : '点击任意按钮复制对应内容'
          }}</span>
        </div>

        <div class="corner corner--tl" />
        <div class="corner corner--tr" />
        <div class="corner corner--bl" />
        <div class="corner corner--br" />
        <div class="crystal-container">
          <CrystalLogo />
        </div>
      </div>
    </div>

    <div class="footer-wrap">
      <PageFooter
        :third-party="true"
        :recommended-tools="recommendedTools"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

import CrystalLogo from '@/components/CrystalLogo/index.vue'
import PageFooter from '@/components/PageFooter/index.vue'

interface HtmlEntity {
  char: string
  desc: string
  label: string
  name: string
  search: string
}

const router = useRouter()
const keyword = ref('')
const copiedText = ref('')

const recommendedTools = [
  { label: 'HTML常用转义字符', path: '/htmlEntities' },
  { label: 'Base64加解密', path: '/base64Codec' },
  { label: '图片转Base64', path: '/imageBase64' },
]

const entities: HtmlEntity[] = [
  {
    char: '◻️',
    name: '&nbsp;',
    label: '空格',
    desc: '不换行空格',
    search: 'space nbsp kongge 空格',
  },
  {
    char: '<',
    name: '&lt;',
    label: '小于号',
    desc: '左尖括号',
    search: 'lt less than xiaoyu 小于 <',
  },
  {
    char: '>',
    name: '&gt;',
    label: '大于号',
    desc: '右尖括号',
    search: 'gt greater than dayu 大于 >',
  },
  {
    char: '&',
    name: '&amp;',
    label: '与号',
    desc: 'Ampersand',
    search: 'amp and yu 与号 &',
  },
  {
    char: '"',
    name: '&quot;',
    label: '双引号',
    desc: 'Double quote',
    search: 'quot quote shuangyinhao 双引号 "',
  },
  {
    char: "'",
    name: '&apos;',
    label: '单引号',
    desc: 'Apostrophe',
    search: 'apos quote danyinhao 单引号 apostrophe',
  },
  {
    char: '©',
    name: '&copy;',
    label: '版权',
    desc: 'Copyright',
    search: 'copy copyright banquan 版权',
  },
  {
    char: '®',
    name: '&reg;',
    label: '注册商标',
    desc: 'Registered',
    search: 'reg registered zhuce 注册',
  },
  {
    char: '™',
    name: '&trade;',
    label: '商标',
    desc: 'Trademark',
    search: 'trade trademark shangbiao 商标',
  },
  {
    char: '€',
    name: '&euro;',
    label: '欧元',
    desc: 'Euro',
    search: 'euro ouyuan 欧元',
  },
  {
    char: '¥',
    name: '&yen;',
    label: '日元/人民币',
    desc: 'Yen or yuan',
    search: 'yen yuan renminbi riyuan 日元 人民币',
  },
  {
    char: '£',
    name: '&pound;',
    label: '英镑',
    desc: 'Pound',
    search: 'pound yingbang 英镑',
  },
  {
    char: '¢',
    name: '&cent;',
    label: '美分',
    desc: 'Cent',
    search: 'cent meifen 美分',
  },
  {
    char: '§',
    name: '&sect;',
    label: '章节',
    desc: 'Section',
    search: 'sect section zhangjie 章节',
  },
  {
    char: '¶',
    name: '&para;',
    label: '段落',
    desc: 'Paragraph',
    search: 'para paragraph duanluo 段落',
  },
  {
    char: '•',
    name: '&bull;',
    label: '项目符号',
    desc: 'Bullet',
    search: 'bull bullet xiangmu 项目符号',
  },
  {
    char: '…',
    name: '&hellip;',
    label: '省略号',
    desc: 'Ellipsis',
    search: 'hellip ellipsis shenglue 省略号',
  },
  {
    char: '–',
    name: '&ndash;',
    label: '短横线',
    desc: 'En dash',
    search: 'ndash en dash duanheng 短横线',
  },
  {
    char: '—',
    name: '&mdash;',
    label: '长横线',
    desc: 'Em dash',
    search: 'mdash em dash changheng 长横线',
  },
  {
    char: '×',
    name: '&times;',
    label: '乘号',
    desc: 'Times',
    search: 'times multiply chenghao 乘号',
  },
  {
    char: '÷',
    name: '&divide;',
    label: '除号',
    desc: 'Divide',
    search: 'divide chuhao 除号',
  },
  {
    char: '±',
    name: '&plusmn;',
    label: '正负号',
    desc: 'Plus minus',
    search: 'plusmn plus minus zhengfu 正负',
  },
  {
    char: '°',
    name: '&deg;',
    label: '度数',
    desc: 'Degree',
    search: 'deg degree dushu 度数',
  },
  {
    char: '→',
    name: '&rarr;',
    label: '右箭头',
    desc: 'Right arrow',
    search: 'rarr arrow right youjiantou 右箭头',
  },
]

const filteredEntities = computed(() => {
  const value = keyword.value.toLowerCase()
  if (!value) return entities

  return entities.filter((entity) => {
    return `${entity.char} ${entity.name} ${entity.label} ${entity.desc} ${entity.search}`
      .toLowerCase()
      .includes(value)
  })
})

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedText.value = text
    ElMessage.success('复制成功')
    setTimeout(() => {
      if (copiedText.value === text) copiedText.value = ''
    }, 1800)
  } catch (err) {
    ElMessage.error('复制失败，请手动复制')
    console.error('Copy failed', err)
  }
}

const visibleChar = (char: string) => {
  return char === '\u00A0' ? '␠' : char
}

const handleTagClick = () => {
  router.push('/craft')
}
</script>

<style lang="less" scoped>
@red: #e8284a;
@red-dim: rgba(232, 40, 74, 0.15);
@surface: #140a0c;
@border: rgba(255, 255, 255, 0.07);
@text: #ffffff;
@muted: rgba(255, 255, 255, 0.45);
@mono: 'source-han-sans-simplified-c', monospace;

.font-squish(@origin: center) {
  font-family: 'STSong', serif;
  display: inline-block;
  transform: scaleX(0.9);
  transform-origin: @origin;
}

@keyframes tacticalIn {
  from {
    opacity: 0;
    transform: translateY(15px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.entity-tool {
  color: @text;
  font-family: 'Unbounded Sans', system-ui, sans-serif;
}

.pt-header,
.entity-stage,
.entity-detail,
.footer-wrap {
  animation: tacticalIn 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.entity-stage {
  animation-delay: 0.1s;
}

.entity-detail {
  animation-delay: 0.15s;
}

.footer-wrap {
  animation-delay: 0.25s;
}

.pt-header {
  margin-bottom: 20px;
  border-bottom: 1px solid @border;
  padding-bottom: 20px;

  &__tag {
    .font-squish(left);
    font-size: 14px;
    color: #3276fe;
    letter-spacing: 0.1em;
    margin-bottom: 12px;
    cursor: pointer;
    position: relative;
    transition: color 0.2s ease, margin 0.2s ease;
    user-select: none;

    &::before {
      content: '// ';
    }

    &:hover {
      color: @red;
      margin-left: -4px;

      &::before {
        content: '<< ';
        color: @red;
      }
    }
  }

  &__title {
    font-size: 42px;
    font-family: 'Unbounded Sans';
    letter-spacing: 0.05em;
    margin: 0 0 12px;
  }

  &__sub {
    font-size: 16px;
    color: @muted;
    margin: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
  }

  &__motto {
    font-family: @mono;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.15);
    white-space: nowrap;
  }
}

.pt-grid {
  display: grid;
  grid-template-columns: 5fr 2fr;
  gap: 30px 0;
  align-items: stretch;
}

.pt-panel,
.right-panel {
  position: relative;
  min-height: 600px;
  display: flex;
  flex-direction: column;
}

.pt-panel {
  background: linear-gradient(150deg, #25252587 0%, rgba(68, 5, 18, 0.35) 100%);
  padding: 30px;
  overflow: hidden;
}

.right-panel {
  background: @surface;
  border: 1px solid @border;
  padding: 30px;
}

.corner,
.corner-img {
  position: absolute;
  width: 12px;
  height: 12px;
  pointer-events: none;
  z-index: 5;

  &--tl {
    top: -1px;
    left: -1px;
    border-top: 2px solid @red;
    border-left: 2px solid @red;
  }

  &--tr {
    top: -1px;
    right: -1px;
    border-top: 2px solid @red;
    border-right: 2px solid @red;
  }

  &--bl {
    bottom: -1px;
    left: -1px;
    border-bottom: 2px solid @red;
    border-left: 2px solid @red;
  }

  &--br {
    bottom: -1px;
    right: -1px;
    border-bottom: 2px solid @red;
    border-right: 2px solid @red;
  }

  &.corner-img {
    &.corner--tl {
      top: 10px;
      left: 10px;
      border-color: #50505076;
    }

    &.corner--tr {
      top: 10px;
      right: 10px;
      border-color: #50505076;
    }

    &.corner--bl {
      bottom: 10px;
      left: 10px;
      border-color: #50505076;
    }

    &.corner--br {
      bottom: 10px;
      right: 10px;
      border-color: #50505076;
    }
  }
}

.entity-stage {
  background: linear-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
    radial-gradient(circle at 28% 24%, rgba(232, 40, 74, 0.18), transparent 34%),
    #090406;
  background-size: 36px 36px, 36px 36px, auto, auto;
  gap: 12px;
}

.search-box {
  border: 1px solid @border;
  background: rgba(9, 4, 6, 0.74);
  padding: 14px;
  display: grid;
  gap: 10px;

  span {
    .font-squish(left);
    color: @muted;
    font-size: 14px;
  }

  input {
    width: 100%;
    border: 1px solid @border;
    background: #0d0608;
    color: @text;
    font-size: 16px;
    padding: 12px 14px;
    outline: none;

    &:focus {
      border-color: @red;
    }
  }
}

.entity-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  height: 750px;
  padding-top: 10px;
  overflow-y: auto;
}

.entity-card {
  min-height: 126px;
  border: 1px solid @border;
  background: rgba(20, 10, 12, 0.84);
  color: @text;
  cursor: pointer;
  display: grid;
  gap: 8px;
  align-content: center;
  justify-items: center;
  transition: all 0.2s ease;

  strong {
    font-family: 'Anton', sans-serif;
    font-size: 40px;
    line-height: 1;
  }

  span {
    .font-squish(center);
    color: @muted;
    font-size: 13px;
  }

  code {
    color: @red;
    font-family: @mono;
    font-size: 13px;
  }

  &:hover {
    border-color: @red;
    background: @red-dim;
    transform: translateY(-2px);
  }
}

.pt-panel-title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: @muted;
  margin-bottom: 24px;

  span {
    .font-squish(left);
    font-size: 14px;
  }
}

.quick-list {
  display: grid;
  gap: 10px;
  max-height: 740px;
  margin-bottom: 10px;
  overflow-y: auto;
  padding-right: 4px;
}

.quick-row {
  border: 1px solid @border;
  background: rgba(9, 4, 6, 0.64);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px auto auto;
  gap: 8px;
  align-items: center;
  padding: 10px;

  strong,
  span {
    .font-squish(left);
    display: block;
  }

  strong {
    font-size: 13px;
    color: @text;
  }

  span {
    color: @muted;
    font-size: 12px;
    margin-top: 4px;
  }
}

.pt-btn {
  background: transparent;
  border: 1px solid @border;
  color: @text;
  cursor: pointer;
  padding: 8px 10px;
  transition: all 0.2s ease;

  span {
    .font-squish(center);
    font-size: 12px;
  }

  &:hover {
    border-color: @red;
    color: @red;
    background: @red-dim;
  }
}

.glyph-btn span {
  transform: none;
}

.copy-status,
.empty-state {
  margin-top: auto;
  border: 1px solid @border;
  background: rgba(9, 4, 6, 0.74);
  padding: 14px;
  color: @muted;

  span {
    .font-squish(left);
    font-size: 13px;
  }
}

.crystal-container {
  position: absolute;
  top: 15px;
  right: 32px;
  z-index: 1;
}

@media (max-width: 1100px) {
  .entity-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .pt-grid {
    grid-template-columns: 1fr;
  }

  .pt-panel,
  .right-panel {
    min-height: 480px;
  }

  .pt-header__sub {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}

@media (max-width: 600px) {
  .pt-header__title {
    font-size: 32px;
  }

  .entity-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
