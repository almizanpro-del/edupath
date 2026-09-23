/**
 * Rihla (رِحلة) — AI-powered conversational university matching agent.
 *
 * Persona: a warm, encouraging university advisor for MENA students.
 * Speaks in the student's chosen language (Arabic or English).
 * Asks one question at a time, never pushy.
 */

export const RIHLA_SYSTEM_PROMPT = `You are "Rihla" (رِحلة), a friendly university advisor for students from the MENA region. Your goal is to help them find the perfect university program abroad.

RULES:
1. Detect the user's language from their first message. Respond in the SAME language (Arabic or English).
2. Ask ONE question at a time. Never dump multiple questions.
3. Be warm, encouraging, and concise. Use emojis sparingly (1 per message max).
4. Required fields to collect (in this order):
   - nationality (what country are they from?)
   - educationLevel (high school, bachelor's, master's?)
   - fieldOfInterest (what do they want to study?)
   - preferredCountries (which countries? allow "anywhere")
   - budgetUsd (annual budget in USD for tuition + living)
   - languagePref (language of instruction: English, Arabic, Turkish, Russian, etc.)
   - degreeLevel (Bachelor, Master, or PhD?)
   - careerGoal (what job/career after graduation?)
   - specialRequirements (halal food, prayer facilities, gender-segregated housing, family accommodation, etc.)
5. After collecting all fields, give a brief summary and ask for confirmation.
6. When the user confirms, output EXACTLY this format (no other text after it):
   \`\`\`json
   { "INTAKE_COMPLETE": true, "profile": { "nationality": "...", "educationLevel": "...", "fieldOfInterest": "...", "preferredCountries": ["..."], "budgetUsd": 12345, "languagePref": "...", "degreeLevel": "...", "careerGoal": "...", "specialRequirements": "..." } }
   \`\`\`
7. If the user writes in Arabic, ALL your responses must be in Arabic.
8. Never invent universities. Only reference what the search returns.
9. Keep each response under 3 sentences.

IMPORTANT: The preferredCountries field must always be a JSON array (e.g. ["Turkey", "Germany"]). If the user says "anywhere", use an empty array [].`

export type IntakeProfile = {
  nationality?: string
  educationLevel?: string
  fieldOfInterest?: string
  preferredCountries?: string[]
  budgetUsd?: number
  languagePref?: string
  degreeLevel?: string
  careerGoal?: string
  specialRequirements?: string
  language?: string
}

/**
 * Extract the intake profile from the LLM's response if it contains
 * the INTAKE_COMPLETE marker.
 */
export function parseIntakeComplete(reply: string): IntakeProfile | null {
  const jsonMatch = reply.match(/```json\s*\n([\s\S]*?)\n```/)
  if (!jsonMatch) return null

  try {
    const parsed = JSON.parse(jsonMatch[1])
    if (parsed.INTAKE_COMPLETE && parsed.profile) {
      return parsed.profile as IntakeProfile
    }
  } catch {
    // JSON parse failed — not a complete intake
  }
  return null
}

/**
 * Check if the LLM response signals intake completion.
 */
export function isIntakeComplete(reply: string): boolean {
  return reply.includes('INTAKE_COMPLETE') && reply.includes('```json')
}

/**
 * Build the LLM messages for the ZAI SDK.
 *
 * The ZAI SDK works best with a simple 2-message format:
 *   1. assistant message with the system prompt
 *   2. user message with the conversation history + new message
 *
 * We embed the conversation history into the user message rather than
 * sending a long array of back-and-forth messages, which can cause
 * API errors with some models.
 */
export function buildMessages(
  sessionMessages: Array<{ role: string; content: string }>,
  newMessage: string,
  language: string
): Array<{ role: 'assistant' | 'user'; content: string }> {
  const greeting =
    language === 'ar'
      ? 'مرحباً! أنا رِحلة، مستشارك الجامعي الذكي. سأساعدك في العثور على الجامعة المثالية لك. لتبدأ، ما هي جنسيتك؟'
      : "Hello! I'm Rihla, your AI university advisor. I'll help you find the perfect university. To start, what's your nationality?"

  // Build conversation history as a single text block
  let historyText = ''
  for (const m of sessionMessages) {
    if (m.role === 'user') {
      historyText += `Student: ${m.content}\n`
    } else if (m.role === 'assistant' && m.content !== greeting) {
      historyText += `Rihla: ${m.content}\n`
    }
  }

  // The user's new message
  historyText += `Student: ${newMessage}`

  return [
    { role: 'assistant', content: RIHLA_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Conversation so far:\n${historyText}\n\nRespond as Rihla. Remember: ask only ONE question at a time, respond in the student's language (${language === 'ar' ? 'Arabic' : 'English'}), and be encouraging.`,
    },
  ]
}
