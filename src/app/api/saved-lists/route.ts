/**
 * Saved lists API.
 * GET    /api/saved-lists          — list current user's saved universities
 * POST   /api/saved-lists          — toggle save/unsave a university
 *   body: { universityId: string }
 *
 * Returns graceful errors when DB is unavailable (Vercel without Postgres).
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

async function getOrCreateProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  let profile = await db.user.findUnique({
    where: { supabaseId: user.id },
  })
  if (!profile) {
    profile = await db.user.create({
      data: {
        supabaseId: user.id,
        email: user.email ?? '',
        name:
          (user.user_metadata?.full_name as string) ??
          (user.email?.split('@')[0] ?? 'Student'),
        country: (user.user_metadata?.country as string) ?? 'Jordan',
      },
    })
  }
  return profile
}

// Get current user's saved universities
export async function GET() {
  try {
    const profile = await getOrCreateProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    let list = await db.savedList.findFirst({
      where: { userId: profile.id, listName: 'My Saved Universities' },
    })

    if (!list) {
      list = await db.savedList.create({
        data: {
          userId: profile.id,
          listName: 'My Saved Universities',
          universities: '[]',
        },
      })
    }

    const universityIds: string[] = JSON.parse(list.universities)
    const universities = universityIds.length > 0
      ? await db.university.findMany({
          where: { id: { in: universityIds } },
          select: {
            id: true,
            name: true,
            slug: true,
            country: true,
            city: true,
            tuitionUsd: true,
            livingCostUsd: true,
          },
        })
      : []

    return NextResponse.json({ universities })
  } catch (error) {
    // DB unavailable
    console.warn('[api/saved-lists GET] Error:', error)
    return NextResponse.json({ universities: [], dbAvailable: false })
  }
}

// Toggle save/unsave a university
export async function POST(req: NextRequest) {
  try {
    const profile = await getOrCreateProfile()
    if (!profile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await req.json()
    const { universityId } = body
    if (!universityId || typeof universityId !== 'string') {
      return NextResponse.json({ error: 'universityId required' }, { status: 400 })
    }

    const uni = await db.university.findUnique({ where: { id: universityId } })
    if (!uni) {
      return NextResponse.json({ error: 'University not found' }, { status: 404 })
    }

    let list = await db.savedList.findFirst({
      where: { userId: profile.id, listName: 'My Saved Universities' },
    })
    if (!list) {
      list = await db.savedList.create({
        data: {
          userId: profile.id,
          listName: 'My Saved Universities',
          universities: '[]',
        },
      })
    }

    const current: string[] = JSON.parse(list.universities)
    let next: string[]
    let action: 'saved' | 'removed'
    if (current.includes(universityId)) {
      next = current.filter(id => id !== universityId)
      action = 'removed'
    } else {
      next = [...current, universityId]
      action = 'saved'
    }

    await db.savedList.update({
      where: { id: list.id },
      data: { universities: JSON.stringify(next) },
    })

    return NextResponse.json({ action, savedCount: next.length })
  } catch (error) {
    // DB unavailable
    console.warn('[api/saved-lists POST] Error:', error)
    return NextResponse.json(
      { error: 'Saved lists require a database connection. This feature is unavailable in demo mode.' },
      { status: 503 }
    )
  }
}
