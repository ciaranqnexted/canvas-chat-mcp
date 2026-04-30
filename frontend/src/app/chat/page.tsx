import ChatWindow from '@/components/features/chat/ChatWindow'

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-gray-100 px-3 py-3 text-gray-950 sm:px-6 sm:py-6 lg:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-5xl flex-col gap-3 sm:min-h-[calc(100vh-3rem)] sm:gap-5">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm">
              N
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-gray-950">Nexi</p>
              <p className="truncate text-xs text-gray-500">NextEd student assistant</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Canvas MCP ready
          </div>
        </header>

        <section className="flex min-h-0 flex-1 items-center justify-center">
          <div className="flex h-[calc(100vh-8.5rem)] w-full max-w-3xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm sm:h-[min(760px,calc(100vh-10rem))]">
            <ChatWindow />
          </div>
        </section>

        <footer className="flex flex-col gap-1 text-center text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <span>NextEd learning support</span>
          <span>Prototype student data is read through the configured Canvas MCP server.</span>
        </footer>
      </div>
    </main>
  )
}
