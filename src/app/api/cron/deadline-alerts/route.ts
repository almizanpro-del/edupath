/**
 * GET /api/cron/deadline-alerts
 * Cron job: checks all programs with deadlines within 7 days,
 * finds users who saved the related universities, and sends email alerts.
 *
 * Set up as a Vercel Cron job (vercel.json) or external cron:
 *   0 9 * * * curl https://edupath-amber-three.vercel.app/api/cron/deadline-alerts
 *
 * Requires RESEND_API_KEY to actually send emails.
 */
import { NextResponse, NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { sendDeadlineAlertEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  // Simple auth: require a secret header to prevent abuse
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Find programs with deadlines in the next 7 days
    // Deadlines are stored as strings (e.g. "2026-07-15"), so we parse them
    const allPrograms = await db.program.findMany({
      where: { deadline: { not: null } },
      include: { university: true },
    })

    const upcomingDeadlines = allPrograms.filter(p => {
      if (!p.deadline) return false
      const deadlineDate = new Date(p.deadline)
      return deadlineDate >= now && deadlineDate <= sevenDaysFromNow
    })

    if (upcomingDeadlines.length === 0) {
      return NextResponse.json({ message: 'No upcoming deadlines', sent: 0 })
    }

    // Find all saved lists and group by user
    const savedLists = await db.savedList.findMany({
      include: { user: true },
    })

    let emailsSent = 0

    for (const list of savedLists) {
      const universityIds: string[] = JSON.parse(list.universities)
      if (universityIds.length === 0) continue

      // Find programs with deadlines for this user's saved universities
      const userDeadlines = upcomingDeadlines.filter(p =>
        universityIds.includes(p.universityId)
      )

      if (userDeadlines.length === 0) continue

      // Send email
      const alerts = userDeadlines.map(p => ({
        universityName: p.university.name,
        deadline: p.deadline!,
        programName: p.name,
      }))

      const sent = await sendDeadlineAlertEmail(list.user.email, alerts)
      if (sent) emailsSent++
    }

    return NextResponse.json({
      message: `Deadline alerts processed`,
      upcomingDeadlines: upcomingDeadlines.length,
      emailsSent,
    })
  } catch (error) {
    console.error('[cron/deadline-alerts] Error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
