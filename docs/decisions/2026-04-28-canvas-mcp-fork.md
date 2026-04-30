# ADR: Fork and trim the Canvas MCP server

Date: 2026-04-28
Status: Accepted
Supersedes: `2025-04-24-canvas-mcp.md` (which left "which MCP" and "what tool surface" open)

## Context

The earlier ADR committed us to using a Canvas MCP server but did not name one or define the tool surface. We surveyed `vishalsachdev/canvas-mcp` (MIT, Python 3.10+, ~88 tools, actively maintained, last commit 2026-04-27). It is the most complete Canvas MCP we could find, but its surface is far larger than the chatbot needs:

- The student chatbot answers four kinds of question: "what courses am I in?", "what's due?", "any announcements?", "what are my grades?"
- Exposing 88 tools to Claude inflates token cost on every request, increases the chance of off-track tool calls, and broadens the auth/safety surface unnecessarily.
- The upstream code is decorator-registered and modular — `canvas_mcp/server.py:register_all_tools()` is a single function that calls many `register_*_tools` helpers. Trimming is a one-file change.

## Decision

1. **Fork** `vishalsachdev/canvas-mcp` to `nxd-group/canvas-mcp`. License remains MIT; LICENSE/NOTICE preserved verbatim.
2. **Branch** `nxd/trimmed-v1`, pinned to upstream SHA at fork time (record SHA in the fork's README).
3. **Trim** `canvas_mcp/server.py:register_all_tools()` to register only the four tools the chatbot needs. All other `register_*` calls are commented out (not deleted) so future upstream merges produce small, mechanical conflicts rather than reintroducing tools.
4. **Tag** `v0.1.0-nxd` on the trimmed branch. The Next.js server runtime provisions this MCP server as an external dependency.
5. **Tools kept** (we adopt upstream names — the app stays a thin caller):

   | Tool | Source module | Why |
   |---|---|---|
   | `list_courses` | `tools/courses.py` (shared) | Establishes course context — almost every query starts here |
   | `list_assignments` | `tools/assignments.py` | Deadlines, task lists, "what's due" |
   | `list_discussion_topics` | `tools/discussions.py` | Announcements (system prompt pins `only_announcements=true`) |
   | `get_my_course_grades` | student grades module | Direct grades query, student-scoped |

6. **Auth:** production Canvas access is per-student OAuth. The Next.js server stores the Canvas token server-side and passes it to the MCP process or MCP HTTP endpoint for that student's request.
7. **Local development:** a developer may use a test Canvas token locally, but this must not be the production path.

## Consequences

**Positive**
- Claude sees only four tools — smaller prompt, fewer wrong turns, simpler eval surface.
- Surface drift should be detectable: the Next.js MCP client should assert the advertised tool set before exposing tools to the model. If upstream renames or removes one of our four, fail closed.
- App code stays thin — no wrapper schemas, no name translation. We accept upstream names as the contract.

**Negative**
- We carry a fork. Upstream maintenance is on us — see "Upstream sync procedure" below.
- Per-student OAuth is required before Canvas mode can be production-ready.
- `list_discussion_topics` exposes more than announcements at the API layer. We rely on the system prompt to always pass `only_announcements=true`. If a student crafts a prompt that gets the model to omit the flag, they could see general discussions. This is acceptable for v1 because Canvas already authorises the read at the token level (the student would have access in the Canvas UI anyway), but worth tightening to a hard-coded flag in the fork before any production rollout.

## Upstream sync procedure

Quarterly, or whenever an upstream security advisory lands:

```
# In the nxd-group/canvas-mcp working tree
git fetch upstream
git rebase upstream/main          # or merge — preference: rebase
# Resolve conflicts in canvas_mcp/server.py (the trimmed register_all_tools)
# Run upstream test suite + our local "advertises 4 tools" smoke test
git tag v0.1.X-nxd                # bump tag
git push origin nxd/trimmed-v1 --tags
```

Then in this repo bump the configured Canvas MCP version in deployment/package setup and run the app's Canvas MCP integration tests against a real Canvas test account.

## Alternatives considered

- **Use upstream as-is, filter at the SDK layer.** Cheaper to set up, but Claude still sees all 88 tools — token cost and off-track-call risk remain. Rejected.
- **Build a wrapper MCP server in this repo that calls Canvas REST directly.** Maximum control, no upstream dependency, but doubles the code we own. The four tools we need are all things upstream already implements correctly. Rejected as YAGNI for v1.
- **Keep our own `get_courses`/`get_assignments`/`get_announcements`/`get_grades` names and rename in the fork.** Cleaner for our prompt but adds permanent translation work in the fork. Rejected — adopting upstream names is a one-time cost vs an ongoing one.
