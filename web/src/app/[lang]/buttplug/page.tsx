import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ButtplugPanel } from "@/components/tools/ButtplugPanel";
import { isLocale } from "@/data/tools";

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return {
    title:
      lang === "zh"
        ? "Buttplug.io 通用玩具控制台"
        : "Buttplug.io Universal Toy Console",
    description:
      lang === "zh"
        ? "通过开源 Intiface Central / Buttplug Spec v3 协议连接 Lovense、The Handy、OSR2、跳蛋等 750+ 款硬件，与寸止游戏与远程同乐全自动联动。"
        : "Connect 750+ Lovense, The Handy, OSR2, and Bluetooth toys via Intiface Central / Buttplug Protocol Spec v3 with automatic gameplay and remote sync.",
    alternates: { canonical: `/${lang}/buttplug` },
  };
}

export default async function ButtplugConsolePage({ params }: PageProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const eyebrow =
    lang === "zh"
      ? "开源通用硬件生态"
      : "Open-Source Universal Toy SDK";
  const title =
    lang === "zh" ? "Buttplug.io 通用控制台" : "Buttplug.io Console";
  const lead =
    lang === "zh"
      ? "支持开源 Intiface Central 桥接器（Buttplug Spec v3）：覆盖 Lovense、We-Vibe、The Handy、OSR2 等 750+ 市售与 DIY 设备，零广告完全开源，可直接联动全站单人游戏与远程控制。"
      : "Powered by Intiface Central (Buttplug Protocol Spec v3): supports 750+ Lovense, We-Vibe, The Handy, and OSR2 devices with full solo gameplay and remote sync.";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-16 pt-8 sm:pt-10">
      <section>
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-muted">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-strong">
          {lead}
        </p>
      </section>

      <section className="mt-6">
        <ButtplugPanel locale={lang} />
      </section>
    </main>
  );
}
