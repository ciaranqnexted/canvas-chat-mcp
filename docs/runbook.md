# Runbook

## Local Development

```bash
cd frontend
npm install
cp ../.env.example .env.local
npm run dev
```

Open `http://localhost:3000/chat`.

Environment values are documented in [Environment Variables](./environment.md). The template lives at:

```text
.env.example
```

The local runtime file should be:

```text
frontend/.env.local
```

## Local Documents

Default folder:

```text
local-documents/
```

Supported by the current scaffold:

- `.md`
- `.txt`
- `.json`
- `.csv`

Set `LOCAL_DOCUMENTS_DIR` in `frontend/.env.local` to point somewhere else.

## Canvas Setup

Canvas OAuth routes are implemented but parked for now. Keep these notes for when the feature is locked down:

1. Create Canvas OAuth developer key.
2. Set `SESSION_SECRET`, `CANVAS_BASE_URL`, `CANVAS_CLIENT_ID`, `CANVAS_CLIENT_SECRET`, and `CANVAS_REDIRECT_URI`.
3. Register `http://localhost:3000/api/auth/canvas/callback` as the local redirect URI in Canvas.
4. Start the app and re-enable the Canvas sign-in UI.
5. Connect `/api/chat` to the Canvas MCP client only when a valid student session exists.

Current successful login target:

```text
/api/auth/me
```

should return:

```json
{
  "authenticated": true
}
```

It may also include non-secret user display fields from Canvas. It must never return access tokens or refresh tokens.

## Canvas Email Lookup Setup

Set these in `frontend/.env.local`:

```env
CANVAS_MCP_URL=https://your-mcp.vercel.app
CANVAS_MCP_API_PATH=api/mcp
CANVAS_MCP_CANVAS_URL=https://your-canvas-domain
CANVAS_MCP_TOKEN=server-side-canvas-token
```

Then restart `npm run dev` and enter a Canvas email address in the chat.

The app calls `get_user_profile`. If the returned profile includes enrolments, the UI shows **See your courses**. If it includes completed modules, the UI shows **View exam results**.

## Common Issues

| Symptom | Likely cause | Fix |
|---|---|---|
| Local chat says no folder is configured | `LOCAL_DOCUMENTS_DIR` missing or folder absent | Create `local-documents/` or set the env var |
| Canvas mode asks for an email | Expected current behavior | Enter the student's Canvas email address |
| Sign in redirects to `missing_config` | Canvas OAuth env vars or `SESSION_SECRET` are missing | Fill `frontend/.env.local` and restart `npm run dev` |
| Email lookup cannot reach MCP | Missing MCP env vars or tool not deployed | Check `CANVAS_MCP_URL`, `CANVAS_MCP_TOKEN`, `CANVAS_MCP_CANVAS_URL`, and `get_user_profile` support |
| Next.js cannot resolve Tailwind classes | Dependencies are not installed | Run `npm install` inside `frontend/` |
| Chat API returns 400 | Missing or empty `message` | Check request body sent by the UI |

## Safety Checks Before Production

- Confirm Canvas tokens never appear in browser responses or logs.
- Confirm Canvas MCP exposes only approved read-only tools.
- Confirm local document citations are present for document-grounded answers.
- Confirm unauthenticated users cannot access Canvas mode.
