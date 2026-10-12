# 路卡利欧模型

- 构建源文件：`scripts/assets/lucario/lucario.glb`（82,332 字节），不放入公开部署资源；页面只使用减面后的 `lucario-island.*`。
- 来源：https://github.com/Pokemon-3D-api/assets/blob/main/models/opt/regular/448.glb
- 上游 Git blob：`db971c2a91da5e1c2a760f297cdfe5ffdd01b7a0`
- 下载日期：2026-10-08
- 格式：glTF 2.0，Draco 网格压缩、WebP 纹理。
- 模型角色及原始美术版权属于 Pokémon 的相应权利方。

`public/draco` 的解码文件复制自项目已安装的 Three.js Draco 解码器。

## island 运行时资源

- `lucario-island.bin` / `.json`：预烘焙的姿势、法线、镜像对齐网格、头部权重和减面统计。当前 1,701 个三角面，二进制 43,710 字节。头部处理区域由 1,112 面降至 428 面；颈部在焊接材质子网格、移除牙齿壳体后，从 116 面降至 70 面，连接处同步镜像重排。旧的 140 面颈部统计包含之后删除的 24 个牙齿壳体面，已修正统计口径。
- `lucario-studio.bin.gz` / `.json`：128px 立方体分辨率的 HalfFloat 摄影棚反射，预先完成 PMREM 卷积；压缩 492,086 字节，解压后 1,572,864 字节。保留 HDR 与金属反射，仅降低环境采样分辨率。
- 运行时只下载烘焙资源，不读取原始 GLB、不加载 Draco、不执行摆姿势、镜像焊接或减面。
- 浏览器会话内复用下载数据；每次离场释放画布、显卡资源、监听订阅和定时器。

原始姿势与减面代码保留在 `scripts/lib/prepareLucarioGeometry.ts`，反射环境在 `scripts/lib/prepareLucarioEnvironment.ts`。修改后，复用已运行的开发服务执行：

```sh
yarn build:lucario-model
```

该脚本使用 Playwright 访问现有 Vite 服务编译辅助模块，默认 `http://localhost:3000`（可通过 `LUCARIO_BUILD_URL` 指定），不会启动或停止开发服务。

## 新叶喵趴睡模型

- 来源：[The Models Resource：#0906 Sprigatito](https://models.spriters-resource.com/nintendo_switch/pokemonscarletviolet/asset/340244/)，上传者 Centrixe the Dodo，贡献者 Random Talking Bush；角色及原始模型版权归 Pokémon 相应权利方。
- 原始骨骼模型与身体贴图位于 `scripts/assets/sprigatito/`，仅参与离线构建，不随首页下载。
- 睡姿来自《宝可梦朱紫》原始动画 `pm1010_00_00_00281_sleep01_loop.tranm`（121 帧、60 FPS），构建时采样第 0 帧的骨骼位置、旋转和缩放，不再手动调整眼睑或四肢。原始动画保存在 `scripts/assets/sprigatito/`。
- 在采样睡姿上将头部侧歪 15°、抬头 14°，尾巴四段分别向身体方向弯曲 8°、12°、10°、8°；原始动画文件保持不变。
- 同目录保留原始 `pm1010_00_00.trskl`，读取分段缩放补偿标志，避免颈部动画缩放传递到头部。构建时检查头部世界缩放保持均匀，防止头部被压扁。
- `sprigatito-sleep.bin.gz` / `.json`：直接保存减面后的网格与睡姿/抬头变形目标，共 2,066 个三角面、1,089 个顶点；解压 64,668 字节、gzip 下载 45,817 字节。实体与线框显示共用这一份模型，不再保存减面前的运行时网格。
- 运行时复用下载缓存、环境反射和场景释放流程，不运行骨骼、贴图解码或持续睡眠动画；运镜约完成 75% 时开始歪头抬头，动作持续 1.1 秒，退出时恢复睡姿，倒影同步。
- 当前复用路卡雕像的金属材质参数，并随主题色更新。原彩色材质参数备份在 `scripts/assets/sprigatito/original-material.json`，原始贴图仍保存在构建目录，`prepareSprigatitoGeometry.ts` 可重新采样顶点颜色；运行时金属模型不携带未使用的颜色属性。
- 新叶喵悬停使用独立橙色主题 `#8a2c1b`（FLORATRIUM 原色）并压暗其他元素，点击后运镜至左下构图、显示顶光与地面光晕，其他底座及倒影渐隐，不挂载二级菜单；空白点击或 Escape 恢复首页，底座及倒影渐显。
- 新叶喵聚焦名为“花花小窝 / FLORATRIUM”，路卡雕像聚焦名为“个人海湾 / ISLAND”；聚焦后显示导航，两个模型入口均支持直接切换。
- 初始状态悬停新叶喵时，路卡圣光渐隐，新叶喵加宽的橙色顶光渐显；点击后顶光保持连续，移开后恢复，悬停不触发头部动作。
- 解析逻辑参考 [Pokémon Switch Model Importer 的 GFLib/Anim](https://github.com/ChicoEevee/Pokemon-Switch-Model-Importer-Blender/tree/main/GFLib/Anim)，保留 DAE 根节点的单位与坐标转换。
- 修改构建逻辑后，复用现有 Vite 服务执行 `node scripts/build-sprigatito-model.mjs` 重新烘焙。
- 构建器同时生成内容版本 `src/utils/sprigatitoModelRevision.generated.json`，模型请求携带版本参数，开发页面随版本更新，避免仍显示会话缓存中的旧姿势。

## 场景运行时优化

- `sprigatito-sleep.*` 是唯一运行时模型；构建时先联合约束睡姿与抬头姿态进行减面，再删除未引用顶点，直接写入模型文件。显示模式只切换材质，不切换模型密度。
- 不再输出高面数或按显示模式分开的模型文件；原始 DAE、动画及贴图仅作为构建输入保留在 `scripts/assets/`，不会随首页下载。
- 重复执行资源优化命令只重压缩现有减面模型，不会再次减面；重新采样原始姿势时才重新运行简化。
- `temple-label.bin.gz` / `.json`：预烘焙 `ISLAND` 挤出字形、法线与逐字动画属性。gzip 下载 33,743 字节，GPU 几何缓冲 115,168 字节；运行时不解析字体、不挤出或三角剖分。修改字形源数据后需重新生成。
- 方尖碑的两级底座共用一个合并几何体；路卡三级底座也合并。倒影共用几何体，同一个镜像内复用材质。
- 碑文纹理使用 128×768 像素，绘制坐标保持原比例；纹理像素数为原来的 1/4。
- 路卡和新叶喵的拾取顶点按姿态缓存；姿态改变时失效，后续射线不重复计算相同顶点。仅作用于 CPU 拾取，不上传动态顶点缓冲。
- 模型、环境与字形资源请求携带内容版本，下载失败会清除缓存并支持重试；gzip 同时支持服务器自动解压与浏览器流式解压。

重新生成所有运行时资源（复用现有 Vite 服务）：

```sh
yarn optimize:model-assets
```

该命令读取现有减面模型，生成统一模型、3D 字形、128px 环境及内容版本；不会重新摆姿势。修改模型源姿势时分别使用 `yarn build:sprigatito-model` 或 `yarn build:lucario-model`。
