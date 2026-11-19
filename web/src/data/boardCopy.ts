export type BoardEdition = "men" | "women" | "gay" | "lesbian";
export type BoardLength = 50 | 100;

export type SquareKind =
  | "start"
  | "task"
  | "edge"
  | "rest"
  | "tough"
  | "rule"
  | "snake"
  | "ladder"
  | "temptation"
  | "card"
  | "back"
  | "finish";

export type CommandKind =
  | "task"
  | "edge"
  | "rest"
  | "tough"
  | "rule"
  | "temptation"
  | "ladder"
  | "snake"
  | "back";

export interface BoardCard {
  text: string;
  move?: number;
  fail?: number;
}

export interface BoardCopy {
  meta: { title: string; description: string };
  eyebrow: string;
  title: string;
  tagline: string;
  lead: string;
  badges: string[];
  settings: {
    edition: string;
    men: string;
    women: string;
    gay: string;
    lesbian: string;
    length: string;
    squares50: string;
    squares100: string;
    restart: string;
  };
  legend: Record<SquareKind, string>;
  squareDescriptions: Record<Exclude<SquareKind, "start" | "finish">, string>;
  actions: {
    roll: string;
    rolling: string;
    done: string;
    failed: string;
    couldnt: string;
    passed: string;
    held: string;
    continue: string;
    apply: string;
    close: string;
    rollVerdict: string;
  };
  status: {
    position: string;
    fails: string;
    bounces: string;
    rule: string;
    ruleLeft: string;
    noRule: string;
    target: string;
  };
  prompts: {
    ladder: string;
    snake: string;
    back: string;
    card: string;
    command: string;
    landed: string;
  };
  verdict: {
    title: string;
    fails: string;
    mayCum: string;
    dieDecides: string;
    ruined: string;
    denied: string;
    verdictDie: string;
    even: string;
    odd: string;
    finished: string;
    playAgain: string;
  };
  commands: Record<CommandKind, string[]>;
  cards: BoardCard[];
  howTo: { title: string; steps: { title: string; body: string }[] };
  squares: { title: string; intro: string };
  verdictTable: {
    title: string;
    intro: string;
    headers: { fails: string; result: string; range50: string; range100: string };
    rows: { result: string; range50: string; range100: string }[];
  };
  faq: { title: string; items: { q: string; a: string }[] };
  disclaimer: string;
}

const en: BoardCopy = {
  meta: {
    title: "Edges & Ladders",
    description:
      "Roll the dice, land on a square and follow its command. Ladders lift you, snakes drop you, and the finish decides your verdict.",
  },
  eyebrow: "Edging Board Game · 18+",
  title: "Edges & Ladders",
  tagline: "Do what your square says",
  lead:
    "Start on square 1 and climb to the top. Roll the die and do whatever the square you land on tells you. Ladders take you up, snakes drop you down, and one big snake sends you all the way back to Start. You can see the whole board before you roll. How many times you failed by the Finish decides whether you get to cum tonight.",
  badges: ["Free · no sign-up", "For men · for women", "4 editions", "New board every day"],
  settings: {
    edition: "Edition",
    men: "Men",
    women: "Women",
    gay: "Gay",
    lesbian: "Lesbian",
    length: "Board",
    squares50: "50 squares",
    squares100: "100 squares",
    restart: "Restart",
  },
  legend: {
    start: "Start",
    task: "Task",
    edge: "Edge",
    rest: "Rest",
    tough: "Tough",
    rule: "Rule",
    snake: "Snake",
    ladder: "Ladder",
    temptation: "Temptation",
    card: "Card",
    back: "Back to Start",
    finish: "Finish",
  },
  squareDescriptions: {
    task: "Do one command",
    edge: "Get right to the edge, then stop. Can't? Slide back 2",
    rest: "Hands off. Calm down",
    tough: "A tough command. Can't do it? Slide back 3",
    rule: "A rule for your next 3 rolls",
    snake: "Do a short command, then slide down to its tail",
    ladder: "Take its challenge to climb it. Pass and you stay",
    temptation: "One extra, harder edge. Hold it and climb 2",
    card: "Draw a Card. It tells you what happens",
    back: "Hold one edge to stay. Can't? All the way back to Start",
  },
  actions: {
    roll: "Roll the die",
    rolling: "Rolling…",
    done: "Done",
    failed: "Couldn't do it",
    couldnt: "Couldn't",
    passed: "Passed",
    held: "Held it",
    continue: "Continue",
    apply: "Apply",
    close: "Close",
    rollVerdict: "Roll the verdict die",
  },
  status: {
    position: "Square",
    fails: "Fails",
    bounces: "Bounces",
    rule: "Rule",
    ruleLeft: "rolls left",
    noRule: "None",
    target: "Target",
  },
  prompts: {
    ladder: "Ladder challenge",
    snake: "Snake",
    back: "Back to Start",
    card: "Card",
    command: "Your command",
    landed: "You landed on",
  },
  verdict: {
    title: "Tonight's verdict",
    fails: "Fails",
    mayCum: "You may cum",
    dieDecides: "Let the die decide",
    ruined: "Ruined orgasm only",
    denied: "Denied tonight",
    verdictDie: "Even: you may cum. Odd: denied.",
    even: "Even — you may cum.",
    odd: "Odd — denied tonight.",
    finished: "You reached the Finish",
    playAgain: "Play again",
  },
  commands: {
    task: [
      "Slow strokes, one per two seconds, for 30 seconds.",
      "Stroke at a steady pace and stop the moment you feel close.",
      "Ten slow strokes, then hands off for 15 seconds.",
      "Use only two fingers for the next 20 strokes.",
      "Stroke to the edge, hold for 5 seconds, then stop.",
      "Close your eyes and keep the same rhythm for 30 seconds.",
      "One stroke per second for 20 seconds, no faster.",
      "Switch hands for the next 15 strokes.",
    ],
    edge: [
      "Get right to the edge and stop. Hold there for 10 seconds.",
      "Edge once, then wait 20 seconds before moving.",
      "Bring yourself to the edge twice in a row, stopping each time.",
      "Edge and hold for 15 seconds without moving.",
      "Stop one stroke before the edge, then resume.",
      "Hold at the edge until the count of 8, then let go.",
    ],
    rest: [
      "Hands off for 30 seconds. Breathe slowly.",
      "Let go and relax your legs for 20 seconds.",
      "Hands off until the next roll. Don't touch.",
      "Stand up, stretch, and come back.",
      "Breathe in for 4, hold 4, out for 6. Twice.",
    ],
    tough: [
      "Fast strokes for 20 seconds without stopping.",
      "Edge three times, 10 seconds apart.",
      "Keep a fast pace for 30 seconds, then stop abruptly.",
      "Use lube and 30 quick strokes.",
      "Hold the edge for 20 seconds.",
      "Twenty strokes with a firm grip, then hands off.",
    ],
    rule: [
      "For the next 3 rolls: no fast strokes.",
      "For the next 3 rolls: one hand only.",
      "For the next 3 rolls: stay silent.",
      "For the next 3 rolls: keep your eyes closed.",
      "For the next 3 rolls: slow strokes only.",
      "For the next 3 rolls: no stopping until the square says so.",
      "For the next 3 rolls: keep both feet on the floor.",
      "For the next 3 rolls: no lube.",
    ],
    temptation: [
      "One extra hard edge. Hold 10 seconds, then climb 2.",
      "Fast strokes for 15 seconds, then climb 2 if you didn't stop.",
      "Edge and hold; climb 2 if you last 15 seconds.",
      "Ten quick strokes without stopping, then climb 2.",
      "Hold the edge for 10 seconds. Climb 2 if you manage.",
      "One more edge, then climb 2 if you hold it.",
    ],
    ladder: [
      "Thirty slow strokes without stopping.",
      "Hold the edge for 10 seconds.",
      "Twenty strokes at a steady pace.",
      "Ten strokes, then 10 seconds off, then ten more.",
      "Keep a slow rhythm for 30 seconds.",
      "Edge once, wait 5 seconds, then continue.",
    ],
    snake: [
      "Five slow strokes, then slide down.",
      "One edge, then down you go.",
      "Hands off for 10 seconds, then slide.",
      "Ten quick strokes, then slide down.",
      "Hold still for 10 seconds, then slide.",
      "One slow stroke per second for 10 seconds, then slide.",
    ],
    back: [
      "Hold one edge for 10 seconds to stay on the board.",
      "Edge and hold for 10 seconds. If you let go, you start over.",
      "One long edge, no movement, for 10 seconds.",
    ],
  },
  cards: [
    { text: "Shortcut: climb 3 squares.", move: 3 },
    { text: "Slippery: slide back 2 squares.", move: -2 },
    { text: "Extra edge: hold 10 seconds. No move." },
    { text: "Penalty: slide back 3 and count a fail.", move: -3, fail: 1 },
    { text: "Lucky break: climb 2 and keep your fails.", move: 2 },
    { text: "Rest card: hands off 20 seconds, stay put." },
    { text: "Temptation: edge once, then climb 2.", move: 2 },
    { text: "Setback: slide back 1 square.", move: -1 },
  ],
  howTo: {
    title: "How to play",
    steps: [
      {
        title: "Hit Start and play",
        body: "Roll the die, move along the board and do what the square says. Change edition or board length whenever you like. Your settings stay on this device.",
      },
      {
        title: "Roll, then do what the square says",
        body: "Climb from square 1 to the top, row by row. You can see the whole board before you roll.",
      },
      {
        title: "Ladders, snakes and Back to Start",
        body: "Land at the foot of a ladder and take its challenge to climb it. Land on a snake's head, do a short command, and slide down to its tail. The big Back to Start snake lets you stay only if you hold one edge.",
      },
      {
        title: "Land exactly on the Finish",
        body: "Roll too high and you bounce back from the Finish. After 3 bounces, any roll gets you there.",
      },
      {
        title: "Fail a command and slide back",
        body: "Can't do a command or break a rule, and you slide back 2 spaces (3 on a Tough square). It counts as a fail. Fewer fails means a better verdict.",
      },
    ],
  },
  squares: {
    title: "The squares",
    intro:
      "Each square has a type. The board is visible before you roll, so you can plan around ladders and snakes.",
  },
  verdictTable: {
    title: "How the verdict works",
    intro:
      "The number of fails at the Finish decides the ending. On a 100-square board the allowances are doubled.",
    headers: { fails: "Fails", result: "Result", range50: "50 squares", range100: "100 squares" },
    rows: [
      { result: "You may cum", range50: "0", range100: "0" },
      { result: "Let the die decide", range50: "1–3", range100: "1–6" },
      { result: "Ruined orgasm only", range50: "4–6", range100: "7–12" },
      { result: "Denied tonight", range50: "7+", range100: "13+" },
    ],
  },
  faq: {
    title: "Frequently Asked Questions",
    items: [
      {
        q: "Do I need to sign up or pay?",
        a: "Neither. Open the page and play. It's all free.",
      },
      {
        q: "Is my data sent anywhere?",
        a: "No. Your settings stay in this browser and no game data is uploaded.",
      },
      {
        q: "What happens if I can't do a command?",
        a: "Press “Couldn't do it”. You slide back 2 squares (3 on a Tough square) and it counts as a fail.",
      },
    ],
  },
  disclaimer:
    "Stop right away if anything hurts or feels off. Not a medical product. 18+ only.",
};

const zh: BoardCopy = {
  meta: {
    title: "寸止飞行棋",
    description:
      "掷骰子，停在哪一格就按那一格的指令做。梯子往上爬，蛇往下滑，终点决定今晚的结局。",
  },
  eyebrow: "寸止飞行棋 · 18+",
  title: "寸止飞行棋",
  tagline: "掷到哪格，就做哪格",
  lead:
    "从第 1 格出发，一路爬到终点。掷骰子，停在哪一格，就按那一格的指令做。梯子带你往上，蛇把你往下拖，还有一条大蛇直接送回起点。掷之前整张棋盘都能看到。到终点时失败了几次，决定今晚能不能射。",
  badges: ["免费·无需注册", "男生版·女生版", "四种版本", "每天新棋盘"],
  settings: {
    edition: "版本",
    men: "男生",
    women: "女生",
    gay: "男同",
    lesbian: "女同",
    length: "棋盘",
    squares50: "50 格",
    squares100: "100 格",
    restart: "重新开始",
  },
  legend: {
    start: "起点",
    task: "任务",
    edge: "边缘",
    rest: "休息",
    tough: "困难",
    rule: "规则",
    snake: "蛇",
    ladder: "梯子",
    temptation: "诱惑",
    card: "抽卡",
    back: "回起点",
    finish: "终点",
  },
  squareDescriptions: {
    task: "做一个指令",
    edge: "动到边缘再停。做不到后退 2 格",
    rest: "停手，冷静一下",
    tough: "困难指令。做不到后退 3 格",
    rule: "接下来 3 次掷骰的规则",
    snake: "做个短指令，然后滑到蛇尾",
    ladder: "接受挑战才能爬上。通过就留在上面",
    temptation: "额外一次更难的边缘。忍住就前进 2 格",
    card: "抽一张卡，按卡上的指示做",
    back: "忍住一次边缘才能留下。做不到就回起点",
  },
  actions: {
    roll: "掷骰子",
    rolling: "滚动中…",
    done: "做到了",
    failed: "做不到",
    couldnt: "做不到",
    passed: "通过了",
    held: "忍住了",
    continue: "继续",
    apply: "执行",
    close: "关闭",
    rollVerdict: "掷结局骰",
  },
  status: {
    position: "位置",
    fails: "失败",
    bounces: "弹回",
    rule: "规则",
    ruleLeft: "次掷骰后失效",
    noRule: "无",
    target: "目标",
  },
  prompts: {
    ladder: "梯子挑战",
    snake: "蛇",
    back: "回起点",
    card: "卡片",
    command: "你的指令",
    landed: "你停在了",
  },
  verdict: {
    title: "今晚的结局",
    fails: "失败次数",
    mayCum: "可以射",
    dieDecides: "让骰子决定",
    ruined: "只能射得不上不下",
    denied: "今晚不许射",
    verdictDie: "偶数：可以射。奇数：不许射。",
    even: "偶数——可以射。",
    odd: "奇数——今晚不许射。",
    finished: "你到达了终点",
    playAgain: "再玩一次",
  },
  commands: {
    task: [
      "每两秒动一下，慢速 30 秒。",
      "匀速动，感觉快到时立刻停。",
      "慢速 10 下，然后停手 15 秒。",
      "接下来 20 下只用两根手指。",
      "动到边缘，停 5 秒，然后放开。",
      "闭上眼睛，保持同样节奏 30 秒。",
      "每秒一下，持续 20 秒，不许加快。",
      "换一只手，完成接下来 15 下。",
    ],
    edge: [
      "动到边缘再停，保持 10 秒。",
      "边缘一次，然后等 20 秒再动。",
      "连续两次到边缘，每次都要停住。",
      "到边缘后保持 15 秒不动。",
      "在离边缘一下的地方停住，再继续。",
      "到边缘后数到 8 再放开。",
    ],
    rest: [
      "停手 30 秒，慢慢呼吸。",
      "放开，放松双腿 20 秒。",
      "停手，等下一次掷骰，别碰。",
      "站起来伸展一下再回来。",
      "吸气 4 秒、屏住 4 秒、呼气 6 秒，做两轮。",
    ],
    tough: [
      "快速动 20 秒，中途不许停。",
      "边缘三次，每次间隔 10 秒。",
      "快速 30 秒，然后突然停住。",
      "用润滑，快速 30 下。",
      "在边缘保持 20 秒。",
      "用力握紧动 20 下，然后停手。",
    ],
    rule: [
      "接下来 3 次掷骰：不许快速。",
      "接下来 3 次掷骰：只能用一只手。",
      "接下来 3 次掷骰：不许出声。",
      "接下来 3 次掷骰：闭着眼睛。",
      "接下来 3 次掷骰：只能慢速。",
      "接下来 3 次掷骰：格子没说停就不许停。",
      "接下来 3 次掷骰：双脚不能离地。",
      "接下来 3 次掷骰：不许用润滑。",
    ],
    temptation: [
      "额外一次更难的边缘，保持 10 秒，然后前进 2 格。",
      "快速 15 秒，没停就前进 2 格。",
      "到边缘保持，撑过 15 秒就前进 2 格。",
      "不停顿快速 10 下，然后前进 2 格。",
      "在边缘保持 10 秒，做到就前进 2 格。",
      "再来一次边缘，忍住就前进 2 格。",
    ],
    ladder: [
      "慢速 30 下，中间不许停。",
      "在边缘保持 10 秒。",
      "匀速 20 下。",
      "10 下，停 10 秒，再来 10 下。",
      "慢节奏保持 30 秒。",
      "边缘一次，等 5 秒再继续。",
    ],
    snake: [
      "慢速 5 下，然后滑下去。",
      "边缘一次，然后滑下去。",
      "停手 10 秒，然后滑下去。",
      "快速 10 下，然后滑下去。",
      "保持不动 10 秒，然后滑下去。",
      "每秒一下慢速动 10 秒，然后滑下去。",
    ],
    back: [
      "在边缘保持 10 秒，就能留在棋盘上。",
      "到边缘保持 10 秒。放开就回起点。",
      "一次长时间边缘，10 秒内不许动。",
    ],
  },
  cards: [
    { text: "捷径：前进 3 格。", move: 3 },
    { text: "打滑：后退 2 格。", move: -2 },
    { text: "额外边缘：保持 10 秒，不移动。" },
    { text: "惩罚：后退 3 格，并记一次失败。", move: -3, fail: 1 },
    { text: "好运：前进 2 格，失败次数不变。", move: 2 },
    { text: "休息卡：停手 20 秒，原地不动。" },
    { text: "诱惑：边缘一次，然后前进 2 格。", move: 2 },
    { text: "挫折：后退 1 格。", move: -1 },
  ],
  howTo: {
    title: "怎么玩",
    steps: [
      {
        title: "按开始就玩",
        body: "掷骰子、沿棋盘前进，按停下的格子做。版本和棋盘长度随时能改，设置存在这台设备里。",
      },
      {
        title: "先掷，再做格子上的指令",
        body: "从第 1 格一格一格爬到终点。掷之前整张棋盘都能看到。",
      },
      {
        title: "梯子、蛇和回起点",
        body: "停在梯子底部，通过挑战才能爬上去。停在蛇头，做个短指令，然后滑到蛇尾。大蛇「回起点」只有忍住一次边缘才能留下。",
      },
      {
        title: "必须刚好停在终点",
        body: "掷多了会从终点弹回来。弹回 3 次之后，掷多少都算到达。",
      },
      {
        title: "做不到就后退",
        body: "做不到指令或违反规则，后退 2 格（困难格后退 3 格），并记一次失败。失败越少，结局越好。",
      },
    ],
  },
  squares: {
    title: "格子类型",
    intro: "每个格子都有类型。掷之前就能看到整张棋盘，可以提前规划梯子和蛇。",
  },
  verdictTable: {
    title: "结局怎么算",
    intro: "到达终点时的失败次数决定结局。100 格棋盘的容许多一倍。",
    headers: { fails: "失败次数", result: "结局", range50: "50 格", range100: "100 格" },
    rows: [
      { result: "可以射", range50: "0", range100: "0" },
      { result: "让骰子决定", range50: "1–3", range100: "1–6" },
      { result: "只能射得不上不下", range50: "4–6", range100: "7–12" },
      { result: "今晚不许射", range50: "7+", range100: "13+" },
    ],
  },
  faq: {
    title: "常见问题",
    items: [
      {
        q: "需要注册或付费吗？",
        a: "都不用。打开页面就能玩，全部免费。",
      },
      {
        q: "我的数据会被上传吗？",
        a: "不会。设置只存在这个浏览器里，游戏数据不上传。",
      },
      {
        q: "做不到指令怎么办？",
        a: "点「做不到」。后退 2 格（困难格后退 3 格），并记一次失败。",
      },
    ],
  },
  disclaimer:
    "如果疼痛或不适，请立刻停止。这不是医疗产品。仅限 18 岁以上。",
};

export const boardCopy: { en: BoardCopy; zh: BoardCopy } = { en, zh };
