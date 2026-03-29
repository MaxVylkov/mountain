'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import {
  RequiredGearItem, MemberGearEntry, Member,
  SECTIONS, getRequired, getDeficit
} from './gear-constants'

interface GearSvodkaViewProps {
  items: RequiredGearItem[]
  memberGear: MemberGearEntry[]
  members: Member[]
  currentUserId: string
  isLeader: boolean
  onDeleteItem: (id: string) => void
  onSaveCell: (itemId: string, userId: string, quantity: number) => Promise<void>
}

// Group section rendered last
const SECTION_ORDER = ['personal', 'personal_items', 'clothing', 'group'] as const

export function GearSvodkaView({
  items, memberGear, members, currentUserId, isLeader, onDeleteItem, onSaveCell
}: GearSvodkaViewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{ itemId: string; userId: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingCell) inputRef.current?.focus()
  }, [editingCell])

  const getQuantity = (itemId: string, userId: string) =>
    memberGear.find(e => e.required_gear_id === itemId && e.user_id === userId)?.quantity ?? 0

  const getTotal = (itemId: string) =>
    memberGear.filter(e => e.required_gear_id === itemId).reduce((s, e) => s + e.quantity, 0)

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const startEdit = (itemId: string, userId: string) => {
    if (userId !== currentUserId) return
    setEditingCell({ itemId, userId })
    setEditValue(String(getQuantity(itemId, userId)))
  }

  const commitEdit = () => {
    if (!editingCell) return
    const qty = Math.max(0, parseInt(editValue, 10) || 0)
    onSaveCell(editingCell.itemId, editingCell.userId, qty)
    setEditingCell(null)
  }

  const normLabel = (item: RequiredGearItem) => {
    if (item.norm_per_person !== null) return `${item.norm_per_person}/чел`
    if (item.norm_per_team !== null) return `${item.norm_per_team}/отд`
    return '—'
  }

  const deficitCell = (deficit: number | null) => {
    if (deficit === null) return <span className="text-mountain-muted text-xs">—</span>
    if (deficit === 0) return <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400">✓</span>
    if (deficit > 0) return <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400">+{deficit}</span>
    return <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-amber-500/20 text-amber-400">{deficit}</span>
  }

  const colCount = isLeader ? 8 : 7

  return (
    <div className="rounded-xl border border-mountain-border overflow-hidden">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-mountain-surface border-b border-mountain-border">
            <th className="px-3 py-2.5 text-left text-xs font-medium text-mountain-muted uppercase tracking-wider w-6"></th>
            <th className="px-3 py-2.5 text-left text-xs font-medium text-mountain-muted uppercase tracking-wider">Снаряжение</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-mountain-primary uppercase tracking-wider">Моё</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-mountain-muted uppercase tracking-wider">В наличии</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-mountain-muted uppercase tracking-wider">Норма</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-mountain-muted uppercase tracking-wider">Необходимо</th>
            <th className="px-3 py-2.5 text-center text-xs font-medium text-mountain-muted uppercase tracking-wider">Добрать</th>
            {isLeader && <th className="w-8" />}
          </tr>
        </thead>
        {SECTION_ORDER.map(section => {
          const sectionItems = items.filter(i => i.section === section)
          if (sectionItems.length === 0) return null
          return (
            <tbody key={section}>
              <tr className="bg-mountain-bg/60">
                <td colSpan={colCount} className="px-3 py-1.5 text-xs font-semibold text-mountain-primary uppercase tracking-wider border-y border-mountain-border">
                  {SECTIONS[section]}
                </td>
              </tr>
              {sectionItems.map(item => {
                const total = getTotal(item.id)
                const required = getRequired(item, members.length)
                const deficit = getDeficit(item, members.length, total)
                const expanded = expandedRows.has(item.id)
                const myQty = getQuantity(item.id, currentUserId)
                const isEditingMyCell = editingCell?.itemId === item.id && editingCell?.userId === currentUserId

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      className="border-b border-mountain-border/40 hover:bg-mountain-surface/30 transition-colors cursor-pointer"
                      onClick={() => toggleRow(item.id)}
                    >
                      <td className="px-3 py-2.5 text-mountain-muted">
                        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </td>
                      <td className="px-3 py-2.5 text-mountain-text font-medium">{item.name}</td>
                      <td
                        className="px-3 py-2 text-center"
                        onClick={e => { e.stopPropagation(); startEdit(item.id, currentUserId) }}
                      >
                        {isEditingMyCell ? (
                          <input
                            ref={inputRef}
                            type="number"
                            min={0}
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitEdit()
                              if (e.key === 'Escape') setEditingCell(null)
                            }}
                            className="w-12 text-center rounded border border-mountain-primary bg-mountain-bg text-mountain-text text-xs focus:outline-none"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-semibold cursor-pointer transition-colors ${
                            myQty > 0
                              ? 'bg-mountain-primary/15 text-mountain-primary hover:bg-mountain-primary/25'
                              : 'text-mountain-muted hover:bg-mountain-surface hover:text-mountain-text'
                          }`}>
                            {myQty > 0 ? myQty : '+'}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium text-mountain-text">{total}</td>
                      <td className="px-3 py-2.5 text-center text-xs text-mountain-muted">{normLabel(item)}</td>
                      <td className="px-3 py-2.5 text-center text-mountain-muted">{required ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center">{deficitCell(deficit)}</td>
                      {isLeader && (
                        <td className="px-2 py-2.5">
                          <button
                            onClick={e => { e.stopPropagation(); onDeleteItem(item.id) }}
                            className="text-mountain-muted hover:text-red-400 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                    {expanded && (
                      <tr className="border-b border-mountain-border/40 bg-mountain-bg/40">
                        <td />
                        <td colSpan={isLeader ? 7 : 6} className="px-4 py-3">
                          <div className="flex flex-wrap gap-x-4 gap-y-1">
                            {members.map(m => {
                              const qty = getQuantity(item.id, m.user_id)
                              const isMine = m.user_id === currentUserId
                              const isEditing = editingCell?.itemId === item.id && editingCell?.userId === m.user_id
                              return (
                                <span
                                  key={m.user_id}
                                  className={`text-xs flex items-center gap-1 ${isMine ? 'cursor-pointer hover:text-mountain-primary' : ''}`}
                                  onClick={e => { e.stopPropagation(); startEdit(item.id, m.user_id) }}
                                >
                                  <span className={`font-medium ${isMine ? 'text-mountain-primary' : 'text-mountain-text'}`}>
                                    {m.display_name}:
                                  </span>
                                  {isEditing ? (
                                    <input
                                      ref={inputRef}
                                      type="number"
                                      min={0}
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      onBlur={commitEdit}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') commitEdit()
                                        if (e.key === 'Escape') setEditingCell(null)
                                      }}
                                      className="w-12 text-center rounded border border-mountain-primary bg-mountain-bg text-mountain-text text-xs focus:outline-none"
                                      onClick={e => e.stopPropagation()}
                                    />
                                  ) : (
                                    <span className={qty === 0 ? 'text-mountain-muted' : 'text-mountain-text'}>{qty}</span>
                                  )}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}
