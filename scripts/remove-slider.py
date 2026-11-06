"""
Replace the hero slider + filters sheet with a simple static hero.
The filters sheet content is preserved but restructured to fit inside
the new hero section.
"""
import re

filepath = 'src/components/edupath/edupath-app.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Find boundaries
start_marker = '      {/* ===== Hero Slider ===== */}'
end_marker = '      {/* ===== Country Explorer ===== */}'

start_idx = content.index(start_marker)
end_idx = content.index(end_marker)

old_section = content[start_idx:end_idx]

# Extract the SheetContent block (the filters panel content)
# We'll keep this exactly as-is, just re-indent it
sc_match = re.search(r'(<SheetContent.*?</SheetContent>)', old_section, re.DOTALL)
if not sc_match:
    print("ERROR: Could not find SheetContent")
    exit(1)
sheet_content = sc_match.group(1)

# Build the new simple hero — no slider, no images, just clean text + search + stats
new_hero = '''      {/* ===== Hero (static — no slider) ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 text-white">
        <div className="container mx-auto max-w-7xl px-4 py-12 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            {/* Badge */}
            <div className="mb-5">
              <Badge variant="secondary" className="bg-white/10 text-white border-white/20 backdrop-blur-md">
                <Sparkles className="size-3 mr-1.5" />
                {t('Hero.badge')}
              </Badge>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5 bg-gradient-to-br from-white via-blue-50 to-blue-200 bg-clip-text text-transparent">
              {t('Hero.title')}
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-white/70 mb-10 leading-relaxed max-w-2xl mx-auto">
              {t('Hero.subtitle', { count: stats.totalCountries })}
            </p>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto mb-8">
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                <Input
                  placeholder={t('Hero.searchPlaceholder')}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      track('search', { metadata: { query: searchQuery } })
                    }
                  }}
                  className="pl-12 h-14 bg-white/95 dark:bg-slate-800/95 text-foreground border-0 shadow-2xl rounded-xl"
                />
              </div>
              <Sheet open={filtersOpen} onOpenChange={(v) => { setFiltersOpen(v); if (!v) setCountrySearch('') }}>
                <SheetTrigger asChild>
                  <Button size="lg" className="h-14 gap-2 shadow-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/15 text-white rounded-xl px-6">
                    <SlidersHorizontal className="size-5" />
                    {t('Hero.filters')}
                    {activeFilterCount > 0 && (
                      <Badge className="ml-1 bg-orange-500 text-white">{activeFilterCount}</Badge>
                    )}
                  </Button>
                </SheetTrigger>
                ''' + sheet_content + '''
              </Sheet>
            </div>

            {/* Rihla AI CTA */}
            <button
              onClick={() => router.push('/agent')}
              className="group w-full max-w-2xl mx-auto flex items-center gap-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 shadow-lg transition-all hover:shadow-xl mb-10"
            >
              <div className="size-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Sparkles className="size-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-bold text-lg">{t('Agent.heroCta')}</div>
                <div className="text-sm text-white/70">{t('Agent.heroCtaDesc')}</div>
              </div>
              <ArrowRight className={cn('size-5 text-white/70 group-hover:translate-x-1 transition-transform', locale === 'ar' && 'rotate-180')} />
            </button>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
              {[
                { value: stats.totalUniversities, label: t('Hero.stats.universities') },
                { value: stats.totalCountries, label: t('Hero.stats.countries') },
                { value: stats.totalPrograms, label: t('Hero.stats.programs') },
                { value: formatUsdCompact(stats.cheapestTuition), label: t('Hero.stats.fromPerYear') },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-white to-blue-200 bg-clip-text text-transparent">{stat.value}</div>
                  <div className="text-xs md:text-sm text-white/60 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

'''

new_content = content[:start_idx] + new_hero + content[end_idx:]

with open(filepath, 'w') as f:
    f.write(new_content)

print(f"Done. Replaced {len(old_section)} chars with {len(new_hero)} chars.")
