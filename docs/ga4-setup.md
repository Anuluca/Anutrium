# GA4 接入

## 采集配置

1. 在 Google Analytics 创建资源，时区选中国标准时间，创建网址为 `https://anuluca.com` 的网站数据流。
2. 将 `G-` 开头的衡量 ID 填入 Netlify 的构建环境变量 `VITE_GA4_MEASUREMENT_ID`，重新构建部署后生效。
3. 数据流 → 增强型衡量 → 网页浏览 → 高级设置：关闭“基于浏览器历史记录事件的网页变化”。代码已经统一上报首次访问和成功的路由切换；仅设置 `send_page_view: false` 不会关闭后台的历史记录自动采集。
4. 本地默认不采集。如需验证，在 `.env.local` 设置 `VITE_GA4_ENABLE_DEV=true`、`VITE_GA4_DEBUG=true`，并填入衡量 ID；环境变量变化需要用户重启现有开发服务。验证后移除开发采集开关。
5. 在 DebugView 和实时报告中验证：首次访问、切换页面、浏览器后退各产生一次 `page_view`；重复点击当前路由不增加浏览量。确认 Google 脚本和 `g/collect` 请求在目标网络下成功。

## 业务事件

`trackEvent()` 统一清洗参数后直接转发到 GA4；已删除没有调用方的旧事件总线和备用 HTTP 上报：

| 事件                  | 含义     | 主要参数                                |
| --------------------- | -------- | --------------------------------------- |
| `project_click`       | 查看作品 | `project_id`、`project_title`、`source` |
| `tool_click`          | 进入工具 | `tool_id`、`tool_title`、`source`       |
| `share`               | 分享     | `method`、`target_id`、`target_type`    |
| `resume_click`        | 简历操作 | 以现有调用参数为准                      |
| `external_link_click` | 外链点击 | `href`、`label`、`link_type`            |

需要按项目或工具分析时，在管理 → 自定义定义中注册对应的“事件”范围自定义维度。无需给每个字段都注册；不要发送邮箱、手机号、表单正文或令牌。业务点击与增强型衡量的自动外链 `click` 是不同事件，报表不要将二者相加当作同一个点击数。

## 网站内统计页的读取配置

采集 ID 不能用于读取报表。读取需要 GA4 数字资源 ID、启用 Google Analytics Data API 的 Google Cloud 项目及有该资源查看权限的服务账号。服务账号私钥仅保存到 Worker Secret，不得放入前端 `VITE_` 变量或提交 Git。

当前已实现 About 公开汇总面板及固定范围的读取接口与缓存。报表数据有处理延迟；实时报告与常规报告分开查询。

官方参考：

- https://developers.google.com/analytics/devguides/collection/ga4/views
- https://developers.google.com/analytics/devguides/reporting/data/v1/quickstart

## About 公开统计区

- 位置：`AboutContent.vue` 的最后一个内容区、`PageFooter` 前；独立 About 页面和首页 About 聚焦层共用。
- 衡量 ID：`G-FEZS2B4N4L`，已在 `netlify.toml` 的构建环境中配置。
- 资源 ID：`353411419`；数据流 ID：`4620543849`。现有数据流名称为旧站 `Anuluca.icu`，采集可复用同一 ID。
- 常规报表仅查询主机名 `anuluca.com` 和 `www.anuluca.com`，不混入旧域名数据；实时 API 不支持主机名维度，使用该数据流 ID 过滤，可能包含同一数据流中其他域名的实时访问。
- 时间范围：近 7 / 30 / 90 天，包含今日；按 GA4 资源时区计算。更新时间显示北京时间。
- 展示 14 项汇总指标、每日趋势、页面及入口、渠道及来源、推广、国家/地区/城市、设备/浏览器/系统/语言/屏幕、事件、时段及星期分布、自定义作品/工具/分享维度，以及实时用户、国家和事件。分类排名最多 20 项，时段完整展示 24 小时，超出时显示 TOP 与总行数。
- 自定义维度未注册、权限失败、无数据分别处理；未配置读取凭证时不使用演示数据填充线上面板。
- 每个报表保留隐私阈值、抽样及高基数汇总提示。没有交易或关键事件数据时，相应报表可能为空；此界面不等于复制 GA4 后台全部报告或逐用户访问轨迹。

### 服务端权限

1. 在 Google Cloud 项目启用 `Google Analytics Data API`。
2. 创建服务账号，不授予 Google Cloud 项目角色。
3. 在 GA4 的**媒体资源**访问权限管理中，将服务账号邮箱添加为“查看者”；不需要账号级管理权限。
4. 在服务账号的“密钥 → 添加密钥 → 创建新密钥”选择 JSON，将文件保存在仓库外。CSV 报表导出不是认证密钥。
5. 通过受保护的文件标准输入，把 JSON 完整内容设置为既有 `anutrium-steam-api` Worker 的 Secret `GA4_SERVICE_ACCOUNT_JSON`。不要把私钥写进前端、配置文件或终端命令参数。
6. 部署 Worker；仅推送前端不会更新 Worker。确认 `/analytics/summary?days=30` 和 `/analytics/realtime` 返回真实报表后，再验证 About 面板。

接口只接受固定范围，不接受客户端传入任意 Google API 请求、资源 ID 或维度。常规报表边缘缓存 600 秒，浏览器 HTTP 缓存 300 秒；实时边缘缓存 60 秒，浏览器 HTTP 缓存 30 秒。部分失败降为边缘 30 秒、浏览器 15 秒缓存；权限、限流及服务端错误立即停止后续批次。各报表失败不会伪造零值，全部失败返回 502，缺少配置返回 503。

### 验证

```bash
yarn type-check
yarn check:overlay-scroll
yarn test:overlay-scroll
yarn playwright test tests/ga4.spec.ts tests/site-analytics.spec.ts tests/analytics-resource.spec.ts
cd worker
yarn tsc --noEmit
node --test tests/analytics.test.mjs
yarn wrangler deploy --dry-run
```

## 本次联调记录

- 已将服务账号 JSON 设置为既有 Worker 的 `GA4_SERVICE_ACCOUNT_JSON` Secret；私钥未进入仓库。
- 已部署读取接口并验证 7 / 30 / 90 天的 23 份报表全部可读，实时接口返回成功。
- 已关闭数据流的“根据浏览器历史记录事件判断的页面更改”，由网站代码统一上报路由浏览。
- 已注册事件范围自定义维度：`project_title`（作品名称）、`tool_title`（工具名称）、`method`（分享方式）。新维度处理需要时间，不回补未采集的历史事件。
- 当前域名没有对应历史访问数据；旧 `.icu` 记录不计入此公开面板。
- Netlify 前端需要通过项目正常发布流程部署，构建时读取已配置的衡量 ID。

## 性能与结构

- `src/config/siteAnalytics.ts`：共用时间范围与汇总指标分组；展示顺序不再决定服务端查询字段。
- `src/utils/analyticsResource.ts`：最多四个资源缓存，普通汇总按生成时间保留至 10 分钟，实时 30 秒；同一请求的订阅者共享下载，最后一个订阅者取消才中止 fetch。
- `useSiteAnalytics`：复用 `useIntersectionActivation` 与文档可见性工具；离开视口或切到后台即暂停轮询，恢复时读取缓存或刷新。报表用 `shallowRef` 保存；切换范围时保留原结果并标明当前范围。
- 展示层按报表 ID 建立 Map，表头预先计算；数字格式化器按语言仅创建两份。
- `worker/src/analytics.ts`：HTTP 校验、缓存与公共错误响应。
- `worker/src/analyticsReports.ts`：固定查询和结果映射。23 份常规报表正常使用五次 batch 请求；仅自定义维度无效时拆分对应批次。实时国家报表同时请求 `TOTAL`，结合事件报表仅需两次请求；活跃用户总数不按国家相加。
- `worker/src/googleAnalyticsClient.ts`：JWT 签名与 API 通信。已完成的密钥导入和访问令牌按凭证缓存，令牌过期前 60 秒刷新，凭证改变或令牌返回 401 时失效；不跨请求共享未完成的 Worker I/O。
- 单次读取共享 30 秒时间预算，超时覆盖响应正文。边缘缓存未提供跨实例的全局请求合并，不宣称能消除所有并发冷请求。
