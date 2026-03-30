'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { Heart, Check, Target, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { RouteComments } from './route-comments'

interface Mountain {
  id: string
  name: string
  height: number
}

interface Route {
  id: string
  mountain_id: string
  name: string
  difficulty: number
  description: string | null
  season: string | null
}

interface RouteStatus {
  route_id: string
  completed: boolean
  want_to_do: boolean
  favorite: boolean
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: '1Б', 2: '2А-2Б', 3: '3А-3Б', 4: '4А-4Б', 5: '5А-5Б',
}

const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'bg-mountain-success/20 text-mountain-success border-mountain-success/30',
  2: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  3: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  4: 'bg-mountain-danger/20 text-mountain-danger border-mountain-danger/30',
  5: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

function extractGrade(description: string | null): string | null {
  if (!description) return null
  const match = description.match(/Категория:\s*(\S+)/)
  return match ? match[1].replace('.', '') : null
}

export function RegionRouteList({ mountains, routes }: { mountains: Mountain[]; routes: Route[] }) {
  const [search, setSearch] = useState('')
  const [mountainFilter, setMountainFilter] = useState<string | null>(null)
  const [diffFilter, setDiffFilter] = useState<number | null>(null)
  const [statuses, setStatuses] = useState<Record<string, RouteStatus>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      supabase.from('user_route_status').select('*').eq('user_id', data.user.id)
        .then(({ data: sd }) => {
          if (sd) {
            const map: Record<string, RouteStatus> = {}
            sd.forEach((s: RouteStatus) => { map[s.route_id] = s })
            setStatuses(map)
          }
        })
    })
  }, [])

  async function toggleStatus(routeId: string, field: 'completed' | 'want_to_do' | 'favorite') {
    if (!userId) return
    const supabase = createClient()
    const newValue = !(statuses[routeId]?.[field] || false)
    const updates: Record<string, unknown> = { user_id: userId, route_id: routeId, [field]: newValue }
    if (field === 'completed' && newValue) updates.completed_at = new Date().toISOString()
    const { data, error } = await supabase.from('user_route_status')
      .upsert(updates, { onConflict: 'user_id,route_id' }).select().single()
    if (!error && data) setStatuses(prev => ({ ...prev, [routeId]: data as RouteStatus }))
  }

  const mountainMap = Object.fromEntries(mountains.map(m => [m.id, m]))
  const difficulties = [...new Set(routes.map(r => r.difficulty).filter(Boolean))].sort()

  const filtered = routes.filter(r => {
    if (mountainFilter && r.mountain_id !== mountainFilter) return false
    if (diffFilter !== null && r.difficulty !== diffFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const routeName = r.name.toLowerCase()
      const mountainName = mountainMap[r.mountain_id]?.name.toLowerCase() || ''
      if (!routeName.includes(q) && !mountainName.includes(q)) return false
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mountain-muted pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск маршрутов..."
          className="w-full pl-9 pr-4 py-2.5 bg-mountain-surface border border-mountain-border rounded-xl text-sm text-mountain-text placeholder:text-mountain-muted focus:outline-none focus:border-mountain-primary transition-colors"
        />
      </div>

      {/* Mountain filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMountainFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            mountainFilter === null
              ? 'bg-mountain-primary text-white'
              : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'
          }`}
        >
          Все вершины
        </button>
        {mountains.map(m => (
          <button
            key={m.id}
            onClick={() => setMountainFilter(mountainFilter === m.id ? null : m.id)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              mountainFilter === m.id
                ? 'bg-mountain-primary text-white'
                : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'
            }`}
          >
            {m.name}
            {m.height > 0 && <span className="ml-1.5 text-xs opacity-60">{m.height} м</span>}
          </button>
        ))}
      </div>

      {/* Difficulty filters */}
      {difficulties.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setDiffFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              diffFilter === null ? 'bg-mountain-primary text-white' : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text'
            }`}
          >
            Все ({routes.length})
          </button>
          {difficulties.map(d => (
            <button
              key={d}
              onClick={() => setDiffFilter(diffFilter === d ? null : d)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                diffFilter === d ? DIFFICULTY_COLORS[d] : 'bg-mountain-surface text-mountain-muted border-mountain-border hover:text-mountain-text'
              }`}
            >
              {DIFFICULTY_LABELS[d]} ({routes.filter(r => r.difficulty === d).length})
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-mountain-muted">
        {filtered.length} {filtered.length === 1 ? 'маршрут' : filtered.length < 5 ? 'маршрута' : 'маршрутов'}
        {(mountainFilter || diffFilter !== null || search) && ` из ${routes.length}`}
      </p>

      {/* Route list */}
      <div className="space-y-3">
        {filtered.map(route => {
          const grade = extractGrade(route.description)
          const status = statuses[route.id]
          const isExpanded = expandedRoute === route.id
          const mountain = mountainMap[route.mountain_id]

          return (
            <Card key={route.id} className="space-y-0 p-0 overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-mountain-surface/50 transition-colors"
                onClick={() => setExpandedRoute(isExpanded ? null : route.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {grade && (
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${DIFFICULTY_COLORS[route.difficulty]}`}>
                          {grade}
                        </span>
                      )}
                      <span className="font-medium text-sm">{route.name.replace(/^№\d+\.\s*/, '')}</span>
                    </div>
                    <p className="text-xs text-mountain-muted mt-1">{mountain?.name}</p>
                    {route.season && (
                      <p className="text-xs text-mountain-muted">Сезон: {route.season}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {userId && (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); toggleStatus(route.id, 'completed') }}
                          className={`p-1.5 rounded-lg transition-colors ${status?.completed ? 'bg-mountain-success/20 text-mountain-success' : 'text-mountain-muted hover:text-mountain-success hover:bg-mountain-success/10'}`}
                          title="Я ходил"
                        ><Check size={18} /></button>
                        <button
                          onClick={e => { e.stopPropagation(); toggleStatus(route.id, 'want_to_do') }}
                          className={`p-1.5 rounded-lg transition-colors ${status?.want_to_do ? 'bg-mountain-accent/20 text-mountain-accent' : 'text-mountain-muted hover:text-mountain-accent hover:bg-mountain-accent/10'}`}
                          title="Хочу пройти"
                        ><Target size={18} /></button>
                        <button
                          onClick={e => { e.stopPropagation(); toggleStatus(route.id, 'favorite') }}
                          className={`p-1.5 rounded-lg transition-colors ${status?.favorite ? 'bg-mountain-danger/20 text-mountain-danger' : 'text-mountain-muted hover:text-mountain-danger hover:bg-mountain-danger/10'}`}
                          title="Избранное"
                        ><Heart size={18} fill={status?.favorite ? 'currentColor' : 'none'} /></button>
                      </>
                    )}
                    {isExpanded ? <ChevronUp size={18} className="text-mountain-muted" /> : <ChevronDown size={18} className="text-mountain-muted" />}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-mountain-border pt-3">
                  {route.description ? (
                    <p className="text-sm text-mountain-muted leading-relaxed whitespace-pre-line">{route.description}</p>
                  ) : (
                    <p className="text-sm text-mountain-muted italic">Описание не добавлено.</p>
                  )}
                  <RouteComments routeId={route.id} currentUserId={userId} />
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <Card>
          <p className="text-mountain-muted text-center">Маршрутов не найдено.</p>
        </Card>
      )}

      {!userId && (
        <Card>
          <p className="text-sm text-mountain-muted text-center">
            <a href="/login" className="text-mountain-primary hover:underline">Войди</a>, чтобы отмечать маршруты как пройденные, добавлять в избранное и планировать восхождения.
          </p>
        </Card>
      )}
    </div>
  )
}
