import { NextRequest, NextResponse } from 'next/server'
import { getCanvasSessionFromRequest } from '@/lib/server/canvas-session'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const session = getCanvasSessionFromRequest(request)

  if (!session) {
    return NextResponse.json({
      authenticated: false,
    })
  }

  return NextResponse.json({
    authenticated: true,
    canvasBaseUrl: session.canvasBaseUrl,
    user: session.user
      ? {
          id: session.user.id,
          name: session.user.name,
        }
      : undefined,
    expiresAt: session.expiresAt,
  })
}
