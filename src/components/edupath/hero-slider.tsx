'use client'

/**
 * Hero slider — split-screen design with manual carousel.
 *
 * Uses a simple CSS-based carousel (transform: translateX) instead of
 * Embla to avoid any hydration/initialization issues. All slides are
 * rendered in the DOM but only one is visible at a time.
 *
 * Layout: image on one half, content (headline, search, CTAs, stats)
 * on the other half. Alternates image position per slide.
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
  imageSide: 'left' | 'right'
  accent: string
}

const SLIDES: Slide[] = [
  {
    image: '/hero/slide-2-desktop.webp',
    imageAlt: 'Students exploring global universities with EduPath',
    headline: 'Study abroad.\nWithin reach.',
    subheadline: 'Explore affordable higher education options across 14 countries.',
    imageSide: 'right',
    accent: 'from-slate-950 via-blue-950 to-blue-900',
  },
  {
    image: '/hero/slide-1-arabic.webp',
    imageAlt: 'مستقبلك أقرب مما تتخيل — EduPath',
    headline: 'مستقبلك أقرب\nمما تتخيل',
    subheadline: 'استكشف البرامج والشهادات والمنح الدراسية بأسعار معقولة في الخارج',
    imageSide: 'left',
    accent: 'from-blue-900 via-blue-950 to-slate-950',
  },
  {
    image: '/hero/slide-3-billboard.webp',
    imageAlt: 'Find your path to quality education — EduPath',
    headline: 'Find your path to\nquality education',
    subheadline: 'Compare tuition, scholarships & verified peer reviews across 14 countries.',
    imageSide: 'right',
    accent: 'from-slate-950 via-slate-900 to-blue-950',
  },
  {
    image: '/hero/slide-4-medium.webp',
    imageAlt: 'For MENA students — EduPath',
    headline: 'Built for MENA\nstudents',
    subheadline: 'Compare tuition, scholarships & verified peer reviews from students like you.',
    imageSide: 'left',
    accent: 'from-blue-950 via-slate-950 to-slate-900',
  },
  {
    image: '/hero/slide-5-square.webp',
    imageAlt: 'Compare smarter. Choose with confidence. — EduPath',
    headline: 'Compare smarter.\nChoose with confidence.',
    subheadline: '129 universities across 14 countries. Tuition, scholarships & peer reviews.',
    imageSide: 'right',
    accent: 'from-slate-900 via-blue-950 to-blue-900',
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

  // Auto-advance
  React.useEffect(() => {
    if (isPaused) return

    timerRef.current = setTimeout(() => {
      next()
    }, AUTO_ADVANCE_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [next, isPaused, currentIndex])

  return (
    <section
      className="relative bg-slate-950"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ===== Slides container ===== */}
      <div className="relative overflow-hidden">
        {/* Track — translates horizontally */}
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {SLIDES.map((slide, i) => {
            const isAr = isRtl || slide.headline.includes('مستقبلك')
            const imageOnRight = isAr ? slide.imageSide === 'left' : slide.imageSide === 'right'

            return (
              <div key={i} className="flex-shrink-0 w-full">
                {/* ===== Desktop: split-screen ===== */}
                <div className="hidden md:flex min-h-[500px] lg:min-h-[560px]">
                  {/* Content side */}
                  <div className={cn(
                    'flex-1 flex items-center justify-center p-8 lg:p-16 bg-gradient-to-br',
                    slide.accent,
                    imageOnRight ? 'order-1' : 'order-2'
                  )}>
                    <div className={cn('max-w-xl w-full', isAr && 'text-right')} dir={isAr ? 'rtl' : 'ltr'}>
                      {/* Badge */}
                      <div className="mb-5">
                        <Badge variant="secondary" className="bg-white/10 text-white border-white/20 backdrop-blur-md">
                          <Sparkles className="size-3 mr-1.5" />
                          {badgeText}
                        </Badge>
                      </div>

                      {/* Headline */}
                      <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight mb-4 whitespace-pre-line bg-gradient-to-br from-white via-blue-50 to-blue-200 bg-clip-text text-transparent leading-[1.1]">
                        {slide.headline}
                      </h1>

                      {/* Subheadline */}
                      <p className="text-base lg:text-lg text-white/70 mb-8 leading-relaxed max-w-md">
                        {slide.subheadline}
                      </p>

                      {/* Search + Filters */}
                      <div className="flex gap-2.5 mb-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none z-10" />
                          <Input
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={e => onSearchChange(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && searchQuery.trim()) onSearchSubmit()
                            }}
                            className="pl-11 h-12 bg-white/95 text-foreground border-0 shadow-lg rounded-lg relative"
                          />
                        </div>
                        <Button
                          size="lg"
                          onClick={onFiltersOpen}
                          className="h-12 gap-2 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 text-white rounded-lg px-4 shadow-lg"
                        >
                          <SlidersHorizontal className="size-4" />
                          {filtersLabel}
                          {activeFilterCount > 0 && (
                            <Badge className="ml-0.5 bg-orange-500 text-white">{activeFilterCount}</Badge>
                          )}
                        </Button>
                      </div>

                      {/* Rihla AI CTA */}
                      <button
                        onClick={onAgentClick}
                        className="group w-full flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3 shadow-lg transition-all hover:shadow-xl mb-6"
                      >
                        <div className="size-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                          <Sparkles className="size-5 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-bold text-sm">{agentCtaTitle}</div>
                          <div className="text-xs text-white/70">{agentCtaDesc}</div>
                        </div>
                        <ArrowRight className={cn('size-4 text-white/70 group-hover:translate-x-1 transition-transform', isAr && 'rotate-180')} />
                      </button>

                      {/* Stats */}
                      <div className="grid grid-cols-4 gap-2">
                        {stats.map((stat, si) => (
                          <div key={si} className="bg-white/5 backdrop-blur-xl rounded-xl p-2.5 border border-white/10 text-center">
                            <div className="text-base lg:text-lg font-bold bg-gradient-to-br from-white to-blue-200 bg-clip-text text-transparent">
                              {stat.value}
                            </div>
                            <div className="text-[9px] lg:text-[10px] text-white/50 mt-0.5 uppercase tracking-wider">
                              {stat.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Image side */}
                  <div className={cn(
                    'flex-1 relative overflow-hidden bg-slate-800',
                    imageOnRight ? 'order-2' : 'order-1'
                  )}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.image}
                      alt={slide.imageAlt}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading={i === 0 ? 'eager' : 'lazy'}
                    />
                    {/* Gradient blend where image meets content */}
                    {imageOnRight ? (
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/30 to-transparent" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-l from-slate-950/30 to-transparent" />
                    )}
                  </div>
                </div>

                {/* ===== Mobile: stacked ===== */}
                <div className="md:hidden">
                  {/* Image */}
                  <div className="relative w-full" style={{ height: '300px' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={slide.image}
                      alt={slide.imageAlt}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading={i === 0 ? 'eager' : 'lazy'}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                  </div>

                  {/* Content */}
                  <div className={cn('bg-gradient-to-b p-6 pt-8', slide.accent)}>
                    <div className={cn('max-w-md mx-auto', isAr && 'text-right')} dir={isAr ? 'rtl' : 'ltr'}>
                      <div className="mb-3">
                        <Badge variant="secondary" className="bg-white/10 text-white border-white/20 backdrop-blur-md">
                          <Sparkles className="size-3 mr-1.5" />
                          {badgeText}
                        </Badge>
                      </div>
                      <h1 className="text-3xl font-bold tracking-tight mb-2 whitespace-pre-line bg-gradient-to-br from-white via-blue-50 to-blue-200 bg-clip-text text-transparent leading-[1.15]">
                        {slide.headline}
                      </h1>
                      <p className="text-sm text-white/70 mb-5 leading-relaxed">
                        {slide.subheadline}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ===== Navigation arrows (desktop) ===== */}
      <button
        onClick={prev}
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 size-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 transition-colors z-20"
        aria-label="Previous slide"
      >
        <ChevronLeft className={cn('size-5', isRtl && 'rotate-180')} />
      </button>
      <button
        onClick={next}
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 size-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 transition-colors z-20"
        aria-label="Next slide"
      >
        <ChevronRight className={cn('size-5', isRtl && 'rotate-180')} />
      </button>

      {/* ===== Dot indicators ===== */}
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
