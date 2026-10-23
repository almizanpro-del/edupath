/**
 * POST /api/saved-lists/share
 *
 * Generates (or returns existing) a share token for the user's saved
 * list. The token is a random cuid that can be used to access a
 * public, read-only view at /list/[token].
 *
 * Body: { } (no params needed — uses the authenticated user's list)
 * Returns: { shareToken: string, shareUrl: string }
 */
import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { requireSameOrigin } from '@/lib/csrf'

export async function POST(req: NextRequest) {
  const csrfError = requireSameOrigin(req)
  if (csrfError) return csrfError

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const profile = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: { id: true },
    })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Find the user's saved list (each user has one default list)
    let savedList = await db.savedList.findFirst({
      where: { userId: profile.id },
    })

    if (!savedList) {
      // Create an empty list if none exists
      savedList = await db.savedList.create({
        data: {
          userId: profile.id,
          listName: 'My Universities',
          universities: '[]',
        },
      })
    }

    // Generate a share token if none exists
    if (!savedList.shareToken) {
      const token = `share_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
      savedList = await db.savedList.update({
        where: { id: savedList.id },
        data: { shareToken: token, isPublic: true },
      })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edupath-amber-three.vercel.app'
    return NextResponse.json({
      shareToken: savedList.shareToken,
      shareUrl: `${baseUrl}/list/${savedList.shareToken}`,
    })
  } catch (error) {
    console.error('[api/saved-lists/share] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate share link' },
      { status: 500 }
    )
  }
}
