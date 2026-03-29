import { describe, it, expect } from 'vitest'
import { getItemsForLevel, getRequired, getDeficit, LEVEL_ORDER, RequiredGearItem } from '@/components/teams/gear-constants'

describe('getItemsForLevel', () => {
  it('light_trek returns only light_trek items', () => {
    const items = getItemsForLevel('light_trek')
    // Каска requires НП, should NOT be in light_trek
    expect(items.find(i => i.name === 'Каска')).toBeUndefined()
    // Треккинговые палки are light_trek
    expect(items.find(i => i.name === 'Треккинговые палки')).toBeDefined()
  })

  it('np includes light_trek items too (cumulative)', () => {
    const items = getItemsForLevel('np')
    expect(items.find(i => i.name === 'Треккинговые палки')).toBeDefined()
    expect(items.find(i => i.name === 'Каска')).toBeDefined()
  })

  it('sp3 includes np items', () => {
    const items = getItemsForLevel('sp3')
    expect(items.find(i => i.name === 'Каска')).toBeDefined()
    expect(items.find(i => i.name === 'Кошки')).toBeDefined()
  })

  it('sp2 includes all items', () => {
    const items = getItemsForLevel('sp2')
    expect(items.length).toBeGreaterThan(getItemsForLevel('sp3').length)
    expect(items.find(i => i.name === 'Ледовый инструмент (второй)')).toBeDefined()
  })
})

describe('getRequired', () => {
  it('norm_per_person × members when norm_per_person set', () => {
    const item: Pick<RequiredGearItem, 'norm_per_person' | 'norm_per_team'> = { norm_per_person: 2, norm_per_team: null }
    expect(getRequired(item, 3)).toBe(6)
  })

  it('norm_per_team directly when set', () => {
    const item: Pick<RequiredGearItem, 'norm_per_person' | 'norm_per_team'> = { norm_per_person: null, norm_per_team: 5 }
    expect(getRequired(item, 3)).toBe(5)
  })

  it('returns null when no norm set', () => {
    const item: Pick<RequiredGearItem, 'norm_per_person' | 'norm_per_team'> = { norm_per_person: null, norm_per_team: null }
    expect(getRequired(item, 3)).toBeNull()
  })
})

describe('getDeficit', () => {
  it('returns positive number when shortage', () => {
    const item: Pick<RequiredGearItem, 'norm_per_person' | 'norm_per_team'> = { norm_per_person: 1, norm_per_team: null }
    expect(getDeficit(item, 3, 2)).toBe(1) // need 3, have 2
  })

  it('returns 0 when exact', () => {
    const item: Pick<RequiredGearItem, 'norm_per_person' | 'norm_per_team'> = { norm_per_person: 1, norm_per_team: null }
    expect(getDeficit(item, 3, 3)).toBe(0)
  })

  it('returns negative when excess', () => {
    const item: Pick<RequiredGearItem, 'norm_per_person' | 'norm_per_team'> = { norm_per_person: 1, norm_per_team: null }
    expect(getDeficit(item, 3, 5)).toBe(-2)
  })

  it('returns null when no norm', () => {
    const item: Pick<RequiredGearItem, 'norm_per_person' | 'norm_per_team'> = { norm_per_person: null, norm_per_team: null }
    expect(getDeficit(item, 3, 2)).toBeNull()
  })
})
