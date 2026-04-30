# Nexi v0.2 Todo List

Source spec: `docs/specs/nexi_student_chatbot_spec0.2.md`

## Tracker Policy

- GitHub issues are the source of execution tracking.
- This file mirrors the issue structure so planning remains readable in the repo.
- When an issue changes scope or status, update the relevant section here in the same PR/commit.

## Issues To Create

Created GitHub issues:

| Issue | Title | Milestone |
|---|---|---|
| [#1](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/1) | `[v0.2] Verified student session with simulated OTP` | v0.2 Phase 1 |
| [#4](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/4) | `[v0.2] Personalised dashboard and dynamic buttons` | v0.2 Phase 1 |
| [#3](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/3) | `[v0.2] Canvas MCP adapter and student-safe tool normalization` | v0.2 Phase 1 |
| [#2](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/2) | `[v0.2] Assignments, deadlines, grades, announcements, and enrolments` | v0.2 Phase 2 |
| [#8](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/8) | `[v0.2] Course Q&A and context maintenance` | v0.2 Phase 2 |
| [#7](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/7) | `[v0.2] Guardrails, privacy, and production hardening` | v0.2 Phase 3 |
| [#6](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/6) | `[v0.2] Acceptance tests and regression coverage` | v0.2 Phase 3 |
| [#5](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/5) | `[implementation record] Prototype v0.1 Canvas MCP chatbot` | v0.2 Phase 1 |

### 1. Verified student session with simulated OTP

GitHub issue: [#1](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/1)

Status: implemented in first v0.2 branch pass

Tasks:

- [x] Add `NEXI_OTP`, `NEXI_OTP_EMAIL`, and `NEXI_DEV_OTP` env docs and runtime parsing.
- [x] Add production guard for `NEXI_OTP=false`.
- [x] Add server-side `StudentSession` store keyed by `session_id`.
- [x] Add state transitions: email requested, profile found, OTP requested, verified.
- [x] Reject invalid email before MCP lookup.
- [x] Block unknown Canvas email.
- [x] Accept dev OTP `45454545` when prototype OTP mode is active.
- [x] Reject incorrect OTP without marking session verified.

Acceptance tests:

- [x] Invalid email rejected.
- [x] Non-existent email blocked.
- [x] Correct OTP verifies session.
- [x] Incorrect OTP does not verify session.
- [x] Prototype OTP mode cannot run in production.

Note: automated regression coverage remains tracked in issue #6. The live correct-OTP smoke path requires a known Canvas test student email.

### 2. Personalised dashboard and dynamic buttons

GitHub issue: [#4](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/4)

Status: partially implemented in first v0.2 branch pass

Tasks:

- [x] Define dashboard action model.
- [x] Render post-verification profile summary.
- [x] Add top-level buttons: Profile, Courses, Enrolments, Assignments, Grades, Announcements, Deadlines, Support.
- [x] Add disabled states with reasons.
- [x] Preserve selected course in session state.
- [x] Keep buttons compact and usable on mobile.

Acceptance tests:

- [ ] Active student sees enabled course buttons.
- [ ] Missing data renders disabled action with reason.
- [x] Selected course context persists across actions.

### 3. Canvas MCP adapter and student-safe tool normalization

GitHub issue: [#3](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/3)

Status: implemented for profile, courses, enrolments, and grades/results

Tasks:

- [x] Create server-only MCP adapter module.
- [x] Map current tools: `get_user_profile`, `list_user_courses`, `get_user_exam_results`.
- [x] Map spec tools when available: `get_user_by_email`, `get_courses`, `get_assignments`, `get_grades`.
- [x] Normalize profile, course, assignment, grade/result, and announcement result shapes.
- [x] Add clear fallback when a required tool is unavailable.
- [x] Prevent write/admin tools from being used by the student path.

Acceptance tests:

- [x] Adapter uses the available deployed tool for profile lookup.
- [x] Missing required tool gives a user-safe fallback.
- [x] Unexpected write-capable tool is not surfaced.

### 4. Academic data flows: assignments, grades, announcements, deadlines

GitHub issue: [#2](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/2)

Status: planned

Tasks:

- [ ] Add assignments action.
- [ ] Add deadlines action.
- [ ] Add grades/results action.
- [ ] Add announcements action.
- [ ] Add enrolments action.
- [ ] Group results by course where useful.
- [ ] Avoid grade prediction or unsupported interpretations.

Acceptance tests:

- [ ] Active courses shown.
- [ ] Assignments returned for selected course.
- [ ] Deadlines summarized by due date.
- [ ] Grades shown only as returned by Canvas/MCP.
- [ ] Announcements scoped to student courses.

### 5. Course Q&A and context handling

GitHub issue: [#8](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/8)

Status: partially implemented

Tasks:

- [x] Let student select a course.
- [x] Store `selectedCourseId` in `StudentSession`.
- [ ] Route natural-language course questions through selected context.
- [ ] Ask for clarification when multiple courses match.
- [ ] Return grounded answers from Canvas MCP or local docs.

Acceptance tests:

- [x] Selected course context maintained.
- [ ] Ambiguous course query asks for clarification.
- [ ] Unsupported question does not fabricate.

### 6. Guardrails, privacy, and security hardening

GitHub issue: [#7](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/7)

Status: planned

Tasks:

- [ ] Review all server logs for PII/token leakage.
- [ ] Add rate limiting design for chat and OTP attempts.
- [ ] Add lockout/backoff behavior for repeated wrong OTP attempts.
- [ ] Document prototype auth risk prominently.
- [ ] Prepare transition path to Canvas OAuth, LTI, or SSO.

Acceptance tests:

- [ ] Tokens are never returned to browser.
- [ ] Student messages and email are not logged.
- [ ] Destructive actions are unavailable.

### 7. v0.1 implementation record

GitHub issue: [#5](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/5)

Status: implemented

Documented features:

- [x] Next.js app scaffold.
- [x] `/chat` UI.
- [x] `/api/chat` route.
- [x] Canvas MCP HTTP client.
- [x] Email-led `get_user_profile` lookup.
- [x] Profile action buttons.
- [x] Courses and exam-result actions.
- [x] Parked Canvas OAuth scaffolding.
- [x] Local docs fallback.

Follow-up:

- [x] Link this record to the GitHub issue after issue creation.
