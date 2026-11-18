export interface ShuttleLevel {
  level: number;
  shuttles: number;
  total: number;
  seconds: number;
  notesPerMin: number;
}

export const SHUTTLE_LEVELS: ShuttleLevel[] = [
  { level: 1, shuttles: 7, total: 7, seconds: 8.47, notesPerMin: 57 },
  { level: 2, shuttles: 8, total: 15, seconds: 8.0, notesPerMin: 60 },
  { level: 3, shuttles: 8, total: 23, seconds: 7.58, notesPerMin: 63 },
  { level: 4, shuttles: 9, total: 32, seconds: 7.2, notesPerMin: 67 },
  { level: 5, shuttles: 9, total: 41, seconds: 6.86, notesPerMin: 70 },
  { level: 6, shuttles: 10, total: 51, seconds: 6.55, notesPerMin: 73 },
  { level: 7, shuttles: 10, total: 61, seconds: 6.26, notesPerMin: 77 },
  { level: 8, shuttles: 11, total: 72, seconds: 6.0, notesPerMin: 80 },
  { level: 9, shuttles: 11, total: 83, seconds: 5.76, notesPerMin: 83 },
  { level: 10, shuttles: 11, total: 94, seconds: 5.54, notesPerMin: 87 },
  { level: 11, shuttles: 12, total: 106, seconds: 5.33, notesPerMin: 90 },
  { level: 12, shuttles: 12, total: 118, seconds: 5.14, notesPerMin: 93 },
  { level: 13, shuttles: 13, total: 131, seconds: 4.97, notesPerMin: 97 },
  { level: 14, shuttles: 13, total: 144, seconds: 4.8, notesPerMin: 100 },
  { level: 15, shuttles: 13, total: 157, seconds: 4.65, notesPerMin: 103 },
  { level: 16, shuttles: 14, total: 171, seconds: 4.5, notesPerMin: 107 },
  { level: 17, shuttles: 14, total: 185, seconds: 4.36, notesPerMin: 110 },
  { level: 18, shuttles: 15, total: 200, seconds: 4.24, notesPerMin: 113 },
  { level: 19, shuttles: 15, total: 215, seconds: 4.11, notesPerMin: 117 },
  { level: 20, shuttles: 16, total: 231, seconds: 4.0, notesPerMin: 120 },
  { level: 21, shuttles: 16, total: 247, seconds: 3.89, notesPerMin: 123 },
];

export const SHUTTLE_MAX = 247;

export interface ShuttleCopy {
  meta: { title: string; description: string };
  eyebrow: string;
  title: string;
  tagline: string;
  lead: string;
  badges: string[];
  labels: {
    gateTitle: string;
    gateBody: string;
    confirm: string;
    under18: string;
    start: string;
    stop: string;
    ready: string;
    level: string;
    shuttles: string;
    total: string;
    best: string;
    noBest: string;
    outbound: string;
    back: string;
    handsOff: string;
    stroke: string;
    withStops: string;
    continuous: string;
    mode: string;
    came: string;
    cameHint: string;
    cameConfirm: string;
    finished: string;
    result: string;
    playAgain: string;
    saved: string;
    disclaimer: string;
    levelsTitle: string;
    levelsIntro: string;
    levelCol: string;
    shuttlesCol: string;
    totalCol: string;
    secondsCol: string;
    notesCol: string;
  };
  howTo: { title: string; steps: { title: string; body: string }[] };
  tips: { title: string; items: { title: string; body: string }[] };
  faq: { title: string; items: { q: string; a: string }[] };
}

export const shuttleCopy: { en: ShuttleCopy; zh: ShuttleCopy } = {
  en: {
    meta: {
      title: "Edging Beep Test",
      description:
        "One stroke per note of a rising and falling scale. The notes speed up every level. How many shuttles can you last?",
    },
    eyebrow: "Edging Beep Test · 18+",
    title: "Edging Beep Test",
    tagline: "An edging test that gets harder as it goes.",
    lead:
      "One stroke per note of the rising scale. Stroke while the notes rise, hands off while they fall. The notes get faster every minute, and it ends when you come. Your record is how many shuttles you lasted.",
    badges: ["Free, no sign-up", "21 levels, 247 shuttles", "Saves your best"],
    labels: {
      gateTitle: "How many shuttles can you last?",
      gateBody:
        "Stop right away if anything hurts or feels off. Not a medical product.",
      confirm: "I'm 18+, let's play",
      under18: "I'm under 18",
      start: "Start",
      stop: "Stop",
      ready: "Get ready",
      level: "Level",
      shuttles: "Shuttles",
      total: "Total",
      best: "Best",
      noBest: "—",
      outbound: "Out",
      back: "Back",
      handsOff: "Hands off",
      stroke: "Stroke",
      withStops: "With stops",
      continuous: "Continuous",
      mode: "Mode",
      came: "I came",
      cameHint: "Tap twice to end the run",
      cameConfirm: "Tap again to finish",
      finished: "Run finished",
      result: "Your record",
      playAgain: "Play again",
      saved: "Saved as your best.",
      disclaimer:
        "Stop right away if anything hurts or feels off. Not a medical product. 18+ only.",
      levelsTitle: "Levels and pace",
      levelsIntro:
        "Each level shortens the gap between notes. One level lasts about a minute.",
      levelCol: "Level",
      shuttlesCol: "Shuttles",
      totalCol: "Total",
      secondsCol: "One shuttle",
      notesCol: "Notes per min",
    },
    howTo: {
      title: "How it works",
      steps: [
        {
          title: "Press Start",
          body: "After 3, 2, 1 the notes begin. The screen stays awake while you play.",
        },
        {
          title: "One stroke per note",
          body: "Eight rising notes are one shuttle out, then eight falling notes are one shuttle back. Each finished shuttle adds one to your count.",
        },
        {
          title: "Hands off on the way back",
          body: "In “With stops”, the screen turns red on the way back. Let go and wait until the notes start rising again.",
        },
        {
          title: "Tap “I came” twice when you come",
          body: "Two taps in a row end the run, and the shuttles you completed become your record.",
        },
      ],
    },
    tips: {
      title: "How to last longer",
      items: [
        {
          title: "Stay loose for the first three levels",
          body: "It starts at about 60 notes a minute. Grip hard here and you won't see the later levels.",
        },
        {
          title: "Let go completely on the way back",
          body: "Resting your hand or toy there isn't a break. While it's red, let go and breathe out.",
        },
        {
          title: "Before it gets sore",
          body: "More shuttles means more friction. Use lube if you get dry and stop if anything hurts.",
        },
      ],
    },
    faq: {
      title: "Frequently Asked Questions",
      items: [
        {
          q: "What is the Edging Beep Test?",
          a: "It borrows the school beep test: notes speed up every level and you keep pace. Here you do one stroke or touch per note instead of running.",
        },
        {
          q: "What counts as a shuttle?",
          a: "One leg of eight notes. The rising leg is out, the falling leg is back. Each completed leg adds one.",
        },
        {
          q: "What does “With stops” change?",
          a: "On the falling leg the screen turns red and you let go completely until the notes rise again. Continuous mode keeps stroking both ways.",
        },
      ],
    },
  },
  zh: {
    meta: {
      title: "寸止折返跑",
      description:
        "跟着上下行的音阶，每个音动一下。每一级节拍都会加快，看你能撑过多少趟。",
    },
    eyebrow: "寸止折返跑 · 18+",
    title: "寸止折返跑",
    tagline: "一级比一级快的寸止测试。",
    lead:
      "跟着上行的音阶，每个音动一下。音阶上行时动手，下行时停手。每分钟节拍都会加快，射了就结束。完成多少趟就是你的纪录。",
    badges: ["免费·无需注册", "21 级 · 247 趟", "自动保存最佳"],
    labels: {
      gateTitle: "你能撑过多少趟？",
      gateBody: "如果疼痛或不适，请立刻停止。这不是医疗产品。",
      confirm: "我已满 18 岁，开始",
      under18: "我未满 18 岁",
      start: "开始",
      stop: "停止",
      ready: "准备",
      level: "等级",
      shuttles: "趟数",
      total: "累计",
      best: "最佳",
      noBest: "—",
      outbound: "去程",
      back: "回程",
      handsOff: "停手",
      stroke: "动手",
      withStops: "回程停手",
      continuous: "连续",
      mode: "模式",
      came: "射了",
      cameHint: "连点两次结束",
      cameConfirm: "再点一次结束",
      finished: "本轮结束",
      result: "你的纪录",
      playAgain: "再来一次",
      saved: "已保存为最佳纪录。",
      disclaimer:
        "如果疼痛或不适，请立刻停止。这不是医疗产品。仅限 18 岁以上。",
      levelsTitle: "等级与节拍",
      levelsIntro: "每一级都会缩短音符之间的间隔，一级大约一分钟。",
      levelCol: "等级",
      shuttlesCol: "趟数",
      totalCol: "累计",
      secondsCol: "单趟",
      notesCol: "每分钟音符",
    },
    howTo: {
      title: "怎么玩",
      steps: [
        {
          title: "按开始",
          body: "3、2、1 之后音符开始。游戏过程中屏幕会保持常亮。",
        },
        {
          title: "每个音动一下",
          body: "八个上行音是去程一趟，八个下行音是回程一趟。每完成一趟，计数加一。",
        },
        {
          title: "回程停手",
          body: "在「回程停手」模式下，回程时屏幕变红，完全放开，等音阶再次上行。",
        },
        {
          title: "射的时候连点两次「射了」",
          body: "连续两次点击结束本轮，已完成的趟数就是你的纪录。",
        },
      ],
    },
    tips: {
      title: "撑更久的窍门",
      items: [
        {
          title: "前三级放松",
          body: "一开始大约每分钟 60 个音。这里就用力，后面几级根本撑不到。",
        },
        {
          title: "回程完全放开",
          body: "回程时把手或玩具放在那里不算休息。变红时放开，呼气。",
        },
        {
          title: "别等到疼",
          body: "趟数越多摩擦越大。干燥时用润滑，疼痛立刻停止。",
        },
      ],
    },
    faq: {
      title: "常见问题",
      items: [
        {
          q: "寸止折返跑是什么？",
          a: "借用了学校折返跑测试的形式：节拍逐级加快，你要跟上。这里把跑步换成了每个音动一下。",
        },
        {
          q: "一趟怎么算？",
          a: "八个音为一趟。上行是去程，下行是回程，每完成一趟计数加一。",
        },
        {
          q: "「回程停手」有什么不同？",
          a: "回程时屏幕变红，完全放开直到音阶再次上行。连续模式则上下行都保持动作。",
        },
      ],
    },
  },
};
