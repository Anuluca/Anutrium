# AI Agent 复刻实验

## 配置入口

- `src/config/aiReplicaExperiments.ts`：案例的唯一配置来源。
  - `id`：唯一案例标识。
  - `path`、`routeName`：唯一静态地址和路由名；现有地址须保持稳定。
  - `title`、`titleEn`：测试列表卡片标题。
  - `pageTitle`、`pageTitleEn`：页面标题及路由元信息。
  - `model`：卡片上的模型与推理强度说明。
  - `description`：复刻容器下方的附属文字，按案例配置完整文案。
  - `cover`：线上 R2 封面地址，由 `WorkCard` 统一处理缩略图。
  - `referenceImage`：可选的线上原参考图地址；配置后在附属文字右侧显示查看按钮，通过 `SafeImageViewer` 打开原图。
  - `sceneLabel`：复刻容器的无障碍标签。
  - `canvas`：原始设计宽高，单位为 CSS 像素。
  - `loadScene`：异步加载案例组件。
- 列表、实验数量和路由均从该配置生成，无需逐处添加。

## 新增案例

1. 在 `src/views/AiPlayground/` 下新增案例组件。
   - 根容器宽高设为 `100%`，内部按 `canvas` 的原始坐标编排。
   - 页面布局、等比缩放、附属文字及页脚由公共模板提供，案例组件只承载复刻内容与交互。
   - 固定像素坐标的样式选择器须包含 `.no-rem`，避免 PostCSS 转换后改变设计尺寸。
   - 图片使用线上 R2 地址；交互弹窗复用 `ModalWrapper`。
2. 在 `aiReplicaExperiments` 数组追加配置，例如：

   ```ts
   {
     id: 'example-replica',
     path: '/ai-playground/example-replica',
     routeName: 'EXAMPLE_REPLICA',
     title: '示例 UI 复刻',
     titleEn: 'Example UI Recreation',
     pageTitle: '示例复刻测试',
     pageTitleEn: 'EXAMPLE RECREATION',
     model: '实际使用的模型',
     description: '实际生成方式说明',
     cover: 'https://assets.anuluca.com/案例封面.webp',
     sceneLabel: '示例交互界面',
     canvas: { width: 1440, height: 900 },
     loadScene: () => import('@/views/AiPlayground/Example/index.vue'),
   }
   ```

3. 验证类型检查、列表入口、直达地址、窗口适配与案例交互。涉及弹窗时按 `AGENTS.md` 执行滚动安全检查。

## 公共模板

- `src/views/AiPlayground/index.vue`：按路由选择配置并异步加载案例组件。
- `components/ReplicaExperimentLayout.vue`：标题、返回入口、复刻容器、描述、窗口测量及统一缩放。
- `components/ReplicaExperimentLayout.less`：公共视觉和移动端旋转适配。
- 电脑端首屏只容纳标题、复刻画布和描述，并避让底部固定信息栏；版权页脚保留在首屏之后，通过滚动查看。容器和窗口变化由 `ResizeObserver` 与 `useFrameTask` 合并处理。
