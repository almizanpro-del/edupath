/**
 * Email service using Resend.
 * Sends transactional emails: review approved, lead created, deadline alerts.
 *
 * Setup: Set RESEND_API_KEY env var. Without it, emails are skipped (logged).
 * Get a free key at https://resend.com (3000 emails/month free).
 */
import { Resend } from 'resend'

let resendInstance: Resend | null = null

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  if (!resendInstance) resendInstance = new Resend(key)
  return resendInstance
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

// Configurable from env vars — defaults to Vercel preview URL for dev
const FROM_EMAIL = process.env.FROM_EMAIL || 'EduPath <noreply@edupath.cafepass.net>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://edupath.cafepass.net'

type EmailParams = {
  to: string
  subject: string
  html: string
}

async function sendEmail({ to, subject, html }: EmailParams): Promise<boolean> {
  const resend = getResend()
  if (!resend) {
    console.log(`[email] Skipped (not configured): ${subject} → ${to}`)
    return false
  }
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html })
    return true
  } catch (error) {
    console.error('[email] Send failed:', error)
    return false
  }
}

// ─── Email Templates ─────────────────────────────────────────────────────────

export async function sendWelcomeEmail(to: string, name: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Welcome to EduPath, ${name}! 🎓`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #2563eb, #1d4ed8); margin-bottom: 16px;"></div>
          <h1 style="color: #1d4ed8; margin: 0;">Welcome to EduPath, ${name}!</h1>
        </div>
        <p>You're now part of a community of MENA students finding their path to affordable global education.</p>
        <p>Here's what you can do next:</p>
        <ul style="line-height: 1.8; padding-left: 20px;">
          <li><strong>Find your match</strong> — Chat with Rihla, our AI advisor, to get personalized university recommendations.</li>
          <li><strong>Explore universities</strong> — Browse ${'129+'} universities across 14 countries with detailed cost, program, and scholarship info.</li>
          <li><strong>Match scholarships</strong> — Find scholarships you're eligible for based on GPA, field, and country.</li>
          <li><strong>Review your essays</strong> — Get AI feedback on your application essays before you submit.</li>
        </ul>
        <a href="${APP_URL}/agent" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Start with Rihla AI →</a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          Questions? Reply to this email or visit our <a href="${APP_URL}" style="color: #1d4ed8;">help center</a>.
        </p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">EduPath — Your path to affordable global education</p>
      </div>
    `,
  })
}

export async function sendReviewApprovedEmail(to: string, universityName: string): Promise<boolean> {
  return sendEmail({
    to,
    subject: `Your review of ${universityName} is now live on EduPath`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1d4ed8;">Your review is live! 🎉</h1>
        <p>Great news — your review of <strong>${universityName}</strong> has been approved and is now visible on EduPath.</p>
        <p>Other MENA students will benefit from your experience. Thank you for contributing to the community!</p>
        <a href="${APP_URL}/university/${universityName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">View Your Review</a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">EduPath — Your path to affordable global education</p>
      </div>
    `,
  })
}

export async function sendLeadNotificationEmail(to: string, lead: {
  studentName: string; studentEmail: string; country: string; gpa: number | null
  field: string | null; message: string; universityName: string
}): Promise<boolean> {
  return sendEmail({
    to,
    subject: `New student inquiry for ${lead.universityName} — ${lead.studentName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1d4ed8;">New Student Inquiry 📩</h1>
        <p>A student has expressed interest in <strong>${lead.universityName}</strong> via EduPath.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Name</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${lead.studentName}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Email</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${lead.studentEmail}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Country</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${lead.country}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">GPA</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${lead.gpa ?? 'Not specified'}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Field</td><td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${lead.field ?? 'Not specified'}</td></tr>
        </table>
        <p style="background: #f9fafb; padding: 12px; border-radius: 8px; border-left: 3px solid #1d4ed8;">${lead.message}</p>
        <p>Reply directly to the student at <a href="mailto:${lead.studentEmail}">${lead.studentEmail}</a></p>
        <a href="${APP_URL}/sponsor" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">View in Sponsor Dashboard</a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">EduPath — Your path to affordable global education</p>
      </div>
    `,
  })
}

export async function sendLeadReplyEmail(to: string, reply: {
  studentName: string; universityName: string; recruiterName: string; message: string
}): Promise<boolean> {
  return sendEmail({
    to,
    subject: `${reply.universityName} replied to your inquiry on EduPath`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1d4ed8;">Reply from ${reply.universityName} 💬</h1>
        <p>Hi ${reply.studentName},</p>
        <p><strong>${reply.recruiterName}</strong> from <strong>${reply.universityName}</strong> has replied to your inquiry on EduPath:</p>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 3px solid #1d4ed8; margin: 16px 0;">
          ${reply.message.split('\n').map((line: string) => `<p style="margin: 0 0 8px 0;">${line}</p>`).join('')}
        </div>
        <p>You can reply directly to ${reply.recruiterName} by responding to this email.</p>
        <a href="${APP_URL}" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">View on EduPath</a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">EduPath — Your path to affordable global education</p>
      </div>
    `,
  })
}

export async function sendDeadlineAlertEmail(to: string, alerts: Array<{
  universityName: string; deadline: string; programName: string
}>): Promise<boolean> {
  const alertRows = alerts.map(a => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>${a.universityName}</strong></td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${a.programName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${a.deadline}</td>
    </tr>
  `).join('')

  return sendEmail({
    to,
    subject: `⏰ Application deadlines approaching — ${alerts.length} program${alerts.length > 1 ? 's' : ''}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626;">⏰ Deadlines Approaching</h1>
        <p>The following application deadlines are coming up for universities you've saved:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr style="background: #f9fafb;">
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">University</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Program</th>
            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Deadline</th>
          </tr>
          ${alertRows}
        </table>
        <a href="${APP_URL}" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">View Your Saved Universities</a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">EduPath — Your path to affordable global education</p>
      </div>
    `,
  })
}

export async function sendFamilyInvitationEmail(to: string, invite: {
  studentName: string; inviteUrl: string
}): Promise<boolean> {
  return sendEmail({
    to,
    subject: `${invite.studentName} invited you to join their university journey on EduPath`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1d4ed8;">You're invited! 👨‍👩‍👧‍👦</h1>
        <p><strong>${invite.studentName}</strong> has invited you to join their university planning journey on EduPath.</p>
        <p>As a family member, you'll be able to see:</p>
        <ul style="line-height: 1.8; padding-left: 20px;">
          <li>Total costs (tuition, living, visa, insurance)</li>
          <li>Key application deadlines</li>
          <li>Safety and visa information</li>
          <li>University shortlist</li>
        </ul>
        <p>You'll have a simplified view focused on the information parents care about most — costs, deadlines, and safety.</p>
        <a href="${invite.inviteUrl}" style="display: inline-block; background: #1d4ed8; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Join the Family Room →</a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          If you didn't expect this invitation, you can safely ignore this email.
          EduPath — Your path to affordable global education
        </p>
      </div>
    `,
  })
}
