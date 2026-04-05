import { describe, it, expect } from 'vitest'
import {
  calcFoothillsPercent,
  getFirstName,
  getLevelLabel,
  getTripStatusLabel,
  getPackingPercent,
  pickLastActivity,
} from '@/lib/dashboard-data'

describe('calcFoothillsPercent', () => {
  it('returns 0 when both totals are 0', () => {
    expect(calcFoothillsPercent(0, 0, 0, 0)).toBe(0)
  })

  it('returns 60 when all KG studied and no knots', () => {
    expect(calcFoothillsPercent(10, 10, 0, 0)).toBe(60)
  })

  it('returns 40 when all knots mastered and no KG', () => {
    expect(calcFoothillsPercent(0, 0, 5, 5)).toBe(40)
  })

  it('returns 100 when both fully complete', () => {
    expect(calcFoothillsPercent(10, 10, 5, 5)).toBe(100)
  })

  it('rounds to integer', () => {
    // 7/10 * 60 + 3/5 * 40 = 42 + 24 = 66
    expect(calcFoothillsPercent(7, 10, 3, 5)).toBe(66)
  })
})

describe('getFirstName', () => {
  it('returns first word of display_name', () => {
    expect(getFirstName('Максим Вялков')).toBe('Максим')
  })

  it('returns the name if single word', () => {
    expect(getFirstName('Максим')).toBe('Максим')
  })

  it('returns null when display_name is null', () => {
    expect(getFirstName(null)).toBeNull()
  })

  it('returns null when display_name is empty string', () => {
    expect(getFirstName('')).toBeNull()
  })
})

describe('getLevelLabel', () => {
  it('maps beginner', () => {
    expect(getLevelLabel('beginner')).toBe('Новичок')
  })

  it('maps intermediate', () => {
    expect(getLevelLabel('intermediate')).toBe('Значкист')
  })

  it('maps advanced', () => {
    expect(getLevelLabel('advanced')).toBe('Разрядник')
  })

  it('returns empty string for null', () => {
    expect(getLevelLabel(null)).toBe('')
  })
})

describe('getTripStatusLabel', () => {
  it('maps planning', () => {
    expect(getTripStatusLabel('planning')).toBe('планирование')
  })

  it('maps packing', () => {
    expect(getTripStatusLabel('packing')).toBe('сборы')
  })

  it('maps active', () => {
    expect(getTripStatusLabel('active')).toBe('в пути')
  })

  it('returns the status as-is for unknown values', () => {
    expect(getTripStatusLabel('completed')).toBe('completed')
  })
})

describe('getPackingPercent', () => {
  it('returns 0 when total is 0', () => {
    expect(getPackingPercent(0, 0)).toBe(0)
  })

  it('returns 0 when nothing packed', () => {
    expect(getPackingPercent(0, 10)).toBe(0)
  })

  it('returns 100 when all packed', () => {
    expect(getPackingPercent(10, 10)).toBe(100)
  })

  it('rounds to integer', () => {
    expect(getPackingPercent(1, 3)).toBe(33)
  })
})

describe('pickLastActivity', () => {
  it('returns the activity with the most recent timestamp', () => {
    const activities = [
      { module: 'Граф знаний', href: '/knowledge', updatedAt: '2026-01-01T10:00:00Z', progressPercent: 34 },
      { module: 'Узлы', href: '/knots', updatedAt: '2026-03-01T10:00:00Z', progressPercent: 60 },
      { module: 'Тренировки', href: '/training', updatedAt: '2026-02-01T10:00:00Z', progressPercent: null },
    ]
    expect(pickLastActivity(activities)?.module).toBe('Узлы')
  })

  it('returns null when all timestamps are null', () => {
    const activities = [
      { module: 'Граф знаний', href: '/knowledge', updatedAt: null, progressPercent: 0 },
    ]
    expect(pickLastActivity(activities)).toBeNull()
  })

  it('skips null timestamps', () => {
    const activities = [
      { module: 'Граф знаний', href: '/knowledge', updatedAt: '2026-01-01T10:00:00Z', progressPercent: 34 },
      { module: 'Узлы', href: '/knots', updatedAt: null, progressPercent: null },
    ]
    expect(pickLastActivity(activities)?.module).toBe('Граф знаний')
  })
})
