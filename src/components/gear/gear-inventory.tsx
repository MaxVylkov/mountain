'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, Trash2, Weight, X } from 'lucide-react'
import { GearExcelImport } from './gear-excel-import'

interface GearItem {
  id: string
  name: string
  category: string
  description: string | null
  weight: number | null
}

interface UserGearItem {
  id: string
  gear_id: string
  condition: string
  notes: string | null
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

const CATEGORY_COLORS: Record<string, string> = {
  clothing: 'bg-purple-500/20 text-purple-400',
  footwear: 'bg-amber-500/20 text-amber-400',
  hardware: 'bg-blue-500/20 text-blue-400',
  ropes: 'bg-green-500/20 text-green-400',
  bivouac: 'bg-orange-500/20 text-orange-400',
  electronics: 'bg-cyan-500/20 text-cyan-400',
  other: 'bg-mountain-muted/20 text-mountain-muted',
}

export function GearInventory({ catalog, userId }: { catalog: GearItem[]; userId: string }) {
  const [userGear, setUserGear] = useState<UserGearItem[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

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

  async function addFromCatalog(gearId: string) {
    const supabase = createClient()
    await supabase.from('user_gear').insert({ user_id: userId, gear_id: gearId })
    await loadUserGear()
  }

  async function addCustomItem(name: string, category: string, weight: number | null, description: string) {
    const supabase = createClient()
    // First create a gear item, then add to user_gear
    const { data: newGear } = await supabase
      .from('gear')
      .insert({ name, category, weight, description })
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

  // Group by category
  const grouped = userGear.reduce<Record<string, UserGearItem[]>>((acc, item) => {
    const cat = item.gear?.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const totalWeight = userGear.reduce((sum, item) => sum + (item.gear?.weight || 0), 0)
  const totalItems = userGear.length

  // Catalog filtered for add modal
  const existingGearIds = new Set(userGear.map(g => g.gear_id))
  const filteredCatalog = catalog.filter(g => {
    if (existingGearIds.has(g.id)) return false
    if (searchQuery && !g.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterCategory && g.category !== filterCategory) return false
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
              {items.map(item => (
                <Card key={item.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{item.gear?.name}</p>
                    {item.gear?.weight && (
                      <p className="text-xs text-mountain-muted flex items-center gap-1">
                        <Weight size={12} />
                        {item.gear.weight}г
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-mountain-muted hover:text-mountain-danger transition-colors"
                    title="Убрать"
                  >
                    <Trash2 size={16} />
                  </button>
                </Card>
              ))}
            </div>
          </div>
        )
      })}

      {userGear.length === 0 && (
        <Card className="py-12">
          <p className="text-mountain-muted text-center">Кладовка пуста. Добавь снаряжение из каталога или создай своё!</p>
        </Card>
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
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => setFilterCategory(null)}
                  className={`px-2 py-1 rounded text-xs transition-colors ${!filterCategory ? 'bg-mountain-primary text-white' : 'bg-mountain-surface text-mountain-muted'}`}
                >
                  Все
                </button>
                {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${filterCategory === cat ? CATEGORY_COLORS[cat] : 'bg-mountain-surface text-mountain-muted'}`}
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
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCustomModal(false)}>
          <div className="glass-card w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Добавить своё снаряжение</h2>
            <form
              onSubmit={e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                addCustomItem(
                  fd.get('name') as string,
                  fd.get('category') as string,
                  fd.get('weight') ? Number(fd.get('weight')) : null,
                  fd.get('description') as string || ''
                )
              }}
              className="space-y-3"
            >
              <Input name="name" label="Название" placeholder="Мой ледоруб" required />
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
                <Button variant="outline" type="button" onClick={() => setShowCustomModal(false)}>Отмена</Button>
                <Button type="submit">Добавить</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
