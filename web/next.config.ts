import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_STATIC_EXPORT === "1";
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isStaticExport
    ? "export"
    : process.env.NEXT_STANDALONE === "1"
      ? "standalone"
      : undefined,
  basePath: basePath || undefined,
  trailingSlash: isStaticExport,
  images: isStaticExport ? { unoptimized: true } : undefined,
  ...(isStaticExport
    ? {}
    : {
        async redirects() {
          return [
            {
              source: "/",
              destination: "/en",
              permanent: false,
            },
          ];
        },
      }),
};

export default nextConfig;
