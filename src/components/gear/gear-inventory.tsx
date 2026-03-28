'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Trash2, Weight, X, Cable, Wrench, Shirt, Footprints, Tent, Cpu, Package, Sparkles, Check, AlertTriangle, CircleAlert, Download, Filter } from 'lucide-react'
import { GearExcelImport } from './gear-excel-import'
import { GearDetailModal } from './gear-detail-modal'
import * as XLSX from 'xlsx'

interface GearItem {
  id: string
  name: string
  category: string
  description: string | null
  weight: number | null
  brand: string | null
}

interface UserGearItem {
  id: string
  gear_id: string
  condition: string
  notes: string | null
  tags?: string[]
  gear: GearItem
}

const CATEGORY_LABELS: Record<string, string> = {
  clothing: 'Одежда',
  footwear: 'Обувь',
  hardware: 'Железо',
  ropes: 'Верёвки',
  bivouac: 'Бивуак',
  electronics: 'Электроника',
  other: 'Прочее',
}

const CATEGORY_ICONS: Record<string, any> = {
  clothing: Shirt,
  footwear: Footprints,
  hardware: Wrench,
  ropes: Cable,
  bivouac: Tent,
  electronics: Cpu,
  other: Package,
}

const CATEGORY_COLORS: Record<string, string> = {
  clothing: 'bg-purple-500/20 text-purple-400',
  footwear: 'bg-amber-500/20 text-amber-400',
  hardware: 'bg-blue-500/20 text-blue-400',
  ropes: 'bg-green-500/20 text-green-400',
  bivouac: 'bg-orange-500/20 text-orange-400',
  electronics: 'bg-cyan-500/20 text-cyan-400',
  other: 'bg-mountain-muted/20 text-mountain-muted',
}

const CONDITION_ICONS: Record<string, { icon: any; cls: string; title: string }> = {
  new: { icon: Sparkles, cls: 'text-mountain-success', title: 'Новое' },
  good: { icon: Check, cls: 'text-mountain-primary', title: 'Хорошее' },
  worn: { icon: AlertTriangle, cls: 'text-mountain-accent', title: 'Изношенное' },
  needs_repair: { icon: CircleAlert, cls: 'text-mountain-danger', title: 'Нужен ремонт' },
}

const CONDITION_LABELS: Record<string, string> = {
  new: 'Новое',
  good: 'Хорошее',
  worn: 'Изношенное',
  needs_repair: 'Нужен ремонт',
}

export const POPULAR_BRANDS = [
  'Petzl', 'Black Diamond', 'La Sportiva', 'Scarpa', 'Mammut',
  'Salewa', 'Camp', 'Grivel', 'Edelrid', 'Beal',
  'Climbing Technology', 'DMM', 'Kong', 'Singing Rock', 'Ocun',
  'The North Face', 'Arc\'teryx', 'Patagonia', 'Mountain Hardwear', 'Rab',
  'Marmot', 'Outdoor Research', 'Norrona', 'Haglofs', 'Bergans',
  'MSR', 'Primus', 'Jetboil', 'Sea to Summit', 'Therm-a-Rest',
  'Osprey', 'Deuter', 'Gregory', 'Lowe Alpine', 'Exped',
  'Garmin', 'Suunto', 'Fenix', 'Silva', 'Ledlenser',
  'RedFox', 'Bask', 'Sivera', 'O3 Ozone', 'Вертикаль',
]

export function GearInventory({ catalog, userId }: { catalog: GearItem[]; userId: string }) {
  const [userGear, setUserGear] = useState<UserGearItem[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<UserGearItem | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterCondition, setFilterCondition] = useState<string | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // For catalog modal
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogCategory, setCatalogCategory] = useState<string | null>(null)

  const loadUserGear = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('user_gear')
      .select('*, gear(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setUserGear(data as any)
  }, [userId])

  useEffect(() => { loadUserGear() }, [loadUserGear])

  // All unique tags from user gear
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    userGear.forEach(item => item.tags?.forEach(t => tags.add(t)))
    return Array.from(tags).sort()
  }, [userGear])

  // Filtered gear
  const filteredGear = useMemo(() => {
    return userGear.filter(item => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchName = item.gear?.name?.toLowerCase().includes(q)
        const matchBrand = item.gear?.brand?.toLowerCase().includes(q)
        if (!matchName && !matchBrand) return false
      }
      if (filterCategory && item.gear?.category !== filterCategory) return false
      if (filterCondition && item.condition !== filterCondition) return false
      if (filterTag && (!item.tags || !item.tags.includes(filterTag))) return false
      return true
    })
  }, [userGear, searchQuery, filterCategory, filterCondition, filterTag])

  const hasActiveFilters = searchQuery || filterCategory || filterCondition || filterTag

  async function addFromCatalog(gearId: string) {
    const supabase = createClient()
    await supabase.from('user_gear').insert({ user_id: userId, gear_id: gearId })
    await loadUserGear()
  }

  async function addCustomItem(name: string, category: string, weight: number | null, description: string, brand: string | null) {
    const supabase = createClient()
    const { data: newGear } = await supabase
      .from('gear')
      .insert({ name, category, weight, description, brand })
      .select()
      .single()
    if (newGear) {
      await supabase.from('user_gear').insert({ user_id: userId, gear_id: newGear.id })
      await loadUserGear()
    }
    setShowCustomModal(false)
  }

  async function removeItem(userGearId: string) {
    const supabase = createClient()
    await supabase.from('user_gear').delete().eq('id', userGearId)
    setUserGear(prev => prev.filter(g => g.id !== userGearId))
  }

  function exportToExcel() {
    const rows = userGear.map(item => ({
      'Название': item.gear?.name || '',
      'Фирма': item.gear?.brand || '',
      'Категория': CATEGORY_LABELS[item.gear?.category] || item.gear?.category || '',
      'Вес (г)': item.gear?.weight || '',
      'Состояние': CONDITION_LABELS[item.condition] || item.condition,
      'Теги': (item.tags || []).join(', '),
      'Заметки': item.notes || '',
      'Описание': item.gear?.description || '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [
      { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
      { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 30 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Моё снаряжение')
    XLSX.writeFile(wb, 'моё_снаряжение.xlsx')
  }

  function clearFilters() {
    setSearchQuery('')
    setFilterCategory(null)
    setFilterCondition(null)
    setFilterTag(null)
  }

  // Group filtered gear by category
  const grouped = filteredGear.reduce<Record<string, UserGearItem[]>>((acc, item) => {
    const cat = item.gear?.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const totalWeight = filteredGear.reduce((sum, item) => sum + (item.gear?.weight || 0), 0)
  const totalItems = filteredGear.length

  // Catalog filtered for add modal
  const existingGearIds = new Set(userGear.map(g => g.gear_id))
  const filteredCatalog = catalog.filter(g => {
    if (existingGearIds.has(g.id)) return false
    if (catalogSearch && !g.name.toLowerCase().includes(catalogSearch.toLowerCase())) return false
    if (catalogCategory && g.category !== catalogCategory) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex gap-4">
        <Card className="flex-1 p-4">
          <p className="text-xs text-mountain-muted">Предметов</p>
          <p className="text-2xl font-bold font-mono">{totalItems}</p>
        </Card>
        <Card className="flex-1 p-4">
          <p className="text-xs text-mountain-muted">Общий вес</p>
          <p className="text-2xl font-bold font-mono">{(totalWeight / 1000).toFixed(1)} кг</p>
        </Card>
      </div>

      {/* Search & Filter bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mountain-muted" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию или фирме..."
              className="w-full rounded-xl border border-mountain-border bg-mountain-surface pl-9 pr-4 py-2 text-sm text-mountain-text placeholder:text-mountain-muted/50 focus:border-mountain-primary focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-mountain-muted hover:text-mountain-text">
                <X size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-mountain-primary/10 border-mountain-primary text-mountain-primary'
                : 'bg-mountain-surface border-mountain-border text-mountain-muted hover:text-mountain-text'
            }`}
          >
            <Filter size={14} />
            Фильтры
            {hasActiveFilters && !showFilters && (
              <span className="w-2 h-2 rounded-full bg-mountain-primary" />
            )}
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="bg-mountain-surface/50 border border-mountain-border rounded-xl p-3 space-y-3">
            {/* Category filter */}
            <div className="space-y-1.5">
              <p className="text-xs text-mountain-muted">Категория</p>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFilterCategory(null)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${!filterCategory ? 'bg-mountain-primary text-white' : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'}`}
                >
                  Все
                </button>
                {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(filterCategory === cat ? null : cat)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${filterCategory === cat ? CATEGORY_COLORS[cat] : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Condition filter */}
            <div className="space-y-1.5">
              <p className="text-xs text-mountain-muted">Состояние</p>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFilterCondition(null)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${!filterCondition ? 'bg-mountain-primary text-white' : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'}`}
                >
                  Все
                </button>
                {Object.entries(CONDITION_LABELS).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setFilterCondition(filterCondition === val ? null : val)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${filterCondition === val ? 'bg-mountain-primary/20 text-mountain-primary' : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags filter */}
            {allTags.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-mountain-muted">Теги</p>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setFilterTag(null)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${!filterTag ? 'bg-mountain-primary text-white' : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'}`}
                  >
                    Все
                  </button>
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${filterTag === tag ? 'bg-mountain-primary/20 text-mountain-primary' : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'}`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-mountain-muted hover:text-mountain-primary transition-colors">
                Сбросить фильтры
              </button>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowAddModal(true)}>
          <Plus size={16} className="mr-2" />
          Из каталога
        </Button>
        <Button variant="outline" onClick={() => setShowCustomModal(true)}>
          <Plus size={16} className="mr-2" />
          Своё снаряжение
        </Button>
        <GearExcelImport userId={userId} onImportComplete={loadUserGear} />
        {userGear.length > 0 && (
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border transition-colors"
          >
            <Download size={14} />
            Экспорт Excel
          </button>
        )}
      </div>

      {/* Inventory by category */}
      {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
        const items = grouped[cat]
        if (!items || items.length === 0) return null
        const catWeight = items.reduce((s, i) => s + (i.gear?.weight || 0), 0)

        return (
          <div key={cat} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs ${CATEGORY_COLORS[cat]}`}>{label}</span>
                <span className="text-mountain-muted">({items.length})</span>
              </h3>
              <span className="text-xs font-mono text-mountain-muted">{(catWeight / 1000).toFixed(1)} кг</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(item => {
                const CatIcon = CATEGORY_ICONS[item.gear?.category || 'other'] || Package
                const colorClass = CATEGORY_COLORS[item.gear?.category || 'other'] || 'bg-mountain-border text-mountain-muted'
                const cond = CONDITION_ICONS[item.condition] || CONDITION_ICONS.good
                const CondIcon = cond.icon
                return (
                  <Card
                    key={item.id}
                    hover
                    className="p-3 flex items-center gap-3 cursor-pointer"
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${colorClass}`}>
                      <CatIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{item.gear?.name}</p>
                        <CondIcon size={12} className={`flex-shrink-0 ${cond.cls}`} title={cond.title} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.gear?.brand && (
                          <span className="text-xs text-mountain-muted">{item.gear.brand}</span>
                        )}
                        {item.gear?.weight && (
                          <span className="text-xs text-mountain-muted flex items-center gap-0.5">
                            <Weight size={10} />
                            {item.gear.weight} г
                          </span>
                        )}
                        {item.tags && item.tags.length > 0 && (
                          <span className="text-xs text-mountain-primary/60">
                            +{item.tags.length} тег{item.tags.length > 1 ? (item.tags.length < 5 ? 'а' : 'ов') : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}

      {filteredGear.length === 0 && userGear.length > 0 && (
        <Card className="py-12">
          <p className="text-mountain-muted text-center">Ничего не найдено. <button onClick={clearFilters} className="text-mountain-primary hover:underline">Сбросить фильтры</button></p>
        </Card>
      )}

      {userGear.length === 0 && (
        <Card className="py-12">
          <p className="text-mountain-muted text-center">Кладовка пуста. Добавь снаряжение из каталога или создай своё!</p>
        </Card>
      )}

      {/* Detail modal */}
      {selectedItem && (
        <GearDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={() => { loadUserGear(); setSelectedItem(null) }}
          onRemove={(id) => { removeItem(id); setSelectedItem(null) }}
        />
      )}

      {/* Add from catalog modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddModal(false)}>
          <div className="glass-card w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-mountain-border flex items-center justify-between">
              <h2 className="text-lg font-bold">Добавить из каталога</h2>
              <button onClick={() => setShowAddModal(false)} className="text-mountain-muted hover:text-mountain-text">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 border-b border-mountain-border space-y-3">
              <Input
                placeholder="Поиск снаряжения..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
              />
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setCatalogCategory(null)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${!catalogCategory ? 'bg-mountain-primary text-white' : 'bg-mountain-surface text-mountain-muted'}`}
                >
                  Все
                </button>
                {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                  <button
                    key={cat}
                    onClick={() => setCatalogCategory(cat)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${catalogCategory === cat ? CATEGORY_COLORS[cat] : 'bg-mountain-surface text-mountain-muted'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {filteredCatalog.map(item => (
                <button
                  key={item.id}
                  onClick={() => { addFromCatalog(item.id); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-mountain-surface transition-colors text-left"
                >
                  <div>
                    <p className="text-sm">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-xs ${CATEGORY_COLORS[item.category]}`}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                      {item.brand && <span className="text-xs text-mountain-muted">{item.brand}</span>}
                      {item.weight && <span className="text-xs text-mountain-muted">{item.weight}г</span>}
                    </div>
                  </div>
                  <Plus size={18} className="text-mountain-primary" />
                </button>
              ))}
              {filteredCatalog.length === 0 && (
                <p className="text-mountain-muted text-center py-8">Ничего не найдено</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom item modal */}
      {showCustomModal && <CustomItemModal onAdd={addCustomItem} onClose={() => setShowCustomModal(false)} />}
    </div>
  )
}

function CustomItemModal({ onAdd, onClose }: { onAdd: (name: string, category: string, weight: number | null, description: string, brand: string | null) => void; onClose: () => void }) {
  const [brandInput, setBrandInput] = useState('')
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false)

  const filteredBrands = POPULAR_BRANDS.filter(b =>
    b.toLowerCase().includes(brandInput.toLowerCase())
  ).slice(0, 8)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="glass-card w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Добавить своё снаряжение</h2>
        <form
          onSubmit={e => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            onAdd(
              fd.get('name') as string,
              fd.get('category') as string,
              fd.get('weight') ? Number(fd.get('weight')) : null,
              fd.get('description') as string || '',
              brandInput || null
            )
          }}
          className="space-y-3"
        >
          <Input name="name" label="Название" placeholder="Ледоруб Quark" required />

          {/* Brand with autocomplete */}
          <div className="space-y-1 relative">
            <label className="block text-sm text-mountain-muted">Фирма</label>
            <input
              value={brandInput}
              onChange={e => { setBrandInput(e.target.value); setShowBrandSuggestions(true) }}
              onFocus={() => setShowBrandSuggestions(true)}
              onBlur={() => setTimeout(() => setShowBrandSuggestions(false), 200)}
              placeholder="Petzl, Black Diamond, Mammut..."
              className="w-full rounded-xl border border-mountain-border bg-mountain-surface px-4 py-2 text-sm text-mountain-text placeholder:text-mountain-muted/50 focus:border-mountain-primary focus:outline-none"
            />
            {showBrandSuggestions && brandInput && filteredBrands.length > 0 && (
              <div className="absolute z-10 top-full mt-1 w-full bg-mountain-surface border border-mountain-border rounded-xl shadow-lg overflow-hidden">
                {filteredBrands.map(brand => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => { setBrandInput(brand); setShowBrandSuggestions(false) }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-mountain-primary/10 text-mountain-text transition-colors"
                  >
                    {brand}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm text-mountain-muted">Категория</label>
            <select
              name="category"
              className="w-full rounded-xl border border-mountain-border bg-mountain-surface px-4 py-2 text-mountain-text text-sm"
              required
            >
              {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <Input name="weight" label="Вес (граммы)" type="number" placeholder="500" />
          <Input name="description" label="Описание" placeholder="Описание (опционально)" />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={onClose}>Отмена</Button>
            <Button type="submit">Добавить</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
