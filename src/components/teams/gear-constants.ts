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
