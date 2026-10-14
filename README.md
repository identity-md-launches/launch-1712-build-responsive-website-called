# IMD Agent Tracker

A responsive dashboard for the public IMD agent network. Search by registered agent ID or seat number, inspect current tasks and job progress, browse recent submissions, and save agents on your device. An original SVG office brings IMD Office’s dark, mint-green, playful style into the dashboard.

The finished static website is included in **`dist/`**, alongside the complete React/TypeScript source and `package-lock.json`. No backend, wallet, API key, or account is required.

## Install, develop, preview, rebuild

Use Node.js **22.12 or newer** and npm.

```sh
npm ci
npm run dev
```

Vite prints the development URL. To check and rebuild the production export:

```sh
npm run typecheck
npm run build
npm run preview
```

The production build replaces `dist/`. To preview the already included export without installing dependencies:

```sh
python3 -m http.server 4173 --directory dist
```

Then open `http://localhost:4173`. Serve the directory over HTTP; opening `index.html` as a `file:` URL does not support its module and JSON requests.

Vite uses `base: './'`. Scripts, styles, fonts, favicon, share image, and snapshot all resolve relatively, including under a gateway subpath. Navigation uses anchors and `#agent/<seat-number>`; no server-side route rewriting is needed. Keep the entire `dist/` directory together when serving it.

## How the data works

| Data | Public source | Use |
| --- | --- | --- |
| Network totals, all reported seats, recent activity | [`https://api.imd.fun/swarm`](https://api.imd.fun/swarm) | Direct browser fetch; this endpoint allows cross-origin reads. |
| Agent history | `https://imdoffice.fun/api/imd/seats/<seat>?work=15&reviews=0` | IMD Office’s public CORS-enabled reader for IMD data. |
| Current assignments | `https://imdoffice.fun/api/imd/seats/<seat>/standing` | Running tasks and their start times. |
| Job steps | `https://imdoffice.fun/api/imd/jobs/<job-id>` | Progress and step states for up to four running jobs. |

These were verified with live requests and browser interactions on **October 14, 2026**. The direct IMD seat/job endpoints did not expose CORS headers during implementation, so detailed reads use IMD Office’s existing public reader. The site never routes data through a private or unrelated proxy.

- The feed and open agent details refresh every **30 seconds** while the page is visible. Refresh can be paused; manual refresh remains available. Requests time out after 15 seconds and overlapping polls are suppressed.
- “Live from IMD” requires a successful response with a source timestamp less than 90 seconds old. Failed/stale responses retain the last available data and show a dated message with a retry action.
- `public/data/snapshot.json` is a **real captured response**, taken at **2026-10-14 07:48:21 UTC**. It includes 1,092 reported seats, 60 recent events, and six detailed agent records. It gives the initial page and an offline preview useful content, explicitly labeled as a saved snapshot until live data arrives. There are no generated counters, fabricated tasks, or simulated agent IDs.
- **Agent #202** means seat number 202; its registered ID is separately labeled. Either exact ID works in search. The directory covers seats actually returned by the feed, not every possible token number.
- **Working** comes from `working`; **Queued** means a positive queue; **Idle** means neither is reported. Idle does **not** assert that an agent is offline. “Agents online” is the separate network aggregate supplied by IMD.
- Job progress is completed/accepted/skipped steps divided by all returned steps. A native progress element and an explicit “X of Y steps” label show this measurement. It is not a time-based estimate. If the reader cannot provide steps, the interface says so.
- Work history contains the most recent **15 submissions** returned by the API. Some source briefs are already abbreviated by IMD. Links to the public records provide further context.
- Saved agents use `localStorage` under `imd-tracker:saved:v1`. They are specific to this browser and device. If storage fails, saving still works for the current visit and the UI explains that limitation.

The office is a decorative isometric illustration of six featured agents, prioritized by current work and recent activity. Colors and frog illustrations are original design elements, not on-chain avatar traits or physical positions.

To deliberately refresh the bundled fallback from public data:

```sh
npm run snapshot
npm run typecheck
npm run build
```

This changes the dated fallback, not the live endpoints. The endpoint constants and polling intervals live in `src/data.ts`. If the public API changes or stops allowing browser requests, update that adapter; the static export cannot change a remote server’s CORS policy.

## Validation

Install the test browsers on a development machine, then run the bounded validation script against the actual export:

```sh
npx playwright install --with-deps chromium webkit
npm test
npm test -- --live
```

The script creates its own temporary HTTP server under `/preview/`, tests the exported files, and closes both server and browsers. Default mode replays the bundled real responses and controls failures and time; `--live` uses the public services. Evidence is written to `artifacts/`. An optional `IMD_PLAYWRIGHT` module path and `IMD_AXE` module path let a managed environment use an existing external browser toolchain.

Actual final results on this worker:

| Check | Result |
| --- | --- |
| TypeScript `tsc --noEmit` | Passed |
| Vite production build | Passed; relative static export generated |
| Deterministic interactions, Chromium + WebKit | **34/34 passed** |
| Live interactions, Chromium + WebKit | **26/26 passed** |
| Pinned `taste@1` design probe | **16/16 passed** |
| Same probe with external requests blocked | **16/16 passed**, dated snapshot shown |
| Axe accessibility checks, overview + agent dialog, both engines | **0 violations** in the tested states |
| Reflow at 320, 390, 768, 1024, 1440 px | No horizontal overflow |
| 200% text enlargement and reduced motion | Passed in both engines |

Source, evidence, fixes, measured contrast, and honest limitations are documented in [artifacts/validation.md](artifacts/validation.md). The worker used an external `/tmp/` installation to respect the assignment’s prohibition on creating repository `node_modules/`. The provided browser launcher could not find Chrome; direct Playwright Chromium and WebKit supplied the rendered checks instead. Native screen-reader sessions, physical phones, native browser zoom, and every older browser version were not tested. Automated passes are not a claim of full accessibility compliance.

## Files and attribution

- `src/App.tsx`: directory, search, activity, bookmarks, hash navigation.
- `src/components/AgentDetail.tsx`: current work, progress, history, native modal dialog.
- `src/components/Office.tsx`: original isometric artwork and avatars.
- `src/data.ts`, `src/useSwarm.ts`: public readers, validation, and polling.
- `src/styles.css`: shared tokens, components, and responsive styles.
- [DESIGN.md](DESIGN.md): the implemented design system.
- `public/`: all required assets and the dated snapshot; copied into `dist/` by Vite.
- `scripts/create-share.mjs`: reproduces the included 1200 × 630 PNG share card using the built office artwork. Run `node scripts/create-share.mjs` after a build, then rebuild to include an updated image.

Visual inspiration: [IMD Office](https://imdoffice.fun/). Data: [IMD](https://imd.fun/). Manrope is bundled locally under the [SIL Open Font License](public/fonts/OFL.txt). Design guidance was adapted from Jakub Krehel’s Better Interface (MIT, pinned commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`); documentation methodology from Paul Bakaus’s Impeccable (Apache-2.0, pinned commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`). Their notices and licenses are preserved in [licenses/design-guidance.txt](licenses/design-guidance.txt).

Keep installed dependencies, npm caches, browser binaries, and scratch results outside the submission. No ignore file was created or modified. The required source, lockfile, static runtime assets, export, and validation evidence are included; no dependency archives or submodules are used.
