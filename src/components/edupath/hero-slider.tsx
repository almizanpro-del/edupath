'use client'

/**
 * Hero slider — full-width auto-advancing carousel of campaign images.
 *
 * Features:
 *   - 5 campaign slides (Arabic + English variants)
 *   - Auto-advance every 6 seconds (pauses on hover)
 *   - Manual navigation: dot indicators + prev/next arrows
 *   - Responsive: shows wide images on desktop, mobile-optimized on small screens
 *   - Swipe support on touch devices (via Embla)
 *   - Progress bar at the bottom showing time until next slide
 *
 * Below the slider: the search bar + filters button + Rihla AI CTA +
 * stats grid (preserved from the old hero).
 */
import * as React from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Search, SlidersHorizontal, Sparkles, ArrowRight, ArrowLeft,
  ChevronLeft, ChevronRight, X, RotateCcw,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type Slide = {
  desktop: string
  mobile: string
  alt: string
}

const SLIDES: Slide[] = [
  {
    desktop: '/hero/slide-2-desktop.png',
    mobile: '/hero/slide-mobile-1.png',
    alt: 'Study abroad. Within reach. — EduPath',
  },
  {
    desktop: '/hero/slide-1-arabic.png',
    mobile: '/hero/slide-1-arabic.png',
    alt: 'مستقبلك أقرب مما تتخيل — EduPath',
  },
  {
    desktop: '/hero/slide-3-billboard.png',
    mobile: '/hero/slide-mobile-2.png',
    alt: 'Find your path to quality education — EduPath',
  },
  {
    desktop: '/hero/slide-4-medium.png',
    mobile: '/hero/slide-4-medium.png',
    alt: 'For MENA students — Compare tuition, scholarships & reviews — EduPath',
  },
  {
    desktop: '/hero/slide-5-square.png',
    mobile: '/hero/slide-5-square.png',
    alt: 'Compare smarter. Choose with confidence. — EduPath',
  },
]

const AUTO_ADVANCE_MS = 6000

type HeroSliderProps = {
  // Search props (passed through from parent)
  searchQuery: string
  onSearchChange: (v: string) => void
  onSearchSubmit: () => void
  // Filter props
  filtersOpen: boolean
  onFiltersOpenChange: (v: boolean) => void
  activeFilterCount: number
  // Rihla CTA
  onAgentClick: () => void
  agentCtaTitle: string
  agentCtaDesc: string
  // Stats
  stats: Array<{ value: string | number; label: string }>
  // i18n
  searchPlaceholder: string
  filtersLabel: string
  badgeText: string
  isRtl: boolean
}

export function HeroSlider({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  filtersOpen,
  onFiltersOpenChange,
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
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 30 })
  const [currentIndex, setCurrentIndex] = React.useState(0)
  const [isPaused, setIsPaused] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const progressRef = React.useRef<number | null>(null)

  // Sync current index
  const onSelect = React.useCallback(() => {
    if (!emblaApi) return
    setCurrentIndex(emblaApi.selectedScrollSnap())
    setProgress(0)
  }, [emblaApi])

  React.useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', onSelect)
    onSelect()
    return () => {
      emblaApi.off('select', onSelect)
    }
  }, [emblaApi, onSelect])

  // Auto-advance with progress bar
  React.useEffect(() => {
    if (!emblaApi || isPaused) return

    let start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const pct = Math.min(100, (elapsed / AUTO_ADVANCE_MS) * 100)
      setProgress(pct)

      if (pct >= 100) {
        emblaApi.scrollNext()
        start = Date.now()
        setProgress(0)
      }
    }

    progressRef.current = window.setInterval(tick, 50)
    return () => {
      if (progressRef.current) window.clearInterval(progressRef.current)
    }
  }, [emblaApi, isPaused, currentIndex])

  const scrollPrev = React.useCallback(() => {
    emblaApi?.scrollPrev()
  }, [emblaApi])

  const scrollNext = React.useCallback(() => {
    emblaApi?.scrollNext()
  }, [emblaApi])

  return (
    <section className="relative">
      {/* ===== Slider ===== */}
      <div
        className="relative overflow-hidden bg-slate-950"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex">
            {SLIDES.map((slide, i) => (
              <div key={i} className="flex-[0_0_100%] min-w-0 relative">
                {/* Desktop image */}
                <div className="hidden sm:block relative aspect-[21/9] md:aspect-[21/8]">
                  <img
                    src={slide.desktop}
                    alt={slide.alt}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchPriority={i === 0 ? 'high' : 'auto'}
                  />
                </div>
                {/* Mobile image */}
                <div className="sm:hidden relative aspect-[4/5]">
                  <img
                    src={slide.mobile}
                    alt={slide.alt}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    fetchPriority={i === 0 ? 'high' : 'auto'}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gradient overlay for readability of controls */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/20 pointer-events-none" />

        {/* Prev / Next arrows (desktop) */}
        <button
          onClick={scrollPrev}
          className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 size-11 items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 transition-colors z-10"
          aria-label="Previous slide"
        >
          <ChevronLeft className={cn('size-5', isRtl && 'rotate-180')} />
        </button>
        <button
          onClick={scrollNext}
          className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 size-11 items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white hover:bg-white/25 transition-colors z-10"
          aria-label="Next slide"
        >
          <ChevronRight className={cn('size-5', isRtl && 'rotate-180')} />
        </button>

        {/* Dot indicators + progress bar */}
        <div className="absolute bottom-0 inset-x-0 z-10">
          <div className="flex items-center justify-center gap-2 pb-4 pt-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === currentIndex
                    ? 'w-8 bg-white'
                    : 'w-1.5 bg-white/40 hover:bg-white/60'
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          {/* Progress bar */}
          <div className="h-0.5 bg-white/10">
            <div
              className="h-full bg-orange-500 transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* ===== Search + Filters + CTA + Stats (below slider) ===== */}
      <div className="relative bg-gradient-to-b from-slate-950 to-blue-950 text-white">
        <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
          {/* Badge */}
          <div className="text-center mb-6">
            <Badge variant="secondary" className="bg-white/10 text-white border-white/20 backdrop-blur-md hover:bg-white/15 transition-colors">
              <Sparkles className="size-3 mr-1" />
              {badgeText}
            </Badge>
          </div>

          {/* Search bar + Filters */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-6">
            <div className="relative flex-1 group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-blue-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300" />
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      onSearchSubmit()
                    }
                  }}
                  className="pl-12 h-14 bg-white/95 dark:bg-slate-800/95 text-foreground border-0 shadow-2xl rounded-xl backdrop-blur-md"
                />
              </div>
            </div>
            <Button
              size="lg"
              onClick={() => onFiltersOpenChange(true)}
              className="h-14 gap-2 shadow-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 text-white rounded-xl px-6"
            >
              <SlidersHorizontal className="size-5" />
              {filtersLabel}
              {activeFilterCount > 0 && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <Badge className="ml-1 bg-orange-500 text-white">{activeFilterCount}</Badge>
                </motion.div>
              )}
            </Button>
          </div>

          {/* Rihla AI Agent CTA */}
          <div className="max-w-2xl mx-auto mb-8">
            <button
              onClick={onAgentClick}
              className="group w-full flex items-center gap-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 shadow-lg transition-all hover:shadow-xl"
            >
              <div className="size-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Sparkles className="size-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-lg">{agentCtaTitle}</div>
                <div className="text-sm text-white/70">{agentCtaDesc}</div>
              </div>
              <ArrowRight className={cn('size-5 text-white/70 group-hover:translate-x-1 transition-transform', isRtl && 'rotate-180')} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10 hover:border-blue-400/30 transition-colors text-center"
              >
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-white to-blue-200 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm text-white/60 mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
