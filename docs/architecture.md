# Architecture

This repo is scoped as a single Next.js web app. Next.js server routes own chat orchestration, local document retrieval, Canvas OAuth scaffolding, and Canvas MCP access.

## Runtime Boundaries

| Boundary | Runs where | Responsibility |
|---|---|---|
| React chat UI | Browser | Render chat, collect messages, show profile action buttons |
| Next.js API routes | Server | Validate requests, call local retriever and Canvas MCP |
| Local document retriever | Server | Read local files and return citations |
| Canvas MCP HTTP client | Server | Call the deployed Canvas MCP endpoint with server-side headers |
| Canvas OAuth routes | Server | Parked auth path for later production lock-down |
| LLM synthesis | Server | Planned response synthesis over retrieved evidence |

## Active Canvas Flow

The current development flow is email-led profile lookup:

1. Student enters the email address they use for Canvas.
2. `/api/chat` validates that it looks like an email.
3. The server calls Canvas MCP tool `get_user_profile({ email })`.
4. The app replies with profile summary fields returned by MCP.
5. If the profile includes enrolments, the UI shows **See your courses**.
6. If the profile includes completed modules, the UI shows **View exam results**.
7. Clicking those buttons sends an action intent to `/api/chat`.
8. The server calls `list_user_courses({ user_id })` or `get_user_exam_results({ user_id })`, falling back to `get_user_profile` data when those tools are unavailable.

This is a temporary development path. Production must require OAuth, SSO, or another identity check before returning grades or exam results.

## API Contracts

### POST `/api/chat`

Email lookup request:

```json
{
  "session_id": "client-generated-session-id",
  "message": "student@example.com",
  "mode": "canvas"
}
```

Profile response:

```json
{
  "session_id": "client-generated-session-id",
  "reply": "I found this Canvas profile...",
  "source": "canvas_mcp",
  "iteration_count": 1,
  "profile": {
    "user_id": "123",
    "name": "Student Name",
    "email": "student@example.com",
    "status": "active",
    "enrolments": [],
    "completed_modules": []
  },
  "actions": [
    { "id": "see_courses", "label": "See your courses" },
    { "id": "view_exam_results", "label": "View exam results" }
  ]
}
```

Action request:

```json
{
  "session_id": "client-generated-session-id",
  "message": "See your courses",
  "mode": "canvas",
  "intent": "see_courses"
}
```

Local document request:

```json
{
  "session_id": "client-generated-session-id",
  "message": "What does the course outline say?",
  "mode": "local"
}
```

## Server Modules

```text
frontend/src/lib/server/
  canvas-session.ts             OAuth session sealing for later lock-down
  canvas/
    mcp-http-client.ts          Streamable HTTP MCP client
    profile-flow.ts             Email lookup, action handling, response formatting
```

Planned modules:

```text
frontend/src/lib/server/
  chat/
    orchestrator.ts
    prompts.ts
    citations.ts
  documents/
    loader.ts
    index.ts
    retriever.ts
```

## Canvas MCP Contract

Current tools expected from the deployed MCP server:

- `get_user_profile`
- `list_user_courses`
- `get_user_exam_results`

Future production Canvas chat should keep a read-only tool surface:

- `list_courses`
- `list_assignments`
- `list_discussion_topics`
- `get_my_course_grades`

The server should validate the advertised tool list before exposing tools to the model. Any unexpected write-capable tools should fail closed.

## Data Handling Rules

- Canvas service tokens stay server-side.
- Browser responses must never include Canvas tokens or MCP auth headers.
- Email lookup is dev/demo only until identity verification is added.
- Chat responses can mention returned profile/course/result facts, but logs must not include student messages, tokens, names, or email addresses.
- Local documents and local indexes are development data and should stay ignored by default.
