// src/components/forum/__tests__/forum-types.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { categoryLabel, typeLabel, formatRelativeTime, isValidCategory } from '../forum-types'

describe('categoryLabel', () => {
  it('returns Russian label for each category', () => {
    expect(categoryLabel('routes')).toBe('Маршруты')
    expect(categoryLabel('gear')).toBe('Снаряжение')
    expect(categoryLabel('learning')).toBe('Обучение')
  })
})

describe('typeLabel', () => {
  it('returns Тред for thread', () => {
    expect(typeLabel('thread')).toBe('Тред')
  })
  it('returns Отчёт for report', () => {
    expect(typeLabel('report')).toBe('Отчёт')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
  })

  it('returns только что for < 60 seconds ago', () => {
    const ts = new Date('2026-01-01T11:59:30Z').toISOString()
    expect(formatRelativeTime(ts)).toBe('только что')
  })

  it('returns minutes for < 1 hour', () => {
    const ts = new Date('2026-01-01T11:45:00Z').toISOString()
    expect(formatRelativeTime(ts)).toBe('15 мин назад')
  })

  it('returns hours for < 1 day', () => {
    const ts = new Date('2026-01-01T09:00:00Z').toISOString()
    expect(formatRelativeTime(ts)).toBe('3 ч назад')
  })

  it('returns days for < 30 days', () => {
    const ts = new Date('2025-12-29T12:00:00Z').toISOString()
    expect(formatRelativeTime(ts)).toBe('3 дн назад')
  })

  it('returns formatted date for > 30 days', () => {
    const ts = new Date('2025-11-01T12:00:00Z').toISOString()
    const result = formatRelativeTime(ts)
    expect(result).toMatch(/1 ноября|ноябрь/)
  })
})

describe('isValidCategory', () => {
  it('returns true for valid categories', () => {
    expect(isValidCategory('routes')).toBe(true)
    expect(isValidCategory('gear')).toBe(true)
    expect(isValidCategory('learning')).toBe(true)
  })

  it('returns false for invalid strings', () => {
    expect(isValidCategory('forum')).toBe(false)
    expect(isValidCategory('')).toBe(false)
    expect(isValidCategory('Routes')).toBe(false)
  })
})
