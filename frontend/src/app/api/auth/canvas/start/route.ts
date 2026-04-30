import { NextRequest, NextResponse } from 'next/server'
import {
  assertCanvasSessionConfig,
  createCanvasAuthorizeUrl,
  createState,
  getCanvasAuthConfig,
  setStateCookie,
} from '@/lib/server/canvas-session'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const fallback = new URL('/chat', request.url)

  try {
    assertCanvasSessionConfig()
    const config = getCanvasAuthConfig(request.nextUrl.origin)
    const state = createState()
    const response = NextResponse.redirect(createCanvasAuthorizeUrl(config, state))
    setStateCookie(response, state)

    return response
  } catch {
    fallback.searchParams.set('canvasAuth', 'missing_config')
    return NextResponse.redirect(fallback)
  }
}
