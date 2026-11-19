# 100Adults — clean Next.js rebuild

A clean **Next.js App Router + TypeScript + Tailwind CSS** source rebuild of the
100Adults tool site. Everything lives in this `web/` folder; the mirror in
`../public/`, `../server.mjs` and the root `../package.json` are not modified.

The rebuild is ad-free: no ad networks, analytics, affiliate links or sister-site
promotions are included.

## Requirements

- Node.js 20+ (developed on Node 24)
- npm 10+

## Commands

```bash
npm install
npm run dev        # http://localhost:3000  (redirects / → /en)
npm run typecheck  # tsc --noEmit
npm run build      # production build
npm start          # serve the production build
```

## Routes

| Route | Description |
| --- | --- |
| `/[lang]` | Home: tool index, about, FAQ (`en`, `zh`) |
| `/[lang]/sundome` | Edging game: metronome, speech, draw, custom commands, video |
| `/[lang]/sundome/[variant]` | `women` / `gay` / `lesbian` game entry |
| `/[lang]/sundome/remote` | Remote play controller / receiver |
| `/[lang]/sundome/remote/list` | Rooms waiting for commands |
| `/[lang]/shuttle` | Interval beep test (21 levels) |
| `/[lang]/shuttle/[variant]` | Variant entry |
| `/[lang]/board` | Edges & Ladders board game with 3D die |
| `/[lang]/streak` | NoFap streak counter (localStorage, calendar, export) |
| `/[lang]/size` | Size percentile calculator |
| `/[lang]/stamina` | Stamina percentile calculator |
| `/[lang]/partners` | Body-count percentile calculator |
| `/[lang]/story` | Interactive story index |
| `/[lang]/story/[slug]` | Interactive story player |
| `/[lang]/2257`, `/[lang]/dmca` | Legal pages |

## API routes

- `GET /api/sundome-lab/[...path]` — proxies `https://100adults.com/api/sundome-lab/*`
  with a 5-minute, 100-entry in-memory cache. The `samples` payload is sanitized to
  remove affiliate fields before it reaches the browser.
- `GET|POST /api/story-vote` — in-memory vote counts.
- `GET|POST /api/sundome-request` — in-memory request log.
- `GET|POST|DELETE /api/rgate/[...path]` — in-memory remote-play rooms
  (`rooms`, `rooms/:code`, `rooms/:code/commands`).

Story text is generated from the mirror into `src/data/stories/{en,zh}/` (44 English
and 98 Chinese stories). The regeneration scripts are in `scripts/`:

```bash
node scripts/extract-stories.mjs ../public/_next/static/chunks/0j8u09o6h63fd.js
node scripts/build-stories.mjs
```

Each story is split into its own JSON so only the selected story is sent to the
player; the index imports metadata only.

## Data and privacy

Percentile calculators run entirely in the browser. The streak log and game
settings use `localStorage` / `sessionStorage` only. No analytics or tracking is
loaded.
