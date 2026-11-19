import type { AgeBand, Rank } from "@/lib/stats";

export interface RankTableRow {
  rank: Rank;
  label: string;
  detail: string;
}

export interface CopyStep {
  title: string;
  body: string;
}

export interface CopyFaq {
  q: string;
  a: string;
}

export interface SizeCopy {
  meta: { title: string; description: string };
  eyebrow: string;
  title: string;
  tagline: string;
  lead: string;
  badges: string[];
  form: {
    stateLabel: string;
    erect: string;
    flaccid: string;
    unitLabel: string;
    cm: string;
    inch: string;
    length: string;
    girth: string;
    diameter: string;
    rangeHint: string;
    empty: string;
  };
  result: {
    eyebrow: string;
    rank: string;
    top: string;
    bottom: string;
    oneIn: string;
    score: string;
    length: string;
    girth: string;
  };
  rankNames: Record<Rank, string>;
  rankTable: { title: string; intro: string; rows: RankTableRow[] };
  howTo: { title: string; steps: CopyStep[] };
  data: { title: string; paragraphs: string[] };
  faq: { title: string; items: CopyFaq[] };
  disclaimer: string;
}

export interface StaminaCopy {
  meta: { title: string; description: string };
  eyebrow: string;
  title: string;
  tagline: string;
  lead: string;
  badges: string[];
  form: {
    label: string;
    min: string;
    sec: string;
    hint: string;
    range: string;
    empty: string;
  };
  result: {
    eyebrow: string;
    rank: string;
    top: string;
    bottom: string;
    oneIn: string;
    score: string;
    time: string;
  };
  rankNames: Record<Rank, string>;
  rankTable: { title: string; intro: string; rows: RankTableRow[] };
  howTo: { title: string; steps: CopyStep[] };
  data: { title: string; paragraphs: string[] };
  faq: { title: string; items: CopyFaq[] };
  disclaimer: string;
}

export interface PartnersCopy {
  meta: { title: string; description: string };
  eyebrow: string;
  title: string;
  tagline: string;
  lead: string;
  badges: string[];
  form: {
    label: string;
    unit: string;
    hint: string;
    range: string;
    compare: string;
    ages: Record<AgeBand, string>;
    empty: string;
  };
  result: {
    eyebrow: string;
    rank: string;
    top: string;
    bottom: string;
    oneIn: string;
    score: string;
    same: string;
    count: string;
  };
  rankNames: Record<Rank, string>;
  rankTable: { title: string; intro: string; rows: RankTableRow[] };
  howTo: { title: string; steps: CopyStep[] };
  data: { title: string; paragraphs: string[] };
  faq: { title: string; items: CopyFaq[] };
  disclaimer: string;
}

const RANK_ORDER: Rank[] = ["SS", "S", "A", "B+", "B", "C", "D", "E"];

function rankRows(
  labels: Record<Rank, string>,
  details: Record<Rank, string>,
): RankTableRow[] {
  return RANK_ORDER.map((rank) => ({
    rank,
    label: labels[rank],
    detail: details[rank],
  }));
}

const sizeEn: SizeCopy = {
  meta: {
    title: "Penis Size Percentile Checker",
    description:
      "Enter length and girth to see your percentile, rank (SS–E) and 1-in-N against clinician-measured data from 15,521 men.",
  },
  eyebrow: "Tool · 18+",
  title: "Penis Size Percentile Checker",
  tagline: "Your rank, and how many men you'd have to line up to find one like you.",
  lead:
    "Enter length and girth (circumference) and instantly see what top % you fall in, your rank (SS to E) and 1-in-N. The baseline is clinician-measured data from 15,521 men. Everything is calculated on your device.",
  badges: ["Free", "No login", "Calculated on-device, nothing sent", "Sources cited"],
  form: {
    stateLabel: "State",
    erect: "Erect",
    flaccid: "Flaccid",
    unitLabel: "Unit",
    cm: "cm",
    inch: "inch",
    length: "Length",
    girth: "Girth",
    diameter: "Enter diameter",
    rangeHint: "Length 3–30 cm (1.2–11.8 in), girth 3–25 cm (1.2–9.8 in)",
    empty: "Enter length and girth to see your result here",
  },
  result: {
    eyebrow: "Your result",
    rank: "Rank",
    top: "Top {p}%",
    bottom: "Bottom {p}%",
    oneIn: "1 in {n}",
    score: "Score",
    length: "Length",
    girth: "Girth",
  },
  rankNames: {
    SS: "Off the charts",
    S: "Top tier",
    A: "Big",
    "B+": "Above average",
    B: "Dead average",
    C: "A bit below",
    D: "Small",
    E: "Compact",
  },
  rankTable: {
    title: "Rank table",
    intro:
      "Rank comes from where your length and girth combined place you among men. SS is the top 2%, S the top 7%, A the top 16% and B+ the top 31%; B is the middle band.",
    rows: rankRows(
      {
        SS: "Off the charts",
        S: "Top tier",
        A: "Big",
        "B+": "Above average",
        B: "Dead average",
        C: "A bit below",
        D: "Small",
        E: "Compact",
      },
      {
        SS: "Top 2.3%",
        S: "Top 6.7%",
        A: "Top 16%",
        "B+": "Top 31%",
        B: "Top 69%",
        C: "Top 84%",
        D: "Top 93%",
        E: "Bottom 6.7%",
      },
    ),
  },
  howTo: {
    title: "How to measure",
    steps: [
      {
        title: "Length: from the pubic bone on top to the tip",
        body: "Press a ruler lightly against the pubic bone on the upper side and measure straight to the tip. Angling the ruler or pressing hard into fat inflates the number.",
      },
      {
        title: "Girth: circumference at the thickest point",
        body: "Wrap a tape or string around the thickest part and measure it. If you only know the diameter, switch to “Enter diameter” (we multiply by 3.14).",
      },
      {
        title: "Erect means fully hard",
        body: "A half-erection reads small. For flaccid, measure at room temperature, not cold. Measuring a few times and using the middle value is more stable.",
      },
    ],
  },
  data: {
    title: "The data and how to read it",
    paragraphs: [
      "The baseline is the nomograms built by Veale et al. (2015, BJU International) from studies where health professionals measured with a standard procedure: erect length averages 13.12 cm (SD 1.66), erect girth 11.66 cm (1.10), flaccid length 9.16 cm (1.57) and flaccid girth 9.31 cm (0.90) across 15,521 men.",
      "Self-reported surveys run about 1 cm larger. They use inconsistent methods, and smaller men are less likely to answer, so we use measured data only — this may feel stricter than averages you have seen elsewhere.",
      "Your length and girth are each placed on the normal distribution, combined, and turned into a top/bottom percentage, a rank and a 1-in-N figure. The result describes a statistical position, not health or performance.",
    ],
  },
  faq: {
    title: "Frequently Asked Questions",
    items: [
      {
        q: "What is the average size?",
        a: "In the clinician-measured baseline, erect length averages 13.12 cm and girth 11.66 cm; flaccid length averages 9.16 cm and girth 9.31 cm.",
      },
      {
        q: "Should I use erect or flaccid?",
        a: "Use erect. Flaccid size varies a lot with temperature and nerves, so it is only a rough reference.",
      },
      {
        q: "Is the result saved?",
        a: "No. The calculation runs entirely on your device and nothing is sent to a server.",
      },
    ],
  },
  disclaimer:
    "The result shows a statistical position only. It is not a medical diagnosis, and size is not the same thing as sexual satisfaction. 18+ only.",
};

const sizeZh: SizeCopy = {
  meta: {
    title: "阴茎尺寸百分位测试",
    description:
      "输入长度和周长，马上看到百分位、等级（SS–E）和多少人里有一个。基准是医生实测的 15,521 人数据。",
  },
  eyebrow: "Tool · 18+",
  title: "阴茎尺寸百分位测试",
  tagline: "用数字知道自己是多少人里的一个。",
  lead:
    "输入长度和周长，马上知道你排在前百分之几、等级（SS~E）、多少人里有一个。基准是医生实测的 15,521 人数据。全部在你的设备内计算，不上传。",
  badges: ["免费", "无需登录", "设备内计算，不上传", "注明出处"],
  form: {
    stateLabel: "状态",
    erect: "勃起时",
    flaccid: "疲软时",
    unitLabel: "单位",
    cm: "cm",
    inch: "inch",
    length: "长度",
    girth: "周长",
    diameter: "输入直径",
    rangeHint: "长度 3~30cm，周长 3~25cm",
    empty: "输入长度和周长后，结果会显示在这里",
  },
  result: {
    eyebrow: "你的结果",
    rank: "等级",
    top: "前 {p}%",
    bottom: "后 {p}%",
    oneIn: "{n} 人里有一个",
    score: "分数",
    length: "长度",
    girth: "周长",
  },
  rankNames: {
    SS: "规格外",
    S: "顶层",
    A: "偏大",
    "B+": "略偏大",
    B: "正中平均",
    C: "略偏小",
    D: "偏小",
    E: "迷你",
  },
  rankTable: {
    title: "等级表",
    intro:
      "等级由长度和周长综合后你在男人中的位置决定。SS 是前 2%，S 是前 7%，A 是前 16%，B+ 是前 31%，B 是中间段。",
    rows: rankRows(
      {
        SS: "规格外",
        S: "顶层",
        A: "偏大",
        "B+": "略偏大",
        B: "正中平均",
        C: "略偏小",
        D: "偏小",
        E: "迷你",
      },
      {
        SS: "前 2.3%",
        S: "前 6.7%",
        A: "前 16%",
        "B+": "前 31%",
        B: "前 69%",
        C: "前 84%",
        D: "前 93%",
        E: "后 6.7%",
      },
    ),
  },
  howTo: {
    title: "测量方法",
    steps: [
      {
        title: "长度：从上侧根部到顶端",
        body: "把尺子轻抵耻骨，量到顶端的直线距离。斜着量或用力压进脂肪会偏长。",
      },
      {
        title: "周长：最粗处绕一圈",
        body: "用软尺或绳子绕最粗处一圈再量。只知道直径的话，切换到“输入直径”（×3.14 换算为周长）。",
      },
      {
        title: "勃起时要完全硬",
        body: "半硬状态会偏小。疲软时以室温、不受凉为准。多量几次取中间值更稳定。",
      },
    ],
  },
  data: {
    title: "基准数据与解读",
    paragraphs: [
      "基准采用 Veale 等（2015，BJU International）只汇总医务人员按标准方法实测的研究制成的列线图：勃起长度平均 13.12cm（标准差 1.66），勃起周长 11.66cm（1.10），疲软长度 9.16cm（1.57），疲软周长 9.31cm（0.90），共 15,521 人。",
      "网络问卷和电商的自报数据平均偏大约 1cm，测法不一，且偏小的人更不愿作答。这里只以实测值为基准，所以可能比你在别处看到的平均更严格。",
      "把长度和周长分别放到正态分布上，再合成一个位置，得出前/后百分之几、等级和多少人里有一个。结果只表示统计位置，与健康或性表现无关。",
    ],
  },
  faq: {
    title: "常见问题",
    items: [
      {
        q: "阴茎的平均尺寸是多少？",
        a: "医生实测基准中，勃起时平均长度 13.12cm、周长 11.66cm；疲软时长度 9.16cm、周长 9.31cm。",
      },
      {
        q: "该用勃起时还是疲软时？",
        a: "以勃起时为准。疲软时受体温和紧张影响很大，仅供参考。",
      },
      {
        q: "结果会被保存吗？",
        a: "不会。计算只在设备内进行，不向服务器发送任何内容。",
      },
    ],
  },
  disclaimer:
    "该结果仅表示统计上的位置，不是医学诊断。尺寸与性满足是两回事。仅限 18 岁以上。",
};

const staminaEn: StaminaCopy = {
  meta: {
    title: "Stamina Percentile Checker",
    description:
      "Enter your time from penetration to ejaculation and see your percentile, rank and 1-in-N against stopwatch-measured data from 491 men.",
  },
  eyebrow: "Tool · 18+",
  title: "Stamina Percentile Checker",
  tagline: "Where your lasting time ranks among men.",
  lead:
    "Enter your time from penetration to ejaculation (minutes and seconds) and instantly see what top % you fall in, your rank (SS to E) and 1-in-N. The baseline is stopwatch-measured data from 491 men in five countries (median 5.4 minutes).",
  badges: ["Free", "No login", "Calculated on-device, nothing sent", "Sources cited"],
  form: {
    label: "Time from penetration to ejaculation",
    min: "min",
    sec: "sec",
    hint: "Use your usual average: the middle of your last three or so",
    range: "Between 6 seconds and 120 minutes",
    empty: "Enter your time to see your result here",
  },
  result: {
    eyebrow: "Your result",
    rank: "Rank",
    top: "Top {p}%",
    bottom: "Bottom {p}%",
    oneIn: "1 in {n}",
    score: "Score",
    time: "Time",
  },
  rankNames: {
    SS: "Iron stamina",
    S: "Enduring",
    A: "Lasting",
    "B+": "A bit above",
    B: "Dead average",
    C: "A bit below",
    D: "Quick",
    E: "Fast finish",
  },
  rankTable: {
    title: "Rank table",
    intro:
      "Rank comes from where your time places you among men. The middle is the median (5 min 24 s); A is the top 16%, S the top 7% and SS the top 2%. Times are right-skewed, so positions are calculated on a log scale.",
    rows: rankRows(
      {
        SS: "Iron stamina",
        S: "Enduring",
        A: "Lasting",
        "B+": "A bit above",
        B: "Dead average",
        C: "A bit below",
        D: "Quick",
        E: "Fast finish",
      },
      {
        SS: "22:20+ · top 2%",
        S: "15:40+ · 7%",
        A: "10:59+ · 16%",
        "B+": "7:42+ · 31%",
        B: "3:47+ · 69%",
        C: "2:39+ · 84%",
        D: "1:52+ · 93%",
        E: "under 1:52",
      },
    ),
  },
  howTo: {
    title: "How to measure",
    steps: [
      {
        title: "Time from the moment of penetration to ejaculation",
        body: "Foreplay is not included. Studies measure exactly this interval (IELT) with a stopwatch. A phone timer is fine.",
      },
      {
        title: "Enter your usual average",
        body: "A single time is noisy. Use the middle value of your last three or so. Leave out the first time after a long break or a night of drinking.",
      },
      {
        title: "Don't count sessions you stopped on purpose",
        body: "Sessions where you paused or withdrew deliberately are excluded in the research too. Only count the ones you finished.",
      },
    ],
  },
  data: {
    title: "The data and how to read it",
    paragraphs: [
      "The baseline is the five-country stopwatch survey by Waldinger et al. (2005, The Journal of Sexual Medicine): 500 couples in the Netherlands, UK, Spain, Turkey and the US timed intercourse for four weeks. Median latency was 5.4 minutes, range 0.55–44.1 minutes.",
      "The distribution is right-skewed: short times bunch near one minute while the long tail stretches to 30–40 minutes. We therefore model the log of time rather than using a raw mean and standard deviation.",
      "Median time falls with age (6.5 minutes at 18–30, 4.3 minutes at 51+), and we do not age-adjust, so younger users read slightly stricter and older users slightly looser. Self-reported surveys often say 10–15 minutes; stopwatch studies land at 5–6.",
    ],
  },
  faq: {
    title: "Frequently Asked Questions",
    items: [
      {
        q: "How many minutes counts as premature ejaculation?",
        a: "The ISSM definition uses about one minute or less since the first sexual experiences, or a drop to about three minutes or less. It only applies when you also cannot delay and are distressed by it.",
      },
      {
        q: "Does foreplay count?",
        a: "No. Only the time from penetration to ejaculation is measured.",
      },
      {
        q: "Is the result saved?",
        a: "No. The calculation runs entirely on your device and nothing is sent to a server.",
      },
    ],
  },
  disclaimer:
    "The result shows a statistical position only. It is not a medical diagnosis, and lasting time is not the same thing as sexual satisfaction. 18+ only.",
};

const staminaZh: StaminaCopy = {
  meta: {
    title: "持久时间百分位测试",
    description:
      "输入从插入到射精的时间，马上看到百分位、等级和多少人里有一个。基准是 5 国 491 人的秒表实测数据。",
  },
  eyebrow: "Tool · 18+",
  title: "持久时间百分位测试",
  tagline: "你的持久时间，在男人里排第几。",
  lead:
    "输入从插入到射精的时间（分·秒），马上知道你排在前百分之几、等级（SS~E）、多少人里有一个。基准是用秒表实测的 5 国 491 人数据（中位数 5.4 分钟）。",
  badges: ["免费", "无需登录", "设备内计算，不上传", "注明出处"],
  form: {
    label: "从插入到射精的时间",
    min: "分",
    sec: "秒",
    hint: "按平时的平均。最近三次左右的中间值即可",
    range: "6 秒~120 分钟",
    empty: "输入时间后，结果会显示在这里",
  },
  result: {
    eyebrow: "你的结果",
    rank: "等级",
    top: "前 {p}%",
    bottom: "后 {p}%",
    oneIn: "{n} 人里有一个",
    score: "分数",
    time: "时间",
  },
  rankNames: {
    SS: "铁人",
    S: "强韧",
    A: "持久",
    "B+": "略偏长",
    B: "正中平均",
    C: "略偏短",
    D: "偏短",
    E: "速战型",
  },
  rankTable: {
    title: "等级表",
    intro:
      "等级由你的时间在男人中的位置决定。中间是中位数（5 分 24 秒），A 是前 16%，S 是前 7%，SS 是前 2%。时间分布右偏，因此按对数尺度计算位置。",
    rows: rankRows(
      {
        SS: "铁人",
        S: "强韧",
        A: "持久",
        "B+": "略偏长",
        B: "正中平均",
        C: "略偏短",
        D: "偏短",
        E: "速战型",
      },
      {
        SS: "22:20+ · 前 2%",
        S: "15:40+ · 7%",
        A: "10:59+ · 16%",
        "B+": "7:42+ · 31%",
        B: "3:47+ · 69%",
        C: "2:39+ · 84%",
        D: "1:52+ · 93%",
        E: "不足 1:52",
      },
    ),
  },
  howTo: {
    title: "测量方法",
    steps: [
      {
        title: "从插入那一刻到射精",
        body: "不含前戏。研究中也是用秒表测这一段（IELT）。手机计时器就够了。",
      },
      {
        title: "输入平时的平均",
        body: "只测一次会有偏差。取最近三次左右的中间值。久别重逢或喝酒那天不算。",
      },
      {
        title: "中途停下的那次不算",
        body: "有意暂停或抽出的那次，研究里也会剔除。只算做到最后的。",
      },
    ],
  },
  data: {
    title: "基准数据与解读",
    paragraphs: [
      "基准是 Waldinger 等（2005，The Journal of Sexual Medicine）在荷兰、英国、西班牙、土耳其、美国 500 对稳定伴侣中做的秒表调查：连续 4 周计时，中位数 5.4 分钟，范围 0.55~44.1 分钟。",
      "分布右偏：短的一端挤在 1 分钟附近，长的一端拉到 30、40 分钟。直接用平均和标准差会失真，所以取时间的对数，按正态分布算出位置。",
      "中位数随年龄下降（18~30 岁 6.5 分钟，51 岁以上 4.3 分钟），本页不做年龄校正。自报问卷常为 10~15 分钟，秒表实测则落在 5~6 分钟。",
    ],
  },
  faq: {
    title: "常见问题",
    items: [
      {
        q: "几分钟算早泄？",
        a: "按国际性医学会（ISSM）的定义，时间标准是插入后几乎每次约 1 分钟以内，或比以前变短到约 3 分钟以下；同时还要满足“无法延迟”和“本人感到困扰”。",
      },
      {
        q: "前戏时间算吗？",
        a: "不算。只算从插入到射精的时间。",
      },
      {
        q: "结果会被保存吗？",
        a: "不会。计算只在设备内进行，不向服务器发送任何内容。",
      },
    ],
  },
  disclaimer:
    "该结果仅表示统计上的位置，不是医学诊断。持久时间与性满足是两回事。仅限 18 岁以上。",
};

const partnersEn: PartnersCopy = {
  meta: {
    title: "Body Count Percentile Checker",
    description:
      "Enter your number of sexual partners and see your percentile, rank and 1-in-N against Natsal-3, Britain's national probability survey.",
  },
  eyebrow: "Tool · 18+",
  title: "Body Count Percentile Checker",
  tagline: "Where your number ranks among men your age.",
  lead:
    "Enter how many people you've had sex with and instantly see what top % you fall in, your rank (SS to E) and 1-in-N. The baseline is Natsal-3, Britain's national probability survey (6,293 men aged 16–74, The Lancet 2013). Pick an age group to compare with men your age.",
  badges: ["Free", "No login", "Calculated on-device, nothing sent", "Sources cited"],
  form: {
    label: "Number of people you've had sex with",
    unit: "people",
    hint: "Female partners. A rough number is fine if you don't know exactly",
    range: "Between 0 and 999",
    compare: "Compare with",
    ages: {
      all: "All ages (16–74)",
      16: "16–24",
      25: "25–34",
      35: "35–44",
      45: "45–54",
      55: "55–64",
      65: "65–74",
    },
    empty: "Enter a number to see your result here",
  },
  result: {
    eyebrow: "Your result",
    rank: "Rank",
    top: "Top {p}%",
    bottom: "Bottom {p}%",
    oneIn: "1 in {n}",
    score: "Score",
    same: "Same count: {p}%",
    count: "Partners",
  },
  rankNames: {
    SS: "Seasoned veteran",
    S: "Very experienced",
    A: "Above average",
    "B+": "A bit above",
    B: "Dead average",
    C: "A bit below",
    D: "Below average",
    E: "Selective",
  },
  rankTable: {
    title: "Rank table",
    intro:
      "Rank comes from where your number places you among men. The counts below are guides when comparing with all ages (16–74). Because counts are whole numbers, your position can jump a step at a boundary.",
    rows: rankRows(
      {
        SS: "Seasoned veteran",
        S: "Very experienced",
        A: "Above average",
        "B+": "A bit above",
        B: "Dead average",
        C: "A bit below",
        D: "Below average",
        E: "Selective",
      },
      {
        SS: "79+ · top 2%",
        S: "41–78 · 7%",
        A: "21–40 · 16%",
        "B+": "11–20 · 31%",
        B: "3–10 · 69%",
        C: "2 · 84%",
        D: "1 · 93%",
        E: "0",
      },
    ),
  },
  howTo: {
    title: "How to count",
    steps: [
      {
        title: "Women you've had sex with",
        body: "A one-time partner counts as one. The same person counts once no matter how many times.",
      },
      {
        title: "Roughly is fine",
        body: "The survey relies on self-report too. Few people count precisely past ten, so your best recollection is enough.",
      },
      {
        title: "Pick an age group",
        body: "Counts build up with age. Five partners at 22 and five at 45 sit in different places, so compare with your own age group.",
      },
    ],
  },
  data: {
    title: "The data and how to read it",
    paragraphs: [
      "Natsal-3 visited randomly selected households across Britain (2010–12, ages 16–74, 15,162 respondents including 6,293 men, response rate 57.7%). Sensitive questions were answered directly on a computer, unseen by the interviewer. Results were published in The Lancet (2013).",
      "Lifetime female partners for men: 0 — 5.5%, 1 — 13.7%, 2 — 8.4%, 3–4 — 15.0%, 5–9 — 23.5%, 10 or more — 33.9%. Median 6 (IQR 2–12), mean 14.1. The mean is pulled up by a few very high counts, so the median is the better midpoint.",
      "The paper's top band is “10 or more”. Positions inside it are estimated from a log-normal tail fitted to the 0–9 bands; the fitted quartiles (2, 6, 13) are close to the published ones (2, 6, 12). The result describes a statistical position, not a person's worth.",
    ],
  },
  faq: {
    title: "Frequently Asked Questions",
    items: [
      {
        q: "What is the average number of partners for men?",
        a: "In Natsal-3 the median is 6 lifetime female partners, with the middle half between 2 and 12. The mean is 14.1, pulled up by a small number of very high counts.",
      },
      {
        q: "How do I count one person?",
        a: "One person counts once no matter how many times you had sex with them.",
      },
      {
        q: "Is the result saved?",
        a: "No. The calculation runs entirely on your device and nothing is sent to a server.",
      },
    ],
  },
  disclaimer:
    "The result shows a statistical position only, not a person's worth or sexual satisfaction. The baseline is a British survey and other countries may differ. 18+ only.",
};

const partnersZh: PartnersCopy = {
  meta: {
    title: "性经验人数百分位测试",
    description:
      "输入至今发生过性关系的人数，马上看到百分位、等级和多少人里有一个。基准是英国全国调查 Natsal-3。",
  },
  eyebrow: "Tool · 18+",
  title: "性经验人数百分位测试",
  tagline: "你的人数，在同龄男人里排第几。",
  lead:
    "输入至今发生过性关系的人数，马上知道你排在前百分之几、等级（SS~E）、多少人里有一个。基准是英国全国概率抽样调查 Natsal-3（16~74 岁男性 6,293 人·The Lancet 2013）。选择年龄段即可与同龄人比较。",
  badges: ["免费", "无需登录", "设备内计算，不上传", "注明出处"],
  form: {
    label: "至今发生过性关系的人数",
    unit: "人",
    hint: "女性伴侣的人数。记不清的话填大概的数",
    range: "0~999 人",
    compare: "比较对象",
    ages: {
      all: "全年龄（16~74 岁）",
      16: "16~24 岁",
      25: "25~34 岁",
      35: "35~44 岁",
      45: "45~54 岁",
      55: "55~64 岁",
      65: "65~74 岁",
    },
    empty: "输入人数后，结果会显示在这里",
  },
  result: {
    eyebrow: "你的结果",
    rank: "等级",
    top: "前 {p}%",
    bottom: "后 {p}%",
    oneIn: "{n} 人里有一个",
    score: "分数",
    same: "相同人数的人：{p}%",
    count: "人数",
  },
  rankNames: {
    SS: "身经百战",
    S: "经验丰富",
    A: "偏多",
    "B+": "略偏多",
    B: "正中平均",
    C: "略偏少",
    D: "偏少",
    E: "谨慎派",
  },
  rankTable: {
    title: "等级表",
    intro:
      "等级由你的人数在男人中的位置决定。下面的人数是与全年龄（16~74 岁）比较时的参考。人数是整数，所以在分界处位置可能跳一级。",
    rows: rankRows(
      {
        SS: "身经百战",
        S: "经验丰富",
        A: "偏多",
        "B+": "略偏多",
        B: "正中平均",
        C: "略偏少",
        D: "偏少",
        E: "谨慎派",
      },
      {
        SS: "79+ · 前 2%",
        S: "41–78 · 7%",
        A: "21–40 · 16%",
        "B+": "11–20 · 31%",
        B: "3–10 · 69%",
        C: "2 · 84%",
        D: "1 · 93%",
        E: "0",
      },
    ),
  },
  howTo: {
    title: "怎么数",
    steps: [
      {
        title: "至今发生过性关系的女性人数",
        body: "只有一次的对象也算 1 人。同一个人无论多少次都算 1 人。",
      },
      {
        title: "大概就行",
        body: "调查也是本人申报。超过 10 人能准确数清的人很少，按记得的数填即可。",
      },
      {
        title: "选年龄段，比较对象就会变",
        body: "人数随年龄累积。20 岁出头的 5 人和 40 多岁的 5 人位置不同，建议与自己的年龄段比较。",
      },
    ],
  },
  data: {
    title: "基准数据与解读",
    paragraphs: [
      "Natsal-3 是在英国随机抽取住户上门进行的全国调查（2010~12 年·16~74 岁·回答 15,162 人，其中男性 6,293 人·回答率 57.7%）。敏感问题由本人直接在终端输入，调查员看不到。结果发表在 The Lancet（2013）。",
      "男性一生中女性伴侣的人数：0 人 5.5%·1 人 13.7%·2 人 8.4%·3~4 人 15.0%·5~9 人 23.5%·10 人以上 33.9%。中位数 6 人（四分位距 2~12 人），平均 14.1 人。平均会被少数极多的人拉高，所以中间的参考是中位数。",
      "论文的区间只到“10 人以上”，其中的位置用拟合 0~9 人区间的对数正态分布尾部推算。结果只表示统计位置，与人的价值或性满足无关。",
    ],
  },
  faq: {
    title: "常见问题",
    items: [
      {
        q: "男性性经验人数的平均是多少？",
        a: "Natsal-3 中，男性一生女性伴侣人数中位数为 6 人，中间一半的人在 2~12 人之间；平均 14.1 人被少数极高值拉高。",
      },
      {
        q: "怎么算 1 人？",
        a: "至今发生过性关系的女性人数。同一个人无论多少次都算 1 人。",
      },
      {
        q: "结果会被保存吗？",
        a: "不会。计算只在设备内进行，不向服务器发送任何内容。",
      },
    ],
  },
  disclaimer:
    "该结果仅表示统计上的位置，与人的价值和性满足无关。基准是英国的调查，可能与其他国家的分布不同。仅限 18 岁以上。",
};

export const calculatorCopy = {
  en: { size: sizeEn, stamina: staminaEn, partners: partnersEn },
  zh: { size: sizeZh, stamina: staminaZh, partners: partnersZh },
} as const;

export type CalculatorCopy = (typeof calculatorCopy)["en"];
