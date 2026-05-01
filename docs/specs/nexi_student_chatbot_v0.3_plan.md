# Nexi Student Chatbot v0.3 Plan

Source spec: `docs/specs/Nexi_Student_Chatbot_Spec_v0.3.md`

## Goal

Deliver Nexi v0.3 as a student chatbot that can route between personal Canvas data and the AIT Student Hub knowledge base.

The Student Hub is Canvas course `5704` in account `Technology & Design (T&D)`. It should appear as a read-only support knowledge base and also as a normal course-like entry labelled as the student hub. It must remain available to verified students even when they have no active enrolled courses.

## Current Constraint

The current live MCP tool list does not include the Student Hub content tools required by the v0.3 spec:

- `get_course_pages`
- `get_course_page`
- `get_course_modules`
- `get_module_items`
- `index_course_content`
- `search_course_content`
- `get_course_files`
- `get_file_metadata`
- `download_file_text`

This means the app can start with configuration, routing, UI, feature gates, and graceful fallback responses now. Full grounded Student Hub answers require the MCP server to expose the Stage 1 tools at minimum.

## Recommended Spec Adjustments

1. Require student verification before Canvas-backed Student Hub lookup. The spec says the hub is available even if the student has no active courses, but it should still be behind the current student verification flow until OAuth/SSO replaces prototype OTP.
2. Add explicit environment configuration:
   - `NEXI_STUDENT_HUB_COURSE_ID=5704`
   - `NEXI_STUDENT_HUB_ACCOUNT_ID=1`
   - `NEXI_STUDENT_HUB_NAME=AIT Student Hub`
   - `NEXI_STUDENT_HUB_CANVAS_URL=https://ait.instructure.com/courses/5704`
3. Treat MCP content tools as capability-gated. If a required tool is missing, Nexi should explain that Student Hub content search is not connected yet and keep profile/course/grade actions available.
4. Define sensitive-topic escalation copy before launch. Financial hardship, complaints, wellbeing, misconduct, and safety topics should be grounded in hub content when available and should always suggest contacting student services.
5. Do not add free-form answer synthesis until search results include source references. The answer format requires grounding, so unsupported answers should ask a clarifying question or return a capability message.

## Milestones

### v0.3 Phase 1 - Student Hub Foundation

Build the app-side foundation for Student Hub support.

- Add Student Hub runtime configuration.
- Add Student Hub as a dashboard action available after student verification.
- Add typed Canvas adapter methods for Stage 1 MCP content tools.
- Add feature detection and safe fallback when tools are missing.
- Add support copy that points students to the hub without exposing raw Canvas API data.

Acceptance criteria:

- Verified student dashboard includes a Student Hub action.
- App can call Stage 1 MCP tools when available.
- Missing tools produce a clear non-crashing message.
- Typecheck, lint, and production build pass.

### v0.3 Phase 2 - Routing And Grounded Hub Answers

Implement support-question routing and grounded response formatting.

- Route personal questions to profile/course/grade tools.
- Route support questions to Student Hub tools.
- Route mixed questions through both paths and combine a short answer.
- Ask a clarifying question when intent is unclear.
- Format hub answers with summary, source reference, optional Canvas link, and next actions.
- Add sensitive-topic escalation handling.

Acceptance criteria:

- Support questions no longer return generic support copy when hub content tools are available.
- Hub answers include `AIT Student Hub > [Page/Module]` source references.
- Mixed questions preserve student data privacy and cite hub sources.
- Unclear questions ask for clarification rather than guessing.

### v0.3 Phase 3 - Search, Files, QA, And Release

Complete higher quality retrieval and release hardening.

- Integrate `index_course_content` and `search_course_content` when available.
- Add file metadata and text extraction support when Stage 3 MCP tools are available.
- Add deterministic tests around routing, fallback behavior, and answer formatting.
- Add masked/manual MCP verification for course `5704`.
- Update docs, environment guide, and deployment notes.
- Deploy to Vercel and verify the production chat flow.

Acceptance criteria:

- Search-backed hub Q&A works against course `5704`.
- Missing Stage 2 or Stage 3 tools degrade cleanly.
- No raw tokens, raw API payloads, or unnecessary student data are returned to the browser.
- Typecheck, lint, build, and documented manual tests pass.

## GitHub Issues To Create

### Phase 1

- [#9 - `[v0.3] Add Student Hub runtime configuration`](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/9)
- [#12 - `[v0.3] Add Student Hub dashboard action and empty-course availability`](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/12)
- [#11 - `[v0.3] Add Canvas MCP Student Hub content adapter`](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/11)
- [#10 - `[v0.3] Track missing MCP content-tool capability states`](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/10)

### Phase 2

- [#14 - `[v0.3] Route personal, support, mixed, and unclear questions`](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/14)
- [#13 - `[v0.3] Format grounded Student Hub answers with sources and next actions`](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/13)
- [#15 - `[v0.3] Add sensitive-topic escalation responses`](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/15)

### Phase 3

- [#16 - `[v0.3] Integrate Student Hub search and indexing tools`](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/16)
- [#18 - `[v0.3] Add Student Hub file metadata and text support`](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/18)
- [#17 - `[v0.3] Add v0.3 tests, deployment checks, and release documentation`](https://github.com/ciaranqnexted/canvas-chat-mcp/issues/17)

## Monday.com Sync

Target: sync the three top-level milestones above as monday.com items.

Current blocker: the monday.com connector returned `token_expired` on May 1, 2026. Re-authenticate the Monday connector, then sync each milestone with links back to the matching GitHub milestone and issue set.

GitHub milestone URLs:

- [v0.3 Phase 1 - Student Hub Foundation](https://github.com/ciaranqnexted/canvas-chat-mcp/milestone/4)
- [v0.3 Phase 2 - Routing And Grounded Hub Answers](https://github.com/ciaranqnexted/canvas-chat-mcp/milestone/5)
- [v0.3 Phase 3 - Search, Files, QA, And Release](https://github.com/ciaranqnexted/canvas-chat-mcp/milestone/6)

## Implementation Order

1. Create GitHub milestones and top-level implementation issues.
2. Add Student Hub config and type support.
3. Add dashboard action and fallback support route.
4. Add MCP adapter methods for Stage 1 tools.
5. Add routing helpers and answer formatting.
6. Add Stage 2 search integration when MCP tools are live.
7. Add Stage 3 file support when MCP tools are live.
8. Run typecheck, lint, build, masked MCP checks, and Vercel smoke checks.

## Testing Plan

- Unit-level checks through TypeScript compiler and lint.
- Production build with `npm run build`.
- Manual local chat checks:
  - email lookup and OTP verification
  - profile dashboard
  - Student Hub action before MCP content tools exist
  - support question fallback
  - personal data question still routes to existing Canvas tools
- Manual MCP checks:
  - tool list includes Stage 1 tools
  - course `5704` modules/pages can be retrieved
  - returned hub answer includes source label and Canvas link when available
- Production checks after deployment:
  - Vercel env vars present
  - `/chat` loads on desktop and mobile widths
  - Canvas mode does not expose raw MCP errors or secrets
