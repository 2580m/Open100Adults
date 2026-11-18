import type {
  HomeToolKey,
  Locale,
  NavSectionKey,
  ToolKey,
  VariantKey,
} from "@/data/tools";

export type {
  HomeToolKey,
  Locale,
  NavSectionKey,
  ToolKey,
  VariantKey,
};

export interface FaqItem {
  q: string;
  a: string;
}

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalPageCopy {
  title: string;
  metaDescription: string;
  updated: string;
  sections: LegalSection[];
}

export interface Dictionary {
  meta: {
    title: string;
    description: string;
    ogAlt: string;
  };
  legalMeta: {
    statement2257: LegalPageCopy;
    dmca: LegalPageCopy;
  };
  header: {
    logoAria: string;
    navAria: string;
    menuAria: string;
    menuOpen: string;
    menuClose: string;
    languageAria: string;
    languageShort: string;
    tagline: string;
    sections: Record<NavSectionKey, string>;
    tools: Record<ToolKey, string>;
  };
  footer: {
    index: string;
    toolsAria: string;
    ageGate: string;
    legalAria: string;
    statement2257: string;
    dmca: string;
    brandSuffix: string;
  };
  home: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string;
    playedThisWeek: string;
    freeNoSignup: string;
    newBadge: string;
    descriptions: Record<HomeToolKey, string>;
    /** Short trailing tag shown on the right of a row (empty string hides it). */
    tags: Record<HomeToolKey, string>;
    sectionHints: Record<NavSectionKey, string>;
    startMale: string;
    variantLabels: Record<"sundome" | "shuttle", Record<VariantKey, string>>;
    about: {
      label: string;
      title: string;
      body: string;
    };
    faq: {
      label: string;
      title: string;
      items: FaqItem[];
    };
  };
  language: {
    en: string;
    zh: string;
  };
}
