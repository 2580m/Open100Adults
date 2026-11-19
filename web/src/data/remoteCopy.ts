export type RemoteAction =
  | "stop"
  | "slow"
  | "fast"
  | "edge"
  | "allow"
  | "deny"
  | "extend";

export interface RemoteCopy {
  meta: { title: string; description: string };
  eyebrow: string;
  title: string;
  tagline: string;
  lead: string;
  badges: string[];
  controller: {
    create: string;
    creating: string;
    linkReady: string;
    copy: string;
    copied: string;
    open: string;
    room: string;
    commands: string;
    speed: string;
    send: string;
    sent: string;
    last: string;
  };
  receiver: {
    waiting: string;
    connected: string;
    lastCommand: string;
    history: string;
    noCommand: string;
    room: string;
    notFound: string;
  };
  actions: Record<RemoteAction, string>;
  list: {
    title: string;
    lead: string;
    empty: string;
    refresh: string;
    control: string;
    created: string;
    commands: string;
    rooms: string;
    makeLink: string;
    loading: string;
  };
  howTo: { title: string; steps: { title: string; body: string }[] };
  safety: { title: string; items: string[] };
  disclaimer: string;
}

export const remoteCopy: { en: RemoteCopy; zh: RemoteCopy } = {
  en: {
    meta: {
      title: "Remote play",
      description:
        "Send someone a link and control their edging game with buttons. No sign-up, no voice or video.",
    },
    eyebrow: "Remote play · 18+",
    title: "Remote play",
    tagline: "Someone else gives the commands.",
    lead:
      "Make a link, send it to one person, and press the buttons. Every command shows up on their screen as is. No sign-up. No voice or video is exchanged.",
    badges: ["2 people", "6 speeds", "Preset lines", "Final call"],
    controller: {
      create: "Make a link",
      creating: "Making…",
      linkReady: "Send this link to the person you're controlling",
      copy: "Copy link",
      copied: "Copied",
      open: "Open receiver view",
      room: "Room",
      commands: "Commands",
      speed: "Speed",
      send: "Send",
      sent: "Sent",
      last: "Last command",
    },
    receiver: {
      waiting: "Waiting for commands…",
      connected: "Connected",
      lastCommand: "Last command",
      history: "Recent commands",
      noCommand: "No commands yet.",
      room: "Room",
      notFound: "This room no longer exists. Ask for a new link.",
    },
    actions: {
      stop: "Stop",
      slow: "Slow",
      fast: "Fast",
      edge: "Edge",
      allow: "Allow",
      deny: "Deny",
      extend: "Extend",
    },
    list: {
      title: "People waiting for commands",
      lead:
        "Pick someone and your button commands show up on their screen. First come, first served.",
      empty: "No one is waiting right now.",
      refresh: "Refresh",
      control: "Control this room",
      created: "Created",
      commands: "commands",
      rooms: "rooms",
      makeLink: "Make a link and post it",
      loading: "Loading…",
    },
    howTo: {
      title: "How it works",
      steps: [
        {
          title: "Make a link",
          body: "The person holding out makes a link on this page.",
        },
        {
          title: "Send it",
          body: "Send it to one person, or get listed on the site and wait for someone.",
        },
        {
          title: "Follow their buttons",
          body: "Every command they press shows up on the receiver's screen as is.",
        },
      ],
    },
    safety: {
      title: "Play safe",
      items: [
        "No voice or video is exchanged",
        "Your name and contacts are never shown",
        "Nothing you press or say is stored",
        "Either of you can stop at any time",
      ],
    },
    disclaimer:
      "Stop right away if anything hurts or feels off. Not a medical product. 18+ only.",
  },
  zh: {
    meta: {
      title: "远程操控",
      description:
        "发一条链接，用按钮远程控制对方的寸止游戏。无需注册，不交换语音或视频。",
    },
    eyebrow: "远程操控 · 18+",
    title: "远程操控",
    tagline: "由对方来下指令。",
    lead:
      "生成一条链接发给一个人，然后按按钮。对方屏幕上会原样显示每条指令。无需注册，不交换语音或视频。",
    badges: ["2 人", "6 档速度", "预设台词", "最后决定"],
    controller: {
      create: "生成链接",
      creating: "生成中…",
      linkReady: "把这条链接发给被你控制的人",
      copy: "复制链接",
      copied: "已复制",
      open: "打开接收端",
      room: "房间",
      commands: "指令",
      speed: "速度",
      send: "发送",
      sent: "已发送",
      last: "最后指令",
    },
    receiver: {
      waiting: "等待指令…",
      connected: "已连接",
      lastCommand: "最后指令",
      history: "最近的指令",
      noCommand: "还没有指令。",
      room: "房间",
      notFound: "这个房间已经不存在了，请让对方重新发链接。",
    },
    actions: {
      stop: "停",
      slow: "慢",
      fast: "快",
      edge: "到边缘",
      allow: "允许射",
      deny: "不许射",
      extend: "加时",
    },
    list: {
      title: "等人下指令的人",
      lead: "从列表里选一个人，你的按钮指令会显示在对方屏幕上。先到先得。",
      empty: "现在没有人在等。",
      refresh: "刷新",
      control: "控制这个房间",
      created: "创建于",
      commands: "条指令",
      rooms: "个房间",
      makeLink: "生成一条链接发出去",
      loading: "加载中…",
    },
    howTo: {
      title: "怎么用",
      steps: [
        { title: "生成链接", body: "被控制的一方在这个页面生成链接。" },
        {
          title: "发出去",
          body: "发给一个人，或者留在列表里等人来接。",
        },
        {
          title: "照着按钮做",
          body: "对方按下的每条指令，都会原样显示在接收端屏幕上。",
        },
      ],
    },
    safety: {
      title: "安全须知",
      items: [
        "不交换语音或视频",
        "不会显示你的姓名和联系方式",
        "你按下的内容不会被保存",
        "任何一方都可以随时停止",
      ],
    },
    disclaimer:
      "如果疼痛或不适，请立刻停止。这不是医疗产品。仅限 18 岁以上。",
  },
};
