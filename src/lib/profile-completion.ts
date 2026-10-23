/**
 * Profile completion calculator.
 *
 * Returns a 0-100 score based on how much of the user's profile is
 * filled in, plus a list of "next steps" — the missing fields that
 * would most improve the score if completed.
 *
 * Used by:
 *   - /account page (profile completion progress bar)
 *   - /onboarding (step completion indicator)
 *   - Future: nag banners, Rihla personalization quality
 */

export type ProfileData = {
  name: string
  country: string
  fieldOfInterest: string | null
  educationLevel: string | null
  preferredCountries: string | null // JSON array
  budgetUsd: number | null
  gpa: number | null
  englishLevel: string | null
  scholarshipNeed: boolean
  intake: string | null
}

export type ProfileCompletion = {
  score: number // 0-100
  completedFields: number
  totalFields: number
  nextSteps: Array<{
    field: string
    label: string
    labelAr: string
    points: number // how much the score would increase
    action: string // URL or action to take
  }>
}

// Each field has a weight. The total of all weights = 100.
const FIELD_WEIGHTS: Array<{
  key: keyof ProfileData
  weight: number
  label: string
  labelAr: string
  action: string
  isFilled: (v: ProfileData[keyof ProfileData]) => boolean
}> = [
  { key: 'name', weight: 5, label: 'Full name', labelAr: 'الاسم الكامل', action: '/account', isFilled: v => !!v && String(v).trim().length > 0 },
  { key: 'country', weight: 10, label: 'Nationality', labelAr: 'الجنسية', action: '/account', isFilled: v => !!v && v !== 'Jordan' || (!!v && v === 'Jordan') }, // country always defaults but counts
  { key: 'fieldOfInterest', weight: 15, label: 'Field of interest', labelAr: 'مجال الاهتمام', action: '/onboarding', isFilled: v => !!v },
  { key: 'educationLevel', weight: 10, label: 'Education level', labelAr: 'المستوى التعليمي', action: '/onboarding', isFilled: v => !!v },
  { key: 'preferredCountries', weight: 15, label: 'Preferred destinations', labelAr: 'الوجهات المفضلة', action: '/onboarding', isFilled: v => !!v && v !== '[]' },
  { key: 'budgetUsd', weight: 15, label: 'Annual budget', labelAr: 'الميزانية السنوية', action: '/onboarding', isFilled: v => !!v && Number(v) > 0 },
  { key: 'gpa', weight: 10, label: 'GPA', labelAr: 'المعدل التراكمي', action: '/account', isFilled: v => !!v && Number(v) > 0 },
  { key: 'englishLevel', weight: 10, label: 'English proficiency', labelAr: 'مستوى الإنجليزية', action: '/account', isFilled: v => !!v && v !== 'none' },
  { key: 'intake', weight: 5, label: 'Intended intake', labelAr: 'الالتحاق المقصود', action: '/account', isFilled: v => !!v },
  { key: 'scholarshipNeed', weight: 5, label: 'Scholarship preference', labelAr: 'تفضيل المنحة', action: '/account', isFilled: v => v === true || v === false },
]

export function calculateProfileCompletion(profile: ProfileData): ProfileCompletion {
  let score = 0
  let completedFields = 0
  const nextSteps: ProfileCompletion['nextSteps'] = []

  for (const field of FIELD_WEIGHTS) {
    const value = profile[field.key]
    if (field.isFilled(value)) {
      score += field.weight
      completedFields++
    } else {
      nextSteps.push({
        field: field.key,
        label: field.label,
        labelAr: field.labelAr,
        points: field.weight,
        action: field.action,
      })
    }
  }

  // Sort next steps by weight (highest impact first)
  nextSteps.sort((a, b) => b.points - a.points)

  return {
    score: Math.min(100, score),
    completedFields,
    totalFields: FIELD_WEIGHTS.length,
    nextSteps: nextSteps.slice(0, 3), // top 3 most impactful
  }
}
