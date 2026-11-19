export type StreakMode = "full" | "edge" | "porn";
export type SlipTag = "bored" | "stress" | "bed" | "sns" | "alcohol" | "other";
export type UrgePeriod = "night" | "morning" | "afternoon" | "evening";

export interface MilestoneCopy {
  days: number;
  title: string;
}

export interface StreakCopy {
  meta: { title: string; description: string };
  eyebrow: string;
  title: string;
  tagline: string;
  lead: string;
  badges: string[];
  modes: Record<StreakMode, { label: string; description: string }>;
  labels: {
    days: string;
    time: string;
    notStarted: string;
    keptToday: string;
    keptTodayDone: string;
    start: string;
    startedOn: string;
    changeStart: string;
    slip: string;
    slipTitle: string;
    slipPrompt: string;
    slipConfirm: string;
    cancel: string;
    urgeHit: string;
    urgeHint: string;
    urgeActions: string[];
    urgeNow: string;
    urgeDone: string;
    breatheIn: string;
    hold: string;
    breatheOut: string;
    titles: string;
    nothingLogged: string;
    calendar: string;
    kept: string;
    slipped: string;
    stats: string;
    current: string;
    best: string;
    total: string;
    keptThisMonth: string;
    slips: string;
    slipTags: string;
    whenUrges: string;
    saveRestore: string;
    saveNote: string;
    exportJson: string;
    importJson: string;
    deleteAll: string;
    confirmDelete: string;
    imported: string;
    importError: string;
    periods: Record<UrgePeriod, string>;
    slipTagsLabels: Record<SlipTag, string>;
  };
  howTo: { title: string; steps: { title: string; body: string }[] };
  dayByDay: { title: string; intro: string; items: { day: string; title: string; body: string }[] };
  tips: { title: string; items: { title: string; body: string }[] };
  faq: { title: string; items: { q: string; a: string }[] };
  disclaimer: string;
}

const milestonesEn: MilestoneCopy[] = [
  { days: 1, title: "First Step" },
  { days: 3, title: "Past Three Days" },
  { days: 7, title: "The Week Wall" },
  { days: 14, title: "Second Week" },
  { days: 21, title: "Habit Sprout" },
  { days: 30, title: "One Month" },
  { days: 60, title: "Two Months" },
  { days: 90, title: "Ninety Days" },
  { days: 180, title: "Half a Year" },
  { days: 365, title: "One Year" },
];

const milestonesZh: MilestoneCopy[] = [
  { days: 1, title: "第一步" },
  { days: 3, title: "跨过三天" },
  { days: 7, title: "一周之墙" },
  { days: 14, title: "第二周" },
  { days: 21, title: "习惯萌芽" },
  { days: 30, title: "满月" },
  { days: 60, title: "两个月" },
  { days: 90, title: "九十天关口" },
  { days: 180, title: "半年" },
  { days: 365, title: "一年" },
];

export const STREAK_MILESTONES = milestonesEn;

export const streakCopy: { en: StreakCopy; zh: StreakCopy } = {
  en: {
    meta: {
      title: "NoFap Streak Counter",
      description:
        "Count clean days, log slips without resetting your total, and see your milestones. Everything stays in this browser.",
    },
    eyebrow: "Streak Counter · 18+",
    title: "NoFap Streak Counter",
    tagline: "What day you're on, in one tap.",
    lead:
      "A counter for NoFap and abstinence streaks. Tap “Kept it today” once a day and it lands on the calendar; each milestone gives you a title. A slip isn't a reset: pick the trigger, log it and keep going. Your current streak restarts, but your total and best record stay. No app install, no account.",
    badges: [
      "Free",
      "No login",
      "Stored on your device",
      "3 modes",
      "10 titles",
      "90-second urge button",
      "JSON export",
    ],
    modes: {
      full: {
        label: "Full abstinence",
        description: "No orgasm and no masturbation. The strictest mode.",
      },
      edge: {
        label: "No orgasm",
        description:
          "Edging is allowed. As long as you don't come, the day counts.",
      },
      porn: {
        label: "No porn only",
        description: "No porn. Masturbation and orgasm don't count.",
      },
    },
    labels: {
      days: "Days",
      time: "Time",
      notStarted: "Not started yet",
      keptToday: "Kept it today",
      keptTodayDone: "Logged for today",
      start: "Start",
      startedOn: "Started",
      changeStart: "Change start date",
      slip: "I slipped",
      slipTitle: "Log a slip",
      slipPrompt: "What triggered it?",
      slipConfirm: "Log it and keep going",
      cancel: "Cancel",
      urgeHit: "Urge hit",
      urgeHint: "Just 90 seconds · Breathe in / Hold / Breathe out",
      urgeActions: [
        "Stand up and drink a glass of water",
        "Put your phone in another room",
        "Breathe slowly until the peak passes",
      ],
      urgeNow: "Breathe",
      urgeDone: "The peak passed. Keep going.",
      breatheIn: "Breathe in",
      hold: "Hold",
      breatheOut: "Breathe out",
      titles: "Titles",
      nothingLogged: "Nothing logged yet",
      calendar: "Calendar",
      kept: "Kept",
      slipped: "Slipped",
      stats: "Stats",
      current: "Current",
      best: "Best",
      total: "Total",
      keptThisMonth: "Kept this month",
      slips: "Slips",
      slipTags: "Slip triggers",
      whenUrges: "When urges hit",
      saveRestore: "Save and restore",
      saveNote:
        "Your log lives only in this browser. Export it as JSON to load it on another device.",
      exportJson: "Export (JSON)",
      importJson: "Import",
      deleteAll: "Delete everything",
      confirmDelete: "Delete all streak data on this device?",
      imported: "Imported.",
      importError: "That file could not be read.",
      periods: {
        night: "0–6",
        morning: "6–12",
        afternoon: "12–18",
        evening: "18–24",
      },
      slipTagsLabels: {
        bored: "Boredom",
        stress: "Stress",
        bed: "Bed",
        sns: "Social media",
        alcohol: "Alcohol",
        other: "Other",
      },
    },
    howTo: {
      title: "How to use",
      steps: [
        {
          title: "Pick a mode",
          body: "Full abstinence, no orgasm, or no porn only. You can change it later.",
        },
        {
          title: "Start",
          body: "Counting begins from the moment you press it. Already on a streak? Move the start date back.",
        },
        {
          title: "Tap “Kept it today” daily",
          body: "One tap puts it on the calendar. Even if you forget, the streak keeps counting from the start date.",
        },
        {
          title: "Red button when an urge hits",
          body: "90 seconds of breathing and three things you can do right now. Each press is saved to “when urges hit”.",
        },
      ],
    },
    dayByDay: {
      title: "What people say happens, day by day",
      intro:
        "A summary of what people commonly report. It doesn't promise any medical effect, and the research is still thin.",
      items: [
        { day: "1", title: "First Step", body: "The most common reaction: “nothing much happened.” The point is to log the day you decided." },
        { day: "3", title: "Past Three Days", body: "The day most often described as the hardest. The peak of urges tends to land here." },
        { day: "7", title: "The Week Wall", body: "Many report their skin or sleep “feels different.” The famous day-7 testosterone study was retracted in 2021." },
        { day: "30", title: "One Month", body: "The milestone where people most often report steadier focus, sleep and confidence." },
        { day: "90", title: "Ninety Days", body: "A common marker in online communities. Many report feeling back to normal, but research is still thin." },
      ],
    },
    tips: {
      title: "Tips",
      items: [
        { title: "Plan the hour before bed", body: "“Bed” is the most common trigger. Decide where your phone goes before you lie down." },
        { title: "Use the tags", body: "Pick a tag when you slip. The stats show which situation catches you most often." },
        { title: "Watch the total, not only the streak", body: "A break resets the streak but not your total or best. Log it and continue." },
        { title: "Urges peak and pass", body: "Most people say a strong urge fades within minutes. Use the 90-second button to ride it out." },
      ],
    },
    faq: {
      title: "Frequently Asked Questions",
      items: [
        { q: "Does a wet dream count as a slip?", a: "No. The counter only tracks things you decide to do. You don't need to log a wet dream." },
        { q: "Is the day-7 testosterone claim true?", a: "The 2003 study behind it was retracted in 2021. A small 10-person study found higher testosterone after three weeks, but there is no reliable evidence for day 7 specifically." },
        { q: "Where is my log stored?", a: "Only in this browser on this device. Nothing is sent to a server. Export JSON to move it." },
        { q: "What happens after a slip?", a: "Press “I slipped”, pick a trigger, and the current streak restarts. Your total and best record stay." },
      ],
    },
    disclaimer:
      "This page is a tracking tool, not medical care or treatment. If you have health concerns, talk to a clinician. The log stays on your device. 18+ only.",
  },
  zh: {
    meta: {
      title: "戒色计数器",
      description:
        "记录戒色天数、破戒诱因与累计纪录。所有记录只保存在这台设备的浏览器里。",
    },
    eyebrow: "戒色计数器 · 18+",
    title: "戒色计数器",
    tagline: "今天第几天，一键就知道。",
    lead:
      "数戒色天数的计数器。每天点一下「今天守住了」就记进日历，每到一个关口有称号。破戒那天不是清零，而是选个诱因记下来继续。连续天数断了，累计和最长纪录还在。不用装 App，不用登录。",
    badges: [
      "免费",
      "无需登录",
      "只存在设备里",
      "3 种模式",
      "10 级称号",
      "90 秒紧急按钮",
      "JSON 导出",
    ],
    modes: {
      full: { label: "完全禁欲", description: "不射精也不自慰。最严格的模式。" },
      edge: {
        label: "只禁射精",
        description: "忍精（边缘）可以。只要不射就算守住。",
      },
      porn: { label: "只禁色情", description: "不看色情内容。自慰和射精不计。" },
    },
    labels: {
      days: "天",
      time: "时间",
      notStarted: "还没开始",
      keptToday: "今天守住了",
      keptTodayDone: "今天已记录",
      start: "开始",
      startedOn: "开始于",
      changeStart: "修改开始日期",
      slip: "破戒了",
      slipTitle: "记录一次破戒",
      slipPrompt: "诱因是什么？",
      slipConfirm: "记下来，继续",
      cancel: "取消",
      urgeHit: "冲动来了",
      urgeHint: "只要 90 秒 · 吸气 / 屏住 / 呼气",
      urgeActions: [
        "站起来喝一杯水",
        "把手机放到另一个房间",
        "慢慢呼吸，等峰值过去",
      ],
      urgeNow: "呼吸",
      urgeDone: "峰值过去了，继续。",
      breatheIn: "吸气",
      hold: "屏住",
      breatheOut: "呼气",
      titles: "称号",
      nothingLogged: "还没有记录",
      calendar: "日历",
      kept: "守住",
      slipped: "破戒",
      stats: "统计",
      current: "当前",
      best: "最长",
      total: "累计",
      keptThisMonth: "本月守住天数",
      slips: "破戒次数",
      slipTags: "破戒原因",
      whenUrges: "冲动高发时段",
      saveRestore: "保存与恢复",
      saveNote: "记录只存在这台设备的浏览器里。导出为 JSON 后可在其他设备导入。",
      exportJson: "导出（JSON）",
      importJson: "导入",
      deleteAll: "全部删除",
      confirmDelete: "确定删除这台设备上的全部戒色记录？",
      imported: "已导入。",
      importError: "无法读取该文件。",
      periods: { night: "0–6", morning: "6–12", afternoon: "12–18", evening: "18–24" },
      slipTagsLabels: {
        bored: "无聊",
        stress: "压力",
        bed: "睡前",
        sns: "社交软件",
        alcohol: "喝酒",
        other: "其他",
      },
    },
    howTo: {
      title: "怎么用",
      steps: [
        { title: "选模式", body: "完全禁欲、只禁射精、只禁色情。之后可以改。" },
        { title: "开始", body: "从按下的那一刻开始数。已经在坚持的人可以把开始日往前调。" },
        { title: "每天点「今天守住了」", body: "一键记进日历。忘了点也没关系，连续天数从开始日自动计算。" },
        { title: "冲动来了按红色按钮", body: "90 秒呼吸加三件马上能做的事。按下的时间会积累成「冲动高发时段」。" },
      ],
    },
    dayByDay: {
      title: "各个天数常被提到的变化",
      intro: "这是对经验谈里常见说法的整理，不承诺任何医学效果。",
      items: [
        { day: "1", title: "第一步", body: "最常见的感受是「意外地什么都没发生」。目的是记下你下决心的这一天。" },
        { day: "3", title: "跨过三天", body: "经验谈里被说成「最难熬」最多的一天。冲动的高峰常常在这里。" },
        { day: "7", title: "一周之墙", body: "很多人说皮肤和睡眠好像变了。著名的「第 7 天睾酮升高」论文已于 2021 年被撤回。" },
        { day: "30", title: "满月", body: "最常被报告「专注、睡眠、自信稳定下来」的关口。" },
        { day: "90", title: "九十天关口", body: "海外社区常用的分界线。很多人说感觉恢复正常，但研究仍然很少。" },
      ],
    },
    tips: {
      title: "坚持的窍门",
      items: [
        { title: "定好睡前的安排", body: "破戒原因里最多的是「睡前」。躺下之前先决定手机放哪。" },
        { title: "用标签认识诱因", body: "破戒那天只需选个标签，统计里会出现原因占比。" },
        { title: "看累计，不只看连续", body: "连续断了，累计和最长还在。记下来继续，才是长久之道。" },
        { title: "冲动会过峰", body: "很多经验谈说强烈的冲动几分钟就退。用 90 秒按钮熬过峰值。" },
      ],
    },
    faq: {
      title: "常见问题",
      items: [
        { q: "遗精算破戒吗？", a: "不算。这个计数器只数你自己决定去做的行为。" },
        { q: "戒色第 7 天睾酮会升高是真的吗？", a: "作为依据的 2003 年研究已于 2021 年被期刊撤回。目前没有可靠依据说明第 7 天会升高。" },
        { q: "记录存在哪里？", a: "只存在这台设备的浏览器里，不会发送到服务器。导出 JSON 即可在其他设备导入。" },
        { q: "破戒了怎么办？", a: "按「破戒了」选个诱因。连续天数归零，但累计和最长纪录保留。" },
      ],
    },
    disclaimer:
      "本页面是记录戒色天数的工具，不是医疗行为或治疗。如对身体状况有担忧，请咨询医疗机构。记录只保存在设备里。仅限 18 岁以上。",
  },
};

export const STREAK_TITLES: Record<"en" | "zh", MilestoneCopy[]> = {
  en: milestonesEn,
  zh: milestonesZh,
};
