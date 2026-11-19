import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShuttlePage } from "@/components/tools/ShuttlePage";
import { getDictionary } from "@/data/i18n";
import { shuttleCopy } from "@/data/shuttleCopy";
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
  const copy = shuttleCopy[lang];
  const label = getDictionary(lang).home.variantLabels.shuttle[variant];
  return {
    title: `${copy.meta.title} · ${label}`,
    description: copy.meta.description,
    alternates: { canonical: `/${lang}/shuttle/${variant}` },
  };
}

export default async function ShuttleVariantPage({ params }: PageProps) {
  const { lang, variant } = await params;
  if (!isLocale(lang) || !isVariant(variant)) notFound();
  return <ShuttlePage locale={lang} variant={variant} />;
}
