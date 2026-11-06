"""
Replaces the hero section in edupath-app.tsx with the new HeroSlider component.

The old hero spans from '{/* ===== Hero ===== */}' to the closing '</section>'
just before '{/* ===== Country Explorer ===== */}'.

We preserve the filters <Sheet> block (which is currently inline in the hero)
by moving it outside the HeroSlider, right after it.
"""
import re
from pathlib import Path

filepath = Path('src/components/edupath/edupath-app.tsx')
content = filepath.read_text(encoding='utf-8')

# Find the hero section boundaries
hero_start_marker = '      {/* ===== Hero ===== */}'
hero_end_marker = '      {/* ===== Country Explorer ===== */}'

start_idx = content.index(hero_start_marker)
end_idx = content.index(hero_end_marker)

# Extract the hero section
hero_section = content[start_idx:end_idx]

# Find the Sheet block within the hero section
# It starts with '<Sheet open={filtersOpen}' and ends with '</Sheet>'
sheet_start = hero_section.index('              <Sheet open={filtersOpen}')
sheet_end = hero_section.index('              </Sheet>') + len('              </Sheet>')
sheet_block = hero_section[sheet_start:sheet_end]

# Build the replacement: HeroSlider + Sheet (moved outside)
# The HeroSlider receives props from the parent component
replacement = '''      {/* ===== Hero Slider ===== */}
      <HeroSlider
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={() => track('search', { metadata: { query: searchQuery } })}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={(v) => { setFiltersOpen(v); if (!v) setCountrySearch('') }}
        activeFilterCount={activeFilterCount}
        onAgentClick={() => router.push('/agent')}
        agentCtaTitle={t('Agent.heroCta')}
        agentCtaDesc={t('Agent.heroCtaDesc')}
        stats={[
          { value: stats.totalUniversities, label: t('Hero.stats.universities') },
          { value: stats.totalCountries, label: t('Hero.stats.countries') },
          { value: stats.totalPrograms, label: t('Hero.stats.programs') },
          { value: formatUsdCompact(stats.cheapestTuition), label: t('Hero.stats.fromPerYear') },
        ]}
        searchPlaceholder={t('Hero.searchPlaceholder')}
        filtersLabel={t('Hero.filters')}
        badgeText={t('Hero.badge')}
        isRtl={locale === 'ar'}
      />

      {/* ===== Filters Sheet (moved out of hero) ===== */}
''' + sheet_block + '''

'''

# Replace the hero section
new_content = content[:start_idx] + replacement + content[end_idx:]

# Add the HeroSlider import at the top (after the last import)
import_marker = "import { CookieConsent } from '@/components/edupath/cookie-consent'"
if import_marker in new_content:
    new_content = new_content.replace(
        import_marker,
        import_marker + "\nimport { HeroSlider } from '@/components/edupath/hero-slider'",
    )
else:
    # Try to add it after the PostHogProvider import
    posthog_marker = "import { PostHogProvider } from '@/components/edupath/posthog-provider'"
    if posthog_marker in new_content:
        new_content = new_content.replace(
            posthog_marker,
            posthog_marker + "\nimport { HeroSlider } from '@/components/edupath/hero-slider'",
        )

filepath.write_text(new_content, encoding='utf-8')
print(f'Done. File size: {len(new_content)} bytes (was {len(content)})')
print(f'Hero section was {len(hero_section)} chars, replacement is {len(replacement)} chars')
