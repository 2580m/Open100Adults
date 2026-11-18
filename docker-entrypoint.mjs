import { spawn } from "node:child_process";
import fs from "node:fs";

const PORT = process.env.PORT || "3000";
const METRICS_PORT = process.env.CLOUDFLARED_METRICS_PORT || "20241";
const CLOUDFLARED_BIN = "/usr/local/bin/cloudflared";
const DISABLED_FLAGS = new Set(["false", "0", "no", "off"]);

function isDisabled(value) {
  return DISABLED_FLAGS.has(String(value ?? "").trim().toLowerCase());
}

const server = spawn(process.execPath, ["server.js"], {
  stdio: "inherit",
  env: process.env,
});

let tunnel = null;
let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (tunnel && !tunnel.killed) {
    tunnel.kill(signal);
  }
  if (!server.killed) {
    server.kill(signal);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

server.on("exit", (code, signal) => {
  if (tunnel && !tunnel.killed) {
    tunnel.kill("SIGTERM");
  }
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

async function pollQuickTunnel() {
  const url = `http://127.0.0.1:${METRICS_PORT}/quicktunnel`;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (shuttingDown || !tunnel || tunnel.exitCode !== null) return;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        const data = await response.json();
        if (typeof data?.hostname === "string" && data.hostname.trim()) {
          const host = data.hostname.trim().replace(/^https?:\/\//i, "");
          console.log(`[tunnel] Public URL ready: https://${host}`);
          return;
        }
      }
    } catch {
      // Tunnel is still initializing.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

const tunnelEnabled = !isDisabled(process.env.ENABLE_TUNNEL ?? "true");
const token = (process.env.CLOUDFLARED_TOKEN ?? "").trim();

if (!tunnelEnabled) {
  console.log("[tunnel] Disabled via ENABLE_TUNNEL=false");
} else if (!fs.existsSync(CLOUDFLARED_BIN)) {
  console.warn(`[tunnel] ${CLOUDFLARED_BIN} not found; running without tunnel`);
} else {
  const args = token
    ? [
        "tunnel",
        "--no-autoupdate",
        "--metrics",
        `127.0.0.1:${METRICS_PORT}`,
        "run",
        "--token",
        token,
      ]
    : [
        "tunnel",
        "--no-autoupdate",
        "--metrics",
        `127.0.0.1:${METRICS_PORT}`,
        "--url",
        `http://127.0.0.1:${PORT}`,
      ];

  console.log(
    token
      ? "[tunnel] Starting Cloudflare Tunnel with CLOUDFLARED_TOKEN..."
      : "[tunnel] Starting Cloudflare Quick Tunnel (set ENABLE_TUNNEL=false to disable)...",
  );

  tunnel = spawn(CLOUDFLARED_BIN, args, {
    stdio: "inherit",
    env: process.env,
  });

  tunnel.on("error", (err) => {
    console.warn(`[tunnel] Failed to start cloudflared: ${err.message}`);
  });

  tunnel.on("exit", (code, signal) => {
    if (!shuttingDown) {
      console.warn(
        `[tunnel] cloudflared exited (code=${code}, signal=${signal}); web server stays online`,
      );
    }
  });

  if (!token) {
    void pollQuickTunnel();
  }
}
