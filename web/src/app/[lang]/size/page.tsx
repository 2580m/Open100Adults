import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CalculatorPage } from "@/components/tools/CalculatorPage";
import { SizeCalculator } from "@/components/tools/Calculators";
import { calculatorCopy } from "@/data/calculatorCopy";
import { isLocale } from "@/data/tools";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const copy = calculatorCopy[lang].size;
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: { canonical: `/${lang}/size` },
  };
}

export default async function SizePage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const copy = calculatorCopy[lang].size;

  return (
    <CalculatorPage copy={copy}>
      <SizeCalculator copy={copy} />
    </CalculatorPage>
  );
}
