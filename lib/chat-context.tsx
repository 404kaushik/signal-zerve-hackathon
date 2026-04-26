'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { XFeedPost } from '@/lib/api'

type OpenChatArgs = {
  personaId: string
  post?: XFeedPost
}

type ChatContextType = {
  isOpen: boolean
  personaId: string | null
  post: XFeedPost | null
  openChat: (args: OpenChatArgs) => void
  closeChat: () => void
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [personaId, setPersonaId] = useState<string | null>(null)
  const [post, setPost] = useState<XFeedPost | null>(null)

  const openChat = useCallback(({ personaId, post }: OpenChatArgs) => {
    setPersonaId(personaId)
    setPost(post || null)
    setIsOpen(true)
  }, [])

  const closeChat = useCallback(() => {
    setIsOpen(false)
  }, [])

  const value = useMemo<ChatContextType>(
    () => ({ isOpen, personaId, post, openChat, closeChat }),
    [isOpen, personaId, post, openChat, closeChat]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used inside ChatProvider')
  return ctx
}
