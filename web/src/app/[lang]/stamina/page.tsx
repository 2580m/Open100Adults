import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CalculatorPage } from "@/components/tools/CalculatorPage";
import { StaminaCalculator } from "@/components/tools/Calculators";
import { calculatorCopy } from "@/data/calculatorCopy";
import { isLocale } from "@/data/tools";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const copy = calculatorCopy[lang].stamina;
  return {
    title: copy.meta.title,
    description: copy.meta.description,
    alternates: { canonical: `/${lang}/stamina` },
  };
}

export default async function StaminaPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const copy = calculatorCopy[lang].stamina;

  return (
    <CalculatorPage copy={copy}>
      <StaminaCalculator copy={copy} />
    </CalculatorPage>
  );
}
