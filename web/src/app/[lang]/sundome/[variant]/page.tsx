import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SundomePage } from "@/components/tools/SundomePage";
import { getDictionary } from "@/data/i18n";
import { sundomeCopy } from "@/data/sundomeCopy";
import { isLocale, type VariantKey } from "@/data/tools";

const VARIANTS: VariantKey[] = ["women", "gay", "lesbian"];

interface PageProps {
  params: Promise<{ lang: string; variant: string }>;
}

function isVariant(value: string): value is VariantKey {
  return (VARIANTS as string[]).includes(value);
}

export function generateStaticParams(): { variant: VariantKey }[] {
  return VARIANTS.map((variant) => ({ variant }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, variant } = await params;
  if (!isLocale(lang) || !isVariant(variant)) return {};
  const copy = sundomeCopy[lang];
  const label = getDictionary(lang).home.variantLabels.sundome[variant];
  return {
    title: `${copy.meta.title} · ${label}`,
    description: copy.meta.description,
    alternates: { canonical: `/${lang}/sundome/${variant}` },
  };
}

export default async function SundomeVariantPage({ params }: PageProps) {
  const { lang, variant } = await params;
  if (!isLocale(lang) || !isVariant(variant)) notFound();
  return <SundomePage locale={lang} variant={variant} />;
}
