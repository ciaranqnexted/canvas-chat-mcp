'use client'

import { useRef, useEffect, useState } from 'react'
import { useChat } from '@/hooks/useChat'
import type { ChatAction, ChatMode } from '@/types/chat'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'

interface CanvasAuthState {
  authenticated: boolean
  user?: {
    id?: string | number
    name?: string
  }
  canvasBaseUrl?: string
}

export default function ChatWindow() {
  const [mode, setMode] = useState<ChatMode>('canvas')
  const [canvasAuth, setCanvasAuth] = useState<CanvasAuthState>({ authenticated: false })
  const { session, send } = useChat(mode)
  const bottomRef = useRef<HTMLDivElement>(null)

  const refreshCanvasAuth = async () => {
    const response = await fetch('/api/auth/me', { cache: 'no-store' })
    const data = await response.json()
    setCanvasAuth(data)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session.messages])

  useEffect(() => {
    refreshCanvasAuth().catch(() => setCanvasAuth({ authenticated: false }))
  }, [])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setCanvasAuth({ authenticated: false })
  }

  const handleAction = (action: ChatAction) => {
    if (action.disabled) return
    send(action.label, action.id, action.payload)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-gray-200 bg-white px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => setMode('local')}
              className={`rounded-md px-2.5 py-1.5 transition sm:px-3 ${mode === 'local' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Local documents
            </button>
            <button
              type="button"
              onClick={() => setMode('canvas')}
              className={`rounded-md px-2.5 py-1.5 transition sm:px-3 ${mode === 'canvas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Canvas
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="hidden text-gray-500 sm:inline">
              {mode === 'canvas'
                ? 'Canvas MCP with student verification'
                : 'Using local folder'}
            </span>
            {canvasAuth.authenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-md border border-gray-200 px-2.5 py-1.5 font-medium text-gray-600 hover:bg-gray-50"
              >
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Message list */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-gray-50 px-3 py-4 sm:px-5 sm:py-6">
        {session.messages.length === 0 && (
          <div className="mx-auto mt-10 max-w-sm rounded-lg border border-gray-200 bg-white px-5 py-5 text-center shadow-sm sm:mt-14">
            <p className="text-base font-semibold text-gray-900">Hi, I&apos;m Nexi.</p>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Enter your Canvas email, verify the prototype OTP, then choose what you want to check.
            </p>
          </div>
        )}
        {session.messages.map(message => (
          <MessageBubble key={message.id} message={message} onAction={handleAction} />
        ))}
        {session.isLoading && (
          <div className="flex items-center gap-2 px-1 text-sm text-gray-400">
            <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:-0.3s]" />
            <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce [animation-delay:-0.15s]" />
            <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={send}
        disabled={session.isLoading}
        placeholder={
          mode === 'canvas'
            ? 'Enter your Canvas email or one-time code...'
            : 'Ask about files in the local documents folder...'
        }
      />
    </div>
  )
}
