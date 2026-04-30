# Nexi v0.2 GitHub Issue Plan

Repository: `ciaranqnexted/canvas-chat-mcp`

This document mirrors the GitHub issues for v0.2 so implementation history remains easy to revisit from either GitHub or the repo.

## Labels

Suggested labels:

- `v0.2`
- `mvp`
- `auth`
- `canvas-mcp`
- `frontend`
- `security`
- `qa`
- `implementation-record`

## Milestones

Created GitHub milestones:

1. [`v0.2 Phase 1 - Verified student dashboard`](https://github.com/ciaranqnexted/canvas-chat-mcp/milestone/1)
2. [`v0.2 Phase 2 - Academic data flows`](https://github.com/ciaranqnexted/canvas-chat-mcp/milestone/2)
3. [`v0.2 Phase 3 - Security and QA`](https://github.com/ciaranqnexted/canvas-chat-mcp/milestone/3)

## Current Issue Status

Updated 2026-04-30 after the first closeout pass.

| Issue | State | Closeout note |
|---|---|---|
| [#1](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/1) | Closed | v0.2 prototype email, OTP, and `StudentSession` flow implemented. Automated regression coverage remains in #6; production auth hardening remains in #7. |
| [#4](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/4) | Closed | Verified dashboard, dynamic actions, disabled states, selected course context, and constrained mobile-friendly chat shell implemented. |
| [#3](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/3) | Closed | Server-only Canvas MCP adapter and student-safe tool normalization implemented. |
| [#2](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/2) | Open | Assignments, deadlines, announcements, richer academic data, and scoped summaries still need implementation. |
| [#8](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/8) | Open | Course selection exists; natural-language course Q&A and ambiguity handling still need implementation. |
| [#7](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/7) | Open | Production hardening, privacy review, rate limiting, and auth migration path remain. |
| [#6](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/6) | Open | Automated acceptance and regression coverage remains. |
| [#5](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/5) | Closed | v0.1 implementation record documented and retained as history. |

## Issue 1: [v0.2] Verified student session with simulated OTP

GitHub issue: [#1](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/1)

Milestone: `v0.2 Phase 1 - Verified student dashboard`

Body:

```md
## Goal

Implement the v0.2 auth path from `docs/specs/nexi_student_chatbot_spec0.2.md`: email lookup, simulated OTP, and verified `StudentSession` state.

## Current implementation context

v0.1 currently asks for Canvas email and calls Canvas MCP `get_user_profile` from `frontend/src/app/api/chat/route.ts` via `frontend/src/lib/server/canvas/profile-flow.ts`.

OAuth routes exist but are parked:
- `frontend/src/app/api/auth/canvas/start/route.ts`
- `frontend/src/app/api/auth/canvas/callback/route.ts`
- `frontend/src/app/api/auth/me/route.ts`
- `frontend/src/app/api/auth/logout/route.ts`

## Scope

- Add `NEXI_OTP`, `NEXI_OTP_EMAIL`, and `NEXI_DEV_OTP`.
- Add production guard for prototype OTP mode.
- Add server-side `StudentSession`.
- Add flow states: email requested, profile found, OTP requested, verified.
- Accept dev OTP `45454545` when prototype OTP mode is active.

## Acceptance criteria

- Invalid email is rejected before MCP lookup.
- Non-existent email is blocked.
- Correct dev OTP verifies the session.
- Incorrect OTP keeps the session unverified.
- Production build/runtime cannot use `NEXI_OTP=false`.

## Spec references

- Authentication Strategy
- Data Model
- Acceptance Tests
```

## Issue 2: [v0.2] Personalised dashboard and dynamic buttons

GitHub issue: [#4](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/4)

Milestone: `v0.2 Phase 1 - Verified student dashboard`

Body:

```md
## Goal

After verification, show a personalised Nexi dashboard with dynamic actions and disabled states.

## Current implementation context

v0.1 renders action buttons inside `frontend/src/components/features/chat/MessageBubble.tsx` and drives them from `actions` returned by `/api/chat`.

Current actions:
- See your courses
- View exam results

## Scope

- Add top-level dashboard actions: Profile, Courses, Enrolments, Assignments, Grades, Announcements, Deadlines, Support.
- Add disabled states with reasons.
- Preserve selected course context.
- Keep the layout compact and mobile-safe.

## Acceptance criteria

- Verified student sees profile summary and dashboard actions.
- Actions are enabled only when data/tool support exists.
- Disabled actions show the reason.
- Selected course context persists across follow-up actions.

## Spec references

- Feature Overview
- MVP key features
- Data Model
```

## Issue 3: [v0.2] Canvas MCP adapter and student-safe tool normalization

GitHub issue: [#3](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/3)

Milestone: `v0.2 Phase 1 - Verified student dashboard`

Body:

```md
## Goal

Introduce a server-only Canvas MCP adapter so the chat route is insulated from raw tool-name differences and only exposes student-safe read APIs.

## Current implementation context

MCP HTTP calls are implemented in:
- `frontend/src/lib/server/canvas/mcp-http-client.ts`

Profile flow currently calls:
- `get_user_profile`
- `list_user_courses`
- `get_user_exam_results`

The v0.2 spec names these required capabilities:
- `get_user_by_email`
- `get_profile`
- `get_courses`
- `get_assignments`
- `get_grades`

## Scope

- Create adapter methods for profile, courses, assignments, grades, announcements, deadlines, support.
- Normalize tool results into typed app models.
- Provide clear fallback messages for missing tools.
- Ensure write/admin tools are never surfaced in the student path.

## Acceptance criteria

- `/api/chat` no longer calls raw MCP tool names directly.
- Adapter uses available deployed tools where possible.
- Missing tool returns a user-safe fallback.
- Unexpected write-capable tools are rejected.

## Spec references

- MCP Requirements
- Permissions
- Guardrails
```

## Issue 4: [v0.2] Assignments, deadlines, grades, announcements, and enrolments

GitHub issue: [#2](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/2)

Milestone: `v0.2 Phase 2 - Academic data flows`

Body:

```md
## Goal

Implement the academic data actions that make Nexi useful after the profile/dashboard is in place.

## Scope

- Courses and enrolments.
- Assignment tracking.
- Deadline summaries.
- Grades/results display.
- Announcements.
- Support routing.

## Acceptance criteria

- Active courses are shown.
- Assignments are grouped by course and due date.
- Deadlines are summarized clearly.
- Grades are shown only as returned by Canvas/MCP, with no prediction.
- Announcements are scoped to student courses.
- Support option returns an appropriate contact/escalation response.

## Spec references

- Feature Overview
- MVP key features
- Guardrails
```

## Issue 5: [v0.2] Course Q&A and context maintenance

GitHub issue: [#8](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/8)

Milestone: `v0.2 Phase 2 - Academic data flows`

Body:

```md
## Goal

Support course-aware natural-language questions while preserving the selected course context.

## Scope

- Store `selectedCourseId` in `StudentSession`.
- Let student select/change active course.
- Route follow-up questions through selected course context.
- Ask for clarification when course context is ambiguous.
- Return grounded answers only.

## Acceptance criteria

- Selected course context is maintained across turns.
- Ambiguous course query asks for clarification.
- Unsupported question does not fabricate an answer.
- Assignment/course Q&A respects the student's Canvas scope.

## Spec references

- Core User Flow
- MVP key features
- Acceptance Tests
```

## Issue 6: [v0.2] Guardrails, privacy, and production hardening

GitHub issue: [#7](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/7)

Milestone: `v0.2 Phase 3 - Security and QA`

Body:

```md
## Goal

Harden Nexi so prototype auth risks are explicit and production paths cannot accidentally expose student data.

## Current implementation context

v0.1 intentionally uses email-led lookup for speed. This must be locked down before production.

## Scope

- Ensure no tokens or secrets are returned to the browser.
- Avoid logging student email, messages, names, or tokens.
- Add wrong-OTP backoff/lockout design.
- Add production guard for prototype OTP.
- Document path to Canvas OAuth, LTI, or SSO.
- Verify no destructive Canvas actions are reachable.

## Acceptance criteria

- Prototype OTP cannot run in production.
- Student PII is excluded from logs.
- Write/admin MCP tools are not accessible from the student path.
- Security risks are documented with mitigation tasks.

## Spec references

- Authentication Strategy
- Permissions
- Guardrails
- Risks
```

## Issue 7: [v0.2] Acceptance tests and regression coverage

GitHub issue: [#6](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/6)

Milestone: `v0.2 Phase 3 - Security and QA`

Body:

```md
## Goal

Add automated coverage for the v0.2 acceptance tests and critical regression paths.

## Scope

- Invalid email rejected.
- Non-existent email blocked.
- Correct OTP verifies session.
- Incorrect OTP does not verify session.
- Active courses shown.
- Context maintained.
- MCP unavailable path handled.
- Missing tool path handled.

## Acceptance criteria

- Tests run in CI or documented local command.
- MCP fixtures cover profile, courses, assignments, grades, and not-found responses.
- Regression tests protect v0.1 email lookup behavior.

## Spec references

- Acceptance Tests
- Risks
```

## Issue 8: [implementation record] Prototype v0.1 Canvas MCP chatbot

GitHub issue: [#5](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/5)

Milestone: `v0.2 Phase 1 - Verified student dashboard`

Body:

```md
## Goal

Document the implemented v0.1 prototype so we can revisit and extend each feature during v0.2.

## Implemented features

- Next.js app scaffold under `frontend/`.
- Chat UI at `/chat`.
- `/api/chat` route.
- Local document fallback.
- Canvas MCP HTTP client.
- Email-led `get_user_profile` lookup.
- Profile actions for courses and exam results.
- MCP calls for `list_user_courses` and `get_user_exam_results`.
- Parked Canvas OAuth routes.
- Environment and runbook documentation.

## Key files

- `frontend/src/app/api/chat/route.ts`
- `frontend/src/components/features/chat/ChatWindow.tsx`
- `frontend/src/components/features/chat/MessageBubble.tsx`
- `frontend/src/lib/server/canvas/mcp-http-client.ts`
- `frontend/src/lib/server/canvas/profile-flow.ts`
- `frontend/src/lib/server/canvas-session.ts`
- `docs/environment.md`
- `docs/runbook.md`
- `docs/architecture.md`

## Known limitations

- Email-only lookup is prototype-only.
- OTP is not implemented yet.
- Dashboard is limited to profile actions returned by the chat route.
- Natural-language Q&A is not grounded through an LLM yet.
- Production auth remains parked.

## Follow-up

Use this issue as the anchor when changing or extending v0.1 behavior during v0.2.
```
