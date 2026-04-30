import { callCanvasMcpTool } from './mcp-http-client'

export interface CanvasCourseSummary {
  course_id?: string | number
  id?: string | number
  course_name?: string
  name?: string
  status?: string
  workflow_state?: string
  sis_user_id?: string
  sis_id?: string
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
  canvas_user_id?: string | number
  name?: string
  email?: string
  sis_user_id?: string
  sis_id?: string
  canvas_account_name?: string
  status?: string
  timezone?: string
  active_course_count?: number
  total_enrollments?: number
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

function asFirstRecord(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return asRecord(value[0])
  return asRecord(value)
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }

  return undefined
}

function asId(value: unknown): string | number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) return value.trim()
  return undefined
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    const text = asString(value)
    if (text) return text
  }

  return undefined
}

function normalizedTimezone(...values: unknown[]): string | undefined {
  const timezone = firstString(...values)
  if (!timezone || timezone.toLowerCase() === 'canvas') return undefined

  return timezone
}

function firstSisUserIdFromArray(values: unknown[]): string | undefined {
  for (const value of values) {
    const record = asRecord(value)
    const user = asRecord(record.user)
    const loginInformation = asFirstRecord(
      record.login_information ??
      record.loginInformation ??
      record.login_info ??
      record.loginInfo ??
      record.pseudonym ??
      record.pseudonyms
    )

    const sisUserId = firstString(
      record.sis_user_id,
      record.sis_id,
      record.sisId,
      record.sisID,
      user.sis_user_id,
      user.sis_id,
      loginInformation.sis_user_id,
      loginInformation.sis_id,
      loginInformation.sisId,
      loginInformation.sisID
    )

    if (sisUserId) return sisUserId
  }

  return undefined
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
  const rootAccount = asRecord(root.account ?? root.canvas_account)
  const profileAccount = asRecord(profile.account ?? profile.canvas_account)
  const profileUser = asRecord(profile.user)
  const rootUser = asRecord(root.user)
  const loginInformation = asFirstRecord(
    profile.login_information ??
    profile.loginInformation ??
    profile.login_info ??
    profile.loginInfo ??
    profile.pseudonym ??
    profile.pseudonyms ??
    root.login_information ??
    root.loginInformation ??
    root.login_info ??
    root.loginInfo ??
    root.pseudonym ??
    root.pseudonyms
  )
  const profileSettings = asRecord(profile.settings ?? profile.preferences)
  const rootSettings = asRecord(root.settings ?? root.preferences)
  const sisUserId = firstString(
    profile.sis_user_id,
    profile.sis_id,
    profile.sisId,
    profile.sisID,
    profile.student_number,
    profile.studentNumber,
    profile.student_id,
    profile.studentId,
    profileUser.sis_user_id,
    profileUser.sis_id,
    root.sis_user_id,
    root.sis_id,
    root.student_number,
    root.student_id,
    rootUser.sis_user_id,
    rootUser.sis_id,
    loginInformation.sis_user_id,
    loginInformation.sis_id,
    loginInformation.sisId,
    loginInformation.sisID,
    firstSisUserIdFromArray(enrolments)
  )

  if (Object.keys(profile).length === 0) return null

  return {
    user_id: asId(profile.user_id) ?? asId(root.user_id),
    id: asId(profile.id) ?? asId(profileUser.id),
    canvas_user_id:
      asId(profile.canvas_user_id) ??
      asId(profile.canvasUserId) ??
      asId(root.canvas_user_id),
    name: asString(profile.name),
    email: asString(profile.email) ?? asString(profileUser.email) ?? asString(root.email) ?? email,
    sis_user_id: sisUserId,
    sis_id: sisUserId,
    canvas_account_name:
      asString(profile.canvas_account_name) ??
      asString(profile.canvasAccountName) ??
      asString(profile.account_name) ??
      asString(profile.accountName) ??
      asString(root.canvas_account_name) ??
      asString(root.account_name) ??
      asString(profileAccount.name) ??
      asString(rootAccount.name),
    status: asString(profile.status),
    timezone: normalizedTimezone(
      profile.time_zone,
      profile.timezone,
      profile.timeZone,
      profile.effective_time_zone,
      profile.effectiveTimezone,
      rootUser.time_zone,
      rootUser.timezone,
      root.time_zone,
      root.timezone,
      profileSettings.time_zone,
      profileSettings.timezone,
      rootSettings.time_zone,
      rootSettings.timezone,
      loginInformation.time_zone,
      loginInformation.timezone
    ),
    active_course_count:
      asNumber(profile.active_course_count) ??
      asNumber(profile.activeCourseCount) ??
      asNumber(profile.no_of_courses) ??
      asNumber(profile.noOfCourses) ??
      asNumber(root.active_course_count),
    total_enrollments:
      asNumber(profile.total_enrollments) ??
      asNumber(profile.totalEnrollments) ??
      asNumber(profile.enrollment_count) ??
      asNumber(profile.enrolment_count) ??
      asNumber(root.total_enrollments),
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
  const id = profile.canvas_user_id ?? profile.user_id ?? profile.id
  return id === undefined || id === null ? undefined : String(id)
}

function mergeProfiles(
  primary: CanvasUserProfile,
  supplemental: CanvasUserProfile
): CanvasUserProfile {
  const sisUserId = primary.sis_user_id ?? primary.sis_id ?? supplemental.sis_user_id ?? supplemental.sis_id

  return {
    ...primary,
    user_id: primary.user_id ?? supplemental.user_id,
    id: primary.id ?? supplemental.id,
    canvas_user_id: primary.canvas_user_id ?? supplemental.canvas_user_id,
    name: primary.name ?? supplemental.name,
    email: primary.email ?? supplemental.email,
    sis_user_id: sisUserId,
    sis_id: sisUserId,
    canvas_account_name: primary.canvas_account_name ?? supplemental.canvas_account_name,
    status: primary.status ?? supplemental.status,
    timezone: primary.timezone ?? supplemental.timezone,
    active_course_count: primary.active_course_count ?? supplemental.active_course_count,
    total_enrollments: primary.total_enrollments ?? supplemental.total_enrollments,
    enrolments: primary.enrolments.length > 0 ? primary.enrolments : supplemental.enrolments,
    completed_modules:
      primary.completed_modules.length > 0 ? primary.completed_modules : supplemental.completed_modules,
  }
}

async function tryFindCanvasUserByEmail(email: string): Promise<CanvasUserProfile | null | undefined> {
  try {
    const raw = await callCanvasMcpTool('get_user_by_email', { email })
    return normalizeProfile(raw, email)
  } catch (error) {
    // SIS enrichment should never block a profile that was already found.
    if (isMissingToolError(error)) return undefined
    return undefined
  }
}

export async function findCanvasUserByEmail(email: string): Promise<CanvasUserProfile | null> {
  const raw = await callFirstAvailableTool([
    { name: 'get_user_profile', args: { email } },
    { name: 'get_user_by_email', args: { email } },
  ])

  const profile = normalizeProfile(raw, email)
  if (!profile || profile.sis_user_id) return profile

  const userByEmailProfile = await tryFindCanvasUserByEmail(email)
  if (!userByEmailProfile) return profile

  return mergeProfiles(profile, userByEmailProfile)
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
