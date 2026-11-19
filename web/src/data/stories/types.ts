export interface StoryPhase {
  c: string;
  d?: number;
  bpm?: number;
  t?: string[];
}

export interface StoryAsk {
  q: string;
  options: { label: string; route: string }[];
}

export interface StorySegment {
  name: string;
  route?: string;
  bpm?: number;
  P?: StoryPhase;
  G?: StoryPhase;
  Y?: StoryPhase;
  R?: StoryPhase;
  X?: StoryPhase;
  ask?: StoryAsk;
}

export interface StoryJudge {
  type: "always" | "marks" | "choice";
  q?: string;
  yes?: string;
  no?: string;
}

export interface StoryFinale {
  build?: StoryPhase;
  judge?: StoryJudge;
  count?: {
    from: number;
    beat: number;
    c: string;
    stalls?: unknown[];
  };
  allow?: StoryPhase;
  ruin?: StoryPhase;
  deny?: StoryPhase;
  after?: StoryPhase;
  rounds?: unknown[];
}

export interface StoryEnding {
  title: string;
  line: string;
  near?: string;
}

export interface Story {
  id: string;
  body: "m" | "f";
  tone: "sweet" | "tease" | "hard" | string;
  title: string;
  blurb: string;
  tags: string[];
  mins: number;
  names: Record<string, string>;
  marks?: { name: string; allow: number; ruin: number };
  segs: StorySegment[];
  finale: StoryFinale;
  oops?: { c: string; t?: string[] };
  endings: {
    allow?: StoryEnding;
    ruin?: StoryEnding;
    deny?: StoryEnding;
    oops?: StoryEnding;
  };
  fill?: string[];
}

export interface StoryMeta {
  id: string;
  body: "m" | "f";
  tone: string;
  title: string;
  blurb: string;
  tags: string[];
  mins: number;
}
