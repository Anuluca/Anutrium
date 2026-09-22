# Anutrium 性能优化审计

> 审计日期：2026-09-16
>
> 测试环境：Google Chrome 152、1440 × 900、DPR 1、生产构建
>
> 审计方式：Chrome DevTools Protocol（CDP）的 Performance、CPU Profiler、Tracing，结合源码分析
>
> 指标说明：文中的 CPU 指主线程占用率（main-thread utilization），不包含完整 GPU 开销；单次数据用于定位相对热点，不代表所有设备的绝对性能。

## 1. 总结

当前项目的主要性能问题不是 Element Plus、Footer 或 Leaflet，而是以下四类持续或集中开销：

1. 冷启动期间 Three.js 初始化、Shader 编译及 WebGL Context 销毁。
2. 星空 Canvas、CSS 无限动画和 Lenis 自动 RAF 形成的空闲常驻 CPU。
3. 作品弹窗一次性挂载大量 DOM，并同时启动多个逐字符文字动画。
4. 路由切换和旅程列表增量加载期间，组件集中挂载导致较多布局计算。

除冷启动外，所测首页模块切换、普通页面滚动、Footer、工具页和旅程详情页均未出现持续性 Long Task。当前优化方向应优先降低空闲 CPU、启动 Long Task、弹窗 DOM 数量和路由挂载布局次数，不建议更换 Element Plus。

## 2. 已实施项目状态

|   原编号 | 项目                        | 状态         | 当前结果                                                                                                |
| -------: | --------------------------- | ------------ | ------------------------------------------------------------------------------------------------------- |
|     P0-1 | 重构 `manualChunks`         | 已完成       | 首页代码与 CSS 从约 504 KB 降至约 464 KB gzip；GSAP、SplitText、`xiangqi.js` 等页面专用代码退出首页闭包 |
|     P0-2 | 优化 Typekit 加载时机       | 代码侧已完成 | Typekit 改为 `load` 后的浏览器空闲阶段加载；进一步精简字重和字符集仍需修改 Adobe Fonts Kit              |
|     P0-3 | 优化全局 Three.js 入场动画  | 已撤销       | 已恢复原始入场动画加载、渲染和计时逻辑；本次实测确认该项仍是冷启动最大热点                              |
|     P0-4 | 拆分多语言和内容数据        | 已完成       | 公共文案保留入口，其余内容按路由加载，路由守卫在放行前合并消息                                          |
|     P0-5 | 修复缓存策略与资源命名      | 已完成       | 构建资源使用内容哈希和长期 `immutable` 缓存；HTML、Manifest、Service Worker 保持重新验证                |
|     P0-6 | 移除小动效重依赖            | 已完成       | Sparkle、Radiant 改为本地 SVG/CSS 实现，Motion、Inspira、Tailwind 已退出首页依赖                        |
|     P1-9 | 入场 Logo 使用 FLIP 动画    | 已完成       | 停靠阶段改为 `translate`、`scale`、`opacity`；桌面与手机目标矩形误差不超过 1px                          |
|    P1-10 | 精简地图边界数据            | 已完成       | GeoJSON 从约 737 KB 降至 199 KB 原始体积，gzip 从约 231 KB 降至 64 KB                                   |
|    P1-11 | Leaflet 本地化和路由级导入  | 已完成       | 地图进入临近区域后动态加载，不再依赖 unpkg                                                              |
|    P1-12 | 视频按可见性加载和播放      | 已完成       | 视频邻近视口时挂载资源，进入视口播放，离开视口暂停                                                      |
|    P2-31 | 生产性能回归测试            | 已完成       | 已建立生产预览、慢速网络和 CPU 降速测试基础                                                             |
| CPU-P0-1 | 复用 Three.js 和 WebGL 资源 | 已完成       | Shader 改为异步预编译；About Runtime 可在 60 秒内复用；同步销毁改为空闲阶段回收                         |

## 3. Chrome CPU 实测基线

### 3.1 场景结果

| 场景                |            主线程占用 | 布局与 DOM                                     |         Long Task | 结论                            |
| ------------------- | --------------------: | ---------------------------------------------- | ----------------: | ------------------------------- |
| 冷启动首页          |         37.5% / 8.95s | 27 次 Layout、258 次样式计算、增加 1312 个节点 | 2 次，最大 2276ms | 当前最大瓶颈                    |
| 首页切换到 About    |                 11.1% | 45 次 Layout，CLS 0.0377                       |                 0 | 整体流畅，样式计算偏多          |
| 首页切换到 Archive  |                  9.1% | 38 次 Layout                                   |                 0 | 流畅                            |
| 首页切换到旅程模块  |                 11.3% | 40 次 Layout                                   |                 0 | Leaflet 不是热点                |
| 首页切换到工具模块  |                 12.2% | 82 次 Layout                                   |                 0 | 首页模块中布局次数最高          |
| 首页跳转 Archive    |                 27.5% | 143 次 Layout、179 次样式计算                  |                 0 | 挂载阶段布局较密集              |
| Archive 空闲 3 秒   |                  8.4% | 约 61 次样式计算/秒                            |                 0 | 存在常驻动画开销                |
| 作品弹窗打开和关闭  |         19.0% / 3.47s | 增加 743 个节点、148 次 Layout                 |                 0 | DOM 和文字动画偏重              |
| 旅程页空闲 3 秒     |                 13.6% | 约 61 次样式计算/秒                            |                 0 | 所测页面空闲占用最高之一        |
| 旅程页滚动加载      |                 24.6% | 增加 651 个节点、121 次 Layout                 |                 0 | 单批挂载量偏大                  |
| 进入旅程详情        |                 20.7% | JS Heap 增加约 7.38 MB                         |                 0 | 详情和媒体数据占用明显          |
| 旅程详情空闲/滚动   |          8.9% / 16.4% | 滚动阶段 124 次 Layout                         |                 0 | 无卡顿级任务                    |
| 工具页空闲/筛选滚动 |          8.1% / 14.3% | 筛选后减少 171 个节点                          |                 0 | 当前表现良好                    |
| 进入关于页          |                 28.2% | 127 次 Layout                                  |        1 次，74ms | WebGL Shader 编译引发 Long Task |
| 关于页空闲/滚动     | 10.5%～ 13.8% / 13.4% | 持续样式计算                                   |                 0 | 星空、CSS 动画和 Lenis 开销叠加 |
| Footer 滚动/悬停    |                 12.9% | 0 次 Layout                                    |                 0 | Footer 本身不是瓶颈             |

### 3.2 空闲 CPU 隔离测试

关于页连续采样 5 秒：

| 状态                            | 主线程占用 |    相比上一步 |
| ------------------------------- | ---------: | ------------: |
| 正常状态                        |      10.5% |             — |
| 暂停全部 CSS Animation          |       8.0% | -2.5 个百分点 |
| 再隐藏星空 Canvas               |       5.1% | -2.9 个百分点 |
| 再启用 `prefers-reduced-motion` |       4.1% | -1.0 个百分点 |

最后约 1 个百分点是 Lenis 和其他受 Reduced Motion 控制的动效合计，不能全部归因于 Lenis。

## 4. CPU-P0：优先处理

### CPU-P0-1：复用 Three.js 和 WebGL 资源（已完成）

**完成日期：2026-09-21**

**证据**

- 冷启动主线程占用 37.5%。
- Three.js 相关函数累计约 2.57 秒。
- `WebGLRenderer.forceContextLoss` 单次约 482ms。
- 进入 About 时 `getProgramInfoLog` 约 30.6ms，并产生一次 74ms Long Task。

**代码位置**

- [`src/components/Logo_rotating3D/index.vue`](src/components/Logo_rotating3D/index.vue)
- [`src/components/StartAnimation/index.vue`](src/components/StartAnimation/index.vue)
- [`src/views/About/index.vue`](src/views/About/index.vue)

**实施内容**

1. 使用 `WebGLRenderer.compileAsync` 异步预编译场景 Shader，首帧仍保留同步编译兜底。
2. About 页使用带渲染配置签名的 Runtime Cache，复用 renderer、Scene、Camera、PMREM 环境贴图、几何体和材质。
3. Runtime 重新挂载时恢复相机和模型初始姿态，保证路由返回后的展示状态和原实现一致。
4. Runtime Cache 最多保留一个实例，默认 60 秒后回收；页面退出时统一清空，限制 VRAM 常驻范围。
5. 入场 WebGL 不进入 Runtime Cache，卸载时立即停止 RAF 并移除 Canvas，但将 `dispose` 和 `forceContextLoss` 延迟到浏览器空闲阶段。
6. 缓存 Context 已丢失时放弃复用，执行完整清理并重新创建。

**验证结果**

- About → Archive → About：复用同一个 Canvas 和 WebGL Context，Context 未丢失。
- About 首次进入：开发环境采样最大 Long Task 约 51ms，原基线为 74ms；该数据仅用于确认方向，最终收益仍以生产回归测试为准。
- About 缓存返回：开发环境采样 Long Task 为 0。
- 首页入场：开发环境采样仅记录一次约 57ms Long Task；原生产基线为两次、最大 2276ms，环境不同，不直接计算百分比收益。
- `vue-tsc`、定向 ESLint、生产 SSG 构建均通过。

**预期收益：极高**

**难度：高**

**注意：复用 WebGL Context 会增加会话期间 VRAM 占用，需要同时建立内存回收阈值。**

### CPU-P0-2：降低星空 Canvas 主线程开销

**证据**

- 隐藏星空 Canvas 后，空闲主线程占用从 8.0% 降至 5.1%。
- 当前桌面端每帧清空全屏 Canvas，并绘制 100 个粒子；手机端为 50 个。

**代码位置**

- [`src/components/ParticlesBg/index.vue`](src/components/ParticlesBg/index.vue)
- [`src/components/BackStars/index.vue`](src/components/BackStars/index.vue)
- [`src/components/BackController/index.vue`](src/components/BackController/index.vue)

**建议**

1. 内容路由限制为 30FPS，手机端根据实际掉帧降至 24FPS。
2. 路由离场、路由入场、弹窗全屏显示期间暂停星空更新，只保留最后一帧。
3. 继续保留现有离屏、后台标签页、Reduced Motion 暂停逻辑。
4. 长期将粒子计算和绘制迁移到 OffscreenCanvas Worker，保留不支持环境的主线程回退。
5. 不建议继续单纯减少粒子数量；该方案会直接改变展示密度，但不能解决逐帧全屏绘制的根因。

**预期收益：高，空闲 CPU 可下降约 2 ～ 3 个百分点**

**难度：中；OffscreenCanvas 方案为中至高**

### CPU-P0-3：按可见性暂停 CSS 无限动画

**证据**

- 暂停全部 CSS Animation 后，关于页空闲 CPU 从 10.5% 降至 8.0%。
- 多个页面存在跑马灯、扫描线、闪烁、光泽和光标无限动画。

**重点位置**

- [`src/views/About/index.vue`](src/views/About/index.vue)
- [`src/components/FooterCom/index.less`](src/components/FooterCom/index.less)
- [`src/components/TypedText/index.vue`](src/components/TypedText/index.vue)
- [`src/components/ArchiveProjectMarquee/index.vue`](src/components/ArchiveProjectMarquee/index.vue)

**建议**

1. 建立统一的可见性动画控制 Composable。
2. 使用 IntersectionObserver 为视口外区块设置 `animation-play-state: paused`。
3. 页面离场、标签页隐藏、弹窗遮挡时统一暂停底层非关键动画。
4. 动画结束后移除 `will-change`，避免长期占用合成层。
5. FooterCom 固定可见时保留跑马灯；不可见或被页面状态隐藏时暂停。

**预期收益：高，空闲 CPU 可下降约 2 ～ 2.5 个百分点**

**难度：中**

### CPU-P0-4：Lenis 改为按需 RAF

**证据**

- 所有非首页桌面路由都使用 `autoRaf: true`。
- 页面静止时仍存在约 60 次/秒的样式计算和调度活动。

**代码位置**

- [`src/utils/smoothScroll.ts`](src/utils/smoothScroll.ts)

**建议**

1. 设置 `autoRaf: false`。
2. 仅在 Wheel、锚点滚动、程序化滚动或惯性未结束时启动共享 RAF。
3. 连续若干帧速度和位置不再变化后停止 RAF。
4. 页面隐藏、弹窗锁定、路由离场时立即停止。
5. 必须保证现有滚动阻尼、锚点行为和弹窗嵌套滚动不变。

**预期收益：中，和其他 Reduced Motion 动效合计约 1 个百分点**

**难度：中**

### CPU-P0-5：作品弹窗异步挂载和 DOM 精简

**证据**

- 一次打开新增 743 个 DOM 节点。
- 打开和关闭过程产生 148 次 Layout。
- Archive 当前同步导入并常驻挂载 WorkDetailModal；首页已经使用异步组件和条件挂载。

**代码位置**

- [`src/views/Archive/index.vue`](src/views/Archive/index.vue)
- [`src/components/WorkDetailModal/index.vue`](src/components/WorkDetailModal/index.vue)
- [`src/components/TypedText/index.vue`](src/components/TypedText/index.vue)

**建议**

1. Archive 使用 `defineAsyncComponent` 导入 WorkDetailModal。
2. 增加 `v-if="selectedWork"`，未打开弹窗时不创建组件实例。
3. 图片轮播只挂载当前项和相邻项，进度条保留轻量数据节点。
4. 多个 TypedText 改为共享时间轴，避免每个组件独立创建字符级 `setTimeout`。
5. 屏外详情文字直接完成或在滚动接近时启动。
6. 弹窗关闭后立即清理文字任务、图片引用和无限动画。

**预期收益：高，目标将新增节点降至 350 个以内，并显著减少布局次数**

**难度：中**

## 5. CPU-P1：第二阶段

### CPU-P1-1：首页指示器使用固定盒模型

当前首页指示器动画包含 `width`、`flex-basis` 和 `gap`，会逐帧触发布局。工具模块切换实测达到 82 次 Layout。

建议：

1. 预留固定 marker 和 gap 空间。
2. 使用 `scaleX`、`translate3d`、`opacity` 表达展开状态。
3. 切换结束后清除临时 `will-change`。

代码：[`src/views/Home/index.less`](src/views/Home/index.less)

### CPU-P1-2：路由挂载阶段统一 DOM 读写

普通路由切换产生 117 ～ 143 次 Layout。当前 Header、PageFooter、ResizeObserver、路由监听会在相近时段读取或写入尺寸。

建议：

1. 一帧统一读取 `offsetHeight`、`getBoundingClientRect`、`getComputedStyle`。
2. 下一帧统一写入 CSS 变量和 Vue 状态。
3. 非关键 Observer、Footer 动画、媒体监听在 `after-enter` 后注册。
4. 缓存根字体大小，仅在 viewport 或设备类型变化时重新读取。

代码：[`src/layout/index.vue`](src/layout/index.vue)、[`src/components/PageFooter/index.vue`](src/components/PageFooter/index.vue)

### CPU-P1-3：旅程列表降低单批挂载量

当前每批加载 9 条，本次滚动新增 651 个节点。

建议：

1. 桌面每批 6 条，手机每批 3 条。
2. 根据视口高度和卡片实际高度动态计算批次。
3. 保留现有 `content-visibility: auto`。
4. 对静态 VlogCard 子树评估 `v-memo`。

代码：[`src/views/Flânerie/index.vue`](src/views/Flânerie/index.vue)

### CPU-P1-4：旅程 Observer 增量化

当前每批加载后会重新查询全部 sentinel，并断开和重建 IntersectionObserver；Scroll Reveal 也会重新扫描现有节点。

建议：

1. Observer 在页面生命周期内复用。
2. 使用 template ref，只观察新加入的 sentinel 和卡片。
3. 已 Reveal 的节点立即 `unobserve`。
4. 避免每批执行全局 `querySelectorAll`。

代码：[`src/views/Flânerie/index.vue`](src/views/Flânerie/index.vue)、[`src/composables/useIntersectionActivation.ts`](src/composables/useIntersectionActivation.ts)、[`src/composables/useScrollReveal.ts`](src/composables/useScrollReveal.ts)

### CPU-P1-5：旅程详情媒体增加渲染隔离

进入详情时 JS Heap 增加约 7.38 MB。现有视频可见性加载和图片懒加载有效，但单页最多仍挂载 30 个媒体卡片。

建议：

1. MediaGallery 卡片增加 `content-visibility: auto`。
2. 设置稳定的 `contain-intrinsic-size`，避免滚动高度抖动。
3. 手机端每页降低到 12 ～ 18 张；桌面保持 24 ～ 30 张。
4. 图片解码完成后停止 Shimmer；页面切换时继续清理 `loadedMediaUrls` 和 `nearbyVideoUrls`。

代码：[`src/views/Flânerie/Detail/index.vue`](src/views/Flânerie/Detail/index.vue)、[`src/components/MediaGallery/index.vue`](src/components/MediaGallery/index.vue)

### CPU-P1-6：进一步精简 Typekit

Typekit 已从同步加载改为浏览器空闲加载，但采样中仍出现 20 ～ 40ms 的 FontFace/Typekit 主线程工作，冷缓存请求总量约 2.63 MB。

建议：

1. 在 Adobe Fonts Kit 后台删除未使用字重。
2. 限制字符集和语言覆盖范围。
3. 授权允许时自托管站点字符子集。
4. 避免 Typekit 与本地同类字体重复覆盖。

代码：[`src/utils/typekit.ts`](src/utils/typekit.ts)、[`src/assets/style/font.less`](src/assets/style/font.less)

### CPU-P1-7：根字号更新去重

当前 resize 后会重新写入 `document.documentElement.style.fontSize`。移动端地址栏变化和连续 resize 可能引起整页重排。

建议：

1. 缓存上一次宽度、设备类型和字体值。
2. 计算结果变化超过阈值后才写入 Style。
3. 能用 CSS `clamp()`、`vw`、`dvh` 表达的尺寸逐步移回 CSS。

代码：[`src/App.vue`](src/App.vue)

### CPU-P1-8：合成层和 Filter 审计

建议：

1. `will-change` 仅在动画活跃阶段存在。
2. 避免在大面积固定层持续使用 Blur、Drop Shadow、Mix Blend Mode。
3. 路由全页 `scale(0.86)` 会导致大区域重新栅格化；后续评估使用隔离的视口层完成同样视觉。
4. 对 GPU 优化必须在 Chrome Rendering 和 Layers 面板中额外验证，主线程 CPU 数据不能覆盖该成本。

代码：[`src/layout/index.vue`](src/layout/index.vue)、[`src/views/Home/index.less`](src/views/Home/index.less)

## 6. CPU-P2：低收益和回归保障

### CPU-P2-1：共享动画调度器

将 Lenis、WebGL、鼠标跟随等 RAF 接入统一调度器，根据页面可见性、路由状态和活动任务决定是否继续下一帧。该项可以减少 RAF 回调数量，但工程风险高于单独优化热点。

### CPU-P2-2：静态节点跳过 Vue 更新

对不会随交互变化的卡片装饰、章节标题、Logo 装饰和详情静态文本评估：

- `v-once`
- `v-memo`
- `shallowRef`
- `markRaw`

### CPU-P2-3：自适应渲染预算

结合以下条件动态选择 60FPS、30FPS 或 24FPS：

- `navigator.hardwareConcurrency`
- 设备内存信息（浏览器支持时）
- 连续帧耗时
- 页面可见性
- Reduced Motion

不建议直接删除视觉效果；应优先降低更新频率和暂停不可见渲染。

### CPU-P2-4：Heap Snapshot 回归

重点检查以下流程重复执行 10 次后内存是否回落：

1. 入场动画完成并销毁 Three.js。
2. About 与其他路由往返。
3. 连续打开和关闭不同作品弹窗。
4. 旅程列表进入详情再返回。
5. 详情页多次切换分页和图片预览。

### CPU-P2-5：生产 CPU Budget

在现有生产性能测试基础上增加以下预算：

| 指标                   |     目标 |
| ---------------------- | -------: |
| 普通交互 Long Task     |     0 次 |
| 单次路由最大任务       |   < 50ms |
| 普通路由空闲主线程占用 |     < 6% |
| 首页模块切换主线程占用 |    < 12% |
| 作品弹窗新增 DOM       | < 350 个 |
| 旅程单批加载新增 DOM   | < 400 个 |
| 路由切换 Layout 次数   |  < 80 次 |

代码：[`tests/production-performance.spec.ts`](tests/production-performance.spec.ts)、[`playwright.performance.config.ts`](playwright.performance.config.ts)

## 7. 当前不建议投入的项目

| 项目              | 实测结论                                                                 |
| ----------------- | ------------------------------------------------------------------------ |
| 移除 Element Plus | 弹窗采样中 Element Plus 自身脚本约 16ms，不是主要 CPU 瓶颈；保持现状     |
| 重写 PageFooter   | Footer 滚动和悬停期间 0 次 Layout；现有离屏暂停、尺寸缓存和 RAF 合并有效 |
| 继续优化 Leaflet  | 单个 Leaflet 热点函数约 1.3 ～ 1.6ms；延迟加载、边界压缩和本地化已经生效 |
| 重写工具页筛选    | 工具页空闲占用最低，筛选和滚动没有 Long Task                             |
| 重做旅程视频加载  | 已实现邻近视口挂载、进入视口播放、离开视口暂停                           |
| 仅缩短动画时长    | 只能缩短占用持续时间，不能解决每帧布局、Canvas 重绘和 RAF 常驻问题       |

## 8. 推荐实施顺序

1. CPU-P0-5：作品弹窗异步挂载、条件挂载和 TypedText 调度合并。
2. CPU-P0-3：暂停视口外 CSS 无限动画。
3. CPU-P0-2：星空限帧并在路由过渡、弹窗遮挡时暂停。
4. CPU-P0-4：Lenis 改为按需 RAF。
5. CPU-P1-1、CPU-P1-2：首页指示器和路由 DOM 读写优化。
6. CPU-P1-3、CPU-P1-4：旅程列表批次和 Observer 增量化。
7. CPU-P1-5：旅程详情媒体渲染隔离。
8. CPU-P1-6 ～ CPU-P1-8：字体、根字号、合成层长期治理。
9. CPU-P2-4、CPU-P2-5：建立内存和 CPU 自动回归预算。
10. 对已完成的 CPU-P0-1 补充生产环境 CPU、GPU 和 VRAM 长时间回归。

CPU-P0-1 已采用资源复用和延迟销毁完成优化，没有重新启用此前撤销的低画质或简化动画方案。后续优先实施可独立验证、不会改变展示效果的弹窗、动画暂停、星空限帧和 Lenis 调度。
