# Nexi Student Chatbot --- Product & Technical Specification (v0.3)

## 1. Product Goal

Build **Nexi**, a student-facing chatbot connected to a Canvas MCP
server, enabling students to securely access and interact with their
Canvas data and Student Services Hub through guided options and natural
language queries.

------------------------------------------------------------------------

## 2. Student Services Hub Feature

### Hub Configuration

-   Course ID: 5704
-   URL: https://ait.instructure.com/courses/5704
-   Account:
    -   id: 1
    -   name: Technology & Design (T&D)

### Behaviour

-   Acts as:
    -   Read-only knowledge base
    -   Normal enrolled course (labelled as hub)
-   Available even if no active courses

------------------------------------------------------------------------

## 3. Routing Logic

-   Personal data → Canvas tools
-   Support questions → Student Hub
-   Mixed → combine
-   Unclear → ask clarifying question

------------------------------------------------------------------------

## 4. Answer Format

-   Short summary
-   Source reference: "AIT Student Hub \> \[Page/Module\]"
-   Optional Canvas link
-   Suggested next actions

------------------------------------------------------------------------

## 5. MCP Server Requirements

### Stage 1 (MVP)

-   get_course_pages
-   get_course_page
-   get_course_modules
-   get_module_items

### Stage 2

-   index_course_content
-   search_course_content

### Stage 3

-   get_course_files
-   get_file_metadata
-   download_file_text

------------------------------------------------------------------------

## 6. MCP Issues to Raise

### Issue 1: get_course_pages

-   List pages for course
-   Must support body retrieval

### Issue 2: get_course_page

-   Retrieve full page content

### Issue 3: get_course_modules

-   Retrieve module structure

### Issue 4: get_module_items

-   Retrieve items per module

### Issue 5: index_course_content

-   Build searchable index

### Issue 6: search_course_content

-   Return ranked results

------------------------------------------------------------------------

## 7. Security

-   Respect Canvas permissions
-   No access to restricted content
-   No raw API exposure

------------------------------------------------------------------------

## 8. Risks

-   MCP missing content tools → blocking
-   Poor indexing → bad answers
-   Hallucination → must ground answers
-   Sensitive topics → require escalation

------------------------------------------------------------------------

## 9. Test Target

-   Course: 5704
-   Account: Technology & Design (T&D)

------------------------------------------------------------------------

## End of Spec (v0.3)
