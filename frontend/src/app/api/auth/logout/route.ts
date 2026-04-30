import { NextResponse } from 'next/server'
import { clearCanvasSessionCookie, clearStateCookie } from '@/lib/server/canvas-session'

export const runtime = 'nodejs'

export async function POST() {
  const response = NextResponse.json({ ok: true })
  clearCanvasSessionCookie(response)
  clearStateCookie(response)

  return response
}
