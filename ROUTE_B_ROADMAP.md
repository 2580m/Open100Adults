# Route B Architecture & Parity Checklist (`dev` Branch)

> **Status: IMPLEMENTED ON `dev`** — 100% Dynamic Source-Code Architecture (`Next.js 16 + custom-server.mjs + /rws WebSocket + cloudflared`), with `main` (`v1.0.1` Route A) preserved untouched.

## Completed Milestones

- [x] **Real-Time WebSocket Backend (`web/custom-server.mjs`)**
  - Unified HTTP + WebSocket server running standard Next.js `.next` production build with `/rws` rooms, lobby, watch/queue promotion, `/api/rgate/public-url` Cloudflare Tunnel detection, `/voice/*` & `/story-voice/*` proxy, and sanitized `/api/sundome-lab/*` video catalog.
- [x] **`/sundome/remote` 4-Step Wizard (1/4 – 4/4 & `#control` 2/2)**
  - Restored exact step-by-step flow (Role -> Public/Private -> Body/Settings/Wishes/Limits/Extensions -> Waiting Lobby + Auto-start), `#control` live lobby + invite link creator, and `#join.<room>.<key>` direct join.
- [x] **`/sundome/c` Controller Console & Spectator Queue**
  - Restored `.rp` / `.rp-hero` / `.rp-deck` (`disc` Dial & `slider` Bar layouts), 6 drive levels + `+20` up to 300 BPM, 5-level grip, 170 quick phrases across 12 categories + customizable Favorites, private `say` input, `allow`/`deny` verdicts, `extend`/`restart` penalties, `now` release, `thx` replies, desktop keyboard shortcuts, and live `RemoteWatch` + FIFO `RemoteFull` queue takeover.
- [x] **`/sundome` Solo Edging Game Parity**
  - Full-screen `[data-sundome="play"]` + `[data-sundome-bg]` stage, dim slider, fit toggle, pause-on-stop, double-tap `±10s` seek flash, `browse` video catalog, Chinese actor `/voice/zh/*` MP3 cue playback with SpeechSynthesis fallback, `.rr` player reaction drawer + `ReactSettingsModal`, and `<SundomeArc>` arousal curve on finish.
- [x] **`/sundome/p` Partner Synchronized Mode**
  - Deterministic `mulberry32(seed)` command schedule aligned to `startAt` clock with pre-start countdown and mid-session auto-sync.
- [x] **Shuttle & Stories Voice Polish + Bilingual Streamlining**
  - `/voice/shuttle/*` decoded `AudioBuffer` cues in `ShuttleGame`, `/story-voice/*` optional narration lookup in `StoryPlayer`, strictly bilingual (`en` / `zh`) with zero ads or tracking scripts.
