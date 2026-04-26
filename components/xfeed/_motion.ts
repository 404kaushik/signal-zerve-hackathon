import type { Transition, Variants } from 'framer-motion'

export const EASE_SIGNAL: [number, number, number, number] = [0.22, 1, 0.36, 1]

export const T_FAST: Transition = { duration: 0.22, ease: EASE_SIGNAL }
export const T_BASE: Transition = { duration: 0.35, ease: EASE_SIGNAL }
export const T_SLOW: Transition = { duration: 0.5, ease: EASE_SIGNAL }

export const SPRING_BAR: Transition = { type: 'spring', stiffness: 380, damping: 32, mass: 0.6 }

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: T_BASE },
}

export const expandPanel: Variants = {
  hidden: { opacity: 0, height: 0 },
  show: { opacity: 1, height: 'auto', transition: T_BASE },
  exit: { opacity: 0, height: 0, transition: T_FAST },
}
