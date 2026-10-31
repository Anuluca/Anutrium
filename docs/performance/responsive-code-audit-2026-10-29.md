# 页面响应式与代码性能审查

- 日期：2026-10-29。
- 基线：工作区已有未提交修改；本报告仅记录本次增量修改。
- 方法：从路由与内容加载入口追踪引用，检查 Vue 模板、移动端断点、列表计算、图片读取、事件测量及卸载清理；复用 `localhost:3000` 执行浏览器回归。
- 范围限制：浏览器验证使用 Chrome 桌面与 Pixel 7 模拟环境；未覆盖真实 iOS Safari，也未穷举所有内容数据、交互组合及历史测试。

## 1. 删除与合并

| 位置 | 操作与依据 |
| --- | --- |
| `src/views/Archive/index.vue` | 删除旧独立页面壳。当前入口由首页加载 `ArchiveContent.vue`。 |
| `src/views/Flânerie/index.vue` | 删除旧独立页面壳。当前入口由首页加载 `JourneyContent.vue`。 |
| `src/components/DetailSections/index.vue` | 删除无运行时引用的旧详情章节组件。 |
| `src/components/BackToTop/index.vue`、`src/composables/useBackToTopDock.ts` | 删除无挂载入口的回顶组件及其独立状态。 |
| `global.less`、`light-theme.less` | 删除上述旧组件与页面独有的样式选择器。 |
| 配色工具 | 删除模板未使用的 `isExtracting` 状态。 |
| 图片 Base64 工具 | 删除消息样式的重复导入，由已有消息工具统一引入。 |
| 加载进度 | 两个组件共用 `useAnimatedProgress.ts`，合并动画推进、取消及卸载逻辑。 |

- 未删除 `src/utils/simplifyModelGeometry.ts`：虽然不进入前端运行时，但离线模型构建脚本仍引用它。
- 未凭文件名删除实验页：`/test` 与 `/test2` 仍有有效路由。

## 2. 性能与正确性

| 位置 | 原问题 | 修改 |
| --- | --- | --- |
| `useSteamProfile.ts` | 全库游戏先格式化日期与时长，再截取当前页。 | 保留排序与名称检索缓存，日期与时长仅格式化当前显示条目。200 条游戏的回归样例中，读取搜索结果时日期格式化为 0 次，初始展示 30 条时为 30 次。 |
| `useImagePreloader.ts` | 取消请求后 URL 仍被记为已请求，之后无法重试。 | 取消时只移除未完成 URL 的去重标记；成功请求继续去重，失败请求可重试。 |
| `Island/Mobile.vue` | 滚动与窗口变化直接读取滚动区域几何。 | 复用 `useFrameTask` 合并同帧事件；使用被动滚动监听与 `ResizeObserver` 观察实际容器，并自动清理。 |
| 配色工具 | 将原图读为完整 Base64；连续上传的旧回调可能覆盖新结果。 | 使用对象 URL（Blob URL）共用预览与取色来源；替换或卸载时解除旧回调并释放 URL；保留原有 64×64 像素采样算法。 |
| 图片 Base64 工具 | 前一次读取可能晚于新文件完成。 | 新上传先取消旧 `FileReader`，清空过期输出；补充读取失败处理与卸载清理。 |
| 两个图片工具 | 复制提示计时器可能跨越重复操作或组件卸载。 | 重复操作先清理旧计时器，卸载时统一清理。 |
| 加载进度 | 两套重复逻辑仅监听进度，忽略动画开关变化与进度重置。 | 公共逻辑同时监听进度与动画开关，处理重置并取消待执行帧。 |
| `ToolPageLayout` | 声明了 `backPath`，实际回退路径却写死。 | 有工具来源时保留原返回行为，否则使用调用方传入的返回路径。 |
| `WorkCard`、`CraftContent` | `closest()` 推断为通用 `Element`，不满足观察器类型。 | 显式指定 `HTMLElement`，消除本次检查基线中的两个 TypeScript 错误。 |

- 已有相册分页、媒体索引和图片变体工具继续复用；未为了替换循环而给小型固定数组新增索引。
- 本次未修改后端查询，未发现并宣称修复未经验证的 N+1 查询问题。
- 未测量完整站点优化前后的帧率、核心网页指标（Core Web Vitals）或内存曲线；格式化调用次数不能等同于整页性能提升百分比。

## 3. 布局实现

- 在 `src/assets/style/tool-tactical.less` 中新增 `.tool-grid()` 混入（mixin），供配色提取、贝塞尔曲线、节拍器、弹力球、Base64 编解码、图片 Base64 六个工具页复用。
- 桌面保持原有 `5:2` 双栏比例；`900px` 以下保持原有单栏布局。
- 列宽改为 `minmax(0, …)`，网格直接子项增加 `min-width: 0`，避免长文本与固有内容尺寸撑宽列。
- 删除六处重复网格声明及对应移动端列数声明；保留各工具自身的面板高度与内部控制布局。
- 格式化收藏模块的一处既有样式警告。
- 页面内容、资源地址、弹窗形式与路由 Shell 保持现有实现；本次未引入依赖。

## 4. 验证覆盖

### 4.1 路由矩阵

每个路径检查目标内容可见、入口遮罩结束、页面级横向溢出不超过 `1px`，并收集未捕获脚本错误。

| 类型 | 路径 |
| --- | --- |
| 首页与内容模块 | `/`、`/archive`、`/flanerie`、`/creative`、`/pokeyard`、`/floratrium` |
| 个人海湾 | `/atrium`、`/atrium/laboratory`、`/atrium/notes`、`/atrium/games`、`/atrium/collections` |
| 作品与影像 | `/atrium/photography`、`/atrium/image-log`、`/atrium/illustration`、`/atrium/trainer-card` |
| 代表性动态详情 | `/flanerie/nanchang`、`/atrium/merch/lucarioNoArm`、`/atrium/image-log/covid` |
| 工具 | `/colorPalette`、`/easeStudio`、`/metronome`、`/bounceDynamics`、`/htmlEntities`、`/base64Codec`、`/imageBase64` |
| 游戏与实验 | `/games/sleepingdogs/bullsAndCows`、`/games/sleepingdogs/saftybox`、`/ai-playground/arknightxpersona3reload`、`/test`、`/test2` |
| 通用 | `/about`、`/404` |

- 32 个路径 × 桌面/手机：64 项。
- 六个工具在 `320px`、`393px`、`820px` 视口注入长连续文本，检查列数与面板宽度：2 项矩阵用例，共 36 次页面检查。
- 模块入口的加载与几何检查不等同于穷举其所有展开、播放和切换交互。

### 4.2 回归命令

```sh
# 仅连接已有服务，配置中不设置 webServer 启动命令。
yarn playwright test --config=playwright.audit.config.ts tests/responsive-audit.spec.ts
yarn playwright test --config=playwright.audit.config.ts tests/performance-lifecycle.spec.ts tests/loading-line.spec.ts
yarn playwright test --config=playwright.audit.config.ts tests/page-layout.spec.ts --grep 'keeps its geometry while leaving'
yarn check:overlay-scroll
yarn test:overlay-scroll --config=playwright.audit.config.ts
yarn type-check
yarn build-only
```

- 生命周期回归覆盖：预加载去重与取消后重试；动画开关、重置与作用域销毁；Steam 排序、检索、分页和格式化调用数；图片 URL 替换与释放；连续上传取消旧读取。
- 加载线用例改为结合动画启动事件与 CSS 声明验证，避免在短动画结束后用 `getAnimations()` 读取不到已结束动画而误判。
- 审查配置复用既有项目名称 `chromium` / `mobile-chrome`，兼容已有按项目名区分移动端行为的用例；默认串行运行，减少三维渲染竞争触发入口超时兜底的干扰。
### 4.3 最终结果

| 检查 | 结果 |
| --- | --- |
| 路由加载与页面横向溢出 | 64 项通过。 |
| 六个工具的窄屏长文本布局矩阵 | 2 项通过，覆盖 320 / 393 / 820px。 |
| 性能与资源生命周期 | 10 项通过。 |
| 加载线动画与地平线衔接 | 2 项通过。 |
| 路由离场几何 | 8 项通过；页面及路由容器偏移不超过 1px。 |
| 弹窗滚动静态检查 | 通过。 |
| 弹窗、图片预览、视频及页脚弹窗滚动回归 | 10 项通过。 |
| TypeScript | 通过；修复检查基线中的 2 个错误。 |
| ESLint：源码及本次新增/修改的测试和配置 | 0 错误、0 警告。 |
| 生产构建 | 通过；静态站点生成（SSG）完成 91 个页面。 |
| 补充视觉检查 | 查看 393px 配色工具与 320px 图片 Base64 工具的完整页面截图。 |

- 加载线在多组浏览器同时运行时曾触发既有的 4200ms 入口兜底，导致正常 Logo 揭示断言不适用；改用串行执行后，完整的 12 项生命周期与加载线测试通过。
- 生产构建仍有 Node.js 对生成临时模块的 `MODULE_TYPELESS_PACKAGE_JSON` 提示；未为消除此提示而改变整个项目的模块制式。
- 历史用例中仍有基于旧页面壳和旧交互结构的选择器；本次未执行全部历史端到端测试（E2E）。
