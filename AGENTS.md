# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project

Fluxfire is a Next.js admin panel for Firebase. Users sign in with Google, Fluxfire uses the resulting OAuth access token to call the Firebase Management API on the user's behalf, and the user picks one of their own Firebase projects to manage (Firestore browser, Auth, ad-hoc queries). There is no application database — Firebase is both the data store being administered and the source of project metadata.

## Commands

- `npm run dev` — Next dev server on http://localhost:3000
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (uses `eslint.config.mjs` + `eslint-config-next`)

There is no test runner configured.

Required env vars (in `.env.local`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, plus the standard NextAuth vars (`AUTH_SECRET`, `NEXTAUTH_URL`).

## Architecture

**Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui (new-york style, neutral base).** Path alias `@/*` maps to the repo root.

### Auth and the OAuth token contract

[lib/auth.ts](lib/auth.ts) is the heart of the app. It is a NextAuth v5 setup with Google as the only provider, requesting these extra scopes so the access token can call Google/Firebase APIs:

- `https://www.googleapis.com/auth/firebase` (project listing/management)
- `https://www.googleapis.com/auth/datastore` (Firestore CRUD via REST)
- `https://www.googleapis.com/auth/cloud-platform.read-only`

The JWT callback stores `accessToken` / `refreshToken` / `expiresAt` on the token and refreshes against `https://oauth2.googleapis.com/token` when expired. The session callback exposes `session.accessToken` to **both server (`auth()`) and client (`useSession()`)** — typed via a `declare module "next-auth"` augmentation in the same file. Two consumption patterns exist:

- **Server-side, for Firebase Management API** — API routes call `auth()` and forward `session.accessToken` to googleapis (see [app/api/projects/route.ts](app/api/projects/route.ts), [app/api/projects/[projectId]/config/route.ts](app/api/projects/%5BprojectId%5D/config/route.ts)).
- **Client-side, for Firestore REST** — the Firestore browser calls `firestore.googleapis.com/v1` directly from the browser using the same token. See "Firestore REST data plane" below.

Any new scope must be added to `authorization.params.scope` in `lib/auth.ts` and existing users must re-sign-in to grant it (the page surfaces a re-auth banner via `scope-banner.tsx` on `PERMISSION_DENIED`).

**Why not the Firebase JS SDK?** It authenticates against Firebase Auth (security rules), not GCP IAM. For an admin tool the user expects their IAM role on the project to apply, so all Firestore traffic goes through the REST API. The `firebase` npm dependency is unused.

### Routing layout

- [middleware.ts](middleware.ts) gates everything: unauthenticated users go to `/login`, authenticated users hitting `/login` or `/` are sent to `/projects`. The matcher excludes `_next/*` and `/api/*` except `/api/auth`.
- [app/projects/page.tsx](app/projects/page.tsx) — post-login project picker. It is **not** under the `(dashboard)` group because it has its own header/layout (no sidebar yet — there's no project selected).
- [app/(dashboard)/](app/%28dashboard%29/) — route group with the [Sidebar](components/layout/sidebar.tsx) chrome. Pages: `firestore` (Firefoo-style data browser, full), `settings` (full), `auth` and `query` (placeholders).
- The `firestore` page intentionally breaks out of the dashboard's `p-6` padding via `-m-6` to claim its full content area for the three-panel layout.
- API routes proxy Firebase Management API: `GET /api/projects` lists active projects; `GET /api/projects/[projectId]/config` resolves a web-app config (returns a partial config + warning if the project has no web app). Firestore traffic does **not** flow through these routes — see below.

### State: Zustand store + React Query

Two layers, do not conflate them:

- [stores/project-store.ts](stores/project-store.ts) — Zustand store persisted to `localStorage` under key `fluxfire-project`. Holds the **selected project**, its resolved Firebase web config, and emulator settings (`useEmulator`, `emulatorPorts.firestore`, `emulatorPorts.auth`). Dashboard pages read from here; if `selectedProject` or `firebaseConfig` is null, they show an empty state and expect the user to go through `/projects`.
- [hooks/use-projects.ts](hooks/use-projects.ts) — TanStack Query hooks (`useProjects`, `useProjectConfig`) that hit the API routes above. Query defaults are configured in [components/providers.tsx](components/providers.tsx): `staleTime` 1m, `gcTime` 5m, `refetchOnWindowFocus: false`, query retry 1, mutation retry 0.

The flow on `/projects`: user clicks a card → `selectedProjectId` triggers `useProjectConfig` → on success, both project and config are written into the Zustand store and the user is pushed to `/firestore`.

### Firestore REST data plane

The Firestore browser is a vertical slice with its own conventions — read these before adding features there.

- **Transport:** all Firestore reads/writes go from the browser directly to `firestore.googleapis.com/v1/projects/{p}/databases/(default)/documents`, using `session.accessToken` as a bearer. The emulator URL substitutes `http://localhost:{port}`. Only the `(default)` database is supported (the constant lives in [lib/firestore/client.ts](lib/firestore/client.ts) and can be parameterized later).
- **Module layout** (each is small and single-responsibility — keep it that way):
  - [lib/firestore/client.ts](lib/firestore/client.ts) — fetch wrapper. Built once per render via [hooks/firestore/use-firestore-session.ts](hooks/firestore/use-firestore-session.ts), which reads token + projectId + emulator settings.
  - [lib/firestore/encoding.ts](lib/firestore/encoding.ts) — REST `Value` ↔ `FieldValue` discriminated union ([types/firestore.ts](types/firestore.ts)). Integers are kept as **strings** to avoid 53-bit truncation; respect this when adding editors.
  - [lib/firestore/paths.ts](lib/firestore/paths.ts) — collection vs doc detection (odd vs even segment count), parent walks, URL encoding per segment.
  - [lib/firestore/queries.ts](lib/firestore/queries.ts) — `QueryState` → `structuredQuery` body. `effectiveOrderBy` injects `__name__ asc` when none is specified (required for stable cursor pagination).
  - [lib/firestore/errors.ts](lib/firestore/errors.ts) — `FirestoreError` class. Regex-extracts the `create_composite=…` URL from `FAILED_PRECONDITION` bodies so `scope-banner.tsx` can render a "Create index" button.
- **Hooks** ([hooks/firestore/](hooks/firestore/)) wrap each REST call as a TanStack Query hook. The cache-key prefix is always `["firestore", projectId, kind, …]` — preserve this when adding hooks so `qc.invalidateQueries({ queryKey: ["firestore", projectId] })` continues to work after writes. Mutation hooks invalidate the relevant doc, parent collection browse, and any active query.
- **Page state model** ([app/(dashboard)/firestore/page.tsx](app/%28dashboard%29/firestore/page.tsx)): the URL is the source of truth (`?path=users/abc`, `?cg=1`). Per-collection state (query, selection, page-token stack, failed paths) lives in an inner `<CollectionView>` component that's **keyed on `${path}|${cg}`**, so navigating between collections resets state via remount instead of an effect — important to avoid React's `set-state-in-effect` warning that surfaced earlier in this codebase. Pagination tracks a stack of `pageToken` values; **don't reintroduce a `useEffect` that pushes the next token**, just push it on the Next button click.
- **OAuth scope dependency:** the Firestore browser requires `auth/datastore`. If a user has an old session without it, `PERMISSION_DENIED` is shown via `scope-banner.tsx` with a re-auth button.
- **Out of scope** (don't assume these exist): realtime listeners (REST has no `Listen`), transactions, aggregation queries, security-rules editor, indexes management UI (we link out only), import.

### UI conventions

- shadcn/ui components live in [components/ui/](components/ui/) and are generated via the shadcn CLI (config in [components.json](components.json)). Add new primitives with `npx shadcn@latest add <name>` rather than hand-rolling.
- `cn()` from [lib/utils.ts](lib/utils.ts) is the standard `clsx + tailwind-merge` helper used everywhere for conditional classes.
- Toasts use `sonner` — the `<Toaster />` is mounted once in `Providers` ([components/providers.tsx](components/providers.tsx)). Import `toast` from `sonner` directly, not from a wrapper.
- Tooltips need `<TooltipProvider>` to be in scope — already mounted in `Providers`, so just use `<Tooltip>` directly.
- Icons are `lucide-react`.
- Any client component that uses `useSearchParams()` must be wrapped in `<Suspense>` or Next 16's static export will fail at build time. See `FirestorePage` for the pattern.

### Things that don't exist yet (so don't assume them)

- The `firebase` npm dep is installed but unused — Firestore goes through REST (see above). Don't reach for the JS SDK.
- The `auth` and `query` dashboard pages are placeholders.
- No theme provider despite the settings UI showing Light/Dark/System buttons (they're inert).
- No tests, no Storybook, no CI config in this repo.
