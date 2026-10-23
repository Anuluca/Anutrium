# UnboundedSans 完整字符分包

源字体保存于 `UnboundedSans-Regular.ttf`，来自本站原有资源
`https://assets.anuluca.com/fonts/unboundedsans.ttf`。
作者、版权和许可见随附 `OFL.txt`，上游为
https://github.com/maoken-fonts/unbounded-sans 。

- 拉丁字符（U+0000–024F）单独分包，用于入口文字预加载。
- 基本汉字每 256 个 Unicode 编码位置分组；稀疏扩展字符和符号使用更宽的范围，避免大量微小请求。CSS 声明每包实际包含的精确范围。
- 保留源字体全部字符映射，不扫描或裁剪站点文案。
- 输出在 `scripts/fonts/generated/`，上传到现有 R2 的 `fonts/unbounded/` 前缀。
- CSS 通过 `https://assets.anuluca.com/fonts/unbounded/` 按页面实际文字加载；网站部署不携带字体文件。
- 文件名带 SHA-256 前缀，字体更新后自动避开旧缓存。
- 生成时逐包重新读取 WOFF2 的字符映射，检查完整覆盖且没有重复。
- 普通构建运行 `check:fonts` 校验源文件、分包、样式和预加载地址的完整性。

新增文案无需重新生成。升级源字体或调整拆分规则时执行：

```sh
python3 -m pip install -r scripts/fonts/requirements.txt
yarn build:fonts
yarn check:fonts
yarn upload:fonts anutrium
```

重新生成后，先上传 WOFF2 和 OFL.txt 到 R2，再部署网站。
上传结束会自动通过公开域名检查全部分片的 HTTP 状态、CORS 许可和 SHA-256。
可单独执行 `yarn check:fonts:remote` 检查生产资源；本地完整性检查无法发现线上文件缺失。
上传复用 `worker/` 中已安装的 Wrangler 及本机 Cloudflare 登录；当前桶为
`anutrium`，其自定义域名为 `assets.anuluca.com`。仅新增有哈希的字体文件，
不删除旧分包，以便旧版本网页仍能加载。
提交源字体、生成脚本、生成样式、所有 WOFF2、清单和 `index.html` 的更新。
普通 CI 构建不需要 Python 或在线下载字体。
原字体自身没有的字符仍会正常使用后备字体。


### 全量同步保护

`全量同步R2.sh` 使用镜像同步，会删除远端存在但本地没有的文件。仅向线上上传
字体会导致下一次全量同步删除分片，CDN 缓存暂时掩盖缺失，清缓存后出现 404。

`yarn upload:fonts anutrium` 现在会自动识别相邻的 `../R2/全量同步R2.sh`，
先将分片和许可证新增到 `../R2/fonts/unbounded/`，再上传。已有文件只有内容完全
相同时才复用，不覆盖不同内容，也不删除旧分片。R2 项目位置不同时，可通过
`FONT_R2_MIRROR_ROOT` 指定其根目录。CI 中不存在本地 R2 镜像时不执行本地复制。

修复缺失后运行 `yarn check:fonts:remote`，确认所有原有公开 URL 的状态、CORS 与
SHA-256 均通过；上传成功本身不代表 CDN 中已缓存的 404 立即失效。
