# linkedin-stats

Scrapes your LinkedIn Creator analytics pages in parallel and generates a dark, interactive Chart.js dashboard — all in one `pnpm dev`.

## What it does

1. **Authenticates** to LinkedIn (cookie restore → credential login → manual headed fallback)
2. **Scrapes 3 analytics pages in parallel** using independent Playwright browser sessions
   - Content analytics (impressions, engagements)
   - Audience analytics (follower growth)
   - Demographic analytics (industries, job titles, seniorities, locations)
3. **Saves** combined data to `./data/analytics-data.json`
4. **Generates** a dark Chart.js dashboard at `./output/dashboard.html`
5. **Auto-opens** the dashboard in your default browser

## Prerequisites

- Node.js 20+
- pnpm 10.28.1
- A LinkedIn account with Creator analytics access

## Setup

```bash
pnpm install
cp .env.example .env
# Fill in your LinkedIn credentials in .env
```

### Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `LINKEDIN_USERNAME` | No | — | LinkedIn email (skips credential login if unset) |
| `LINKEDIN_PASSWORD` | No | — | LinkedIn password |
| `LINKEDIN_COOKIE_PATH` | No | `./data/session_cookies.json` | Where to save/load session cookies |
| `LINKEDIN_HEADLESS` | No | `true` | Set to `false` to watch the browser |
| `LINKEDIN_LOGIN_TIMEOUT_SECONDS` | No | `120` | Seconds to wait for manual login |

## Usage

### Scrape & view dashboard

```bash
pnpm dev
```

Authenticates, scrapes, generates `output/dashboard.html`, and opens it automatically.

### View existing dashboard (no re-scrape)

```bash
pnpm view
# or
pnpm dashboard
```

### Build for production

```bash
pnpm build
pnpm start
```

## Project structure

```
linkedin-stats/
├── src/
│   ├── index.ts                              # Entry point — wires all services/features, reads process.env
│   ├── services/
│   │   └── browser/
│   │       └── index.ts                      # Chromium service (anti-detection, shared context)
│   └── features/
│       ├── linkedin-auth/
│       │   └── index.ts                      # 3-path auth: cookies → credentials → manual headed
│       ├── linkedin-analytics/
│       │   └── index.ts                      # Orchestrator: triggers auth → scrape → persist → emit
│       ├── linkedin-scraper/
│       │   ├── index.ts                      # Parallel Promise.allSettled across 3 sessions
│       │   ├── content-analytics.ts          # Scrapes impressions & engagement data
│       │   ├── audience-analytics.ts         # Scrapes follower growth data
│       │   ├── demographic-analytics.ts      # Scrapes industry/job/seniority/location data
│       │   ├── auth.ts                       # Cookie loading & injection helpers
│       │   ├── browser.ts                    # Standalone browser session factory
│       │   └── types.ts                      # All TypeScript types
│       └── dashboard-generator/
│           ├── index.ts                      # Listens on analytics-complete, writes + opens HTML
│           └── template.html                 # Dark Chart.js 4.x dashboard template
├── data/
│   └── session_cookies.json                  # Saved cookies (auto-created, gitignored)
├── output/
│   └── dashboard.html                        # Generated dashboard (auto-created)
├── .env                                      # Local secrets (gitignored)
├── .env.example                              # Template for .env
└── package.json
```

## Authentication flow

The `linkedin-auth` feature tries three paths in order, stopping at the first success:

1. **Cookie restore** — loads `session_cookies.json`, injects into the browser context, navigates to `/feed/` to validate. If valid, proceeds immediately (no login required).
2. **Credential login** — fills the LinkedIn login form with `LINKEDIN_USERNAME` / `LINKEDIN_PASSWORD`. If a security challenge is detected, relaunches a headed browser so you can solve it manually.
3. **Manual headed login** — opens a visible Chromium window and waits up to `LINKEDIN_LOGIN_TIMEOUT_SECONDS` for you to log in yourself.

After any successful login, the full `Cookie[]` array is saved to disk for the next run.

## Dashboard charts

| Chart | Type | Data source |
|---|---|---|
| Daily Impressions | Line | Content analytics |
| Follower Growth | Line | Audience analytics |
| Daily Engagements | Grouped bar | Content analytics |
| Job Titles | Horizontal bar | Demographic analytics |
| Industries | Doughnut | Demographic analytics |
| Seniority | Doughnut | Demographic analytics |
| Locations | Horizontal bar | Demographic analytics |

## Development scripts

| Script | Description |
|---|---|
| `pnpm dev` | Scrape + generate + open dashboard |
| `pnpm view` | Open existing dashboard without re-scraping |
| `pnpm dashboard` | Alias for `pnpm view` |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run compiled build |
| `pnpm type-check` | TypeScript type checking |
| `pnpm lint` | Biome linter |
| `pnpm lint:fix` | Biome linter with auto-fix |
| `pnpm format` | Biome formatter |
| `pnpm test` | Run Vitest tests |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:coverage` | Coverage report |
| `pnpm check` | type-check + tests + lint all at once |

## Architecture

See [`docs/ai/architecture.md`](docs/ai/architecture.md) for the full architecture description including the Mermaid flow diagram.

## Tech stack

- **Runtime**: Node.js + TypeScript (ESM, strict mode)
- **Framework**: [hook-app](https://www.npmjs.com/package/hook-app) — event-driven hook architecture
- **Browser automation**: [Playwright](https://playwright.dev/) (Chromium)
- **Dashboard**: Chart.js 4.x (CDN, no build step)
- **Linting/Formatting**: Biome
- **Testing**: Vitest
- **Git hooks**: Husky + lint-staged

## License

ISC
