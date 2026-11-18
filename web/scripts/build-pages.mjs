import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(__dirname, "..");

const rawBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "/Open100Adults")
  .trim()
  .replace(/\/$/, "");
const basePath =
  rawBasePath && !rawBasePath.startsWith("/") ? `/${rawBasePath}` : rawBasePath;
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? `https://2580m.github.io${basePath}`
).replace(/\/$/, "");

const backupDir = path.join(webDir, ".pages-tmp-backup");
const outDir = path.join(webDir, "out");
const nextBin = path.join(webDir, "node_modules", "next", "dist", "bin", "next");

const serverOnlyDirs = [
  {
    src: path.join(webDir, "src", "app", "api"),
    dst: path.join(backupDir, "api"),
  },
  {
    src: path.join(webDir, "src", "app", "[lang]", "sundome", "remote"),
    dst: path.join(backupDir, "remote"),
  },
  {
    src: path.join(webDir, "src", "app", "[lang]", "sundome", "c"),
    dst: path.join(backupDir, "c"),
  },
];

function moveDir(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
  fs.rmSync(from, { recursive: true, force: true });
}

let moved = [];
try {
  fs.rmSync(backupDir, { recursive: true, force: true });
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.rmSync(path.join(webDir, ".next", "types"), {
    recursive: true,
    force: true,
  });

  for (const entry of serverOnlyDirs) {
    if (fs.existsSync(entry.src)) {
      moveDir(entry.src, entry.dst);
      moved.push(entry);
    }
  }

  const result = spawnSync(process.execPath, [nextBin, "build"], {
    cwd: webDir,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_STATIC_EXPORT: "1",
      NEXT_PUBLIC_STATIC_EXPORT: "1",
      NEXT_PUBLIC_BASE_PATH: basePath,
      NEXT_PUBLIC_SITE_URL: siteUrl,
      NEXT_TELEMETRY_DISABLED: "1",
    },
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
} finally {
  for (const entry of moved.reverse()) {
    if (fs.existsSync(entry.dst)) {
      fs.rmSync(entry.src, { recursive: true, force: true });
      moveDir(entry.dst, entry.src);
    }
  }
  fs.rmSync(backupDir, { recursive: true, force: true });
}

// 1. Disable Jekyll on GitHub Pages so _next/ assets are served properly.
fs.writeFileSync(path.join(outDir, ".nojekyll"), "", "utf8");

// 2. Write root index.html redirecting visitors based on browser language.
const rootIndexHtml = `<!DOCTYPE html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>100Adults - Adult Tools</title>
  <meta http-equiv="refresh" content="0; url=./zh/" />
  <script>
    (function () {
      var lang = (navigator.language || "").toLowerCase();
      var target = lang.startsWith("zh") ? "./zh/" : "./en/";
      window.location.replace(target + window.location.search + window.location.hash);
    })();
  </script>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #130c16; color: #f7eef3; font-family: system-ui, sans-serif; }
    a { color: #f5a3c8; text-decoration: none; font-weight: 700; margin: 0 12px; }
  </style>
</head>
<body>
  <div>
    <a href="./zh/">简体中文</a> · <a href="./en/">English</a>
  </div>
</body>
</html>
`;
fs.writeFileSync(path.join(outDir, "index.html"), rootIndexHtml, "utf8");

// 3. Prefix manifest.json paths with basePath when hosted in a project subpath.
const manifestPath = path.join(outDir, "manifest.json");
if (fs.existsSync(manifestPath) && basePath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.start_url = `${basePath}/en/`;
  manifest.scope = `${basePath}/`;
  if (Array.isArray(manifest.icons)) {
    manifest.icons = manifest.icons.map((icon) => ({
      ...icon,
      src:
        typeof icon.src === "string" && icon.src.startsWith("/")
          ? `${basePath}${icon.src}`
          : icon.src,
    }));
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

console.log(`Static GitHub Pages build ready in ${outDir} (basePath=${basePath || "/"})`);
