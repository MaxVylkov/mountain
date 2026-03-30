'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Check, X, Package } from 'lucide-react'

interface MountainData {
  id: string
  name: string
  region: string
  height: number
  description: string | null
}

const TEMPLATES = [
  { key: 'light_trek', name: 'Лёгкий треккинг', desc: 'Базовая одежда, рюкзак 30л, палки, фонарь, лёгкий бивуак', weight: '~8 кг' },
  { key: 'np', name: 'НП (начальная подготовка)', desc: '+ обвязка, каска, верёвка, карабины, базовое железо', weight: '~15 кг' },
  { key: 'sp3', name: 'СП-3', desc: '+ кошки, ледоруб, ледобуры, больше железа, зимний бивуак', weight: '~18 кг' },
  { key: 'sp2', name: 'СП-2 и выше', desc: '+ ледовые инструменты, полный набор закладок/френдов, ИТО', weight: '~22 кг' },
]

const CATEGORY_LABELS: Record<string, string> = {
  clothing: 'Одежда', footwear: 'Обувь', hardware: 'Железо',
  ropes: 'Верёвки', bivouac: 'Бивуак', electronics: 'Электроника', other: 'Прочее',
}

export function TripWizard({ mountains }: { mountains: MountainData[] }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)

  // Wizard state
  const [selectedMountain, setSelectedMountain] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedPackingSet, setSelectedPackingSet] = useState<string | null>(null)
  const [templateGear, setTemplateGear] = useState<any[]>([])
  const [userGearIds, setUserGearIds] = useState<Set<string>>(new Set())
  const [userGearItems, setUserGearItems] = useState<any[]>([])
  const [userPackingSets, setUserPackingSets] = useState<any[]>([])
  const [routes, setRoutes] = useState<any[]>([])
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        // Load user's gear
        supabase
          .from('user_gear')
          .select('gear_id, gear(id, name, category, weight)')
          .eq('user_id', data.user.id)
          .then(({ data: gearData }) => {
            if (gearData) {
              setUserGearIds(new Set(gearData.map((g: any) => g.gear_id)))
              setUserGearItems(gearData.map((g: any) => g.gear))
            }
          })
        // Load user's packing sets
        supabase
          .from('packing_sets')
          .select('id, name, packing_items(gear_id, gear(id, name, category, weight))')
          .eq('user_id', data.user.id)
          .then(({ data: setsData }) => {
            if (setsData) setUserPackingSets(setsData)
          })
      }
    })
  }, [])

  // Load gear based on selection
  useEffect(() => {
    if (!selectedTemplate && !selectedPackingSet) return

    if (selectedTemplate === 'my_closet') {
      // Use all gear from user's closet
      setTemplateGear(userGearItems)
      return
    }

    if (selectedPackingSet) {
      // Use gear from a specific packing set
      const set = userPackingSets.find((s: any) => s.id === selectedPackingSet)
      if (set?.packing_items) {
        setTemplateGear(set.packing_items.map((pi: any) => pi.gear).filter(Boolean))
      }
      return
    }

    if (selectedTemplate) {
      const supabase = createClient()
      supabase
        .from('gear_templates')
        .select('gear_id, gear(id, name, category, weight)')
        .eq('template', selectedTemplate)
        .then(({ data }) => {
          if (data) setTemplateGear(data.map((d: any) => d.gear))
        })
    }
  }, [selectedTemplate, selectedPackingSet, userGearItems, userPackingSets])

  // Load routes when mountain selected
  useEffect(() => {
    if (!selectedMountain) return
    const supabase = createClient()
    supabase
      .from('routes')
      .select('*')
      .eq('mountain_id', selectedMountain)
      .order('difficulty')
      .order('name')
      .then(({ data }) => {
        if (data) setRoutes(data)
      })
  }, [selectedMountain])

  async function createTrip() {
    if (!userId || !selectedMountain) return
    if (!selectedTemplate && !selectedPackingSet) return
    setCreating(true)
    const supabase = createClient()

    const mountainName = mountains.find(m => m.id === selectedMountain)?.name || 'Поездка'
    // Determine which template key to store (only valid DB values or null)
    const validTemplates = ['light_trek', 'np', 'sp3', 'sp2']
    const templateKey = selectedTemplate && validTemplates.includes(selectedTemplate) ? selectedTemplate : null
    const templateName = TEMPLATES.find(t => t.key === selectedTemplate)?.name
      || userPackingSets.find((s: any) => s.id === selectedPackingSet)?.name
      || 'Мои сборы'

    // Use existing packing set or create a new one
    let packingSetId: string | null = selectedPackingSet || null

    if (!selectedPackingSet) {
      const { data: newSet } = await supabase
        .from('packing_sets')
        .insert({ user_id: userId, name: `${mountainName} — ${templateName}`, route_id: null })
        .select()
        .single()
      packingSetId = newSet?.id || null
    }

    // Create trip
    const { data: trip } = await supabase
      .from('trips')
      .insert({
        user_id: userId,
        name: mountainName,
        mountain_id: selectedMountain,
        template: templateKey,
        status: 'packing',
        packing_set_id: packingSetId,
      })
      .select()
      .single()

    if (trip) {
      // Add gear to new packing set (not when reusing an existing set)
      if (!selectedPackingSet && packingSetId && templateGear.length > 0) {
        const gearToAdd = templateGear.map(g => ({
          packing_set_id: packingSetId,
          gear_id: g.id,
        }))
        await supabase.from('packing_items').insert(gearToAdd)
      }

      // Add selected routes
      if (selectedRoutes.size > 0) {
        const routeInserts = Array.from(selectedRoutes).map(routeId => ({
          trip_id: trip.id,
          route_id: routeId,
        }))
        await supabase.from('trip_routes').insert(routeInserts)
      }

      router.push(`/trips/${trip.id}`)
    }
    setCreating(false)
  }

  if (!userId) {
    return (
      <Card className="max-w-lg mx-auto">
        <p className="text-mountain-muted text-center">
          <a href="/login" className="text-mountain-primary hover:underline">Войди</a> чтобы планировать поездки.
        </p>
      </Card>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              s <= step ? 'bg-mountain-primary text-white' : 'bg-mountain-surface text-mountain-muted'
            }`}>{s}</div>
            {s < 4 && <div className={`flex-1 h-0.5 ${s < step ? 'bg-mountain-primary' : 'bg-mountain-border'}`} />}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-mountain-muted">
        <span>Регион</span><span>Шаблон</span><span>Снаряжение</span><span>Маршруты</span>
      </div>

      {/* Step 1: Region */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Куда собираемся?</h2>
          <div className="grid gap-4">
            {mountains.map(m => (
              <button
                key={m.id}
                onClick={() => { setSelectedMountain(m.id); setStep(2) }}
                className="text-left"
              >
                <Card hover className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">{m.name}</h3>
                    <span className="text-sm font-mono text-mountain-accent">{m.height} м</span>
                  </div>
                  <p className="text-sm text-mountain-muted">{m.region}</p>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Template */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep(1)} className="text-mountain-muted hover:text-mountain-text"><ArrowLeft size={20} /></button>
            <h2 className="text-2xl font-bold">Набор снаряжения</h2>
          </div>

          {/* User's own sets */}
          {(userGearItems.length > 0 || userPackingSets.length > 0) && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-mountain-muted">Мои сборки</h3>

              {userGearItems.length > 0 && (
                <button
                  onClick={() => { setSelectedTemplate('my_closet'); setSelectedPackingSet(null); setStep(3) }}
                  className="w-full text-left"
                >
                  <Card hover className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold">Вся моя кладовка</h3>
                      <span className="text-sm font-mono text-mountain-accent">
                        ~{(userGearItems.reduce((s: number, g: any) => s + (g?.weight || 0), 0) / 1000).toFixed(1)} кг
                      </span>
                    </div>
                    <p className="text-sm text-mountain-muted">Всё снаряжение из кладовки ({userGearItems.length} предметов)</p>
                  </Card>
                </button>
              )}

              {userPackingSets.filter((s: any) => s.packing_items?.length > 0).map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedPackingSet(s.id); setSelectedTemplate(null); setStep(3) }}
                  className="w-full text-left"
                >
                  <Card hover className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold">{s.name}</h3>
                      <span className="text-sm font-mono text-mountain-accent">
                        {s.packing_items.length} предметов
                      </span>
                    </div>
                    <p className="text-sm text-mountain-muted">Набор из кладовки</p>
                  </Card>
                </button>
              ))}
            </div>
          )}

          {/* Standard templates */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-mountain-muted">Шаблоны по уровню</h3>
            {TEMPLATES.map(t => (
              <button
                key={t.key}
                onClick={() => { setSelectedTemplate(t.key); setSelectedPackingSet(null); setStep(3) }}
                className="w-full text-left"
              >
                <Card hover className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{t.name}</h3>
                    <span className="text-sm font-mono text-mountain-accent">{t.weight}</span>
                  </div>
                  <p className="text-sm text-mountain-muted">{t.desc}</p>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Gear check */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep(2)} className="text-mountain-muted hover:text-mountain-text"><ArrowLeft size={20} /></button>
            <h2 className="text-2xl font-bold">Набор снаряжения</h2>
          </div>
          <p className="text-sm text-mountain-muted">Это снаряжение будет добавлено в твои сборы. Перед выходом на маршрут распределишь по рюкзакам.</p>

          <div className="flex gap-4 text-sm">
            <span className="text-mountain-success">&#10003; Есть в кладовке: {templateGear.filter(g => userGearIds.has(g.id)).length}</span>
            <span className="text-mountain-accent">&#9888; Нужно найти: {templateGear.filter(g => !userGearIds.has(g.id)).length}</span>
            <span className="font-mono text-mountain-muted">&#8721; {(templateGear.reduce((s, g) => s + (g.weight || 0), 0) / 1000).toFixed(1)} кг</span>
          </div>

          {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
            const catItems = templateGear.filter(g => g.category === cat)
            if (catItems.length === 0) return null
            return (
              <div key={cat} className="space-y-1">
                <h3 className="text-sm font-medium text-mountain-muted">{label}</h3>
                {catItems.map(g => {
                  const has = userGearIds.has(g.id)
                  return (
                    <div key={g.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${has ? 'bg-mountain-success/5' : 'bg-mountain-accent/5'}`}>
                      <div className="flex items-center gap-2">
                        {has ? <Check size={16} className="text-mountain-success" /> : <Package size={16} className="text-mountain-accent" />}
                        <span className="text-sm">{g.name}</span>
                      </div>
                      <span className="text-xs text-mountain-muted">{g.weight}г</span>
                    </div>
                  )
                })}
              </div>
            )
          })}

          {templateGear.filter(g => !userGearIds.has(g.id)).length > 0 && (
            <Card className="p-4 border-mountain-accent/30 bg-mountain-accent/5">
              <p className="text-sm text-mountain-accent">
                Снаряжение с иконкой <Package size={14} className="inline" /> отсутствует в кладовке — одолжи у друзей, возьми в турклубе или купи.
                Всё снаряжение из набора будет добавлено в сборы.
              </p>
            </Card>
          )}

          <Button onClick={() => setStep(4)} className="w-full">
            Далее → Выбор маршрутов <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      )}

      {/* Step 4: Routes */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep(3)} className="text-mountain-muted hover:text-mountain-text"><ArrowLeft size={20} /></button>
            <h2 className="text-2xl font-bold">Выбор маршрутов</h2>
          </div>
          <p className="text-sm text-mountain-muted">Выбери маршруты или пропусти — решишь на месте.</p>

          <div className="space-y-2">
            {routes.map(r => {
              const grade = r.description?.match(/Категория:\s*(\S+)/)?.[1]
              const isSelected = selectedRoutes.has(r.id)
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRoutes(prev => {
                      const next = new Set(prev)
                      if (next.has(r.id)) next.delete(r.id)
                      else next.add(r.id)
                      return next
                    })
                  }}
                  className="w-full text-left"
                >
                  <Card className={`p-3 ${isSelected ? 'border-mountain-primary' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-mountain-primary border-mountain-primary' : 'border-mountain-border'}`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>
                      {grade && <span className="text-xs font-mono font-bold text-mountain-accent">{grade}</span>}
                      <span className="text-sm">{r.name.replace(/^№\d+\.\s*/, '')}</span>
                    </div>
                  </Card>
                </button>
              )
            })}
          </div>

          <div className="flex gap-3">
            <Button onClick={createTrip} disabled={creating} className="flex-1">
              {creating ? 'Создаём...' : `Создать поездку${selectedRoutes.size > 0 ? ` (${selectedRoutes.size} маршрутов)` : ''}`}
            </Button>
            <Button variant="outline" onClick={() => { setSelectedRoutes(new Set()); createTrip() }} disabled={creating}>
              Решу на месте
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
