import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CalculatorPage } from "@/components/tools/CalculatorPage";
import { PartnersCalculator } from "@/components/tools/Calculators";
import { calculatorCopy } from "@/data/calculatorCopy";
import { isLocale } from "@/data/tools";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const copy = calculatorCopy[lang].partners;
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: { canonical: `/${lang}/partners` },
  };
}

export default async function PartnersPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const copy = calculatorCopy[lang].partners;

  return (
    <CalculatorPage copy={copy}>
      <PartnersCalculator copy={copy} />
    </CalculatorPage>
  );
}
