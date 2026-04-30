import type { ChatAction, Message } from '@/types/chat'

interface Props {
  message: Message
  onAction?: (action: ChatAction) => void
}

export default function MessageBubble({ message, onAction }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] whitespace-pre-wrap rounded-lg px-4 py-3 text-sm leading-relaxed sm:max-w-[78%] ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'border border-gray-200 bg-white text-gray-800 shadow-sm'
        }`}
      >
        {message.content}
        {message.source === 'fallback' && !isUser && (
          <p className="mt-1 text-xs text-gray-400">
            Could not reach the chat service. Please try again.
          </p>
        )}
        {message.source === 'auth_required' && !isUser && (
          <p className="mt-1 text-xs text-gray-400">
            Canvas login is required for this source.
          </p>
        )}
        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.actions.map((action, index) => (
              <button
                key={`${action.id}-${action.payload?.course_id ?? index}`}
                type="button"
                onClick={() => {
                  if (!action.disabled) onAction?.(action)
                }}
                disabled={action.disabled}
                title={action.reason}
                className={`rounded-md border px-3 py-1.5 text-left text-xs font-medium transition ${
                  action.disabled
                    ? 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400'
                    : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                <span className="block">{action.label}</span>
                {action.disabled && action.reason && (
                  <span className="mt-0.5 block max-w-40 text-[11px] font-normal leading-snug text-gray-400">
                    {action.reason}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
