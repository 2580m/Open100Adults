import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const OUT_DIR = path.join(ROOT_DIR, "out-pages");

const RAW_BASE = (process.env.PAGES_BASE_PATH ?? "/Open100Adults").trim();
const BASE_PATH = RAW_BASE === "/" ? "" : "/" + RAW_BASE.replace(/^\/+|\/+$/g, "");

const NO_ADS_STYLE = `<style id="local-no-ads">
[data-ad-close],
[data-arrow-ad],
[data-bance-ad],
[data-bance-slot],
[data-fam-ad],
[data-hilltop-ad],
[data-hilltop-slot],
[data-ts-ad],
[data-ts-slot],
[data-top-ads],
[data-top-glass-sites],
[data-myfans-zone],
[data-fanszukan-pick],
[data-koemimi-featured],
[data-koemimi-hero],
[data-koemimi-push],
[data-peek-banner],
[data-peek-fixed],
[data-sundome-next-block],
[data-sundome-next],
[data-sundome-preroll],
[data-sundome-vpn-notice],
[data-x-follow-arm],
[data-zh-follow-line],
[data-zh-suggest],
a[data-zh-script-choice],
div:has(> a[data-zh-script-choice]),
li:has(> a[data-header-tool="voice"]),
a[data-header-tool="voice"],
a[href*="koemimi.com"],
a[href*="chiramin.com"],
a[href*="fanszukan.com"],
a[href*="mfco.link"],
a[href*="bed16.com"],
a[href*="bothsheet.com"],
a[href*="expressvpn.com"],
a[href*="privateinternetaccess.com"],
a[href*="x.com/cunzhi_game"],
aside:has(a[href*="koemimi.com"]),
aside:has(a[href*="x.com/cunzhi_game"]) {
  display: none !important;
}
</style>`;

function buildBasePathShim() {
  if (!BASE_PATH) return "";
  const bp = JSON.stringify(BASE_PATH);
  return `<script id="gh-pages-basepath-shim">(function(){
var B=${bp};
window.__OPEN100_BASE_PATH__=B;
function p(u){if(typeof u!=="string")return u;if(u.startsWith(B+"/")||u===B||u.startsWith("//")||!u.startsWith("/"))return u;if(/^\\/(?:_next|icons|peek|support|bx-zh\\.js|manifest\\.json|favicon\\.ico)(?:\\/|$|\\?)/.test(u))return B+u;return u;}
function nav(u){if(typeof u!=="string")return u;if(u.startsWith(B+"/")||u===B||u.startsWith("//")||!u.startsWith("/"))return u;return B+u;}
var origFetch=window.fetch;
if(typeof origFetch==="function"){
  window.fetch=function(input,init){
    if(typeof input==="string")return origFetch.call(this,p(input),init);
    if(input&&typeof input.url==="string"){
      try{var u=new URL(input.url,location.href);if(u.origin===location.origin){var next=p(u.pathname)+u.search+u.hash;if(next!==u.pathname+u.search+u.hash)return origFetch.call(this,new Request(next,input),init);}}catch(e){}
    }
    return origFetch.call(this,input,init);
  };
}
var ps=history.pushState.bind(history);
history.pushState=function(s,t,u){if(typeof u==="string"&&u.startsWith("/"))u=nav(u);return ps(s,t,u);};
var rs=history.replaceState.bind(history);
history.replaceState=function(s,t,u){if(typeof u==="string"&&u.startsWith("/"))u=nav(u);return rs(s,t,u);};
document.addEventListener("click",function(e){
  var a=e.target&&e.target.closest?e.target.closest("a[href]"):null;
  if(!a||a.target==="_blank"||a.hasAttribute("download"))return;
  var href=a.getAttribute("href");
  if(!href||!href.startsWith("/")||href.startsWith("//")||href.startsWith(B+"/")||href===B)return;
  e.preventDefault();
  e.stopPropagation();
  location.assign(B+href);
},true);
})();</script>`;
}

function buildRedirectIndexHtml() {
  const bp = BASE_PATH;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Open100Adults</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0e0b11; color:#f4eff8; font-family:system-ui,-apple-system,sans-serif; }
  a { color:#f5a3c7; }
</style>
<script>
  (function(){
    var lang = (navigator.languages && navigator.languages[0] || navigator.language || "").toLowerCase();
    var target = lang.startsWith("zh") ? "${bp}/zh" : "${bp}/en";
    location.replace(target);
  })();
</script>
</head>
<body>
  <p>Redirecting… <a href="${bp}/zh">简体中文</a> · <a href="${bp}/en">English</a></p>
</body>
</html>
`;
}

function build404Html() {
  const bp = BASE_PATH;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>404 — Open100Adults</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0e0b11; color:#f4eff8; font-family:system-ui,-apple-system,sans-serif; padding:24px; }
  .card { max-width:460px; width:100%; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); border-radius:20px; padding:28px; text-align:center; }
  .btn { display:inline-block; margin:8px 6px 0; padding:10px 18px; border-radius:999px; text-decoration:none; font-weight:600; font-size:14px; }
  .primary { background:linear-gradient(90deg,#f5a3c7,#b8a9ff); color:#140e18; }
  .ghost { border:1px solid rgba(255,255,255,.22); color:#f4eff8; }
</style>
<script>
  (function(){
    if (location.pathname.length > 1 && location.pathname.endsWith("/")) {
      location.replace(location.pathname.slice(0, -1) + location.search + location.hash);
    }
  })();
</script>
</head>
<body>
  <div class="card">
    <h1 style="margin:0 0 10px;font-size:22px;">Page not found / 页面不存在</h1>
    <p style="margin:0 0 18px;color:rgba(244,239,248,.72);font-size:14px;line-height:1.6;">
      This static GitHub Pages mirror hosts the standalone pages and interactive games.<br />
      当前静态站点包含离线可用的页面与互动游戏。
    </p>
    <a class="btn primary" href="${bp}/zh">简体中文首页</a>
    <a class="btn ghost" href="${bp}/en">English Home</a>
  </div>
</body>
</html>
`;
}

function buildRemoteNoticeHtml(lang) {
  const bp = BASE_PATH;
  const isZh = lang === "zh";
  const title = isZh
    ? "在线远程控制需自托管运行 — Open100Adults"
    : "Online Remote Control Requires Self-Hosting — Open100Adults";
  const heading = isZh
    ? "在线联机远程控制需自托管部署"
    : "Remote Control Requires Self-Hosted Backend";
  const desc = isZh
    ? "GitHub Pages 为纯静态托管，无法运行实时 WebSocket 中继 (/rws) 与 Cloudflare Tunnel。通过 Docker 一键部署即可启用完整 4 步联机向导、公开房间大厅、快捷指令操控台与自动公网分享链接："
    : "GitHub Pages serves static assets only and cannot host the live WebSocket relay (/rws) or Cloudflare Tunnel. Run the Docker container locally or on any server to unlock the full 4-step remote wizard, live lobby, controller console, and automatic public share links:";
  const soloLabel = isZh ? "游玩单人模式" : "Play Solo Mode";
  const homeLabel = isZh ? "返回首页" : "Back to Home";
  const repoLabel = isZh ? "查看 GitHub 部署指南" : "View GitHub Repo";

  return `<!doctype html>
<html lang="${isZh ? "zh-Hans" : "en"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
<style>
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:#0e0b11; color:#f4eff8; font-family:system-ui,-apple-system,sans-serif; padding:24px; }
  .card { max-width:560px; width:100%; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.04); border-radius:20px; padding:28px; box-sizing:border-box; }
  h1 { margin:0 0 12px; font-size:22px; line-height:1.35; }
  p { margin:0 0 16px; color:rgba(244,239,248,.76); font-size:14px; line-height:1.65; }
  pre { margin:0 0 20px; padding:12px 14px; border-radius:12px; background:rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.1); overflow-x:auto; font-size:12px; color:#e6dcff; }
  .actions { display:flex; flex-wrap:wrap; gap:10px; }
  .btn { display:inline-block; padding:10px 18px; border-radius:999px; text-decoration:none; font-weight:600; font-size:14px; }
  .primary { background:linear-gradient(90deg,#f5a3c7,#b8a9ff); color:#140e18; }
  .ghost { border:1px solid rgba(255,255,255,.22); color:#f4eff8; }
</style>
</head>
<body>
  <div class="card">
    <h1>${heading}</h1>
    <p>${desc}</p>
    <pre><code>docker run -d --name open100adults -p 3000:3000 ghcr.io/2580m/open100adults:latest</code></pre>
    <div class="actions">
      <a class="btn primary" href="${bp}/${lang}/sundome">${soloLabel}</a>
      <a class="btn ghost" href="${bp}/${lang}">${homeLabel}</a>
      <a class="btn ghost" href="https://github.com/2580m/Open100Adults" target="_blank" rel="noopener">${repoLabel}</a>
    </div>
  </div>
</body>
</html>
`;
}

function walkFiles(dir, result = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, result);
    else result.push(full);
  }
  return result;
}

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.cpSync(PUBLIC_DIR, OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, ".nojekyll"), "", "utf8");
fs.writeFileSync(path.join(OUT_DIR, "index.html"), buildRedirectIndexHtml(), "utf8");
fs.writeFileSync(path.join(OUT_DIR, "404.html"), build404Html(), "utf8");

// Replace dynamic /rws remote-control routes with static notices on Pages
const remoteNotices = [
  ["zh/sundome/remote.html", "zh"],
  ["en/sundome/remote.html", "en"],
  ["zh/sundome/remote/list.html", "zh"],
  ["en/sundome/remote/list.html", "en"],
  ["zh/sundome/c.html", "zh"],
  ["en/sundome/c.html", "en"],
];
for (const [relPath, lang] of remoteNotices) {
  const full = path.join(OUT_DIR, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buildRemoteNoticeHtml(lang), "utf8");
}

if (BASE_PATH) {
  for (const file of walkFiles(path.join(OUT_DIR, "_next/static/chunks"))) {
    if (file.endsWith(".js")) {
      let js = fs.readFileSync(file, "utf8");
      js = js
        .replaceAll('"/icons/', `"${BASE_PATH}/icons/`)
        .replaceAll("'/icons/", `'${BASE_PATH}/icons/`)
        .replaceAll("`/icons/", `\`${BASE_PATH}/icons/`)
        .replaceAll('"/peek/', `"${BASE_PATH}/peek/`)
        .replaceAll("'/peek/", `'${BASE_PATH}/peek/`)
        .replaceAll('"/support/', `"${BASE_PATH}/support/`)
        .replaceAll("'/support/", `'${BASE_PATH}/support/`)
        .replaceAll('"/_next/', `"${BASE_PATH}/_next/`)
        .replaceAll("'/_next/", `'${BASE_PATH}/_next/`)
        .replaceAll("`/_next/", `\`${BASE_PATH}/_next/`);
      fs.writeFileSync(file, js, "utf8");
    } else if (file.endsWith(".css")) {
      let css = fs.readFileSync(file, "utf8");
      css = css
        .replaceAll("url(/_next/", `url(${BASE_PATH}/_next/`)
        .replaceAll('url("/_next/', `url("${BASE_PATH}/_next/`)
        .replaceAll("url('/_next/", `url('${BASE_PATH}/_next/`);
      fs.writeFileSync(file, css, "utf8");
    }
  }
}

const shim = buildBasePathShim();
const skippedRelative = new Set([
  "index.html",
  "404.html",
  ...remoteNotices.map(([p]) => p),
]);

for (const file of walkFiles(OUT_DIR)) {
  if (!file.endsWith(".html")) continue;
  const rel = path.relative(OUT_DIR, file).replaceAll("\\", "/");
  if (skippedRelative.has(rel)) continue;

  let html = fs.readFileSync(file, "utf8");
  if (BASE_PATH) {
    html = html
      .replaceAll('"/_next/', `"${BASE_PATH}/_next/`)
      .replaceAll("'/_next/", `'${BASE_PATH}/_next/`)
      .replaceAll('\\"/_next/', `\\"${BASE_PATH}/_next/`)
      .replaceAll('href="/icons/', `href="${BASE_PATH}/icons/`)
      .replaceAll('src="/icons/', `src="${BASE_PATH}/icons/`)
      .replaceAll('href="/manifest.json', `href="${BASE_PATH}/manifest.json`)
      .replaceAll('href="/favicon.ico', `href="${BASE_PATH}/favicon.ico`)
      .replaceAll('src="/peek/', `src="${BASE_PATH}/peek/`)
      .replaceAll('href="/peek/', `href="${BASE_PATH}/peek/`)
      .replaceAll('src="/support/', `src="${BASE_PATH}/support/`)
      .replaceAll('href="/support/', `href="${BASE_PATH}/support/`)
      .replaceAll('src="/bx-zh.js', `src="${BASE_PATH}/bx-zh.js`)
      .replaceAll('\\"src\\":\\"/bx-zh.js', `\\"src\\":\\"${BASE_PATH}/bx-zh.js`);
  }

  if (shim) {
    html = html.replace("<head>", `<head>${shim}`);
  }
  html = html.replace("</head>", `${NO_ADS_STYLE}</head>`);
  fs.writeFileSync(file, html, "utf8");
}

console.log(`Built static GitHub Pages export in ${OUT_DIR} (BASE_PATH=${BASE_PATH || "/"})`);
