# Tierboxd

Turn your Letterboxd ratings into tier lists — or build movie tier lists from scratch. Search, rank, and export as image, CSV, or JSON.

![License: MIT](https://img.shields.io/badge/License-MIT-e6a53c.svg)
![React 19](https://img.shields.io/badge/React-19-149eca.svg)
![Vite 8](https://img.shields.io/badge/Vite-8-646cff.svg)

Tierboxd is a privacy-first web app for movie rankings. Import your Letterboxd data and your ratings become a tier list automatically, or create lists like "Best of 2026" by searching and browsing TMDB. Everything is stored in your browser; the TMDB key stays on the server.

## Features

- **Import from Letterboxd** — drop your export ZIP and get a tier list in seconds.
- **Auto-fill tiers by rating** — each film lands in its matching star tier.
- **Custom lists** — multiple lists with names, templates (Stars, S/A/B/C/D, numeric) and full editing.
- **Search & browse TMDB** — add any movie or show, or browse popular titles by year.
- **Drag & drop** — reorder and move films between tiers.
- **Export** — high-resolution PNG, Letterboxd-compatible CSV, and JSON for backup/sharing.
- **Privacy-first** — no accounts, no database; data lives in `localStorage`.
- **Server-side TMDB proxy** — the API key never reaches the browser, with caching and per-IP rate limiting.

## Screenshots

> Screenshots coming soon.

<!--
Add screenshots here:
| Home | Tier board |
| --- | --- |
| ![](docs/home.png) | ![](docs/board.png) |
-->

## Quick start

```bash
git clone https://github.com/yorch519/tierboxd.git
cd tierboxd
npm install
cp .env.example .env
# add your TMDB API key to .env
npm run dev
```

Open http://localhost:5173.

> Local development uses Vite's dev proxy and does not need Vercel or Upstash.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `TMDB_API_KEY` | Yes (server) | TMDB API key (v3) used by the serverless proxy. |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis REST URL, enables per-IP rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis token. |
| `RATE_LIMIT_PER_MIN` | No | Requests per minute per IP (default `600`). |
| `RATE_LIMIT_ENABLED` | No | Set to `false` to disable rate limiting (0 Redis commands). |

See `.env.example` for a template.

## How it works

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS, state with Zustand and persistence in `localStorage`.
- **Serverless API:**
  - `api/tmdb.ts` proxies TMDB search/discover/detail requests, enforces an endpoint and parameter allowlist, caches responses on the CDN, and rate-limits per IP with Upstash.
  - `api/image.ts` proxies poster images so canvas exports work without CORS issues.
- **No secrets in the client:** the TMDB key is read from the server environment. Users can optionally provide their own key, which is stored locally and sent through the proxy.

## Privacy

- Your Letterboxd data and tier lists never leave your browser.
- The shared TMDB key lives only in the server environment.
- Optional personal keys stay in `localStorage` and are only sent to TMDB through the proxy.
- There is no account system or database storing your lists.

## Deploy on Vercel

1. Import the repository into Vercel (framework: **Vite**).
2. Add `TMDB_API_KEY` (and optionally the Upstash variables) under **Settings → Environment Variables**.
3. Deploy. `vercel.json` already sets the build command and output directory.

Production notes:

- The TMDB proxy caches successful responses (`search`/detail for 7 days, `discover` for 1 day).
- Rate limiting is enabled by default when Upstash is configured and fails open if it is unavailable.

## Scripts

```bash
npm run dev      # start Vite dev server
npm run build    # type-check and build
npm run lint     # run oxlint
npm run preview  # preview the production build
```

## Roadmap

- [x] Letterboxd import and automatic tier assignment
- [x] Multiple lists and tier templates
- [x] TMDB search and browse by year
- [x] PNG, CSV and JSON export
- [x] Server-side TMDB proxy with caching and rate limiting
- [ ] Undo/redo and bulk actions
- [ ] Keyboard and mobile support
- [ ] Automated tests and CI
- [ ] Offline poster cache (PWA)

## Credits & attribution

This product uses the [TMDB API](https://www.themoviedb.org/) but is not endorsed or certified by TMDB. Tierboxd is not affiliated with Letterboxd.

Built with AI assistance; design, decisions, and maintenance by [yorch519](https://github.com/yorch519).

## License

[MIT](LICENSE) © 2026 yorch519
