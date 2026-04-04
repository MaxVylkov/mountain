'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { createClient } from '@/lib/supabase/client'
import { Heart, Check, Target, ChevronDown, ChevronUp, Search, LogIn, ExternalLink } from 'lucide-react'
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
  far_url: string | null
}

interface RouteStatus {
  user_id: string
  route_id: string
  completed: boolean
  want_to_do: boolean
  favorite: boolean
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: '1Б', 2: '2А-2Б', 3: '3А-3Б', 4: '4А-4Б', 5: '5А-5Б',
}

const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'bg-mountain-success/15 text-mountain-success border-mountain-success/30',
  2: 'bg-mountain-accent/15 text-mountain-accent border-mountain-accent/30',
  3: 'bg-orange-500/15 text-orange-500 border-orange-500/30',
  4: 'bg-mountain-danger/15 text-mountain-danger border-mountain-danger/30',
  5: 'bg-purple-600/15 text-purple-600 border-purple-600/30',
}

function extractGrade(description: string | null): string | null {
  if (!description) return null
  const match = description.match(/Категория:\s*(\S+)/)
  return match ? match[1].replace('.', '') : null
}

type Tab = 'all' | 'favorites' | 'want_to_do' | 'completed'

export function RegionRouteList({ mountains, routes }: { mountains: Mountain[]; routes: Route[] }) {
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')
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
    const current = statuses[routeId]
    const newValue = !(current?.[field] || false)
    // Optimistic update
    setStatuses(prev => ({
      ...prev,
      [routeId]: { ...prev[routeId], user_id: userId, route_id: routeId, [field]: newValue }
    }))
    const supabase = createClient()
    const updates: Record<string, unknown> = { user_id: userId, route_id: routeId, [field]: newValue }
    if (field === 'completed' && newValue) updates.completed_at = new Date().toISOString()
    const { data, error } = await supabase.from('user_route_status')
      .upsert(updates, { onConflict: 'user_id,route_id' }).select().single()
    if (error) {
      setStatuses(prev => ({ ...prev, [routeId]: current })) // revert
    } else if (data) {
      setStatuses(prev => ({ ...prev, [routeId]: data as RouteStatus }))
    }
  }

  const mountainMap = Object.fromEntries(mountains.map(m => [m.id, m]))
  const difficulties = [...new Set(routes.map(r => r.difficulty).filter(Boolean))].sort()

  const tabCounts = {
    favorites: Object.values(statuses).filter(s => s.favorite).length,
    want_to_do: Object.values(statuses).filter(s => s.want_to_do).length,
    completed: Object.values(statuses).filter(s => s.completed).length,
  }

  const filtered = routes.filter(r => {
    if (tab !== 'all') {
      const s = statuses[r.id]
      if (!s) return false
      if (tab === 'favorites' && !s.favorite) return false
      if (tab === 'want_to_do' && !s.want_to_do) return false
      if (tab === 'completed' && !s.completed) return false
    }
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

  const hasActiveFilters = tab !== 'all' || mountainFilter !== null || diffFilter !== null || !!search

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <label htmlFor="region-route-search" className="sr-only">Поиск маршрутов</label>
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mountain-muted pointer-events-none" />
        <input
          id="region-route-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск маршрутов..."
          className="w-full pl-9 pr-4 py-2.5 bg-mountain-surface border border-mountain-border rounded-xl text-sm text-mountain-text placeholder:text-mountain-muted focus:outline-none focus:border-mountain-primary transition-colors"
        />
      </div>

      {/* Tabs */}
      {userId && (
        <div className="flex border-b border-mountain-border">
          {([
            { key: 'all' as Tab, label: 'Все', icon: null, count: routes.length },
            { key: 'favorites' as Tab, label: 'Избранное', icon: Heart, count: tabCounts.favorites },
            { key: 'want_to_do' as Tab, label: 'Хочу пройти', icon: Target, count: tabCounts.want_to_do },
            { key: 'completed' as Tab, label: 'Пройденные', icon: Check, count: tabCounts.completed },
          ]).map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setMountainFilter(null); setDiffFilter(null) }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-mountain-primary text-mountain-primary'
                  : 'border-transparent text-mountain-muted hover:text-mountain-text'
              }`}
            >
              {Icon && <Icon size={15} />}
              <span className="hidden sm:inline">{label}</span>
              {count > 0 && key !== 'all' && (
                <span className="text-xs bg-mountain-surface px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Mountain filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setMountainFilter(null)}
          aria-pressed={mountainFilter === null}
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
            aria-pressed={mountainFilter === m.id}
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
            aria-pressed={diffFilter === null}
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
              aria-pressed={diffFilter === d}
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
        {hasActiveFilters && ` из ${routes.length}`}
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
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                className="p-4 cursor-pointer hover:bg-mountain-border/30 transition-colors"
                onClick={() => setExpandedRoute(isExpanded ? null : route.id)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setExpandedRoute(isExpanded ? null : route.id)
                  }
                }}
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
                          aria-label={status?.completed ? 'Убрать отметку "Ходил"' : 'Отметить как пройденный'}
                          aria-pressed={!!status?.completed}
                          className={`rounded-lg transition-colors p-1.5 sm:flex sm:items-center sm:gap-1 sm:px-2 sm:py-1.5 ${
                            status?.completed
                              ? 'bg-mountain-success/20 text-mountain-success'
                              : 'text-mountain-muted hover:text-mountain-success hover:bg-mountain-success/10'
                          }`}
                        >
                          <Check size={18} />
                          <span className="hidden sm:inline text-xs">Ходил</span>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); toggleStatus(route.id, 'want_to_do') }}
                          aria-label={status?.want_to_do ? 'Убрать из запланированных' : 'Добавить в запланированные'}
                          aria-pressed={!!status?.want_to_do}
                          className={`rounded-lg transition-colors p-1.5 sm:flex sm:items-center sm:gap-1 sm:px-2 sm:py-1.5 ${
                            status?.want_to_do
                              ? 'bg-mountain-accent/20 text-mountain-accent'
                              : 'text-mountain-muted hover:text-mountain-accent hover:bg-mountain-accent/10'
                          }`}
                        >
                          <Target size={18} />
                          <span className="hidden sm:inline text-xs">Хочу</span>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); toggleStatus(route.id, 'favorite') }}
                          aria-label={status?.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
                          aria-pressed={!!status?.favorite}
                          className={`rounded-lg transition-colors p-1.5 sm:flex sm:items-center sm:gap-1 sm:px-2 sm:py-1.5 ${
                            status?.favorite
                              ? 'bg-mountain-danger/20 text-mountain-danger'
                              : 'text-mountain-muted hover:text-mountain-danger hover:bg-mountain-danger/10'
                          }`}
                        >
                          <Heart size={18} fill={status?.favorite ? 'currentColor' : 'none'} />
                        </button>
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
                  {route.far_url && (
                    <a
                      href={route.far_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-3 text-xs text-mountain-primary hover:text-mountain-primary/80 transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink size={13} />
                      Описание на сайте ФАР
                    </a>
                  )}
                  <RouteComments routeId={route.id} currentUserId={userId} />
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <EmptyState
          icon={Search}
          title="Маршрутов не найдено"
          description={
            hasActiveFilters
              ? 'Попробуй другую вершину, сложность или измени поисковый запрос.'
              : 'В этом регионе пока нет маршрутов.'
          }
        />
      )}

      {!userId && (
        <EmptyState
          icon={LogIn}
          title="Войди, чтобы отслеживать маршруты"
          description="Отмечай пройденные, добавляй в избранное и планируй восхождения"
          action={{ label: 'Войти', href: '/login' }}
        />
      )}
    </div>
  )
}
