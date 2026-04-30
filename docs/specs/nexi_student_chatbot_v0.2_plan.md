# Nexi Student Chatbot v0.2 Implementation Plan

Source spec: `docs/specs/nexi_student_chatbot_spec0.2.md`

## Goal

Move Nexi from the v0.1 email lookup prototype to a guided student assistant that validates a student identity, builds a personalised dashboard, and retrieves student-safe Canvas data through the Canvas MCP server.

The v0.2 target is still an MVP, not production auth. The app should support simulated OTP in development, preserve student context across turns, and expose clear action buttons for courses, enrolments, assignments, grades, announcements, deadlines, and support.

## Current Baseline

Implemented in v0.1:

- Next.js app under `frontend/`
- `/chat` student chat interface
- `/api/chat` route with local document fallback and Canvas MCP profile flow
- Canvas MCP HTTP client using `CANVAS_MCP_URL` + `CANVAS_MCP_API_PATH`
- Email-led Canvas MCP lookup with `get_user_profile`
- Follow-up actions for `list_user_courses` and `get_user_exam_results`
- Parked OAuth routes for later production lock-down
- Documentation for environment setup and MCP tool requirements

## v0.2 Product Flow

1. Student opens Nexi.
2. Nexi asks for the student's Canvas email.
3. Student email is validated.
4. Nexi looks up the student via Canvas MCP.
5. Nexi requests simulated OTP when `NEXI_OTP=false`.
6. Student enters accepted dev OTP.
7. Nexi creates a verified `StudentSession`.
8. Nexi displays a personalised dashboard with enabled and disabled actions.
9. Student selects a guided option or asks a natural-language question.
10. Nexi fetches the relevant data through Canvas MCP and returns a concise answer with context.

## Environment Additions

```env
NEXI_OTP=false
NEXI_OTP_EMAIL=ciaran.quinlan@nexted.com.au
NEXI_DEV_OTP=45454545
```

Production guard:

```ts
if (process.env.NODE_ENV === "production" && process.env.NEXI_OTP === "false") {
  throw new Error("Prototype OTP mode must not be enabled in production");
}
```

## Data Model

```ts
type StudentSession = {
  studentEmail: string
  canvasUserId: string
  verified: boolean
  selectedCourseId?: string
}
```

Implementation notes:

- Store v0.2 sessions server-side for now, keyed by `session_id`.
- Keep email and Canvas user id out of logs.
- Keep the session model narrow and explicit so it can later be moved to signed cookies, Redis, or a database.

## MCP Contract

Spec names:

- `get_user_by_email`
- `get_profile`
- `get_courses`
- `get_assignments`
- `get_grades`

Current deployed tools already used in v0.1:

- `get_user_profile`
- `list_user_courses`
- `get_user_exam_results`

v0.2 should add an adapter layer so UI code is stable even if MCP tool names differ. The adapter should normalize these capabilities:

- lookup user by email
- retrieve profile
- retrieve courses/enrolments
- retrieve assignments/deadlines
- retrieve grades/results
- retrieve announcements
- retrieve support/escalation options

## Major Milestones

### Milestone 1: Verified Student Session

Deliver email validation, Canvas lookup, simulated OTP, production guard, and server-side `StudentSession` state.

Acceptance criteria:

- invalid email is rejected before MCP call
- unknown email is blocked
- known email transitions to OTP step
- accepted dev OTP creates `verified: true`
- wrong OTP keeps the session unverified
- production fails fast if prototype OTP is enabled

### Milestone 2: Personalised Dashboard And Guided Buttons

Deliver the post-verification dashboard with dynamic buttons and disabled states.

Acceptance criteria:

- profile card is shown after verification
- top-level buttons include profile, courses, enrolments, assignments, grades, announcements, deadlines, and support
- actions are enabled only when data exists or tool support exists
- disabled actions show a reason
- selected course context is preserved

### Milestone 3: MCP Adapter And Student-Safe Tooling

Create a server-only Canvas MCP adapter that normalizes current and future MCP tools.

Acceptance criteria:

- chat route does not call raw tool names directly
- adapter hides tool-name differences from UI code
- adapter rejects missing required tools with clear fallback messages
- no write-capable or admin tools are exposed to the UI path
- tool results are normalized to typed app models

### Milestone 4: Academic Data Flows

Deliver assignments, grades, announcements, deadlines, enrolments, and course Q&A.

Acceptance criteria:

- active courses are shown
- assignments are grouped by course and due date
- deadlines are summarized clearly
- grades/results are shown without prediction
- announcements are scoped to the student's courses
- course Q&A uses selected course context when available

### Milestone 5: Guardrails, QA, And Production Readiness

Add automated tests, privacy guardrails, observability, and production security checks.

Acceptance criteria:

- invalid email, unknown email, wrong OTP, and valid OTP are tested
- active course display is tested
- context maintenance is tested
- MCP not-found and unavailable paths are tested
- no student PII or tokens are logged
- production guard prevents prototype OTP mode

## Advanced Backlog

These are not v0.2 commitments unless explicitly promoted:

- study planner
- risk alerts
- daily focus suggestions
- Canvas OAuth production flow
- LTI or institution SSO
- real OTP delivery

## Implementation Order

1. Add `NEXI_*` env vars and production guard.
2. Add `StudentSession` server module.
3. Refactor Canvas profile flow into a Canvas MCP adapter.
4. Add OTP step and verified session transitions.
5. Add dashboard action model and renderer.
6. Add course/enrolment/profile actions.
7. Add assignment/deadline/grade/announcement actions.
8. Add course context and Q&A handling.
9. Add tests and fixtures.
10. Update docs and GitHub issues as each milestone lands.

## Implementation Progress

First v0.2 branch pass (`feat/nexi-v0.2`):

- Added `NEXI_*` runtime config and production guard.
- Added in-memory `StudentSession` state keyed by `session_id`.
- Added simulated OTP verification with retry tracking.
- Moved raw Canvas MCP tool calls behind a student-safe adapter.
- Reworked Canvas chat flow into email lookup -> OTP -> verified dashboard.
- Added dashboard buttons with disabled reasons for MCP capabilities that are not available yet.
- Added course-selection actions from returned course data and stored `selectedCourseId` in the student session.
- Kept assignments, deadlines, announcements, and natural-language course Q&A as the next implementation slice.
