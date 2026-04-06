// src/__tests__/marketplace-data.test.ts
import { describe, it, expect } from 'vitest'
import {
  gearCategoryToMarketplace,
  getCategoryEmoji,
  transactionTypeLabel,
  marketplaceConditionLabel,
  userGearConditionToMarketplace,
  formatPrice,
  getConditionSeasons,
} from '@/lib/marketplace-data'

describe('gearCategoryToMarketplace', () => {
  it('maps hardware to Железо', () => {
    expect(gearCategoryToMarketplace('hardware')).toBe('Железо (закладки, якоря, крюки)')
  })
  it('maps ropes to Верёвки', () => {
    expect(gearCategoryToMarketplace('ropes')).toBe('Верёвки и оттяжки')
  })
  it('maps clothing to Одежда', () => {
    expect(gearCategoryToMarketplace('clothing')).toBe('Одежда (верхняя)')
  })
  it('maps footwear to Обувь', () => {
    expect(gearCategoryToMarketplace('footwear')).toBe('Обувь')
  })
  it('maps bivouac to Палатки', () => {
    expect(gearCategoryToMarketplace('bivouac')).toBe('Палатки и бивак')
  })
  it('maps electronics to Разное', () => {
    expect(gearCategoryToMarketplace('electronics')).toBe('Разное')
  })
  it('maps other to Разное', () => {
    expect(gearCategoryToMarketplace('other')).toBe('Разное')
  })
  it('maps unknown to Разное', () => {
    expect(gearCategoryToMarketplace('unknown')).toBe('Разное')
  })
})

describe('getCategoryEmoji', () => {
  it('returns emoji for страховочные', () => {
    expect(getCategoryEmoji('Страховочные системы')).toBe('🧗')
  })
  it('returns emoji for верёвки', () => {
    expect(getCategoryEmoji('Верёвки и оттяжки')).toBe('🪢')
  })
  it('returns 📦 for unknown category', () => {
    expect(getCategoryEmoji('something unknown')).toBe('📦')
  })
})

describe('transactionTypeLabel', () => {
  it('sell → Продам', () => {
    expect(transactionTypeLabel('sell')).toBe('Продам')
  })
  it('swap → Обмен', () => {
    expect(transactionTypeLabel('swap')).toBe('Обмен')
  })
  it('free → Отдам', () => {
    expect(transactionTypeLabel('free')).toBe('Отдам')
  })
})

describe('marketplaceConditionLabel', () => {
  it('maps Новое', () => {
    expect(marketplaceConditionLabel('Новое (не использовалось)')).toBe('Новое')
  })
  it('returns the string unchanged if short', () => {
    expect(marketplaceConditionLabel('Хорошее')).toBe('Хорошее')
  })
})

describe('userGearConditionToMarketplace', () => {
  it('new → Новое (не использовалось)', () => {
    expect(userGearConditionToMarketplace('new')).toBe('Новое (не использовалось)')
  })
  it('good → Хорошее (2–3 сезона)', () => {
    expect(userGearConditionToMarketplace('good')).toBe('Хорошее (2–3 сезона)')
  })
  it('worn → Удовлетворительное', () => {
    expect(userGearConditionToMarketplace('worn')).toBe('Удовлетворительное (видны следы использования)')
  })
  it('needs_repair → Удовлетворительное', () => {
    expect(userGearConditionToMarketplace('needs_repair')).toBe('Удовлетворительное (видны следы использования)')
  })
})

describe('formatPrice', () => {
  it('formats sell price', () => {
    expect(formatPrice('sell', 3500)).toBe('3 500 ₽')
  })
  it('returns обмен for swap', () => {
    expect(formatPrice('swap', null)).toBe('обмен')
  })
  it('returns бесплатно for free', () => {
    expect(formatPrice('free', null)).toBe('бесплатно')
  })
  it('returns 0 ₽ if sell with null price', () => {
    // Note: (0).toLocaleString('ru-RU') returns '0' on Node.js — result is '0 ₽'
    expect(formatPrice('sell', null)).toBe('0 ₽')
  })
})

describe('getConditionSeasons', () => {
  it('extracts seasons from Отличное (1 сезон)', () => {
    expect(getConditionSeasons('Отличное (1 сезон)')).toBe('1 сезон')
  })
  it('extracts seasons from Хорошее (2–3 сезона)', () => {
    expect(getConditionSeasons('Хорошее (2–3 сезона)')).toBe('2–3 сезона')
  })
  it('returns null for Новое (не использовалось)', () => {
    expect(getConditionSeasons('Новое (не использовалось)')).toBe(null)
  })
  it('returns null for Удовлетворительное', () => {
    expect(getConditionSeasons('Удовлетворительное (видны следы использования)')).toBe(null)
  })
})
