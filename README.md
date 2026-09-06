# RCL Studio

[English](#english) | [中文](#中文)

![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Browser-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Offline](https://img.shields.io/badge/offline-ready-orange)

---

## 中文

**RCL Studio** 是一个纯前端的电子元器件仓库管理系统：单个 HTML 文件、零依赖、完全离线运行，数据保存在浏览器本地（IndexedDB），无需服务器、无需安装任何环境。

### 功能特性

- **元器件总览**：立创商城风格两级分类树、搜索、封装级联筛选、库存进度条（当前库存 / 最低库存）、低库存预警、库位管理
- **入库 / 出库管理**：独立页面，一级分类 → 二级分类 → 封装逐级级联筛选，超库存拦截，操作留痕
- **出入库记录**：完整流水，可按类型筛选，BOM 批量操作自动备注来源
- **BOM 核对**：直接导入立创EDA 导出的 BOM（.xlsx / .csv，内置解析器无需任何库），与仓库库存自动比对（LCSC编号 → 制造商型号 → 参数值 三级匹配），支持生产套数倍数
  - 一键导出缺料 BOM（库存不足 + 未匹配项，含缺口数量）
  - **按 BOM 出库**：焊接完成后一键扣减全部用料
  - **按 BOM 入库**：采购到货后一键入库全部物料
- **分类管理**：两级分类增删改、上下移排序，重命名自动同步已有元件
- **元件资料**：每个元件可上传图片（自动压缩）与数据手册（Datasheet，PDF 等，点击即开）
- **数据备份**：JSON 一键导出 / 导入，数据完整迁移
- **中英双语**：顶栏一键切换 中文 / English，界面文案完整翻译，选择自动记忆
- **日间 / 夜间主题**：顶栏一键切换，暗色扁平与浅色扁平双主题，选择自动记忆

### 下载与运行

| 平台 | 文件 | 使用方式 |
| --- | --- | --- |
| 浏览器（任意系统） | `index.html` | 双击用 Chrome / Edge / Safari 打开即可 |
| macOS | `release/RCL-Studio-macOS.zip` | 解压后双击 `RCL Studio.app` |
| Windows | `release/RCL-Studio-Windows.zip` | 解压后双击 `RCL Studio.exe` |

> 桌面版基于 Electron 打包，内嵌完整运行时（无需安装任何环境），数据保存在应用专属的本地目录中，与浏览器互不影响。
> macOS 如提示"无法打开"，请在 系统设置 → 隐私与安全性 中点击"仍要打开"，或执行 `xattr -dr com.apple.quarantine "RCL Studio.app"`。

首次打开自带 70+ 个演示元件，方便体验；清除浏览器站点数据即可重置。

### 部署到 NAS（飞牛 fnOS / 群晖 / 任意 Docker 主机）

**数据完全保存在 NAS 上**：所有访问者共享同一份库存（含元器件图片、数据手册、出入库流水），并自动定期备份。仓库自带 `Dockerfile`、`docker-compose.yml` 和零依赖的 `server.js`（页面 + 数据 API + 定期备份一体）：

1. 在 NAS 上新建文件夹（如 `docker/rcl-studio`），把 `Dockerfile`、`docker-compose.yml`、`index.html`、`server.js` 这 4 个文件放进去；
2. fnOS 打开 **Docker → Compose → 添加项目**，选中该目录（或直接粘贴 `docker-compose.yml` 内容）并启动；
3. 浏览器访问 `http://NAS的IP:8360` 即可（端口冲突时改 compose 里的 `8360`）。

- **数据位置**：项目目录下的 `data/db.json`（可用 fnOS 文件管理直接查看），升级/重建容器不会丢数据；
- **自动备份**：默认每 24 小时备份到 `data/backups/`，保留最近 14 份（compose 里的 `BACKUP_INTERVAL_HOURS` / `BACKUP_KEEP` 可调）；顶栏「导出」也可随时手动下载完整备份；
- **迁移旧数据**：如果之前在浏览器版 / 桌面版里录过库存，先在旧版本顶栏「导出」JSON，再到 NAS 版顶栏「导入」即可（图片和数据手册会一并迁移）；
- 顶栏出现绿色「NAS 集中存储」徽标即表示数据正保存在 NAS 上；用 `file://` 直接双击打开时则自动使用浏览器本地存储。

> NAS 能顺畅访问 GitHub 时也可以零上传：把 compose 里的 `build: .` 改成 `build: https://github.com/uin2023/component-warehouse.git#main`。

### 截图

| 元器件总览 | 入库管理 |
| --- | --- |
| ![overview](docs/screenshot-overview.png) | ![stockin](docs/screenshot-stockin.png) |

| BOM 核对 | 分类管理 |
| --- | --- |
| ![bom](docs/screenshot-bom.png) | ![cats](docs/screenshot-cats.png) |

### 数据存储

所有数据保存在浏览器 IndexedDB 中，完全离线、隐私安全。换电脑或浏览器前请先在顶栏"导出"备份 JSON。

---

## English

**RCL Studio** is a pure front-end inventory manager for electronic components: a single HTML file, zero dependencies, fully offline. All data stays in your browser (IndexedDB) — no server, no installation, no build step.

### Features

- **Component Overview**: LCSC-style two-level category tree, search, cascading package filter, stock progress bar (current / minimum), low-stock alerts, storage location management
- **Stock In / Stock Out**: dedicated pages with cascading filters (primary category → subcategory → package), over-draft protection, full audit trail
- **Transaction Log**: complete history, filterable by type, BOM batch operations auto-tagged
- **BOM Check**: import BOMs exported from LCSC EDA / EasyEDA (.xlsx / .csv, built-in parser — no libraries), auto-matched against inventory (LCSC part no. → manufacturer P/N → value), production-quantity multiplier
  - One-click export of a shortage BOM (insufficient + unmatched items, with gap quantities)
  - **Stock-out by BOM**: deduct all materials in one click after soldering
  - **Stock-in by BOM**: receive a purchase into inventory in one click
- **Category Management**: add / rename / delete / reorder two-level categories; renames sync to existing components
- **Component Assets**: per-component photo (auto-compressed) and datasheet upload (PDF etc., one click to open)
- **Backup**: one-click JSON export / import for full data migration
- **Bilingual UI**: one-click 中文 / English switch, fully translated, choice persisted
- **Day / Night Theme**: one-click flat light/dark themes, choice persisted

### Download & Run

| Platform | File | How to run |
| --- | --- | --- |
| Browser (any OS) | `index.html` | Double-click to open in Chrome / Edge / Safari |
| macOS | `release/RCL-Studio-macOS.zip` | Unzip and double-click `RCL Studio.app` |
| Windows | `release/RCL-Studio-Windows.zip` | Unzip and double-click `RCL Studio.exe` |

> The desktop builds are packaged with Electron and embed a full runtime (nothing to install). Data is stored in the app's own local directory, separate from your browser.
> On macOS, if the app is blocked, go to System Settings → Privacy & Security → "Open Anyway", or run `xattr -dr com.apple.quarantine "RCL Studio.app"`.

Seeded with 70+ demo components on first launch; clear site data to reset.

### Deploy to a NAS (fnOS / Synology / any Docker host)

**All data lives on the NAS**: every visitor shares the same inventory — including component photos, datasheets and transaction history — with automatic scheduled backups. The repo ships with a `Dockerfile`, `docker-compose.yml` and a zero-dependency `server.js` (web UI + data API + backups in one):

1. Create a folder on your NAS (e.g. `docker/rcl-studio`) and place these 4 files inside: `Dockerfile`, `docker-compose.yml`, `index.html`, `server.js`;
2. In fnOS go to **Docker → Compose → Add project**, pick that folder (or paste the compose file) and start it;
3. Open `http://NAS-IP:8360` in your browser (change `8360` in the compose file if the port is taken).

- **Data location**: `data/db.json` inside the project folder (visible in the fnOS file manager); rebuilding the container never touches your data;
- **Automatic backups**: every 24 hours into `data/backups/`, keeping the latest 14 (tune `BACKUP_INTERVAL_HOURS` / `BACKUP_KEEP` in the compose file); the top-bar "Export" button downloads a full backup anytime;
- **Migrating existing data**: if you previously used the browser/desktop version, use **Export** there, then **Import** in the NAS version — photos and datasheets are carried over too;
- A green "NAS storage" badge in the top bar confirms data is being saved on the NAS; opening `index.html` directly via `file://` automatically falls back to browser-local storage.

> If your NAS can reach GitHub smoothly, you can skip uploading entirely: replace `build: .` with `build: https://github.com/uin2023/component-warehouse.git#main`.

### Data Storage

Everything lives in your browser's IndexedDB — fully offline and private. Export a JSON backup from the top bar before switching machines or browsers.

## License

[MIT](LICENSE)
