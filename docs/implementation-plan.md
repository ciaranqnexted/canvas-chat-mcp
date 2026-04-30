# Implementation Plan

## Objective

Turn this repo into a Next.js student chatbot that supports two evidence sources:

1. local course documents from a configured folder
2. the logged-in student's Canvas account through Canvas MCP

## Phase 1: Stabilize The Next.js App

- Keep the app under `frontend/`.
- Use Next.js server routes instead of a separate FastAPI backend.
- Make `/chat` the primary screen.
- Route browser chat requests to `/api/chat`.
- Keep all provider keys, Canvas tokens, MCP calls, and local file access on the server.

Acceptance criteria:

- `npm run dev` starts the app.
- `/chat` renders without a backend service.
- `/api/chat` can return local document matches from `LOCAL_DOCUMENTS_DIR`.

## Phase 2: Local Document Chat

- Add a document loader for Markdown, text, PDF, DOCX, CSV, and JSON.
- Add chunking with stable document IDs and source paths.
- Store an ignored local index under `.data/` or `frontend/.data/`.
- Add retrieval that returns snippets and citations.
- Add LLM synthesis so answers are written naturally but constrained to retrieved evidence.
- Return "I could not find that in the provided documents" when retrieval has no support.

Acceptance criteria:

- A student can ask about local course files without logging in.
- Responses include citations.
- Unsupported questions do not fabricate answers.

## Phase 3: Canvas Login

- Added Canvas OAuth routes:
  - `GET /api/auth/canvas/start`
  - `GET /api/auth/canvas/callback`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Store Canvas tokens in sealed HTTP-only cookies.
- Never send Canvas tokens to the browser.
- Add login state to the chat header.
- Add refresh-token handling before production.

Acceptance criteria:

- A student can start the Canvas OAuth flow.
- The callback exchanges the OAuth code for a Canvas token when Canvas env vars are configured.
- `/api/auth/me` identifies only session state needed by the UI.
- Canvas mode is blocked when unauthenticated.

## Phase 4: Canvas MCP Chat

- Add a server-side Canvas MCP client.
- Connect with the student's Canvas token from the authenticated session.
- Validate the allowed tool surface:
  - `list_courses`
  - `list_assignments`
  - `list_discussion_topics`
  - `get_my_course_grades`
- Enforce announcements-only behavior for announcement queries.
- Add LLM synthesis over MCP tool results.

Acceptance criteria:

- Logged-in students can ask course, assignment, announcement, and grade questions.
- The app never writes to Canvas.
- The model cannot access tools outside the approved read-only surface.

## Phase 5: Quality And Safety

- Add unit tests for request validation, local retrieval, auth guards, and MCP tool filtering.
- Add prompt evals for local docs, Canvas questions, out-of-scope requests, and prompt injection.
- Add structured server logs that exclude student messages and tokens.
- Add rate limits for chat and auth routes.
- Add deployment docs for environment variables and Canvas OAuth redirect URLs.

Acceptance criteria:

- Tests cover the main routing and safety paths.
- Prompt evals catch fabricated answers and unauthorized Canvas access.
- Production env docs are complete.
