import type { SendMessageRequest, SendMessageResponse } from '@/types/chat'

export async function sendMessage(
  payload: SendMessageRequest
): Promise<SendMessageResponse> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    if (data?.reply) return data
    throw new Error(`Chat API error: ${res.status}`)
  }

  return data
}
