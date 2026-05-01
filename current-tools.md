The live MCP server currently advertises 21 tools:

list_courses
get_my_todo_items
get_my_course_grades
get_my_upcoming_assignments
get_my_submission_status
get_my_peer_reviews_todo
get_course_details
get_course_modules
get_course_page
get_course_pages
get_module_items
get_user_by_email
get_user_logins
get_user_sis_id
get_user_profile
list_user_courses
get_user_exam_results
get_assignments
get_announcements
get_courses
get_grades

The SIS-specific tools are active: get_user_by_email, get_user_logins, and get_user_sis_id.

The v0.3 Student Hub Stage 1 content tools are active: get_course_pages, get_course_page, get_course_modules, and get_module_items.

Live masked check against course 5704:

- hub_modules_returned=true
- hub_module_count=8
- hub_pages_returned=true
- hub_page_count=14
- get_course_page returned a page object
- get_module_items returned at least one module item
