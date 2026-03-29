'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { X, Upload } from 'lucide-react'
import {
  LEVEL_KEYS, LEVEL_LABELS, GearLevel,
  getItemsForLevel,
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
  existingItems: RequiredGearItem[]
  memberCount: number
  onClose: () => void
  onRefresh: () => void
  onDone: () => void
}

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

  const handleSelectLevel = (level: GearLevel) => {
    setSelected({ type: 'level', key: level })
    setPreviewItems(getItemsForLevel(level))
  }

  const handleSelectSet = (setId: string) => {
    const ps = packingSets.find(s => s.id === setId)
    if (!ps) return
    setSelected({ type: 'set', key: setId })
    const items: TemplateItem[] = ps.itemNames.map(name => ({
      name,
      section: 'personal' as const,
      minLevel: 'light_trek' as const,
    }))
    setPreviewItems(items)
  }

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
    e.target.value = ''
  }

  const applyLeader = async () => {
    setApplying(true)
    const supabase = createClient()

    const incomingNames = new Set(previewItems.map(i => i.name.toLowerCase()))
    const existingNames = new Set(existingItems.map(i => i.name.toLowerCase()))

    const toAdd = previewItems.filter(i => !existingNames.has(i.name.toLowerCase()))
    const toRemove = existingItems.filter(i => !incomingNames.has(i.name.toLowerCase()))

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

    if (toRemove.length > 0) {
      await supabase
        .from('team_required_gear')
        .delete()
        .in('id', toRemove.map(i => i.id))
    }

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

  const applyMember = async () => {
    setApplying(true)
    const supabase = createClient()

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
    onRefresh()
  }

  // memberCount is part of the interface for future use (e.g. norm calculations)
  void memberCount

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
