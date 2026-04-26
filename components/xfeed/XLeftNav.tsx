'use client'

import { motion } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import Image from 'next/image'
import {
  Home01Icon,
  Compass01Icon,
  Notification03Icon,
  Mail02Icon,
  UserMultipleIcon,
  Bookmark01Icon,
  UserIcon,
  More01Icon,
  FeatherIcon,
  Pulse02Icon,
} from '@hugeicons/core-free-icons'
import { T_FAST } from '@/components/xfeed/_motion'

const ITEMS = [
  { label: 'Feed',       icon: Home01Icon,         active: true  },
  { label: 'Discover',   icon: Compass01Icon,      active: false },
  { label: 'Alerts',     icon: Notification03Icon, active: false },
  { label: 'Messages',   icon: Mail02Icon,         active: false },
  { label: 'Network',    icon: UserMultipleIcon,   active: false },
  { label: 'Saved',      icon: Bookmark01Icon,     active: false },
  { label: 'Profile',    icon: UserIcon,           active: false },
  { label: 'More',       icon: More01Icon,         active: false },
]

export function XLeftNav() {
  return (
    <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:px-3 lg:py-5">
      <div>
        <div className="mb-6 flex items-center gap-2.5 px-2">
          <div className="relative flex h-9 w-9 items-center justify-center border border-white/15 bg-black">
            <HugeiconsIcon
              icon={Pulse02Icon}
              size={18}
              strokeWidth={1.8}
              className="text-white"
            />
            <span className="absolute inset-0 animate-pulse bg-white/[0.04]" />
          </div>
          <div className="leading-none">
            <div className="font-mono text-[13px] font-semibold tracking-[0.18em] text-white">
              SIGNAL
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.28em] text-[#e8e8e8]">
              {new Date().toLocaleDateString([], { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </div>
       
       
          </div>
        </div>

        <nav className="space-y-[2px]">
          {ITEMS.map((item, idx) => (
            <motion.button
              key={item.label}
              whileHover={{ x: 3 }}
              transition={T_FAST}
              className={`group relative flex w-full items-center gap-3.5 border-l-2 px-3 py-2.5 text-left transition-colors duration-200 ${
                item.active
                  ? 'border-white bg-white/[0.04] text-white'
                  : 'border-transparent text-white/55 hover:border-white/30 hover:bg-white/[0.02] hover:text-white'
              }`}
            >
              <span className="font-mono text-[9px] tabular-nums text-[#e8e8e8]">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <HugeiconsIcon
                icon={item.icon}
                size={18}
                strokeWidth={item.active ? 2 : 1.6}
                className="text-[#e8e8e8]"
              />
              <span
                className={`text-[13px] text-[#e8e8e8] uppercase tracking-[0.14em] ${
                  item.active ? 'font-semibold' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
              {item.active && (
                <motion.span
                  layoutId="xfeed-nav-cursor"
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-white"
                />
              )}
            </motion.button>
          ))}
        </nav>

        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          transition={T_FAST}
          className="group mt-6 flex w-full items-center justify-center gap-2 border border-white/15 bg-white px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-black transition-colors duration-200 hover:bg-white/90"
        >
          <HugeiconsIcon
            icon={FeatherIcon}
            size={14}
            strokeWidth={2}
            className="transition-transform duration-200 group-hover:-rotate-12"
          />
          Compose
        </motion.button>
      </div>

      <div className="border border-white/[0.08] bg-black/30 p-3 pb-12">
        <div className="flex items-center gap-3">
          <div className="relative h-9 w-9 shrink-0">
            <div className="absolute inset-0" />
              <Image src="/user2.png" alt="SignalUser" width={100} height={100} className="bg-gradient-to-br from-white/80 to-white/[0.04] border border-white/50" />
          </div>
          <div className="hidden min-w-0 xl:block">
            <div className="truncate text-[12px] font-semibold tracking-[0.14em] text-white">
              kaushik_nag
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-[#e8e8e8]">
              <span className="h-1 w-1 animate-pulse rounded-full bg-[#7bc49a]" />
              online
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
