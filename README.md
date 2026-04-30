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
- temporary Canvas email lookup flow that calls `get_user_profile` through the deployed MCP server
- profile action buttons for courses and exam results
- Canvas-specific system prompt in `prompts/system/student-chat-system.md`

Next implementation work:

1. Lock down the email lookup flow behind OAuth, SSO, or magic-link verification.
2. Add a real local document index for PDF, DOCX, Markdown, and text.
3. Add LLM response synthesis with citations from local documents or Canvas tool results.
4. Add token refresh handling and production session storage if sealed cookies are not enough.

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

For Canvas profile lookup, set `CANVAS_MCP_URL`, `CANVAS_MCP_CANVAS_URL`, and `CANVAS_MCP_TOKEN` in `frontend/.env.local`. See [Environment Variables](./docs/environment.md).

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
| `frontend/src/components/features/chat/ChatWindow.tsx` | Chat UI, source mode, Canvas email lookup actions |
| `frontend/src/app/api/chat/route.ts` | Main chat API route |
| `frontend/src/lib/server/canvas/mcp-http-client.ts` | HTTP MCP client for the deployed Canvas MCP server |
| `frontend/src/lib/server/canvas/profile-flow.ts` | Email profile lookup and follow-up action formatting |
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
