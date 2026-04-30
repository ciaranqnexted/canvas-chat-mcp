# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo shape

Single Next.js 15 app at `frontend/`. All server logic (auth, chat orchestration, local document retrieval, future Canvas MCP calls) lives behind Next.js App Router route handlers in `frontend/src/app/api/`. There is **no separate backend service** — a previous FastAPI path was retired. Treat the repo root as docs/config/scratch and `frontend/` as the deployable unit.

Top-level layout:

```
frontend/          Next.js app (the only deployable)
local-documents/   dev-time corpus for local-mode chat (gitignored content)
prompts/system/    student-chat-system.md — the chatbot's system prompt (versioned)
prompts/evals/     prompt eval fixtures (JSON)
docs/              architecture, runbook, env, ADRs in docs/decisions/
scripts/           one-off MCP test harnesses (Node script + static HTML page)
.env.example       template — copy to frontend/.env.local
```

## Commands

All commands run from `frontend/`:

```bash
npm install
npm run dev         # Next dev server on :3000  → open /chat
npm run build
npm run start
npm run lint        # next lint (eslint-config-next)
npm run typecheck   # tsc --noEmit
```

There is **no test runner configured yet** — do not invent `npm test` invocations. If adding tests, pick one and document it here.

`.env.local` lives at `frontend/.env.local` and must be created from `.env.example` at the repo root (`cp ../.env.example .env.local` from inside `frontend/`). Next.js only reads env at server start — restart `npm run dev` after edits.

## Three-mode chat model

`/api/chat` accepts `mode: "local" | "canvas" | "auto"`. Current behaviour in `frontend/src/app/api/chat/route.ts`:

- **local**: keyword search over `LOCAL_DOCUMENTS_DIR` (default `../local-documents`). Supports `.md|.txt|.json|.csv` only. Returns up to 3 matches with `{title, path, snippet}` citations, or a "could not find" reply with empty citations.
- **canvas**: reads sealed Canvas session cookie. Returns `401 {source: "auth_required"}` when absent; otherwise returns a placeholder reply — **MCP tool calls are not yet wired**.
- **auto**: not implemented in the route yet (anything not `"canvas"` is treated as `"local"`).

When you wire Canvas MCP, do it inside this route by reading `getCanvasSessionFromRequest(request)` and dispatching to a server-only client under `frontend/src/lib/server/canvas/`.

## Canvas auth & session sealing

Implemented in `frontend/src/lib/server/canvas-session.ts`:

- OAuth flow: `/api/auth/canvas/start` → Canvas → `/api/auth/canvas/callback`. State is stored in a short-lived `canvas_oauth_state` cookie and must round-trip.
- The Canvas access token is **sealed** (AES-256-GCM with a key derived from `SESSION_SECRET` via SHA-256) and stored in an HTTP-only `canvas_session` cookie with 8h max-age. Format: `iv.tag.ciphertext` in base64url.
- `getCanvasSessionFromRequest(req)` is the only sanctioned way to read it. **Never expose tokens to the browser, in URLs, in logs, or in route responses.** `/api/auth/me` deliberately returns only display state.
- Refresh-token handling is **not implemented** — sessions expire. If you add refresh, gate it behind `expiresAt` in `CanvasSession`.
- `canvasAuth=missing_config` query param on `/chat` means one of `SESSION_SECRET` / `CANVAS_BASE_URL` / `CANVAS_CLIENT_ID` / `CANVAS_CLIENT_SECRET` is empty.

## Canvas MCP integration plan (read this before touching MCP code)

Per `docs/decisions/2026-04-28-canvas-mcp-fork.md`, this app intentionally targets a **trimmed fork** of `vishalsachdev/canvas-mcp` exposing **only four read-only tools**, using upstream names verbatim (no renaming wrappers in this repo):

- `list_courses`
- `list_assignments`
- `list_discussion_topics` (must be called with `only_announcements=true` — enforced via system prompt today; tighten in the fork before production)
- `get_my_course_grades`

The MCP client must **validate the advertised tool list at connect time and fail closed** if it sees write-capable tools or anything outside the four. `CANVAS_MCP_COMMAND` is the stdio entry for local dev; production may use a remote HTTP MCP endpoint.

Working test harnesses for a remote MCP at `CANVAS_MCP_URL` (Streamable HTTP, JSON-RPC, SSE-framed responses) live at:

- `scripts/test-mcp.mjs` — Node script, no deps, posts `initialize` → `notifications/initialized` → `tools/call`. Auth via `x-canvas-url` and `x-canvas-token` headers; session id from `mcp-session-id` response header threads into subsequent calls.
- `scripts/test-mcp.html` — same protocol, in the browser. Use this if Node hits `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` (corporate root CA — Node uses bundled certs, browsers/curl use the OS keychain).

Treat these as reference for the protocol shape when writing the production client under `frontend/src/lib/server/canvas/`.

## Server module conventions

- Anything that touches secrets, the filesystem, or external services goes under `frontend/src/lib/server/`. Import from route handlers only.
- Route handlers that need Node APIs (crypto, fs) must export `export const runtime = 'nodejs'` (see the chat route).
- The path alias `@/` resolves to `frontend/src/`.
- `frontend/src/lib/api.ts` is the **client**-side fetch wrapper used by `useChat` — keep it free of server-only imports.

## Non-negotiable data rules

These come from `DESIGN.md` and `docs/architecture.md` — apply them when reviewing or writing code:

- Canvas tokens stay server-side. Never log, return, or embed in URLs.
- The Canvas integration is **read-only**. Do not add write-capable tools to the allowed surface.
- Local-mode answers must include citations when evidence is found, and must say "I could not find that in the provided documents" otherwise. Don't fabricate.
- Server logs must not include student messages, tokens, names, or email addresses.
- `local-documents/` and `.data/` are dev artifacts — keep them gitignored.

## Useful pointers

- System prompt (Eddie persona, evidence rules, out-of-scope script): `prompts/system/student-chat-system.md`
- Phased plan: `docs/implementation-plan.md`; current state and next slices: `docs/next-steps.md`
- Env reference (every var, where it's used, and why each is required): `docs/environment.md`
- Common dev failures and fixes: `docs/runbook.md`
