export const TOOL_KEYS = [
  "sundome",
  "shuttle",
  "board",
  "remote",
  "remoteList",
  "story",
  "streak",
  "size",
  "stamina",
  "partners",
] as const;

export type ToolKey = (typeof TOOL_KEYS)[number];

/** Tools that can be rendered as a home-page card. */
export type HomeToolKey = ToolKey;

export type NavSectionKey = "solo" | "partner" | "read" | "measure";

/** Playable variants reachable from the home page. */
export type VariantKey = "women" | "gay" | "lesbian";

export interface ToolMeta {
  /** Path without the locale prefix. */
  path: string;
  icon: string;
}

export const TOOL_META: Record<ToolKey, ToolMeta> = {
  sundome: { path: "/sundome", icon: "/icons/play/sundome.webp" },
  shuttle: { path: "/shuttle", icon: "/icons/play/shuttle.webp" },
  board: { path: "/board", icon: "/icons/play/board.webp" },
  remote: { path: "/sundome/remote", icon: "/icons/play/remote.webp" },
  remoteList: { path: "/sundome/remote/list", icon: "/icons/play/remote.webp" },
  story: { path: "/story", icon: "/icons/play/story.webp" },
  streak: { path: "/streak", icon: "/icons/play/streak.webp" },
  size: { path: "/size", icon: "/icons/play/size.webp" },
  stamina: { path: "/stamina", icon: "/icons/play/stamina.webp" },
  partners: { path: "/partners", icon: "/icons/play/partners.webp" },
};

/** Desktop header links, in the original order. */
export const HEADER_BAR_TOOLS: ToolKey[] = [
  "sundome",
  "shuttle",
  "board",
  "remote",
  "story",
];

/** Grouping used by the mobile menu and the home page. */
export const NAV_SECTIONS: { key: NavSectionKey; tools: ToolKey[] }[] = [
  { key: "solo", tools: ["sundome", "shuttle", "board"] },
  { key: "partner", tools: ["remote", "remoteList"] },
  { key: "read", tools: ["story"] },
  { key: "measure", tools: ["streak", "size", "stamina", "partners"] },
];

/** Tools flagged with the NEW badge in the original UI. */
export const NEW_TOOL_KEYS: ToolKey[] = ["shuttle", "board", "story"];

/** Footer index order. */
export const FOOTER_TOOL_KEYS: ToolKey[] = [
  "sundome",
  "streak",
  "size",
  "stamina",
  "partners",
  "shuttle",
];

/** Optional variants offered underneath a tool row on the home page. */
export const TOOL_VARIANTS: Partial<Record<HomeToolKey, VariantKey[]>> = {
  sundome: ["women", "gay", "lesbian"],
  shuttle: ["women", "gay", "lesbian"],
};

/** The only locales this rebuild supports. */
export const LOCALES = ["en", "zh"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function localePath(locale: Locale, path: string): string {
  return path === "" ? `/${locale}` : `/${locale}${path}`;
}
