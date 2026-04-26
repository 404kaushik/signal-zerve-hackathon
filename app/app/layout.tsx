import { SidebarNav } from '@/components/worldlens/sidebar-nav'
import { StatusBar, TransmissionTicker } from '@/components/worldlens/status-bar'
import { CommandPalette } from '@/components/worldlens/command-palette'
import { FeedProvider } from '@/lib/feed-context'
import { ChatProvider } from '@/lib/chat-context'
import { XPersonaChat } from '@/components/xfeed/XPersonaChat'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatProvider>
      <FeedProvider>
        <div className="flex h-screen overflow-hidden">
          {/* Command Palette */}
          <CommandPalette />

          {/* Sidebar */}
          <SidebarNav />

          {/* Main content */}
          <div className="flex h-screen flex-1 flex-col overflow-hidden lg:ml-40">
            {/* Top status bar */}
            <StatusBar />

            {/* Main workspace */}
            <main className="dot-grid relative flex-1 overflow-auto bg-transparent">
              <div className="relative z-10 p-3 lg:p-4">
                {children}
              </div>
            </main>

            {/* Bottom ticker */}
            <TransmissionTicker />
          </div>
        </div>
        <XPersonaChat />
      </FeedProvider>
    </ChatProvider>
  )
}
