# Finding `sis_user_id` in Canvas (for MCP Integration)

## Overview

Canvas provides a native field called:

    sis_user_id

This represents the **Student Information System (SIS) ID**, commonly
used as the student number.

It is **not a custom field**.

------------------------------------------------------------------------

## Where `sis_user_id` Appears

### 1. User Object

When fetching a user:

``` json
{
  "id": 12345,
  "name": "Student Name",
  "sis_user_id": "S1234567"
}
```

### 2. Enrollment Object (optional)

``` json
{
  "user_id": 12345,
  "course_id": 67890,
  "sis_user_id": "S1234567"
}
```

------------------------------------------------------------------------

## How to Retrieve via MCP

### Step 1 --- Lookup User

Use:

    canvas.get_user_by_email(email)

### Step 2 --- Extract SIS

From response:

    user.sis_user_id

------------------------------------------------------------------------

## Important Requirements

### Permissions

`sis_user_id` is only returned if:

-   The API token has **SIS visibility permissions**
-   Typically requires **admin or elevated service account**

If missing:

-   Field may be null
-   Or omitted entirely

------------------------------------------------------------------------

## Recommended MCP Model

``` ts
type StudentProfile = {
  canvasUserId: string;
  name: string;
  email: string;
  sisUserId?: string;
};
```

------------------------------------------------------------------------

## Usage in Nexi

-   Use email → find user
-   Store:
    -   `canvas_user_id`
    -   `sis_user_id`
-   Use `canvas_user_id` for API calls
-   Use `sis_user_id` for:
    -   Display (student number)
    -   Support workflows
    -   Cross-system linking

------------------------------------------------------------------------

## Nexi Implementation Status

The chatbot now treats `sis_user_id` as the preferred student number.

Lookup behavior:

1.  Call the configured Canvas MCP profile lookup.
2.  Normalize `sis_user_id` from the returned user object when present.
3.  If the profile response is valid but does not include SIS, make a
    best-effort enrichment call to:

        get_user_by_email({ email })

4.  If SIS is still unavailable, keep the Canvas user ID for the session
    and display that the SIS ID was not returned by Canvas.

The app also checks common compatibility aliases and nested shapes:

-   `user.sis_user_id`
-   `profile.sis_user_id`
-   root-level `sis_user_id`
-   login information / pseudonym `sis_user_id`
-   enrolment-level `sis_user_id`

------------------------------------------------------------------------

## Required MCP Support

To reliably identify the SIS ID, the Canvas MCP server should expose or
update:

``` ts
get_user_by_email({ email }) -> {
  user: {
    id: number | string;
    name: string;
    email: string;
    sis_user_id?: string | null;
  }
}
```

The existing `get_user_profile({ email })` can also satisfy this
requirement if it returns `user.sis_user_id` or `profile.sis_user_id`.

No separate MCP tool is needed if either of those tools returns
`sis_user_id`. If the field is missing even though the user exists, the
Canvas token used by the MCP server likely lacks SIS visibility
permissions.

------------------------------------------------------------------------

## Other MCP Data Still Needed

The chatbot can already request profile, courses/enrolments, and
grades/results when the MCP server exposes the supported tools.

For the remaining v0.2 academic actions, the MCP server still needs
student-scoped read tools or equivalent responses:

-   `get_assignments({ user_id, course_id? })`
-   `get_announcements({ user_id, course_id? })`
-   deadline data, either from `get_assignments` `due_at` values or a
    dedicated deadline summary tool
-   course/enrolment responses that include status/workflow state and,
    when available, `sis_user_id`

These should remain read-only and scoped to the matched Canvas user.

------------------------------------------------------------------------

## Risks

  -----------------------------------------------------------------------
  Risk           Impact                  Mitigation
  -------------- ----------------------- --------------------------------
  Missing SIS    Student number          Ensure correct API permissions
  field          unavailable             

  Null SIS       Some users not imported Fallback to Canvas ID
  values         from SIS                

  Overexposure   Sensitive identifier    Only show when required
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## Test Cases

### Test 1 --- Valid SIS

-   Input: known student email
-   Expect: `sis_user_id` returned

### Test 2 --- Missing SIS

-   Input: manually created user
-   Expect: `sis_user_id` = null

### Test 3 --- Permission Failure

-   Input: low-privilege token
-   Expect: field missing

------------------------------------------------------------------------

## Summary

-   `sis_user_id` is a **standard Canvas field**
-   Accessible via user or enrollment endpoints
-   Requires correct permissions
-   Should be stored and used as the student number in Nexi

------------------------------------------------------------------------

## End
