# Nexi Chat UI v0.3 Plan

## Goal

Move Nexi from a full-screen prototype surface to a polished, mobile-friendly chatbot interface that feels appropriate for a student support workflow.

## Current UI Slice

Implemented first:

- Constrain the chat to a centered panel instead of full-browser layout.
- Add a page-level header with Nexi branding and connection state.
- Add a footer for lightweight product context.
- Keep the chat panel at a stable height with internal scrolling.
- Improve mobile spacing for header, messages, and input.
- Reduce bubble radius and keep controls compact.

## Next UI Work

1. Add clearer verified/pending student session states.
2. Add a compact profile summary component after OTP verification.
3. Group dashboard actions by category.
4. Add course context indicator when a course is selected.
5. Add empty, loading, error, and unavailable states with consistent styling.
6. Add accessibility pass for focus states, keyboard flow, and contrast.
7. Add Playwright or route-level UI regression checks.

## Acceptance Criteria

- Chat panel is constrained on desktop and does not feel like a full-page document.
- Mobile view keeps the input visible and messages readable.
- Header, footer, message list, and input do not overlap at common viewport sizes.
- Long action labels and disabled-state reasons wrap without breaking layout.
- Visual style remains restrained and suitable for repeated student use.

