# Architecture

## Overview

`linkedin-stats` is a TypeScript Node.js application built on the **hook-app framework**. It scrapes LinkedIn Creator analytics in parallel using Playwright, persists the results as JSON, and renders a self-contained Chart.js dashboard.

The entire codebase follows hook-app's event-driven, plugin-style architecture: one **service** provides shared browser infrastructure, four **features** handle all business logic, and they communicate exclusively through hooks and shared context — never via direct imports between features.

---

## System flow diagram

```mermaid
flowchart TD
    ENV[.env and environment variables]
    ENTRY[src/index.ts - entry point]

    subgraph LIFECYCLE[hook-app lifecycle]
        direction TB

        subgraph SVC[Services - infrastructure]
            BROWSER[browser service - src/services/browser]
        end

        subgraph FEAT[Features - business logic]
            direction TB
            AUTH[linkedin-auth - src/features/linkedin-auth]
            ANALYTICS[linkedin-analytics - src/features/linkedin-analytics]
            SCRAPER[linkedin-scraper - src/features/linkedin-scraper]
            DASHBOARD[dashboard-generator - src/features/dashboard-generator]
        end
    end

    subgraph OUT[Outputs]
        COOKIES[data/session_cookies.json]
        JSON_OUT[data/analytics-data.json]
        HTML_OUT[output/dashboard.html]
        BROWSER_WIN[default browser - auto-opened]
    end

    ENV --> ENTRY
    ENTRY --> LIFECYCLE
    BROWSER -->|browser.context and browser.instance| AUTH
    AUTH -->|linkedin.page and linkedin.authenticated| ANALYTICS
    ANALYTICS -->|calls scrapeLinkedInAnalytics| SCRAPER
    ANALYTICS -->|linkedin-analytics-complete hook| DASHBOARD
    AUTH --> COOKIES
    ANALYTICS --> JSON_OUT
    DASHBOARD --> HTML_OUT
    DASHBOARD --> BROWSER_WIN
```

---

## Lifecycle sequence

hook-app runs each phase before moving to the next. Services always initialise before features.

```mermaid
sequenceDiagram
    participant main as src/index.ts
    participant happ as hook-app
    participant browser as browser service
    participant auth as linkedin-auth
    participant analytics as linkedin-analytics
    participant scraper as linkedin-scraper
    participant dash as dashboard-generator

    main->>happ: hookApp(services, features, settings)

    Note over happ,browser: INIT_SERVICE phase
    happ->>browser: INIT_SERVICE - log init

    Note over happ,browser: START_SERVICE phase
    happ->>browser: START_SERVICE - launch Chromium
    browser-->>happ: setContext browser.instance and browser.context

    Note over happ,dash: INIT_FEATURE phase - parallel
    happ->>auth: INIT_FEATURE - log
    happ->>analytics: INIT_FEATURE - log and registerHook
    happ->>dash: INIT_FEATURE - log

    Note over happ,dash: START_FEATURE phase
    happ->>analytics: START_FEATURE
    analytics->>happ: createHook.serie RUN_AUTH
    happ->>auth: RUN_AUTH handler

    alt Path 1 - valid cookies on disk
        auth-->>auth: inject cookies and validate session
    else Path 2 - credentials in .env
        auth-->>auth: fill login form headless
    else Path 3 - no credentials
        auth-->>auth: open headed browser, wait for user
    end

    auth-->>happ: setContext linkedin.page and linkedin.authenticated
    auth-->>auth: save session_cookies.json

    analytics->>scraper: scrapeLinkedInAnalytics(cookiePath, headless)

    par 3 parallel Playwright sessions
        scraper-->>scraper: session 1 - content-analytics
    and
        scraper-->>scraper: session 2 - audience-analytics
    and
        scraper-->>scraper: session 3 - demographic-analytics
    end

    scraper-->>analytics: LinkedInAnalyticsResult
    analytics-->>analytics: write data/analytics-data.json
    analytics->>happ: createHook.sync linkedin-analytics-complete
    happ->>dash: linkedin-analytics-complete handler
    dash-->>dash: inject JSON into template.html
    dash-->>dash: write output/dashboard.html
    dash-->>dash: open in default browser

    Note over happ,browser: FINISH phase
    happ->>browser: FINISH - close Chromium
```

---

## Module map

### `src/index.ts` — entry point

The **only** file that reads `process.env`. Passes all config as settings into `hookApp()`. Registers the browser service and all four features.

### `src/services/browser/` — Browser service

| Hook | Action |
|---|---|
| `$INIT_SERVICE` | Logs initialisation |
| `$START_SERVICE` | Launches Chromium with anti-detection args; stores `browser.instance`, `browser.context`, `browser.headless` in context |
| `$FINISH` | Closes the browser cleanly |

### `src/features/linkedin-auth/` — Authentication

Handles the `$RUN_AUTH` custom hook (triggered by `linkedin-analytics`). Implements three fallback paths:

| Path | Trigger | Mechanism |
|---|---|---|
| Cookie restore | `session_cookies.json` exists | `browserContext.addCookies()` → navigate to `/feed/` to validate |
| Credential login | `LINKEDIN_USERNAME` + `LINKEDIN_PASSWORD` set | Fill login form headlessly; security challenge → headed fallback |
| Manual headed login | No credentials | Close headless browser, relaunch headed, wait for user |

Saves the full Playwright `Cookie[]` array to disk after any successful login.

### `src/features/linkedin-analytics/` — Orchestrator

Runs on `$START_FEATURE`:
1. Fires `$RUN_AUTH` (sequential via `createHook.serie`)
2. Calls `scrapeLinkedInAnalytics()` from the scraper feature
3. Writes `data/analytics-data.json`
4. Emits `linkedin-analytics-complete` so the dashboard generator picks it up

Also registers the `linkedin-analytics-complete` custom hook so hook-app knows about it.

### `src/features/linkedin-scraper/` — Parallel scraper

Pure functions — no hook registrations. Called directly by `linkedin-analytics`.

Uses `Promise.allSettled` to run three fully independent Playwright sessions simultaneously. A failure in one scraper does not abort the others; errors are collected in `result.errors`.

| File | Responsibility |
|---|---|
| `index.ts` | `scrapeLinkedInAnalytics()` — orchestrates the three sessions |
| `content-analytics.ts` | Impressions, engagements, engagement rate |
| `audience-analytics.ts` | Follower growth, lifetime follower count |
| `demographic-analytics.ts` | Industries, job titles, seniorities, functions, locations |
| `auth.ts` | `loadCookies()` / `injectCookies()` — per-session cookie injection |
| `browser.ts` | `createBrowserSession()` — standalone session factory |
| `types.ts` | All shared TypeScript interfaces |

### `src/features/dashboard-generator/` — Dashboard

Listens on `linkedin-analytics-complete`. Reads `template.html`, replaces the `__ANALYTICS_DATA__` placeholder with the serialised JSON, writes `output/dashboard.html`, then calls `open()` to launch it in the default browser.

---

## Context keys

All shared state lives in hook-app context (a typed key-value store). Features never import each other's internals.

| Key | Type | Set by | Read by |
|---|---|---|---|
| `browser.instance` | `Browser` | browser service | linkedin-auth (to replace with headed on manual login) |
| `browser.context` | `BrowserContext` | browser service | linkedin-auth (Path 1, 2) |
| `browser.headless` | `boolean` | browser service | — |
| `linkedin.page` | `Page` | linkedin-auth | (available for future use) |
| `linkedin.authenticated` | `boolean` | linkedin-auth | (available for future use) |

---

## Data types

```
LinkedInAnalyticsResult
├── content: ContentAnalytics | null
│   ├── impressions: DailyMetric[]      { date, value }
│   ├── engagements: DailyMetric[]
│   ├── totalImpressions: number
│   ├── totalEngagements: number
│   ├── engagementRate: number
│   └── capturedAt: string
├── audience: AudienceAnalytics | null
│   ├── followerGrowth: DailyMetric[]
│   ├── lifetimeFollowerCount: number
│   └── capturedAt: string
├── demographics: DemographicAnalytics | null
│   ├── industries: DemographicEntry[]  { label, count, percentage }
│   ├── jobTitles: DemographicEntry[]
│   ├── locations: DemographicEntry[]
│   ├── functions: DemographicEntry[]
│   ├── seniorities: DemographicEntry[]
│   └── capturedAt: string
├── scrapedAt: string                   ISO timestamp
└── errors: string[]                    per-scraper error messages
```

---

## Design rules

- **`process.env` only in `src/index.ts`** — everything else uses `getConfig()`
- **No direct imports between features** — communication via hooks and context only
- **No `any`, no `@ts-ignore`, no non-null assertions (`!`)**
- **`.js` extensions on all relative imports** (ESM compatibility)
- **`$INIT_*` hooks are sync-only** — async work goes in `$START_*`
- **pnpm only** — never npm or yarn
