import { NextRequest, NextResponse } from 'next/server'
import {
  clearStateCookie,
  exchangeCanvasCode,
  getCanvasAuthConfig,
  setCanvasSessionCookie,
  tokenResponseToSession,
  CANVAS_STATE_COOKIE,
} from '@/lib/server/canvas-session'

export const runtime = 'nodejs'

function redirectToChat(request: NextRequest, status: string): NextResponse {
  const url = new URL('/chat', request.url)
  url.searchParams.set('canvasAuth', status)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get('error')
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const expectedState = request.cookies.get(CANVAS_STATE_COOKIE)?.value

  if (error) {
    const response = redirectToChat(request, 'denied')
    clearStateCookie(response)
    return response
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    const response = redirectToChat(request, 'invalid_state')
    clearStateCookie(response)
    return response
  }

  try {
    const config = getCanvasAuthConfig(request.nextUrl.origin)
    const token = await exchangeCanvasCode(config, code)
    const response = redirectToChat(request, 'connected')

    setCanvasSessionCookie(response, tokenResponseToSession(config, token))
    clearStateCookie(response)

    return response
  } catch {
    const response = redirectToChat(request, 'failed')
    clearStateCookie(response)
    return response
  }
}
