'use client'

import { useState, type KeyboardEvent } from 'react'

interface Props {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function ChatInput({ onSend, disabled, placeholder }: Props) {
  const [value, setValue] = useState('')

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t bg-white px-4 py-3">
      <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400">
        <textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder ?? 'Ask about your course documents or Canvas...'}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:opacity-50"
          aria-label="Chat message"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.154.75.75 0 0 0 0-1.115A28.897 28.897 0 0 0 3.105 2.288Z" />
          </svg>
        </button>
      </div>
      <p className="mt-1 text-center text-xs text-gray-400">
        Prototype mode uses Canvas MCP lookup plus a simulated OTP before showing student data.
      </p>
    </div>
  )
}
