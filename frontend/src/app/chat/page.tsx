import ChatWindow from '@/components/features/chat/ChatWindow'

export default function ChatPage() {
  return (
    <main className="flex h-screen flex-col bg-gray-50">
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            E
          </div>
          <div>
            <p className="font-semibold text-gray-900">Eddie</p>
            <p className="text-xs text-gray-500">Greenwich College Student Assistant</p>
          </div>
        </div>
      </header>
      <ChatWindow />
    </main>
  )
}
