import type { Locale } from "@/data/tools";

export const WAVE_PRESET_KEYS = [
  "breathe",
  "metronome",
  "tease",
  "climb",
  "surge",
  "punish",
  "ruin",
  "finale",
] as const;

export type WavePresetKey = (typeof WAVE_PRESET_KEYS)[number];

export interface PulseFrameBytes {
  freqs: [number, number, number, number];
  amps: [number, number, number, number];
}

/** Converts DG-LAB frequency in Hz (10..1000) into the official V3/BLE frequency byte (10..240). */
export function encodeDglabFreqByte(hz: number): number {
  const safeHz = Math.max(10, Math.min(1000, Math.round(hz)));
  if (safeHz <= 100) return safeHz;
  if (safeHz <= 600) return Math.round((safeHz - 100) / 5 + 100);
  return Math.round((safeHz - 600) / 10 + 200);
}

function clampAmp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function hex2(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

export function frameToV3Hex(frame: PulseFrameBytes): string {
  return (
    frame.freqs.map(hex2).join("") + frame.amps.map(clampAmp).map(hex2).join("")
  );
}

/**
 * Generates an array of 100ms PulseFrameBytes shaped by waveform preset,
 * beat tempo (BPM), and relative strength factor (0..100).
 */
export function buildWaveFrames(
  preset: WavePresetKey,
  stepOffset: number,
  count: number,
  bpm = 90,
  ampScale = 100,
): PulseFrameBytes[] {
  const safeBpm = Math.max(40, Math.min(300, bpm || 90));
  const beatPeriodSteps = Math.max(2, Math.round((60 / safeBpm) * 10)); // 100ms per step
  const scale = Math.max(0.1, Math.min(1, ampScale / 100));
  const frames: PulseFrameBytes[] = [];

  for (let i = 0; i < count; i++) {
    const s = stepOffset + i;
    const beatPos = (s % beatPeriodSteps) / beatPeriodSteps;
    const cycle16 = (s % 16) / 16;
    let hzBase = 45;
    let a1 = 60;
    let a2 = 60;
    let a3 = 60;
    let a4 = 60;

    switch (preset) {
      case "breathe": {
        const env = 0.35 + 0.65 * (0.5 - 0.5 * Math.cos(cycle16 * Math.PI * 2));
        hzBase = 24 + 18 * env;
        a1 = a2 = a3 = a4 = 85 * env;
        break;
      }
      case "metronome": {
        const hit = beatPos < 0.28;
        hzBase = hit ? 75 : 20;
        const v = hit ? 95 : 18;
        a1 = hit ? v : 15;
        a2 = hit ? v : 12;
        a3 = hit ? Math.round(v * 0.7) : 10;
        a4 = 12;
        break;
      }
      case "tease": {
        const burst = s % 7 === 0 || s % 7 === 1;
        hzBase = burst ? 95 : 16;
        a1 = burst ? 90 : 20;
        a2 = burst ? 40 : 28;
        a3 = burst ? 95 : 18;
        a4 = burst ? 25 : 22;
        break;
      }
      case "climb": {
        const ramp = (s % 24) / 23;
        hzBase = 25 + 95 * ramp;
        const v = 30 + 68 * ramp;
        a1 = v;
        a2 = Math.min(100, v + 4);
        a3 = Math.min(100, v + 6);
        a4 = Math.min(100, v + 8);
        break;
      }
      case "surge": {
        const tri = 1 - Math.abs((s % 10) / 5 - 1);
        hzBase = 45 + 65 * tri;
        a1 = 40 + 55 * tri;
        a2 = 55 + 42 * tri;
        a3 = 45 + 50 * tri;
        a4 = 35 + 60 * tri;
        break;
      }
      case "punish": {
        const sharp = s % 2 === 0;
        hzBase = sharp ? 130 : 85;
        a1 = 100;
        a2 = 90;
        a3 = 100;
        a4 = 85;
        break;
      }
      case "ruin": {
        const high = s % 12 < 5;
        hzBase = high ? 110 : 14;
        a1 = high ? 95 : 8;
        a2 = high ? 92 : 6;
        a3 = high ? 95 : 8;
        a4 = high ? 85 : 5;
        break;
      }
      case "finale": {
        const wave = 0.7 + 0.3 * Math.sin(s * 0.8);
        hzBase = 85 + 35 * wave;
        a1 = 95;
        a2 = 100;
        a3 = 92;
        a4 = 98;
        break;
      }
    }

    const fb = encodeDglabFreqByte(hzBase);
    const fb2 = encodeDglabFreqByte(hzBase * 1.08);
    frames.push({
      freqs: [fb, fb, fb2, fb2],
      amps: [
        clampAmp(a1 * scale),
        clampAmp(a2 * scale),
        clampAmp(a3 * scale),
        clampAmp(a4 * scale),
      ],
    });
  }
  return frames;
}

export const WAVE_NAMES: Record<Locale, Record<WavePresetKey, string>> = {
  en: {
    breathe: "Breathe",
    metronome: "Metronome",
    tease: "Tease",
    climb: "Climb",
    surge: "Surge",
    punish: "Punish",
    ruin: "Ruin",
    finale: "Finale",
  },
  zh: {
    breathe: "呼吸波",
    metronome: "节拍波",
    tease: "轻撩挑逗",
    climb: "渐强爬坡",
    surge: "脉冲浪涌",
    punish: "严厉惩罚",
    ruin: "高潮毁灭",
    finale: "终局冲刺",
  },
};

export const DGLAB_COPY: Record<
  Locale,
  {
    pageTitle: string;
    pageEyebrow: string;
    pageLead: string;
    cardTitle: string;
    cardSub: string;
    expand: string;
    collapse: string;
    status: {
      disconnected: string;
      waiting_qr: string;
      paired: string;
      connecting_ble: string;
      connected_ble: string;
      error: string;
    };
    tabSocket4: string;
    tabSocket3: string;
    tabBle3: string;
    tabBle2: string;
    tabButtplug: string;
    socketLead: string;
    socket4Lead: string;
    wsModeLabel: string;
    wsModes: { auto: string; official: string; lan: string; custom: string };
    devicesTitle: string;
    noV4Devices: string;
    deviceTypes: {
      COYOTE_030: string;
      COYOTE_020: string;
      OVC_1: string;
      BMTR_1: string;
    };
    buttplugLead: string;
    buttplugWsLabel: string;
    buttplugConnect: string;
    buttplugConnecting: string;
    buttplugScan: string;
    buttplugScanning: string;
    buttplugNoDevices: string;
    buttplugMaxCap: string;
    buttplugIntensity: string;
    buttplugCmds: { Scalar: string; Linear: string; Rotate: string };
    buttplugEnabled: string;
    buttplugPaused: string;
    customWsPlaceholder: string;
    connectSocket: string;
    disconnect: string;
    qrHint: string;
    copySocketUrl: string;
    copied: string;
    staticSocketWarn: string;
    bleLead: string;
    bleUnsupported: string;
    bleInsecureWarn: string;
    connectBle3: string;
    connectBle2: string;
    channelA: string;
    channelB: string;
    appMax: string;
    localCap: string;
    capHint: string;
    waveLabel: string;
    startOutput: string;
    pauseOutput: string;
    testPulse: string;
    emergencyStop: string;
    feedbackGot: string;
    prefsTitle: string;
    prefs: {
      autoSync: string;
      allowRemote: string;
      zeroOnStop: string;
      edgeShock: string;
      channelBLink: string;
    };
    remoteSectionTitle: string;
    remoteDisabled: string;
    remoteCapNote: string;
    remoteZero: string;
    remoteTease: string;
    remoteShock: string;
    safetyNote: string;
  }
> = {
  en: {
    pageTitle: "DG-LAB Pulse Console",
    pageEyebrow: "Open-Source Hardware Integration",
    pageLead:
      "Connect DG-LAB 4.0 / 3.0 / 2.0 via official App Socket V4 / V3 QR code or Web Bluetooth (Coyote, Opossum, Lynx). Zero ads, dual safety caps enforced locally.",
    cardTitle: "DG-LAB E-Stim",
    cardSub: "App Socket V4/V3 · BLE 3.0/2.0",
    expand: "Configure",
    collapse: "Hide",
    status: {
      disconnected: "Not connected",
      waiting_qr: "Scan QR in DG-LAB App",
      paired: "App paired",
      connecting_ble: "Connecting BLE…",
      connected_ble: "BLE connected",
      error: "Connection error",
    },
    tabSocket4: "App QR (Socket V4)",
    tabSocket3: "Socket V3 (Legacy)",
    tabBle3: "BLE 3.0 Direct",
    tabBle2: "BLE 2.0 Direct",
    tabButtplug: "Buttplug.io (750+ Toys)",
    buttplugLead:
      "Connect to Intiface Central (ws://127.0.0.1:12345) via Buttplug Protocol v3 to drive Lovense, The Handy, We-Vibe, Kiiroo, Vorze & OSR2 alongside DG-LAB.",
    buttplugWsLabel: "Intiface Central WebSocket",
    buttplugConnect: "Connect Intiface",
    buttplugConnecting: "Connecting…",
    buttplugScan: "Scan Devices",
    buttplugScanning: "Scanning… (click to stop)",
    buttplugNoDevices:
      "Connected to Intiface. Wake your Bluetooth / serial toy and wait for it to appear here…",
    buttplugMaxCap: "Buttplug safety limit",
    buttplugIntensity: "Output intensity",
    buttplugCmds: {
      Scalar: "Vibrate",
      Linear: "Stroke",
      Rotate: "Rotate",
    },
    buttplugEnabled: "Active",
    buttplugPaused: "Muted",
    socketLead:
      "Pairs with DG-LAB App via Socket V3 over this server's /dglab-ws relay or the official V3 relay.",
    socket4Lead:
      "DG-LAB 4.0 official protocol (/dglab-ws/v4 or wss://trex.dungeon-lab.cn/v4). Supports Coyote 2.0/3.0, Opossum (OVC), and Lynx (BMTR).",
    wsModeLabel: "Relay endpoint",
    wsModes: {
      auto: "Auto (Tunnel / Built-in)",
      official: "Official Cloud (V4/V3)",
      lan: "Current LAN / Host",
      custom: "Custom WS URL",
    },
    devicesTitle: "App-exposed devices",
    noV4Devices: "Paired with App, waiting for hardware device to connect inside DG-LAB App…",
    deviceTypes: {
      COYOTE_030: "Coyote 3.0",
      COYOTE_020: "Coyote 2.0",
      OVC_1: "Opossum",
      BMTR_1: "Lynx Sensor",
    },
    customWsPlaceholder: "wss://your-relay.example.com/dglab-ws/v4",
    connectSocket: "Generate Pairing QR",
    disconnect: "Disconnect",
    qrHint:
      "Open the DG-LAB App -> Socket Control -> Scan QR code above. Use Tunnel WSS if your phone isn't on the same Wi-Fi.",
    copySocketUrl: "Copy Socket Link",
    copied: "Copied",
    staticSocketWarn:
      "GitHub Pages static hosting has no local LAN relay; pick Auto / Official Cloud, enter a Custom WS URL, or use BLE Direct.",
    bleLead:
      "Connect directly from Chrome/Edge on desktop or Android without opening the mobile App.",
    bleUnsupported:
      "Web Bluetooth is not supported in this browser (use Desktop Chrome/Edge, Android Chrome, or App Socket QR).",
    bleInsecureWarn:
      "Web Bluetooth requires HTTPS or localhost. Open via the Cloudflare Tunnel URL or use App Socket QR.",
    connectBle3: "Pair Coyote 3.0 (BLE)",
    connectBle2: "Pair Coyote 2.0 (BLE)",
    channelA: "Channel A",
    channelB: "Channel B",
    appMax: "App limit",
    localCap: "Local safety cap",
    capHint: "Never exceeds min(Local cap, App limit).",
    waveLabel: "Waveform preset",
    startOutput: "Start Output",
    pauseOutput: "Pause Output",
    testPulse: "1.5s Test Pulse",
    emergencyStop: "EMERGENCY STOP (Zero A/B)",
    feedbackGot: "App feedback button #{n}",
    prefsTitle: "Gameplay sync & safety rules",
    prefs: {
      autoSync: "Auto-sync intensity & waveform with game commands",
      allowRemote: "Allow remote controller to adjust waveform & bursts",
      zeroOnStop: "Drop output to 0 during Stop / Rest",
      edgeShock: "Deliver short burst when pressing At the Edge",
      channelBLink: "Mirror Channel A changes onto Channel B",
    },
    remoteSectionTitle: "DG-LAB Pulse Control",
    remoteDisabled: "Player enabled device (remote override locked by player)",
    remoteCapNote: "Clamped to player's local safety limit",
    remoteZero: "Zero",
    remoteTease: "Tease pulse",
    remoteShock: "Punish shock",
    safetyNote:
      "Always start with a low cap on dry electrodes and raise slowly. Local and App limits both stay active.",
  },
  zh: {
    pageTitle: "DG-LAB 脉冲控制台",
    pageEyebrow: "开源硬件联动",
    pageLead:
      "全面支持 DG-LAB 4.0（Socket V4）及兼容 V3 / 蓝牙 3.0 & 2.0：支持 App 扫码直连内置中继或官方云节点（郊狼/负鼠/灵猫），也支持浏览器 Web Bluetooth 直连。",
    cardTitle: "DG-LAB 郊狼联动",
    cardSub: "App 扫码 V4/V3 · 蓝牙直连 3.0 / 2.0",
    expand: "展开配置",
    collapse: "收起",
    status: {
      disconnected: "未连接",
      waiting_qr: "等待 App 扫码绑定",
      paired: "App 已绑定",
      connecting_ble: "蓝牙连接中…",
      connected_ble: "蓝牙已直连",
      error: "连接异常",
    },
    tabSocket4: "App 扫码 (Socket V4)",
    tabSocket3: "旧版 Socket V3",
    tabBle3: "蓝牙直连 3.0",
    tabBle2: "蓝牙直连 2.0",
    tabButtplug: "Buttplug.io (通用玩具)",
    buttplugLead:
      "连接本地或手机运行的开源桥接器 Intiface Central（默认 ws://127.0.0.1:12345），即可驱动 Lovense、The Handy、跳蛋、伸缩飞机杯等 750+ 款硬件，可与郊狼同时联动。",
    buttplugWsLabel: "Intiface Central WS 地址",
    buttplugConnect: "连接 Intiface",
    buttplugConnecting: "连接中…",
    buttplugScan: "扫描设备",
    buttplugScanning: "扫描中（点击停止）",
    buttplugNoDevices:
      "已连上 Intiface，请开启玩具蓝牙等待扫描识别…",
    buttplugMaxCap: "通用玩具安全上限",
    buttplugIntensity: "当前输出强度",
    buttplugCmds: {
      Scalar: "震动",
      Linear: "伸缩",
      Rotate: "旋转",
    },
    buttplugEnabled: "参与联动",
    buttplugPaused: "已屏蔽",
    socketLead:
      "通过内置 `/dglab-ws` 协议或官方 V3 中继与 DG-LAB App 配对（兼容旧版控制端）。",
    socket4Lead:
      "DG-LAB 4.0 官方协议（内置 `/dglab-ws/v4` 或官方云 `wss://trex.dungeon-lab.cn/v4`），支持郊狼 2.0/3.0、负鼠、灵猫等多设备。",
    wsModeLabel: "Socket 中继地址",
    wsModes: {
      auto: "自动（隧道 / 内置中继）",
      official: "官方云中继 (V4/V3)",
      lan: "当前局域网 / 本机",
      custom: "自定义 WS 地址",
    },
    devicesTitle: "App 已连接硬件",
    noV4Devices: "App 已连接，请在手机 DG-LAB 4.0 App 内连接郊狼或负鼠设备…",
    deviceTypes: {
      COYOTE_030: "郊狼 3.0",
      COYOTE_020: "郊狼 2.0",
      OVC_1: "负鼠控制器",
      BMTR_1: "灵猫传感器",
    },
    customWsPlaceholder: "wss://你的中继域名/dglab-ws/v4",
    connectSocket: "生成配对二维码",
    disconnect: "断开连接",
    qrHint:
      "打开手机 DG-LAB App -> Socket 控制 -> 扫描上方二维码即可。若手机和电脑不在同一局域网，请选自动隧道 WSS。",
    copySocketUrl: "复制配对链接",
    copied: "已复制",
    staticSocketWarn:
      "当前为 GitHub Pages 纯静态版本，无内置局域网中继；可选「自动 / 官方云中继」、填写自定义 WS 地址或直接用蓝牙直连。",
    bleLead:
      "电脑端 Chrome / Edge 或安卓 Chrome 可绕过手机 App 直接通过蓝牙连接郊狼主机（Pages 纯静态版也可使用）。",
    bleUnsupported:
      "当前浏览器不支持 Web Bluetooth（iOS / 部分浏览器限制，建议使用上方 App 扫码连接）。",
    bleInsecureWarn:
      "Web Bluetooth 需要 HTTPS 或 localhost 环境。请通过 Cloudflare 隧道地址打开，或使用 App 扫码模式。",
    connectBle3: "连接郊狼 3.0 (BLE)",
    connectBle2: "连接郊狼 2.0 (BLE)",
    channelA: "A 通道强度",
    channelB: "B 通道强度",
    appMax: "App 软上限",
    localCap: "本地安全上限",
    capHint: "实际输出始终取 min(本地上限, App 软上限)，绝不越界。",
    waveLabel: "波形预设",
    startOutput: "开启持续波形输出",
    pauseOutput: "暂停输出",
    testPulse: "1.5 秒脉冲测试",
    emergencyStop: "紧急急停归零 (Zero A/B)",
    feedbackGot: "收到 App 反馈按钮 #{n}",
    prefsTitle: "游戏联动与安全锁规则",
    prefs: {
      autoSync: "随游戏指令（冲刺 / 慢速 / BPM）自动切换强度与波形",
      allowRemote: "允许远程控制者调节波形与触发突发脉冲",
      zeroOnStop: "出现「停止 / 休息」指令时自动降为 0",
      edgeShock: "按下「快到极限 / 边缘」时触发短促惩罚脉冲",
      channelBLink: "B 通道自动镜像跟随 A 通道变化",
    },
    remoteSectionTitle: "DG-LAB 远程脉冲控制",
    remoteDisabled: "对方已连接设备，但锁定了远程改强权限",
    remoteCapNote: "强度始终受玩家本地与 App 安全上限双重限制",
    remoteZero: "归零",
    remoteTease: "轻撩挑逗波",
    remoteShock: "惩罚突刺波",
    safetyNote:
      "请先贴紧电极片并将初始上限设低再逐步上调；本地安全上限与 App 硬件软上限始终生效。",
  },
};
