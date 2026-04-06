'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, Weight, Plus, Tag, Save, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { POPULAR_BRANDS } from './gear-inventory'

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

const CONDITION_LABELS: Record<string, { text: string; color: string }> = {
  new: { text: 'Новое', color: 'bg-mountain-success/20 text-mountain-success' },
  good: { text: 'Хорошее', color: 'bg-mountain-primary/20 text-mountain-primary' },
  worn: { text: 'Изношенное', color: 'bg-mountain-accent/20 text-mountain-accent' },
  needs_repair: { text: 'Нужен ремонт', color: 'bg-mountain-danger/20 text-mountain-danger' },
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

interface GearDetailModalProps {
  item: UserGearItem
  onClose: () => void
  onUpdate: () => void
  onRemove: (id: string) => void
  onSaleListingId?: string | null
}

export function GearDetailModal({ item, onClose, onUpdate, onRemove, onSaleListingId }: GearDetailModalProps) {
  const [condition, setCondition] = useState(item.condition)
  const [brand, setBrand] = useState(item.gear?.brand || '')
  const [showBrandSuggestions, setShowBrandSuggestions] = useState(false)
  const [notes, setNotes] = useState(item.notes || '')
  const [tags, setTags] = useState<string[]>(item.tags || [])
  const [newTag, setNewTag] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const filteredBrands = POPULAR_BRANDS.filter(b =>
    b.toLowerCase().includes(brand.toLowerCase())
  ).slice(0, 6)

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    // Update gear brand
    if (brand !== (item.gear?.brand || '')) {
      await supabase.from('gear').update({ brand: brand || null }).eq('id', item.gear_id)
    }
    await supabase
      .from('user_gear')
      .update({ condition, notes: notes || null, tags })
      .eq('id', item.id)
    setSaving(false)
    setSaved(true)
    onUpdate()
    setTimeout(() => setSaved(false), 1500)
  }

  function addTag() {
    const tag = newTag.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setNewTag('')
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter(t => t !== tag))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="surface-card w-full max-w-md p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-mountain-text">{item.gear?.name}</h2>
            <p className="text-xs text-mountain-muted mt-0.5">
              {CATEGORY_LABELS[item.gear?.category] || item.gear?.category}
              {item.gear?.weight && ` • ${item.gear.weight} г`}
            </p>
            <div className="mt-2">
              {/* On-sale badge */}
              {onSaleListingId && (
                <Link
                  href={`/marketplace/${onSaleListingId}`}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-500/10 border border-green-500/20 rounded px-2 py-0.5"
                >
                  <Tag size={10} />
                  На продаже
                </Link>
              )}

              {/* List for sale button */}
              {!onSaleListingId && (
                <Link
                  href={`/marketplace/new?gear_id=${item.id}`}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-mountain-muted border border-mountain-border rounded px-2 py-0.5 hover:border-mountain-primary/40 hover:text-mountain-text transition-colors"
                >
                  <Tag size={10} />
                  Выставить на продажу
                </Link>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-mountain-muted hover:text-mountain-text">
            <X size={20} />
          </button>
        </div>

        {/* Description */}
        {item.gear?.description && (
          <p className="text-sm text-mountain-muted">{item.gear.description}</p>
        )}

        {/* Brand */}
        <div className="space-y-2 relative">
          <label className="block text-sm text-mountain-muted">Фирма</label>
          <input
            value={brand}
            onChange={e => { setBrand(e.target.value); setShowBrandSuggestions(true) }}
            onFocus={() => setShowBrandSuggestions(true)}
            onBlur={() => setTimeout(() => setShowBrandSuggestions(false), 200)}
            placeholder="Petzl, Black Diamond..."
            className="w-full rounded-xl border border-mountain-border bg-mountain-surface px-4 py-2 text-sm text-mountain-text placeholder:text-mountain-muted/50 focus:border-mountain-primary focus:outline-none"
          />
          {showBrandSuggestions && brand && filteredBrands.length > 0 && (
            <div className="absolute z-10 top-full mt-1 w-full bg-mountain-surface border border-mountain-border rounded-xl shadow-lg overflow-hidden">
              {filteredBrands.map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => { setBrand(b); setShowBrandSuggestions(false) }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-mountain-primary/10 text-mountain-text transition-colors"
                >
                  {b}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Condition */}
        <div className="space-y-2">
          <label className="block text-sm text-mountain-muted">Состояние</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CONDITION_LABELS).map(([value, { text, color }]) => (
              <button
                key={value}
                onClick={() => setCondition(value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  condition === value
                    ? `${color} ring-1 ring-current`
                    : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'
                }`}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="block text-sm text-mountain-muted flex items-center gap-1">
            <Tag size={14} />
            Теги
          </label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-mountain-primary/10 text-mountain-primary"
              >
                #{tag}
                <button onClick={() => removeTag(tag)} className="hover:text-mountain-danger">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Добавить тег..."
              className="flex-1"
            />
            <button
              onClick={addTag}
              disabled={!newTag.trim()}
              className="px-3 py-2 rounded-xl bg-mountain-surface border border-mountain-border text-mountain-muted hover:text-mountain-primary disabled:opacity-30 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="block text-sm text-mountain-muted">Заметки</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Любые заметки о снаряжении..."
            className="w-full rounded-xl border border-mountain-border bg-mountain-surface px-4 py-2.5 text-sm text-mountain-text placeholder:text-mountain-muted/50 focus:border-mountain-primary focus:outline-none resize-none h-20"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => { onRemove(item.id); onClose() }}
            className="flex items-center gap-1.5 text-sm text-mountain-muted hover:text-mountain-danger transition-colors"
          >
            <Trash2 size={14} />
            Удалить
          </button>
          <Button onClick={handleSave} disabled={saving}>
            {saved ? (
              <span className="flex items-center gap-1.5">✓ Сохранено</span>
            ) : saving ? (
              'Сохраняю...'
            ) : (
              <span className="flex items-center gap-1.5"><Save size={14} /> Сохранить</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
