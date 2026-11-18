import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { getDictionary } from "@/data/i18n";
import { LOCALES, isLocale, type Locale } from "@/data/tools";

import "../globals.css";

const geist = localFont({
  src: "../../fonts/geist-latin.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const instrumentSerif = localFont({
  src: [
    {
      path: "../../fonts/instrument-serif-regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../fonts/instrument-serif-italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-instrument",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#130c16",
};

export function generateStaticParams(): { lang: Locale }[] {
  return LOCALES.map((lang) => ({ lang }));
}

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

interface MetadataProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const dict = getDictionary(lang);
  const base = new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  );

  return {
    metadataBase: base,
    title: dict.meta.title,
    description: dict.meta.description,
    applicationName: "100Adults",
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icons/icon.svg", type: "image/svg+xml" },
      ],
      apple: [{ url: "/icons/icon-180.png", sizes: "180x180" }],
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: `/${lang}`,
      languages: { en: "/en", zh: "/zh" },
    },
    openGraph: {
      type: "website",
      siteName: "100Adults",
      title: dict.meta.title,
      description: dict.meta.description,
      locale: lang === "zh" ? "zh_CN" : "en_US",
      alternateLocale: lang === "zh" ? "en_US" : "zh_CN",
      images: [
        {
          url: "/icons/icon-512.png",
          width: 512,
          height: 512,
          alt: dict.meta.ogAlt,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: dict.meta.title,
      description: dict.meta.description,
      images: ["/icons/icon-512.png"],
    },
  };
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;

  return (
    <html
      lang={locale === "zh" ? "zh-Hans" : "en"}
      data-look="glass"
      className={`${geist.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Header locale={locale} />
        {children}
        <Footer locale={locale} />
      </body>
    </html>
  );
}
