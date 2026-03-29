'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { X, Plus, Package } from 'lucide-react'

interface TeamGearProps {
  teamId: string
  members: { user_id: string; display_name: string }[]
  currentUserId: string
}

interface GearItem {
  id: string
  team_id: string
  name: string
  category: string
  weight: number | null
  quantity: number
  assigned_to: string | null
  is_group: boolean
  created_at: string
}

const CATEGORIES: Record<string, string> = {
  ropes: 'Верёвки',
  hardware: 'Железо',
  clothing: 'Одежда',
  footwear: 'Обувь',
  bivouac: 'Бивуак',
  electronics: 'Электроника',
  group: 'Групповое',
  other: 'Другое',
}

const CATEGORY_KEYS = Object.keys(CATEGORIES)

export function TeamGear({ teamId, members, currentUserId }: TeamGearProps) {
  const [gear, setGear] = useState<GearItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [category, setCategory] = useState('other')
  const [weight, setWeight] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [assignedTo, setAssignedTo] = useState('')
  const [isGroup, setIsGroup] = useState(false)

  const loadGear = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('team_gear')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at')
    if (data) setGear(data as GearItem[])
    setLoading(false)
  }, [teamId])

  useEffect(() => {
    loadGear()
  }, [loadGear])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSubmitting(true)
    const supabase = createClient()

    const { error } = await supabase.from('team_gear').insert({
      team_id: teamId,
      name: name.trim(),
      category,
      weight: weight ? parseInt(weight, 10) : null,
      quantity: parseInt(quantity, 10) || 1,
      assigned_to: assignedTo || null,
      is_group: isGroup,
    })

    if (!error) {
      setName('')
      setCategory('other')
      setWeight('')
      setQuantity('1')
      setAssignedTo('')
      setIsGroup(false)
      await loadGear()
    }

    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    await supabase.from('team_gear').delete().eq('id', id)
    setGear((prev) => prev.filter((item) => item.id !== id))
  }

  const getMemberName = (userId: string | null) => {
    if (!userId) return 'Не назначено'
    const member = members.find((m) => m.user_id === userId)
    return member?.display_name ?? 'Не назначено'
  }

  const totalWeight = gear.reduce((sum, item) => {
    return sum + (item.weight ?? 0) * item.quantity
  }, 0)

  const formatWeight = (grams: number) => {
    if (grams >= 1000) return `${(grams / 1000).toFixed(1)} кг`
    return `${grams} г`
  }

  if (loading) {
    return (
      <div className="text-mountain-muted text-center py-12">Загрузка...</div>
    )
  }

  const inputClass =
    'w-full rounded-xl bg-mountain-bg border border-mountain-border px-3 py-2 text-sm text-mountain-text placeholder:text-mountain-muted focus:outline-none focus:ring-1 focus:ring-mountain-primary'
  const selectClass =
    'w-full rounded-xl bg-mountain-bg border border-mountain-border px-3 py-2 text-sm text-mountain-text focus:outline-none focus:ring-1 focus:ring-mountain-primary'

  return (
    <div className="space-y-6">
      {/* Gear list */}
      {gear.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <Package className="w-10 h-10 text-mountain-muted mx-auto" />
          <p className="text-mountain-muted text-sm">Снаряжение ещё не добавлено</p>
        </div>
      ) : (
        <>
          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-[1fr_auto_auto_auto_1fr_auto_auto] gap-3 px-6 text-xs font-medium text-mountain-muted uppercase tracking-wider">
            <span>Предмет</span>
            <span>Категория</span>
            <span>Вес</span>
            <span>Кол-во</span>
            <span>Кто берёт</span>
            <span>Тип</span>
            <span></span>
          </div>

          <div className="space-y-2">
            {gear.map((item) => (
              <Card key={item.id}>
                {/* Desktop row */}
                <div className="hidden md:grid md:grid-cols-[1fr_auto_auto_auto_1fr_auto_auto] gap-3 items-center">
                  <span className="text-mountain-text font-medium truncate">{item.name}</span>
                  <span className="text-mountain-muted text-sm">
                    {CATEGORIES[item.category] ?? item.category}
                  </span>
                  <span className="text-mountain-muted text-sm">
                    {item.weight ? formatWeight(item.weight) : '—'}
                  </span>
                  <span className="text-mountain-muted text-sm text-center">{item.quantity}</span>
                  <span className="text-mountain-muted text-sm truncate">
                    {getMemberName(item.assigned_to)}
                  </span>
                  <span>
                    {item.is_group && (
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                        Общее
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-mountain-muted hover:text-mountain-danger transition-colors p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile layout */}
                <div className="md:hidden space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-mountain-text font-medium truncate">{item.name}</p>
                      <p className="text-mountain-muted text-xs">
                        {CATEGORIES[item.category] ?? item.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.is_group && (
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                          Общее
                        </span>
                      )}
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-mountain-muted hover:text-mountain-danger transition-colors p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-mountain-muted">
                    {item.weight && <span>{formatWeight(item.weight)}</span>}
                    <span>x{item.quantity}</span>
                    <span>{getMemberName(item.assigned_to)}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Total weight */}
          <div className="flex justify-end px-2">
            <span className="text-sm font-semibold text-mountain-text">
              Общий вес: {formatWeight(totalWeight)}
            </span>
          </div>
        </>
      )}

      {/* Add gear form */}
      <Card>
        <form onSubmit={handleAdd} className="space-y-4">
          <h3 className="text-mountain-text font-semibold">Добавить снаряжение</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder="Название предмета"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
              />
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={selectClass}
            >
              {CATEGORY_KEYS.map((key) => (
                <option key={key} value={key}>
                  {CATEGORIES[key]}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Вес (г)"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              min={0}
              className={inputClass}
            />

            <input
              type="number"
              placeholder="Кол-во"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min={1}
              className={inputClass}
            />

            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className={selectClass}
            >
              <option value="">Не назначено</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.display_name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-mountain-text cursor-pointer">
            <input
              type="checkbox"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.target.checked)}
              className="rounded border-mountain-border accent-mountain-primary"
            />
            Групповое снаряжение
          </label>

          <Button type="submit" disabled={submitting || !name.trim()} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-1" />
            {submitting ? 'Добавление...' : 'Добавить'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
