<div align="center">

# Open100Adults

**纯净无广告、可独立部署的成人互动工具箱（English / 简体中文）**

基于 **Next.js App Router + TypeScript + Tailwind CSS** 重构的可读源码工程，移除全部广告网络、外链推广与统计脚本；同时提供 **GitHub Pages 纯静态版本** 与 **Docker（含内置 Cloudflare Tunnel 公网联机）完整版本**。

[![Build & Publish Docker Image](https://github.com/2580m/Open100Adults/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/2580m/Open100Adults/actions/workflows/docker-publish.yml)
[![Sync GitHub Pages Branch](https://github.com/2580m/Open100Adults/actions/workflows/sync-pages.yml/badge.svg)](https://github.com/2580m/Open100Adults/actions/workflows/sync-pages.yml)
![GHCR](https://img.shields.io/badge/GHCR-ghcr.io%2F2580m%2Fopen100adults-2496ED?logo=docker&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Languages](https://img.shields.io/badge/i18n-EN_%7C_%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-f5a3c8)

**在线静态版（GitHub Pages）**：<https://2580m.github.io/Open100Adults/>

</div>

---

## 核心特性

- **纯净无广告**：彻底移除 GTM、Cloudflare Insights、HilltopAds、Bance、TrafficStars、FAM、Arrow 及所有姊妹站 / 外链推广组件；视频代理响应也会主动清洗推广字段。
- **双语精简切换**：仅保留 **English (`/en`)** 与 **简体中文 (`/zh`)**，跨语言缺失的专属剧情会自动平滑回退到列表页，避免 404。
- **双模式架构与分支说明**：
  - **`main` 分支（默认正式版 · Route B 全动态源码版）**：基于 `Next.js 16 + custom-server.mjs + ws`，提供真实 `/rws` WebSocket 双向房间联机、围观排队、全屏播放器、`<SundomeArc>` 曲线复盘、内置 `cloudflared` 公网单链接联机，以及语音/试看片代理接口（镜像标签：`ghcr.io/2580m/open100adults:latest` / `main`）。
  - **`dev` 分支（开发预览版）**：功能迭代与预发布验证分支（镜像标签：`ghcr.io/2580m/open100adults:dev`）。
  - **`pages` 分支（GitHub Pages 纯静态版）**：当 `main` 的 `web/**` 更新时自动导出所有 100% 前端可独立运行的工具（寸止游戏 + 本地视频、双人时钟同步 `/sundome/p`、折返跑、飞行棋、全部 142 篇互动剧情、戒色计数器、三个百分位计算器），无需后端即可在线使用。
- **本地优先隐私保护**：所有打卡、游戏配置、自定义指令与最佳纪录均保存在浏览器 `localStorage` / `sessionStorage`，不上传用户数据；字体与图标均已本地化。
- **浏览器端交互引擎**：内置 Web Audio API 实时节拍器与合成音、SpeechSynthesis 语音指令播报、3D 骰子物理动画及统计分布模型。

---

## 功能与路由一览

| 模块 | 路由 | GitHub Pages (`pages` 分支) | Docker / 本地 Node (`main` 分支) | 核心能力 |
| --- | --- | :---: | :---: | --- |
| **首页导航** | `/[lang]` | ✅ | ✅ | 工具总览、版本直达入口、FAQ |
| **寸止游戏 (Edging Game)** | `/[lang]/sundome`<br>`/[lang]/sundome/{women,gay,lesbian}` | ✅（本地视频） | ✅（含在线试看片） | 节拍器、语音播报、4 档难度、5 种结局抽取、自定义指令、视频播放 |
| **间歇折返跑 (Beep Test)** | `/[lang]/shuttle`<br>`/[lang]/shuttle/{women,gay,lesbian}` | ✅ | ✅ | 21 级阶梯音阶节拍、回程停手模式、分变体本地最佳纪录 |
| **寸止飞行棋 (Edges & Ladders)** | `/[lang]/board` | ✅ | ✅ | 50 / 100 格棋盘、梯子/蛇/规则/卡片事件、3D 骰子动画、男女/同性用语适配 |
| **互动剧情 (Stories)** | `/[lang]/story`<br>`/[lang]/story/[slug]` | ✅ | ✅ | 44 篇英文 + 98 篇中文独立 JSON 剧情、分支选择、边缘冷却与多结局判定 |
| **戒色计数器 (Streak Counter)** | `/[lang]/streak` | ✅ | ✅ | 多模式计数、月历视图、破戒归因标签、90 秒冲动呼吸计时、JSON 导入导出 |
| **百分位计算器** | `/[lang]/size`<br>`/[lang]/stamina`<br>`/[lang]/partners` | ✅ | ✅ | 正态 CDF / 对数正态 / Natsal-3 分段分布实时计算百分位与评级 |
| **法务声明** | `/[lang]/2257`、`/[lang]/dmca` | ✅ | ✅ | 基础合规说明页面 |
| **远程操控 (Remote Play)** | `/[lang]/sundome/remote`<br>`/[lang]/sundome/remote/list`<br>`/[lang]/sundome/c` | — | ✅ | 4 步向导（1/4–4/4）、真实 `/rws` WebSocket 双向房间、圆盘/滑动条控制台、170 条短句+收藏、围观排队与内置公网隧道 |
| **双人同频 (Partner Sync)** | `/[lang]/sundome/p` | ✅ | ✅ | 基于确定性随机种子与统一起始时钟的双端同步寸止 |

> 说明：`lang` 取值为 `en` 或 `zh`。

---

## 快速开始

### 方式一：直接使用 GitHub Pages 静态版

无需部署，直接访问仓库 `pages` 分支托管站点：
<https://2580m.github.io/Open100Adults/>

如 Fork 到自己的仓库启用 GitHub Pages：进入仓库 **Settings → Pages → Source: Deploy from a branch → Branch: `pages` / `/ (root)`**，每次推送 `main` 时工作流会自动重建并同步到 `pages` 分支。

### 方式二：使用 GHCR Docker 镜像（完整功能 + 内置公网联机隧道）

> 本仓库已设为公开（Public）；若对应的 GHCR Package 权限也已设为 Public，可直接拉取镜像；否则先用 `docker login ghcr.io` 登录（或使用 `docker compose up -d --build` 本地构建）。

**默认开启公网联机隧道（推荐）：**

```bash
docker run -d \
  --name open100adults \
  -p 3000:3000 \
  --restart unless-stopped \
  ghcr.io/2580m/open100adults:latest
```

启动后在本机打开 `http://127.0.0.1:3000/zh/sundome/remote`，即可自动获取 `https://*.trycloudflare.com` 公网单链接发给对方手机实时联机。

**关闭内置隧道（纯离线 / 仅局域网）：**

```bash
docker run -d \
  --name open100adults \
  -p 3000:3000 \
  -e ENABLE_TUNNEL=false \
  --restart unless-stopped \
  ghcr.io/2580m/open100adults:latest
```

### 方式三：使用 Docker Compose

```bash
# 默认开启内置隧道
docker compose up -d --build

# 如需关闭内置隧道：
ENABLE_TUNNEL=false docker compose up -d --build
```

### 方式四：本地开发运行

环境要求：**Node.js 20+**（推荐 Node 22 / 24）与 **npm 10+**。

```bash
cd web
npm install

# 开发模式（热更新）
npm run dev

# 类型检查与生产构建
npm run typecheck
npm run build
npm start

# 单独导出 GitHub Pages 静态产物到 web/out/
npm run build:pages
```

---

## 项目结构

```text
Open100Adults/
├── .github/
│   └── workflows/
│       ├── docker-publish.yml   # CI 类型检查、构建与 GHCR 多架构镜像发布
│       └── sync-pages.yml       # 自动构建静态版并强制同步至 pages 分支
├── Dockerfile                   # 多阶段 Node 22 + custom-server.mjs + cloudflared 生产镜像
├── docker-entrypoint.mjs        # 容器入口：按 ENABLE_TUNNEL 联动拉起 Web 与隧道
├── .dockerignore
├── docker-compose.yml
├── LICENSE                      # MIT License
├── README.md
└── web/                         # Next.js App Router + custom-server.mjs 源码工程
    ├── custom-server.mjs        # Next 16 HTTP + /rws WebSocket + 语音/视频代理服务
    ├── next.config.ts
    ├── package.json
    ├── public/icons/            # 本地化工具图标与 PWA 清单
    ├── scripts/                 # 剧情提取与 Pages 静态导出脚本（build-pages.mjs）
    └── src/
        ├── app/
        │   ├── [lang]/          # 双语页面与动态路由（含 sundome/c、sundome/p 等）
        │   ├── api/             # sundome-lab 代理、rgate 房间与公网地址探测、story-vote
        │   └── globals.css      # 玻璃拟态、控制器与剧场样式
        ├── components/          # Header / Footer / LanguageSwitcher / 各工具交互组件
        ├── data/                # i18n 文案、工具元数据、142 篇独立剧情与语音索引
        ├── fonts/               # 本地 Geist & Instrument Serif woff2 字体
        └── lib/                 # remoteProtocol (/rws 客户端)、partnerSync、voicePlayer、stats
```

---

## CI/CD 自动化流水线

1. **Docker & GHCR 发布（[.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml)）**：
   - 运行 `npm ci`、`npm run typecheck`、`node --check custom-server.mjs`、`npm run build`，并启动 `custom-server.mjs` 执行全路由 / `/rws` / `RSC` 冒烟校验；
   - 构建 `linux/amd64` 与 `linux/arm64` 双架构镜像推送至 `ghcr.io/2580m/open100adults`（推送 `dev` 生成 `dev` 标签，推送 `main` 生成 `latest`/`main`/`sha-*`，推送 `v*.*.*` Tag 生成语义化版本标签）。
2. **GitHub Pages 分支同步（[.github/workflows/sync-pages.yml](.github/workflows/sync-pages.yml)）**：
   - 当 `web/**` 更新时自动执行 `npm run build:pages`，将可纯静态运行的全部工具页与 142 篇剧情页面导出并推送至 `pages` 分支根目录（含 `.nojekyll` 与语言自动跳转入口页）。

---

## 环境变量

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 服务监听端口 |
| `ENABLE_TUNNEL` | Docker 下为 `true`，纯本地 `npm run dev` 未设置时不启用 | 设为 `false`/`0`/`off` 可完全关闭容器内 `cloudflared` 隧道 |
| `PUBLIC_SHARE_URL` | 未设置 | 可选：手动指定固定公网域名（如 `https://play.yourdomain.com`），优先级高于 Quick Tunnel |
| `CLOUDFLARED_TOKEN` | 未设置 | 可选：使用 Cloudflare Zero Trust Named Tunnel Token 绑定固定域名 |
| `CLOUDFLARED_METRICS_PORT` | `20241` | 容器内 `cloudflared` 本地 `/quicktunnel` 探测端口 |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | 用于生成页面 Canonical 与 Metadata 基准地址 |
| `NEXT_PUBLIC_BASE_PATH` | 未设置（Pages 构建默认 `/Open100Adults`） | 静态导出子路径前缀 |
| `NEXT_STANDALONE` | 未设置 | 设为 `1` 时启用 Next.js `standalone` 输出（Docker 构建默认开启） |
| `NEXT_STATIC_EXPORT` | 未设置 | 设为 `1` 时启用 Next.js `export` 纯静态导出（`build:pages` 自动开启） |

---

## 免责声明

- 本项目仅供成年人（18+）学习与个人离线自用，不构成任何医疗或健康建议。
- `sundome` 试看片源在服务端模式下通过 `/api/sundome-lab/*` 代理自原始站点接口，受上游网络与地区访问策略影响；纯静态版本与服务端版本均支持直接选择本地视频文件播放。
