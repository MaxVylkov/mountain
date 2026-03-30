'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { createClient } from '@/lib/supabase/client'
import { Heart, Check, Target, ChevronDown, ChevronUp, Search, LogIn } from 'lucide-react'
import { RouteComments } from './route-comments'

interface Route {
  id: string
  name: string
  difficulty: number
  duration_days: number | null
  description: string
  season: string | null
}

interface RouteStatus {
  route_id: string
  user_id: string
  completed: boolean
  want_to_do: boolean
  favorite: boolean
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: '1Б',
  2: '2А-2Б',
  3: '3А-3Б',
  4: '4А-4Б',
  5: '5А-5Б',
}

const DIFFICULTY_COLORS: Record<number, string> = {
  1: 'bg-mountain-success/15 text-mountain-success border-mountain-success/30',  // 1Б — green
  2: 'bg-mountain-accent/15 text-mountain-accent border-mountain-accent/30',      // 2А-2Б — amber
  3: 'bg-orange-500/15 text-orange-500 border-orange-500/30',                    // 3А-3Б — orange
  4: 'bg-mountain-danger/15 text-mountain-danger border-mountain-danger/30',      // 4А-4Б — red
  5: 'bg-purple-600/15 text-purple-600 border-purple-600/30',                    // 5А-5Б — purple
}

type Tab = 'all' | 'favorites' | 'want_to_do' | 'completed'

export function RouteList({ routes }: { routes: Route[]; mountainId?: string }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<number | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [statuses, setStatuses] = useState<Record<string, RouteStatus>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null)
  const [adoptedDescs, setAdoptedDescs] = useState<Record<string, any[]>>({})

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        // Fetch route statuses
        supabase
          .from('user_route_status')
          .select('*')
          .eq('user_id', data.user.id)
          .then(({ data: statusData }) => {
            if (statusData) {
              const map: Record<string, RouteStatus> = {}
              statusData.forEach((s: any) => { map[s.route_id] = s })
              setStatuses(map)
            }
          })
      }
    })
  }, [])

  async function loadAdoptedDescriptions(routeId: string) {
    if (adoptedDescs[routeId]) return
    const supabase = createClient()
    const { data } = await supabase
      .from('adopted_descriptions')
      .select('*, author:profiles!adopted_descriptions_author_id_fkey(display_name)')
      .eq('route_id', routeId)
      .order('created_at', { ascending: false })
    if (data) {
      setAdoptedDescs(prev => ({ ...prev, [routeId]: data }))
    }
  }

  async function toggleStatus(routeId: string, field: 'completed' | 'want_to_do' | 'favorite') {
    if (!userId) return

    // Optimistic update
    const current = statuses[routeId]
    const newValue = !(current?.[field] || false)
    setStatuses(prev => ({
      ...prev,
      [routeId]: {
        ...prev[routeId],
        user_id: userId,
        route_id: routeId,
        [field]: newValue,
      }
    }))

    const supabase = createClient()
    const updates: any = {
      user_id: userId,
      route_id: routeId,
      [field]: newValue,
    }
    if (field === 'completed' && newValue) {
      updates.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('user_route_status')
      .upsert(updates, { onConflict: 'user_id,route_id' })
      .select()
      .single()

    if (error) {
      // Revert on error
      setStatuses(prev => ({ ...prev, [routeId]: current }))
    } else if (data) {
      setStatuses(prev => ({ ...prev, [routeId]: data }))
    }
  }

  // Apply tab filter first, then difficulty filter
  const tabFiltered = tab === 'all'
    ? routes
    : routes.filter(r => {
        const s = statuses[r.id]
        if (!s) return false
        if (tab === 'favorites') return s.favorite
        if (tab === 'want_to_do') return s.want_to_do
        if (tab === 'completed') return s.completed
        return true
      })
  const diffFiltered = filter !== null ? tabFiltered.filter(r => r.difficulty === filter) : tabFiltered
  const filtered = search
    ? diffFiltered.filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
    : diffFiltered
  const difficulties = [...new Set(routes.map(r => r.difficulty))].sort()

  const tabCounts = {
    favorites: Object.values(statuses).filter(s => s.favorite).length,
    want_to_do: Object.values(statuses).filter(s => s.want_to_do).length,
    completed: Object.values(statuses).filter(s => s.completed).length,
  }

  // Extract grade from description (e.g., "Категория: 2А" -> "2А")
  function extractGrade(description: string | null): string | null {
    if (!description) return null
    const match = description.match(/Категория:\s*(\S+)/)
    return match ? match[1].replace('.', '') : null
  }

  function extractPeak(description: string | null): string | null {
    if (!description) return null
    const match = description.match(/Вершина:\s*([^.]+)/)
    return match ? match[1].trim() : null
  }

  function emptyStateForTab(): { icon: React.ElementType; title: string; description: string } {
    if (tab === 'favorites') {
      return {
        icon: Heart,
        title: 'Нет избранных маршрутов',
        description: 'Нажми ❤ рядом с маршрутом, чтобы добавить его в избранное.',
      }
    }
    if (tab === 'want_to_do') {
      return {
        icon: Target,
        title: 'Нет запланированных маршрутов',
        description: 'Нажми «Хочу» рядом с маршрутом, чтобы запланировать восхождение.',
      }
    }
    if (tab === 'completed') {
      return {
        icon: Check,
        title: 'Нет пройденных маршрутов',
        description: 'Нажми «Ходил» после восхождения, чтобы отметить маршрут.',
      }
    }
    return {
      icon: Search,
      title: 'Маршрутов не найдено',
      description: 'Попробуй другую сложность или измени поисковый запрос.',
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Маршруты <span className="text-mountain-muted font-normal text-lg">({filtered.length})</span>
        </h2>
      </div>

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

      {/* Tabs */}
      {userId && (
        <div className="flex border-b border-mountain-border">
          {([
            { key: 'all' as Tab, label: 'Все маршруты', icon: null, count: routes.length },
            { key: 'favorites' as Tab, label: 'Избранное', icon: Heart, count: tabCounts.favorites },
            { key: 'want_to_do' as Tab, label: 'Хочу пройти', icon: Target, count: tabCounts.want_to_do },
            { key: 'completed' as Tab, label: 'Пройденные', icon: Check, count: tabCounts.completed },
          ]).map(({ key, label, icon: Icon, count }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setFilter(null) }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-mountain-primary text-mountain-primary'
                  : 'border-transparent text-mountain-muted hover:text-mountain-text'
              }`}
            >
              {Icon && <Icon size={16} />}
              <span className="hidden sm:inline">{label}</span>
              {count > 0 && key !== 'all' && (
                <span className="text-xs bg-mountain-surface px-1.5 py-0.5 rounded-full">{count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Difficulty filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            filter === null
              ? 'bg-mountain-primary text-white'
              : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text'
          }`}
        >
          Все ({routes.length})
        </button>
        {difficulties.map(d => (
          <button
            key={d}
            onClick={() => setFilter(d)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              filter === d
                ? DIFFICULTY_COLORS[d]
                : 'bg-mountain-surface text-mountain-muted border-mountain-border hover:text-mountain-text'
            }`}
          >
            {DIFFICULTY_LABELS[d]} ({routes.filter(r => r.difficulty === d).length})
          </button>
        ))}
      </div>

      {/* Route cards */}
      <div className="space-y-3">
        {filtered.map(route => {
          const grade = extractGrade(route.description)
          const peak = extractPeak(route.description)
          const status = statuses[route.id]
          const isExpanded = expandedRoute === route.id

          return (
            <Card key={route.id} className="space-y-0 p-0 overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-mountain-border/30 transition-colors"
                onClick={() => {
                  const next = isExpanded ? null : route.id
                  setExpandedRoute(next)
                  if (next) loadAdoptedDescriptions(next)
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
                      <h3 className="font-medium text-sm">{route.name.replace(/^№\d+\.\s*/, '')}</h3>
                    </div>
                    {peak && (
                      <p className="text-xs text-mountain-muted mt-1">{peak}</p>
                    )}
                    {route.season && (
                      <p className="text-xs text-mountain-muted mt-1">Сезон: {route.season}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {userId && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStatus(route.id, 'completed') }}
                          className={`rounded-lg transition-colors p-1.5 sm:flex sm:items-center sm:gap-1 sm:px-2 sm:py-1.5 ${
                            status?.completed
                              ? 'bg-mountain-success/20 text-mountain-success'
                              : 'text-mountain-muted hover:text-mountain-success hover:bg-mountain-success/10'
                          }`}
                          title="Я ходил"
                        >
                          <Check size={18} />
                          <span className="hidden sm:inline text-xs">Ходил</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStatus(route.id, 'want_to_do') }}
                          className={`rounded-lg transition-colors p-1.5 sm:flex sm:items-center sm:gap-1 sm:px-2 sm:py-1.5 ${
                            status?.want_to_do
                              ? 'bg-mountain-accent/20 text-mountain-accent'
                              : 'text-mountain-muted hover:text-mountain-accent hover:bg-mountain-accent/10'
                          }`}
                          title="Хочу пройти"
                        >
                          <Target size={18} />
                          <span className="hidden sm:inline text-xs">Хочу</span>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleStatus(route.id, 'favorite') }}
                          className={`rounded-lg transition-colors p-1.5 sm:flex sm:items-center sm:gap-1 sm:px-2 sm:py-1.5 ${
                            status?.favorite
                              ? 'bg-mountain-danger/20 text-mountain-danger'
                              : 'text-mountain-muted hover:text-mountain-danger hover:bg-mountain-danger/10'
                          }`}
                          title="Избранное"
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
                  <p className="text-sm text-mountain-muted leading-relaxed whitespace-pre-line">
                    {route.description}
                  </p>
                  {adoptedDescs[route.id]?.map((ad: any) => (
                    <div key={ad.id} className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                      <p className="text-xs text-amber-400 font-medium mb-1">Альтернативное описание</p>
                      <p className="text-sm text-mountain-text whitespace-pre-wrap">{ad.text}</p>
                      <p className="text-xs text-mountain-muted mt-2">— {ad.author?.display_name || 'Аноним'}</p>
                    </div>
                  ))}
                  <RouteComments routeId={route.id} currentUserId={userId} />
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (() => {
        const { icon, title, description } = emptyStateForTab()
        return <EmptyState icon={icon} title={title} description={description} />
      })()}

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
