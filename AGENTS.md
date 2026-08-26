# 项目协作规范

本文件用于记录所有长期、通用的开发与设计约束。修改项目代码前，先阅读并遵守本文件；如果当前需求与本文件冲突，先指出冲突并请求确认。

## UI 视觉规范

- 禁止使用多层阴影；单个元素最多使用一层 `box-shadow`。
- 默认采用克制、清晰的视觉层级，避免装饰性渐变与过度动效。
- 修改界面时优先复用已有颜色、间距、圆角、字体和组件样式。
- 新增弹窗默认复用 `ModalWrapper` 的电视机样式，关闭按钮默认位于窗口外侧下方居中；作品卡使用 `work-detail` 特例（桌面端右上内部、手机端单独一行）。除非当前需求明确指定其他形式。

## 前端实现规范

- 修改前先检查是否已有可复用的组件、工具函数或样式。
- 必要情况如存在第二种性能更好的实现方案时可以安装新依赖实现
- 不要写过于多余的注释，比如小修改

## 路由过渡规范

- 全屏页面离场期间，不得提前移除会影响盒模型、定位或滚动状态的 `html` / `body` Shell 类；必须先切换或保留对应的 leaving 类，并仅在 `after-leave`、`leave-cancelled` 或超时兜底中清理。
- 新增或修改全屏页面、路由过渡、全局页面边距时，必须运行桌面端与移动端的离场几何回归测试，保证旧页面及路由容器在离场期间的 `top`、`left` 偏移不超过 `1px`。

## 页脚复用规范

- 所有路由必须显式设置 `meta.pageFooter`。需要页面版权区时设为 `true`，并且页面只挂载一次 `PageFooter`；工具内页统一通过 `ToolPageLayout` 提供。
- 禁止在页面级样式中覆盖页脚高度、底部偏移或 `FooterCom` 避让距离，统一由 `PageFooter` 计算。
- 新增带参数且启用页脚的路由时，必须在 `tests/page-footer.spec.ts` 的 `dynamicRouteSamples` 中补充一个有效路径。

## 弹窗滚动安全规范

- 页面级弹窗必须使用 `ModalWrapper`；图片预览必须使用 `SafeImageViewer`；确认框必须使用 `confirmWithoutPageShift`。禁止在业务组件中直接使用 `ElDialog`、`ElImageViewer` 或 `ElMessageBox`。
- 禁止启用 Element Plus 的 `lock-scroll` / `lockScroll`，禁止通过 `body.style` 或弹窗状态类设置 `body` 的 `overflow: hidden/clip`。背景锁定统一使用 `setSmoothScrollLocked`。
- 新增或修改弹窗时，必须运行 `yarn check:overlay-scroll` 与 `yarn test:overlay-scroll`；页面 `scrollTop`、内容锚点和 `body` 宽度偏移不得超过 `1px`。

## 待补充
