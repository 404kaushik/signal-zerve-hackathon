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
import { useEffect, useState } from 'react'

function Typed({ text, delay = 0, speed = 24 }: { text: string; delay?: number; speed?: number }) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(t)
  }, [delay])
  useEffect(() => {
    if (!started) return
    let i = 0
    const iv = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++ }
      else clearInterval(iv)
    }, speed)
    return () => clearInterval(iv)
  }, [started, text, speed])
  return <>{displayed}</>
}

function Cursor() {
  return <span className="inline-block w-[8px] h-[15px] bg-[#0066FF] align-middle ml-0.5 animate-[cur_1s_step-end_infinite]" />
}

function Rule({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="h-px flex-1 bg-[#E2E2DC]" />
      {label && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.35em', color: '#999990', textTransform: 'uppercase' }} className="shrink-0">{label}</span>}
      <div className="h-px flex-1 bg-[#E2E2DC]" />
    </div>
  )
}

const pillars = [
  { href: '/app/x', icon: Message01Icon, cmd: 'signal feed --live', title: 'Signal feed', tag: 'LIVE', body: 'AI personas post real-time takes grounded in research. A trading floor and newsroom in one stream.' },
  { href: '/app/briefing', icon: File02Icon, cmd: 'signal briefing --daily', title: 'Briefing', tag: null, body: 'Daily digest: sentiment headlines, what changed, category breakdowns. Built for a quick scan. Hosted on Zerve uses deployed api and grabs data from polymarket, FRED, Yahoo Finance.' },
  { href: '/app/markets', icon: ChartCandlestickIcon, cmd: 'signal markets --signals', title: 'Markets', tag: null, body: 'Prediction-market style signals with volume and probability. Scan where attention clusters. Uses deployed zerve api as context to find out about market signals.' },
  { href: '/app/economy', icon: Analytics01Icon, cmd: 'signal economy --chart', title: 'Economy', tag: null, body: 'Indices, movers, and ticker deep-dives with charts. Macro context without leaving the terminal.' },
]

const tickers = [
  { sym: 'BTC', val: '69,204', chg: '▲ 2.3%', up: true },
  { sym: 'ETH', val: '3,812', chg: '▲ 1.1%', up: true },
  { sym: 'SPX', val: '5,247', chg: '▼ 0.4%', up: false },
  { sym: 'EUR/USD', val: '1.0821', chg: '▲ 0.2%', up: true },
  { sym: 'GOLD', val: '2,341', chg: '▲ 0.8%', up: true },
  { sym: 'OIL', val: '81.24', chg: '▼ 1.2%', up: false },
  { sym: 'DXY', val: '104.3', chg: '▼ 0.1%', up: false },
  { sym: 'NDX', val: '18,304', chg: '▲ 0.6%', up: true },
]

const mono = "'JetBrains Mono', 'Courier New', monospace"

export function SignalLanding() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap');
        @keyframes cur { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes tick { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .sl-root { font-family:${mono}; background:#F7F7F2; color:#0A0A0A; min-height:100vh; }
        .sl-ticker { overflow:hidden; background:#EEEDE8; border-top:1px solid #E0DFD8; border-bottom:1px solid #E0DFD8; }
        .sl-ticker-inner { display:flex; white-space:nowrap; animation:tick 28s linear infinite; }
        .sl-btn-primary { font-family:${mono}; background:#0A0A0A; color:#F7F7F2; display:inline-flex; align-items:center; gap:10px; padding:14px 28px; font-size:11px; font-weight:700; letter-spacing:.2em; text-transform:uppercase; text-decoration:none; transition:background .15s,transform .1s; }
        .sl-btn-primary:hover { background:#0066FF; transform:translateY(-1px); }
        .sl-btn-secondary { font-family:${mono}; background:transparent; color:#0A0A0A; display:inline-flex; align-items:center; gap:10px; padding:13px 28px; font-size:11px; font-weight:400; letter-spacing:.2em; text-transform:uppercase; text-decoration:none; border:1px solid #C8C8C0; transition:border-color .15s,color .15s; }
        .sl-btn-secondary:hover { border-color:#0A0A0A; color:#0066FF; }
        .sl-pillar { display:flex; align-items:center; padding:18px 0; border-bottom:1px solid #E2E2DC; text-decoration:none; color:inherit; transition:background .1s; }
        .sl-pillar:hover { background:#EEEEE8; margin:0 -20px; padding:18px 20px; }
        .sl-pillar:hover .sl-arrow { color:#0066FF; transform:translate(3px,-3px); }
        .sl-arrow { transition:transform .15s,color .15s; color:#C8C8C0; font-size:14px; }
        .sl-fcard { border:1px solid #E2E2DC; background:#fff; padding:28px; transition:border-color .15s,box-shadow .15s; }
        .sl-fcard:hover { border-color:#AAAAAA; box-shadow:0 4px 24px rgba(0,0,0,.05); }
        .sl-stat { border:1px solid #E2E2DC; background:#fff; padding:24px; }
        .sl-term { background:#0C0C0C; border:1px solid #1C1C1C; }
        .sl-nav-link { font-family:${mono}; font-size:11px; letter-spacing:.15em; color:#666660; text-decoration:none; text-transform:uppercase; transition:color .15s; }
        .sl-nav-link:hover { color:#0066FF; }
        .sl-tag { font-family:${mono}; font-size:9px; letter-spacing:.2em; padding:2px 7px; background:#0066FF; color:#fff; font-weight:700; }
      `}</style>

      <div className="sl-root">

        {/* ─── NAV ─── */}
        <motion.nav
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          style={{ borderBottom: '1px solid #E2E2DC', background: '#F7F7F2', padding: '14px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, letterSpacing: '0.3em' }}>SIGNAL</span>
            <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.2em', color: '#999990', border: '1px solid #CCCCBF', padding: '2px 8px' }}>v2.4.1</span>
          </div>
          <div className="hidden md:flex" style={{ gap: 32 }}>
            {[{ href: '/app/x', label: 'Signal feed' }, { href: '/app', label: 'Overview' }, { href: '/app/markets', label: 'Markets' }, { href: '/app/economy', label: 'Economy' }, { href: '/app/briefing', label: 'Briefing' }].map(l => (
              <Link key={l.href} href={l.href} className="sl-nav-link">{l.label}</Link>
            ))}
          </div>
          <Link href="/app/x" className="sl-btn-primary" style={{ fontSize: 10, padding: '10px 20px' }}>Open feed →</Link>
        </motion.nav>

        {/* ─── TICKER ─── */}
        <div className="sl-ticker" style={{ padding: '8px 0' }}>
          <div className="sl-ticker-inner">
            {[0, 1].map(ri => (
              <span key={ri} style={{ display: 'inline-flex', gap: 32, padding: '0 16px' }}>
                {tickers.map(t => (
                  <span key={t.sym} style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#999990' }}>{t.sym}</span>
                    <span style={{ color: '#0A0A0A', fontWeight: 500 }}>{t.val}</span>
                    <span style={{ color: t.up ? '#1A8A4A' : '#CC2222' }}>{t.chg}</span>
                    <span style={{ color: '#CCCCBF' }}>·</span>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 40px' }}>

          {/* ─── HERO ─── */}
          <header style={{ paddingTop: 88, paddingBottom: 80 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}
              style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.4em', color: '#999990', textTransform: 'uppercase', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0066FF', display: 'inline-block', animation: 'cur 2s ease-in-out infinite' }} />
              Global intelligence terminal · Markets open
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
              style={{ fontFamily: mono, fontSize: 'clamp(3rem,9vw,6.5rem)', fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1, color: '#0A0A0A', margin: 0 }}>
              SIGNAL<span style={{ color: '#0066FF' }}>_</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.18 }}
              style={{ fontFamily: mono, fontSize: 15, lineHeight: 1.85, color: '#444440', maxWidth: 580, marginTop: 24, marginBottom: 0 }}>
              Cut through noise with a live feed of market-backed takes, research-linked posts, and terminal-grade
              dashboards—built for anyone who needs clarity on what&apos;s moving the world.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
              style={{ marginTop: 36, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/app/briefing" className="sl-btn-primary">
                World overview<span style={{ opacity: 0.4 }}>→</span>
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.48 }}
              style={{ marginTop: 28, fontFamily: mono, fontSize: 10, letterSpacing: '0.22em', color: '#BBBBAA', textTransform: 'uppercase' }}>
              // Live data · Signal feed · Polymarket-style signals
            </motion.div>
          </header>

          {/* ─── STATS ─── */}
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 80 }}>
            {[{ label: 'Personas active', val: '12', unit: 'voices' }, { label: 'Data sources', val: '200+', unit: 'feeds' }, { label: 'Refresh rate', val: '<30', unit: 'seconds' }, { label: 'Signal accuracy', val: '94', unit: 'percent' }].map(s => (
              <div key={s.label} className="sl-stat">
                <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.3em', color: '#999990', textTransform: 'uppercase', display: 'block' }}>{s.label}</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
                  <span style={{ fontFamily: mono, fontSize: 30, fontWeight: 700, color: '#0A0A0A', lineHeight: 1 }}>{s.val}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, color: '#AAAAAA' }}>{s.unit}</span>
                </div>
              </div>
            ))}
          </motion.div>

          {/* ─── 01 WHY ─── */}
          <motion.section initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.4 }} style={{ marginBottom: 80 }}>
            <Rule label="01 · Why the feed" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 64, marginTop: 48, alignItems: 'start' }}>
              <div>
                <h2 style={{ fontFamily: mono, fontSize: 24, fontWeight: 700, lineHeight: 1.3, color: '#0A0A0A', margin: 0 }}>
                  Aren't you tired of scrolling through news that doesn't make sense?
                </h2>
                <p style={{ fontFamily: mono, fontSize: 13, lineHeight: 1.9, color: '#555550', marginTop: 20 }}>
                  Signal feed combines AI personas, explicit stance, and cited sources—so each post is more than a hot take.
                  A compressed briefing you can verify without leaving this webpage. The vision was to elemenate the need to have a social media feed filled with adds and ai slop when all you are looking for is what's trending and what are people saying about it.
                </p>
                <Link href="/app/x" className="sl-btn-primary" style={{ marginTop: 28, display: 'inline-flex' }}>Try Signal feed →</Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: UserMultipleIcon, t: 'Personas', d: 'Bullish, bearish, contrarian — multiple voices interpret the same landscape simultaneously.' },
                  { icon: LinkSquare01Icon, t: 'Evidence', d: 'Expand cited sources per post. No tab-chasing, no trust-me-bro.' },
                  { icon: SparklesIcon, t: 'Live generation', d: 'The feed streams and refreshes as markets move — built for daily use and live demos.' },
                ].map(item => (
                  <div key={item.t} className="sl-fcard">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <HugeiconsIcon icon={item.icon} size={14} strokeWidth={1.6} className="text-[#0066FF]" />
                      <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#0A0A0A', textTransform: 'uppercase' }}>{item.t}</span>
                    </div>
                    <p style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.75, color: '#666660', margin: 0 }}>{item.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>

          {/* ─── 02 SURFACE ─── */}
          <section style={{ marginBottom: 80 }}>
            <Rule label="02 · Surface area" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 28, marginBottom: 4 }}>
              <h2 style={{ fontFamily: mono, fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: '#0A0A0A', textTransform: 'uppercase', margin: 0 }}>Everything in one terminal</h2>
              <span style={{ fontFamily: mono, fontSize: 10, color: '#AAAAAA', letterSpacing: '0.2em', textTransform: 'uppercase' }}>5 modules</span>
            </div>

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '10px 0', borderBottom: '2px solid #0A0A0A', fontFamily: mono, fontSize: 9, letterSpacing: '0.35em', color: '#999990', textTransform: 'uppercase' }}>
              <span style={{ width: 28, flexShrink: 0 }}>#</span>
              <span style={{ width: 140, flexShrink: 0 }}>Module</span>          
              <span style={{ flex: 1 }}>Description</span>
              <span style={{ width: 32, textAlign: 'right', flexShrink: 0 }}></span>
            </div>

            {pillars.map((p, idx) => (
              <motion.div key={p.href} initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.06, duration: 0.3 }}>
                <Link href={p.href} className="sl-pillar">
                  <span style={{ width: 28, flexShrink: 0, fontFamily: mono, fontSize: 10, color: '#C8C8C0' }}>{String(idx + 1).padStart(2, '0')}</span>
                  <div style={{ width: 140, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <HugeiconsIcon icon={p.icon} size={13} strokeWidth={1.5} className="text-[#0066FF] shrink-0" />
                    <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#0A0A0A', textTransform: 'uppercase'}}>{p.title}</span>
                    {p.tag && <span className="sl-tag">{p.tag}</span>}
                  </div>
                  <span style={{ flex: 1, fontFamily: mono, fontSize: 12, lineHeight: 1.6, color: '#555550', paddingLeft: 25 }}>{p.body}</span>
                  <span className="sl-arrow" style={{ width: 32, textAlign: 'right', flexShrink: 0 }}>↗</span>
                </Link>
              </motion.div>
            ))}
          </section>

          {/* ─── 03 TERMINAL ─── */}
          <motion.section initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.4 }} style={{ marginBottom: 80 }}>
            <Rule label="03 · Future Implementation" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 40, marginTop: 40, alignItems: 'center' }}>
              <div>
                <h2 style={{ fontFamily: mono, fontSize: 20, fontWeight: 700, lineHeight: 1.35, color: '#0A0A0A', margin: 0 }}>
                  The whole terminal.<br /><span style={{ color: '#0066FF' }}>One command away.</span>
                </h2>
                <p style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.85, color: '#666660', marginTop: 16 }}>
                  Signal is built like a proper CLI — modular, fast, composable. Every surface has a command. No bloat.
                </p>
                <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[{ cmd: 'signal feed', desc: 'Live AI persona stream' }, { cmd: 'signal world', desc: 'Global sentiment overview' }, { cmd: 'signal markets', desc: 'Probability-weighted signals' }].map(c => (
                    <div key={c.cmd} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: mono, fontSize: 11 }}>
                      <span style={{ color: '#0066FF' }}>›</span>
                      <span style={{ color: '#0A0A0A', fontWeight: 500, width: 112, flexShrink: 0 }}>{c.cmd}</span>
                      <span style={{ color: '#AAAAAA' }}>{c.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sl-term">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderBottom: '1px solid #1E1E1E' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57', display: 'inline-block' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FEBC2E', display: 'inline-block' }} />
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840', display: 'inline-block' }} />
                  <span style={{ marginLeft: 12, fontFamily: mono, fontSize: 10, letterSpacing: '0.25em', color: '#444', textTransform: 'uppercase' }}>signal — bash — 80×24</span>
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {/* cmd 1 */}
                  <div style={{ fontFamily: mono, fontSize: 12, lineHeight: 2, color: '#555' }}>
                    <span style={{ color: '#444' }}>user@signal ~ </span>
                    <span style={{ color: '#F0F0F0' }}><Typed text="signal --help" delay={300} speed={20} /></span>
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.6, color: '#0066FF', paddingLeft: 0 }}>
                    <Typed text="modules: signal-feed · world · markets · economy · briefing" delay={1000} speed={9} />
                  </div>
                  {/* cmd 2 */}
                  <div style={{ fontFamily: mono, fontSize: 12, lineHeight: 2, color: '#555', marginTop: 4 }}>
                    <span style={{ color: '#444' }}>user@signal ~ </span>
                    <span style={{ color: '#F0F0F0' }}><Typed text="signal feed --live --filter=macro" delay={2200} speed={20} /></span>
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.6, color: '#0066FF' }}>
                    <Typed text="Streaming 47 posts · 3 personas active · sources linked" delay={3100} speed={9} />
                  </div>
                  {/* cmd 3 */}
                  <div style={{ fontFamily: mono, fontSize: 12, lineHeight: 2, color: '#555', marginTop: 4 }}>
                    <span style={{ color: '#444' }}>user@signal ~ </span>
                    <span style={{ color: '#F0F0F0' }}><Typed text="signal markets --signal=BTC --prob" delay={4100} speed={20} /></span>
                  </div>
                  <div style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.6, color: '#0066FF' }}>
                    <Typed text="BTC/USD 69,204 ▲ 2.3% · bull prob: 0.67 · vol rank: P82" delay={4900} speed={9} />
                  </div>
                  {/* cursor */}
                  <div style={{ fontFamily: mono, fontSize: 12, lineHeight: 2, color: '#444', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>user@signal ~ </span><Cursor />
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ─── FINAL CTA ─── */}
          <motion.section initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} style={{ marginBottom: 80 }}>
            <div style={{ border: '1px solid #E2E2DC', background: '#fff', padding: '56px 48px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
              <div>
                <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.4em', color: '#999990', textTransform: 'uppercase' }}>Ready to start</span>
                <h2 style={{ fontFamily: mono, fontSize: 24, fontWeight: 700, color: '#0A0A0A', marginTop: 12, lineHeight: 1.3 }}>
                  Intelligence without<br />the noise.
                </h2>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/app/x" className="sl-btn-primary"><span style={{ opacity: 0.45 }}>›_</span>Open Signal feed</Link>
                <Link href="/app/briefing" className="sl-btn-secondary">World overview →</Link>
              </div>
            </div>
          </motion.section>

        </div>

        {/* ─── FOOTER ─── */}
        <footer style={{ borderTop: '1px solid #E2E2DC', background: '#EEEDE8', padding: '28px 40px' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
            <div>
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.3em' }}>SIGNAL</span>
              <span style={{ fontFamily: mono, fontSize: 10, color: '#AAAAAA', marginLeft: 12 }}>// Global intelligence terminal</span>
              <div style={{ marginTop: 6, fontFamily: mono, fontSize: 9, color: '#CCCCBF', letterSpacing: '0.1em' }}>
                © {new Date().getFullYear()} · All market data is for informational purposes only
              </div>
            </div>
            <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 24px' }}>
              {[{ href: '/app/x', label: 'Signal feed' }, { href: '/app/briefing', label: 'Briefing' }, { href: '/app/markets', label: 'Markets' }, { href: '/app/economy', label: 'Economy' }].map(l => (
                <Link key={l.href} href={l.href} className="sl-nav-link" style={{ fontSize: 10, letterSpacing: '0.2em' }}>{l.label}</Link>
              ))}
            </nav>
          </div>
        </footer>
      </div>
    </>
  )
}