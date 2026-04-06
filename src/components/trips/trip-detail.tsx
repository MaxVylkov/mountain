'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  ArrowLeft, Map, Package, CheckSquare, Phone, Navigation,
  Plus, Check, X, Weight, Mountain, Flag, ChevronDown, ChevronUp,
  Backpack, AlertTriangle
} from 'lucide-react'

const TEMPLATE_LABELS: Record<string, string> = {
  light_trek: 'Лёгкий треккинг', np: 'НП', sp3: 'СП-3', sp2: 'СП-2 и выше',
}

const STATUS_LABELS: Record<string, string> = {
  planning: 'Планирование', packing: 'Сборы', in_camp: 'В лагере', active: 'Активно', completed: 'Завершено',
}

const ROUTE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planned: { label: 'Запланирован', color: 'text-mountain-muted' },
  preparing: { label: 'Подготовка к штурму', color: 'text-mountain-accent' },
  active: { label: 'На маршруте', color: 'text-mountain-primary' },
  summit: { label: 'Вершина!', color: 'text-mountain-success' },
  failed: { label: 'Не дошли', color: 'text-mountain-danger' },
}

export function TripDetail({ trip }: { trip: any }) {
  const [tab, setTab] = useState<'routes' | 'gear' | 'checklist' | 'emergency'>('routes')
  const [tripRoutes, setTripRoutes] = useState<any[]>([])
  const [packingItems, setPackingItems] = useState<any[]>([])
  const [availableRoutes, setAvailableRoutes] = useState<any[]>([])
  const [showAddRoutes, setShowAddRoutes] = useState(false)
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null)
  const [routeGear, setRouteGear] = useState<Record<string, any[]>>({})
  const [showGearPicker, setShowGearPicker] = useState<string | null>(null)

  const loadTripRoutes = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('trip_routes')
      .select('*, routes(id, name, description, difficulty, season)')
      .eq('trip_id', trip.id)
      .order('created_at')
    if (data) setTripRoutes(data)
  }, [trip.id])

  useEffect(() => {
    const supabase = createClient()
    loadTripRoutes()

    // Load available routes: by mountain_id (legacy) or by region (new)
    if (trip.mountain_id) {
      supabase
        .from('routes')
        .select('id, name, description, difficulty')
        .eq('mountain_id', trip.mountain_id)
        .order('difficulty')
        .order('name')
        .then(({ data }) => { if (data) setAvailableRoutes(data) })
    } else if (trip.region) {
      supabase
        .from('mountains')
        .select('id')
        .eq('region', trip.region)
        .then(({ data: mtns }) => {
          if (mtns && mtns.length > 0) {
            supabase
              .from('routes')
              .select('id, name, description, difficulty, mountain:mountains(name)')
              .in('mountain_id', mtns.map(m => m.id))
              .order('difficulty')
              .order('name')
              .then(({ data }) => { if (data) setAvailableRoutes(data) })
          }
        })
    }

    if (trip.packing_set_id) {
      supabase
        .from('packing_items')
        .select('*, gear(id, name, weight, category)')
        .eq('packing_set_id', trip.packing_set_id)
        .then(({ data }) => { if (data) setPackingItems(data as any) })
    }
  }, [trip, loadTripRoutes])

  // Load gear for a specific trip route
  async function loadRouteGear(tripRouteId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('trip_route_gear')
      .select('*, gear(id, name, weight, category)')
      .eq('trip_route_id', tripRouteId)
    if (data) setRouteGear(prev => ({ ...prev, [tripRouteId]: data }))
  }

  async function addRoute(routeId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('trip_routes')
      .insert({ trip_id: trip.id, route_id: routeId })
      .select('*, routes(id, name, description, difficulty, season)')
      .single()
    if (data) setTripRoutes(prev => [...prev, data])
  }

  async function removeRoute(tripRouteId: string) {
    const supabase = createClient()
    await supabase.from('trip_routes').delete().eq('id', tripRouteId)
    setTripRoutes(prev => prev.filter(r => r.id !== tripRouteId))
  }

  async function updateRouteStatus(tripRouteId: string, status: string, summitReached?: boolean) {
    const supabase = createClient()
    const updates: any = { status }
    if (summitReached !== undefined) updates.summit_reached = summitReached
    await supabase.from('trip_routes').update(updates).eq('id', tripRouteId)
    setTripRoutes(prev => prev.map(r =>
      r.id === tripRouteId ? { ...r, status, ...(summitReached !== undefined ? { summit_reached: summitReached } : {}) } : r
    ))
  }

  async function addGearToRoute(tripRouteId: string, gearId: string) {
    const supabase = createClient()
    const { data } = await supabase
      .from('trip_route_gear')
      .insert({ trip_route_id: tripRouteId, gear_id: gearId })
      .select('*, gear(id, name, weight, category)')
      .single()
    if (data) {
      setRouteGear(prev => ({
        ...prev,
        [tripRouteId]: [...(prev[tripRouteId] || []), data]
      }))
    }
  }

  async function removeGearFromRoute(tripRouteId: string, gearItemId: string) {
    const supabase = createClient()
    await supabase.from('trip_route_gear').delete().eq('id', gearItemId)
    setRouteGear(prev => ({
      ...prev,
      [tripRouteId]: (prev[tripRouteId] || []).filter(g => g.id !== gearItemId)
    }))
  }

  async function updateTripStatus(status: string) {
    const supabase = createClient()
    await supabase.from('trips').update({ status }).eq('id', trip.id)
    window.location.reload()
  }

  const totalWeight = packingItems.reduce((sum: number, i: any) => sum + (i.gear?.weight || 0), 0)

  function getRouteWeight(tripRouteId: string): number {
    return (routeGear[tripRouteId] || []).reduce((sum: number, i: any) => sum + (i.gear?.weight || 0), 0)
  }

  const tabs = [
    { key: 'routes' as const, label: 'Маршруты', icon: Map },
    { key: 'gear' as const, label: 'Общее снаряжение', icon: Package },
    { key: 'checklist' as const, label: 'Чеклист', icon: CheckSquare },
    { key: 'emergency' as const, label: 'Экстренное', icon: Phone },
  ]

  return (
    <div className="space-y-6">
      <Link href="/trips" className="inline-flex items-center gap-2 text-sm text-mountain-muted hover:text-mountain-text">
        <ArrowLeft size={16} /> Мои поездки
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{trip.name}</h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-mountain-muted flex-wrap">
            {trip.region && <span>{trip.region}</span>}
            {trip.alpine_camps && <span>· {trip.alpine_camps.name}</span>}
            {!trip.region && trip.mountains && <span>{trip.mountains.name}, {trip.mountains.region}</span>}
            {trip.template && <span className="px-2 py-0.5 rounded bg-mountain-surface">{TEMPLATE_LABELS[trip.template]}</span>}
            <span className="px-2 py-0.5 rounded bg-mountain-primary/20 text-mountain-primary">{STATUS_LABELS[trip.status]}</span>
          </div>
        </div>
        {trip.status !== 'completed' && (
          <Button variant="outline" onClick={() => updateTripStatus('completed')}>
            <Flag size={16} className="mr-2" /> Закончить мероприятие
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Card className="flex-1 p-3">
          <p className="text-xs text-mountain-muted">Маршрутов</p>
          <p className="text-xl font-bold font-mono">{tripRoutes.length}</p>
        </Card>
        <Card className="flex-1 p-3">
          <p className="text-xs text-mountain-muted">Вершин достигнуто</p>
          <p className="text-xl font-bold font-mono text-mountain-success">
            {tripRoutes.filter(r => r.summit_reached).length}/{tripRoutes.length}
          </p>
        </Card>
        <Card className="flex-1 p-3">
          <p className="text-xs text-mountain-muted">Общее снаряжение</p>
          <p className="text-xl font-bold font-mono">{(totalWeight / 1000).toFixed(1)} кг</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-mountain-border overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === key
                ? 'border-mountain-primary text-mountain-primary'
                : 'border-transparent text-mountain-muted hover:text-mountain-text'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Routes tab */}
      {tab === 'routes' && (
        <div className="space-y-4">
          {trip.status !== 'completed' && (
            <Button variant="outline" onClick={() => setShowAddRoutes(true)}>
              <Plus size={16} className="mr-2" /> Добавить маршрут
            </Button>
          )}

          {tripRoutes.map((tr: any) => {
            const route = tr.routes
            const grade = route?.description?.match(/Категория:\s*(\S+)/)?.[1]
            const status = ROUTE_STATUS_LABELS[tr.status || 'planned']
            const isExpanded = expandedRoute === tr.id
            const rGear = routeGear[tr.id] || []
            const rWeight = getRouteWeight(tr.id)

            // Load gear when expanding
            if (isExpanded && !routeGear[tr.id]) {
              loadRouteGear(tr.id)
            }

            return (
              <Card key={tr.id} className="p-0 overflow-hidden">
                {/* Route header */}
                <div
                  className="p-4 cursor-pointer hover:bg-mountain-surface/30 transition-colors"
                  onClick={() => setExpandedRoute(isExpanded ? null : tr.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {grade && <span className="text-xs font-mono font-bold text-mountain-accent">{grade}</span>}
                      <h3 className="font-medium">{route?.name?.replace(/^№\d+\.\s*/, '')}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                      {tr.summit_reached && <Mountain size={16} className="text-mountain-success" />}
                      {isExpanded ? <ChevronUp size={16} className="text-mountain-muted" /> : <ChevronDown size={16} className="text-mountain-muted" />}
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-mountain-border p-4 space-y-4">
                    {/* Action buttons based on status */}
                    <div className="flex flex-wrap gap-2">
                      {tr.status === 'planned' && (
                        <Button onClick={() => updateRouteStatus(tr.id, 'preparing')}>
                          <Backpack size={16} className="mr-2" /> Подготовка к штурму
                        </Button>
                      )}
                      {tr.status === 'preparing' && (
                        <>
                          <Button onClick={() => updateRouteStatus(tr.id, 'active')}>
                            <Navigation size={16} className="mr-2" /> На маршрут!
                          </Button>
                          <Button variant="outline" onClick={() => updateRouteStatus(tr.id, 'planned')}>
                            Отменить подготовку
                          </Button>
                        </>
                      )}
                      {tr.status === 'active' && (
                        <>
                          <Button onClick={() => updateRouteStatus(tr.id, 'summit', true)}>
                            <Mountain size={16} className="mr-2" /> Дошли!
                          </Button>
                          <Button variant="outline" onClick={() => updateRouteStatus(tr.id, 'failed', false)}>
                            <AlertTriangle size={16} className="mr-2" /> Не дошли
                          </Button>
                        </>
                      )}
                      {(tr.status === 'summit' || tr.status === 'failed') && (
                        <span className={`text-sm font-medium ${tr.summit_reached ? 'text-mountain-success' : 'text-mountain-danger'}`}>
                          {tr.summit_reached ? 'Вершина достигнута!' : 'Вершина не достигнута'}
                        </span>
                      )}
                      {trip.status !== 'completed' && (
                        <button onClick={() => removeRoute(tr.id)} className="ml-auto text-sm text-mountain-muted hover:text-mountain-danger">
                          Убрать маршрут
                        </button>
                      )}
                    </div>

                    {/* Backpack for this route (visible in preparing/active) */}
                    {(tr.status === 'preparing' || tr.status === 'active') && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium flex items-center gap-2">
                            <Backpack size={16} className="text-mountain-primary" />
                            Рюкзак на маршрут
                            <span className="font-mono text-mountain-accent">{(rWeight / 1000).toFixed(1)} кг</span>
                          </h4>
                          <Button variant="outline" onClick={() => setShowGearPicker(tr.id)}>
                            <Plus size={14} className="mr-1" /> Добавить
                          </Button>
                        </div>

                        {rGear.length > 0 ? (
                          <div className="space-y-1">
                            {rGear.map((g: any) => (
                              <div key={g.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-mountain-bg">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{g.gear?.name}</span>
                                  {g.gear?.weight && <span className="text-xs text-mountain-muted">{g.gear.weight}г</span>}
                                </div>
                                <button onClick={() => removeGearFromRoute(tr.id, g.id)} className="text-mountain-muted hover:text-mountain-danger">
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-mountain-muted">Набери снаряжение в рюкзак из общего списка</p>
                        )}
                      </div>
                    )}

                    {/* Route description */}
                    {route?.description && (
                      <details className="text-sm text-mountain-muted">
                        <summary className="cursor-pointer hover:text-mountain-text">Описание маршрута</summary>
                        <p className="mt-2 whitespace-pre-line leading-relaxed">{route.description}</p>
                      </details>
                    )}
                  </div>
                )}
              </Card>
            )
          })}

          {tripRoutes.length === 0 && (
            <Card className="py-8">
              <p className="text-mountain-muted text-center">Маршруты не добавлены. Нажми "Добавить маршрут".</p>
            </Card>
          )}

          {/* Add routes modal */}
          {showAddRoutes && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowAddRoutes(false)}>
              <div className="surface-card w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-mountain-border flex items-center justify-between">
                  <h2 className="text-lg font-bold">Добавить маршрут</h2>
                  <button onClick={() => setShowAddRoutes(false)} className="text-mountain-muted hover:text-mountain-text"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {availableRoutes
                    .filter(r => !tripRoutes.some(tr => tr.route_id === r.id))
                    .map(r => {
                      const g = r.description?.match(/Категория:\s*(\S+)/)?.[1]
                      return (
                        <button key={r.id} onClick={() => addRoute(r.id)}
                          className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-mountain-surface transition-colors text-left">
                          <div className="flex items-center gap-2">
                            {g && <span className="text-xs font-mono font-bold text-mountain-accent">{g}</span>}
                            <span className="text-sm">{r.name.replace(/^№\d+\.\s*/, '')}</span>
                          </div>
                          <Plus size={18} className="text-mountain-primary" />
                        </button>
                      )
                    })}
                </div>
              </div>
            </div>
          )}

          {/* Gear picker for route backpack */}
          {showGearPicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowGearPicker(null)}>
              <div className="surface-card w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-mountain-border flex items-center justify-between">
                  <h2 className="text-lg font-bold">Добавить в рюкзак</h2>
                  <button onClick={() => setShowGearPicker(null)} className="text-mountain-muted hover:text-mountain-text"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {packingItems
                    .filter(pi => !(routeGear[showGearPicker] || []).some(rg => rg.gear_id === pi.gear?.id))
                    .map((pi: any) => (
                      <button key={pi.id} onClick={() => addGearToRoute(showGearPicker, pi.gear.id)}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-mountain-surface transition-colors text-left">
                        <div>
                          <span className="text-sm">{pi.gear?.name}</span>
                          {pi.gear?.weight && <span className="text-xs text-mountain-muted ml-2">{pi.gear.weight}г</span>}
                        </div>
                        <Plus size={18} className="text-mountain-primary" />
                      </button>
                    ))}
                  {packingItems.length === 0 && (
                    <p className="text-mountain-muted text-center py-4">Общее снаряжение пусто</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gear tab */}
      {tab === 'gear' && (
        <div className="space-y-3">
          <p className="text-sm text-mountain-muted">Всё снаряжение мероприятия. При подготовке к штурму маршрута — набираешь рюкзак из этого списка.</p>
          {packingItems.length > 0 ? packingItems.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-mountain-surface">
              <span className="text-sm">{item.gear?.name}</span>
              <span className="text-xs text-mountain-muted">{item.gear?.weight}г</span>
            </div>
          )) : (
            <Card>
              <p className="text-mountain-muted text-center">
                Снаряжение не добавлено. <Link href="/gear" className="text-mountain-primary hover:underline">Перейти в кладовку</Link>
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Checklist tab */}
      {tab === 'checklist' && (
        <div className="space-y-3">
          {['Снаряжение упаковано', 'Документы взяты', 'Связь проверена (рация/телефон)', 'Регистрация в МЧС', 'Маршрутная книжка заполнена', 'Страховка оформлена', 'Аптечка собрана', 'Контакты переданы близким'].map(item => (
            <label key={item} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-mountain-surface cursor-pointer hover:bg-mountain-surface/80">
              <input type="checkbox" className="w-4 h-4 accent-mountain-primary" />
              <span className="text-sm">{item}</span>
            </label>
          ))}
        </div>
      )}

      {/* Emergency tab */}
      {tab === 'emergency' && (
        <div className="space-y-4">
          <Card className="space-y-2">
            <h3 className="font-bold text-mountain-danger">Экстренные контакты</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-mountain-muted">МЧС:</span> 112</p>
              <p><span className="text-mountain-muted">Спасатели (Кировск):</span> +7 (81531) 5-88-95</p>
              <p><span className="text-mountain-muted">Лавинная обстановка:</span> t.me/Avalanche_Hibiny</p>
            </div>
          </Card>
          <Card className="space-y-2">
            <h3 className="font-bold">Правила безопасности</h3>
            <ul className="text-sm text-mountain-muted space-y-1 list-disc list-inside">
              <li>Зарегистрируйтесь в МЧС перед выходом</li>
              <li>Оставьте план маршрута близким</li>
              <li>Проверьте прогноз погоды и лавинную обстановку</li>
              <li>Держите заряженную рацию/телефон</li>
              <li>Не выходите на маршрут в одиночку</li>
            </ul>
          </Card>
        </div>
      )}
    </div>
  )
}
