import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  formatCourses,
  formatExamResults,
  formatProfile,
  getCoursesForProfile,
  getExamResultsForProfile,
  getSavedProfile,
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

type ChatIntent = 'lookup_profile' | 'see_courses' | 'view_exam_results'

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

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  if (!body?.message || typeof body.message !== 'string') {
    return NextResponse.json({ error: 'message is required' }, { status: 400 })
  }

  const sessionId = typeof body.session_id === 'string' ? body.session_id : crypto.randomUUID()
  const mode = body.mode === 'canvas' ? 'canvas' : 'local'
  const intent = typeof body.intent === 'string' ? body.intent as ChatIntent : undefined

  if (mode === 'canvas') {
    try {
      if (intent === 'see_courses') {
        const profile = getSavedProfile(sessionId)

        if (!profile) {
          return NextResponse.json({
            session_id: sessionId,
            reply: 'Please enter your Canvas email address first so I can find your profile.',
            source: 'canvas_mcp',
            iteration_count: 0,
          })
        }

        const courses = await getCoursesForProfile(profile)

        return NextResponse.json({
          session_id: sessionId,
          reply: formatCourses(courses),
          source: 'canvas_mcp',
          iteration_count: 1,
          profile,
          actions: profileActions(profile),
        })
      }

      if (intent === 'view_exam_results') {
        const profile = getSavedProfile(sessionId)

        if (!profile) {
          return NextResponse.json({
            session_id: sessionId,
            reply: 'Please enter your Canvas email address first so I can find your profile.',
            source: 'canvas_mcp',
            iteration_count: 0,
          })
        }

        const results = await getExamResultsForProfile(profile)

        return NextResponse.json({
          session_id: sessionId,
          reply: formatExamResults(results),
          source: 'canvas_mcp',
          iteration_count: 1,
          profile,
          actions: profileActions(profile),
        })
      }

      if (!isLikelyEmail(body.message)) {
        return NextResponse.json({
          session_id: sessionId,
          reply: 'Please enter the email address you use for Canvas so I can look up your student profile.',
          source: 'canvas_mcp',
          iteration_count: 0,
        })
      }

      const profile = await lookupProfileByEmail(sessionId, body.message.trim())

      if (!profile) {
        return NextResponse.json({
          session_id: sessionId,
          reply: 'I could not find a Canvas profile for that email address.',
          source: 'canvas_mcp',
          iteration_count: 1,
        })
      }

      return NextResponse.json({
        session_id: sessionId,
        reply: formatProfile(profile),
        source: 'canvas_mcp',
        iteration_count: 1,
        profile,
        actions: profileActions(profile),
      })
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
