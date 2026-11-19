export type SundomeDifficulty = "easy" | "normal" | "hard" | "brutal";
export type SundomeEnding = "lottery" | "allowed" | "denied" | "ruined" | "overtime";
export type CommandType = "stroke" | "slow" | "stop";

export interface SundomeCommand {
  text: string;
  type: CommandType;
  bpm: number;
}

export interface CustomCommand {
  text: string;
  type: CommandType;
  bpm: number;
}

export interface SundomeCopy {
  meta: { title: string; description: string };
  eyebrow: string;
  title: string;
  tagline: string;
  lead: string;
  badges: string[];
  gate: { title: string; body: string; confirm: string; under18: string };
  settings: {
    duration: string;
    customMinutes: string;
    difficulty: string;
    ending: string;
    metronome: string;
    voice: string;
    volume: string;
    custom: string;
    customText: string;
    customType: string;
    customBpm: string;
    add: string;
    remove: string;
    noCustom: string;
  };
  difficulties: Record<
    SundomeDifficulty,
    { label: string; description: string; chance: number; restEvery: number }
  >;
  endings: Record<SundomeEnding, { label: string; description: string }>;
  types: Record<CommandType, string>;
  actions: {
    start: string;
    pause: string;
    resume: string;
    quit: string;
    edged: string;
    edgedHint: string;
    close: string;
  };
  status: {
    timeLeft: string;
    edges: string;
    chance: string;
    command: string;
    paused: string;
    permission: string;
    permissionHint: string;
    denied: string;
    deniedHint: string;
    ruined: string;
    ruinedHint: string;
    overtime: string;
    overtimeHint: string;
    finished: string;
    playAgain: string;
    ready: string;
    readyHint: string;
    edgeCooldown: string;
  };
  video: {
    title: string;
    local: string;
    samples: string;
    clear: string;
    search: string;
    loading: string;
    error: string;
    noResults: string;
    prev: string;
    next: string;
    page: string;
    pick: string;
    mute: string;
    unmute: string;
    volume: string;
  };
  commands: Record<CommandType, SundomeCommand[]>;
  howTo: { title: string; steps: { title: string; body: string }[] };
  faq: { title: string; items: { q: string; a: string }[] };
  disclaimer: string;
}

const en: SundomeCopy = {
  meta: {
    title: "Edging Game",
    description:
      "Follow the screen: stroke on green, slow on yellow, hands off on red. A metronome, spoken commands and a final draw decide whether you may finish.",
  },
  eyebrow: "Edging Game · 18+",
  title: "Edging Game",
  tagline: "Follow the screen. Hold back until time's up.",
  lead:
    "Every few seconds the screen gives a command: fast, slow, hands off. You stroke exactly as told and hold out until the timer ends. Then a draw decides whether you get permission to come or go home denied. In short: a solo game where the screen decides when you may finish.",
  badges: [
    "Free",
    "No sign-up",
    "Phone friendly",
    "Metronome beat",
    "Spoken commands",
    "Edge counter",
  ],
  gate: {
    title: "Tonight, the screen decides",
    body: "Stop right away if anything hurts or feels off. Not a medical product.",
    confirm: "I'm 18+, let's play",
    under18: "I'm under 18",
  },
  settings: {
    duration: "Duration",
    customMinutes: "Custom minutes",
    difficulty: "Difficulty",
    ending: "Ending",
    metronome: "Metronome",
    voice: "Spoken commands",
    volume: "Volume",
    custom: "Add your own commands",
    customText: "Command",
    customType: "Type",
    customBpm: "BPM",
    add: "Add",
    remove: "Remove",
    noCustom: "No custom commands yet.",
  },
  difficulties: {
    easy: {
      label: "Easy",
      description: "Fewer hands-off breaks and an 80% chance of permission.",
      chance: 80,
      restEvery: 5,
    },
    normal: {
      label: "Normal",
      description: "A 60% chance of permission and regular breaks.",
      chance: 60,
      restEvery: 4,
    },
    hard: {
      label: "Hard",
      description: "A 45% chance and more hands-off time.",
      chance: 45,
      restEvery: 3,
    },
    brutal: {
      label: "Brutal",
      description: "A 30% chance and a break every 2 commands.",
      chance: 30,
      restEvery: 2,
    },
  },
  endings: {
    lottery: {
      label: "Lottery",
      description: "The draw decides: permission or denied.",
    },
    allowed: {
      label: "Always allowed",
      description: "You get permission when the timer ends.",
    },
    denied: {
      label: "Always denied",
      description: "The timer ends with no permission.",
    },
    ruined: {
      label: "Ruined",
      description: "You may finish, but hands off from the start.",
    },
    overtime: {
      label: "Overtime",
      description: "If the draw fails, the game adds two minutes and continues.",
    },
  },
  types: {
    stroke: "Stroke",
    slow: "Slow",
    stop: "Hands off",
  },
  actions: {
    start: "Start",
    pause: "Pause",
    resume: "Resume",
    quit: "Quit",
    edged: "Edged",
    edgedHint: "Press when you stop right before coming: cooldown +5% chance",
    close: "Close",
  },
  status: {
    timeLeft: "Time left",
    edges: "Edges",
    chance: "Final chance",
    command: "Command",
    paused: "Paused",
    permission: "You may come",
    permissionHint: "Permission lasts 10 seconds. Take it.",
    denied: "Denied tonight",
    deniedHint: "No permission this time. Try a longer run or a different ending.",
    ruined: "Ruined",
    ruinedHint: "Let go the moment it starts. Hands off until the end.",
    overtime: "Overtime",
    overtimeHint: "The draw failed, so the game continues for two more minutes.",
    finished: "Finished",
    playAgain: "Play again",
    ready: "Ready",
    readyHint: "Pick a duration, difficulty and ending, then press Start.",
    edgeCooldown: "Cooling down after an edge",
  },
  video: {
    title: "Video",
    local: "Choose a local video",
    samples: "Preview samples",
    clear: "Remove video",
    search: "Search title or actress",
    loading: "Loading samples…",
    error: "Samples could not be loaded.",
    noResults: "No samples match that search.",
    prev: "Previous",
    next: "Next",
    page: "Page",
    pick: "Play this preview",
    mute: "Mute",
    unmute: "Unmute",
    volume: "Video volume",
  },
  commands: {
    stroke: [
      { text: "Stroke steadily, one per beat.", type: "stroke", bpm: 80 },
      { text: "Keep the same rhythm. Don't speed up.", type: "stroke", bpm: 72 },
      { text: "Long, slow strokes from base to tip.", type: "stroke", bpm: 60 },
      { text: "Short strokes around the head.", type: "stroke", bpm: 96 },
      { text: "Grip a little tighter and keep the beat.", type: "stroke", bpm: 84 },
      { text: "Use your whole hand and follow the clicks.", type: "stroke", bpm: 76 },
      { text: "Stroke with just your thumb and forefinger.", type: "stroke", bpm: 68 },
      { text: "Keep your wrist loose and let the beat carry you.", type: "stroke", bpm: 88 },
      { text: "Switch hands and keep the rhythm.", type: "stroke", bpm: 80 },
      { text: "Stay at the same pace, no matter how close you get.", type: "stroke", bpm: 64 },
      { text: "Slow strokes, all the way down.", type: "stroke", bpm: 56 },
      { text: "Focus on the tip, one stroke per beat.", type: "stroke", bpm: 92 },
      { text: "Let your hand move with the metronome.", type: "stroke", bpm: 78 },
      { text: "Same speed. Breathe out on each stroke.", type: "stroke", bpm: 70 },
      { text: "Stroke without stopping until the light changes.", type: "stroke", bpm: 86 },
      { text: "Keep it steady and don't chase the edge.", type: "stroke", bpm: 62 },
    ],
    slow: [
      { text: "Slow down to half speed.", type: "slow", bpm: 40 },
      { text: "Barely move. Tease yourself.", type: "slow", bpm: 36 },
      { text: "One finger, very slow circles.", type: "slow", bpm: 32 },
      { text: "Stop at the tip, then slide back down slowly.", type: "slow", bpm: 44 },
      { text: "Light touch only. No grip.", type: "slow", bpm: 48 },
      { text: "Slow strokes, pause at the top.", type: "slow", bpm: 40 },
      { text: "Trace the shaft with your fingertips.", type: "slow", bpm: 34 },
      { text: "Move as slowly as you can.", type: "slow", bpm: 28 },
      { text: "Tease the head with two fingers.", type: "slow", bpm: 46 },
      { text: "Slow, shallow strokes.", type: "slow", bpm: 42 },
    ],
    stop: [
      { text: "Hands off. Breathe.", type: "stop", bpm: 40 },
      { text: "Let go completely. Don't touch.", type: "stop", bpm: 40 },
      { text: "Hands away. Count your breaths.", type: "stop", bpm: 40 },
      { text: "Stop. Relax your legs.", type: "stop", bpm: 40 },
      { text: "Let go and wait.", type: "stop", bpm: 40 },
      { text: "No touching until the light changes.", type: "stop", bpm: 40 },
      { text: "Hands off. Cool down.", type: "stop", bpm: 40 },
      { text: "Release. Breathe out slowly.", type: "stop", bpm: 40 },
    ],
  },
  howTo: {
    title: "How to play",
    steps: [
      {
        title: "Pick a duration, a difficulty and an ending",
        body: "Choose 3–30 minutes or set your own. Difficulty changes how often you must keep your hands off and your final permission chance. The ending decides what happens when the timer stops.",
      },
      {
        title: "Follow the colour and the beat",
        body: "Green means stroke. Yellow means slow and teasing. Red means hands off until it ends. On green and yellow the click keeps the beat: one stroke per beat.",
      },
      {
        title: "Report your edges",
        body: "When you manage to stop right before coming, press “Edged”. The game switches to a cooldown and your final chance rises by 5%, up to +20%.",
      },
      {
        title: "Hold out until the timer ends",
        body: "Coming early means you lose. If you're about to, let go completely and wait until it settles.",
      },
      {
        title: "The ending",
        body: "When time is up you either get permission or you're denied. Permission lasts 10 seconds. If you chose “Ruined”, let go the moment it starts.",
      },
    ],
  },
  faq: {
    title: "Frequently Asked Questions",
    items: [
      {
        q: "Is there a safe word?",
        a: "You are always in control. Stop whenever you want, use the Quit button, and never push through pain. The game is not a medical product.",
      },
      {
        q: "Can I add my own commands?",
        a: "Yes. Add any line with its type and BPM under “Add your own commands”. Custom commands join the pool for this device.",
      },
      {
        q: "What does the metronome do?",
        a: "It keeps the pace. On green and yellow you do one stroke per click. On red the clicks slow down or stop while you keep your hands off.",
      },
      {
        q: "Where do the preview clips come from?",
        a: "They are streamed from the original rights holder's servers through the local sample API. Nothing is downloaded or re-hosted.",
      },
    ],
  },
  disclaimer:
    "Stop right away if anything hurts or feels off. Not a medical product. 18+ only.",
};

const zh: SundomeCopy = {
  meta: {
    title: "寸止游戏",
    description:
      "跟着屏幕：绿色动、黄色慢、红色停手。节拍器、语音指令和最后的抽签决定你能不能射。",
  },
  eyebrow: "寸止游戏 · 18+",
  title: "寸止游戏",
  tagline: "跟着屏幕做，忍住到时间结束。",
  lead:
    "每隔几秒，屏幕会给出一条指令：快、慢、停手。你照着做，忍到计时结束。最后抽签决定你是获准射，还是今晚被拒绝。简单说：一个由屏幕决定你什么时候能射的单人游戏。",
  badges: ["免费", "无需注册", "手机可用", "节拍器", "语音指令", "边缘计数"],
  gate: {
    title: "今晚，由屏幕决定",
    body: "如果疼痛或不适，请立刻停止。这不是医疗产品。",
    confirm: "我已满 18 岁，开始",
    under18: "我未满 18 岁",
  },
  settings: {
    duration: "时长",
    customMinutes: "自定义分钟",
    difficulty: "难度",
    ending: "结局",
    metronome: "节拍器",
    voice: "语音指令",
    volume: "音量",
    custom: "添加自定义指令",
    customText: "指令",
    customType: "类型",
    customBpm: "BPM",
    add: "添加",
    remove: "删除",
    noCustom: "还没有自定义指令。",
  },
  difficulties: {
    easy: {
      label: "简单",
      description: "停手更少，最后获准概率 80%。",
      chance: 80,
      restEvery: 5,
    },
    normal: {
      label: "普通",
      description: "获准概率 60%，规律停手。",
      chance: 60,
      restEvery: 4,
    },
    hard: {
      label: "困难",
      description: "获准概率 45%，停手更频繁。",
      chance: 45,
      restEvery: 3,
    },
    brutal: {
      label: "残酷",
      description: "获准概率 30%，每 2 条指令就停一次。",
      chance: 30,
      restEvery: 2,
    },
  },
  endings: {
    lottery: { label: "抽签", description: "抽签决定：获准或被拒绝。" },
    allowed: { label: "一定获准", description: "计时结束时一定可以射。" },
    denied: { label: "一定拒绝", description: "计时结束时不许射。" },
    ruined: { label: "废射", description: "可以射，但开始时要停手。" },
    overtime: { label: "加时", description: "抽签失败就加两分钟继续。" },
  },
  types: { stroke: "动", slow: "慢", stop: "停手" },
  actions: {
    start: "开始",
    pause: "暂停",
    resume: "继续",
    quit: "退出",
    edged: "到边缘了",
    edgedHint: "在射前停住时按：冷却并提高 5% 获准概率",
    close: "关闭",
  },
  status: {
    timeLeft: "剩余时间",
    edges: "边缘次数",
    chance: "最终概率",
    command: "指令",
    paused: "已暂停",
    permission: "可以射",
    permissionHint: "许可持续 10 秒，抓紧。",
    denied: "今晚不许射",
    deniedHint: "这次没有许可。可以试试更长时间或换结局。",
    ruined: "废射",
    ruinedHint: "开始时立刻放开，全程停手到结束。",
    overtime: "加时",
    overtimeHint: "抽签失败，再加两分钟继续。",
    finished: "结束",
    playAgain: "再玩一次",
    ready: "准备",
    readyHint: "选好时长、难度和结局，然后按开始。",
    edgeCooldown: "到边缘后冷却",
  },
  video: {
    title: "视频",
    local: "选择本地视频",
    samples: "试看片",
    clear: "移除视频",
    search: "搜索标题或演员",
    loading: "正在加载试看片…",
    error: "试看片加载失败。",
    noResults: "没有匹配的试看片。",
    prev: "上一页",
    next: "下一页",
    page: "页",
    pick: "播放这个试看",
    mute: "静音",
    unmute: "取消静音",
    volume: "视频音量",
  },
  commands: {
    stroke: [
      { text: "跟着节拍，每拍动一下。", type: "stroke", bpm: 80 },
      { text: "保持同样节奏，不许加快。", type: "stroke", bpm: 72 },
      { text: "从根部到顶端，长而慢地动。", type: "stroke", bpm: 60 },
      { text: "只在顶端附近短距离动。", type: "stroke", bpm: 96 },
      { text: "稍微握紧一点，跟上节拍。", type: "stroke", bpm: 84 },
      { text: "用整只手，跟着点击声。", type: "stroke", bpm: 76 },
      { text: "只用拇指和食指。", type: "stroke", bpm: 68 },
      { text: "手腕放松，让节拍带着你。", type: "stroke", bpm: 88 },
      { text: "换一只手，保持节奏。", type: "stroke", bpm: 80 },
      { text: "不管多近，速度都不许变。", type: "stroke", bpm: 64 },
      { text: "慢速，每次都到底。", type: "stroke", bpm: 56 },
      { text: "专注顶端，每拍一下。", type: "stroke", bpm: 92 },
      { text: "让手跟着节拍器动。", type: "stroke", bpm: 78 },
      { text: "同样速度，每次动的时候呼气。", type: "stroke", bpm: 70 },
      { text: "不许停，直到灯变色。", type: "stroke", bpm: 86 },
      { text: "稳住，别去追边缘。", type: "stroke", bpm: 62 },
    ],
    slow: [
      { text: "降到一半速度。", type: "slow", bpm: 40 },
      { text: "几乎不动，慢慢吊着。", type: "slow", bpm: 36 },
      { text: "一根手指，非常慢地画圈。", type: "slow", bpm: 32 },
      { text: "到顶端停住，再慢慢滑下去。", type: "slow", bpm: 44 },
      { text: "只轻轻碰，不许握。", type: "slow", bpm: 48 },
      { text: "慢速，到顶部停一下。", type: "slow", bpm: 40 },
      { text: "用指尖沿着柱身描。", type: "slow", bpm: 34 },
      { text: "能多慢就多慢。", type: "slow", bpm: 28 },
      { text: "用两根手指逗弄顶端。", type: "slow", bpm: 46 },
      { text: "慢而浅地动。", type: "slow", bpm: 42 },
    ],
    stop: [
      { text: "停手，呼吸。", type: "stop", bpm: 40 },
      { text: "完全放开，别碰。", type: "stop", bpm: 40 },
      { text: "手拿开，数呼吸。", type: "stop", bpm: 40 },
      { text: "停下，放松双腿。", type: "stop", bpm: 40 },
      { text: "放开，等着。", type: "stop", bpm: 40 },
      { text: "灯变色之前不许碰。", type: "stop", bpm: 40 },
      { text: "停手，冷却一下。", type: "stop", bpm: 40 },
      { text: "放开，慢慢呼气。", type: "stop", bpm: 40 },
    ],
  },
  howTo: {
    title: "怎么玩",
    steps: [
      {
        title: "选时长、难度和结局",
        body: "选 3~30 分钟，或自己设定。难度决定停手频率和最终获准概率，结局决定计时结束后发生什么。",
      },
      {
        title: "跟着颜色和节拍",
        body: "绿色=动，黄色=慢，红色=停手到结束。绿色和黄色时点击声就是节拍：一拍动一下。",
      },
      {
        title: "报告边缘",
        body: "在射前停住时按「到边缘了」。游戏进入冷却，最终获准概率 +5%，最多 +20%。",
      },
      {
        title: "忍到计时结束",
        body: "提前射就算输。快到时完全放开，等它平复。",
      },
      {
        title: "结局",
        body: "时间到后，要么获准，要么被拒绝。许可持续 10 秒。选「废射」的话，开始的那一刻就放开。",
      },
    ],
  },
  faq: {
    title: "常见问题",
    items: [
      {
        q: "有安全词吗？",
        a: "你始终有控制权。随时可以停，按退出，不要硬撑疼痛。这不是医疗产品。",
      },
      {
        q: "可以自己加指令吗？",
        a: "可以。在「添加自定义指令」里填内容、类型和 BPM，就会加入这台设备的指令池。",
      },
      {
        q: "节拍器是做什么的？",
        a: "控制节奏。绿色和黄色时一拍动一下；红色时节拍放慢或停止，你保持停手。",
      },
      {
        q: "试看片从哪里来？",
        a: "通过本地试看片接口，从原始权利人的服务器串流。不下载、不重新托管。",
      },
    ],
  },
  disclaimer:
    "如果疼痛或不适，请立刻停止。这不是医疗产品。仅限 18 岁以上。",
};

export const sundomeCopy: { en: SundomeCopy; zh: SundomeCopy } = { en, zh };
