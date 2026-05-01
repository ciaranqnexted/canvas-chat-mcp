# Canvas MCP Student Hub v0.3 Tool Prompt

Use this prompt with the Canvas-MCP Vercel deployed chat/repo agent.

## Paste-Ready Prompt

You are working on our Canvas MCP server used by the Nexi Student Chatbot.

The Nexi app is already updated on branch `feat/nexi-v0.3` to call the Student Hub tools listed below. Your task is to update the Canvas MCP server so it exposes the Stage 1 read-only Student Hub content tools needed for grounded support Q&A.

## Context

Nexi calls the MCP endpoint over HTTP JSON-RPC at `/api/mcp`.

Every MCP request includes:

- `x-canvas-url`: Canvas base URL, for example `https://ait.instructure.com`
- `x-canvas-token`: Canvas API token for the target Canvas account
- `authorization: Bearer ...`: optional MCP deployment bearer token

The MCP server must use `x-canvas-url` and `x-canvas-token` per request. Do not hard-code one Canvas account into the server.

## Student Hub Target

- Canvas course ID: `5704`
- Canvas course URL: `https://ait.instructure.com/courses/5704`
- Canvas account ID: `1`
- Canvas account name: `Technology & Design (T&D)`
- Product label: `AIT Student Hub`

The tools must accept `course_id` as an input because future institutions or accounts may use a different hub course.

## Required Stage 1 Tools

Implement these MCP tools:

1. `get_course_pages`
2. `get_course_page`
3. `get_course_modules`
4. `get_module_items`

All tools must be read-only. Do not add create, update, delete, publish, enrolment, grade mutation, or admin mutation behaviour.

## Canvas API Endpoints

Use the Canvas REST API:

- List pages: `GET /api/v1/courses/:course_id/pages`
- Show page: `GET /api/v1/courses/:course_id/pages/:url_or_id`
- Explicit numeric page ID form when needed: `GET /api/v1/courses/:course_id/pages/page_id::id`
- List modules: `GET /api/v1/courses/:course_id/modules`
- List module items: `GET /api/v1/courses/:course_id/modules/:module_id/items`

Useful include parameters:

- Pages list supports `include[]=body` when body retrieval is requested.
- Modules list supports `include[]=items` and `include[]=content_details`.
- Module items supports `include[]=content_details`.

Canvas docs:

- Pages API: https://canvas.instructure.com/doc/api/pages.html
- Modules API: https://documentation.instructure.com/doc/api/modules.html

## Tool 1: `get_course_pages`

Input:

```ts
{
  course_id: string | number;
  include_body?: boolean;
  search_term?: string;
  published?: boolean;
}
```

Canvas call:

```txt
GET /api/v1/courses/:course_id/pages
```

Rules:

- If `include_body` is true, pass `include[]=body`.
- If `published` is provided, pass it through to Canvas.
- If `search_term` is provided, pass it through to Canvas.
- Handle Canvas pagination and return all available pages or a sensible maximum with a `truncated` flag.

Output:

```ts
{
  pages: Array<{
    page_id?: string | number;
    id?: string | number;
    title?: string;
    url?: string;
    html_url?: string;
    body?: string;
    published?: boolean;
    front_page?: boolean;
    updated_at?: string | null;
    locked_for_user?: boolean;
    lock_explanation?: string | null;
  }>;
  course_id: string | number;
  truncated?: boolean;
}
```

## Tool 2: `get_course_page`

Input:

```ts
{
  course_id: string | number;
  page_url?: string;
  page_id?: string | number;
}
```

Canvas call:

```txt
GET /api/v1/courses/:course_id/pages/:url_or_id
```

Rules:

- Require either `page_url` or `page_id`.
- Prefer `page_url` if both are supplied.
- If `page_id` is supplied, use the Canvas explicit page ID form `page_id:<id>` so numeric page URLs are not confused with page IDs.
- Return the page body from Canvas.

Output:

```ts
{
  page: {
    page_id?: string | number;
    id?: string | number;
    title?: string;
    url?: string;
    html_url?: string;
    body?: string;
    published?: boolean;
    front_page?: boolean;
    updated_at?: string | null;
    locked_for_user?: boolean;
    lock_explanation?: string | null;
  };
  course_id: string | number;
}
```

## Tool 3: `get_course_modules`

Input:

```ts
{
  course_id: string | number;
  include_items?: boolean;
  include_content_details?: boolean;
  student_id?: string | number;
  search_term?: string;
}
```

Canvas call:

```txt
GET /api/v1/courses/:course_id/modules
```

Rules:

- If `include_items` is true, pass `include[]=items`.
- If `include_content_details` is true, pass `include[]=items&include[]=content_details`.
- If `student_id` is provided, pass it through to Canvas so module completion details can be returned when allowed.
- Handle pagination.

Output:

```ts
{
  modules: Array<{
    id?: string | number;
    module_id?: string | number;
    name?: string;
    position?: number;
    workflow_state?: string;
    published?: boolean;
    completed_at?: string | null;
    items?: Array<{
      id?: string | number;
      item_id?: string | number;
      module_id?: string | number;
      title?: string;
      type?: string;
      content_id?: string | number;
      page_url?: string;
      html_url?: string;
      url?: string;
      published?: boolean;
      locked_for_user?: boolean;
      lock_explanation?: string | null;
      content_details?: unknown;
    }>;
  }>;
  course_id: string | number;
  truncated?: boolean;
}
```

## Tool 4: `get_module_items`

Input:

```ts
{
  course_id: string | number;
  module_id: string | number;
  include_content_details?: boolean;
  student_id?: string | number;
  search_term?: string;
}
```

Canvas call:

```txt
GET /api/v1/courses/:course_id/modules/:module_id/items
```

Rules:

- If `include_content_details` is true, pass `include[]=content_details`.
- If `student_id` is provided, pass it through to Canvas.
- Handle pagination.

Output:

```ts
{
  items: Array<{
    id?: string | number;
    item_id?: string | number;
    module_id?: string | number;
    title?: string;
    type?: string;
    content_id?: string | number;
    page_url?: string;
    html_url?: string;
    url?: string;
    published?: boolean;
    locked_for_user?: boolean;
    lock_explanation?: string | null;
    content_details?: unknown;
  }>;
  course_id: string | number;
  module_id: string | number;
  truncated?: boolean;
}
```

## Error Handling

Use MCP tool errors only for invalid input or unexpected Canvas failures.

For Canvas 401/403:

- Return a clear MCP error without exposing the Canvas token.
- Include only safe details such as status code and endpoint category.

For Canvas 404:

- Return a safe not-found shape or MCP error with `not_found: true`.

Never return:

- Canvas API tokens
- request headers
- raw stack traces
- raw HTML error pages
- unpublished/restricted content beyond what Canvas returned to the authorized token

## Acceptance Criteria

1. `tools/list` includes:
   - `get_course_pages`
   - `get_course_page`
   - `get_course_modules`
   - `get_module_items`
2. `get_course_modules({ course_id: 5704, include_items: true })` returns modules for the AIT Student Hub when the Canvas token has access.
3. `get_course_pages({ course_id: 5704 })` returns page summaries for the hub when the Canvas token has access.
4. `get_course_page({ course_id: 5704, page_url: "<page url>" })` returns page body text/HTML for a page from the hub.
5. `get_module_items({ course_id: 5704, module_id: "<module id>" })` returns module items.
6. Existing Nexi v0.2 tools still work:
   - `get_user_by_email`
   - `get_user_profile`
   - `list_user_courses`
   - `get_user_exam_results`
7. The MCP server still reads `x-canvas-url` and `x-canvas-token` per request.
8. The server deploys successfully on Vercel.

## After Deployment

Tell me:

1. The deployed MCP URL.
2. The exact `tools/list` output.
3. A masked verification result for course `5704`:
   - `has_get_course_pages=true/false`
   - `has_get_course_page=true/false`
   - `has_get_course_modules=true/false`
   - `has_get_module_items=true/false`
   - `hub_modules_returned=true/false`
   - `hub_pages_returned=true/false`

Do not paste Canvas tokens or raw restricted student data.
