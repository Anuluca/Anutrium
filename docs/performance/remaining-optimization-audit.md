# 剩余性能优化项审计

> 状态更新（2026-10-13）：下文保留优化前审计与测量基线。已完成 #3、#6、#7、#8、#9、#10、#11、#12；#1 按用户范围仅加入离屏/遮罩覆盖暂停，保留原可见效果。参见 [实施结果](./selected-optimization-results.md) 和 [六组待验证方案详解](./pending-six-proposals.md)。其余候选项未在本次实施。

- 日期：2026-10-12。
- 范围：首页方尖碑聚焦/失焦、导航与面板转场、首次资源加载，以及全站共享组件和其他路由的明显性能热点。
- 本轮只排查，不新增业务代码修改。工作区存在并行开发变更；结论对应本次读取与测量的版本。
- 共发现 **29 项有明确实现依据的优化空间、6 组收益或取舍需要进一步验证的方案**。源码确认代表当前实现存在相关开销，不代表已经证明修改后的 CPU 降幅；低优先级项目不应先于实测热点实施。旧海湾 PC/Mobile 组件目前由隐藏的 `/test` 路由承载；相关图片、组件和装饰项目不属于当前首页的首屏热点。

## 1. 方法与边界

- 复用用户已运行的 `http://localhost:3000`；未启动或停止开发/预览服务。
- Chromium 桌面视口 1440×900、Pixel 7 模拟移动视口；移动模拟不是 iPhone 或 Android 真机测试。
- 使用 Chrome 调试协议 (Chrome DevTools Protocol, CDP) 读取 `Performance.getMetrics`、JavaScript 精确覆盖率和资源请求；场景插桩只修改浏览器收到的响应，不改源文件。
- 常驻开销测量：本地提供同一份生成字体，屏蔽 Typekit 和开发 WebSocket，等待入场、字体及面板稳定后采样；贡献图使用接口实际返回数据，未使用模拟贡献数据。
- A/B 测量仅临时暂停贡献格 CSS 动画，其他页面状态保持一致；先测正常状态、暂停、再恢复复测。最终记录使用 `--use-angle=metal`，场景确认后端为 Apple M4 Metal。早期 SwiftShader 结果只作交叉检查。
- 生产资源检查：将现有服务请求映射到已有 `dist` 构建文件，没有额外启动服务器；覆盖 `/`、`/archive`、`/craft`，三页没有运行时异常。该构建时间为 `2026-10-12T10:20:26.844Z`。
- gzip 数据是逐文件压缩估算，不是线上 Brotli 传输大小。线上当前部署与本地构建不是同一版本；线上请求仅验证压缩、缓存和图片转换服务。
- 本轮没有可靠的生产真实用户核心网页指标 (Core Web Vitals) 数据，不报告 LCP、INP、CLS 分数，也不把主线程任务时间换算为系统 CPU 使用率。

## 2. 实测证据

### 2.1 贡献图常驻开销

| 状态 | 桌面样式计算时间 | 移动模拟样式计算时间 | 桌面主线程任务时间 | 移动模拟主线程任务时间 |
| --- | ---: | ---: | ---: | ---: |
| 正常动画，84 个活跃格子 | 141.3ms / 2.20s | 113.1ms / 2.22s | 421.2ms | 324.0ms |
| 只暂停贡献格动画 | 29.3ms / 2.21s | 1.9ms / 2.20s | 164.8ms | 20.6ms |
| 恢复动画复测 | 143.1ms / 2.32s | 100.4ms / 2.21s | 430.9ms | 274.4ms |

- 上述三个状态新增布局次数均为 **0**，残余热点主要是样式/绘制工作；不能再把它归因于上一轮已修复的导航线宽度动画。
- About 遮罩打开后，背后的 84 个贡献格动画仍处于运行状态；背景粒子也仍运行，桌面 130 个、移动模拟 33 个，配置均为 12 FPS。
- About 打开后约 2.2s，桌面采到 Logo 动画回调 341 次、Lenis 回调 341 次、粒子回调 25 次；移动模拟 Logo 243 次、粒子 25 次。移动模拟未创建 Lenis。
- 高刷新率显示环境会放大 Logo 和 Lenis 的逐帧开销。Logo 每次回调执行实际渲染，Lenis 在停止状态仍进入自动帧循环。

### 2.2 首页场景

| 项目 | 结果 |
| --- | --- |
| 场景对象数 | 140 |
| 稳定静止 1.5s | 0 次场景绘制 |
| 聚焦采样 | 170 帧；每帧渲染器内部 141 次 `updateMatrixWorld` 调用、44 次局部矩阵更新；此前还有平均约 28 次子树/相机世界矩阵调用 |
| 失焦采样 | 178 帧；每帧渲染器内部 141 次世界矩阵调用、44 次局部矩阵更新；此前另有约 29 次世界矩阵调用、8 次局部更新 |

- 世界矩阵函数调用数是遍历次数，**不等于相同次数的矩阵乘法**；静态局部矩阵冻结已经生效。
- 重复子树更新确实存在，但它的 CPU 收益仍应通过去重后的独立对照测量确定。
- 模型下载压缩、顶点减面、拾取姿态缓存、绘制调用优化已完成，详见 [既有 3D 性能记录](/Users/anuluca/Work/Space_Coding/Anutrium/docs/performance/3d-scene.md)。不将这些重复列为缺失项。

### 2.3 首次资源

| 冷进入路由 | 已请求 JS 文件合计 | gzip 估算 | 已请求 CSS 文件合计 | Unbounded 字体响应体合计 | 字体 URL 数，包含其他字体 |
| --- | ---: | ---: | ---: | ---: | ---: |
| `/` | 1,143,895 B | 344,133 B | 290,117 B | 505,316 B | 27 |
| `/archive` | 1,221,658 B | 376,730 B | 394,319 B | 614,804 B | 33 |
| `/craft` | 1,050,814 B | 311,462 B | 345,890 B | 569,252 B | 31 |

- 首页 HTML 及其静态导入依赖为 1,004,310 B JS，另有异步场景、GSAP、OrbitControls 等请求；表格统计包含已实际请求的异步文件。
- 首屏 `vendor-three`：524,352 B，gzip 129,345 B；`vendor-element-plus`：209,563 B，gzip 72,936 B。
- 首页初始覆盖率中，Element Plus 约 133,281 B、OrbitControls 约 13,083 B 的函数范围未执行。**未执行不等于无用或可直接删除**，只能支持调整组件/路由加载边界。
- Unbounded 共 90 个字体文件，CJK 按 256 码位分块；字体声明在主 CSS 内约 58,978 B。Archive 实际请求 33 个不同字体 URL，而字体 Service Worker 缓存容量为 8。
- 线上 JavaScript 已使用 Brotli，且 `Cache-Control: public,max-age=31536000,immutable`；线上 Latin 字体也已有一年 immutable 缓存。Service Worker 容量不足影响其缓存覆盖，**不代表 HTTP 缓存命中时必然重新下载字体**。
- Island 摄影封面抽查：原图 `DSC00812-01-01.jpeg` **266,051 B**，同图 `?image=card-thumb` **9,709 B**，`?image=card-mobile` **4,892 B**。已有图片转换工具可直接复用。

## 3. 有明确实现依据的优化项

优先级：P1＝优先处理；P2＝第二批；P3＝低收益或仅特定页面/输入规模下有效。

| ID | 优先级 | 当前开销与依据 | 建议方案 | 风险/验证要求 |
| --- | --- | --- | --- | --- |
| 01 | P1 | [贡献图](/Users/anuluca/Work/Space_Coding/Anutrium/src/components/GitHubContributionGraph/index.vue:250)逐格无限运行 brightness/opacity；84 个实际活跃动画已测出常驻成本 | 减少独立动画数，取消逐格 brightness 或用少量整体合成动画；滚出视口、遮罩覆盖时暂停 | 闪烁细节可能变化；对比桌面/移动视觉、静止样式与绘制耗时 |
| 02 | P1 | [字体分块脚本](/Users/anuluca/Work/Space_Coding/Anutrium/scripts/build-unbounded-fonts.py:40)按 Unicode 块拆分；首页字体仍约 505KB | 按全站字频/共现关系构建常用字子集，其余完整字形继续延迟加载；范围保持不重叠 | 保留完整字符覆盖、字重和排版；重新跑字体校验与中英文截图 |
| 03 | P1 | [首屏 Header](/Users/anuluca/Work/Space_Coding/Anutrium/src/layout/index.vue:14)依赖 `ElHeader`/`ElIcon`，[打包规则](/Users/anuluca/Work/Space_Coding/Anutrium/vite.config.ts:134)将路由级 Element Plus 代码合入首屏 vendor | Header 和少量图标用原生标签/既有 SVG；重新设计 Element Plus 消费者分包，让路由组件延迟加载 | 不能只机械拆图标，需检查已有循环依赖、样式和全站组件初始化 |
| 04 | P1 | [3D Logo](/Users/anuluca/Work/Space_Coding/Anutrium/src/components/Logo_rotating3D/index.vue:495)没有帧率上限；`canRender` 只检查可见性，不检查 reduced-motion；实测桌面约 2.2s 渲染回调 341 次 | 增加显式帧率预算，low-power 与入场分别配置；继续按真实时间推进角速度；减少动效模式绘制静态结果 | 60/30 FPS 等预算需比较高刷新率观感；保留旋转停止位置与 `finished` 信号 |
| 05 | P2 | [Lenis](/Users/anuluca/Work/Space_Coding/Anutrium/src/utils/smoothScroll.ts:226)使用 `autoRaf:true`；安装版本的 `stop()` 不取消自动 RAF，首页锁定时仍回调 | 锁定期间停帧；进一步按滚动/惯性需求驱动外部帧循环 | 空回调单次较轻；验证滚轮、锚点、锁定、历史恢复与长页面惯性 |
| 06 | P2 | [背景活动条件](/Users/anuluca/Work/Space_Coding/Anutrium/src/components/BackController/index.vue:96)没有接入 About 遮罩；展开内容时背景粒子仍运行 | 为背景粒子与被覆盖装饰接入统一活动条件，保留最后一帧，恢复时延续状态 | 遮罩半透明，暂停会改变背景运动；要检查恢复和转场边界 |
| 07 | P2 | [场景矩阵更新](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Home/templeScene.ts:1630)手动更新模型子树后，`renderer.render` 再遍历更新 | 每帧集中更新一次世界矩阵；将投影、拾取和渲染安排在同一更新之后；按运动分组维护 dirty 状态 | 必须保留拾取和投影时序；验证倒影、移动父组、灯光 target 和命中区域 |
| 08 | P2 | [材质/灯光同步](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Home/templeScene.ts:1758)每次场景渲染都遍历颜色、碑体、灯光和倒影，头部变化也执行无关同步 | 按主题、悬停、聚焦、姿态拆分脏标记 (dirty flags)，只更新发生变化的组 | 比较快速连续切换、主题插值和末帧，防止颜色残留 |
| 09 | P2 | [碑文纹理](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Home/templeScene.ts:379)每次场景创建都 Canvas 绘字，且 `document.fonts.ready` 后再次 paint/上传 | 固定碑文烘焙为纹理图集，或缓存绘制结果；仅相关字体实际发生变化时重绘 | 保持字体、清晰度、横向字距和语言；不要重复优化已烘焙的 3D 挤出字形 |
| 10 | P2 | [About 遮罩](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/About/AboutOverlay.vue:14)遮罩进入完成后才挂载异步组件，此时才触发其代码/文案加载 | 打开 About 时并行预取代码和文案，仍等遮罩完成后挂载内容 | 保留现有“遮罩先出现”时序；快速关闭时不要挂载过期结果 |
| 11 | P2 | [FooterCom](/Users/anuluca/Work/Space_Coding/Anutrium/src/components/FooterCom/index.less:17)仍动画 left/bottom/width/height，[内部展开](/Users/anuluca/Work/Space_Coding/Anutrium/src/components/FooterCom/index.less:249)仍动画 width | 复用上一轮面板的首末布局反转播放 (FLIP)/transform 方案；固定最终盒尺寸后播放视觉变化 | 页脚避让、预览窗口和文字不能拉伸；需要全屏离场/弹窗滚动回归 |
| 12 | P2 | [字体 SW 缓存](/Users/anuluca/Work/Space_Coding/Anutrium/vite.config.ts:81)仅 8 条，不覆盖一个常用页面的字体请求 | 容量与分块数量匹配，按合理存储预算保留常用字体，清理旧版本 | HTTP immutable 缓存已存在；主要验证 SW 命中、离线和容量淘汰，不宣称每次必然重复下载 |
| 13 | P2 | [文案域](/Users/anuluca/Work/Space_Coding/Anutrium/src/locales/routeMessages.ts:22)Island 一次加载所有摄影/笔记等数据，Flânerie 一次加载全部旅行数据；构建域文件约 46KB/67KB | 拆成页级摘要与具体内容数据；详情按路由参数加载，保持缓存与中英文一致 | SSG、SEO、详情直达、返回状态和 `tm()` 消费路径需一起检查 |
| 14 | P3，仅 `/test` | [Island 入口](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Island/index.vue:6)静态导入 PC/Mobile 两套组件与样式 | 根据设备按需导入对应组件，切换设备时再加载另一套 | 保持服务端输出与客户端 hydration 一致，验证窗口跨断点切换 |
| 15 | P2，仅 `/test` | [Island 卡片](/Users/anuluca/Work/Space_Coding/Anutrium/src/composables/useIslandHarborData.ts:97)返回原始摄影/收藏图片，[PC 模板](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Island/PC.vue:93)直接作为缩略图 src | 复用 `getCardThumbnailUrl` / `getCardMobileThumbnailUrl`，按显示尺寸提供响应式候选 | 抽查原图 266KB、桌面缩略图 9.7KB；大图预览继续使用原图 |
| 16 | P2 | [路由预取](/Users/anuluca/Work/Space_Coding/Anutrium/src/router/index.ts:64)pointerover 一出现就立即加载页面和文案；穿过列表可能预取多页 | 悬停意图延迟、离开取消、当前链接去重；保留键盘 focus 预取和已有弱网判断 | 不延迟实际点击；统计误预取请求，不要取消已被真实导航需要的共享请求 |
| 17 | P2 | [TravelMap](/Users/anuluca/Work/Space_Coding/Anutrium/src/components/TravelMap/index.vue:386)语言或列表变化时销毁并重建地图 | 保留地图/瓦片层，按 key 更新 marker 和 popup 文本；列表仅更新差异 | 保留视角、主题、事件清理和地图实例版本保护 |
| 18 | P3 | [地图尺寸刷新](/Users/anuluca/Work/Space_Coding/Anutrium/src/components/TravelMap/index.vue:176)每次都安排 RAF、invalidateSize、tileLayer.redraw，初始化与揭幕都调用 | 用既有 `useFrameTask` 合帧；尺寸不变时跳过重绘，仅在需要时刷新瓦片 | 不删除曾解决空白瓦片的必要重绘；验证揭幕、展开/收起、跨断点 |
| 19 | P2 | [笔记瀑布流](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Island/StudyNotes/index.vue:205)循环读 `offsetHeight` 后立即写 `gridRowEnd` | 先批量读所有卡片尺寸，再统一写行跨度 | 已有分页和 RAF 合帧，不需要先引入虚拟列表；验证字体/图片晚加载和断点 |
| 20 | P2 | [About 装饰](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/About/index.less:612)和 [Island 滚动/雷达](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Island/PC.less:439)缺少完整的视口活动门控；部分元素长期 will-change | 离开可见区域/覆盖时暂停装饰动画；仅实际转场期间申请 will-change | About Logo 已有 IntersectionObserver，不能重复当成无可见性暂停；检查其他 CSS 装饰与 reduced-motion |
| 21 | P3 | [PageFooter Logo](/Users/anuluca/Work/Space_Coding/Anutrium/src/components/PageFooter/index.vue:236)只要鼠标仍 hover 就持续 RAF，即使目标角度已稳定 | 按“当前位置与目标角度差”决定是否续帧；新 pointermove 再唤醒 | 保留鼠标离开后的回正；当前悬停无移动时不应继续空转 |
| 22 | P3 | [数字动画](/Users/anuluca/Work/Space_Coding/Anutrium/src/components/CountUp/index.vue:65)每帧写浮点 ref，显示整数可能不变；[打字动画](/Users/anuluca/Work/Space_Coding/Anutrium/src/components/TypedText/index.vue:171)隐藏后仍继续定时推进 | 数字只在显示值变化时提交响应式状态；被遮罩覆盖/隐藏的长打字任务暂停或完成后一次提交 | CountUp 已有入视口启动、结束停帧；收益较小，保留结束信号、字距和占位 |
| 23 | P3 | [保险箱手柄轮询](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Games/SleepingDogs/SafetyBox/SafetyBoxGame.vue:486)无手柄连接也每帧 getGamepads | gamepadconnected 后启帧，断连/隐藏/游戏无需输入时停帧 | 某些浏览器需先通过交互发现手柄，保留低频发现兜底 |
| 24 | P2，限大输入 | [图片 Base64](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Craft/ImageBase64/index.vue:126)整段 Data URL 同时用于 img 与 code DOM；[编码工具](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Craft/Base64Codec/index.vue:113)每次输入全量 UTF-8 编码统计 | 图片预览用 Object URL；代码区域只渲染有限预览，完整值供复制/下载；大文本统计/转换按规模批处理或后台执行 | 输出必须完整正确；释放 Object URL；小输入无需 Worker |
| 25 | P3 | [弹跳工具 Canvas](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Craft/BounceDynamics/index.vue:334)每帧重新建渐变、画网格与模糊阴影 | 网格用缓存纹理平移，渐变/静态地面和阴影用可复用绘制资源；仅尺寸、主题变化时重建 | 动画背景有真实漂移，不能直接当作静态画面；比较物理轨迹、缩放和视觉 |
| 26 | P3，仅 `/test2` | [旧页图片预加载](/Users/anuluca/Work/Space_Coding/Anutrium/src/composables/useImagePreloader.ts:16)批量 new Image，无并发预算；消费者会传入整组作品 | 小批量、接近视口或稳定意图时预取；按 saveData/弱网减少预算 | 当前首页不消费此工具，不属于现首页首屏热点 |
| 27 | P3 | [模型版本脚本](/Users/anuluca/Work/Space_Coding/Anutrium/scripts/lib/updateTempleAssetRevision.mjs:4)六份路卡/环境/标签资产共用一个内容版本；单改标签也改变其它资源 URL | 每文件或合理资产组使用独立内容哈希，保持兼容元数据与二进制成对更新 | 当前版本机制正确，优化的是发布间缓存复用；需验证所有构建脚本更新流程 |
| 28 | P3 | [Logo resize](/Users/anuluca/Work/Space_Coding/Anutrium/src/components/Logo_rotating3D/index.vue:587)无尺寸相等保护，同时 setPixelRatio 与 setSize | 缓存宽高/DPR，实际变化才改缓冲；复用首页 `setDrawingBufferSize` 一次更新模式 | 保持边线分辨率、bottomAnchor、资源缓存恢复与容器 ResizeObserver 行为 |
| 29 | P3 | [场景诊断](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Home/templeScene.ts:1880)生产环境仍计算/写入大量数值型 data-* 诊断属性 | 区分业务状态和调试数值；后者仅 DEV、测试或显式诊断模式发布 | 已有 100ms 限频、值相等不写；剩余收益较小，测试开关要可用，关键 ready/入口/可见性状态不能删 |

## 4. 需要验证收益或视觉取舍的方案

| ID | 方案与依据 | 验证/取舍 |
| --- | --- | --- |
| V1 | [方尖碑、底座、倒影](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Home/templeScene.ts:434)可考虑实例化 (Instancing)、按相同材质合并几何；对 intensity=0 的灯光也可检查更新成本 | 当前已有约 64 次交互帧绘制调用 (draw calls) 的优化成果。先分析材质差异和透明排序，再测驱动 CPU/GPU；不能合并后破坏主题、透明度或单碑聚焦，也不要每帧改变灯光数量造成着色器重编译 |
| V2 | [新叶喵材质](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Home/templeScene.ts:3051)从初始透明 DoubleSide 的 chrome 材质克隆；路卡后续单遍开关不会自动同步给它 | 常态有效 alpha=1 且满足深度条件时可能复用单遍策略。确认默认材质状态和实际调用，比较渐隐、线框混合及倒影；预热新变体，避免首次切换卡顿 |
| V3 | [着色器预热](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Home/templeScene.ts:2939)全场景 compile/render 两轮；[离场释放](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Home/templeScene.ts:3236)导致返回首页重建 GPU 资源 | 先分解首屏 CPU/GPU 时间，考虑分阶段预热及受限 GPU 资源复用。两轮当前有不同裁切/透明变体用途，不能直接删除；复用会增加显存、上下文和生命周期复杂度 |
| V4 | [指针调度](/Users/anuluca/Work/Space_Coding/Anutrium/src/utils/pointerSamples.ts:18)按原生事件遍历订阅者并分配尾部 timer；[命中轮廓](/Users/anuluca/Work/Space_Coding/Anutrium/src/views/Home/templeScene.ts:1390)运镜帧中排序凸包并更新盒尺寸/clip-path | 当前已有单监听器、模型 30Hz、按构图 dirty 更新、相等样式跳过。只有高采样鼠标/低端设备分析显示热点后，再统一帧采样、预计算拓扑或改命中层表示；保证拾取精度和交互延迟 |
| V5 | [Typekit](/Users/anuluca/Work/Space_Coding/Anutrium/src/utils/typekit.ts:60)全站 load 后 idle/1s timeout 调度，没有与入口就绪或实际字体需求关联 | 本次隔离 CPU 样本屏蔽它，尚无独立收益数据；需测实际字体请求、字体替换重排。字体在全站广泛使用，不能认定可移除；进一步延迟可能增加字体跳变 |
| V6 | [全局 CSS](/Users/anuluca/Work/Space_Coding/Anutrium/src/main.ts:13)与共享组件样式处于首屏依赖图，首页已请求 CSS 约 290KB，其中字体声明约 59KB | 用完整交互后的规则覆盖、网络依赖与渲染阻塞时间确定拆分目标。当前 CSS 跟踪只返回实际用过规则，不能据其声称“0 未用 CSS”或给出删除比例；避免把首屏必需样式延迟导致闪烁 |

## 5. 本轮排除或暂不建议的方向

- 首页场景、光标已有按需帧循环；场景静止、About 覆盖和展开状态已有暂停机制。问题集中在 Logo、Lenis 和其他装饰，不是整个 Three.js 场景一直跑。
- 首页模型、环境、标签已经提前并行请求且会话去重；代码/文案已按面板懒加载，聚焦开始预取 Archive/Journey 已存在。
- 初始线框 Logo 不再加载 RoomEnvironment/Bloom 后处理；剩余 OrbitControls 是单独问题。
- 字体已经 WOFF2、unicode-range、首屏 Latin preload、swap；优化应重排子集，不是改回完整大字体。
- Three.js 初始覆盖率未执行的函数不等于未使用库。首页场景实际消费 Three.js；若要工具页彻底避免它，需要更换/预烘焙 3D 入场 Logo，属于视觉方案取舍，不应作为无损优化直接承诺。
- 不将既有 SW/HTTP 缓存说成缺失；线上 JS 已 Brotli/immutable，字体已有 immutable。
- 模型解压后的最大环境缓冲现在约 1.57MB，且使用浏览器流式解压 API。未测出独立长任务前，不先引入 Worker、WASM 解压或更复杂压缩格式。
- 现有旅程分批挂载、笔记分页、图片 lazy/async、地图延迟初始化已存在；未发现足以证明需要全站虚拟列表的规模证据。
- 临时表格/数据缓存缺少进行中的 Promise 去重可以作为未来并发实例的改善，但本轮没有观测到重复并发请求，不单独列为当前热点。

## 6. 实施顺序与验收

1. **01 / 02 / 03 / 04**：先处理贡献格动画、字体子集、首屏 UI 包与 Logo 帧率。
2. **05 / 06 / 07 / 08 / 10 / 11 / 19**：再处理常驻循环、矩阵/材质更新、请求与遮罩并行、剩余几何属性动画和瀑布流读写。
3. 其余 P2、P3 根据访问频率与实际 trace 排序；V1–V6 先做对照，不直接承诺收益。

| 范围 | 验收要求 |
| --- | --- |
| 贡献图/背景 | 同样数据、字体、视口与 GPU 后端下做正常/优化/恢复对照；统计任务、样式、绘制和活跃动画数量 |
| 3D 转场 | 默认/聚焦/失焦/快速切换/遮罩/隐藏/主题切换；画布尺寸、倒影、姿势、透明排序、拾取与最后一帧保持一致 |
| 首次加载 | 冷缓存、热缓存、首次进入/返回、直接路由、弱网；分别统计 JS/CSS/字体/模型，测试首次真实交互覆盖 |
| 布局与页脚 | 桌面/移动离场页面与容器 top/left 偏移 ≤1px；涉及弹窗时运行 overlay-scroll 检查，滚动/锚点/body 宽度偏移 ≤1px |
| 类型/构建 | 对应 type-check、生产构建与目标功能回归；本轮为审计，没有新增业务代码，因此未重复跑全套回归 |

## 7. 证据与参考

- [精简测量数据](/Users/anuluca/Work/Space_Coding/Anutrium/docs/performance/remaining-optimization-audit-data.json)。临时复现脚本：`.tmp/remaining-perf-audit.mjs`、`.tmp/remaining-scene-audit.mjs`、`.tmp/remaining-production-audit.mjs`；`.tmp` 不纳入版本控制。
- [Chrome 官方动画性能指南](https://web.dev/articles/animations-guide)：检查会触发布局/绘制的属性，优先在合成阶段动画，避免长期无条件 will-change。
- [Three.js Object3D 官方文档](https://threejs.org/docs/pages/Object3D.html)：区分局部矩阵更新、世界矩阵更新及自动更新控制；任何去重必须保持动态父子变换正确。
