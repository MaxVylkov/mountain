'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { CheckCircle, Circle, Loader2 } from 'lucide-react'

const DEFAULT_ITEMS = [
  'Снаряжение собрано',
  'Еда закуплена',
  'Документы готовы (страховка, пропуск)',
  'Физическая подготовка',
  'Медаптечка',
  'Связь (рация/телефон)',
]

interface TeamReadinessProps {
  teamId: string
  members: { user_id: string; display_name: string }[]
  currentUserId: string
  isLeader: boolean
}

interface ReadinessRecord {
  team_id: string
  user_id: string
  item: string
  checked: boolean
}

export function TeamReadiness({ teamId, members, currentUserId, isLeader }: TeamReadinessProps) {
  const [readiness, setReadiness] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<Set<string>>(new Set())

  const makeKey = (userId: string, item: string) => `${userId}::${item}`

  const loadReadiness = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('team_readiness')
      .select('*')
      .eq('team_id', teamId)

    if (error) {
      console.error('Error loading readiness:', error)
      setLoading(false)
      return
    }

    const existing = new Set((data as ReadinessRecord[]).map(r => makeKey(r.user_id, r.item)))
    const map = new Map<string, boolean>()

    // Set existing records
    for (const record of data as ReadinessRecord[]) {
      map.set(makeKey(record.user_id, record.item), record.checked)
    }

    // Create missing records
    const toInsert: { team_id: string; user_id: string; item: string; checked: boolean }[] = []
    for (const member of members) {
      for (const item of DEFAULT_ITEMS) {
        const key = makeKey(member.user_id, item)
        if (!existing.has(key)) {
          toInsert.push({ team_id: teamId, user_id: member.user_id, item, checked: false })
          map.set(key, false)
        }
      }
    }

    if (toInsert.length > 0) {
      await supabase.from('team_readiness').upsert(toInsert, {
        onConflict: 'team_id,user_id,item',
      })
    }

    setReadiness(map)
    setLoading(false)
  }, [teamId, members])

  useEffect(() => {
    loadReadiness()
  }, [loadReadiness])

  const toggleItem = async (item: string) => {
    const key = makeKey(currentUserId, item)
    const current = readiness.get(key) ?? false

    setToggling(prev => new Set(prev).add(key))
    setReadiness(prev => new Map(prev).set(key, !current))

    const supabase = createClient()
    const { error } = await supabase.from('team_readiness').upsert(
      { team_id: teamId, user_id: currentUserId, item, checked: !current },
      { onConflict: 'team_id,user_id,item' }
    )

    if (error) {
      console.error('Error toggling readiness:', error)
      setReadiness(prev => new Map(prev).set(key, current))
    }

    setToggling(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-mountain-muted" />
      </div>
    )
  }

  const totalItems = members.length * DEFAULT_ITEMS.length
  const checkedItems = Array.from(readiness.values()).filter(Boolean).length
  const overallPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  const getMemberStats = (userId: string) => {
    let checked = 0
    for (const item of DEFAULT_ITEMS) {
      if (readiness.get(makeKey(userId, item))) checked++
    }
    return checked
  }

  return (
    <div className="space-y-6">
      {/* Overall readiness */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-mountain-text">
            Готовность отделения: {overallPercent}%
          </span>
          <span className="text-sm text-mountain-muted">
            {checkedItems}/{totalItems}
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-mountain-surface border border-mountain-border overflow-hidden">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-300"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </Card>

      {/* Readiness grid */}
      <Card className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mountain-border bg-mountain-surface/50">
              <th className="text-left px-4 py-3 text-mountain-muted font-medium min-w-[200px]">
                Пункт
              </th>
              {members.map(m => (
                <th
                  key={m.user_id}
                  className="text-center px-3 py-3 text-mountain-muted font-medium min-w-[80px]"
                >
                  <span className="truncate block max-w-[100px]">{m.display_name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DEFAULT_ITEMS.map(item => (
              <tr key={item} className="border-b border-mountain-border/30">
                <td className="px-4 py-3 text-mountain-text">{item}</td>
                {members.map(m => {
                  const key = makeKey(m.user_id, item)
                  const checked = readiness.get(key) ?? false
                  const isCurrentUser = m.user_id === currentUserId
                  const isTogglingThis = toggling.has(key)
                  const canClick = isCurrentUser

                  return (
                    <td key={m.user_id} className="text-center px-3 py-3">
                      <button
                        onClick={() => canClick && toggleItem(item)}
                        disabled={!canClick || isTogglingThis}
                        className={`inline-flex items-center justify-center transition-colors ${
                          canClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                        }`}
                        title={
                          canClick
                            ? checked
                              ? 'Нажмите, чтобы снять отметку'
                              : 'Нажмите, чтобы отметить'
                            : undefined
                        }
                      >
                        {isTogglingThis ? (
                          <Loader2 className="w-5 h-5 animate-spin text-mountain-muted" />
                        ) : checked ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-mountain-muted/40" />
                        )}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Per-member readiness */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map(m => {
          const checked = getMemberStats(m.user_id)
          const percent = Math.round((checked / DEFAULT_ITEMS.length) * 100)

          return (
            <Card key={m.user_id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-mountain-text truncate">
                  {m.display_name}
                </span>
                <span className="text-xs text-mountain-muted">
                  {checked}/{DEFAULT_ITEMS.length} готов
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-mountain-surface border border-mountain-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${percent}%`,
                    backgroundColor: percent === 100 ? '#22c55e' : percent >= 50 ? '#eab308' : '#ef4444',
                  }}
                />
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
