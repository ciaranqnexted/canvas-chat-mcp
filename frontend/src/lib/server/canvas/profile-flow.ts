import {
  canvasStudentCapabilities,
  canvasUserId,
  findCanvasUserByEmail,
  getCanvasCourses,
  getCanvasExamResults,
  type CanvasCompletedModule,
  type CanvasCourseSummary,
  type CanvasUserProfile,
} from './student-adapter'

export type CanvasProfileActionId =
  | 'view_profile'
  | 'see_courses'
  | 'see_enrolments'
  | 'view_assignments'
  | 'view_deadlines'
  | 'view_grades'
  | 'view_exam_results'
  | 'view_announcements'
  | 'get_support'

export interface CanvasProfileAction {
  id: CanvasProfileActionId
  label: string
  disabled?: boolean
  reason?: string
}

export function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function disabledAction(
  id: CanvasProfileActionId,
  label: string,
  reason: string
): CanvasProfileAction {
  return { id, label, disabled: true, reason }
}

function hasCanvasUser(profile: CanvasUserProfile): boolean {
  return Boolean(canvasUserId(profile))
}

export function profileActions(profile: CanvasUserProfile): CanvasProfileAction[] {
  const hasCourses = profile.enrolments.length > 0
  const noCoursesReason = 'No active course enrolments were returned.'
  const noUserReason = 'Canvas did not return a student user id.'

  return [
    { id: 'view_profile', label: 'Profile' },
    hasCourses
      ? { id: 'see_courses', label: 'Courses' }
      : disabledAction('see_courses', 'Courses', noCoursesReason),
    hasCourses
      ? { id: 'see_enrolments', label: 'Enrolments' }
      : disabledAction('see_enrolments', 'Enrolments', noCoursesReason),
    canvasStudentCapabilities.grades && hasCanvasUser(profile)
      ? { id: 'view_grades', label: 'Grades and results' }
      : disabledAction('view_grades', 'Grades and results', noUserReason),
    canvasStudentCapabilities.assignments
      ? { id: 'view_assignments', label: 'Assignments' }
      : disabledAction('view_assignments', 'Assignments', 'Student-scoped assignments are not exposed by the MCP yet.'),
    canvasStudentCapabilities.deadlines
      ? { id: 'view_deadlines', label: 'Deadlines' }
      : disabledAction('view_deadlines', 'Deadlines', 'Deadline data needs a student-scoped assignment tool.'),
    canvasStudentCapabilities.announcements
      ? { id: 'view_announcements', label: 'Announcements' }
      : disabledAction('view_announcements', 'Announcements', 'Announcement lookup is not connected yet.'),
    { id: 'get_support', label: 'Support' },
  ]
}

export async function lookupProfileByEmail(email: string): Promise<CanvasUserProfile | null> {
  return findCanvasUserByEmail(email)
}

export async function getCoursesForProfile(
  profile: CanvasUserProfile
): Promise<CanvasCourseSummary[]> {
  return getCanvasCourses(profile)
}

export async function getExamResultsForProfile(
  profile: CanvasUserProfile
): Promise<CanvasCompletedModule[]> {
  return getCanvasExamResults(profile)
}

export function formatOtpPrompt(profile: CanvasUserProfile): string {
  const name = profile.name ? ` for ${profile.name}` : ''

  return [
    `I found the Canvas profile${name}.`,
    '',
    'Enter the one-time code to verify this student session.',
    'Prototype note: no email is sent in this build; use the development OTP configured in `NEXI_DEV_OTP`.',
  ].join('\n')
}

export function formatStudentDashboard(profile: CanvasUserProfile): string {
  const name = profile.name || 'there'

  return [
    `You are verified as ${name}.`,
    '',
    `Courses found: ${profile.enrolments.length}`,
    `Completed modules/results found: ${profile.completed_modules.length}`,
    '',
    'Choose an option below or ask for courses, enrolments, grades, deadlines, announcements, or support.',
  ].join('\n')
}

export function formatProfile(profile: CanvasUserProfile): string {
  const lines = [
    'I found this Canvas profile:',
    '',
    `Name: ${profile.name || 'Not supplied'}`,
    `Email: ${profile.email || 'Not supplied'}`,
    `Status: ${profile.status || 'Unknown'}`,
    `Current enrolments: ${profile.enrolments.length}`,
    `Completed modules: ${profile.completed_modules.length}`,
  ]

  return lines.join('\n')
}

export function formatCourses(courses: CanvasCourseSummary[]): string {
  if (courses.length === 0) return 'I could not find any current course enrolments for this profile.'

  return [
    'Here are the courses I found:',
    '',
    ...courses.map((course, index) => {
      const name = course.course_name || course.name || 'Untitled course'
      const status = course.status ? ` (${course.status})` : ''
      return `${index + 1}. ${name}${status}`
    }),
  ].join('\n')
}

export function formatExamResults(results: CanvasCompletedModule[]): string {
  if (results.length === 0) return 'I could not find completed modules or exam results for this profile.'

  return [
    'Here are the grades and exam result details I found:',
    '',
    ...results.map((module, index) => {
      const name = module.module_name || module.name || 'Untitled module'
      const result = module.result ?? module.score ?? module.grade
      const resultText = result === undefined ? 'result not supplied' : `result: ${result}`
      const completedAt = module.completed_at ? `, completed ${module.completed_at}` : ''
      return `${index + 1}. ${name} - ${resultText}${completedAt}`
    }),
  ].join('\n')
}

export function formatEnrolments(courses: CanvasCourseSummary[]): string {
  if (courses.length === 0) return 'I could not find any enrolments for this profile.'

  return [
    'Here are the enrolments I found:',
    '',
    ...courses.map((course, index) => {
      const name = course.course_name || course.name || 'Untitled course'
      const status = course.status || course.workflow_state || 'status not supplied'
      return `${index + 1}. ${name} - ${status}`
    }),
  ].join('\n')
}

export function formatSupport(): string {
  return [
    'For student support, contact your course support team or student services through your normal Canvas support channel.',
    '',
    'I can still help summarize your available Canvas profile, courses, enrolments, and grades from the connected MCP data.',
  ].join('\n')
}

export function formatUnavailableFeature(feature: string, reason: string): string {
  return [
    `${feature} is not available in Nexi yet.`,
    '',
    reason,
  ].join('\n')
}
