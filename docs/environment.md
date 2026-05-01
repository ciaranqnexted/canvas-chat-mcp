# Environment Variables

Copy the root template into the frontend app before local development:

```bash
cd frontend
cp ../.env.example .env.local
```

The app reads `frontend/.env.local` when `npm run dev` starts. After changing env vars, restart the dev server.

## Required For Local App Startup

| Variable | Where to get it | Used by | Notes |
|---|---|---|---|
| `APP_URL` | Local app URL | OAuth redirects and app links | Use `http://localhost:3000` locally |
| `SESSION_SECRET` | Generate locally | Cookie encryption | Run `openssl rand -base64 32`; keep private |
| `LOCAL_DOCUMENTS_DIR` | Local filesystem path | Local document chat | Defaults to `../local-documents` from `frontend/` |
| `LOCAL_INDEX_DIR` | Local filesystem path | Future document index | Defaults to `../.data/local-index`; ignored by git |

## Required For Canvas Login

| Variable | Where to get it | Used by | Notes |
|---|---|---|---|
| `CANVAS_BASE_URL` | Your Canvas domain | OAuth and Canvas API/MCP | Example: `https://gmc.instructure.com` |
| `CANVAS_CLIENT_ID` | Canvas Developer Key | OAuth start/token exchange | Created by a Canvas admin |
| `CANVAS_CLIENT_SECRET` | Canvas Developer Key | OAuth token exchange | Treat as a secret; never expose to browser code |
| `CANVAS_REDIRECT_URI` | This app's callback URL | OAuth callback validation | Local value: `http://localhost:3000/api/auth/canvas/callback` |

To get `CANVAS_CLIENT_ID` and `CANVAS_CLIENT_SECRET`, create or ask a Canvas admin to create an OAuth Developer Key in Canvas. The Developer Key redirect URI must exactly include:

```text
http://localhost:3000/api/auth/canvas/callback
```

If this is missing or mismatched, Canvas will reject the login flow.

## Required For LLM Answers

| Variable | Where to get it | Used by | Notes |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Console | Future answer synthesis | Not used by the current local keyword-search scaffold yet |
| `ANTHROPIC_MODEL` | Repo default | Future answer synthesis | Default is `claude-sonnet-4-20250514` |

## Required For Canvas MCP Chat

| Variable | Where to get it | Used by | Notes |
|---|---|---|---|
| `CANVAS_MCP_URL` | Your deployed MCP server | Current email profile lookup | Example: `https://your-mcp.vercel.app`; app calls `/api/mcp` under it |
| `CANVAS_MCP_API_PATH` | Repo default | Current email profile lookup | Default: `api/mcp`; appended under `CANVAS_MCP_URL` |
| `CANVAS_MCP_TOKEN` | Canvas admin/service token for dev | Current email profile lookup | Sent server-side as `x-canvas-token`; do not expose to browser |
| `CANVAS_MCP_CANVAS_URL` | Canvas domain | Current email profile lookup | If omitted, the app falls back to `CANVAS_BASE_URL` |
| `CANVAS_MCP_BEARER_TOKEN` | MCP deployment secret, if any | Optional MCP protection | Sent as `Authorization: Bearer ...` |
| `CANVAS_MCP_COMMAND` | Local MCP install/deployment | Future local MCP client | Default: `canvas-mcp-server` |

Canvas MCP access is wired through the server-only student adapter. The current deployed tool mapping is:

- `get_user_profile({ email })` with fallback support for future `get_user_by_email`
- `list_user_courses({ user_id })` with fallback support for future `get_courses`
- `get_user_exam_results({ user_id })` with fallback support for future `get_grades`

If `list_user_courses` or `get_user_exam_results` are unavailable, the app falls back to course/module data returned by `get_user_profile`.

## Student Hub Configuration

These variables control the v0.3 AIT Student Hub feature. Defaults are built in, but set them explicitly in `frontend/.env.local` and Vercel so deployments are self-documenting.

| Variable | Where to get it | Used by | Notes |
|---|---|---|---|
| `NEXI_STUDENT_HUB_COURSE_ID` | Canvas course URL | Student Hub MCP calls | v0.3 default: `5704` |
| `NEXI_STUDENT_HUB_ACCOUNT_ID` | Canvas account settings | Student Hub labels/docs | v0.3 default: `1` |
| `NEXI_STUDENT_HUB_ACCOUNT_NAME` | Canvas account settings | Student Hub labels/docs | v0.3 default: `Technology & Design (T&D)` |
| `NEXI_STUDENT_HUB_NAME` | Product wording | Dashboard action and answers | v0.3 default: `AIT Student Hub` |
| `NEXI_STUDENT_HUB_CANVAS_URL` | Canvas course URL | Answer links | v0.3 default: `https://ait.instructure.com/courses/5704` |

The Student Hub content path requires these MCP tools before full hub Q&A can work:

- `get_course_pages`
- `get_course_page`
- `get_course_modules`
- `get_module_items`

Until those tools are exposed by the Canvas MCP server, Nexi shows the Student Hub action but returns a clear setup message rather than failing the chat flow.

## Why You See `canvasAuth=missing_config`

The sign-in route redirects to:

```text
/chat?canvasAuth=missing_config
```

when any required OAuth/session variable is missing:

- `SESSION_SECRET`
- `CANVAS_BASE_URL`
- `CANVAS_CLIENT_ID`
- `CANVAS_CLIENT_SECRET`

Set them in `frontend/.env.local`, restart `npm run dev`, and click **Sign in with Canvas** again.

## Required For Nexi Prototype Verification

| Variable | Where to get it | Used by | Notes |
|---|---|---|---|
| `NEXI_OTP` | `frontend/.env.local` | Student verification | Required. Set `false` for the simulated v0.2 OTP prototype. Real OTP delivery is future work. |
| `NEXI_ALLOW_PROTOTYPE_OTP` | Vercel/project env | Deployed prototype testing | Set `true` only when testing the simulated OTP flow on Vercel. Leave unset/false for real production. |
| `NEXI_OTP_EMAIL` | Your dev inbox | Prototype OTP note | Documents where real OTP would be delivered later; no email is sent in v0.2. |
| `NEXI_DEV_OTP` | `frontend/.env.local` | Simulated OTP check | Required when `NEXI_OTP=false`; `NEXI_OTP_DEFAULT` is also accepted as a local alias. |

Production rule:

```ts
if (
  process.env.NODE_ENV === 'production' &&
  process.env.NEXI_OTP === 'false' &&
  process.env.NEXI_ALLOW_PROTOTYPE_OTP !== 'true'
) {
  throw new Error('Prototype OTP mode must not be enabled in production')
}
```

For a temporary Vercel-hosted prototype, set `NEXI_ALLOW_PROTOTYPE_OTP=true` in the Vercel project environment. Remove it before any real production use.

## Why Canvas Email Lookup Cannot Reach MCP

If the chatbot says it cannot reach Canvas MCP, check:

- `CANVAS_MCP_URL`
- `CANVAS_MCP_API_PATH`
- `CANVAS_MCP_TOKEN`
- `CANVAS_MCP_CANVAS_URL` or `CANVAS_BASE_URL`
- whether the deployed MCP server supports `get_user_profile`
- whether the MCP server expects `x-canvas-url` and `x-canvas-token` headers

## Secret Handling Rules

- Do not commit `frontend/.env.local`.
- Do not put Canvas tokens or client secrets in React components.
- Do not pass Canvas tokens in URLs.
- Keep Canvas access tokens in server-only session handling.
- Rotate any token or client secret that was pasted into a browser page, screenshot, chat, or committed file.
