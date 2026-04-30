# Next Steps

This is the path from the current scaffold to a useful student chatbot.

## Current State

Implemented:

- Next.js app at `frontend/`
- Chat page at `/chat`
- Local document keyword search through `/api/chat`
- Canvas OAuth start/callback/logout/me routes
- Sealed HTTP-only session cookie for Canvas OAuth tokens
- Temporary Canvas email lookup flow through MCP
- Profile action buttons for courses and exam results

Not implemented yet:

- Production-grade identity verification before returning grades/results
- Refresh-token flow when Canvas access tokens expire
- LLM answer synthesis
- PDF/DOCX document parsing
- Vector or hybrid document retrieval
- Automated tests for auth and chat routes

## Step 1: Fill Local Env

Create `frontend/.env.local`:

```bash
cd frontend
cp ../.env.example .env.local
```

Fill the values described in [Environment Variables](./environment.md).

Minimum for local document chat:

```env
APP_URL=http://localhost:3000
SESSION_SECRET=<generated-secret>
LOCAL_DOCUMENTS_DIR=../local-documents
```

Minimum for Canvas login:

```env
SESSION_SECRET=<generated-secret>
CANVAS_BASE_URL=https://your-canvas-domain
CANVAS_CLIENT_ID=<developer-key-id>
CANVAS_CLIENT_SECRET=<developer-key-secret>
CANVAS_REDIRECT_URI=http://localhost:3000/api/auth/canvas/callback
```

## Step 2: Configure Canvas Developer Key

In Canvas, create an OAuth Developer Key with this redirect URI:

```text
http://localhost:3000/api/auth/canvas/callback
```

Copy the Developer Key ID and secret into `frontend/.env.local`.

Expected result:

- `/api/auth/canvas/start` redirects to Canvas.
- Canvas redirects back to `/api/auth/canvas/callback`.
- `/api/auth/me` returns `authenticated: true`.
- The chat header says Canvas is connected.

## Step 3: Add Canvas MCP Client

Current status: the HTTP MCP client exists at:

```text
frontend/src/lib/server/canvas/mcp-http-client.ts
```

The current profile flow exists at:

```text
frontend/src/lib/server/canvas/profile-flow.ts
```

It calls `get_user_profile`, then offers follow-up actions. Keep extending this module for the next MCP tools.

## Step 3A: Confirm MCP Tool Surface

The deployed MCP server should support:

- `get_user_profile`
- `list_user_courses`
- `get_user_exam_results`

The expected headers for the deployed HTTP MCP endpoint are:

- `x-canvas-url`
- `x-canvas-token`
- optional `Authorization: Bearer <CANVAS_MCP_BEARER_TOKEN>`

The endpoint expected by the app is:

```text
{CANVAS_MCP_URL}/api/mcp
```

If your deployed server uses different headers, update:

```text
frontend/src/lib/server/canvas/mcp-http-client.ts
```

## Step 4: Lock Down Email Lookup

The current email lookup flow is intentionally a temporary dev/demo path. Before production, require one of:

- Canvas OAuth
- institution SSO
- email magic-link verification

Do not return exam results or grades from email-only lookup in production.

## Step 5: Expand Canvas MCP Chat

Create server-only modules under:

```text
frontend/src/lib/server/canvas/
```

Suggested files:

```text
mcp-client.ts       starts/connects to Canvas MCP
tools.ts            validates allowed tool names
canvas-chat.ts      turns a user question into MCP tool calls and evidence
```

Use the Canvas session from:

```text
frontend/src/lib/server/canvas-session.ts
```

The allowed tool surface should stay read-only:

- `list_courses`
- `list_assignments`
- `list_discussion_topics`
- `get_my_course_grades`

If the MCP server advertises unexpected write-capable tools, fail closed.

## Step 6: Connect Rich Canvas Mode In `/api/chat`

Update:

```text
frontend/src/app/api/chat/route.ts
```

Current Canvas behavior:

- prompts for an email address
- calls `get_user_profile`
- renders action buttons
- calls/falls back for courses and exam results

Target richer Canvas behavior:

1. Read the sealed Canvas session.
2. Connect to Canvas MCP with the student's Canvas token.
3. Retrieve course/assignment/announcement/grade evidence.
4. Synthesize an answer.
5. Return citations or tool-result summaries.

## Step 7: Improve Local Document Retrieval

Replace keyword search with a real retriever:

- Parse Markdown, text, CSV, JSON, PDF, and DOCX.
- Chunk documents with source metadata.
- Store the local index under `.data/` or `frontend/.data/`.
- Return citations with filename and snippet.
- Refuse unsupported answers instead of guessing.

## Step 8: Add LLM Synthesis

Use the prompt in:

```text
prompts/system/student-chat-system.md
```

The synthesis layer should:

- answer only from local snippets or Canvas MCP results
- include citations/source names
- ask clarifying questions when course context is ambiguous
- redirect out-of-scope student-service questions
- avoid logging student messages, tokens, names, or email addresses

## Step 9: Add Tests

Add tests for:

- missing Canvas env redirects to `canvasAuth=missing_config`
- invalid OAuth state is rejected
- `/api/auth/me` never returns tokens
- Canvas mode asks for email when none is supplied
- Canvas profile lookup calls `get_user_profile`
- Canvas MCP tool filtering rejects unexpected tools
- local document retrieval returns citations

## Step 10: Production Hardening

Before production:

- Add refresh-token handling for Canvas' expiring access tokens.
- Decide whether sealed cookies are acceptable or move tokens to a server database.
- Add rate limiting to auth and chat routes.
- Add structured logs that exclude PII and secrets.
- Confirm Canvas Developer Key scopes are read-only and minimal.
- Confirm deployment redirect URI is registered in Canvas.
