'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Map, Package, CheckSquare, Phone, Navigation } from 'lucide-react'

const TEMPLATE_LABELS: Record<string, string> = {
  light_trek: 'Лёгкий треккинг', np: 'НП', sp3: 'СП-3', sp2: 'СП-2 и выше',
}

const STATUS_LABELS: Record<string, string> = {
  planning: 'Планирование', packing: 'Сборы', active: 'На маршруте', completed: 'Завершена',
}

export function TripDetail({ trip }: { trip: any }) {
  const [tab, setTab] = useState<'routes' | 'gear' | 'checklist' | 'emergency'>('routes')
  const [tripRoutes, setTripRoutes] = useState<any[]>([])
  const [packingItems, setPackingItems] = useState<any[]>([])

  useEffect(() => {
    const supabase = createClient()
    // Load trip routes
    supabase
      .from('trip_routes')
      .select('*, routes(id, name, description, difficulty, season)')
      .eq('trip_id', trip.id)
      .then(({ data }) => { if (data) setTripRoutes(data) })

    // Load packing items
    if (trip.packing_set_id) {
      supabase
        .from('packing_items')
        .select('*, gear(name, weight, category)')
        .eq('packing_set_id', trip.packing_set_id)
        .then(({ data }) => { if (data) setPackingItems(data as any) })
    }
  }, [trip])

  async function updateStatus(status: string) {
    const supabase = createClient()
    await supabase.from('trips').update({ status }).eq('id', trip.id)
    window.location.reload()
  }

  const totalWeight = packingItems.reduce((sum: number, i: any) => sum + (i.gear?.weight || 0), 0)
  const packedCount = packingItems.filter((i: any) => i.packed).length

  const tabs = [
    { key: 'routes' as const, label: 'Маршруты', icon: Map },
    { key: 'gear' as const, label: 'Снаряжение', icon: Package },
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
          <div className="flex items-center gap-3 mt-2 text-sm text-mountain-muted">
            {trip.mountains && <span>{trip.mountains.name}, {trip.mountains.region}</span>}
            {trip.template && <span className="px-2 py-0.5 rounded bg-mountain-surface">{TEMPLATE_LABELS[trip.template]}</span>}
            <span className="px-2 py-0.5 rounded bg-mountain-primary/20 text-mountain-primary">{STATUS_LABELS[trip.status]}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {trip.status === 'packing' && (
            <Button onClick={() => updateStatus('active')}>
              <Navigation size={16} className="mr-2" /> На маршрут!
            </Button>
          )}
          {trip.status === 'active' && (
            <Button variant="outline" onClick={() => updateStatus('completed')}>Завершить</Button>
          )}
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4">
        <Card className="flex-1 p-3">
          <p className="text-xs text-mountain-muted">Маршрутов</p>
          <p className="text-xl font-bold font-mono">{tripRoutes.length}</p>
        </Card>
        <Card className="flex-1 p-3">
          <p className="text-xs text-mountain-muted">Вещей</p>
          <p className="text-xl font-bold font-mono">{packingItems.length}</p>
        </Card>
        <Card className="flex-1 p-3">
          <p className="text-xs text-mountain-muted">Общий вес</p>
          <p className="text-xl font-bold font-mono">{(totalWeight / 1000).toFixed(1)} кг</p>
        </Card>
        <Card className="flex-1 p-3">
          <p className="text-xs text-mountain-muted">Упаковано</p>
          <p className="text-xl font-bold font-mono">{packedCount}/{packingItems.length}</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-mountain-border">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === key
                ? 'border-mountain-primary text-mountain-primary'
                : 'border-transparent text-mountain-muted hover:text-mountain-text'
            }`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'routes' && (
        <div className="space-y-3">
          {tripRoutes.length > 0 ? tripRoutes.map((tr: any) => {
            const route = tr.routes
            const grade = route?.description?.match(/Категория:\s*(\S+)/)?.[1]
            return (
              <Card key={tr.id} className="space-y-2">
                <div className="flex items-center gap-2">
                  {grade && <span className="text-xs font-mono font-bold text-mountain-accent">{grade}</span>}
                  <h3 className="font-medium">{route?.name?.replace(/^№\d+\.\s*/, '')}</h3>
                </div>
                {route?.description && (
                  <p className="text-sm text-mountain-muted whitespace-pre-line">{route.description}</p>
                )}
              </Card>
            )
          }) : (
            <Card><p className="text-mountain-muted text-center">Маршруты не выбраны</p></Card>
          )}
        </div>
      )}

      {tab === 'gear' && (
        <div className="space-y-3">
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
