'use client'

import { motion, type Variants } from 'framer-motion'

// ─── Easing ────────────────────────────────────────────────────────────────
export const EASE = [0.22, 1, 0.36, 1] as const
export const EASE_OUT = [0.16, 1, 0.3, 1] as const

// ─── Variants ──────────────────────────────────────────────────────────────

// Staggered container for lists
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
}

// Individual item in a staggered list
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
}

// Fade in up (for hero text)
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: EASE_OUT },
  },
}

// Scale in (for cards, badges)
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
}

// Slide in from left
export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
}

// Slide in from right
export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
}

// Page transition
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: EASE },
  },
}

// ─── Animation Wrappers ────────────────────────────────────────────────────

// Animated div for staggered list containers
export function MotionContainer({ children, className, delay = 0 }: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      transition={{ delayChildren: delay }}
    >
      {children}
    </motion.div>
  )
}

// Animated item for staggered lists
export function MotionItem({ children, className }: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <motion.div className={className} variants={staggerItem}>
      {children}
    </motion.div>
  )
}

// Hover animation for cards
export const cardHover = {
  whileHover: { y: -6, transition: { duration: 0.2, ease: EASE } },
  whileTap: { y: -2 },
}

// Button hover
export const buttonHover = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700 ${className ?? ''}`}
    />
  )
}

export function UniversityCardSkeleton() {
  return (
    <div className="border rounded-xl p-4 space-y-3 bg-white dark:bg-slate-800">
      <div className="flex items-start gap-3">
        <Skeleton className="size-8 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="size-6 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
      <div className="grid grid-cols-3 gap-2 pt-3 border-t">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  )
}
