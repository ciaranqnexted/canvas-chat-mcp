import { callCanvasMcpTool } from './mcp-http-client'

export type CanvasProfileActionId = 'see_courses' | 'view_exam_results'

export interface CanvasCourseSummary {
  course_id?: string | number
  course_name?: string
  name?: string
  status?: string
}

export interface CanvasCompletedModule {
  module_id?: string | number
  module_name?: string
  name?: string
  course_id?: string | number
  course_name?: string
  completed_at?: string | null
  exam_result_available?: boolean
  result?: string | number
  score?: string | number
  grade?: string | number
}

export interface CanvasUserProfile {
  user_id?: string | number
  id?: string | number
  name?: string
  email?: string
  status?: string
  enrolments: CanvasCourseSummary[]
  completed_modules: CanvasCompletedModule[]
}

export interface CanvasProfileAction {
  id: CanvasProfileActionId
  label: string
}

const sessionProfiles = new Map<string, CanvasUserProfile>()

export function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function normalizeProfile(raw: unknown, email: string): CanvasUserProfile | null {
  const root = asRecord(raw)

  if (root.not_found === true || root.found === false || root.status === 'not_found') {
    return null
  }

  const profile = asRecord(root.profile ?? root.user ?? root)
  const enrolments = asArray<CanvasCourseSummary>(
    profile.enrolments ?? profile.enrollments ?? profile.courses
  )
  const completedModules = asArray<CanvasCompletedModule>(
    profile.completed_modules ?? profile.completedModules ?? profile.modules
  )

  return {
    user_id: profile.user_id as string | number | undefined,
    id: profile.id as string | number | undefined,
    name: profile.name as string | undefined,
    email: (profile.email as string | undefined) ?? email,
    status: profile.status as string | undefined,
    enrolments,
    completed_modules: completedModules,
  }
}

export function profileActions(profile: CanvasUserProfile): CanvasProfileAction[] {
  const actions: CanvasProfileAction[] = []

  if (profile.enrolments.length > 0) {
    actions.push({ id: 'see_courses', label: 'See your courses' })
  }

  if (profile.completed_modules.length > 0) {
    actions.push({ id: 'view_exam_results', label: 'View exam results' })
  }

  return actions
}

export function saveProfile(sessionId: string, profile: CanvasUserProfile): void {
  sessionProfiles.set(sessionId, profile)
}

export function getSavedProfile(sessionId: string): CanvasUserProfile | undefined {
  return sessionProfiles.get(sessionId)
}

function userId(profile: CanvasUserProfile): string | number | undefined {
  return profile.user_id ?? profile.id
}

export async function lookupProfileByEmail(
  sessionId: string,
  email: string
): Promise<CanvasUserProfile | null> {
  const raw = await callCanvasMcpTool('get_user_profile', { email })
  const profile = normalizeProfile(raw, email)

  if (profile) saveProfile(sessionId, profile)

  return profile
}

export async function getCoursesForProfile(profile: CanvasUserProfile): Promise<CanvasCourseSummary[]> {
  const id = userId(profile)
  if (!id) return profile.enrolments

  try {
    const raw = await callCanvasMcpTool('list_user_courses', { user_id: id })
    const record = asRecord(raw)
    return asArray<CanvasCourseSummary>(record.courses ?? record.enrolments ?? record.enrollments ?? raw)
  } catch {
    return profile.enrolments
  }
}

export async function getExamResultsForProfile(profile: CanvasUserProfile): Promise<CanvasCompletedModule[]> {
  const id = userId(profile)
  if (!id) return profile.completed_modules

  try {
    const raw = await callCanvasMcpTool('get_user_exam_results', { user_id: id })
    const record = asRecord(raw)
    return asArray<CanvasCompletedModule>(record.results ?? record.exam_results ?? record.modules ?? raw)
  } catch {
    return profile.completed_modules
  }
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

  const actions = profileActions(profile)
  if (actions.length > 0) {
    lines.push('', 'Choose one of the options below.')
  }

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
    'Here are the completed modules and available exam result details I found:',
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
