# IMD Agent Tracker design system

## Overview

The dashboard helps visitors find an IMD agent and understand its work. The visual idea is a small, inhabited isometric office inside a calm dark dashboard: mint signals the primary action and active work, while the data remains conventional and readable. The SVG scene is intentionally illustrative; agent IDs and statuses come from the public feed.

The implemented hierarchy is product identity, search, network summary, office/activity, and the full directory. Detail views use a native dialog. This is a single dark theme and an English-language interface. There is no wallet or transaction flow.

The source of truth is `src/styles.css`, with reusable markup in `src/components/` and the page-level patterns in `src/App.tsx`.

Runtime notices are bundled in `public/THIRD-PARTY-LICENSES.txt`; Manrope’s license is in `public/fonts/OFL.txt`. Design-guide attribution is recorded in the README and `licenses/design-guidance.txt`.

## Colors

All UI colors use hexadecimal semantic tokens in `src/styles.css:9`. Components consume the tokens directly. The SVG illustration has a separate artwork palette; its colors do not encode additional data.

| Token | Value | Role |
| --- | --- | --- |
| `--color-page` | `#101313` | Page background |
| `--color-surface` | `#191e1c` | Stats, activity, dialog, and field surfaces |
| `--color-raised` | `#232b27` | Selected neutral controls and icon discs |
| `--color-hover` | `#29362e` | Control hover fill |
| `--color-border` | `#303a34` | Structural dividers and panel outlines |
| `--color-text` | `#eef3ee` | Primary text |
| `--color-muted` | `#a1afa5` | Secondary labels and prose |
| `--color-dim` | `#8b9b90` | Captions and timestamps |
| `--color-accent` | `#a1f6c6` | Find button, active/accepted states, links |
| `--color-accent-hover` | `#c0ffda` | Primary action hover |
| `--color-on-accent` | `#152c20` | Text on mint buttons |
| `--color-accent-soft` | `#203c2d` | Working badge and selected navigation |
| `--color-lavender` | `#c9b7ee` | Running task steps and work icons |
| `--color-peach` | `#edc18f` | Accepted-submission metric icon |
| `--color-warning` | `#f2cc91` | Saved/stale feed and retry notices |
| `--color-error` | `#ffb7ac` | Search validation error |
| `--color-focus` | `#a1f6c6` | Keyboard focus perimeter |

Status also has text and/or an icon; mint alone never determines a state. The primary filled action is **Find**. Bookmarks and active navigation use quieter semantic fills.

Measured from the rendered export: Find text/background **11.69:1**, caption/surface **5.78:1**, secondary label/surface **7.39:1**. See `artifacts/design-inspection.json`. The probe also passed all measured solid-background text pairs. These results do not claim measurements for every artwork pixel or translucent overlay.

## Typography

Manrope is served from `public/fonts/manrope-latin.woff2` and copied to `dist/fonts/`. It is a variable upright font; the UI uses **400, 500, and 700**, with Arial/sans-serif fallbacks. It is preloaded in `index.html` and uses `font-display: swap`. Browser font loading was confirmed.

| Token | Value at the default 16 px root | Usage |
| --- | --- | --- |
| `--text-xs` | 12 px | Dense dashboard labels, timestamps, badges |
| `--text-sm` | 14 px | Controls, directory identity, supporting copy |
| `--text-base` | 16 px | Mobile inputs and section/task text |
| `--text-lg` | 20 px | Directory headings and larger task headings |
| `--text-xl` | 28 px | Metric values, desktop agent identity, mobile page heading |
| `--text-display` | 36 px | Desktop page heading |

The dashboard deliberately uses compact 12/14 px UI text; expanded task briefs use 14 px with 1.7 line height and a 65ch maximum. Body line height is 1.5. The large heading uses 1.15 and −0.045em tracking, reduced to −0.04em at 28 px. Section headings use 1.3 and −0.025em. Headings balance; paragraphs use pretty wrapping. Counts, time values, and pagination use tabular numerals.

Critical agent IDs are fully visible. Long task briefs wrap with `overflow-wrap: anywhere`. Activity summaries are intentionally shortened to 105 characters, with links to the original public records; directory task names lead to the full agent dialog. Some IMD history briefs arrive abbreviated by the source itself.

## Layout

The page and header have a **1392 px maximum width**, centered. Desktop horizontal padding is 48 px; the main top padding is 36 px. The recurring spacing increments are 4, 8, 12, 16, 20, 24, 32, and 48 px. Sections have more separation than the controls within them.

The desktop summary is four equal columns with 16 px gaps. The office/activity grid is `1.8fr 1fr`, with 24 px gaps and a 300 px minimum activity column. Directory rows share a six-column grid. Controls sit immediately above the content they affect.

| Breakpoint | Implemented behavior |
| --- | --- |
| ≤1160 px | 32 px page padding, denser navigation/table, narrower office/activity gap |
| ≤900 px | 24 px page padding, 28 px page title, office/activity stack, two-column activity list, last-active table column concealed |
| ≤650 px | 20 px page padding; stacked search; two-by-two metrics; header section navigation concealed; one-column activity; filter and sort rows stack; directory rows become labeled mobile records |
| ≤360 px | 16 px page padding; smaller avatar and control gaps; decorative filter icon concealed |

The office SVG uses an 800 × 390 coordinate system. Desktop agent buttons sit over actual featured avatars. At ≤650 px, six agent buttons move into a three-column grid below the artwork and become **44 px tall**. They no longer overlap the scene or one another. The alternate list view exposes the same six agents.

The filter group wraps when text is enlarged. Mobile input and select text is at least 16 px. The modal is inset 20 px on desktop and 12 px on phones, capped by `100dvh`, and scrolls internally. The background is locked while the native dialog is open.

Observed widths: 320, 390, 768, 1024, and 1440 px, in Chromium and WebKit. At 390 px, product identity begins at y=20 and the Find action ends at approximately y=254; both are on the first screen. Root text enlargement to 200% passed separately from the viewport checks. Native browser zoom and RTL/localization were not exercised.

## Elevation & Depth

The interface is mostly flat: tone separates stats, a one-pixel border defines panels, and thin dividers structure lists. Components do not combine decorative borders and box shadows. Depth belongs to the original office artwork, using isometric faces, a floor shadow, and a subtle radial light inside the SVG.

The modal uses a dark 80% backdrop and 4 px backdrop blur. Native `<dialog>` places it in the browser top layer. The skip link and invalid-link message have small explicit stacking levels; routine content stays in normal flow.

## Shapes

The radius tokens are **8 px** for controls, **12 px** for cards/fields/table, and **16 px** for office/activity panels. Inner filter segments use 5 px radii. Status badges are 5 px rectangles with textual state; small circles indicate activity. The desktop detail dialog has a 20 px radius, reduced to 16 px on mobile. Avatars and the favicon repeat the rounded-square form.

## Components

| Component/pattern | Source | Behavior and reuse |
| --- | --- | --- |
| Search and primary action | `src/App.tsx`, `.search-form`, `.primary-button` | Persistent visible label; numeric ID keyboard; Enter submits; invalid input gets `aria-invalid`, an associated error, and focus. Exact registered/seat IDs open the agent. |
| Directory | `src/App.tsx`, `.directory-table`, `.table-row` | Accessible table roles; status filters, sort, pagination, and clearable empty states. Each row has a named native agent button and bookmark toggle. |
| Status | `src/App.tsx` `Status`, `.status-badge` | Working, Queued, and Idle variants. Text reinforces color; the meaning of Idle is explained in details. |
| Office and avatars | `src/components/Office.tsx` | `Office({agents,onSelect})` takes up to six actual seats; `Avatar({id,size})` renders a stable decorative illustration. Native HTML buttons, not pointer-only SVG targets, perform selection. |
| Activity row | `src/App.tsx` `ActivityRow` | Agent events open an agent dialog; job events link to the public record. Expand/collapse changes how many feed records are shown. |
| Agent dialog | `src/components/AgentDetail.tsx` | Native modal semantics, initial focus on Close, Tab containment, Escape/backdrop close, trigger focus return. Current task and history use native pressed buttons. Briefs expand with native `<details>`. |
| Progress | `src/components/AgentDetail.tsx`, `src/data.ts` `progressOf` | Native `<progress>` plus completed/total steps and actual step states. Unavailable information gets a textual explanation, never an invented percentage. |
| Public data states | `src/useSwarm.ts`, `.connection-bar`, `.notice` | Loading, live, paused, dated snapshot, failure, and retry states. Refreshes leave data in place; the label states its freshness. |
| Icon | `src/components/Icon.tsx` | One original SVG outline family, currentColor, 1.7 px strokes, decorative `aria-hidden`. Buttons supply accessible names. |

All focusable controls use a **2 px mint outline with 4 px offset** through `:focus-visible`; forced-colors mode uses `Highlight`. The primary and modal close rings were visually inspected. There are no entrance animations. Hover/color transitions last 150 ms with `cubic-bezier(.2,0,0,1)` only when motion is allowed; eligible buttons scale to .96 when pressed. The refresh spinner is the only repeating animation and is absent under reduced motion.

## Do’s and Don’ts

- Reuse semantic colors and the six typography tokens. Keep status text alongside color.
- Keep search and primary data on the first mobile screen. Let filter groups and long task content wrap.
- Reuse native buttons, anchors, dialog, details, and progress rather than recreating their keyboard behavior.
- Preserve source timestamps and clearly distinguish snapshots from successful live responses. Treat task text as text, never HTML.
- Keep new actions neutral unless they are the view’s primary action. Put decorative depth in the artwork, not on every data surface.
- Do not infer offline state from idle work, invent task percentages, or make local bookmarks appear shared.

For another dashboard section, start with `.section-heading`, one of the existing list/grid patterns, semantic tokens, and native controls. Test the section at 320 and 390 px, keyboard-only, with enlarged text, and in both engines; document any new token or genuine reusable component here.
