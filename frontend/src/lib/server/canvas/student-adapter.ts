import { callCanvasMcpTool } from './mcp-http-client'

export interface CanvasCourseSummary {
  course_id?: string | number
  id?: string | number
  course_name?: string
  name?: string
  status?: string
  workflow_state?: string
}

export interface CanvasCompletedModule {
  module_id?: string | number
  id?: string | number
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

export interface CanvasAssignmentSummary {
  assignment_id?: string | number
  id?: string | number
  name?: string
  course_id?: string | number
  course_name?: string
  due_at?: string | null
  status?: string
}

export interface CanvasAnnouncementSummary {
  announcement_id?: string | number
  id?: string | number
  title?: string
  message?: string
  course_id?: string | number
  course_name?: string
  posted_at?: string | null
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

export type CanvasStudentCapability =
  | 'profile'
  | 'courses'
  | 'enrolments'
  | 'assignments'
  | 'grades'
  | 'announcements'
  | 'deadlines'
  | 'support'

type ToolCandidate = {
  name: string
  args: Record<string, unknown>
}

export const canvasStudentCapabilities: Record<CanvasStudentCapability, boolean> = {
  profile: true,
  courses: true,
  enrolments: true,
  assignments: false,
  grades: true,
  announcements: false,
  deadlines: false,
  support: true,
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? value as Record<string, unknown> : {}
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function isMissingToolError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  return (
    message.includes('unknown tool') ||
    (message.includes('tool') && (message.includes('not found') || message.includes('not available')))
  )
}

async function callFirstAvailableTool(candidates: ToolCandidate[]): Promise<unknown> {
  let lastError: unknown

  for (const candidate of candidates) {
    try {
      return await callCanvasMcpTool(candidate.name, candidate.args)
    } catch (error) {
      lastError = error
      if (!isMissingToolError(error)) break
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Canvas MCP tool call failed')
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
    profile.completed_modules ?? profile.completedModules ?? profile.modules ?? profile.results
  )

  if (Object.keys(profile).length === 0) return null

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

function normalizeCourses(raw: unknown): CanvasCourseSummary[] {
  const record = asRecord(raw)
  return asArray<CanvasCourseSummary>(
    record.courses ?? record.enrolments ?? record.enrollments ?? record.items ?? raw
  )
}

function normalizeExamResults(raw: unknown): CanvasCompletedModule[] {
  const record = asRecord(raw)
  return asArray<CanvasCompletedModule>(
    record.results ?? record.exam_results ?? record.grades ?? record.modules ?? record.items ?? raw
  )
}

function normalizeAssignments(raw: unknown): CanvasAssignmentSummary[] {
  const record = asRecord(raw)
  return asArray<CanvasAssignmentSummary>(
    record.assignments ?? record.deadlines ?? record.items ?? raw
  )
}

function normalizeAnnouncements(raw: unknown): CanvasAnnouncementSummary[] {
  const record = asRecord(raw)
  return asArray<CanvasAnnouncementSummary>(
    record.announcements ?? record.items ?? raw
  )
}

export function canvasUserId(profile: CanvasUserProfile): string | undefined {
  const id = profile.user_id ?? profile.id
  return id === undefined || id === null ? undefined : String(id)
}

export async function findCanvasUserByEmail(email: string): Promise<CanvasUserProfile | null> {
  const raw = await callFirstAvailableTool([
    { name: 'get_user_profile', args: { email } },
    { name: 'get_user_by_email', args: { email } },
  ])

  return normalizeProfile(raw, email)
}

export async function getCanvasCourses(profile: CanvasUserProfile): Promise<CanvasCourseSummary[]> {
  const userId = canvasUserId(profile)
  if (!userId) return profile.enrolments

  try {
    const raw = await callFirstAvailableTool([
      { name: 'list_user_courses', args: { user_id: userId } },
      { name: 'get_courses', args: { user_id: userId } },
    ])

    return normalizeCourses(raw)
  } catch {
    return profile.enrolments
  }
}

export async function getCanvasExamResults(
  profile: CanvasUserProfile
): Promise<CanvasCompletedModule[]> {
  const userId = canvasUserId(profile)
  if (!userId) return profile.completed_modules

  try {
    const raw = await callFirstAvailableTool([
      { name: 'get_user_exam_results', args: { user_id: userId } },
      { name: 'get_grades', args: { user_id: userId } },
    ])

    return normalizeExamResults(raw)
  } catch {
    return profile.completed_modules
  }
}

export async function getCanvasAssignments(
  profile: CanvasUserProfile
): Promise<CanvasAssignmentSummary[]> {
  const userId = canvasUserId(profile)
  if (!userId) return []

  const raw = await callFirstAvailableTool([
    { name: 'get_assignments', args: { user_id: userId } },
  ])

  return normalizeAssignments(raw)
}

export async function getCanvasAnnouncements(
  profile: CanvasUserProfile
): Promise<CanvasAnnouncementSummary[]> {
  const userId = canvasUserId(profile)
  if (!userId) return []

  const raw = await callFirstAvailableTool([
    { name: 'get_announcements', args: { user_id: userId } },
  ])

  return normalizeAnnouncements(raw)
}

