'use client'

import { useState, useCallback, useRef } from 'react'
import type { Message, ChatSession, ChatMode, ChatIntent } from '@/types/chat'
import { sendMessage } from '@/lib/api'

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

export function useChat(mode: ChatMode): {
  session: ChatSession
  send: (content: string, intent?: ChatIntent) => Promise<void>
} {
  const sessionId = useRef<string>(newId())

  const [session, setSession] = useState<ChatSession>({
    sessionId: sessionId.current,
    messages: [],
    isLoading: false,
  })

  const send = useCallback(async (content: string, intent?: ChatIntent) => {
    const userMessage: Message = {
      id: newId(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setSession(s => ({
      ...s,
      messages: [...s.messages, userMessage],
      isLoading: true,
    }))

    try {
      const response = await sendMessage({
        session_id: sessionId.current,
        message: content,
        mode,
        intent,
      })

      const assistantMessage: Message = {
        id: newId(),
        role: 'assistant',
        content: response.reply,
        timestamp: new Date(),
        source: response.source,
        actions: response.actions,
        profile: response.profile,
      }

      setSession(s => ({
        ...s,
        messages: [...s.messages, assistantMessage],
        isLoading: false,
      }))
    } catch {
      const errorMessage: Message = {
        id: newId(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
        source: 'fallback',
      }
      setSession(s => ({
        ...s,
        messages: [...s.messages, errorMessage],
        isLoading: false,
      }))
    }
  }, [mode])

  return { session, send }
}
