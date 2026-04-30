import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { ChatAction, ChatIntent } from '@/types/chat'
import { assertNexiRuntimeConfig, getNexiAuthConfig } from '@/lib/server/nexi-config'
import {
  getStudentSession,
  selectStudentCourse,
  startPendingStudentSession,
  verifyStudentOtp,
  type StudentSession,
} from '@/lib/server/student-session'
import {
  courseSelectionActions,
  formatCourseSelected,
  formatCourses,
  formatEnrolments,
  formatExamResults,
  formatOtpPrompt,
  formatProfile,
  formatStudentDashboard,
  formatSupport,
  formatUnavailableFeature,
  getCoursesForProfile,
  getExamResultsForProfile,
  isLikelyEmail,
  lookupProfileByEmail,
  profileActions,
} from '@/lib/server/canvas/profile-flow'

export const runtime = 'nodejs'

const SUPPORTED_EXTENSIONS = new Set(['.md', '.txt', '.json', '.csv'])

interface LocalMatch {
  title: string
  path: string
  snippet: string
  score: number
}

function localDocumentsDir(): string {
  return path.resolve(process.cwd(), process.env.LOCAL_DOCUMENTS_DIR ?? '../local-documents')
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(token => token.length > 2)
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async entry => {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) return collectFiles(fullPath)
      if (!entry.isFile()) return []
      return SUPPORTED_EXTENSIONS.has(path.extname(entry.name).toLowerCase()) ? [fullPath] : []
    })
  )

  return nested.flat()
}

function scoreDocument(text: string, queryTokens: string[]): number {
  const haystack = text.toLowerCase()
  return queryTokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0)
}

function snippetFor(text: string, queryTokens: string[]): string {
  const lower = text.toLowerCase()
  const firstHit = queryTokens
    .map(token => lower.indexOf(token))
    .filter(index => index >= 0)
    .sort((a, b) => a - b)[0] ?? 0

  const start = Math.max(0, firstHit - 180)
  const end = Math.min(text.length, firstHit + 420)

  return text.slice(start, end).replace(/\s+/g, ' ').trim()
}

async function searchLocalDocuments(message: string): Promise<LocalMatch[]> {
  const dir = localDocumentsDir()
  const queryTokens = tokenize(message)

  if (queryTokens.length === 0) return []

  const files = await collectFiles(dir)
  const matches = await Promise.all(
    files.slice(0, 200).map(async file => {
      const text = await fs.readFile(file, 'utf8')
      const score = scoreDocument(text, queryTokens)

      return {
        title: path.basename(file),
        path: path.relative(dir, file),
        snippet: snippetFor(text, queryTokens),
        score,
      }
    })
  )

  return matches
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

function canvasResponse(
  sessionId: string,
  reply: string,
  session?: StudentSession,
  iterationCount = 0,
  actions?: ChatAction[]
) {
  return NextResponse.json({
    session_id: sessionId,
    reply,
    source: 'canvas_mcp',
    iteration_count: iterationCount,
    profile: session?.profile,
    actions: actions ?? (session?.verified ? profileActions(session.profile) : undefined),
  })
}

function inferCanvasIntent(message: string): ChatIntent | undefined {
  const text = message.toLowerCase()

  if (/\b(profile|who am i|my details)\b/.test(text)) return 'view_profile'
  if (/\b(course|courses)\b/.test(text)) return 'see_courses'
  if (/\b(enrol|enroll|enrolment|enrollment)\b/.test(text)) return 'see_enrolments'
  if (/\b(grade|grades|result|results|exam|exams)\b/.test(text)) return 'view_grades'
  if (/\b(assignment|assignments)\b/.test(text)) return 'view_assignments'
  if (/\b(deadline|deadlines|due date|due dates)\b/.test(text)) return 'view_deadlines'
  if (/\b(announcement|announcements)\b/.test(text)) return 'view_announcements'
  if (/\b(help|support|contact)\b/.test(text)) return 'get_support'

  return undefined
}

async function handleVerifiedCanvasMessage(
  sessionId: string,
  session: StudentSession,
  message: string,
  intent?: ChatIntent,
  actionPayload?: ChatAction['payload']
) {
  const effectiveIntent = intent ?? inferCanvasIntent(message)
  const actions = profileActions(session.profile)
  const action = actions.find(item => (
    item.id === effectiveIntent ||
    (effectiveIntent === 'view_exam_results' && item.id === 'view_grades')
  ))

  if (!effectiveIntent || effectiveIntent === 'lookup_profile' || effectiveIntent === 'verify_otp') {
    return canvasResponse(sessionId, formatStudentDashboard(session.profile), session, 0)
  }

  if (action?.disabled) {
    return canvasResponse(
      sessionId,
      formatUnavailableFeature(action.label, action.reason ?? 'This option is not connected yet.'),
      session,
      0
    )
  }

  if (effectiveIntent === 'view_profile') {
    return canvasResponse(sessionId, formatProfile(session.profile), session, 0)
  }

  if (effectiveIntent === 'see_courses') {
    const courses = await getCoursesForProfile(session.profile)
    return canvasResponse(
      sessionId,
      formatCourses(courses),
      session,
      1,
      [...courseSelectionActions(courses), ...actions]
    )
  }

  if (effectiveIntent === 'see_enrolments') {
    const courses = await getCoursesForProfile(session.profile)
    return canvasResponse(sessionId, formatEnrolments(courses), session, 1)
  }

  if (effectiveIntent === 'select_course') {
    const selectedCourseId = actionPayload?.course_id

    if (!selectedCourseId) {
      return canvasResponse(
        sessionId,
        'I could not select that course because the course id was missing. Choose Courses again and select a course from the returned options.',
        session,
        0
      )
    }

    const updatedSession = selectStudentCourse(sessionId, selectedCourseId) ?? session
    return canvasResponse(
      sessionId,
      formatCourseSelected(actionPayload?.course_name ?? 'This course'),
      updatedSession,
      0
    )
  }

  if (effectiveIntent === 'view_grades' || effectiveIntent === 'view_exam_results') {
    const results = await getExamResultsForProfile(session.profile)
    return canvasResponse(sessionId, formatExamResults(results), session, 1)
  }

  if (effectiveIntent === 'get_support') {
    return canvasResponse(sessionId, formatSupport(), session, 0)
  }

  return canvasResponse(
    sessionId,
    formatUnavailableFeature(
      action?.label ?? 'That option',
      action?.reason ?? 'This Canvas data path still needs a student-scoped MCP tool.'
    ),
    session,
    0
  )
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  if (!body?.message || typeof body.message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const sessionId = typeof body.session_id === 'string' ? body.session_id : crypto.randomUUID()
  const mode = body.mode === 'canvas' ? 'canvas' : 'local'
  const intent = typeof body.intent === 'string' ? body.intent as ChatIntent : undefined
  const actionPayload = body.action_payload && typeof body.action_payload === 'object'
    ? body.action_payload as ChatAction['payload']
    : undefined

  if (mode === 'canvas') {
    try {
      assertNexiRuntimeConfig()

      const authConfig = getNexiAuthConfig()
      const existingSession = getStudentSession(sessionId)

      if (existingSession?.verified) {
        return handleVerifiedCanvasMessage(sessionId, existingSession, body.message, intent, actionPayload)
      }

      if (existingSession?.otpRequested && !isLikelyEmail(body.message)) {
        if (intent && intent !== 'verify_otp') {
          return canvasResponse(
            sessionId,
            'Enter the one-time code first. After verification, I can show your courses, enrolments, grades, and support options.',
            existingSession,
            0
          )
        }

        const result = verifyStudentOtp(sessionId, body.message, authConfig)

        if (result.status === 'verified') {
          return canvasResponse(
            sessionId,
            formatStudentDashboard(result.session.profile),
            result.session,
            0
          )
        }

        if (result.status === 'incorrect') {
          return canvasResponse(
            sessionId,
            `That code was not accepted. Try again. Attempts remaining: ${result.attemptsRemaining}.`,
            result.session,
            0
          )
        }

        if (result.status === 'locked') {
          return canvasResponse(
            sessionId,
            'Too many incorrect one-time code attempts. Refresh the page and start a new student session.',
            result.session,
            0
          )
        }

        if (result.status === 'unsupported') {
          return canvasResponse(
            sessionId,
            'Real OTP delivery is not wired yet. Set `NEXI_OTP=false` for the v0.2 prototype flow.',
            existingSession,
            0
          )
        }

        return canvasResponse(
          sessionId,
          'Please enter your Canvas email address first so I can find your profile.',
          undefined,
          0
        )
      }

      if (!isLikelyEmail(body.message)) {
        return NextResponse.json({
          session_id: sessionId,
          reply: 'Please enter the email address you use for Canvas so I can look up your student profile.',
          source: 'canvas_mcp',
          iteration_count: 0,
        })
      }

      const profile = await lookupProfileByEmail(body.message.trim())

      if (!profile) {
        return NextResponse.json({
          session_id: sessionId,
          reply: 'I could not find a Canvas profile for that email address.',
          source: 'canvas_mcp',
          iteration_count: 1,
        })
      }

      const pendingSession = startPendingStudentSession(sessionId, profile)

      return canvasResponse(sessionId, formatOtpPrompt(profile), pendingSession, 1)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown Canvas MCP error'

      return NextResponse.json({
        session_id: sessionId,
        reply: `I could not reach the Canvas MCP profile lookup yet. ${detail}`,
        source: 'fallback',
        iteration_count: 0,
      })
    }
  }

  try {
    const matches = await searchLocalDocuments(body.message)

    if (matches.length === 0) {
      return NextResponse.json({
        session_id: sessionId,
        reply: 'I could not find a matching answer in the local documents folder.',
        source: 'local_documents',
        iteration_count: 0,
        citations: [],
      })
    }

    const citations = matches.map(({ title, path: sourcePath, snippet }) => ({
      title,
      path: sourcePath,
      snippet,
    }))

    return NextResponse.json({
      session_id: sessionId,
      reply: [
        'I found relevant local document matches:',
        '',
        ...citations.map((citation, index) => `${index + 1}. ${citation.title}: ${citation.snippet}`),
      ].join('\n'),
      source: 'local_documents',
      iteration_count: 0,
      citations,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown local document error'

    return NextResponse.json({
      session_id: sessionId,
      reply: `The local document folder is not ready yet. ${message}`,
      source: 'fallback',
      iteration_count: 0,
    })
  }
}
