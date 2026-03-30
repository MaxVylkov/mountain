'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Users, Minus, Plus } from 'lucide-react'
import { RequiredGearItem, MemberGearEntry, Member, SECTIONS, getRequired, getDeficit } from './gear-constants'

interface GearKartochkiViewProps {
  items: RequiredGearItem[]
  memberGear: MemberGearEntry[]
  members: Member[]
  currentUserId: string
  onSaveCell: (itemId: string, userId: string, quantity: number) => Promise<void>
}

export function GearKartochkiView({ items, memberGear, members, currentUserId, onSaveCell }: GearKartochkiViewProps) {
  const [groupExpanded, setGroupExpanded] = useState(false)
  // Current user's card is open by default
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set([currentUserId]))

  const toggleMember = (userId: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  const getQuantity = (itemId: string, userId: string) =>
    memberGear.find(e => e.required_gear_id === itemId && e.user_id === userId)?.quantity ?? 0

  const getTotal = (itemId: string) =>
    memberGear.filter(e => e.required_gear_id === itemId).reduce((s, e) => s + e.quantity, 0)

  const getBadge = (userId: string) => {
    const covered = items.filter(item => getQuantity(item.id, userId) > 0).length
    return { covered, total: items.length }
  }

  const adjust = (itemId: string, delta: number) => {
    const current = getQuantity(itemId, currentUserId)
    const next = Math.max(0, current + delta)
    onSaveCell(itemId, currentUserId, next)
  }

  const groupItems = items.filter(i => i.section === 'group')
  const allSections = (['personal', 'personal_items', 'clothing', 'group'] as const)
  const personalSections = (['personal', 'personal_items', 'clothing'] as const)

  const sortedMembers = [
    ...members.filter(m => m.user_id === currentUserId),
    ...members.filter(m => m.user_id !== currentUserId),
  ]

  return (
    <div className="space-y-4">

      {/* ── Member cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">

        {sortedMembers.map(member => {
          const isCurrent = member.user_id === currentUserId
          const { covered, total } = getBadge(member.user_id)
          const allGood = covered === total
          const expanded = expandedMembers.has(member.user_id)

          return (
            <div
              key={member.user_id}
              className={`surface-card p-4 space-y-3 ${isCurrent ? 'border-2 border-mountain-primary' : 'cursor-pointer select-none'}`}
              onClick={!isCurrent ? () => toggleMember(member.user_id) : undefined}
            >
              {/* Header */}
              <div
                className={isCurrent ? 'cursor-pointer select-none' : ''}
                onClick={isCurrent ? () => toggleMember(member.user_id) : undefined}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-mountain-text">{member.display_name}</span>
                    {isCurrent && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-mountain-primary/20 text-mountain-primary">Вы</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      allGood ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {covered} / {total} {allGood ? '✓' : '⚠'}
                    </span>
                    {expanded
                      ? <ChevronDown className="w-4 h-4 text-mountain-muted" />
                      : <ChevronRight className="w-4 h-4 text-mountain-muted" />}
                  </div>
                </div>
              </div>

              {/* Expanded: own card with +/− editing */}
              {expanded && isCurrent && (
                <div className="space-y-4 pt-2 border-t border-mountain-border/40">
                  {allSections.map(section => {
                    const sectionItems = items.filter(i => i.section === section)
                    if (sectionItems.length === 0) return null
                    const isGroupSection = section === 'group'
                    return (
                      <div key={section}>
                        <p className="text-xs font-semibold text-mountain-muted uppercase tracking-wide mb-2">
                          {SECTIONS[section]}
                        </p>
                        <div className="space-y-1">
                          {sectionItems.map(item => {
                            const qty = getQuantity(item.id, currentUserId)
                            const norm = item.norm_per_person
                            const missing = norm !== null && qty < norm
                            return (
                              <div key={item.id} className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {isGroupSection && (
                                    <span className="shrink-0 px-1 py-px rounded text-[10px] bg-emerald-500/15 text-emerald-400">Общее</span>
                                  )}
                                  <span className={`text-sm truncate ${
                                    missing ? 'text-red-400'
                                    : norm !== null && qty >= norm ? 'text-emerald-400'
                                    : qty > 0 ? 'text-mountain-text'
                                    : 'text-mountain-muted'
                                  }`}>
                                    {item.name}
                                  </span>
                                </div>
                                {/* +/− controls */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={e => { e.stopPropagation(); adjust(item.id, -1) }}
                                    disabled={qty === 0}
                                    className="w-6 h-6 flex items-center justify-center rounded border border-mountain-border text-mountain-muted hover:border-mountain-primary hover:text-mountain-text transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className={`min-w-[2.25rem] text-center text-sm font-semibold tabular-nums ${
                                    missing ? 'text-red-400'
                                    : norm !== null && qty >= norm ? 'text-emerald-400'
                                    : qty > 0 ? 'text-mountain-text'
                                    : 'text-mountain-muted'
                                  }`}>
                                    {norm !== null ? `${qty}/${norm}` : qty}
                                  </span>
                                  <button
                                    onClick={e => { e.stopPropagation(); adjust(item.id, +1) }}
                                    className="w-6 h-6 flex items-center justify-center rounded border border-mountain-border text-mountain-muted hover:border-mountain-primary hover:text-mountain-text transition-colors"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Expanded: other members — read-only */}
              {expanded && !isCurrent && (
                <div className="space-y-3 pt-2 border-t border-mountain-border/40">
                  {personalSections.map(section => {
                    const sectionItems = items.filter(i => i.section === section)
                    if (sectionItems.length === 0) return null
                    return (
                      <div key={section}>
                        <p className="text-xs text-mountain-muted uppercase tracking-wide mb-1">
                          {SECTIONS[section]}
                        </p>
                        <div className="space-y-0.5">
                          {sectionItems.map(item => {
                            const qty = getQuantity(item.id, member.user_id)
                            const norm = item.norm_per_person
                            const missing = norm !== null && qty < norm
                            return (
                              <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                                <span className={`truncate ${missing ? 'text-red-400' : qty > 0 ? 'text-mountain-text' : 'text-mountain-muted'}`}>
                                  {item.name}
                                </span>
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
                  {groupItems.some(item => getQuantity(item.id, member.user_id) > 0) && (
                    <div>
                      <p className="text-xs text-mountain-muted uppercase tracking-wide mb-1">{SECTIONS.group}</p>
                      <div className="space-y-0.5">
                        {groupItems.filter(item => getQuantity(item.id, member.user_id) > 0).map(item => (
                          <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="shrink-0 px-1 py-px rounded text-[10px] bg-emerald-500/15 text-emerald-400">Общее</span>
                              <span className="truncate text-mountain-text">{item.name}</span>
                            </div>
                            <span className="shrink-0 font-medium text-mountain-text">{getQuantity(item.id, member.user_id)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* ── Group gear card ─────────────────────────────────── */}
        {groupItems.length > 0 && (() => {
          const coveredGroup = groupItems.filter(item => {
            const deficit = getDeficit(item, members.length, getTotal(item.id))
            return deficit === null || deficit <= 0
          }).length
          const allGroupOk = coveredGroup === groupItems.length

          return (
            <div
              className="surface-card p-4 space-y-3 cursor-pointer select-none"
              onClick={() => setGroupExpanded(v => !v)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-mountain-muted" />
                  <span className="font-semibold text-mountain-text">Общаг</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-mountain-surface text-mountain-muted">
                    {groupItems.length} позиций
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    allGroupOk ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {coveredGroup} / {groupItems.length} {allGroupOk ? '✓' : '⚠'}
                  </span>
                  {groupExpanded
                    ? <ChevronDown className="w-4 h-4 text-mountain-muted" />
                    : <ChevronRight className="w-4 h-4 text-mountain-muted" />}
                </div>
              </div>

              {groupExpanded && (
                <div className="space-y-0.5 pt-1 border-t border-mountain-border/40" onClick={e => e.stopPropagation()}>
                  {groupItems.map(item => {
                    const total = getTotal(item.id)
                    const required = getRequired(item, members.length)
                    const deficit = getDeficit(item, members.length, total)
                    const contributors = members.filter(m => getQuantity(item.id, m.user_id) > 0)
                    return (
                      <div key={item.id} className="py-1.5 border-b border-mountain-border/20 last:border-0">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-mountain-text">{item.name}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-mountain-muted">
                              {total}{required !== null ? ` / ${required}` : ''}
                            </span>
                            {deficit === null ? (
                              <span className="text-xs text-mountain-muted w-6 text-center">—</span>
                            ) : deficit === 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400">✓</span>
                            ) : deficit > 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400">+{deficit}</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400">{deficit}</span>
                            )}
                          </div>
                        </div>
                        {contributors.length > 0 && (
                          <div className="flex flex-wrap gap-x-3 mt-0.5">
                            {contributors.map(m => (
                              <span key={m.user_id} className="text-xs text-mountain-muted">
                                {m.display_name}: {getQuantity(item.id, m.user_id)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
