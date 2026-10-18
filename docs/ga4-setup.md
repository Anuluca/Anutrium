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

About 不再展示完整 GA4 报表，仅在 Passion 容器左上角显示两个计数。采集仍使用 GA4，不移除路由浏览与业务事件上报。

## Passion 访问计数

- 组件：`src/views/About/SiteVisitors.vue`；独立 About 和首页 About 聚焦层共用。
- 当前在线：`/analytics/online`，使用数据流 `4620543849` 近 5 分钟（0–4 分钟）的去重活跃用户估算，非精确在线连接数；提示文本注明口径。实时 API 无主机名维度，可能包含同一数据流的其他站点访问。
- 总浏览量：`/analytics/views`，查询资源 `353411419` 能读取的全部历史 `screenPageViews`，按 `worker/src/analyticsCounters.ts` 的新旧站域名白名单合并；包含 `.icu`、`.cn` 及已识别的旧部署地址，排除 localhost、127.0.0.1 和其他预览域名。不叠加固定历史偏移，避免重复累计。
- 2026-10-18 核验：新站 `.com` 688 次，旧站域名 306 次，合计 994 次。仅代表核验时 GA4 已处理的数据；未采集或其他资源中的旧数据不在此数内。
- 失败或无已处理浏览记录显示 `—`；明确返回的零值显示 `0`。两个计数独立请求，单项失败不影响另一项。
- 可见时每分钟读取；离开视口、切换后台或卸载即停止轮询并取消订阅。总浏览量应用缓存 10 分钟，在线应用缓存 30 秒；路由重挂载复用缓存。
- 常规报表通常延迟 2–6 小时，完整处理可能需要 24–48 小时。
- 既有 `/analytics/summary` 与 `/analytics/realtime` 端点暂保留兼容旧前端；新组件不会请求这些完整报表。

### 服务端权限

1. 在 Google Cloud 项目启用 `Google Analytics Data API`。
2. 创建服务账号，不授予 Google Cloud 项目角色。
3. 在 GA4 的**媒体资源**访问权限管理中，将服务账号邮箱添加为“查看者”；不需要账号级管理权限。
4. 在服务账号的“密钥 → 添加密钥 → 创建新密钥”选择 JSON，将文件保存在仓库外。CSV 报表导出不是认证密钥。
5. 通过受保护的文件标准输入，把 JSON 完整内容设置为既有 `anutrium-steam-api` Worker 的 Secret `GA4_SERVICE_ACCOUNT_JSON`。不要把私钥写进前端、配置文件或终端命令参数。
6. 部署 Worker；仅推送前端不会更新 Worker。确认 `/analytics/views` 和 `/analytics/online` 返回真实计数后，再验证 Passion 组件。

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
