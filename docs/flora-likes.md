# 花花小窝喜爱功能

## 接口与存储

- `GET /floratrium/likes`：返回两只模型的真实总数、访客签名标识、今日剩余额度与北京时间下次重置时间。通过 `X-Flora-Visitor` 复用匿名标识；浏览器将其保存在 localStorage。
- `POST /floratrium/likes`：JSON `{ petId, requestId, visitorToken }`；petId 为 `huahua` 或 `xiaohei`，requestId 为 UUID v4。相同访客在同一天重复提交同一个 ID 不会重复增加，跨模型重用返回 409；每日两只模型合计最多 10 次，达到上限返回 429。
- `GET /admin/floratrium/likes`：读取总数、最近 90 天统计、最近 30 次后台调整记录。需要既有 `HOME_FEATURES_TOKEN` Bearer 鉴权。
- `PUT /admin/floratrium/likes`：JSON `{ counts: { huahua, xiaohei }, version }`，整数范围 0–1,000,000,000。旧版本写入返回 409，不会覆盖期间产生的新点击。后台调整总数不修改实际点击统计或访客额度。
- 数据由 `FLORA_LIKES` SQLite Durable Object 持久化。总数、额度、去重及统计在事务内提交。每日 alarm 清理超过 90 天的点击记录；总数持续保留。
- 统计维度：北京时间日期、模型、独立访客日数、Cloudflare 国家／地区、设备类别、浏览器类别。不存储原始 IP、完整 User-Agent 或访客签名到报表。
- 无登录状态下，额度绑定匿名浏览器标识；清除浏览器存储、无痕窗口、跨设备可能获得新额度，不能视为实名去重。服务端签名防止自行伪造已有身份，但不能阻止访客重新申请匿名身份。

## 网站与后台

- 网站模型右上方爱心左侧显示喜爱数，UnboundedSans 400。爱心悬停变为 `#E23456`；点击立即本地加一并冒出一次 `+1`，同时闪烁两次，后台异步持久化与校准；失败时回退。计数字体与图标等高并向右渐隐。减少动态效果模式关闭闪烁与移动。
- 网站采用本地即时反馈，服务端返回后校准，失败回退；网络失败复用请求 ID 重试，未确认请求保留至重试或后续读取确认。
- 后台入口：AnuConsole `/anutrium/data`。管理员可以改数，只读账号可看统计但写入返回 403。浏览器只访问受保护的 `/api/data/flora-likes`，管理密钥只在服务端使用。
- 网站每 30 秒在可见状态下刷新总数，并在重新回到页面时刷新；后台修改一般在下次刷新体现。后台统计提供近 7／30／90 天选项。

## 发布

1. 先发布此仓库 `worker`。已有 `HOME_FEATURES_TOKEN` 不变；Wrangler 配置新增 `FLORA_LIKES` 绑定和 `flora-likes-v1` SQLite migration，发布时自动创建存储，无需手动创建 D1。
2. 发布 Anutrium 前端，使 `netlify.toml` 的 `/api/floratrium/likes` 同源转发生效。本地开发默认直接访问线上 Worker；可选 `VITE_FLORA_LIKES_URL` 只覆盖公开接口地址，不是密钥。
3. 发布 AnuConsole。沿用现有服务端 `HOME_FEATURES_TOKEN`；默认由 `HOME_FEATURES_URL` 的域名推导管理端点，特殊环境可设置服务端 `FLORA_LIKES_URL`。不可使用 `NEXT_PUBLIC_` / `VITE_` 暴露管理密钥。
4. 发布后只读验证公开计数与后台读取；真实点击会计入统计，不用自动化测试对线上接口制造点击。

## 验证

- Worker：`node --test tests/*.test.mjs`、`tsc --noEmit`、`wrangler deploy --dry-run`。
- 网站：`yarn type-check`、`yarn playwright test tests/flora-likes.spec.ts tests/flora-media-layout.spec.ts --workers=1`。
- 后台：`npm test`、`npm run typecheck`、`PLAYWRIGHT_CHANNEL=chrome npx playwright test tests/flora-likes.spec.ts`。浏览器测试 mock 写操作。

## 技术依据

- [R2 限制：同一对象每秒一次写入](https://developers.cloudflare.com/r2/platform/limits/)，因此喜爱计数不采用单一 R2 JSON 文件。
- [SQLite Durable Object 事务存储](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)。
