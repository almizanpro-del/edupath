/**
 * Safe / Target / Reach categorization.
 *
 * PRD DIS-08: "Provide 'safe, target, reach' categorization based on
 * transparent rules."
 *
 * Algorithm:
 *   - SAFE: student's GPA is well above the program's minimum, AND
 *           tuition is well within budget (≤70% of budget)
 *   - TARGET: student's GPA meets requirements, AND tuition is within
 *             budget (≤100% of budget)
 *   - REACH: student's GPA is below typical admits, OR tuition exceeds
 *            budget, OR acceptance rate is very low (<20%)
 *
 * This is NOT a guarantee — it's a transparent heuristic. The UI shows
 * the rules used so students understand WHY a program is categorized
 * as safe/target/reach.
 *
 * If we don't have enough data (no GPA on file, no acceptance rate,
 * no budget), we return 'unknown' rather than guessing.
 */

export type AdmissionCategory = 'safe' | 'target' | 'reach' | 'unknown'

export type CategoryResult = {
  category: AdmissionCategory
  label: string
  labelAr: string
  color: string
  bgColor: string
  reason: string
  reasonAr: string
}

export type StudentProfile = {
  gpa?: number | null      // 0-5 scale
  budgetUsd?: number | null
  englishLevel?: string | null  // ielts_6, ielts_6.5, ielts_7, toefl_80, toefl_100
}

export type ProgramData = {
  tuitionUsd: number
  acceptanceRate?: number | null  // 0-100
  entryReqs?: string | null       // free text — we parse for GPA/IELTS mentions
}

/**
 * Categorize a program as safe/target/reach for a given student.
 */
export function categorizeProgram(
  student: StudentProfile,
  program: ProgramData
): CategoryResult {
  const reasons: string[] = []
  const reasonsAr: string[] = []

  // If we don't have student GPA or budget, we can't categorize
  if (!student.gpa && !student.budgetUsd) {
    return {
      category: 'unknown',
      label: 'Unknown',
      labelAr: 'غير معروف',
      color: 'text-slate-500',
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      reason: 'Complete your profile (GPA, budget) to see your admission category.',
      reasonAr: 'أكمل ملفك الشخصي (المعدل، الميزانية) لمعرفة فئة القبول.',
    }
  }

  let isReach = false
  let isSafe = true // starts true, gets downgraded

  // --- Budget check ---
  if (student.budgetUsd && student.budgetUsd > 0) {
    const ratio = program.tuitionUsd / student.budgetUsd
    if (ratio > 1.0) {
      isReach = true
      reasons.push(`Tuition ($${program.tuitionUsd}/yr) exceeds your budget ($${student.budgetUsd}/yr)`)
      reasonsAr.push(`الرسوم ($${program.tuitionUsd}/سنة) تتجاوز ميزانيتك ($${student.budgetUsd}/سنة)`)
    } else if (ratio > 0.7) {
      isSafe = false // target range
    }
    // ratio ≤ 0.7 stays safe
  }

  // --- GPA check (parse from entryReqs) ---
  if (student.gpa && program.entryReqs) {
    const reqGpaMatch = program.entryReqs.match(/(?:GPA|gpa)[:\s]+([0-9.]+)/)
    if (reqGpaMatch) {
      const reqGpa = parseFloat(reqGpaMatch[1])
      if (reqGpa > 0 && reqGpa <= 5) {
        const gpaRatio = student.gpa / reqGpa
        if (gpaRatio < 1.0) {
          isReach = true
          isSafe = false
          reasons.push(`Your GPA (${student.gpa}) is below the minimum (${reqGpa})`)
          reasonsAr.push(`معدلك (${student.gpa}) أقل من الحد الأدنى (${reqGpa})`)
        } else if (gpaRatio < 1.15) {
          isSafe = false // meets but not well above
        }
        // gpaRatio ≥ 1.15 stays safe
      }
    }
  }

  // --- Acceptance rate check ---
  if (program.acceptanceRate !== null && program.acceptanceRate !== undefined) {
    if (program.acceptanceRate < 20) {
      isReach = true
      isSafe = false
      reasons.push(`Low acceptance rate (${program.acceptanceRate}%)`)
      reasonsAr.push(`نسبة قبول منخفضة (${program.acceptanceRate}%)`)
    } else if (program.acceptanceRate < 40) {
      isSafe = false // competitive, not safe
    }
    // acceptanceRate ≥ 40 doesn't prevent safe
  }

  // --- Determine final category ---
  let category: AdmissionCategory
  if (isReach) {
    category = 'reach'
  } else if (isSafe && reasons.length === 0) {
    category = 'safe'
  } else {
    category = 'target'
  }

  const labels: Record<AdmissionCategory, { label: string; labelAr: string; color: string; bgColor: string }> = {
    safe: { label: 'Safe', labelAr: 'آمن', color: 'text-emerald-700', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700' },
    target: { label: 'Target', labelAr: 'هدف', color: 'text-blue-700', bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700' },
    reach: { label: 'Reach', labelAr: 'طموح', color: 'text-amber-700', bgColor: 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700' },
    unknown: { label: 'Unknown', labelAr: 'غير معروف', color: 'text-slate-500', bgColor: 'bg-slate-100 dark:bg-slate-800 border-slate-300' },
  }

  const meta = labels[category]
  const reason = reasons.length > 0 ? reasons.join('; ') : category === 'safe'
    ? 'Your profile exceeds the program requirements and budget.'
    : 'Your profile meets the program requirements.'
  const reasonAr = reasonsAr.length > 0 ? reasonsAr.join('؛ ') : category === 'safe'
    ? 'ملفك يتجاوز متطلبات البرنامج والميزانية.'
    : 'ملفك يلبي متطلبات البرنامج.'

  return {
    category,
    label: meta.label,
    labelAr: meta.labelAr,
    color: meta.color,
    bgColor: meta.bgColor,
    reason,
    reasonAr,
  }
}
