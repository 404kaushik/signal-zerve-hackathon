'use client'

import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { HugeIcon } from '@/components/worldlens/huge-icon'

const navItems = [
  { href: '/app/briefing', label: 'Briefing', icon: 'File02Icon', shortcut: '01' },
  { href: '/app/economy', label: 'Economy', icon: 'Analytics01Icon', shortcut: '02' },
  { href: '/app/markets', label: 'Markets', icon: 'ChartCandlestickIcon', shortcut: '03' },
  { href: '/app/x', label: 'Feed', icon: 'Message01Icon', shortcut: '04' },
]

export function SidebarNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  // Prefetch the feed route so the page bundle is ready before the user clicks.
  useEffect(() => {
    router.prefetch('/app/x')
  }, [router])

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="liquid-glass-strong fixed left-4 top-4 z-50 border border-[#1a1a1a] p-2 lg:hidden"
      >
        <HugeIcon name={isOpen ? 'Cancel01Icon' : 'Menu01Icon'} size={16} className="text-[#888888]" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'liquid-glass-strong fixed left-0 top-0 z-40 h-full w-40 border-r border-[#1a1a1a]',
          'flex flex-col',
          'transition-transform duration-300 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="border-b border-[#1a1a1a] p-3">
          <Link href="/" className="block">
            <div className="text-[10px] tracking-[0.3em] text-[#555555] mb-1">
              SYSTEM
            </div>
            <div className="text-sm tracking-[0.15em] font-light">SIGNAL</div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-3 mb-3">
            <div className="text-[8px] tracking-[0.3em] text-[#444444] uppercase">
              Intelligence Layers
            </div>
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'mx-2 mb-0.5 flex items-center gap-3 px-3 py-1.5 transition-colors',
                  'border border-transparent',
                  isActive
                    ? 'bg-[#111111] border-[#1a1a1a] text-[#e8e8e8]'
                    : 'text-[#666666] hover:text-[#888888] hover:bg-[#0a0a0a]'
                )}
              >
                <span className="text-[9px] tabular-nums text-[#444444]">
                  {item.shortcut}
                </span>
                <HugeIcon name={item.icon} size={14} className="text-[#777777]" />
                <span className="text-[10px] uppercase tracking-[0.15em]">
                  {item.label}
                </span>
                {isActive && (
                  <div className="ml-auto h-1 w-1 bg-[#e8e8e8]" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#1a1a1a]">
          <div className="text-[8px] tracking-[0.2em] text-[#444444] mb-2">
            SYSTEM STATUS
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 bg-[#888888]" />
            <span className="text-[9px] text-[#666666]">ALL FEEDS ONLINE</span>
          </div>
        </div>
      </aside>
    </>
  )
}
