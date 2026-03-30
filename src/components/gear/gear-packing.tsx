'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Backpack, Package, Check, Trash2, X, GripVertical } from 'lucide-react'

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

// ─── Draggable item row ───────────────────────────────────────────────────────

interface DraggableItemProps {
  item: PackingItem
  onPacked: (id: string) => void
  onRemove: (id: string) => void
}

function DraggableItem({ item, onPacked, onRemove }: DraggableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between px-3 py-2 rounded-lg bg-mountain-bg transition-opacity ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Drag handle */}
        <button
          {...listeners}
          {...attributes}
          aria-label="Перетащить вещь"
          className="cursor-grab active:cursor-grabbing text-mountain-muted hover:text-mountain-text touch-none p-1 shrink-0 rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-mountain-primary"
        >
          <GripVertical size={14} />
        </button>

        {/* Packed toggle */}
        <button
          onClick={() => onPacked(item.id)}
          aria-label={item.packed ? 'Отметить как неупакованное' : 'Отметить как упакованное'}
          aria-pressed={item.packed}
          className="p-1 rounded shrink-0"
        >
          <Check
            size={15}
            className={item.packed ? 'text-mountain-success' : 'text-mountain-muted'}
          />
        </button>

        {/* Name + weight */}
        <span
          className={`text-sm truncate ${
            item.packed ? 'line-through text-mountain-muted' : 'text-mountain-text'
          }`}
        >
          {item.gear?.name}
        </span>
        {item.gear?.weight != null && (
          <span className="text-xs text-mountain-muted shrink-0">{item.gear.weight}г</span>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={() => onRemove(item.id)}
        aria-label="Удалить"
        className="p-1.5 text-mountain-muted hover:text-mountain-danger rounded shrink-0 ml-2"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

// ─── Item ghost shown in DragOverlay ─────────────────────────────────────────

function ItemGhost({ item }: { item: PackingItem }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-mountain-surface border border-mountain-primary shadow-xl text-sm text-mountain-text pointer-events-none">
      <GripVertical size={14} className="text-mountain-primary" />
      <span>{item.gear?.name}</span>
      {item.gear?.weight != null && (
        <span className="text-xs text-mountain-muted">{item.gear.weight}г</span>
      )}
    </div>
  )
}

// ─── Droppable backpack section ───────────────────────────────────────────────

interface DroppableBackpackProps {
  id: string
  label: string
  sublabel?: string
  weightLabel?: string
  isOver: boolean
  isEmpty: boolean
  emptyText: string
  children: React.ReactNode
}

function DroppableBackpack({
  id,
  label,
  sublabel,
  weightLabel,
  isOver,
  isEmpty,
  emptyText,
  children,
}: DroppableBackpackProps) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <Card
      ref={setNodeRef}
      className={`space-y-3 transition-colors duration-150 ${
        isOver ? 'border-mountain-primary bg-mountain-primary/5' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <Backpack size={18} className="text-mountain-primary shrink-0" />
          <span>{label}</span>
          {sublabel && <span className="text-xs text-mountain-muted font-normal">{sublabel}</span>}
        </h3>
        {weightLabel && (
          <span className="text-sm font-mono text-mountain-accent">{weightLabel}</span>
        )}
      </div>

      {isEmpty ? (
        <p className={`text-sm py-2 text-center border border-dashed rounded-lg transition-colors ${
          isOver
            ? 'border-mountain-primary text-mountain-primary bg-mountain-primary/5'
            : 'border-mountain-border text-mountain-muted'
        }`}>
          {isOver ? 'Отпустить здесь' : emptyText}
        </p>
      ) : (
        <div className="space-y-1">{children}</div>
      )}
    </Card>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GearPacking({ userId }: { userId: string }) {
  const [sets, setSets] = useState<PackingSet[]>([])
  const [selectedSet, setSelectedSet] = useState<string | null>(null)
  const [backpacks, setBackpacks] = useState<PackingBackpack[]>([])
  const [items, setItems] = useState<PackingItem[]>([])
  const [userGear, setUserGear] = useState<any[]>([])
  const [showCreateSet, setShowCreateSet] = useState(false)
  const [showAddBackpack, setShowAddBackpack] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)

  // DnD state
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

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
  useEffect(() => { if (selectedSet) loadSetDetails(selectedSet) }, [selectedSet, loadSetDetails])

  async function createSet(name: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('packing_sets')
      .insert({ user_id: userId, name })
      .select()
      .single()
    if (data) { setSets(prev => [data, ...prev]); setSelectedSet(data.id) }
    setShowCreateSet(false)
  }

  async function deleteSet(setId: string) {
    const supabase = createClient()
    await supabase.from('packing_sets').delete().eq('id', setId)
    setSets(prev => prev.filter(s => s.id !== setId))
    if (selectedSet === setId) { setSelectedSet(null); setBackpacks([]); setItems([]) }
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

  async function addItemToSet(gearId: string) {
    if (!selectedSet) return
    const supabase = createClient()
    const { data } = await supabase
      .from('packing_items')
      .insert({ packing_set_id: selectedSet, gear_id: gearId, backpack_id: null })
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

  // DnD handlers
  function handleDragStart(event: DragStartEvent) {
    setDraggingId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over?.id as string ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setDraggingId(null)
    setOverId(null)
    if (!over) return
    const itemId = active.id as string
    const targetId = over.id as string
    const targetBpId = targetId === 'unassigned' ? null : targetId
    const item = items.find(i => i.id === itemId)
    if (!item) return
    // No-op if already in the same zone
    if (item.backpack_id === targetBpId) return
    moveItem(itemId, targetBpId)
  }

  const draggingItem = draggingId ? items.find(i => i.id === draggingId) : null
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
                : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'
            }`}
          >
            {s.name}
          </button>
        ))}
        {showCreateSet ? (
          <form
            onSubmit={e => { e.preventDefault(); createSet(new FormData(e.currentTarget).get('name') as string) }}
            className="flex items-center gap-2"
          >
            <input
              name="name"
              autoFocus
              placeholder="Название набора..."
              required
              className="px-3 py-2 rounded-xl border border-mountain-primary bg-mountain-surface text-sm text-mountain-text placeholder:text-mountain-muted focus:outline-none"
            />
            <Button type="submit" className="py-2">Создать</Button>
            <button type="button" onClick={() => setShowCreateSet(false)} aria-label="Отмена" className="p-2 text-mountain-muted hover:text-mountain-text">
              <X size={16} />
            </button>
          </form>
        ) : (
          <Button variant="outline" onClick={() => setShowCreateSet(true)}>
            <Plus size={16} className="mr-1" /> Новый набор
          </Button>
        )}
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

          {items.length === 0 && backpacks.length === 0 ? (
            <Card className="py-12">
              <p className="text-mountain-muted text-center">Добавь рюкзаки и вещи для сборов</p>
            </Card>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {/* Unassigned — staging area at top */}
              {(unassignedItems.length > 0 || backpacks.length === 0) && (
                <DroppableBackpack
                  id="unassigned"
                  label="Не распределено"
                  sublabel={unassignedItems.length > 0 ? `(${unassignedItems.length})` : undefined}
                  isOver={overId === 'unassigned'}
                  isEmpty={unassignedItems.length === 0}
                  emptyText="Все вещи распределены"
                >
                  {unassignedItems.map(item => (
                    <DraggableItem
                      key={item.id}
                      item={item}
                      onPacked={togglePacked}
                      onRemove={removeItem}
                    />
                  ))}
                </DroppableBackpack>
              )}

              {/* Backpack sections */}
              {backpacks.map(bp => {
                const bpItems = items.filter(i => i.backpack_id === bp.id)
                const bpWeight = getBackpackWeight(bp.id)
                return (
                  <DroppableBackpack
                    key={bp.id}
                    id={bp.id}
                    label={bp.name}
                    sublabel={bp.volume_liters ? `(${bp.volume_liters}л)` : undefined}
                    weightLabel={`${(bpWeight / 1000).toFixed(1)} кг`}
                    isOver={overId === bp.id}
                    isEmpty={bpItems.length === 0}
                    emptyText="Рюкзак пуст — перетащи вещи сюда"
                  >
                    {bpItems.map(item => (
                      <DraggableItem
                        key={item.id}
                        item={item}
                        onPacked={togglePacked}
                        onRemove={removeItem}
                      />
                    ))}
                  </DroppableBackpack>
                )
              })}

              {/* Drag overlay ghost */}
              <DragOverlay dropAnimation={null}>
                {draggingItem ? <ItemGhost item={draggingItem} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      ) : (
        <Card className="py-12">
          <p className="text-mountain-muted text-center">
            {sets.length > 0 ? 'Выбери набор или создай новый' : 'Создай первый набор для сборов'}
          </p>
        </Card>
      )}

      {/* Add backpack modal */}
      {showAddBackpack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddBackpack(false)}>
          <div className="surface-card w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
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
          <div className="surface-card w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-mountain-border flex items-center justify-between">
              <h2 className="text-lg font-bold">Добавить из инвентаря</h2>
              <button onClick={() => setShowAddItem(false)} aria-label="Закрыть" className="text-mountain-muted hover:text-mountain-text">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {userGear.filter(ug => !items.some(i => i.gear_id === ug.gear?.id)).map((ug: any) => (
                <button
                  key={ug.id}
                  onClick={() => { addItemToSet(ug.gear.id) }}
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
