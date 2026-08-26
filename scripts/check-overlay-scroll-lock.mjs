import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const projectRoot = process.cwd()
const sourceRoot = path.join(projectRoot, 'src')
const modalWrapperFile = 'src/components/ModalWrapper/index.vue'
const safeImageViewerFile = 'src/components/SafeImageViewer/index.vue'
const safeMessageBoxFile = 'src/utils/scrollSafeMessageBox.ts'
const checkedExtensions = new Set([
  '.css',
  '.js',
  '.jsx',
  '.less',
  '.mjs',
  '.ts',
  '.tsx',
  '.vue',
])
const safeAdapters = [
  {
    component: 'ElDialog',
    file: modalWrapperFile,
    usage: /\bElDialog\b|<el-dialog\b/,
  },
  {
    component: 'ElImageViewer',
    file: safeImageViewerFile,
    usage: /\bElImageViewer\b|<el-image-viewer\b/,
  },
  {
    component: 'ElMessageBox',
    file: safeMessageBoxFile,
    usage: /\bElMessageBox\b/,
  },
]
const allowedBodyLockClasses = [
  'island-mobile-shell',
  'island-pc-shell',
  'not-found-no-scroll',
]
const violations = []

const normalizePath = (filePath) =>
  path.relative(projectRoot, filePath).split(path.sep).join('/')

const collectFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return collectFiles(entryPath)
      return checkedExtensions.has(path.extname(entry.name)) ? [entryPath] : []
    })
  )

  return files.flat()
}

const report = (file, message) => violations.push(`${file}: ${message}`)
const sourceFiles = await collectFiles(sourceRoot)
const sourceEntries = await Promise.all(
  sourceFiles.map(async (filePath) => {
    const file = normalizePath(filePath)
    return [file, await readFile(filePath, 'utf8')]
  })
)
const sourceCache = new Map(sourceEntries)

for (const [file, source] of sourceEntries) {
  for (const adapter of safeAdapters) {
    if (file !== adapter.file && adapter.usage.test(source)) {
      report(file, `${adapter.component} 只能通过 ${adapter.file} 使用`)
    }
  }

  if (file !== modalWrapperFile && /\block-scroll\b/.test(source)) {
    report(file, 'lock-scroll 只能由 ModalWrapper 显式关闭')
  }
  if (file !== safeMessageBoxFile && /\blockScroll\b/.test(source)) {
    report(file, 'lockScroll 只能由 MessageBox 安全适配器显式关闭')
  }
  if (
    /document\.body\.style\.(?:overflow|overflowX|overflowY|position|top)\s*=/.test(
      source
    ) ||
    /document\.body\.style\.setProperty\(\s*["'](?:overflow|overflow-x|overflow-y|position|top)["']/.test(
      source
    )
  ) {
    report(file, '禁止通过 body.style 实现弹窗锁屏')
  }

  const bodyLockPattern =
    /(?:^|\n)\s*(?::global\()?body(?:[.#][\w-]+)+(?:\))?\s*\{[^{}]*\boverflow(?:-y)?\s*:\s*(?:hidden|clip)\b/gs
  for (const match of source.matchAll(bodyLockPattern)) {
    if (
      !allowedBodyLockClasses.some((className) => match[0].includes(className))
    ) {
      report(file, '禁止通过 body 状态类设置 overflow/overflow-y: hidden/clip')
      break
    }
  }
}

const requiredInvariants = [
  {
    file: modalWrapperFile,
    patterns: [/:lock-scroll="false"/, /useOverlayScrollLock/],
    message: 'ModalWrapper 必须关闭原生锁屏并使用统一滚动锁',
  },
  {
    file: safeImageViewerFile,
    patterns: [/useOverlayScrollLock/, /ElImageViewer/],
    message: 'SafeImageViewer 必须使用统一滚动锁',
  },
  {
    file: safeMessageBoxFile,
    patterns: [/setSmoothScrollLocked/, /lockScroll:\s*false/],
    message: 'MessageBox 安全适配器必须关闭原生锁屏',
  },
  {
    file: 'src/composables/useOverlayScrollLock.ts',
    patterns: [/setSmoothScrollLocked/, /onUnmounted/],
    message: '弹窗滚动锁组合函数必须自动释放锁',
  },
  {
    file: 'src/utils/smoothScroll.ts',
    patterns: [/lockPageScrollPosition/, /unlockPageScrollPosition/],
    message: '统一滚动锁必须保存并恢复页面位置',
  },
  {
    file: 'src/assets/style/global.less',
    patterns: [
      /body\.lenis:not\(\.lenis-autoToggle\)\.lenis-stopped/,
      /body\.el-image-viewer-parent--hidden/,
    ],
    message: '全局样式必须阻止第三方锁屏修改 body 滚动布局',
  },
]

for (const invariant of requiredInvariants) {
  const source =
    sourceCache.get(invariant.file) ||
    (await readFile(path.join(projectRoot, invariant.file), 'utf8'))
  if (invariant.patterns.some((pattern) => !pattern.test(source))) {
    report(invariant.file, invariant.message)
  }
}

if (violations.length > 0) {
  process.stderr.write(
    `弹窗滚动安全检查失败：\n${violations
      .map((item) => `- ${item}`)
      .join('\n')}\n`
  )
  process.exitCode = 1
} else {
  process.stdout.write('弹窗滚动安全检查通过。\n')
}
