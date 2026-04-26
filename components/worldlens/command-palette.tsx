'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { HugeIcon } from '@/components/worldlens/huge-icon'

const commands = [
  { id: 'overview', label: 'Overview', description: 'Global command center', icon: 'Globe02Icon', href: '/app' },
  { id: 'economy', label: 'Economy', description: 'Macro and attention signals', icon: 'Analytics01Icon', href: '/app/economy' },
  { id: 'markets', label: 'Markets', description: 'Prediction market tape', icon: 'ChartCandlestickIcon', href: '/app/markets' },
  { id: 'signals', label: 'Signals', description: 'Deep-dive queue', icon: 'Pulse01Icon', href: '/app/signals' },
  { id: 'briefing', label: 'Briefing', description: 'Daily concise briefing', icon: 'File02Icon', href: '/app/briefing' },
]

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()

  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase()) ||
    cmd.description.toLowerCase().includes(query.toLowerCase())
  )

  const handleSelect = useCallback((href: string) => {
    router.push(href)
    setIsOpen(false)
    setQuery('')
  }, [router])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      
      if (isOpen) {
        if (e.key === 'Escape') {
          setIsOpen(false)
          setQuery('')
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex((prev) => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          )
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex((prev) => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          )
        }
        if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
          handleSelect(filteredCommands[selectedIndex].href)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex, handleSelect])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => {
          setIsOpen(false)
          setQuery('')
        }}
      />

      {/* Modal */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl">
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a]">
            <HugeIcon name="CommandLineIcon" size={16} className="text-[#555555]" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands..."
              className="flex-1 bg-transparent text-[12px] text-[#e8e8e8] placeholder:text-[#444444] focus:outline-none"
              autoFocus
            />
            <button
              onClick={() => {
                setIsOpen(false)
                setQuery('')
              }}
              className="p-1 hover:bg-[#1a1a1a] transition-colors"
            >
              <HugeIcon name="Cancel01Icon" size={16} className="text-[#555555]" />
            </button>
          </div>

          {/* Commands List */}
          <div className="max-h-[400px] overflow-y-auto py-2">
            <div className="px-3 py-2">
              <span className="text-[9px] tracking-[0.2em] text-[#444444]">
                INTELLIGENCE LAYERS
              </span>
            </div>
            {filteredCommands.map((cmd, index) => {
              return (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd.href)}
                  className={cn(
                    'w-full flex items-center gap-4 px-4 py-2.5 transition-colors',
                    index === selectedIndex
                      ? 'bg-[#111111]'
                      : 'hover:bg-[#0d0d0d]'
                  )}
                >
                  <HugeIcon name={cmd.icon} size={16} className="text-[#666666]" />
                  <div className="flex-1 text-left">
                    <div className="text-[11px] text-[#e8e8e8]">{cmd.label}</div>
                    <div className="text-[9px] text-[#555555]">{cmd.description}</div>
                  </div>
                  {index === selectedIndex && (
                    <div className="text-[9px] text-[#444444]">ENTER</div>
                  )}
                </button>
              )
            })}
            {filteredCommands.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-[11px] text-[#555555]">No commands found</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[#1a1a1a]">
            <div className="flex items-center gap-4 text-[9px] text-[#444444]">
              <span>↑↓ NAVIGATE</span>
              <span>↵ SELECT</span>
              <span>ESC CLOSE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CommandPaletteTrigger() {
  return (
    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 border border-[#1a1a1a] bg-[#0a0a0a] text-[9px] text-[#555555]">
      <HugeIcon name="CommandLineIcon" size={12} className="text-[#666666]" />
      <span>⌘K</span>
    </div>
  )
}
