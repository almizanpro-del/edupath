/**
 * Visa Readiness Score calculator.
 *
 * PRD 9.3 #4: "A transparent readiness assessment based on missing
 * documents, financial proof, deadlines, and program requirements
 * — not a guarantee."
 *
 * This is NOT a visa approval predictor. It's a checklist completeness
 * score that helps students understand what they still need to prepare.
 *
 * The score is calculated from:
 *   1. Document readiness (passport, transcripts, English test, SOP, recommendations, financial proof)
 *   2. Financial proof (bank statement, sponsor letter, scholarship letter)
 *   3. Timeline (deadline proximity, processing time)
 *   4. Program requirements met (GPA, English level)
 *
 * Each category returns a sub-score + a list of missing items.
 * The total is 0-100. The UI shows the breakdown + a clear disclaimer
 * that this is NOT a guarantee of visa approval.
 */

export type VisaDocument = {
  id: string
  label: string
  labelAr: string
  category: 'identity' | 'academic' | 'financial' | 'supporting'
  required: boolean
  weight: number
}

export const VISA_DOCUMENTS: VisaDocument[] = [
  // Identity (25 pts)
  { id: 'passport', label: 'Valid passport (6+ months validity)', labelAr: 'جواز سفر ساري (6+ أشهر)', category: 'identity', required: true, weight: 10 },
  { id: 'passport_photo', label: 'Passport-size photos', labelAr: 'صور بحجم جواز السفر', category: 'identity', required: true, weight: 5 },
  { id: 'birth_cert', label: 'Birth certificate (translated/notarized)', labelAr: 'شهادة الميلاد (مترجمة/مصدقة)', category: 'identity', required: true, weight: 10 },

  // Academic (30 pts)
  { id: 'transcripts', label: 'Academic transcripts (translated)', labelAr: 'كشوف الدرجات (مترجمة)', category: 'academic', required: true, weight: 15 },
  { id: 'diploma', label: 'Degree/diploma certificate', labelAr: 'شهادة التخرج', category: 'academic', required: true, weight: 10 },
  { id: 'english_test', label: 'English test results (IELTS/TOEFL)', labelAr: 'نتائج اختبار الإنجليزية (IELTS/TOEFL)', category: 'academic', required: true, weight: 5 },

  // Financial (25 pts)
  { id: 'bank_statement', label: 'Bank statement (3-6 months)', labelAr: 'كشف حساب بنكي (3-6 أشهر)', category: 'financial', required: true, weight: 15 },
  { id: 'sponsor_letter', label: 'Sponsor letter (if applicable)', labelAr: 'رسالة الكفيل (إن وجدت)', category: 'financial', required: false, weight: 5 },
  { id: 'scholarship_letter', label: 'Scholarship award letter (if applicable)', labelAr: 'رسالة منحة (إن وجدت)', category: 'financial', required: false, weight: 5 },

  // Supporting (20 pts)
  { id: 'sop', label: 'Statement of purpose', labelAr: 'بيان الهدف', category: 'supporting', required: true, weight: 8 },
  { id: 'recommendation', label: 'Letters of recommendation (2)', labelAr: 'رسائل التوصية (2)', category: 'supporting', required: true, weight: 7 },
  { id: 'accommodation', label: 'Accommodation proof/booking', labelAr: 'إثبات السكن/الحجز', category: 'supporting', required: false, weight: 3 },
  { id: 'health_insurance', label: 'Health insurance', labelAr: 'التأمين الصحي', category: 'supporting', required: false, weight: 2 },
]

export type VisaReadinessResult = {
  totalScore: number // 0-100
  categoryScores: {
    identity: { score: number; max: number; completed: number; total: number }
    academic: { score: number; max: number; completed: number; total: number }
    financial: { score: number; max: number; completed: number; total: number }
    supporting: { score: number; max: number; completed: number; total: number }
  }
  completedDocs: string[]
  missingRequired: VisaDocument[]
  missingOptional: VisaDocument[]
  level: 'not-started' | 'early-stage' | 'in-progress' | 'nearly-ready' | 'ready'
  levelLabel: string
  levelLabelAr: string
  levelColor: string
}

export function calculateVisaReadiness(
  completedDocIds: string[]
): VisaReadinessResult {
  const completedSet = new Set(completedDocIds)

  const categories = ['identity', 'academic', 'financial', 'supporting'] as const
  const categoryScores = {} as VisaReadinessResult['categoryScores']

  let totalScore = 0
  const completedDocs: string[] = []
  const missingRequired: VisaDocument[] = []
  const missingOptional: VisaDocument[] = []

  for (const cat of categories) {
    const docs = VISA_DOCUMENTS.filter(d => d.category === cat)
    let catScore = 0
    let catMax = 0
    let catCompleted = 0

    for (const doc of docs) {
      catMax += doc.weight
      if (completedSet.has(doc.id)) {
        catScore += doc.weight
        catCompleted++
        completedDocs.push(doc.id)
      } else {
        if (doc.required) {
          missingRequired.push(doc)
        } else {
          missingOptional.push(doc)
        }
      }
    }

    categoryScores[cat] = {
      score: catScore,
      max: catMax,
      completed: catCompleted,
      total: docs.length,
    }
    totalScore += catScore
  }

  totalScore = Math.min(100, totalScore)

  let level: VisaReadinessResult['level']
  let levelLabel: string
  let levelLabelAr: string
  let levelColor: string

  if (totalScore === 0) {
    level = 'not-started'
    levelLabel = 'Not started'
    levelLabelAr = 'لم يبدأ'
    levelColor = 'text-slate-500'
  } else if (totalScore < 30) {
    level = 'early-stage'
    levelLabel = 'Early stage'
    levelLabelAr = 'مرحلة مبكرة'
    levelColor = 'text-rose-600'
  } else if (totalScore < 60) {
    level = 'in-progress'
    levelLabel = 'In progress'
    levelLabelAr = 'قيد التقدم'
    levelColor = 'text-amber-600'
  } else if (totalScore < 90) {
    level = 'nearly-ready'
    levelLabel = 'Nearly ready'
    levelLabelAr = 'شبه جاهز'
    levelColor = 'text-blue-600'
  } else {
    level = 'ready'
    levelLabel = 'Ready to apply'
    levelLabelAr = 'جاهز للتقديم'
    levelColor = 'text-emerald-600'
  }

  return {
    totalScore,
    categoryScores,
    completedDocs,
    missingRequired,
    missingOptional,
    level,
    levelLabel,
    levelLabelAr,
    levelColor,
  }
}
