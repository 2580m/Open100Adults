# Route B Preparation Roadmap (`dev` Branch)

> **Status: PREPARED / PAUSED** — Do **NOT** begin Route B rewrites yet.
> Route A (`main`, `v1.0.0`) delivers 100% 1:1 original site parity. This `dev` branch preserves the clean-room Next.js (`web/`) architecture and CI/CD pipeline (`ghcr.io/2580m/open100adults:dev`) ready for future Route B work pending explicit user approval.

## Planned Parity & Rebuild Checklist (Paused)

- [ ] **`/sundome/remote` 4-Step Wizard (1/4 – 4/4)**
  - Rebuild the step-by-step wizard (role selection -> opponent mode public/private -> session preferences/wishes/body focus -> room link & waiting lobby).
- [ ] **`/sundome/c` Controller Console & Spectator Queue**
  - Match original UI layout, 50+ quick commands, beat/BPM drive controls, stamina/edge limits, private chat & canned phrases (`say`/`line`), and spectator queue (`watch`/`queue`).
- [ ] **`/sundome` Solo Edging Game Parity**
  - Match full-screen video background overlay, sample video picker (`/api/sundome-lab/*`), local video upload, settings drawers, shuttle voice audio, and finish/ruined/denied states.
- [ ] **`/sundome/p` Partner Synchronized Mode**
  - Deterministic seed/clock-based dual-device synchronized instruction schedule and share link generation.
- [ ] **Remaining Games & Tools Parity**
  - Align all `/tools/*` and story/game routes under `web/` to match original mechanics, typography, and bilingual (`en` / `zh`) strings 1:1.
