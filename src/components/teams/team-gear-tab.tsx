'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LayoutList, LayoutGrid, Plus, Edit2, PackageOpen, Download, BookmarkPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GearPickerModal } from './gear-picker-modal'
import { GearSvodkaView } from './gear-svodka-view'
import { GearKartochkiView } from './gear-kartochki-view'
import { RequiredGearItem, MemberGearEntry, Member, SECTIONS, SECTION_KEYS, getRequired } from './gear-constants'
import * as XLSX from 'xlsx'

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
      return (localStorage.getItem(storageKey) as ViewMode) ?? 'kartochki'
    }
    return 'kartochki'
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
    const prevItems = items
    const prevMemberGear = memberGear
    setItems(prev => prev.filter(i => i.id !== id))
    setMemberGear(prev => prev.filter(e => e.required_gear_id !== id))

    const supabase = createClient()
    const { error } = await supabase.from('team_required_gear').delete().eq('id', id)
    if (error) {
      setItems(prevItems)
      setMemberGear(prevMemberGear)
    }
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

  const exportXlsx = () => {
    const wb = XLSX.utils.book_new()

    for (const section of SECTION_KEYS) {
      const sectionItems = items.filter(i => i.section === section)
      if (sectionItems.length === 0) continue

      const header = ['Наименование', 'Норма', ...members.map(m => m.display_name), 'Итого', 'Нужно']
      const rows = sectionItems.map(item => {
        const norm = getRequired(item, members.length)
        const memberQtys = members.map(m =>
          memberGear.find(e => e.required_gear_id === item.id && e.user_id === m.user_id)?.quantity ?? 0
        )
        const total = memberQtys.reduce((s, q) => s + q, 0)
        return [
          item.name,
          norm ?? '—',
          ...memberQtys,
          total,
          norm != null ? (norm - total !== 0 ? norm - total : '✓') : '—',
        ]
      })

      const ws = XLSX.utils.aoa_to_sheet([header, ...rows])
      ws['!cols'] = [{ wch: 30 }, { wch: 8 }, ...members.map(() => ({ wch: 12 })), { wch: 8 }, { wch: 8 }]
      XLSX.utils.book_append_sheet(wb, ws, SECTIONS[section].slice(0, 31))
    }

    XLSX.writeFile(wb, 'снаряжение_отделения.xlsx')
  }

  const saveGroupTemplate = async () => {
    const groupItems = items.filter(i => i.section === 'group')
    if (groupItems.length === 0) return

    const name = prompt('Название шаблона:')
    if (!name?.trim()) return

    const supabase = createClient()
    const templateItems = groupItems.map(i => ({
      name: i.name,
      section: i.section,
      norm_per_person: i.norm_per_person,
      norm_per_team: i.norm_per_team,
    }))

    const { error } = await supabase.from('team_gear_templates').insert({
      user_id: currentUserId,
      name: name.trim(),
      items: templateItems,
    })

    if (error) alert('Ошибка: ' + error.message)
    else alert('Шаблон сохранён!')
  }

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
        {hasItems && (
          <Button variant="outline" onClick={exportXlsx}>
            <Download className="w-4 h-4 mr-1.5" />
            Скачать .xlsx
          </Button>
        )}
        {hasItems && isLeader && items.some(i => i.section === 'group') && (
          <Button variant="outline" onClick={saveGroupTemplate}>
            <BookmarkPlus className="w-4 h-4 mr-1.5" />
            Сохранить шаблон
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
          onSaveCell={handleSaveCell}
        />
      )}

      {/* Legend (Svodka only) */}
      {hasItems && view === 'svodka' && (
        <div className="flex flex-wrap gap-4 text-xs text-mountain-muted px-1">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/20 inline-block" /> Достаточно</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/20 inline-block" /> Не хватает</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-500/20 inline-block" /> Лишнее</span>
          <span className="flex items-center gap-1.5 text-mountain-primary">● Колонка «Моё» — нажмите для быстрого ввода</span>
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
          onRefresh={load}
          onDone={() => { setShowPicker(false); load() }}
        />
      )}
    </div>
  )
}
