// src/lib/marketplace-data.ts

export const MARKETPLACE_CATEGORIES = [
  'Страховочные системы',
  'Верёвки и оттяжки',
  'Ледовый инструмент',
  'Каски',
  'Обувь',
  'Одежда (верхняя)',
  'Рюкзаки',
  'Палатки и бивак',
  'Железо (закладки, якоря, крюки)',
  'Разное',
] as const

export const MARKETPLACE_CONDITIONS = [
  'Новое (не использовалось)',
  'Отличное (1 сезон)',
  'Хорошее (2–3 сезона)',
  'Удовлетворительное (видны следы использования)',
] as const

// Maps gear catalog category → marketplace listing category.
// gear.category values: clothing | footwear | hardware | ropes | bivouac | electronics | other
export function gearCategoryToMarketplace(gearCategory: string): string {
  const map: Record<string, string> = {
    hardware: 'Железо (закладки, якоря, крюки)',
    ropes: 'Верёвки и оттяжки',
    clothing: 'Одежда (верхняя)',
    footwear: 'Обувь',
    bivouac: 'Палатки и бивак',
  }
  return map[gearCategory] ?? 'Разное'
}

// Returns emoji for display in card thumbnail when no photo uploaded
export function getCategoryEmoji(category: string): string {
  const map: Record<string, string> = {
    'Страховочные системы': '🧗',
    'Верёвки и оттяжки': '🪢',
    'Ледовый инструмент': '⛏️',
    'Каски': '⛑️',
    'Обувь': '🥾',
    'Одежда (верхняя)': '🧥',
    'Рюкзаки': '🎒',
    'Палатки и бивак': '⛺',
    'Железо (закладки, якоря, крюки)': '🔩',
    'Разное': '📦',
  }
  return map[category] ?? '📦'
}

export function transactionTypeLabel(type: string): string {
  if (type === 'sell') return 'Продам'
  if (type === 'swap') return 'Обмен'
  if (type === 'free') return 'Отдам'
  return type
}

// Shortens full condition string to first word for compact display
export function marketplaceConditionLabel(condition: string): string {
  return condition.split(' (')[0]
}

// Maps user_gear.condition to marketplace listing condition
export function userGearConditionToMarketplace(condition: string): string {
  const map: Record<string, string> = {
    new: 'Новое (не использовалось)',
    good: 'Хорошее (2–3 сезона)',
    worn: 'Удовлетворительное (видны следы использования)',
    needs_repair: 'Удовлетворительное (видны следы использования)',
  }
  return map[condition] ?? 'Хорошее (2–3 сезона)'
}

export function formatPrice(transactionType: string, price: number | null): string {
  if (transactionType === 'swap') return 'обмен'
  if (transactionType === 'free') return 'бесплатно'
  const amount = price ?? 0
  // Replace non-breaking space with regular space for consistent test output
  const formatted = amount.toLocaleString('ru-RU').replace(/\u00A0/g, ' ')
  return `${formatted} ₽`
}

// Extracts the season count from the condition string for the "seasons of use" meta chip.
// Returns null for conditions without a parseable season count (Новое, Удовлетворительное).
export function getConditionSeasons(condition: string): string | null {
  const match = condition.match(/\((\d[^)]*сезон[а-я]*)\)/)
  return match ? match[1] : null
}
