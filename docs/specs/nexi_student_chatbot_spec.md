# Nexi Student Chatbot --- Product & Technical Specification

## 1. Product Goal

Build **Nexi**, a student-facing chatbot connected to a Canvas MCP
server, enabling students to securely access and interact with their
Canvas data through guided options and natural language queries.

Primary Objective:

Provide a simplified interface for students to access courses,
assignments, grades, enrolments, announcements, and support without
navigating Canvas directly.

------------------------------------------------------------------------

## 2. Core User Flow

Student opens Nexi → enters email → validated → Canvas lookup → OTP
(simulated) → personalised menu → student selects option → Nexi fetches
data → returns summary + Q&A

------------------------------------------------------------------------

## 3. Authentication Strategy

### Options

-   Email only (prototype only)
-   Email + OTP (recommended MVP)
-   Canvas OAuth (preferred production)
-   LTI / SSO (ideal long-term)

### Prototype Authentication Behaviour

``` env
NEXI_OTP=false
NEXI_OTP_EMAIL=ciaran.quinlan@nexted.com.au
NEXI_DEV_OTP=45454545
```

#### Prototype Rules

-   OTP is simulated
-   No email is sent
-   Accepted OTP = 45454545

#### Future OTP

-   Real OTP when NEXI_OTP=true

#### Production Rule

``` ts
if (process.env.NODE_ENV === "production" && process.env.NEXI_OTP === "false") {
  throw new Error("Prototype OTP mode must not be enabled in production");
}
```

------------------------------------------------------------------------

## 4. Feature Overview

Top-level: - Profile - Courses - Enrolments - Assignments - Grades -
Announcements - Deadlines - Support

------------------------------------------------------------------------

## 5. Key Features

### MVP

-   Personalised dashboard
-   Dynamic buttons
-   Disabled states with reasons
-   Course Q&A
-   Assignment tracking

### Advanced

-   Study planner
-   Risk alerts
-   Daily focus suggestions

------------------------------------------------------------------------

## 6. Data Model

``` ts
type StudentSession = {
  studentEmail: string;
  canvasUserId: string;
  verified: boolean;
  selectedCourseId?: string;
};
```

------------------------------------------------------------------------

## 7. MCP Requirements

-   get_user_by_email
-   get_profile
-   get_courses
-   get_assignments
-   get_grades

Only expose student-safe APIs.

------------------------------------------------------------------------

## 8. Permissions

-   Students access only their data
-   No admin access
-   No destructive actions

------------------------------------------------------------------------

## 9. Guardrails

Do not: - Expose other students' data - Predict grades - Modify
enrolments

------------------------------------------------------------------------

## 10. Acceptance Tests

-   Invalid email rejected
-   Non-existent email blocked
-   Active courses shown
-   Context maintained

------------------------------------------------------------------------

## 11. Risks

-   Weak auth in prototype
-   Data leakage
-   API limits
-   Hallucination risk

------------------------------------------------------------------------

## 12. Build Phases

Phase 1: - Auth - Profile + courses - UI

Phase 2: - Assignments - Grades

Phase 3: - Security hardening

------------------------------------------------------------------------

## End of Spec
