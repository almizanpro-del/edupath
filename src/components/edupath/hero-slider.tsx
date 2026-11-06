'use client'

/**
 * Hero slider — full-width image with text overlay.
 *
 * Clean, simple design: each slide is a full-width background image
 * with a text overlay (headline, subheadline, CTA button) positioned
 * on the left or right side.
 *
 * To add a new slide: just add an entry to the SLIDES array below
 * with the image path, headline, subheadline, and button text.
 *
 * Images go in /public/hero/ (WebP format, ~1600px wide recommended).
 */
import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search, SlidersHorizontal, Sparkles, ArrowRight,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Slide = {
  image: string
  imageAlt: string
  headline: string
  subheadline: string
  // Where the text overlay sits: 'left' or 'right'
  textAlign: 'left' | 'right'
  // Button text + link
  buttonText: string
  buttonHref: string
  // Optional: a secondary button
  secondaryButtonText?: string
  secondaryButtonHref?: string
  // Overlay scrim opacity (0-100) — higher = darker overlay for readability
  overlayOpacity: number
}

const SLIDES: Slide[] = [
  {
    image: '/hero/slider-1.webp',
    imageAlt: 'EduPath — Study abroad within reach',
    headline: 'Study abroad.\nWithin reach.',
    subheadline: 'Explore affordable higher education across 14 countries. Compare tuition, scholarships, and verified reviews — all in one place.',
    textAlign: 'left',
    buttonText: 'Start exploring',
    buttonHref: '/',
    secondaryButtonText: 'Talk to Rihla AI',
    secondaryButtonHref: '/agent',
    overlayOpacity: 50,
  },
  {
    image: '/hero/slider-2.webp',
    imageAlt: 'EduPath — Scholarships and financial aid for MENA students',
    headline: 'Find scholarships\nthat fit you.',
    subheadline: 'Match with 147+ scholarships based on your GPA, field, and country. Never miss a deadline again.',
    textAlign: 'left',
    buttonText: 'Match scholarships',
    buttonHref: '/scholarships',
    secondaryButtonText: 'Learn more',
    secondaryButtonHref: '/pricing',
    overlayOpacity: 55,
  },
  {
    image: '/hero/slider-3.webp',
    imageAlt: 'EduPath — Your AI advisor for university applications',
    headline: 'Meet Rihla,\nyour AI advisor.',
    subheadline: 'Chat in Arabic or English with our AI counselor. Get personalized university matches, essay feedback, and a step-by-step application plan.',
    textAlign: 'left',
    buttonText: 'Chat with Rihla',
    buttonHref: '/agent',
    secondaryButtonText: 'Review your essay',
    secondaryButtonHref: '/essay-review',
    overlayOpacity: 50,
  },
  {
    image: '/hero/slider-4.webp',
    imageAlt: 'EduPath — Compare universities side by side',
    headline: 'Compare smarter.\nChoose with confidence.',
    subheadline: 'Put up to 4 universities side by side. Compare tuition, programs, scholarships, reviews, and total costs — all in one view.',
    textAlign: 'left',
    buttonText: 'Compare universities',
    buttonHref: '/compare',
    secondaryButtonText: 'Browse directory',
    secondaryButtonHref: '/',
    overlayOpacity: 55,
  },
  {
    image: '/hero/slider-5.webp',
    imageAlt: 'EduPath — Track your applications from start to enrollment',
    headline: 'Track every step.\nFrom research to enrollment.',
    subheadline: 'Kanban-style application tracker. Monitor deadlines, upload documents, and visualize your progress from research to enrollment.',
    textAlign: 'left',
    buttonText: 'Start tracking',
    buttonHref: '/my-applications',
    secondaryButtonText: 'Check visa readiness',
    secondaryButtonHref: '/visa-readiness',
    overlayOpacity: 50,
  },
]

const AUTO_ADVANCE_MS = 7000

type HeroSliderProps = {
  searchQuery: string
  onSearchChange: (v: string) => void
  onSearchSubmit: () => void
  onFiltersOpen: () => void
  activeFilterCount: number
  onAgentClick: () => void
  agentCtaTitle: string
  agentCtaDesc: string
  stats: Array<{ value: string | number; label: string }>
  searchPlaceholder: string
  filtersLabel: string
  badgeText: string
  isRtl: boolean
}

export function HeroSlider({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onFiltersOpen,
  activeFilterCount,
  onAgentClick,
  agentCtaTitle,
  agentCtaDesc,
  stats,
  searchPlaceholder,
  filtersLabel,
  badgeText,
  isRtl,
}: HeroSliderProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isPaused, setIsPaused] = React.useState(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const goTo = React.useCallback((index: number) => {
    setCurrentIndex((index + SLIDES.length) % SLIDES.length)
  }, [])

  const next = React.useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % SLIDES.length)
  }, [])

  const prev = React.useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + SLIDES.length) % SLIDES.length)
  }, [])

  // Auto-advance (only if more than 1 slide)
  React.useEffect(() => {
    if (isPaused || SLIDES.length <= 1) return

    timerRef.current = setTimeout(() => {
      next()
    }, AUTO_ADVANCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [next, isPaused, currentIndex])

  // If only 1 slide, no carousel needed — just render it statically
  if (SLIDES.length <= 1) {
    return (
      <HeroSlideStatic
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit}
        onFiltersOpen={onFiltersOpen}
        activeFilterCount={activeFilterCount}
        onAgentClick={onAgentClick}
        agentCtaTitle={agentCtaTitle}
        agentCtaDesc={agentCtaDesc}
        stats={stats}
        searchPlaceholder={searchPlaceholder}
        filtersLabel={filtersLabel}
        badgeText={badgeText}
        isRtl={isRtl}
      />
    )
  }

  return (
    <section
      className="relative bg-slate-950"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides container */}
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {SLIDES.map((slide, i) => (
            <div key={i} className="flex-shrink-0 w-full">
              <HeroSlideContent
                slide={slide}
                searchQuery={searchQuery}
                onSearchChange={onSearchChange}
                onSearchSubmit={onSearchSubmit}
                onFiltersOpen={onFiltersOpen}
                activeFilterCount={activeFilterCount}
                onAgentClick={onAgentClick}
                agentCtaTitle={agentCtaTitle}
                agentCtaDesc={agentCtaDesc}
                stats={stats}
                searchPlaceholder={searchPlaceholder}
                filtersLabel={filtersLabel}
                badgeText={badgeText}
                isRtl={isRtl}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      <button
        onClick={prev}
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 size-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white hover:bg-black/50 transition-colors z-20"
        aria-label="Previous slide"
      >
        <ChevronLeft className={cn('size-5', isRtl && 'rotate-180')} />
      </button>
      <button
        onClick={next}
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 size-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md border border-white/20 text-white hover:bg-black/50 transition-colors z-20"
        aria-label="Next slide"
      >
        <ChevronRight className={cn('size-5', isRtl && 'rotate-180')} />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 inset-x-0 z-20 flex items-center justify-center gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i === currentIndex
                ? 'w-7 bg-white'
                : 'w-1.5 bg-white/40 hover:bg-white/60'
            )}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </section>
  )
}

// ─── Single slide content (shared between static and carousel modes) ───────

function HeroSlideContent({
  slide,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onFiltersOpen,
  activeFilterCount,
  onAgentClick,
  agentCtaTitle,
  agentCtaDesc,
  stats,
  searchPlaceholder,
  filtersLabel,
  badgeText,
  isRtl,
}: {
  slide: Slide
} & Omit<HeroSliderProps, 'isRtl'> & { isRtl: boolean }) {
  const isAr = isRtl || slide.headline.includes('مستقبلك')
  const textOnRight = slide.textAlign === 'right'

  return (
    <div className="relative">
      {/* Background image — full width */}
      <div className="relative w-full h-[420px] sm:h-[500px] md:h-[560px] lg:h-[600px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={slide.image}
          alt={slide.imageAlt}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
          fetchPriority="high"
        />
        {/* Dark overlay for text readability — desktop: side gradient, mobile: bottom gradient */}
        <div
          className="absolute inset-0 md:bg-gradient-to-r hidden md:block"
          style={{
            background: textOnRight
              ? `linear-gradient(to left, rgba(15,23,42,${slide.overlayOpacity / 100}) 0%, rgba(15,23,42,${slide.overlayOpacity / 100 * 0.7}) 50%, transparent 100%)`
              : `linear-gradient(to right, rgba(15,23,42,${slide.overlayOpacity / 100}) 0%, rgba(15,23,42,${slide.overlayOpacity / 100 * 0.7}) 50%, transparent 100%)`,
          }}
        />
        {/* Mobile: bottom-up gradient so text is readable without covering the whole image */}
        <div className="absolute inset-0 md:hidden bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
      </div>

      {/* Text overlay — positioned in the upper-middle area, NOT overlapping the stats bar */}
      <div className="absolute inset-0 flex items-start md:items-center pt-16 pb-24 md:pt-0 md:pb-0">
        <div className="container mx-auto max-w-7xl px-4">
          <div className={cn(
            'max-w-xl',
            textOnRight ? 'ml-auto text-right' : 'text-left',
            isAr && 'dir-rtl'
          )} dir={isAr ? 'rtl' : 'ltr'}>
            {/* Badge */}
            <div className="mb-3 md:mb-4">
              <Badge variant="secondary" className="bg-white/15 text-white border-white/25 backdrop-blur-md">
                <Sparkles className="size-3 mr-1.5" />
                {badgeText}
              </Badge>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-3 md:mb-4 whitespace-pre-line text-white leading-[1.1] drop-shadow-lg">
              {slide.headline}
            </h1>

            {/* Subheadline — hidden on small mobile to avoid covering image */}
            <p className="hidden sm:block text-sm md:text-lg text-white/90 mb-5 md:mb-6 leading-relaxed max-w-md drop-shadow">
              {slide.subheadline}
            </p>

            {/* Buttons */}
            <div className="flex flex-wrap gap-2.5 md:gap-3 mb-4 md:mb-5">
              <a
                href={slide.buttonHref}
                className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-lg transition-colors text-sm md:text-base relative z-10"
              >
                {slide.buttonText}
                <ArrowRight className={cn('size-4', isAr && 'rotate-180')} />
              </a>
              {slide.secondaryButtonText && slide.secondaryButtonHref && (
                <a
                  href={slide.secondaryButtonHref}
                  className="inline-flex items-center gap-2 px-5 md:px-6 py-2.5 md:py-3 rounded-lg bg-white/10 backdrop-blur-md border border-white/30 hover:bg-white/20 text-white font-semibold transition-colors text-sm md:text-base relative z-10"
                >
                  {slide.secondaryButtonText}
                </a>
              )}
            </div>

            {/* Search bar — desktop only, positioned below buttons */}
            <div className="hidden md:flex gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none z-10" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && searchQuery.trim()) onSearchSubmit()
                  }}
                  className="pl-11 h-11 bg-white/95 text-foreground border-0 shadow-lg rounded-lg"
                />
              </div>
              <Button
                onClick={onFiltersOpen}
                className="h-11 gap-1.5 bg-white/10 backdrop-blur-md border border-white/30 hover:bg-white/20 text-white rounded-lg px-3 shadow-lg"
              >
                <SlidersHorizontal className="size-4" />
                {activeFilterCount > 0 && (
                  <Badge className="bg-orange-500 text-white">{activeFilterCount}</Badge>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar — pinned to bottom, separated from text content */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent pt-8 pb-3 md:pb-4">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="hidden md:grid grid-cols-4 gap-3">
            {stats.map((stat, si) => (
              <div key={si} className="bg-white/10 backdrop-blur-xl rounded-xl p-3 border border-white/15 text-center">
                <div className="text-lg font-bold text-white drop-shadow">
                  {stat.value}
                </div>
                <div className="text-[10px] text-white/70 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
          {/* Mobile stats — compact, inline */}
          <div className="md:hidden flex justify-center gap-3">
            {stats.map((stat, si) => (
              <div key={si} className="text-center">
                <div className="text-sm font-bold text-white drop-shadow">{stat.value}</div>
                <div className="text-[8px] text-white/70 uppercase">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Static mode (single slide, no carousel) ────────────────────────────────

function HeroSlideStatic(props: Omit<HeroSliderProps, 'isRtl'> & { isRtl: boolean }) {
  // When there's only one slide, render it without the carousel wrapper
  return (
    <section className="relative bg-slate-950">
      <HeroSlideContent
        slide={SLIDES[0]}
        searchQuery={props.searchQuery}
        onSearchChange={props.onSearchChange}
        onSearchSubmit={props.onSearchSubmit}
        onFiltersOpen={props.onFiltersOpen}
        activeFilterCount={props.activeFilterCount}
        onAgentClick={props.onAgentClick}
        agentCtaTitle={props.agentCtaTitle}
        agentCtaDesc={props.agentCtaDesc}
        stats={props.stats}
        searchPlaceholder={props.searchPlaceholder}
        filtersLabel={props.filtersLabel}
        badgeText={props.badgeText}
        isRtl={props.isRtl}
      />
    </section>
  )
}
