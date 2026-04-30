type JsonRpcPayload = {
  jsonrpc: '2.0'
  id?: number
  method: string
  params?: unknown
}

interface RpcResponse {
  payload: {
    result?: unknown
    error?: unknown
  } | null
  sessionId?: string
}

export interface CanvasMcpConfig {
  endpoint: string
  canvasUrl: string
  canvasToken: string
  bearerToken?: string
}

function requiredEnv(names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }

  throw new Error(`${names.join(' or ')} is not configured`)
}

function requiredUrlEnv(names: string[]): string {
  const invalidNames: string[] = []

  for (const name of names) {
    const value = process.env[name]?.trim()
    if (!value) continue

    try {
      return new URL(value).toString().replace(/\/+$/, '')
    } catch {
      invalidNames.push(name)
    }
  }

  const invalidMessage = invalidNames.length > 0 ? `; invalid URL in ${invalidNames.join(', ')}` : ''
  throw new Error(`${names.join(' or ')} is not configured${invalidMessage}`)
}

export function getCanvasMcpConfig(): CanvasMcpConfig {
  const baseUrl = requiredUrlEnv(['CANVAS_MCP_URL'])
  const apiPath = process.env.CANVAS_MCP_API_PATH?.trim() || 'api/mcp'
  const endpoint = baseUrl.endsWith('/api/mcp')
    ? baseUrl
    : new URL(apiPath.replace(/^\/+/, ''), `${baseUrl}/`).toString().replace(/\/+$/, '')

  return {
    endpoint,
    canvasUrl: requiredUrlEnv([
      'CANVAS_MCP_CANVAS_URL',
      'CANVAS_BASE_URL',
      'CANVAS_URL',
      'NEXT_PUBLIC_CANVAS_URL',
    ]),
    canvasToken: requiredEnv(['CANVAS_MCP_TOKEN', 'CANVAS_API_TOKEN', 'CANVAS_TOKEN_ID']),
    bearerToken: process.env.CANVAS_MCP_BEARER_TOKEN?.trim() || undefined,
  }
}

function parseSse(text: string): unknown {
  for (const block of text.split(/\r?\n\r?\n/).reverse()) {
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('data:')) return JSON.parse(line.slice(5).trim())
    }
  }

  throw new Error(`No SSE data frame in MCP response: ${text.slice(0, 200)}`)
}

async function rpc(
  config: CanvasMcpConfig,
  headers: Record<string, string>,
  body: JsonRpcPayload
): Promise<RpcResponse> {
  let response: Response

  try {
    response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...headers,
      },
      body: JSON.stringify(body),
    })
  } catch (error) {
    const cause =
      error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : error instanceof Error
          ? error.message
          : 'unknown network error'

    throw new Error(`Canvas MCP fetch failed: ${cause}`)
  }

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`Canvas MCP HTTP ${response.status}: ${text.slice(0, 300)}`)
  }

  return {
    payload: text.trim() ? parseSse(text) as RpcResponse['payload'] : null,
    sessionId: response.headers.get('mcp-session-id') ?? undefined,
  }
}

function mcpHeaders(config: CanvasMcpConfig, sessionId?: string): Record<string, string> {
  return {
    'x-canvas-url': config.canvasUrl,
    'x-canvas-token': config.canvasToken,
    ...(config.bearerToken ? { authorization: `Bearer ${config.bearerToken}` } : {}),
    ...(sessionId ? { 'mcp-session-id': sessionId } : {}),
  }
}

function unwrapToolResult(result: unknown): unknown {
  if (!result || typeof result !== 'object') return result

  const value = result as {
    isError?: boolean
    structuredContent?: unknown
    content?: Array<{ type?: string; text?: string }>
  }

  if (value.isError) {
    throw new Error(`Canvas MCP tool returned an error: ${JSON.stringify(value.content ?? result)}`)
  }

  if (value.structuredContent) return value.structuredContent

  const firstText = value.content?.find(item => item.type === 'text' && item.text)?.text
  if (!firstText) return result

  try {
    return JSON.parse(firstText)
  } catch {
    return firstText
  }
}

export async function callCanvasMcpTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const config = getCanvasMcpConfig()
  const init = await rpc(config, mcpHeaders(config), {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'canvas-chat-mcp-nextjs', version: '0.1.0' },
    },
  })

  if (init.payload?.error) {
    throw new Error(`Canvas MCP initialize failed: ${JSON.stringify(init.payload.error)}`)
  }

  const headers = mcpHeaders(config, init.sessionId)

  await rpc(config, headers, {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  })

  const call = await rpc(config, headers, {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  })

  if (call.payload?.error) {
    throw new Error(`Canvas MCP ${toolName} failed: ${JSON.stringify(call.payload.error)}`)
  }

  return unwrapToolResult(call.payload?.result)
}
