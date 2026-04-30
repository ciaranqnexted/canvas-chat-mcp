# canvas-chat-mcp

Student-facing Next.js chatbot for querying either:

- documents in a local folder, for unauthenticated study support
- Canvas student profile data through an email-led Canvas MCP lookup flow

The repo is now focused on a single Next.js web app. The previous FastAPI backend path has been retired so authentication, chat orchestration, local document retrieval, and Canvas MCP access can live behind Next.js server routes.

## Current Status

This is a focused app scaffold, not a production chatbot yet.

Built now:

- Next.js chat UI under `frontend/src/app/chat`
- server-side `/api/chat` route with basic local text-document retrieval
- Canvas OAuth start/callback/logout/me routes with sealed HTTP-only session cookies
- Nexi v0.2 student verification flow: Canvas email lookup, simulated OTP, verified session, and guided dashboard buttons
- server-only Canvas MCP student adapter for profile, courses, enrolments, and grades/results
- Canvas-specific system prompt in `prompts/system/student-chat-system.md`

Next implementation work:

1. Add student-scoped assignments, deadlines, and announcements MCP tools.
2. Add course selection and course Q&A context.
3. Add a real local document index for PDF, DOCX, Markdown, and text.
4. Add LLM response synthesis with citations from local documents or Canvas tool results.
5. Replace the simulated OTP flow with OAuth, SSO, LTI, or real OTP before production.

## Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Canvas MCP server
- Anthropic Claude for response synthesis

## Quick Start

```bash
cd frontend
npm install
cp ../.env.example .env.local
npm run dev
```

Open `http://localhost:3000/chat`.

For local document search, place Markdown, text, JSON, or CSV files in `local-documents/` at the repo root, or set `LOCAL_DOCUMENTS_DIR` in `frontend/.env.local`.

For Canvas profile lookup, set `CANVAS_MCP_URL`, `CANVAS_MCP_CANVAS_URL`, `CANVAS_MCP_TOKEN`, and the `NEXI_*` prototype verification variables in `frontend/.env.local`. See [Environment Variables](./docs/environment.md).

## Vercel Deployment

This repo keeps the Next.js app in `frontend/`. The root [vercel.json](./vercel.json) tells Vercel to install and build from that folder.

Set the same server-side variables in the Vercel project environment that you use locally, including:

- `CANVAS_MCP_URL`
- `CANVAS_MCP_API_PATH`
- `CANVAS_MCP_CANVAS_URL`
- `CANVAS_MCP_TOKEN`
- `CANVAS_MCP_BEARER_TOKEN` if the MCP deployment requires it
- `NEXI_OTP`
- `NEXI_DEV_OTP` or `NEXI_OTP_DEFAULT`
- `NEXI_ALLOW_PROTOTYPE_OTP=true` while testing simulated OTP on Vercel

## Project Structure

```text
frontend/              Next.js app, API routes, chat UI, server-only auth helpers
local-documents/       local files for development-time document querying
prompts/               student chat system prompt and prompt eval notes
docs/                  architecture, runbook, env guide, and implementation plan
```

## Key Files

| Path | Purpose |
|---|---|
| `frontend/src/app/chat/page.tsx` | Chat page route |
| `frontend/src/components/features/chat/ChatWindow.tsx` | Chat UI, source mode, Canvas verification flow and dashboard actions |
| `frontend/src/app/api/chat/route.ts` | Main chat API route |
| `frontend/src/lib/server/canvas/mcp-http-client.ts` | HTTP MCP client for the deployed Canvas MCP server |
| `frontend/src/lib/server/canvas/student-adapter.ts` | Student-safe Canvas MCP adapter |
| `frontend/src/lib/server/canvas/profile-flow.ts` | Profile/dashboard action formatting |
| `frontend/src/lib/server/student-session.ts` | In-memory v0.2 student session and simulated OTP state |
| `frontend/src/app/api/auth/canvas/start/route.ts` | Starts Canvas OAuth |
| `frontend/src/app/api/auth/canvas/callback/route.ts` | Handles Canvas OAuth callback |
| `frontend/src/app/api/auth/me/route.ts` | Returns login state without exposing tokens |
| `frontend/src/app/api/auth/logout/route.ts` | Clears Canvas session |
| `frontend/src/lib/server/canvas-session.ts` | Server-only Canvas session sealing and token exchange |
| `.env.example` | Env template to copy to `frontend/.env.local` |

## Important Docs

- [Implementation plan](./docs/implementation-plan.md)
- [Next steps](./docs/next-steps.md)
- [Environment variables](./docs/environment.md)
- [Architecture](./docs/architecture.md)
- [Design](./DESIGN.md)
- [Runbook](./docs/runbook.md)
