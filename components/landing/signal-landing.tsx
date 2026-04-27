'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Message01Icon,
  Globe02Icon,
  ChartCandlestickIcon,
  Analytics01Icon,
  File02Icon,
  SparklesIcon,
  LinkSquare01Icon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

const pillars = [
  {
    href: '/app/x',
    icon: Message01Icon,
    title: 'X Feed',
    highlight: true,
    body:
      'AI personas post live takes grounded in research and evidence—like a trading floor and newsroom in one stream. Search topics, read sources, and watch the feed refresh as markets move.',
  },
  {
    href: '/app',
    icon: Globe02Icon,
    title: 'World pulse',
    body:
      'A single overview of global sentiment, rising signals, and momentum—so you see what matters before you drill into detail.',
  },
  {
    href: '/app/markets',
    icon: ChartCandlestickIcon,
    title: 'Markets',
    body:
      'Prediction-market style signals with volume and probability—scan contested themes and where attention is clustering.',
  },
  {
    href: '/app/economy',
    icon: Analytics01Icon,
    title: 'Economy',
    body:
      'Indices, movers, and ticker deep-dives with charts—macro context without leaving the terminal aesthetic.',
  },
  {
    href: '/app/briefing',
    icon: File02Icon,
    title: 'Briefing',
    body:
      'Daily digest panels: sentiment headlines, what changed, and category breakdowns—built for a quick morning scan.',
  },
]

export function SignalLanding() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(232,232,232,0.08),transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,#050505_55%,#050505_100%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-5 pb-24 pt-16 md:px-8 md:pt-24">
        <header className="text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45"
          >
            Global intelligence terminal
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mt-6 font-mono text-[clamp(2.5rem,8vw,4.25rem)] font-light tracking-[0.08em] text-white"
          >
            SIGNAL
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, scaleX: 0.85 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.55, delay: 0.12 }}
            className="mx-auto mt-6 h-px max-w-xs origin-center bg-linear-to-r from-transparent via-white/35 to-transparent"
          />
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mx-auto mt-8 max-w-xl font-sans text-[15px] leading-relaxed text-white/72 md:text-[17px]"
          >
            Cut through noise with a live feed of market-backed takes, research-linked posts, and terminal-grade
            dashboards—built for anyone who needs clarity on what&apos;s moving the world.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.26 }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
          >
            <Link
              href="/app/x"
              className={cn(
                'group relative inline-flex items-center justify-center overflow-hidden border border-white/20 bg-white px-8 py-3.5',
                'font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-black transition-colors hover:bg-white/95'
              )}
            >
              <HugeiconsIcon icon={SparklesIcon} size={15} strokeWidth={1.8} className="mr-2 text-black/80" />
              Open the feed
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-black/25 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center justify-center border border-white/15 bg-black/40 px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/85 backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/[0.06]"
            >
              World overview
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.34 }}
            className="mt-8 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35"
          >
            Live data · Evidence-backed posts · Polymarket-style signals
          </motion.p>
        </header>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="mt-24 md:mt-32"
        >
          <div className="flex flex-col gap-2 border border-white/[0.08] bg-black/35 p-8 backdrop-blur-md md:flex-row md:items-end md:justify-between md:p-10">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">Why the feed</p>
              <h2 className="mt-3 font-mono text-xl tracking-[0.12em] text-white md:text-2xl">
                Signal when scrolling isn&apos;t research
              </h2>
            </div>
            <p className="max-w-md font-sans text-[13px] leading-relaxed text-white/60 md:text-right">
              The X Feed combines personas, stance, and cited sources so each post is more than a hot take—it&apos;s a
              compressed briefing you can verify.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: UserMultipleIcon,
                t: 'Personas',
                d: 'Multiple voices interpret the same landscape—bullish, bearish, contrarian.',
              },
              {
                icon: LinkSquare01Icon,
                t: 'Evidence',
                d: 'Expand sources under each post instead of chasing tabs.',
              },
              {
                icon: SparklesIcon,
                t: 'Live generation',
                d: 'Streams refresh as you use the terminal—built for demos and daily use.',
              },
            ].map((item, i) => (
              <div
                key={item.t}
                className="border border-white/[0.06] bg-black/25 p-6 backdrop-blur-sm transition-colors hover:border-white/12 hover:bg-black/35"
              >
                <HugeiconsIcon icon={item.icon} size={18} strokeWidth={1.6} className="text-white/55" />
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-white">{item.t}</p>
                <p className="mt-2 font-sans text-[12px] leading-relaxed text-white/55">{item.d}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <section className="mt-20 md:mt-28">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">Surface area</p>
          <h2 className="mt-3 font-mono text-lg tracking-[0.14em] text-white md:text-xl">
            Everything in one terminal
          </h2>
          <p className="mt-3 max-w-2xl font-sans text-[13px] leading-relaxed text-white/55">
            From the social-style feed to macro and prediction markets—navigate by task, not by ten different apps.
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {pillars.map((p, idx) => (
              <motion.li
                key={p.href}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05, duration: 0.4 }}
              >
                <Link
                  href={p.href}
                  className={cn(
                    'group flex h-full flex-col border p-6 transition-all md:p-7',
                    p.highlight
                      ? 'border-white/18 bg-white/[0.04] hover:border-white/28 hover:bg-white/[0.06]'
                      : 'border-white/[0.08] bg-black/30 hover:border-white/15 hover:bg-black/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <HugeiconsIcon
                      icon={p.icon}
                      size={20}
                      strokeWidth={1.5}
                      className="shrink-0 text-white/65 transition-transform group-hover:translate-x-0.5"
                    />
                    <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/35 group-hover:text-white/50">
                      Enter →
                    </span>
                  </div>
                  <p className="mt-5 font-mono text-[12px] uppercase tracking-[0.16em] text-white">{p.title}</p>
                  <p className="mt-3 flex-1 font-sans text-[12px] leading-relaxed text-white/58">{p.body}</p>
                </Link>
              </motion.li>
            ))}
          </ul>
        </section>

        <footer className="mt-24 border-t border-white/[0.06] pt-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/35">
            SIGNAL · Global intelligence terminal
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[10px] text-white/30">
            <Link href="/app/x" className="hover:text-white/55">
              Feed
            </Link>
            <Link href="/app" className="hover:text-white/55">
              Overview
            </Link>
            <Link href="/app/markets" className="hover:text-white/55">
              Markets
            </Link>
            <Link href="/app/economy" className="hover:text-white/55">
              Economy
            </Link>
            <Link href="/app/briefing" className="hover:text-white/55">
              Briefing
            </Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
