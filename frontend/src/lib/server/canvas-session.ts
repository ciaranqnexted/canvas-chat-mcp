import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import type { NextRequest, NextResponse } from 'next/server'

export const CANVAS_SESSION_COOKIE = 'canvas_session'
export const CANVAS_STATE_COOKIE = 'canvas_oauth_state'

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8
const STATE_MAX_AGE_SECONDS = 60 * 10

export interface CanvasUser {
  id?: number | string
  name?: string
  global_id?: string
  effective_locale?: string
}

export interface CanvasSession {
  accessToken: string
  refreshToken?: string
  tokenType?: string
  expiresAt?: number
  canvasBaseUrl: string
  user?: CanvasUser
}

export interface CanvasAuthConfig {
  canvasBaseUrl: string
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface CanvasTokenResponse {
  access_token: string
  refresh_token?: string
  token_type?: string
  expires_in?: number
  user?: CanvasUser
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction(),
    path: '/',
    maxAge,
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '')
}

export function getCanvasAuthConfig(origin: string): CanvasAuthConfig {
  const canvasBaseUrl = normalizeBaseUrl(requiredEnv('CANVAS_BASE_URL'))
  const redirectUri =
    process.env.CANVAS_REDIRECT_URI?.trim() ||
    `${origin.replace(/\/+$/, '')}/api/auth/canvas/callback`

  return {
    canvasBaseUrl,
    clientId: requiredEnv('CANVAS_CLIENT_ID'),
    clientSecret: requiredEnv('CANVAS_CLIENT_SECRET'),
    redirectUri,
  }
}

export function assertCanvasSessionConfig(): void {
  requiredEnv('SESSION_SECRET')
}

export function createCanvasAuthorizeUrl(config: CanvasAuthConfig, state: string): string {
  const url = new URL('/login/oauth2/auth', config.canvasBaseUrl)
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  url.searchParams.set('redirect_uri', config.redirectUri)

  return url.toString()
}

export function createState(): string {
  return randomBytes(32).toString('base64url')
}

export function setStateCookie(response: NextResponse, state: string): void {
  response.cookies.set(CANVAS_STATE_COOKIE, state, cookieOptions(STATE_MAX_AGE_SECONDS))
}

export function clearStateCookie(response: NextResponse): void {
  response.cookies.set(CANVAS_STATE_COOKIE, '', { ...cookieOptions(0), maxAge: 0 })
}

function encryptionKey(): Buffer {
  return createHash('sha256').update(requiredEnv('SESSION_SECRET')).digest()
}

function sealSession(session: CanvasSession): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(session), 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [iv, tag, ciphertext].map(part => part.toString('base64url')).join('.')
}

function openSession(value: string): CanvasSession | null {
  try {
    const [ivValue, tagValue, ciphertextValue] = value.split('.')
    if (!ivValue || !tagValue || !ciphertextValue) return null

    const decipher = createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(ivValue, 'base64url')
    )
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'))

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8')

    return JSON.parse(plaintext) as CanvasSession
  } catch {
    return null
  }
}

export function setCanvasSessionCookie(response: NextResponse, session: CanvasSession): void {
  response.cookies.set(CANVAS_SESSION_COOKIE, sealSession(session), cookieOptions(SESSION_MAX_AGE_SECONDS))
}

export function clearCanvasSessionCookie(response: NextResponse): void {
  response.cookies.set(CANVAS_SESSION_COOKIE, '', { ...cookieOptions(0), maxAge: 0 })
}

export function getCanvasSessionFromRequest(request: NextRequest): CanvasSession | null {
  const sealed = request.cookies.get(CANVAS_SESSION_COOKIE)?.value
  if (!sealed) return null

  return openSession(sealed)
}

export function hasCanvasSession(request: NextRequest): boolean {
  return getCanvasSessionFromRequest(request) !== null
}

export async function exchangeCanvasCode(
  config: CanvasAuthConfig,
  code: string
): Promise<CanvasTokenResponse> {
  const response = await fetch(new URL('/login/oauth2/token', config.canvasBaseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code,
    }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const description = data?.error_description || data?.error || response.statusText
    throw new Error(`Canvas token exchange failed: ${description}`)
  }

  if (!data?.access_token || typeof data.access_token !== 'string') {
    throw new Error('Canvas token exchange did not return an access token')
  }

  return data as CanvasTokenResponse
}

export function tokenResponseToSession(
  config: CanvasAuthConfig,
  token: CanvasTokenResponse
): CanvasSession {
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    tokenType: token.token_type,
    expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : undefined,
    canvasBaseUrl: config.canvasBaseUrl,
    user: token.user,
  }
}
