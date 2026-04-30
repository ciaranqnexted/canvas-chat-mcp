import type { NexiAuthConfig } from './nexi-config'
import type { CanvasUserProfile } from './canvas/student-adapter'
import { canvasUserId } from './canvas/student-adapter'

const MAX_OTP_ATTEMPTS = 5

export interface StudentSession {
  studentEmail: string
  canvasUserId: string
  verified: boolean
  selectedCourseId?: string
  profile: CanvasUserProfile
  otpRequested: boolean
  otpAttempts: number
  createdAt: number
  updatedAt: number
}

export type OtpVerificationResult =
  | { status: 'verified'; session: StudentSession }
  | { status: 'incorrect'; attemptsRemaining: number; session: StudentSession }
  | { status: 'locked'; session: StudentSession }
  | { status: 'missing_session' }
  | { status: 'unsupported' }

const studentSessions = new Map<string, StudentSession>()

export function getStudentSession(sessionId: string): StudentSession | undefined {
  return studentSessions.get(sessionId)
}

export function selectStudentCourse(
  sessionId: string,
  selectedCourseId: string
): StudentSession | undefined {
  const session = studentSessions.get(sessionId)
  if (!session) return undefined

  const updatedSession = {
    ...session,
    selectedCourseId,
    updatedAt: Date.now(),
  }

  studentSessions.set(sessionId, updatedSession)
  return updatedSession
}

export function startPendingStudentSession(
  sessionId: string,
  profile: CanvasUserProfile
): StudentSession {
  const id = canvasUserId(profile)

  if (!id) {
    throw new Error('Canvas profile did not include a user id')
  }

  const now = Date.now()
  const session: StudentSession = {
    studentEmail: profile.email ?? '',
    canvasUserId: id,
    verified: false,
    profile,
    otpRequested: true,
    otpAttempts: 0,
    createdAt: now,
    updatedAt: now,
  }

  studentSessions.set(sessionId, session)
  return session
}

export function verifyStudentOtp(
  sessionId: string,
  submittedOtp: string,
  config: NexiAuthConfig
): OtpVerificationResult {
  const session = studentSessions.get(sessionId)
  if (!session) return { status: 'missing_session' }

  if (!config.prototypeOtp) return { status: 'unsupported' }

  if (session.otpAttempts >= MAX_OTP_ATTEMPTS) {
    return { status: 'locked', session }
  }

  if (submittedOtp.trim() === config.devOtp) {
    const verifiedSession = {
      ...session,
      verified: true,
      otpRequested: false,
      updatedAt: Date.now(),
    }

    studentSessions.set(sessionId, verifiedSession)
    return { status: 'verified', session: verifiedSession }
  }

  const failedSession = {
    ...session,
    otpAttempts: session.otpAttempts + 1,
    updatedAt: Date.now(),
  }

  studentSessions.set(sessionId, failedSession)

  if (failedSession.otpAttempts >= MAX_OTP_ATTEMPTS) {
    return { status: 'locked', session: failedSession }
  }

  return {
    status: 'incorrect',
    attemptsRemaining: MAX_OTP_ATTEMPTS - failedSession.otpAttempts,
    session: failedSession,
  }
}
