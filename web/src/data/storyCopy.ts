export interface StoryCopy {
  meta: { title: string; description: string };
  eyebrow: string;
  title: string;
  tagline: string;
  lead: string;
  badges: string[];
  filters: {
    all: string;
    forMen: string;
    forWomen: string;
    tones: { sweet: string; tease: string; hard: string };
    durations: { all: string; short: string; mid: string; long: string };
    stories: string;
    surprise: string;
    start: string;
    minutes: string;
    noResults: string;
  };
  player: {
    gateTitle: string;
    gateBody: string;
    confirm: string;
    under18: string;
    start: string;
    edge: string;
    next: string;
    came: string;
    pause: string;
    resume: string;
    quit: string;
    voice: string;
    lines: string;
    ending: string;
    playAgain: string;
    backToStories: string;
    edgeCount: string;
      countdown: string;
      cooldown: string;
    stages: {
      prepare: string;
      stroke: string;
      slow: string;
      rest: string;
      cooldown: string;
      ask: string;
      build: string;
      choice: string;
      count: string;
      allow: string;
      ruin: string;
      deny: string;
      after: string;
      oops: string;
    };
    hints: {
      edge: string;
      came: string;
      next: string;
      paused: string;
      voice: string;
    };
    endingKinds: {
      allow: string;
      ruin: string;
      deny: string;
      oops: string;
    };
  };
  howTo: { title: string; steps: { title: string; body: string }[] };
  faq: { title: string; items: { q: string; a: string }[] };
  disclaimer: string;
}

export const storyCopy: { en: StoryCopy; zh: StoryCopy } = {
  en: {
    meta: {
      title: "Edging Stories",
      description:
        "Interactive edging stories with a scene, commands and several endings. Read, follow along and decide when to stop.",
    },
    eyebrow: "Edging Stories · 18+",
    title: "Edging Stories",
    tagline: "Tonight, someone else is in control.",
    lead:
      "Edging with a partner and a scene. Follow what they say and what they tell you to do, and when you get close, hit “I'm close” to stop. Whether you get to finish depends on the story.",
    badges: [
      "8–30 min per story",
      "2–4 endings each",
      "Free, no sign-up",
      "Progress stays on this device",
    ],
    filters: {
      all: "All",
      forMen: "For men",
      forWomen: "For women",
      tones: { sweet: "Sweet", tease: "Teasing", hard: "Strict" },
      durations: { all: "Any length", short: "Up to 10 min", mid: "11–15 min", long: "16+ min" },
      stories: "stories",
      surprise: "Surprise me: pick one at random",
      start: "Start this story",
      minutes: "min",
      noResults: "No stories match those filters.",
    },
    player: {
      gateTitle: "Tonight, someone else is in control",
      gateBody: "Stop right away if anything hurts or feels off. Not a medical product.",
      confirm: "I'm 18+, let's play",
      under18: "I'm under 18",
      start: "Start",
      edge: "I'm close",
      next: "Continue",
      came: "I came",
      pause: "Pause",
      resume: "Resume",
      quit: "Quit",
      voice: "Voice",
      lines: "Lines",
      ending: "Ending",
      playAgain: "Play again",
      backToStories: "Back to all stories",
      edgeCount: "Close calls",
      countdown: "Countdown",
      cooldown: "Let go completely and breathe until it settles.",
      stages: {
        prepare: "Get ready",
        stroke: "Stroke",
        slow: "Slow",
        rest: "Rest",
        cooldown: "Cool down",
        ask: "Choose",
        build: "Final build",
        choice: "One question",
        count: "Countdown",
        allow: "You may come",
        ruin: "Ruined",
        deny: "Denied",
        after: "After",
        oops: "Too soon",
      },
      hints: {
        edge: "Press when you stop right before coming.",
        came: "Press when you come, or when you can't hold it.",
        next: "Continue when you're ready.",
        paused: "Paused. Press Space or Resume.",
        voice: "Read the lines aloud with your browser's voice.",
      },
      endingKinds: {
        allow: "Allowed",
        ruin: "Ruined",
        deny: "Denied",
        oops: "Early",
      },
    },
    howTo: {
      title: "How it works",
      steps: [
        {
          title: "Pick a story",
          body: "Check the partner, intensity and tags, and pick one that fits you. Every story lists its approximate length and endings.",
        },
        {
          title: "Follow the scene",
          body: "The story gives you a command and lines to listen to. Follow the command, and press “I'm close” when you stop right before coming.",
        },
        {
          title: "The ending depends on you",
          body: "Some stories count your close calls, some let you choose, and some always allow a finish. Coming early ends the story the other way.",
        },
      ],
    },
    faq: {
      title: "Frequently Asked Questions",
      items: [
        {
          q: "Are the stories voiced?",
          a: "You can turn on the browser voice with the Voice toggle. It reads the lines aloud; no audio is downloaded.",
        },
        {
          q: "Is my progress saved?",
          a: "No. The story runs in this tab and nothing is stored on a server.",
        },
        {
          q: "Can I stop in the middle?",
          a: "Yes. Press Quit at any time. You are always in control, and pain or discomfort means stop.",
        },
      ],
    },
    disclaimer:
      "Stop right away if anything hurts or feels off. Not a medical product. 18+ only.",
  },
  zh: {
    meta: {
      title: "寸止剧情",
      description:
        "有角色、有场景的互动寸止剧情。跟着指令做，快到极限就停，结局由故事和你决定。",
    },
    eyebrow: "寸止剧情 · 18+",
    title: "寸止剧情",
    tagline: "今晚，由 TA 来让你寸止。",
    lead:
      "有角色、有场景的寸止。跟着 TA 的话和指令动手，快到极限就按「快到了」停下。最后能不能射，要看是哪个故事。",
    badges: ["每个故事 8～30 分钟", "2～4 种结局", "免费·无需注册", "记录只存本机"],
    filters: {
      all: "全部",
      forMen: "男性向",
      forWomen: "女性向",
      tones: { sweet: "温柔", tease: "坏心眼", hard: "严厉" },
      durations: { all: "全部时长", short: "10 分钟内", mid: "11–15 分钟", long: "16 分钟以上" },
      stories: "个故事",
      surprise: "随便来一个：随机选一个故事",
      start: "开始这个故事",
      minutes: "分钟",
      noResults: "没有符合条件的故事。",
    },
    player: {
      gateTitle: "今晚，由 TA 来决定",
      gateBody: "如果疼痛或不适，请立刻停止。这不是医疗产品。",
      confirm: "我已满 18 岁，开始",
      under18: "我未满 18 岁",
      start: "开始",
      edge: "快到了",
      next: "继续",
      came: "射了",
      pause: "暂停",
      resume: "继续",
      quit: "退出",
      voice: "语音",
      lines: "台词",
      ending: "结局",
      playAgain: "再玩一次",
      backToStories: "返回故事列表",
      edgeCount: "快到了次数",
      countdown: "倒数",
      cooldown: "完全放开，慢慢呼吸，等它平复。",
      stages: {
        prepare: "准备",
        stroke: "动",
        slow: "慢",
        rest: "休息",
        cooldown: "冷却",
        ask: "选择",
        build: "最后冲刺",
        choice: "最后一个问题",
        count: "倒数",
        allow: "可以射",
        ruin: "废射",
        deny: "不许射",
        after: "之后",
        oops: "太早了",
      },
      hints: {
        edge: "在射前停住时按。",
        came: "射了、或忍不住时按。",
        next: "准备好了就继续。",
        paused: "已暂停。按空格或继续。",
        voice: "用浏览器语音朗读台词。",
      },
      endingKinds: {
        allow: "获准",
        ruin: "废射",
        deny: "被拒绝",
        oops: "提前",
      },
    },
    howTo: {
      title: "怎么玩",
      steps: [
        {
          title: "选一个故事",
          body: "看看对象、强度和标签，选一个适合你的。每个故事都标了大概时长和结局数。",
        },
        {
          title: "跟着场景走",
          body: "故事会给你指令和台词。照着做，在射前停住时按「快到了」。",
        },
        {
          title: "结局由你决定",
          body: "有的故事数你停住的次数，有的让你自己选，有的最后一定让你射。提前射会走向另一个结局。",
        },
      ],
    },
    faq: {
      title: "常见问题",
      items: [
        {
          q: "故事有配音吗？",
          a: "可以打开「语音」，用浏览器朗读台词。不会下载任何音频。",
        },
        {
          q: "进度会被保存吗？",
          a: "不会。故事只在当前标签页里运行，不会存到服务器。",
        },
        {
          q: "可以中途停吗？",
          a: "可以。随时按退出。你始终有控制权，疼痛或不适就停止。",
        },
      ],
    },
    disclaimer:
      "如果疼痛或不适，请立刻停止。这不是医疗产品。仅限 18 岁以上。",
  },
};
