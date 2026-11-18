<div align="center">

# Open100Adults

**1:1 原版纯净去广告复刻 · English / 简体中文双语版 · 完整联机远程操控 & 内置 Cloudflare Tunnel**

`main` 分支采用 **路线 A（v1.0.0）** —— 完整保留原版 UI / 动画 / 4 步远程向导 / 操控台快捷指令 / 公开房间大厅 / 全屏视频背景，彻底移除全站广告、弹窗与追踪统计；  
原手工 Next.js 源码重构工程已完整保存于 **`dev` 分支**（含独立 CI/CD 流水线，后续将作为路线 B 演进基地）。

[![Build & Publish Docker Image](https://github.com/2580m/Open100Adults/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/2580m/Open100Adults/actions/workflows/docker-publish.yml)
[![Sync GitHub Pages Branch](https://github.com/2580m/Open100Adults/actions/workflows/sync-pages.yml/badge.svg)](https://github.com/2580m/Open100Adults/actions/workflows/sync-pages.yml)
![GHCR](https://img.shields.io/badge/GHCR-ghcr.io%2F2580m%2Fopen100adults-2496ED?logo=docker&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![Languages](https://img.shields.io/badge/i18n-EN_%7C_%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-f5a3c8)

**在线静态体验版（GitHub Pages）**：<https://2580m.github.io/Open100Adults/>

</div>

---

## 核心特性

- **100% 1:1 原版体验**：完整保留原版设计语言、玻璃拟态交互、寸止全屏视频播放器、4 步远程联机向导（`1/4`–`4/4`）、操控台（`/sundome/c`）完整快捷指令与限制面板、观众围观排队、以及全部 142 篇互动剧情 / 折返跑 / 飞行棋 / 戒色计数器 / 百分位计算器。
- **彻底去广告 & 无追踪**：清除 GTM、Cloudflare Insights、HilltopAds（含 popunder 劫持脚本）、Bance、TrafficStars、FAM、Arrow、开屏 Preroll 及所有姊妹站/返佣推广链接；`/api/sundome-lab/*` 试看片接口也会主动清洗推广字段。
- **双语精简切换**：右上角语言切换器精简为 **English (`/en`)** 与 **简体中文 (`/zh`)** 两种语言，并关闭自动跳转繁体路由的脚本。
- **完整逆向 WebSocket 联机中继（`/rws` + `/api/rgate`）**：
  - 完整实现房间创建（`/rws/new`）、公开房间大厅（`/rws/lobby` / `/api/rgate/lobby`）、房门状态检查（`/api/rgate/:room`）、心跳保活（`/rws/:room/here`）及双向 WebSocket 协议（玩家 / 控制方 / 围观排队）。
- **内置可开关 Cloudflare Tunnel 公网单链接**：
  - Docker 默认开启 `ENABLE_TUNNEL=true`：即使你本地访问 `http://127.0.0.1:3000/zh/sundome/remote` 或局域网 IP，服务端也会自动读取隧道公网域名，使页面生成的远程控制链接直接变为可发给外网好友的 `https://*.trycloudflare.com/zh/sundome/c?...`。
  - 如仅在离线或内网使用，传入 `-e ENABLE_TUNNEL=false` 即可关闭。

---

## 快速开始

### 方式一：Docker 一键运行（推荐 · 含完整 WebSocket 联机 + 内置公网隧道）

**默认开启内置公网联机隧道：**

```bash
docker run -d \
  --name open100adults \
  -p 3000:3000 \
  --restart unless-stopped \
  ghcr.io/2580m/open100adults:latest
```

启动后访问 `http://127.0.0.1:3000/zh/sundome/remote`，即可使用原版 4 步向导生成 `https://*.trycloudflare.com/...` 公网分享链接发给对方手机直接下指令。

**关闭内置隧道（纯离线 / 仅局域网）：**

```bash
docker run -d \
  --name open100adults \
  -p 3000:3000 \
  -e ENABLE_TUNNEL=false \
  --restart unless-stopped \
  ghcr.io/2580m/open100adults:latest
```

### 方式二：使用 Docker Compose

```bash
# 默认开启内置隧道
docker compose up -d

# 关闭内置隧道
ENABLE_TUNNEL=false docker compose up -d
```

### 方式三：GitHub Pages 纯静态版（无需部署）

直接访问由 `pages` 分支托管的静态站点：<https://2580m.github.io/Open100Adults/>  
（含全部静态页面、单人游戏、互动剧情、折返跑、飞行棋与计算器；涉及实时 WebSocket 中继的远程操控功能需自托管 Docker/Node 启用。）

### 方式四：本地 Node.js 直接运行

环境要求：**Node.js 20+**（推荐 Node 22 / 24）。

```bash
npm install
PORT=3000 ENABLE_TUNNEL=false npm start
```

然后浏览器打开 `http://127.0.0.1:3000/zh`。

---

## 分支策略与架构

| 分支 | 定位 | 镜像标签 | 说明 |
| --- | --- | --- | --- |
| **`main`** | **路线 A（v1.0.0 正式版）** | `ghcr.io/2580m/open100adults:latest` / `:1.0.0` | 1:1 去广告原版前端 (`public/`) + 完整 `/rws` WebSocket 后端 (`server.mjs`) |
| **`pages`** | **GitHub Pages 静态分支** | — | 由 `scripts/build-pages.mjs` 自动将 `public/` 改写子路径后同步推送 |
| **`dev`** | **路线 B 准备分支（已配好 CI/CD）** | `ghcr.io/2580m/open100adults:dev` | 保留 Clean-room Next.js (`web/`) 可读源码工程，待后续按 1:1 规范逐步重写 |

```text
Open100Adults/
├── .github/workflows/
│   ├── docker-publish.yml   # 语法与路由冒烟校验 + GHCR 多架构镜像构建发布
│   └── sync-pages.yml       # 自动生成静态产物并同步至 pages 分支
├── Dockerfile               # Node 22 Bookworm + cloudflared 生产镜像
├── docker-compose.yml
├── docker-entrypoint.mjs    # 容器入口（同时管理 server.mjs 与 cloudflared）
├── package.json             # 根工程依赖（ws）
├── server.mjs               # 静态资源、HTML 净化注入、/rws 中继与代理后端
├── scripts/build-pages.mjs  # GitHub Pages (/Open100Adults 子路径) 静态导出脚本
├── public/                  # 1:1 去广告双语静态资源与前端 Bundle
├── LICENSE                  # MIT License
└── README.md
```

---

## 环境变量

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | Web / WebSocket 监听端口 |
| `HOSTNAME` | `0.0.0.0` | 监听地址 |
| `ENABLE_TUNNEL` | 容器内 `true` | 设为 `false`/`0`/`off` 可关闭内置 `cloudflared` 隧道 |
| `PUBLIC_SHARE_URL` | 未设置 | 可选：手动指定固定公网访问地址（优先级高于 Quick Tunnel） |
| `CLOUDFLARED_TOKEN` | 未设置 | 可选：填入 Cloudflare Zero Trust Tunnel Token 使用自有域名 |
| `CLOUDFLARED_METRICS_PORT` | `20241` | `cloudflared` 本地 `/quicktunnel` 探测端口 |

---

## 免责声明

- 本项目仅供成年人（18+）学习交流与个人离线自用，不构成任何医疗或健康建议。
- 试看片源（`/api/sundome-lab/*`）与音频资源代理自上游公开接口并主动剥离推广链接，受当地网络环境影响；用户亦可随时加载本地视频文件进行体验。
