'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Backpack, Package, Check, Trash2, Weight, X } from 'lucide-react'

interface PackingSet {
  id: string
  name: string
  route_id: string | null
}

interface PackingBackpack {
  id: string
  packing_set_id: string
  name: string
  volume_liters: number | null
}

interface PackingItem {
  id: string
  packing_set_id: string
  gear_id: string
  backpack_id: string | null
  packed: boolean
  gear: { name: string; weight: number | null; category: string }
}

export function GearPacking({ userId }: { userId: string }) {
  const [sets, setSets] = useState<PackingSet[]>([])
  const [selectedSet, setSelectedSet] = useState<string | null>(null)
  const [backpacks, setBackpacks] = useState<PackingBackpack[]>([])
  const [items, setItems] = useState<PackingItem[]>([])
  const [userGear, setUserGear] = useState<any[]>([])
  const [showCreateSet, setShowCreateSet] = useState(false)
  const [showAddBackpack, setShowAddBackpack] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)

  const loadSets = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('packing_sets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (data) setSets(data)
  }, [userId])

  const loadSetDetails = useCallback(async (setId: string) => {
    const supabase = createClient()
    const [bpRes, itemRes] = await Promise.all([
      supabase.from('packing_backpacks').select('*').eq('packing_set_id', setId),
      supabase.from('packing_items').select('*, gear(name, weight, category)').eq('packing_set_id', setId),
    ])
    if (bpRes.data) setBackpacks(bpRes.data)
    if (itemRes.data) setItems(itemRes.data as any)
  }, [])

  const loadUserGear = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('user_gear')
      .select('*, gear(id, name, weight, category)')
      .eq('user_id', userId)
    if (data) setUserGear(data)
  }, [userId])

  useEffect(() => { loadSets(); loadUserGear() }, [loadSets, loadUserGear])

  useEffect(() => {
    if (selectedSet) loadSetDetails(selectedSet)
  }, [selectedSet, loadSetDetails])

  async function createSet(name: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('packing_sets')
      .insert({ user_id: userId, name })
      .select()
      .single()
    if (data) {
      setSets(prev => [data, ...prev])
      setSelectedSet(data.id)
    }
    setShowCreateSet(false)
  }

  async function deleteSet(setId: string) {
    const supabase = createClient()
    await supabase.from('packing_sets').delete().eq('id', setId)
    setSets(prev => prev.filter(s => s.id !== setId))
    if (selectedSet === setId) {
      setSelectedSet(null)
      setBackpacks([])
      setItems([])
    }
  }

  async function addBackpack(name: string, volume: number | null) {
    if (!selectedSet) return
    const supabase = createClient()
    const { data } = await supabase
      .from('packing_backpacks')
      .insert({ packing_set_id: selectedSet, name, volume_liters: volume })
      .select()
      .single()
    if (data) setBackpacks(prev => [...prev, data])
    setShowAddBackpack(false)
  }

  async function addItemToSet(gearId: string, backpackId: string | null) {
    if (!selectedSet) return
    const supabase = createClient()
    const { data } = await supabase
      .from('packing_items')
      .insert({ packing_set_id: selectedSet, gear_id: gearId, backpack_id: backpackId })
      .select('*, gear(name, weight, category)')
      .single()
    if (data) setItems(prev => [...prev, data as any])
  }

  async function moveItem(itemId: string, backpackId: string | null) {
    const supabase = createClient()
    await supabase.from('packing_items').update({ backpack_id: backpackId }).eq('id', itemId)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, backpack_id: backpackId } : i))
  }

  async function togglePacked(itemId: string) {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    const supabase = createClient()
    await supabase.from('packing_items').update({ packed: !item.packed }).eq('id', itemId)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, packed: !i.packed } : i))
  }

  async function removeItem(itemId: string) {
    const supabase = createClient()
    await supabase.from('packing_items').delete().eq('id', itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }

  function getBackpackWeight(bpId: string | null): number {
    return items
      .filter(i => i.backpack_id === bpId)
      .reduce((sum, i) => sum + (i.gear?.weight || 0), 0)
  }

  const unassignedItems = items.filter(i => !i.backpack_id)
  const totalWeight = items.reduce((sum, i) => sum + (i.gear?.weight || 0), 0)
  const packedCount = items.filter(i => i.packed).length

  const currentSet = sets.find(s => s.id === selectedSet)

  return (
    <div className="space-y-6">
      {/* Set selector */}
      <div className="flex items-center gap-3 flex-wrap">
        {sets.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSet(s.id)}
            className={`px-4 py-2 rounded-xl text-sm transition-colors ${
              selectedSet === s.id
                ? 'bg-mountain-primary text-white'
                : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text'
            }`}
          >
            {s.name}
          </button>
        ))}
        <Button variant="outline" onClick={() => setShowCreateSet(true)}>
          <Plus size={16} className="mr-1" /> Новый набор
        </Button>
      </div>

      {currentSet ? (
        <div className="space-y-6">
          {/* Set header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{currentSet.name}</h2>
            <div className="flex items-center gap-4 text-sm text-mountain-muted">
              <span className="font-mono">{(totalWeight / 1000).toFixed(1)} кг</span>
              <span>{packedCount}/{items.length} упаковано</span>
              <button onClick={() => deleteSet(currentSet.id)} className="text-mountain-danger hover:underline">Удалить</button>
            </div>
          </div>

          {/* Add buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddBackpack(true)}>
              <Backpack size={16} className="mr-1" /> Добавить рюкзак
            </Button>
            <Button variant="outline" onClick={() => setShowAddItem(true)}>
              <Package size={16} className="mr-1" /> Добавить вещь
            </Button>
          </div>

          {/* Backpacks */}
          {backpacks.map(bp => {
            const bpItems = items.filter(i => i.backpack_id === bp.id)
            const bpWeight = getBackpackWeight(bp.id)
            return (
              <Card key={bp.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium flex items-center gap-2">
                    <Backpack size={18} className="text-mountain-primary" />
                    {bp.name}
                    {bp.volume_liters && <span className="text-xs text-mountain-muted">({bp.volume_liters}л)</span>}
                  </h3>
                  <span className="text-sm font-mono text-mountain-accent">{(bpWeight / 1000).toFixed(1)} кг</span>
                </div>
                {bpItems.length > 0 ? (
                  <div className="space-y-1">
                    {bpItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-mountain-bg">
                        <div className="flex items-center gap-2">
                          <button onClick={() => togglePacked(item.id)}>
                            <Check size={16} className={item.packed ? 'text-mountain-success' : 'text-mountain-muted'} />
                          </button>
                          <span className={`text-sm ${item.packed ? 'line-through text-mountain-muted' : ''}`}>
                            {item.gear?.name}
                          </span>
                          {item.gear?.weight && <span className="text-xs text-mountain-muted">{item.gear.weight}г</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <select
                            value={item.backpack_id || ''}
                            onChange={e => moveItem(item.id, e.target.value || null)}
                            className="text-xs bg-mountain-surface border border-mountain-border rounded px-1 py-0.5 text-mountain-muted"
                          >
                            <option value="">Не распределено</option>
                            {backpacks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                          <button onClick={() => removeItem(item.id)} className="text-mountain-muted hover:text-mountain-danger">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-mountain-muted">Рюкзак пуст</p>
                )}
              </Card>
            )
          })}

          {/* Unassigned items */}
          {unassignedItems.length > 0 && (
            <Card className="space-y-3">
              <h3 className="font-medium text-mountain-muted">Не распределено ({unassignedItems.length})</h3>
              <div className="space-y-1">
                {unassignedItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-mountain-bg">
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePacked(item.id)}>
                        <Check size={16} className={item.packed ? 'text-mountain-success' : 'text-mountain-muted'} />
                      </button>
                      <span className="text-sm">{item.gear?.name}</span>
                      {item.gear?.weight && <span className="text-xs text-mountain-muted">{item.gear.weight}г</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value=""
                        onChange={e => moveItem(item.id, e.target.value || null)}
                        className="text-xs bg-mountain-surface border border-mountain-border rounded px-1 py-0.5 text-mountain-muted"
                      >
                        <option value="">Выбрать рюкзак</option>
                        {backpacks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <button onClick={() => removeItem(item.id)} className="text-mountain-muted hover:text-mountain-danger">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {items.length === 0 && backpacks.length === 0 && (
            <Card className="py-12">
              <p className="text-mountain-muted text-center">Добавь рюкзаки и вещи для сборов</p>
            </Card>
          )}
        </div>
      ) : (
        <Card className="py-12">
          <p className="text-mountain-muted text-center">
            {sets.length > 0 ? 'Выбери набор или создай новый' : 'Создай первый набор для сборов'}
          </p>
        </Card>
      )}

      {/* Create set modal */}
      {showCreateSet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreateSet(false)}>
          <div className="glass-card w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Новый набор сборов</h2>
            <form onSubmit={e => { e.preventDefault(); createSet(new FormData(e.currentTarget).get('name') as string) }} className="space-y-3">
              <Input name="name" label="Название" placeholder="Хибины, март 2026" required />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" type="button" onClick={() => setShowCreateSet(false)}>Отмена</Button>
                <Button type="submit">Создать</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add backpack modal */}
      {showAddBackpack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddBackpack(false)}>
          <div className="glass-card w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">Добавить рюкзак</h2>
            <form onSubmit={e => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              addBackpack(fd.get('name') as string, fd.get('volume') ? Number(fd.get('volume')) : null)
            }} className="space-y-3">
              <Input name="name" label="Название" placeholder="Основной рюкзак" required />
              <Input name="volume" label="Объём (литры)" type="number" placeholder="60" />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" type="button" onClick={() => setShowAddBackpack(false)}>Отмена</Button>
                <Button type="submit">Добавить</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add item modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddItem(false)}>
          <div className="glass-card w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-mountain-border flex items-center justify-between">
              <h2 className="text-lg font-bold">Добавить из инвентаря</h2>
              <button onClick={() => setShowAddItem(false)} className="text-mountain-muted hover:text-mountain-text"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {userGear.filter(ug => !items.some(i => i.gear_id === ug.gear?.id)).map((ug: any) => (
                <button
                  key={ug.id}
                  onClick={() => { addItemToSet(ug.gear.id, null); }}
                  className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-mountain-surface transition-colors text-left"
                >
                  <div>
                    <p className="text-sm">{ug.gear?.name}</p>
                    {ug.gear?.weight && <p className="text-xs text-mountain-muted">{ug.gear.weight}г</p>}
                  </div>
                  <Plus size={18} className="text-mountain-primary" />
                </button>
              ))}
              {userGear.length === 0 && (
                <p className="text-mountain-muted text-center py-8">Сначала добавь снаряжение в инвентарь</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
