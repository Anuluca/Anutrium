# 路卡利欧模型

- 文件：`lucario.glb`（82,332 字节）
- 来源：https://github.com/Pokemon-3D-api/assets/blob/main/models/opt/regular/448.glb
- 上游 Git blob：`db971c2a91da5e1c2a760f297cdfe5ffdd01b7a0`
- 下载日期：2026-10-08
- 格式：glTF 2.0，Draco 网格压缩、WebP 纹理。
- 模型角色及原始美术版权属于 Pokémon 的相应权利方。

`public/draco` 的解码文件复制自项目已安装的 Three.js Draco 解码器。

## island 运行时资源

- `lucario-island.bin` / `.json`：预烘焙的姿势、法线、镜像对齐网格、头部权重和减面统计。当前 1,701 个三角面，二进制 39,522 字节。头部处理区域由 1,112 面降至 428 面；颈部在焊接材质子网格、移除牙齿壳体后，从 116 面降至 70 面，连接处同步镜像重排。旧的 140 面颈部统计包含之后删除的 24 个牙齿壳体面，已修正统计口径。
- `lucario-studio.bin.gz` / `.json`：256px 立方体分辨率的 HalfFloat 摄影棚反射，预先完成 PMREM 卷积；压缩 1,619,000 字节，解压后 6,291,456 字节。
- 运行时只下载烘焙资源，不读取原始 GLB、不加载 Draco、不执行摆姿势、镜像焊接或减面。
- 浏览器会话内复用下载数据；每次离场释放画布、显卡资源、监听订阅和定时器。

原始姿势与减面代码保留在 `scripts/lib/prepareLucarioGeometry.ts`，反射环境在 `scripts/lib/prepareLucarioEnvironment.ts`。修改后，复用已运行的开发服务执行：

```sh
yarn build:lucario-model
```

该脚本使用 Playwright 访问现有 Vite 服务编译辅助模块，默认 `http://localhost:3000`（可通过 `LUCARIO_BUILD_URL` 指定），不会启动或停止开发服务。
