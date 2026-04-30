# Canvas MCP Server Tool Update Prompt

Use this prompt with the Canvas-MCP Vercel chat/repo agent.

## Paste-Ready Prompt

You are working on our Canvas MCP server that is consumed by the Nexi
student chatbot. Update the MCP server so it exposes the full read-only,
student-scoped tool set needed by the current Nexi build and the next
academic-data milestone.

The Nexi app calls the MCP endpoint over HTTP JSON-RPC at `/api/mcp`.
The app sends these headers on every MCP request:

- `x-canvas-url`: Canvas base URL, for example `https://ait.instructure.com`
- `x-canvas-token`: Canvas API token for the target Canvas account
- `authorization: Bearer ...`: optional MCP server bearer token, if enabled

The MCP server must use `x-canvas-url` and `x-canvas-token` per request.
Do not hard-code a single Canvas account into the server.

Current tool list:

```txt
list_courses
get_my_todo_items
get_my_course_grades
get_my_upcoming_assignments
get_my_submission_status
get_my_peer_reviews_todo
get_course_details
get_user_profile
list_user_courses
get_user_exam_results
```

## Goal

Make the MCP server return enough student-safe Canvas data for Nexi to:

1. Find a student by email.
2. Return the Canvas user ID and `sis_user_id`.
3. Show profile, timezone, account name, active course count, and total enrolments.
4. List the student's courses/enrolments.
5. Return grades/exam results without prediction.
6. Return assignments, deadlines, announcements, and submission status for the matched student.

All tools must be read-only. Do not add write/admin/destructive tools to
the student path.

## Required Tool Set

Keep existing tools for compatibility, but add or update the following
student-scoped tools.

### 1. `get_user_by_email`

Required for reliable SIS lookup.

Input:

```ts
{
  email: string;
}
```

Output:

```ts
{
  user: {
    id: string | number;
    canvas_user_id?: string | number;
    name: string;
    email: string;
    sis_user_id?: string | null;
    time_zone?: string | null;
    locale?: string | null;
    workflow_state?: string | null;
  };
  account?: {
    id?: string | number;
    name?: string;
  };
  found: boolean;
}
```

Behavior:

- Search Canvas users by email.
- Return exactly one matching user when possible.
- If no user is found, return `{ found: false }` or a clear not-found shape.
- Include `sis_user_id` from the Canvas user object when available.
- If `sis_user_id` is missing, do not fabricate it.
- If `sis_user_id` is omitted because the token lacks permissions, return the user without SIS and include a non-sensitive warning field if useful.

Canvas note:

`sis_user_id` is a standard Canvas field on the user/enrolment object. It
requires SIS visibility permissions on the Canvas token, typically an
admin or elevated service account token.

### 2. `get_user_profile`

Existing tool. Update it to include SIS and the fields Nexi expects.

Input:

```ts
{
  email: string;
}
```

Preferred output:

```ts
{
  profile: {
    id: string | number;
    user_id?: string | number;
    canvas_user_id?: string | number;
    name: string;
    email: string;
    sis_user_id?: string | null;
    time_zone?: string | null;
    canvas_account_name?: string | null;
    active_course_count?: number;
    total_enrollments?: number;
    enrolments: Array<{
      id?: string | number;
      course_id: string | number;
      name?: string;
      course_name?: string;
      status?: string;
      workflow_state?: string;
      sis_user_id?: string | null;
    }>;
    completed_modules?: Array<{
      id?: string | number;
      module_id?: string | number;
      name?: string;
      module_name?: string;
      course_id?: string | number;
      course_name?: string;
      completed_at?: string | null;
      result?: string | number | null;
      score?: string | number | null;
      grade?: string | number | null;
    }>;
  };
}
```

Compatibility:

- Nexi can also normalize `user.sis_user_id`, root-level `sis_user_id`,
  login/pseudonym `sis_user_id`, and enrolment-level `sis_user_id`.
- Prefer `sis_user_id`; avoid inventing alternative student-number fields.

### 3. `list_user_courses`

Existing tool. Ensure it is student-scoped by Canvas user ID.

Input:

```ts
{
  user_id: string | number;
}
```

Output:

```ts
{
  courses: Array<{
    id?: string | number;
    course_id: string | number;
    name?: string;
    course_name?: string;
    status?: string;
    workflow_state?: string;
    start_at?: string | null;
    end_at?: string | null;
    enrolment_type?: string | null;
    enrollment_state?: string | null;
    sis_user_id?: string | null;
  }>;
}
```

Behavior:

- Return only courses/enrolments for the requested Canvas user.
- Include active/current enrolments where possible.
- Include status/workflow state for disabled-state logic in Nexi.

### 4. `get_user_exam_results`

Existing tool. Keep it, but make the response predictable.

Input:

```ts
{
  user_id: string | number;
  course_id?: string | number;
}
```

Output:

```ts
{
  results: Array<{
    id?: string | number;
    module_id?: string | number;
    name?: string;
    module_name?: string;
    course_id?: string | number;
    course_name?: string;
    completed_at?: string | null;
    result?: string | number | null;
    score?: string | number | null;
    grade?: string | number | null;
  }>;
}
```

Rules:

- Return only grades/results Canvas actually returns.
- Do not predict grades.
- Do not summarize risk or pass/fail unless Canvas returns that exact value.

### 5. `get_assignments`

New tool needed for the next academic-data milestone.

Input:

```ts
{
  user_id: string | number;
  course_id?: string | number;
}
```

Output:

```ts
{
  assignments: Array<{
    id: string | number;
    assignment_id?: string | number;
    name: string;
    course_id: string | number;
    course_name?: string;
    due_at?: string | null;
    unlock_at?: string | null;
    lock_at?: string | null;
    points_possible?: number | null;
    status?: string | null;
    submission_status?: string | null;
    submitted_at?: string | null;
    graded_at?: string | null;
    score?: number | string | null;
    grade?: string | number | null;
    html_url?: string | null;
  }>;
}
```

Behavior:

- If `course_id` is supplied, return assignments for that course only.
- If no `course_id` is supplied, return assignments across the student's active courses.
- Include the student's own submission status for each assignment when available.
- Use `due_at` for deadline summaries.

### 6. `get_announcements`

New tool needed for the next academic-data milestone.

Input:

```ts
{
  user_id: string | number;
  course_id?: string | number;
}
```

Output:

```ts
{
  announcements: Array<{
    id: string | number;
    announcement_id?: string | number;
    title: string;
    message?: string;
    course_id: string | number;
    course_name?: string;
    posted_at?: string | null;
    delayed_post_at?: string | null;
    html_url?: string | null;
  }>;
}
```

Behavior:

- Return only announcements from courses the requested user is enrolled in.
- If `course_id` is supplied, scope to that course.
- Strip or sanitize unsafe HTML if returning announcement body text.

### 7. Optional Alias Tools

Nexi currently has compatibility fallbacks for these names:

- `get_courses({ user_id })`
- `get_grades({ user_id })`

You can implement these as aliases to `list_user_courses` and
`get_user_exam_results`, or leave them out if the existing names remain.

## Important Note About `get_my_*` Tools

The current MCP server has several `get_my_*` tools:

- `get_my_todo_items`
- `get_my_course_grades`
- `get_my_upcoming_assignments`
- `get_my_submission_status`
- `get_my_peer_reviews_todo`

Do not rely on these for Nexi's email/OTP prototype unless they are
explicitly scoped to the matched student. If the MCP server uses an
admin/service token, "my" may mean the token owner, not the student.

If useful, keep these tools for other MCP clients, but add student-scoped
equivalents that accept `user_id`.

## Security And Guardrails

- Read-only tools only.
- Never return Canvas API tokens, request headers, or secrets.
- Never log tokens, student email, student name, raw messages, or SIS IDs.
- Scope every student data lookup to the matched `user_id`.
- If a user is not found, return a not-found result without leaking near matches.
- If the Canvas token lacks permission for SIS fields, return the user without SIS and do not fabricate a value.
- Preserve `sis_user_id` only when Canvas returns it.

## Acceptance Tests

Use a known Canvas test student where possible.

1. `tools/list`
   - Expected: includes `get_user_profile`, `get_user_by_email`,
     `list_user_courses`, `get_user_exam_results`, `get_assignments`, and
     `get_announcements`.

2. `get_user_by_email({ email })`
   - Valid student email returns Canvas user ID, name, email, and
     `sis_user_id` when token permissions allow.
   - Unknown email returns `{ found: false }` or equivalent not-found shape.

3. `get_user_profile({ email })`
   - Includes `profile.sis_user_id` or `user.sis_user_id`.
   - Includes active course count and total enrolment count when available.
   - Includes timezone as the user's actual selected timezone, not the string
     `"Canvas"`.

4. `list_user_courses({ user_id })`
   - Returns only courses for that user.
   - Includes status/workflow state.

5. `get_user_exam_results({ user_id })`
   - Returns only actual Canvas results/grades.
   - Does not predict or infer grades.

6. `get_assignments({ user_id })`
   - Returns assignments across the user's active courses.
   - Includes `due_at` and submission status where available.

7. `get_announcements({ user_id })`
   - Returns announcements only for the user's enrolled courses.

## Definition Of Done

- MCP server builds and deploys on Vercel.
- `tools/list` shows the required tools.
- All required tools return JSON-compatible structured content or JSON text
  that Nexi can parse.
- SIS ID works for a known SIS-backed test user.
- Missing SIS is handled gracefully for a manually created/non-SIS user.
- Existing tools remain backward compatible.

