import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Canvas Chat MCP',
  description: 'Student chatbot for local documents and Canvas MCP.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
