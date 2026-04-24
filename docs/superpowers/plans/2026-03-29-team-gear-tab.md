# Team Gear Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken team gear matrix with a new tab that has a gear picker modal (leader sets requirements, members submit their gear) and two switchable views — summary table (Сводка) and member cards (Карточки).

**Architecture:** Five focused components share a single constants/types file. `TeamGearTab` owns all data fetching and passes down read-only props. Views are stateless renderers. The gear picker modal handles all Supabase writes. Toggle state persists in localStorage.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase client, Tailwind CSS, `xlsx` (already in dependencies), Vitest + Testing Library (existing setup).

**Spec:** `docs/superpowers/specs/2026-03-29-team-gear-tab-design.md`

**DB migration to apply first:** `supabase/migrations/010_team_gear_matrix.sql` — run in Supabase SQL Editor before starting.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/teams/gear-constants.ts` | **Create** | Shared types, STANDARD_TEMPLATE with minLevel, level filter logic, section labels |
| `src/components/teams/gear-picker-modal.tsx` | **Create** | Modal for selecting gear — leader creates required list, member fills own quantities |
| `src/components/teams/gear-svodka-view.tsx` | **Create** | Summary table with expandable rows, inline cell editing |
| `src/components/teams/gear-kartochki-view.tsx` | **Create** | Per-member cards grid with completion badges |
| `src/components/teams/team-gear-tab.tsx` | **Create** | Container: fetches data, owns toggle, renders toolbar + view |
| `src/components/teams/team-detail.tsx` | **Modify** | Swap TeamGearMatrix → TeamGearTab |
| `src/components/teams/team-gear-matrix.tsx` | **Delete** | Replaced |
| `src/components/teams/team-gear.tsx` | **Delete** | Replaced (team_gear table abandoned) |
| `__tests__/components/team-gear-constants.test.ts` | **Create** | Tests for pure logic: getItemsForLevel, deficit calculations |

---

## Task 1: Shared constants and types (`gear-constants.ts`)

**Files:**
- Create: `src/components/teams/gear-constants.ts`
- Create: `__tests__/components/team-gear-constants.test.ts`

- [ ] **Step 1: Write failing tests for getItemsForLevel**

Create `__tests__/components/team-gear-constants.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getItemsForLevel, getRequired, getDeficit, LEVEL_ORDER } from '@/components/teams/gear-constants'

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
    // Should have more items than sp3
    expect(items.length).toBeGreaterThanOrEqual(getItemsForLevel('sp3').length)
  })
})

describe('getRequired', () => {
  it('norm_per_person × members when norm_per_person set', () => {
    const item = { norm_per_person: 2, norm_per_team: null } as any
    expect(getRequired(item, 3)).toBe(6)
  })

  it('norm_per_team directly when set', () => {
    const item = { norm_per_person: null, norm_per_team: 5 } as any
    expect(getRequired(item, 3)).toBe(5)
  })

  it('returns null when no norm set', () => {
    const item = { norm_per_person: null, norm_per_team: null } as any
    expect(getRequired(item, 3)).toBeNull()
  })
})

describe('getDeficit', () => {
  it('returns positive number when shortage', () => {
    const item = { norm_per_person: 1, norm_per_team: null } as any
    expect(getDeficit(item, 3, 2)).toBe(1) // need 3, have 2
  })

  it('returns 0 when exact', () => {
    const item = { norm_per_person: 1, norm_per_team: null } as any
    expect(getDeficit(item, 3, 3)).toBe(0)
  })

  it('returns negative when excess', () => {
    const item = { norm_per_person: 1, norm_per_team: null } as any
    expect(getDeficit(item, 3, 5)).toBe(-2)
  })

  it('returns null when no norm', () => {
    const item = { norm_per_person: null, norm_per_team: null } as any
    expect(getDeficit(item, 3, 2)).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests, confirm they fail**

```bash
npx vitest run __tests__/components/team-gear-constants.test.ts
```
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/teams/gear-constants.ts`**

```typescript
// ─── Types ───────────────────────────────────────────────────────────────────

export type GearSection = 'personal' | 'group' | 'personal_items' | 'clothing'
export type GearLevel = 'light_trek' | 'np' | 'sp3' | 'sp2'

export interface RequiredGearItem {
  id: string
  name: string
  section: GearSection
  sort_order: number
  norm_per_person: number | null
  norm_per_team: number | null
}

export interface MemberGearEntry {
  required_gear_id: string
  user_id: string
  quantity: number
}

export interface Member {
  user_id: string
  display_name: string
}

export interface TemplateItem {
  name: string
  section: GearSection
  minLevel: GearLevel
  norm_per_person?: number | null
  norm_per_team?: number | null
  quantity?: number   // used only during member Excel import, not persisted to DB
}

// ─── Levels ──────────────────────────────────────────────────────────────────

export const LEVEL_ORDER: Record<GearLevel, number> = {
  light_trek: 0,
  np: 1,
  sp3: 2,
  sp2: 3,
}

export const LEVEL_LABELS: Record<GearLevel, { name: string; desc: string; weight: string }> = {
  light_trek: { name: 'Лёгкий треккинг', desc: 'Базовая одежда, рюкзак 30л, палки, фонарь, лёгкий бивуак', weight: '~8 кг' },
  np: { name: 'НП (начальная подготовка)', desc: '+ обвязка, каска, верёвка, карабины, базовое железо', weight: '~15 кг' },
  sp3: { name: 'СП-3', desc: '+ кошки, ледоруб, ледобуры, больше железа, зимний бивуак', weight: '~18 кг' },
  sp2: { name: 'СП-2 и выше', desc: '+ ледовые инструменты, полный набор закладок/френдов, ИТО', weight: '~22 кг' },
}

export const LEVEL_KEYS: GearLevel[] = ['light_trek', 'np', 'sp3', 'sp2']

// ─── Sections ─────────────────────────────────────────────────────────────────

export const SECTIONS: Record<GearSection, string> = {
  personal: 'Личное снаряжение',
  group: 'Общественное снаряжение',
  personal_items: 'Личные вещи',
  clothing: 'Одежда',
}

export const SECTION_KEYS: GearSection[] = ['personal', 'group', 'personal_items', 'clothing']

// ─── Standard Template ────────────────────────────────────────────────────────

export const STANDARD_TEMPLATE: TemplateItem[] = [
  // ── Personal gear ──
  { name: 'Каска',                            section: 'personal',       minLevel: 'np',         norm_per_person: 1 },
  { name: 'Обвязка (страховочная система)',   section: 'personal',       minLevel: 'np',         norm_per_person: 1 },
  { name: 'Спусковое устройство',             section: 'personal',       minLevel: 'np',         norm_per_person: 1 },
  { name: 'Карабины с муфтой',               section: 'personal',       minLevel: 'np',         norm_per_person: 9 },
  { name: 'Карабины без муфты',              section: 'personal',       minLevel: 'np',         norm_per_person: 2 },
  { name: 'Кошки',                            section: 'personal',       minLevel: 'sp3',        norm_per_person: null },
  { name: 'Ледоруб',                          section: 'personal',       minLevel: 'sp3',        norm_per_person: null },
  { name: 'Репшнур 6–6,5 м',                 section: 'personal',       minLevel: 'np',         norm_per_person: 2 },
  { name: 'Репшнур 1,6–1,8 м',               section: 'personal',       minLevel: 'np',         norm_per_person: 1 },
  { name: 'Скальные туфли',                  section: 'personal',       minLevel: 'np',         norm_per_person: 1 },
  { name: 'Жумар',                            section: 'personal',       minLevel: 'np',         norm_per_person: 1 },
  { name: 'Самостраховка',                    section: 'personal',       minLevel: 'np',         norm_per_person: 1 },
  { name: 'Перчатки',                         section: 'personal',       minLevel: 'np',         norm_per_person: 2 },
  { name: 'Очки',                             section: 'personal',       minLevel: 'np',         norm_per_person: 1 },
  { name: 'Крем от загара',                   section: 'personal',       minLevel: 'np',         norm_per_person: 1 },
  { name: 'Налобный фонарь',                 section: 'personal',       minLevel: 'light_trek', norm_per_person: 1 },
  { name: 'Треккинговые палки',              section: 'personal',       minLevel: 'light_trek', norm_per_person: 1 },
  { name: 'Рюкзак штурмовой',               section: 'personal',       minLevel: 'light_trek', norm_per_person: 1 },
  { name: 'Рюкзак большой (баул)',           section: 'personal',       minLevel: 'light_trek', norm_per_person: null },
  { name: 'Спальник',                         section: 'personal',       minLevel: 'light_trek', norm_per_person: null },
  { name: 'Коврик (пенка)',                   section: 'personal',       minLevel: 'light_trek', norm_per_person: null },
  { name: 'Сидушка (пенопопа)',              section: 'personal',       minLevel: 'light_trek', norm_per_person: 1 },
  // ── Ледовые инструменты (СП-2+) ──
  { name: 'Ледовый инструмент (второй)',     section: 'personal',       minLevel: 'sp2',        norm_per_person: 1 },
  // ── Group gear ──
  { name: 'Палатка',                          section: 'group',          minLevel: 'light_trek', norm_per_team: null },
  { name: 'Закладки (комплект)',             section: 'group',          minLevel: 'np',         norm_per_team: 1 },
  { name: 'Френды (комплект)',               section: 'group',          minLevel: 'sp2',        norm_per_team: 2 },
  { name: 'Крючья',                           section: 'group',          minLevel: 'sp2',        norm_per_team: 10 },
  { name: 'Ледобур',                          section: 'group',          minLevel: 'sp3',        norm_per_team: null },
  { name: 'Молоток скальный',                section: 'group',          minLevel: 'np',         norm_per_team: 3 },
  { name: 'Экстрактор',                       section: 'group',          minLevel: 'np',         norm_per_team: 3 },
  { name: 'Оттяжки',                          section: 'group',          minLevel: 'np',         norm_per_team: 10 },
  { name: 'Станционные петли 120–240',       section: 'group',          minLevel: 'np',         norm_per_person: 1 },
  { name: 'Петли-удлинители 60',             section: 'group',          minLevel: 'np',         norm_per_person: 1 },
  { name: 'Верёвка-статика',                 section: 'group',          minLevel: 'np',         norm_per_team: 1 },
  { name: 'Верёвка-динамика',                section: 'group',          minLevel: 'np',         norm_per_team: 2 },
  { name: 'Расходный репшнур (м)',           section: 'group',          minLevel: 'np',         norm_per_team: 10 },
  { name: 'Рация',                            section: 'group',          minLevel: 'np',         norm_per_team: 2 },
  { name: 'Лавинная лопата',                section: 'group',          minLevel: 'sp3',        norm_per_team: null },
  { name: 'Лавинный щуп',                    section: 'group',          minLevel: 'sp3',        norm_per_team: null },
  { name: 'Система приготовления пищи',      section: 'group',          minLevel: 'light_trek', norm_per_team: null },
  { name: 'Горелка',                          section: 'group',          minLevel: 'light_trek', norm_per_team: null },
  { name: 'Котелок',                          section: 'group',          minLevel: 'light_trek', norm_per_team: null },
  // ── Personal items ──
  { name: 'Кружка, ложка, тарелка, нож',    section: 'personal_items', minLevel: 'light_trek', norm_per_person: 1 },
  { name: 'Умывальные принадлежности',       section: 'personal_items', minLevel: 'light_trek', norm_per_person: 1 },
  { name: 'Полотенце',                        section: 'personal_items', minLevel: 'light_trek', norm_per_person: 1 },
  { name: 'Термос / бутылка для воды',       section: 'personal_items', minLevel: 'light_trek', norm_per_person: 1 },
  // ── Clothing ──
  { name: 'Термобелье',                       section: 'clothing',       minLevel: 'light_trek', norm_per_person: 1 },
  { name: 'Трекинговые носки',               section: 'clothing',       minLevel: 'light_trek', norm_per_person: 2 },
  { name: 'Кофта (флис)',                     section: 'clothing',       minLevel: 'light_trek', norm_per_person: 1 },
  { name: 'Штаны спортивные',                section: 'clothing',       minLevel: 'light_trek', norm_per_person: 1 },
  { name: 'Куртка мембранная',               section: 'clothing',       minLevel: 'light_trek', norm_per_person: 1 },
  { name: 'Пуховка',                          section: 'clothing',       minLevel: 'light_trek', norm_per_person: 1 },
  { name: 'Верхонки',                         section: 'clothing',       minLevel: 'np',         norm_per_person: 1 },
  { name: 'Кроссовки',                        section: 'clothing',       minLevel: 'light_trek', norm_per_person: 1 },
  { name: 'Ботинки',                          section: 'clothing',       minLevel: 'np',         norm_per_person: 1 },
  { name: 'Гамаши',                           section: 'clothing',       minLevel: 'sp3',        norm_per_person: null },
  { name: 'Бахилы',                           section: 'clothing',       minLevel: 'sp3',        norm_per_person: null },
  { name: 'Сланцы / кроксы',                section: 'clothing',       minLevel: 'light_trek', norm_per_person: 1 },
]

// ─── Pure helpers (testable) ──────────────────────────────────────────────────

export function getItemsForLevel(level: GearLevel): TemplateItem[] {
  return STANDARD_TEMPLATE.filter(
    item => LEVEL_ORDER[level] >= LEVEL_ORDER[item.minLevel]
  )
}

export function getRequired(
  item: Pick<RequiredGearItem, 'norm_per_person' | 'norm_per_team'>,
  memberCount: number
): number | null {
  if (item.norm_per_person !== null) return item.norm_per_person * memberCount
  if (item.norm_per_team !== null) return item.norm_per_team
  return null
}

export function getDeficit(
  item: Pick<RequiredGearItem, 'norm_per_person' | 'norm_per_team'>,
  memberCount: number,
  total: number
): number | null {
  const required = getRequired(item, memberCount)
  if (required === null) return null
  return required - total
}
```

- [ ] **Step 4: Run tests, confirm they pass**

```bash
npx vitest run __tests__/components/team-gear-constants.test.ts
```
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/teams/gear-constants.ts __tests__/components/team-gear-constants.test.ts
git commit -m "feat: add team gear shared constants and pure helpers"
```

---

## Task 2: Gear Picker Modal (`gear-picker-modal.tsx`)

**Files:**
- Create: `src/components/teams/gear-picker-modal.tsx`

This modal handles both leader (set required list) and member (fill own gear) modes.

- [ ] **Step 1: Create the file with types and structure**

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { X, Upload } from 'lucide-react'
import {
  LEVEL_KEYS, LEVEL_LABELS, LEVEL_ORDER, GearLevel,
  STANDARD_TEMPLATE, getItemsForLevel,
  RequiredGearItem, TemplateItem, SECTIONS
} from './gear-constants'
import * as XLSX from 'xlsx'

interface PackingSet {
  id: string
  name: string
  itemNames: string[]
}

interface GearPickerModalProps {
  teamId: string
  currentUserId: string
  mode: 'leader' | 'member'
  existingItems: RequiredGearItem[]   // current team_required_gear rows
  memberCount: number
  onClose: () => void
  onRefresh: () => void   // reload parent data WITHOUT closing modal (member mode)
  onDone: () => void      // reload parent data AND close modal (leader mode)
}
```

- [ ] **Step 2: Add data loading (packing sets + closet)**

Inside the component, load data on mount:

```typescript
export function GearPickerModal({
  teamId, currentUserId, mode, existingItems, memberCount, onClose, onRefresh, onDone
}: GearPickerModalProps) {
  const [packingSets, setPackingSets] = useState<PackingSet[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [selected, setSelected] = useState<{ type: 'level' | 'set'; key: string } | null>(null)
  const [previewItems, setPreviewItems] = useState<TemplateItem[]>([])
  const [applying, setApplying] = useState(false)
  const [diffMessage, setDiffMessage] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    // Load packing sets with gear names
    supabase
      .from('packing_sets')
      .select('id, name, packing_items(gear:gear(name))')
      .eq('user_id', currentUserId)
      .then(({ data }) => {
        if (data) {
          setPackingSets(data.map((s: any) => ({
            id: s.id,
            name: s.name,
            itemNames: (s.packing_items ?? []).map((pi: any) => pi.gear?.name).filter(Boolean),
          })))
        }
        setLoadingData(false)
      })
  }, [currentUserId])
```

- [ ] **Step 3: Add selection → preview logic**

When user selects a level or packing set, compute previewItems:

```typescript
  const handleSelectLevel = (level: GearLevel) => {
    setSelected({ type: 'level', key: level })
    setPreviewItems(getItemsForLevel(level))
  }

  const handleSelectSet = (setId: string) => {
    const ps = packingSets.find(s => s.id === setId)
    if (!ps) return
    setSelected({ type: 'set', key: setId })
    // Map packing set item names to TemplateItem shape (no norms)
    const items: TemplateItem[] = ps.itemNames.map(name => ({
      name,
      section: 'personal',   // default; leader can adjust inline later
      minLevel: 'light_trek',
    }))
    setPreviewItems(items)
  }

  // "Вся моя кладовка" — load all user_gear names
  const handleSelectCloset = async () => {
    setSelected({ type: 'set', key: '__closet__' })
    const supabase = createClient()
    const { data } = await supabase
      .from('user_gear')
      .select('gear:gear(name)')
      .eq('user_id', currentUserId)
    const items: TemplateItem[] = (data ?? []).map((ug: any) => ({
      name: ug.gear?.name ?? '',
      section: 'personal' as const,
      minLevel: 'light_trek' as const,
    })).filter(i => i.name)
    setPreviewItems(items)
  }
```

- [ ] **Step 4: Add Excel import handler**

```typescript
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer)
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[] = XLSX.utils.sheet_to_json(ws)

      if (mode === 'leader') {
        // Expected cols: name, section, norm_per_person, norm_per_team
        const items: TemplateItem[] = rows
          .filter(r => r.name)
          .map(r => ({
            name: String(r.name),
            section: (['personal','group','personal_items','clothing'].includes(r.section)
              ? r.section : 'personal') as any,
            minLevel: 'light_trek' as const,
            norm_per_person: r.norm_per_person != null ? Number(r.norm_per_person) : null,
            norm_per_team: r.norm_per_team != null ? Number(r.norm_per_team) : null,
          }))
        setSelected({ type: 'set', key: '__excel__' })
        setPreviewItems(items)
      } else {
        // Member: Expected cols: name, quantity
        const items: TemplateItem[] = rows
          .filter(r => r.name)
          .map(r => ({
            name: String(r.name),
            section: 'personal' as const,
            minLevel: 'light_trek' as const,
            quantity: r.quantity != null ? Number(r.quantity) : 1,
          }))
        setSelected({ type: 'set', key: '__excel__' })
        setPreviewItems(items)
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''   // reset so same file can be re-selected
  }
```

- [ ] **Step 5: Add confirm action — leader mode (merge)**

```typescript
  const applyLeader = async () => {
    setApplying(true)
    const supabase = createClient()

    const incomingNames = new Set(previewItems.map(i => i.name.toLowerCase()))
    const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()))

    const toAdd = previewItems.filter(i => !existingNames.has(i.name.toLowerCase()))
    const toRemove = existingItems.filter(i => !incomingNames.has(i.name.toLowerCase()))

    // Show diff and ask for confirmation
    if (existingItems.length > 0) {
      const addNames = toAdd.map(i => i.name).join(', ') || 'нет'
      const removeNames = toRemove.map(i => i.name).join(', ') || 'нет'
      const warn = toRemove.length > 0
        ? `\n\n⚠ Удалённые позиции потеряют данные всех участников.`
        : ''
      const confirmed = confirm(
        `Будет добавлено: ${addNames}\nБудет удалено: ${removeNames}${warn}\n\nПродолжить?`
      )
      if (!confirmed) { setApplying(false); return }
    }

    // Delete removed items
    if (toRemove.length > 0) {
      await supabase
        .from('team_required_gear')
        .delete()
        .in('id', toRemove.map(i => i.id))
    }

    // Insert new items
    if (toAdd.length > 0) {
      const maxOrder = existingItems.length
      await supabase.from('team_required_gear').insert(
        toAdd.map((item, idx) => ({
          team_id: teamId,
          name: item.name,
          section: item.section,
          sort_order: maxOrder + idx,
          norm_per_person: item.norm_per_person ?? null,
          norm_per_team: item.norm_per_team ?? null,
        }))
      )
    }

    setApplying(false)
    onDone()
  }
```

- [ ] **Step 6: Add confirm action — member mode (upsert quantities)**

```typescript
  const applyMember = async () => {
    setApplying(true)
    const supabase = createClient()

    // Use item.quantity for excel imports, default 1 for packing set/closet imports
    const previewNameMap = new Map(
      previewItems.map(i => [i.name.toLowerCase().trim(), i.quantity ?? 1])
    )

    const matched: { required_gear_id: string; quantity: number }[] = []
    const unmatchedNames: string[] = []

    for (const req of existingItems) {
      const qty = previewNameMap.get(req.name.toLowerCase().trim())
      if (qty !== undefined) {
        matched.push({ required_gear_id: req.id, quantity: qty })
      }
    }

    // Names in preview that didn't match any required item
    for (const [name] of previewNameMap) {
      const found = existingItems.some(r => r.name.toLowerCase().trim() === name)
      if (!found) unmatchedNames.push(name)
    }

    if (matched.length > 0) {
      await supabase.from('team_member_gear').upsert(
        matched.map(m => ({
          team_id: teamId,
          required_gear_id: m.required_gear_id,
          user_id: currentUserId,
          quantity: m.quantity,
        })),
        { onConflict: 'required_gear_id,user_id' }
      )
    }

    setDiffMessage(
      `Совпало: ${matched.length} из ${existingItems.length}.` +
      (unmatchedNames.length > 0 ? ` Не найдено в списке: ${unmatchedNames.join(', ')}.` : '')
    )

    setApplying(false)
    // Reload parent data WITHOUT closing modal so user can read the summary.
    // User closes manually via the X button or the footer "Закрыть" button.
    onRefresh()
  }
```

- [ ] **Step 7: Add the JSX render**

```typescript
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-mountain-border">
          <h2 className="text-lg font-bold text-mountain-text">
            {mode === 'leader' ? 'Задать список снаряжения' : 'Добавить моё снаряжение'}
          </h2>
          <button onClick={onClose} className="text-mountain-muted hover:text-mountain-text p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* My sets */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-mountain-muted uppercase tracking-wider">Мои сборки</p>
            {loadingData ? (
              <p className="text-mountain-muted text-sm">Загрузка...</p>
            ) : (
              <>
                <PickerCard
                  title="Вся моя кладовка"
                  desc="Всё снаряжение из кладовки"
                  active={selected?.key === '__closet__'}
                  onClick={handleSelectCloset}
                />
                {packingSets.map(ps => (
                  <PickerCard
                    key={ps.id}
                    title={ps.name}
                    desc={`${ps.itemNames.length} предметов`}
                    active={selected?.key === ps.id}
                    onClick={() => handleSelectSet(ps.id)}
                  />
                ))}
              </>
            )}
          </div>

          {/* Templates by level */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-mountain-muted uppercase tracking-wider">Шаблоны по уровню</p>
            {LEVEL_KEYS.map(level => {
              const info = LEVEL_LABELS[level]
              return (
                <PickerCard
                  key={level}
                  title={info.name}
                  desc={info.desc}
                  badge={info.weight}
                  active={selected?.key === level}
                  onClick={() => handleSelectLevel(level)}
                />
              )
            })}
          </div>

          {/* Excel import */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-mountain-muted uppercase tracking-wider">Импорт из Excel</p>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-mountain-border hover:border-mountain-primary cursor-pointer transition-colors">
              <Upload className="w-5 h-5 text-mountain-muted" />
              <div>
                <p className="text-sm text-mountain-text">Загрузить файл .xlsx</p>
                <p className="text-xs text-mountain-muted">
                  {mode === 'leader'
                    ? 'Столбцы: name, section, norm_per_person, norm_per_team'
                    : 'Столбцы: name, quantity'}
                </p>
              </div>
              <input type="file" accept=".xlsx,.xls" className="sr-only" onChange={handleExcelImport} />
            </label>
          </div>

          {/* Preview */}
          {previewItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-mountain-muted uppercase tracking-wider">
                Предпросмотр ({previewItems.length} позиций)
              </p>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-mountain-border divide-y divide-mountain-border/50">
                {previewItems.slice(0, 30).map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    <span className="text-mountain-text">{item.name}</span>
                    <span className="text-mountain-muted text-xs">{SECTIONS[item.section]}</span>
                  </div>
                ))}
                {previewItems.length > 30 && (
                  <div className="px-3 py-1.5 text-xs text-mountain-muted">
                    + ещё {previewItems.length - 30}...
                  </div>
                )}
              </div>
            </div>
          )}

          {diffMessage && (
            <p className="text-sm text-mountain-muted bg-mountain-surface rounded-lg px-3 py-2">{diffMessage}</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-mountain-border flex gap-3">
          {/* After member apply, show only "Закрыть" so user reads the summary */}
          {mode === 'member' && diffMessage ? (
            <Button className="flex-1" onClick={onClose}>Закрыть</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} className="flex-1">Отмена</Button>
              <Button
                className="flex-1"
                disabled={!selected || previewItems.length === 0 || applying}
                onClick={mode === 'leader' ? applyLeader : applyMember}
              >
                {applying ? 'Применение...' : 'Применить'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PickerCard sub-component ─────────────────────────────────────────────────

function PickerCard({ title, desc, badge, active, onClick }: {
  title: string; desc: string; badge?: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-colors ${
        active
          ? 'border-mountain-primary bg-mountain-primary/10'
          : 'border-mountain-border hover:border-mountain-primary/50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-mountain-text">{title}</p>
          <p className="text-xs text-mountain-muted mt-0.5">{desc}</p>
        </div>
        {badge && <span className="text-mountain-accent text-sm font-mono shrink-0">{badge}</span>}
      </div>
    </button>
  )
}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep gear-picker
```
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/teams/gear-picker-modal.tsx
git commit -m "feat: add gear picker modal for leader and member gear setup"
```

---

## Task 3: Summary View (`gear-svodka-view.tsx`)

**Files:**
- Create: `src/components/teams/gear-svodka-view.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import {
  RequiredGearItem, MemberGearEntry, Member,
  SECTION_KEYS, SECTIONS, getRequired, getDeficit
} from './gear-constants'

interface GearSvodkaViewProps {
  items: RequiredGearItem[]
  memberGear: MemberGearEntry[]
  members: Member[]
  currentUserId: string
  isLeader: boolean
  onDeleteItem: (id: string) => void
  onSaveCell: (itemId: string, userId: string, quantity: number) => Promise<void>
}

export function GearSvodkaView({
  items, memberGear, members, currentUserId, isLeader, onDeleteItem, onSaveCell
}: GearSvodkaViewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{ itemId: string; userId: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingCell) inputRef.current?.focus()
  }, [editingCell])

  const getQuantity = (itemId: string, userId: string) =>
    memberGear.find(e => e.required_gear_id === itemId && e.user_id === userId)?.quantity ?? 0

  const getTotal = (itemId: string) =>
    memberGear.filter(e => e.required_gear_id === itemId).reduce((s, e) => s + e.quantity, 0)

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const startEdit = (itemId: string, userId: string) => {
    if (userId !== currentUserId) return
    setEditingCell({ itemId, userId })
    setEditValue(String(getQuantity(itemId, userId)))
  }

  const commitEdit = () => {
    if (!editingCell) return
    const qty = Math.max(0, parseInt(editValue, 10) || 0)
    onSaveCell(editingCell.itemId, editingCell.userId, qty)
    setEditingCell(null)
  }

  const normLabel = (item: RequiredGearItem) => {
    if (item.norm_per_person !== null) return `${item.norm_per_person}/чел`
    if (item.norm_per_team !== null) return `${item.norm_per_team}/отд`
    return '—'
  }

  const deficitCell = (deficit: number | null) => {
    if (deficit === null) return <span className="text-mountain-muted text-xs">—</span>
    if (deficit === 0) return <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400">✓</span>
    if (deficit > 0) return <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400">+{deficit}</span>
    return <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400">{deficit}</span>
  }

  return (
    <div className="rounded-xl border border-mountain-border overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-mountain-surface border-b border-mountain-border">
            <th className="px-3 py-2.5 text-left text-xs font-medium text-mountain-muted uppercase tracking-wider w-6"></th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-mountain-muted uppercase tracking-wider">Снаряжение</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-mountain-muted uppercase tracking-wider">В наличии</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-mountain-muted uppercase tracking-wider">Норма</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-mountain-muted uppercase tracking-wider">Необходимо</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-mountain-muted uppercase tracking-wider">Добрать</th>
            {isLeader && <th className="w-8" />}
          </tr>
        </thead>
        {/* Multiple <tbody> per section are valid HTML — no outer <tbody> wrapper */}
          {SECTION_KEYS.map(section => {
            const sectionItems = items.filter(i => i.section === section)
            if (sectionItems.length === 0) return null
            return (
              <tbody key={section}>
                <tr className="bg-mountain-bg/60">
                  <td colSpan={isLeader ? 7 : 6} className="px-3 py-1.5 text-xs font-semibold text-mountain-primary uppercase tracking-wider border-y border-mountain-border">
                    {SECTIONS[section]}
                  </td>
                </tr>
                {sectionItems.map((item, idx) => {
                  const total = getTotal(item.id)
                  const required = getRequired(item, members.length)
                  const deficit = getDeficit(item, members.length, total)
                  const expanded = expandedRows.has(item.id)
                  const isGroup = item.norm_per_team !== null && item.norm_per_person === null

                  return (
                    <>
                      <tr
                        key={item.id}
                        className="border-b border-mountain-border/40 hover:bg-mountain-surface/30 transition-colors cursor-pointer"
                        onClick={() => toggleRow(item.id)}
                      >
                        <td className="px-3 py-2.5 text-mountain-muted">
                          {expanded
                            ? <ChevronDown className="w-3.5 h-3.5" />
                            : <ChevronRight className="w-3.5 h-3.5" />}
                        </td>
                        <td className="px-3 py-2.5 text-mountain-text font-medium">{item.name}</td>
                        <td className="px-3 py-2.5 text-center font-medium text-mountain-text">{total}</td>
                        <td className="px-3 py-2.5 text-center text-xs text-mountain-muted">{normLabel(item)}</td>
                        <td className="px-3 py-2.5 text-center text-mountain-muted">{required ?? '—'}</td>
                        <td className="px-3 py-2.5 text-center">{deficitCell(deficit)}</td>
                        {isLeader && (
                          <td className="px-2 py-2.5">
                            <button
                              onClick={e => { e.stopPropagation(); onDeleteItem(item.id) }}
                              className="text-mountain-muted hover:text-red-400 transition-colors p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                      {expanded && (
                        <tr key={`${item.id}-expand`} className="border-b border-mountain-border/40 bg-mountain-bg/40">
                          <td />
                          <td colSpan={isLeader ? 6 : 5} className="px-4 py-3">
                            {isGroup ? (
                              <div className="text-xs text-mountain-muted">
                                Всего у отделения: <span className="text-mountain-text font-medium">{total}</span>
                                {members.filter(m => getQuantity(item.id, m.user_id) > 0).map(m => (
                                  <span key={m.user_id} className="ml-2 text-mountain-muted">
                                    {m.display_name}: {getQuantity(item.id, m.user_id)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {members.map(m => {
                                  const qty = getQuantity(item.id, m.user_id)
                                  const isMine = m.user_id === currentUserId
                                  const isEditing = editingCell?.itemId === item.id && editingCell?.userId === m.user_id
                                  return (
                                    <span
                                      key={m.user_id}
                                      className={`text-xs flex items-center gap-1 ${isMine ? 'cursor-pointer hover:text-mountain-primary' : ''}`}
                                      onClick={e => { e.stopPropagation(); startEdit(item.id, m.user_id) }}
                                    >
                                      <span className={`font-medium ${isMine ? 'text-mountain-primary' : 'text-mountain-text'}`}>
                                        {m.display_name}:
                                      </span>
                                      {isEditing ? (
                                        <input
                                          ref={inputRef}
                                          type="number"
                                          min={0}
                                          value={editValue}
                                          onChange={e => setEditValue(e.target.value)}
                                          onBlur={commitEdit}
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') commitEdit()
                                            if (e.key === 'Escape') setEditingCell(null)
                                          }}
                                          className="w-12 text-center rounded border border-mountain-primary bg-mountain-bg text-mountain-text text-xs focus:outline-none"
                                          onClick={e => e.stopPropagation()}
                                        />
                                      ) : (
                                        <span className={qty === 0 ? 'text-mountain-muted' : 'text-mountain-text'}>
                                          {qty}
                                        </span>
                                      )}
                                    </span>
                                  )
                                })}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            )
          })}
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep gear-svodka
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/teams/gear-svodka-view.tsx
git commit -m "feat: add gear svodka (summary) view with expandable rows"
```

---

## Task 4: Cards View (`gear-kartochki-view.tsx`)

**Files:**
- Create: `src/components/teams/gear-kartochki-view.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { RequiredGearItem, MemberGearEntry, Member, SECTIONS } from './gear-constants'

interface GearKartochkiViewProps {
  items: RequiredGearItem[]
  memberGear: MemberGearEntry[]
  members: Member[]
  currentUserId: string
}

export function GearKartochkiView({ items, memberGear, members, currentUserId }: GearKartochkiViewProps) {
  const getQuantity = (itemId: string, userId: string) =>
    memberGear.find(e => e.required_gear_id === itemId && e.user_id === userId)?.quantity ?? 0

  const getBadge = (userId: string) => {
    const covered = items.filter(item => getQuantity(item.id, userId) > 0).length
    return { covered, total: items.length }
  }

  // Current user's card first
  const sortedMembers = [
    ...members.filter(m => m.user_id === currentUserId),
    ...members.filter(m => m.user_id !== currentUserId),
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedMembers.map(member => {
        const isCurrent = member.user_id === currentUserId
        const { covered, total } = getBadge(member.user_id)
        const allGood = covered === total

        return (
          <div
            key={member.user_id}
            className={`glass-card p-4 space-y-3 ${isCurrent ? 'border-mountain-primary' : ''}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-mountain-text">{member.display_name}</span>
                {isCurrent && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-mountain-primary/20 text-mountain-primary">Вы</span>
                )}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                allGood
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {covered} / {total} {allGood ? '✓' : '⚠'}
              </span>
            </div>

            {/* Gear list grouped by section */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {['personal', 'group', 'personal_items', 'clothing'].map(section => {
                const sectionItems = items.filter(i => i.section === section)
                if (sectionItems.length === 0) return null
                return (
                  <div key={section}>
                    <p className="text-xs text-mountain-muted uppercase tracking-wide mb-1">
                      {SECTIONS[section as keyof typeof SECTIONS]}
                    </p>
                    <div className="space-y-0.5">
                      {sectionItems.map(item => {
                        const qty = getQuantity(item.id, member.user_id)
                        const isGroup = item.norm_per_team !== null && item.norm_per_person === null
                        const norm = item.norm_per_person
                        const missing = norm !== null && qty < norm

                        return (
                          <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isGroup && (
                                <span className="shrink-0 px-1 py-px rounded text-[10px] bg-emerald-500/15 text-emerald-400">
                                  Общее
                                </span>
                              )}
                              <span className={`truncate ${missing ? 'text-red-400' : qty > 0 ? 'text-mountain-text' : 'text-mountain-muted'}`}>
                                {item.name}
                              </span>
                            </div>
                            <span className={`shrink-0 font-medium ${
                              missing ? 'text-red-400' : qty > 0 ? 'text-mountain-text' : 'text-mountain-muted'
                            }`}>
                              {qty > 0 ? qty : (missing ? '0 ⚠' : '—')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep gear-kartochki
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/teams/gear-kartochki-view.tsx
git commit -m "feat: add gear kartochki (cards) view with member badges"
```

---

## Task 5: Container (`team-gear-tab.tsx`)

**Files:**
- Create: `src/components/teams/team-gear-tab.tsx`

- [ ] **Step 1: Create the container component**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LayoutList, LayoutGrid, Plus, Edit2, PackageOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GearPickerModal } from './gear-picker-modal'
import { GearSvodkaView } from './gear-svodka-view'
import { GearKartochkiView } from './gear-kartochki-view'
import { RequiredGearItem, MemberGearEntry, Member } from './gear-constants'

type ViewMode = 'svodka' | 'kartochki'

interface TeamGearTabProps {
  teamId: string
  members: Member[]
  currentUserId: string
  isLeader: boolean
}

export function TeamGearTab({ teamId, members, currentUserId, isLeader }: TeamGearTabProps) {
  const [items, setItems] = useState<RequiredGearItem[]>([])
  const [memberGear, setMemberGear] = useState<MemberGearEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerMode, setPickerMode] = useState<'leader' | 'member'>('member')

  const storageKey = `mountaine_team_gear_view_${teamId}`
  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem(storageKey) as ViewMode) ?? 'svodka'
    }
    return 'svodka'
  })

  const switchView = (v: ViewMode) => {
    setView(v)
    localStorage.setItem(storageKey, v)
  }

  const load = useCallback(async () => {
    const supabase = createClient()
    const [{ data: req }, { data: mem }] = await Promise.all([
      supabase
        .from('team_required_gear')
        .select('*')
        .eq('team_id', teamId)
        .order('section')
        .order('sort_order'),
      supabase.from('team_member_gear').select('*').eq('team_id', teamId),
    ])
    setItems((req ?? []) as RequiredGearItem[])
    setMemberGear((mem ?? []) as MemberGearEntry[])
    setLoading(false)
  }, [teamId])

  useEffect(() => { load() }, [load])

  const handleDeleteItem = async (id: string) => {
    const supabase = createClient()
    await supabase.from('team_required_gear').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    setMemberGear(prev => prev.filter(e => e.required_gear_id !== id))
  }

  const handleSaveCell = async (itemId: string, userId: string, quantity: number) => {
    setMemberGear(prev => {
      const exists = prev.some(e => e.required_gear_id === itemId && e.user_id === userId)
      if (exists) return prev.map(e =>
        e.required_gear_id === itemId && e.user_id === userId ? { ...e, quantity } : e
      )
      return [...prev, { required_gear_id: itemId, user_id: userId, quantity }]
    })
    const supabase = createClient()
    await supabase.from('team_member_gear').upsert(
      { team_id: teamId, required_gear_id: itemId, user_id: userId, quantity },
      { onConflict: 'required_gear_id,user_id' }
    )
  }

  const openLeaderPicker = () => { setPickerMode('leader'); setShowPicker(true) }
  const openMemberPicker = () => { setPickerMode('member'); setShowPicker(true) }

  if (loading) {
    return <div className="text-mountain-muted text-center py-12">Загрузка...</div>
  }

  const hasItems = items.length > 0

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {isLeader && (
          <Button onClick={openLeaderPicker} variant={hasItems ? 'outline' : 'primary'}>
            {hasItems
              ? <><Edit2 className="w-4 h-4 mr-1.5" /> Изменить список</>
              : <><Plus className="w-4 h-4 mr-1.5" /> Задать список снаряжения</>
            }
          </Button>
        )}
        {hasItems && (
          <Button variant="outline" onClick={openMemberPicker}>
            <PackageOpen className="w-4 h-4 mr-1.5" />
            Добавить моё снаряжение
          </Button>
        )}

        {/* View toggle — right side */}
        {hasItems && (
          <div className="ml-auto flex items-center rounded-xl border border-mountain-border overflow-hidden">
            <button
              onClick={() => switchView('svodka')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                view === 'svodka'
                  ? 'bg-mountain-primary text-white'
                  : 'text-mountain-muted hover:text-mountain-text'
              }`}
            >
              <LayoutList className="w-4 h-4" />
              Сводка
            </button>
            <button
              onClick={() => switchView('kartochki')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                view === 'kartochki'
                  ? 'bg-mountain-primary text-white'
                  : 'text-mountain-muted hover:text-mountain-text'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Карточки
            </button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {!hasItems && (
        <div className="text-center py-16 space-y-3">
          <PackageOpen className="w-12 h-12 text-mountain-muted mx-auto" />
          {isLeader ? (
            <>
              <p className="text-mountain-text font-medium">Список снаряжения не составлен</p>
              <p className="text-mountain-muted text-sm">Нажмите «Задать список снаряжения» и выберите шаблон или сборку</p>
            </>
          ) : (
            <>
              <p className="text-mountain-text font-medium">Руководитель ещё не составил список снаряжения</p>
              <p className="text-mountain-muted text-sm">Когда список появится, вы сможете добавить своё снаряжение</p>
            </>
          )}
        </div>
      )}

      {/* Views */}
      {hasItems && view === 'svodka' && (
        <GearSvodkaView
          items={items}
          memberGear={memberGear}
          members={members}
          currentUserId={currentUserId}
          isLeader={isLeader}
          onDeleteItem={handleDeleteItem}
          onSaveCell={handleSaveCell}
        />
      )}

      {hasItems && view === 'kartochki' && (
        <GearKartochkiView
          items={items}
          memberGear={memberGear}
          members={members}
          currentUserId={currentUserId}
        />
      )}

      {/* Legend (Svodka only) */}
      {hasItems && view === 'svodka' && (
        <div className="flex flex-wrap gap-4 text-xs text-mountain-muted px-1">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/20 inline-block" /> Достаточно</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/20 inline-block" /> Не хватает</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/20 inline-block" /> Лишнее</span>
          <span className="flex items-center gap-1.5 text-mountain-primary">● Ваши данные (нажмите для редактирования)</span>
        </div>
      )}

      {/* Picker modal */}
      {showPicker && (
        <GearPickerModal
          teamId={teamId}
          currentUserId={currentUserId}
          mode={pickerMode}
          existingItems={items}
          memberCount={members.length}
          onClose={() => setShowPicker(false)}
          onRefresh={load}                              // member: reload data, keep modal open
          onDone={() => { setShowPicker(false); load() }} // leader: close modal + reload
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep team-gear-tab
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/teams/team-gear-tab.tsx
git commit -m "feat: add team gear tab container with view toggle and picker integration"
```

---

## Task 6: Wire up in `team-detail.tsx`

**Files:**
- Modify: `src/components/teams/team-detail.tsx`

- [ ] **Step 1: Replace the import**

In `team-detail.tsx`, change:

```typescript
// Remove:
import { TeamGear } from '@/components/teams/team-gear'
// or:
import { TeamGearMatrix } from '@/components/teams/team-gear-matrix'

// Add:
import { TeamGearTab } from '@/components/teams/team-gear-tab'
```

- [ ] **Step 2: Replace the component usage**

Find the gear tab render (around line 144) and replace:

```typescript
// Remove:
{activeTab === 'gear' && (
  <TeamGearMatrix teamId={teamId} members={members} currentUserId={currentUserId} isLeader={isLeader} />
)}

// Replace with:
{activeTab === 'gear' && (
  <TeamGearTab teamId={teamId} members={members} currentUserId={currentUserId} isLeader={isLeader} />
)}
```

- [ ] **Step 3: Verify TypeScript compiles — full check**

```bash
npx tsc --noEmit 2>&1
```
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/teams/team-detail.tsx
git commit -m "feat: wire TeamGearTab into team detail page"
```

---

## Task 7: Delete replaced files

**Files:**
- Delete: `src/components/teams/team-gear-matrix.tsx`
- Delete: `src/components/teams/team-gear.tsx`

- [ ] **Step 1: Delete the files**

```bash
rm src/components/teams/team-gear-matrix.tsx
rm src/components/teams/team-gear.tsx
```

- [ ] **Step 2: Confirm no remaining imports**

```bash
grep -r "team-gear-matrix\|TeamGearMatrix\|team-gear'\|TeamGear'" src/ --include="*.tsx"
```
Expected: no output.

- [ ] **Step 3: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```
Expected: 0 errors.

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```
Expected: all pass.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: remove replaced team-gear components (matrix and legacy)"
```

---

## Task 8: Manual verification

- [ ] Apply migration `010_team_gear_matrix.sql` in Supabase SQL Editor (if not done yet)
- [ ] Open http://localhost:3001/teams → create or open a team
- [ ] Click "Снаряжение" tab
- [ ] As leader: click "Задать список снаряжения" → pick "НП" template → confirm → required list appears
- [ ] Switch to "Карточки" view → your card shows "0 / N ⚠"
- [ ] Click "Добавить моё снаряжение" → pick "Вся моя кладовка" → see match summary
- [ ] Switch back to "Сводка" → expand a row → see your quantities
- [ ] Click your quantity in expanded row → edit inline → blur → value saves
- [ ] As leader: delete one item → confirm it disappears
- [ ] Toggle view and reload page → view persists (localStorage)
