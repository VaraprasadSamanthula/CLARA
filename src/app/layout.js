import './globals.css'
import { ChatStateProvider } from '@/providers/ChatStateProvider'

export const metadata = {
  title: 'CLARA | Clinical data assistant',
  description: 'Ask secure, natural-language questions about your demo EHR.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="h-screen overflow-hidden">
        <ChatStateProvider>
          {children}
        </ChatStateProvider>
      </body>
    </html>
  )
}