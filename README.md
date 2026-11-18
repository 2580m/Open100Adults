<div align="center">

# Open100Adults

**纯净无广告、可独立本地部署的成人互动工具箱（English / 简体中文）**

基于 **Next.js App Router + TypeScript + Tailwind CSS** 重构的可读源码工程，移除全部广告网络、外链推广与统计脚本，支持一键 Docker 部署与本地离线运行。

[![Build & Publish Docker Image](https://github.com/2580m/Open100Adults/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/2580m/Open100Adults/actions/workflows/docker-publish.yml)
![GHCR](https://img.shields.io/badge/GHCR-ghcr.io%2F2580m%2Fopen100adults-2496ED?logo=docker&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Languages](https://img.shields.io/badge/i18n-EN_%7C_%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-f5a3c8)

</div>

---

## 核心特性

- **纯净无广告**：彻底移除 GTM、Cloudflare Insights、HilltopAds、Bance、TrafficStars、FAM、Arrow 及所有姊妹站 / 外链推广组件；视频代理响应也会主动清洗推广字段。
- **双语精简切换**：仅保留 **English (`/en`)** 与 **简体中文 (`/zh`)**，跨语言缺失的专属剧情会自动平滑回退到列表页，避免 404。
- **本地优先隐私保护**：所有打卡、游戏配置、自定义指令与最佳纪录均保存在浏览器 `localStorage` / `sessionStorage`，不上传用户数据；字体与图标均已本地化。
- **浏览器端交互引擎**：内置 Web Audio API 实时节拍器与合成音、SpeechSynthesis 语音指令播报、3D 骰子物理动画及统计分布模型。
- **容器化交付**：提供多阶段 `Dockerfile` 与 GitHub Actions 自动构建发布工作流，原生支持 `linux/amd64` 与 `linux/arm64` 双架构镜像推送到 GHCR。

---

## 功能与路由一览

| 模块 | 路由 | 核心能力 |
| --- | --- | --- |
| **首页导航** | `/[lang]` | 工具总览、版本直达入口、FAQ |
| **寸止游戏 (Edging Game)** | `/[lang]/sundome`<br>`/[lang]/sundome/{women,gay,lesbian}` | 节拍器、语音播报、4 档难度、5 种结局抽取、自定义指令、本地视频与主/备试看片源切换 |
| **远程操控 (Remote Play)** | `/[lang]/sundome/remote`<br>`/[lang]/sundome/remote/list` | 内存房间建房、分享控制链接、6 档速度、实时指令轮询 |
| **间歇折返跑 (Beep Test)** | `/[lang]/shuttle`<br>`/[lang]/shuttle/{women,gay,lesbian}` | 21 级阶梯音阶节拍、回程停手模式、分变体本地最佳纪录 |
| **寸止飞行棋 (Edges & Ladders)** | `/[lang]/board` | 50 / 100 格棋盘、梯子/蛇/规则/卡片事件、3D 骰子动画、男女/同性用语适配 |
| **互动剧情 (Stories)** | `/[lang]/story`<br>`/[lang]/story/[slug]` | 44 篇英文 + 98 篇中文独立 JSON 剧情、分支选择、边缘冷却与多结局判定 |
| **戒色计数器 (Streak Counter)** | `/[lang]/streak` | 多模式计数、月历视图、破戒归因标签、90 秒冲动呼吸计时、JSON 导入导出 |
| **百分位计算器** | `/[lang]/size`<br>`/[lang]/stamina`<br>`/[lang]/partners` | 正态 CDF / 对数正态 / Natsal-3 分段分布实时计算百分位与评级 |
| **法务声明** | `/[lang]/2257`、`/[lang]/dmca` | 基础合规说明页面 |

> 说明：`lang` 取值为 `en` 或 `zh`，访问根路径 `/` 会自动重定向至 `/en`。

---

## 快速开始

### 方式一：使用 GHCR Docker 镜像

> 仓库当前为 **Private** 时，拉取镜像前需先使用具备 `read:packages` 权限的 PAT 登录 GHCR：
> ```bash
> echo "$GITHUB_TOKEN" | docker login ghcr.io -u 2580m --password-stdin
> ```

```bash
docker run -d \
  --name open100adults \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  --restart unless-stopped \
  ghcr.io/2580m/open100adults:latest
```

启动后访问：<http://localhost:3000/zh> 或 <http://localhost:3000/en>

### 方式二：使用 Docker Compose

```bash
docker compose up -d --build
```

### 方式三：本地开发运行

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
```

---

## 项目结构

```text
Open100Adults/
├── .github/
│   └── workflows/
│       └── docker-publish.yml   # CI 类型检查、构建与 GHCR 多架构镜像发布
├── Dockerfile                   # 多阶段 Alpine Standalone 生产镜像
├── .dockerignore
├── docker-compose.yml
├── README.md
└── web/                         # Next.js App Router 源码工程
    ├── next.config.ts
    ├── package.json
    ├── public/icons/            # 本地化工具图标与 PWA 清单
    ├── scripts/                 # 剧情数据提取与分片生成脚本
    └── src/
        ├── app/
        │   ├── [lang]/          # 双语页面与动态路由
        │   ├── api/             # sundome-lab 代理、rgate 房间、story-vote、sundome-request
        │   └── globals.css      # 玻璃拟态与默认主题 Token
        ├── components/          # Header / Footer / LanguageSwitcher / 各工具交互组件
        ├── data/                # i18n 文案、工具元数据、142 篇独立剧情 JSON
        ├── fonts/               # 本地 Geist & Instrument Serif woff2 字体
        └── lib/stats.ts         # 百分位统计与 Natsal-3 拟合模型
```

---

## CI/CD 与 GHCR 镜像发布流程

工作流定义位于 [.github/workflows/docker-publish.yml](.github/workflows/docker-publish.yml)：

1. **Verify 阶段**：在 Ubuntu Runner 上运行 `npm ci`、`npm run typecheck` 以及 `NEXT_STANDALONE=1 npm run build`，确保代码和打包产物无误。
2. **Docker 阶段**：使用 Buildx + QEMU 构建 `linux/amd64` 与 `linux/arm64` 多架构镜像并推送至 `ghcr.io/2580m/open100adults`（PR 仅验证构建，不推送）。
3. **标签规则**：
   - 推送到 `main` 分支：生成 `latest`、`main` 与 `sha-<commit>` 标签；
   - 推送形如 `v1.0.0` 的 Git Tag：额外生成语义化版本标签（`1.0.0`、`1.0`）。

---

## 环境变量

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 服务监听端口 |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | 用于生成页面 Canonical 与 Metadata 基准地址 |
| `NEXT_STANDALONE` | 未设置 | 设为 `1` 时启用 Next.js `standalone` 输出（Docker 构建默认开启） |

---

## 免责声明

- 本项目仅供成年人（18+）学习与个人离线自用，不构成任何医疗或健康建议。
- `sundome` 试看片源通过 `/api/sundome-lab/*` 代理自原始站点接口，受上游网络与地区访问策略影响；本地也可随时选择设备内的视频文件离线播放。
