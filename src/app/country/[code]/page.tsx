/**
 * /country/[code]
 *
 * Programmatic SEO landing page for each destination country.
 * Shows: hero with flag + stats, list of universities, scholarships,
 * and quick links to filtered views.
 *
 * Generates one page per country in the database (or static JSON).
 * These pages target long-tail searches like "study in Turkey for
 * international students" and "universities in Germany for MENA
 * students".
 */
import { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import staticUniversities from '@/data/static-universities.json'
import { ChevronLeft, Globe, GraduationCap, Wallet, Award, MapPin, ArrowRight } from 'lucide-react'
import { formatUsd } from '@/lib/edupath'
import Image from 'next/image'

// Pre-render the most common country pages at build time
export const dynamicParams = true

type CountryStats = {
  code: string
  name: string
  flag: string
  universityCount: number
  programCount: number
  scholarshipCount: number
  avgTuitionUsd: number
  avgLivingCostUsd: number
  cheapestTuitionUsd: number
  cities: string[]
}

const COUNTRY_NAMES: Record<string, string> = {
  Turkey: 'Turkey', Germany: 'Germany', 'United Kingdom': 'United Kingdom',
  Poland: 'Poland', 'United Arab Emirates': 'United Arab Emirates',
  Egypt: 'Egypt', Malaysia: 'Malaysia', Jordan: 'Jordan',
  Lebanon: 'Lebanon', Russia: 'Russia', Georgia: 'Georgia',
  Lithuania: 'Lithuania', Uzbekistan: 'Uzbekistan', Kazakhstan: 'Kazakhstan',
}

function getCountryFlag(countryName: string): string {
  const codeMap: Record<string, string> = {
    Turkey: 'tr', Germany: 'de', 'United Kingdom': 'gb', Poland: 'pl',
    'United Arab Emirates': 'ae', Egypt: 'eg', Malaysia: 'my', Jordan: 'jo',
    Lebanon: 'lb', Russia: 'ru', Georgia: 'ge', Lithuania: 'lt',
    Uzbekistan: 'uz', Kazakhstan: 'kz',
  }
  const code = codeMap[countryName] || 'xx'
  return `https://flagcdn.com/w320/${code}.png`
}

function computeStats(countryName: string): CountryStats | null {
  const unis = (staticUniversities as Array<{
    id: string; name: string; slug: string; country: string; city: string
    tuitionUsd: number; livingCostUsd: number; programs: unknown[]
    scholarships: unknown[]
  }>).filter(u => u.country === countryName)

  if (unis.length === 0) return null

  const programCount = unis.reduce((s, u) => s + u.programs.length, 0)
  const scholarshipCount = unis.reduce((s, u) => s + u.scholarships.length, 0)
  const avgTuitionUsd = Math.round(unis.reduce((s, u) => s + u.tuitionUsd, 0) / unis.length)
  const avgLivingCostUsd = Math.round(unis.reduce((s, u) => s + u.livingCostUsd, 0) / unis.length)
  const cheapestTuitionUsd = Math.min(...unis.map(u => u.tuitionUsd))
  const cities = [...new Set(unis.map(u => u.city))].sort()

  return {
    code: countryName.toLowerCase().replace(/\s+/g, '-'),
    name: countryName,
    flag: getCountryFlag(countryName),
    universityCount: unis.length,
    programCount,
    scholarshipCount,
    avgTuitionUsd,
    avgLivingCostUsd,
    cheapestTuitionUsd,
    cities,
  }
}

// Generate static params for all countries
export function generateStaticParams() {
  const countries = [...new Set((staticUniversities as Array<{ country: string }>).map(u => u.country))]
  return countries.map(c => ({ code: c.toLowerCase().replace(/\s+/g, '-') }))
}

type Props = { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const countryName = Object.keys(COUNTRY_NAMES).find(
    c => c.toLowerCase().replace(/\s+/g, '-') === code
  )
  if (!countryName) return { title: 'Country not found' }

  const stats = computeStats(countryName)
  if (!stats) return { title: 'Country not found' }

  return {
    title: `Study in ${countryName} — ${stats.universityCount} universities for international students`,
    description: `Explore ${stats.universityCount} universities in ${countryName} with ${stats.programCount} programs and ${stats.scholarshipCount} scholarships. Average tuition: $${stats.avgTuitionUsd}/year. Cheapest from $${stats.cheapestTuitionUsd}/year.`,
    alternates: { canonical: `/country/${code}` },
    openGraph: {
      title: `Study in ${countryName} — EduPath`,
      description: `${stats.universityCount} universities, ${stats.programCount} programs, ${stats.scholarshipCount} scholarships for MENA students.`,
      images: [{ url: stats.flag }],
    },
  }
}

export default async function CountryPage({ params }: Props) {
  const { code } = await params
  const countryName = Object.keys(COUNTRY_NAMES).find(
    c => c.toLowerCase().replace(/\s+/g, '-') === code
  )

  if (!countryName) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">Country not found</h1>
        <Link href="/" className="text-blue-600 hover:underline">← Back to EduPath</Link>
      </div>
    )
  }

  const stats = computeStats(countryName)
  if (!stats) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-2">No universities found for {countryName}</h1>
        <Link href="/" className="text-blue-600 hover:underline">← Back to EduPath</Link>
      </div>
    )
  }

  // Get the actual universities for this country (from DB if available, else static)
  let universities: Array<{
    id: string; name: string; slug: string; city: string
    tuitionUsd: number; livingCostUsd: number; intlStudentPct: number
    descriptionEn: string | null
  }> = []
  try {
    universities = await db.university.findMany({
      where: { country: countryName, pendingReview: false },
      select: {
        id: true, name: true, slug: true, city: true,
        tuitionUsd: true, livingCostUsd: true, intlStudentPct: true,
        descriptionEn: true,
      },
      orderBy: { tuitionUsd: 'asc' },
    })
  } catch {
    // DB unavailable — use static data
    universities = (staticUniversities as Array<{
      id: string; name: string; slug: string; country: string; city: string
      tuitionUsd: number; livingCostUsd: number; intlStudentPct: number
      descriptionEn: string | null
    }>)
      .filter(u => u.country === countryName)
      .sort((a, b) => a.tuitionUsd - b.tuitionUsd)
      .map(u => ({
        id: u.id, name: u.name, slug: u.slug, city: u.city,
        tuitionUsd: u.tuitionUsd, livingCostUsd: u.livingCostUsd,
        intlStudentPct: u.intlStudentPct, descriptionEn: u.descriptionEn,
      }))
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 text-white py-16">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url(${stats.flag})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
        <div className="relative container mx-auto max-w-5xl px-4">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-blue-200 hover:text-white mb-6">
            <ChevronLeft className="size-4" /> Back to EduPath
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <Image
              src={stats.flag}
              alt={`${countryName} flag`}
              width={80}
              height={56}
              className="rounded-lg shadow-xl"
              unoptimized
            />
            <div>
              <h1 className="text-4xl md:text-5xl font-bold">Study in {countryName}</h1>
              <p className="text-blue-200 mt-1">
                {stats.universityCount} universities · {stats.programCount} programs · {stats.scholarshipCount} scholarships
              </p>
            </div>
          </div>
          <p className="text-lg text-blue-100 max-w-2xl leading-relaxed">
            Explore affordable universities in {countryName} for international students from the MENA region.
            Compare tuition, living costs, programs, and scholarships — all in one place.
          </p>
        </div>
      </section>

      {/* Stats grid */}
      <section className="container mx-auto max-w-5xl px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<GraduationCap className="size-5 text-blue-600" />} label="Universities" value={stats.universityCount.toString()} />
          <StatCard icon={<Wallet className="size-5 text-emerald-600" />} label="Avg tuition / year" value={formatUsd(stats.avgTuitionUsd)} />
          <StatCard icon={<Wallet className="size-5 text-amber-600" />} label="Avg living cost" value={formatUsd(stats.avgLivingCostUsd)} />
          <StatCard icon={<Award className="size-5 text-orange-600" />} label="Scholarships" value={stats.scholarshipCount.toString()} />
        </div>
      </section>

      {/* Universities list */}
      <section className="container mx-auto max-w-5xl px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Universities in {countryName}</h2>
          <span className="text-sm text-muted-foreground">
            Cheapest from <strong className="text-foreground">{formatUsd(stats.cheapestTuitionUsd)}</strong>/year
          </span>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {universities.map(u => (
            <Link
              key={u.id}
              href={`/university/${u.slug}`}
              className="group border rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold group-hover:text-blue-600 transition-colors">{u.name}</h3>
                <ArrowRight className="size-4 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0" />
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {u.city}
                </span>
                <span>·</span>
                <span>{u.intlStudentPct}% international</span>
              </div>
              {u.descriptionEn && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{u.descriptionEn}</p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Tuition</span>
                  <span className="font-semibold text-blue-600">{formatUsd(u.tuitionUsd)}/yr</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Living</span>
                  <span className="font-semibold">{formatUsd(u.livingCostUsd)}/yr</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-50 dark:bg-slate-900 border-t">
        <div className="container mx-auto max-w-5xl px-4 py-10 text-center">
          <h2 className="text-2xl font-bold mb-2">Not sure which university is right for you?</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Chat with Rihla, our AI advisor, to get personalized recommendations based on your budget, field, and preferences.
          </p>
          <Link
            href="/agent"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            <Globe className="size-4" /> Talk to Rihla AI
          </Link>
        </div>
      </section>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border rounded-xl p-4 bg-white dark:bg-slate-900">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  )
}
