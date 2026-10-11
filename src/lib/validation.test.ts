import { describe, it, expect } from 'vitest'
import { validateBody, leadSchema, reviewSchema, essayReviewSchema } from './validation'

describe('leadSchema', () => {
  it('validates a correct lead', () => {
    const result = validateBody(leadSchema, {
      universityId: 'uni-1',
      studentName: 'Ahmed',
      studentEmail: 'ahmed@example.com',
      message: 'I want to apply for computer science',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = validateBody(leadSchema, {
      universityId: 'uni-1',
      studentName: 'Ahmed',
      studentEmail: 'not-an-email',
      message: 'I want to apply for computer science',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short message', () => {
    const result = validateBody(leadSchema, {
      universityId: 'uni-1',
      studentName: 'Ahmed',
      studentEmail: 'ahmed@example.com',
      message: 'Hi',
    })
    expect(result.success).toBe(false)
  })
})

describe('reviewSchema', () => {
  it('validates a correct review', () => {
    const result = validateBody(reviewSchema, {
      universityId: 'uni-1',
      ratingOverall: 4,
      ratingAffordability: 5,
      ratingVisa: 3,
      ratingTeaching: 4,
      ratingSafety: 5,
      ratingSocial: 4,
      reviewText: 'Great university with affordable tuition and excellent professors.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects rating out of range', () => {
    const result = validateBody(reviewSchema, {
      universityId: 'uni-1',
      ratingOverall: 6,
      ratingAffordability: 5,
      ratingVisa: 3,
      ratingTeaching: 4,
      ratingSafety: 5,
      ratingSocial: 4,
      reviewText: 'Great university with affordable tuition and excellent professors.',
    })
    expect(result.success).toBe(false)
  })
})

describe('essayReviewSchema', () => {
  it('validates a correct essay review', () => {
    const result = validateBody(essayReviewSchema, {
      essayText: 'This is my application essay for computer science. I have always been passionate about technology and problem solving.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short essay', () => {
    const result = validateBody(essayReviewSchema, {
      essayText: 'Too short',
    })
    expect(result.success).toBe(false)
  })
})
