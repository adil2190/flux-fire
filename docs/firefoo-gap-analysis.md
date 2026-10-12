# Fluxfire vs. Firefoo — feature gap analysis

Firefoo (desktop Firestore client, v1.5.11) is the reference product for Fluxfire's Firestore browser. This document lists what Firefoo does that Fluxfire does not, so we can decide what to build. It is a list of **capabilities to consider**, not a spec to copy. Each item will get its own design.

## How this was compiled

- Source: the user-facing strings, menu labels and feature names in the installed Firefoo app bundle, plus the install's `package.json`. No Firefoo code is reproduced here.
- Fluxfire side: read from this repo at `feat/design-revamp` (8d7bc31). **CLAUDE.md is out of date** on a few points — see [Fluxfire today](#fluxfire-today).
- Limits: this is inferred from labels and menu wiring, not from using every feature in a running app. Some Firefoo features may be gated by its license tier, and I haven't verified which. Treat depth ("how well does it do X") as unknown unless stated.

## Fluxfire today

What exists, so the gaps below are measured against reality:

| Area | Status |
| --- | --- |
| Project picker, project switching | Done |
| Collections tree (collections → docs → subcollections), collapsible | Done |
| Multiple tabs (open / close / new) | Done — no split view, no tab context menu |
| Documents table: column resize, row select, pagination (page-token stack) | Done |
| Query builder: filters (incl. unary ops, `in`, `array-contains*`), order-by, limit, collection-group | Done; no OR/AND groups in the UI even though `queries.ts` can emit composite filters |
| Document inspector: edit fields with typed editor (all 11 Firestore types), add/rename/delete field, subcollections tab, raw JSON (read-only) | Done |
| New document dialog (auto-ID) | Done |
| Delete document, bulk delete with progress | Done |
| Export selected/loaded docs as JSON or CSV; copy IDs | Done (client-side, in-memory) |
| `/query` workbench: target path + builder + results + copy request | Done — CLAUDE.md still calls this a placeholder |
| Error UX: permission denied, missing scope, "create index" link | Done |
| Light/dark theme | Done |
| `/auth` page | **Placeholder** |

## Gaps

Priority is my suggestion: **P1** = most users of a Firestore admin tool will expect it; **P2** = strong differentiator or frequent power-user need; **P3** = niche or high cost.

### 1. Data movement (largest gap)

| # | Firefoo capability | Fluxfire | Priority |
| --- | --- | --- | --- |
| 1.1 | **Import** JSON and CSV into a collection, with options: overwrite vs. skip existing, auto-ID, custom target path | none | P1 |
| 1.2 | CSV import column mapping: per-column allowed types, fallback when a cell can't be parsed (skip row / null / string), empty-string behaviour, separator choice, type detection (dates, booleans, ints, maps, UUIDs, enums), optional prefix for reference values | none | P1 (with 1.1) |
| 1.3 | **Export a whole collection or all collections**, not just loaded rows; include subcollections; limit docs per collection; multiple formats (JSON, CSV, newline-delimited JSON, compressed archive for large sets) | exports only what is already loaded in the table, JSON/CSV | P1 |
| 1.4 | CSV export options: split map fields into separate columns, choose which columns, export maps as JSON, timezone/date format, mono font and colour-scheme options for output | basic CSV only | P2 |
| 1.5 | **Export query results**, not only a path (full result set, ignoring the limit) | partial (loaded rows) | P2 |
| 1.6 | **Data transfer between projects** (copy collections/docs from project A to project B), with limits, "clean target first", custom destination paths, parallelism, saved transfer definitions | none | P2 |
| 1.7 | Copy / move / duplicate a **document or collection** within a project (including subcollections) | none | P1 |
| 1.8 | **Rename or delete a field across all documents** in a collection | none | P2 |
| 1.9 | Background **task manager**: long operations (import, export, delete, transfer) run as cancellable tasks with progress, history, and resource locking so two tasks can't fight over a path | bulk delete has a toast only | P1 if 1.1–1.7 are built |
| 1.10 | Delete a **whole collection** (with option to delete subcollections) | only per-document delete | P1 |

### 2. Querying and browsing

| # | Firefoo capability | Fluxfire | Priority |
| --- | --- | --- | --- |
| 2.1 | **JavaScript query editor** — write a script against the data instead of using the form; run/stop; separate from the simple builder, with optional auto-conversion between the two | none | P2 (see feasibility note) |
| 2.2 | **Saved queries** (name, overwrite, rename, list in sidebar, open by name) | none | P1 |
| 2.3 | **Query history** | none | P3 |
| 2.4 | AND/OR filter groups in the UI | rest layer supports it, UI doesn't | P2 |
| 2.5 | **Estimated document count** for a collection | none | P2 |
| 2.6 | **Schema analyzer** side pane — samples documents and shows field names/types/frequency; configurable sample size, re-run | `collectFieldPaths` only feeds autocomplete | P2 |
| 2.7 | Hide / reorder / save **column configurations** per collection; "find column"; split map into columns | resize only | P1 |
| 2.8 | Click column headers to **sort** (translates to order-by) | order-by only via builder | P2 |
| 2.9 | **Tree/JSON views** of a document, edit-as-JSON, copy field name/value/path, duplicate field, change a field's type by clicking it | typed editor and read-only raw JSON | P1 for edit-as-JSON |
| 2.10 | Preview **images** from blob/URL fields; show **geopoints on a map** / open in Maps | none | P3 |
| 2.11 | Document ID validation; reference fields that open the target doc | partial (reference type exists in editor) | P2 |
| 2.12 | **Quick Open** command palette (jump to a collection, saved query, tab, project) and a full **keyboard shortcut** set | none | P2 |
| 2.13 | Tab **context menu** (close others / left / right, duplicate, rename), **split view** with two tab groups | basic tabs | P3 |

### 3. Authentication (Firebase Auth users)

Fluxfire's `/auth` page is a placeholder. Firefoo has a full user manager:

| # | Capability | Priority |
| --- | --- | --- |
| 3.1 | List users with search (email / phone / UID), sort (created, last login, email, UID, display name), pagination | P1 |
| 3.2 | View and edit a user: display name, email, phone, photo, verified flag, disabled flag, password reset, **custom claims**, provider list | P1 |
| 3.3 | Create and delete users | P1 |
| 3.4 | Export users (JSON and CSV compatible with the Firebase CLI `auth:import` format) and import users, including password-hash configuration (algorithm, key, salt, rounds, memory cost) | P2 |
| 3.5 | Copy users to another project | P3 |
| 3.6 | Script editor for user queries using the Admin SDK | P3 |
| 3.7 | "Authentication not enabled" and "enable providers in console" empty states with deep links | P1 (cheap) |

### 4. Other Firebase products Firefoo covers

| # | Capability | Priority |
| --- | --- | --- |
| 4.1 | **Cloud Functions** viewer: list functions, with metrics (invocations, active instances, etc.), logs, and details | P3 |
| 4.2 | **Realtime Database** browser and query | P3 |
| 4.3 | **Storage** — I found no Cloud Storage browser UI in Firefoo's strings (only bundled library code), so not treated as a gap | n/a |
| 4.4 | Security rules editor — no UI for it found either; stays out of scope | n/a |

### 5. Connections, projects and safety

| # | Capability | Fluxfire | Priority |
| --- | --- | --- | --- |
| 5.1 | **Firebase Emulator** connection (URL, refresh, unload) | none (and CLAUDE.md says out of scope) | P2 — decision needed |
| 5.2 | **Service-account key** login as an alternative to Google OAuth, multiple accounts at once | OAuth only | P2 — security-sensitive, see below |
| 5.3 | **Read-only projects**, with a "projects read-only by default" setting and clear UI when a project is locked | none | P1 — cheap and prevents mistakes |
| 5.4 | **Project colours** and per-project settings to avoid editing prod by accident | none | P2 |
| 5.5 | Confirmation prompts with "ask before / don't ask again for 15 minutes" and a "cautious" mode for destructive actions | single confirm dialog | P2 |
| 5.6 | Multiple databases per project | `(default)` only | P2 |
| 5.7 | Request/response **log pane** | "Copy request" on `/query` only | P3 |
| 5.8 | Settings: auto-update, release channel, time zone for date display, hints toggle, default output panel | theme only | P3 (several don't apply to a web app) |

### 6. Not applicable to a web app

Licensing/activation flow, auto-update and release channels, native menus, "Chat with Support", local file dialogs (replace with browser upload/download). Not gaps.

## Cosmetic and UX improvements

Small and mostly independent of the feature work above. Two sources: things Firefoo does that make data easier to read and safer to edit, and rough edges I found by reading Fluxfire's components. I have not looked at either app rendered, so visual judgements here are from code and labels. A screenshot pass would sharpen the list.

Effort: **S** = hours, **M** = a day or two.

### Reading data

| # | Improvement | Why | Effort |
| --- | --- | --- | --- |
| C1 | **Colour cells by data type** (strings, numbers, booleans, null, timestamps, references each distinct). Firefoo has a "colour scheme in output" setting for this. Today every cell is the same grey monospace via `formatCell` in `documents-table.tsx`. | Scanning a table for a wrong type (a number stored as a string) is hard when everything looks alike. Pair with a muted style for `—` (missing) vs. `null`. | S |
| C2 | **Type-aware cell formatting**: timestamps in a readable local format with the raw ISO value on hover, numbers right-aligned, booleans as a small badge or check, long strings truncated with a visible ellipsis and a click-to-expand preview. Firefoo exposes timezone and fractional-digit display options. | Timestamps currently show as raw ISO strings. | M |
| C3 | **Rich cell tooltip / expand** instead of the native `title` attribute, which is slow to appear, unstyled, and unusable on touch and for keyboard users. Show full value, type and a copy button. | Cells are cut at 300px. | S |
| C4 | **Sticky header and sticky first column** (checkbox + Document ID) in the documents table. | With many columns, the ID scrolls out of view and you lose which row you're in. | S |
| C5 | **Density toggle** (compact / comfortable) and an optional mono-font toggle for results. | Firefoo exposes "mono font in output". Useful when screens are small or the dataset is wide. | S |
| C6 | **Column controls**: header menu with sort, hide, pin, auto-fit width (double-click the resize handle). Fluxfire has resize only. | Overlaps with gap 2.7 and 2.8. | M |

### Loading, empty and end states

| # | Improvement | Why | Effort |
| --- | --- | --- | --- |
| C7 | **Skeleton rows** in the documents table and tree instead of a single spinner. There is no skeleton primitive in `components/ui/` yet (`npx shadcn@latest add skeleton`). | Keeps layout stable and feels faster than a centred "Loading documents...". | S |
| C8 | **Informative empty states with a next step.** "No documents" is a bare line. Say whether the collection is empty or the query matched nothing, and offer "Add document" or "Reset filters". Firefoo's empty states also tell you which icon to click (for example for saved queries). | Dead ends are the main source of confusion in a data browser. | S |
| C9 | **End-of-collection message**: show that you've reached the end, and the total when known. Firefoo says so explicitly. Fluxfire only disables Next. | Users can't tell "no more pages" from "still loading". | S |
| C10 | **Keep previous results visible while the next page loads** (dimmed) rather than blanking the table. | Avoids flicker on pagination and filter edits. | S |

### Editing and feedback

| # | Improvement | Why | Effort |
| --- | --- | --- | --- |
| C11 | **Keyboard shortcuts with visible hints**: Cmd/Ctrl+Enter to save in the inspector (Firefoo shows the shortcut in the Save tooltip), Esc to close, Cmd/Ctrl+W to close a tab, Cmd/Ctrl+K for a command palette. `command.tsx` already exists in `components/ui/`, so a palette is mostly wiring. | There are no shortcuts anywhere today. | M |
| C12 | **Explain disabled buttons.** Firefoo puts a reason on them ("Project is readonly", "Data is set to readonly"). Fluxfire's buttons just grey out. | Pairs with read-only projects (5.3). | S |
| C13 | **Unsaved-changes guard** in the inspector: dot on the tab or header, and a prompt when navigating away or closing with edits. Changed fields could be highlighted. The draft reducer already tracks dirty fields. | Prevents silent loss of edits. | S |
| C14 | **Right-click / "more" menus** on documents, collections and fields (open in new tab, copy path, copy ID, delete, duplicate). `dropdown-menu.tsx` is available; none are used in `components/firestore/` yet. | Firefoo puts most actions in context menus, which also gives a home for the new features in section 1. | M |
| C15 | **Copy affordances everywhere**: small copy-on-hover buttons for document IDs, paths and field values, with a short "Copied" confirmation. | Frequent task; currently only "Copy request" on `/query`. | S |
| C16 | **Edit raw JSON** with syntax highlighting, validation and line numbers (the Raw JSON tab is read-only plain text). | Overlaps with gap 2.9. | M |
| C17 | **Undo toast for deletes** (soft undo window before issuing the delete) or at least name the deleted item in the toast. | Destructive actions are the highest-stakes moment in the app. | M |

### Orientation and chrome

| # | Improvement | Why | Effort |
| --- | --- | --- | --- |
| C18 | **Clickable breadcrumb** for the current path (`users / abc / orders`) with a copy-path button, plus a path box where you can type or paste. Firefoo has "enter path to collection, doc, or subcollection". | The URL is the source of truth, so this is cheap, and it makes deep paths navigable. | S |
| C19 | **Project identity cues**: per-project colour or environment label (prod / staging) in the sidebar header and tab bar. Firefoo has project colours. | Cuts the chance of editing the wrong project. | S |
| C20 | **Tab polish**: right-click menu (close others / duplicate / rename), drag to reorder, restore tabs on reload, middle-click to close. | Fluxfire has open/close/new only. | M |
| C21 | **Collections tree**: filter box, expand/collapse all, remember expanded state per project, refresh button. | Large projects have long lists. | S |
| C22 | **Settings that matter for display**: density, timezone, type colours, date format, "show hints". Currently Settings holds only the theme. | Gives C1, C2 and C5 a home. | S |
| C23 | **Consistent toast and error tone.** Messages like "Unable to delete the document. Try again." don't say why. Include the Firestore reason (permission, not found, index) where known. | The error banners are already good for permission and index errors; extend that to write failures. | S |

### Accessibility and responsiveness

Fluxfire already does well here (labelled controls, focus rings, keyboard-resizable columns, `aria-current` on the open row). Worth keeping that bar for new work:

- Whole-row click-to-open is mouse-only; keep the ID button as the keyboard path and add arrow-key row navigation (S–M).
- Test the three-panel Firestore layout at narrow widths: the inspector could become a sheet like `/query` already does (M).
- Respect `prefers-reduced-motion` for spinners and transitions (S).

The repo already has `better-ui`, `better-layout`, `better-accessibility` and `web-design-guidelines` skills; running one over `components/firestore/` after the changes above would be a reasonable review step.

## Feasibility notes for Fluxfire's architecture

These are my assessments from the current design (browser → REST with the user's OAuth token), not verified against live APIs.

- **Import/export at scale (1.1–1.3, 1.6):** the Firestore REST `commit`/`batchWrite` calls fit import and transfer; limits are 500 writes per commit and the browser's memory. Large exports and imports will need streaming, chunking and resume. Firestore's managed export/import (to Cloud Storage) is a different mechanism that needs additional scopes and is not what Firefoo's file-based flow does.
- **Task manager (1.9):** build this first. Import, export, bulk delete and transfer all need cancellation, progress and failure reporting, and `use-batch-commit.ts` is a starting point.
- **Auth (section 3):** needs the Identity Toolkit / Admin-style REST endpoints and likely new OAuth scopes. Per CLAUDE.md, adding a scope forces existing users to re-sign-in, so batch scope changes.
- **JavaScript editors (2.1, 3.6):** Firefoo runs scripts against the Admin SDK in a desktop process. A browser app can't offer the same thing safely. Options are a restricted sandbox over our REST client, or skip it. Needs a design decision.
- **Service-account keys (5.2):** storing a private key in the browser, or sending it to a server, changes the security model — Fluxfire currently never holds long-lived credentials. This should be a deliberate decision, not a quiet add-on.
- **Emulator (5.1):** a hosted web app calling a developer's `localhost` emulator hits browser restrictions (mixed content, CORS, Private Network Access). It may be better suited to a locally-run Fluxfire.

## Suggested order

0. **Quick UX wins alongside everything else:** C1, C4, C7, C8, C9, C12, C13, C18, C19 (all small).
1. **Safety and basics (small):** read-only projects (5.3), delete collection (1.10), edit document as JSON (2.9), saved queries (2.2), column show/hide/reorder (2.7).
2. **Task manager (1.9)**, then **import and full export** (1.1–1.3), then copy/move/duplicate (1.7).
3. **Authentication users** (section 3, P1 rows), starting with list/search/view and then edit, create and delete.
4. Power features: schema analyzer, doc count, AND/OR UI, field rename/delete across docs, project-to-project transfer, command palette.
5. Decide explicitly on emulator, service-account login, and scripting before starting them.

## Open questions

- Is Fluxfire meant to match Firefoo's feature breadth, or stay a lighter hosted tool? This changes the priority of sections 4 and 5.
- Are there Firefoo features your team actually uses that I haven't listed? Real usage should outrank this label-based inventory.
- Should CLAUDE.md be updated now to reflect `/query`, tabs, bulk delete and export? It currently describes them as missing or placeholder.
