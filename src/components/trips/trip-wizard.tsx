'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Check, Package, Tent, MapPin, Search, X, Mountain, UsersRound } from 'lucide-react'
import CreateTeamModal from '@/components/teams/create-team-modal'

interface MountainData {
  id: string
  name: string
  region: string
  height: number
  description: string | null
}

interface CampData {
  id: string
  name: string
  region: string
  sub_region: string | null
  altitude: number | null
  route_count: number | null
  difficulty_range: string | null
}

interface RegionInfo {
  name: string
  mountains: MountainData[]
  camps: CampData[]
  maxHeight: number
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

function matchCampToMountainRegion(camp: CampData, mountainRegions: string[]): string | null {
  if (mountainRegions.includes(camp.region)) return camp.region
  if (camp.sub_region) {
    for (const mr of mountainRegions) {
      const mrLower = mr.toLowerCase()
      const subLower = camp.sub_region.toLowerCase()
      if (subLower.includes('кабардино') && mrLower.includes('кабардино')) return mr
      if (subLower.includes('карачаево') && mrLower.includes('карачаево')) return mr
      if (subLower.includes('приэльбрусье') && mrLower.includes('адырсу')) return mr
      if (subLower.includes('домбай') && mrLower.includes('карачаево')) return mr
      if (subLower.includes('осетия') && mrLower.includes('осетия')) return mr
      if (subLower.includes('дигория') && mrLower.includes('дигория')) return mr
    }
  }
  return null
}

const TOTAL_STEPS = 5

export function TripWizard({ mountains, camps }: { mountains: MountainData[]; camps: CampData[] }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Step 1: Region + camp
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null)

  // Step 2: Template
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [selectedPackingSet, setSelectedPackingSet] = useState<string | null>(null)
  const [templateGear, setTemplateGear] = useState<any[]>([])
  const [userGearIds, setUserGearIds] = useState<Set<string>>(new Set())
  const [userGearItems, setUserGearItems] = useState<any[]>([])
  const [userPackingSets, setUserPackingSets] = useState<any[]>([])

  // Step 4: Routes
  const [routes, setRoutes] = useState<any[]>([])
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set())

  // Step 5: Team
  const [teamMode, setTeamMode] = useState<'skip' | 'existing' | null>(null)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [existingTeams, setExistingTeams] = useState<any[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [allMountains, setAllMountains] = useState<{ id: string; name: string }[]>([])

  const [creating, setCreating] = useState(false)

  // Build regions
  const regions = useMemo(() => {
    const mountainRegions = [...new Set(mountains.map(m => m.region))].sort()
    const regionMap = new Map<string, RegionInfo>()

    for (const region of mountainRegions) {
      const regionMountains = mountains.filter(m => m.region === region)
      regionMap.set(region, {
        name: region,
        mountains: regionMountains,
        camps: [],
        maxHeight: Math.max(...regionMountains.map(m => m.height)),
      })
    }

    const unmatchedCamps: CampData[] = []
    for (const camp of camps) {
      const matchedRegion = matchCampToMountainRegion(camp, mountainRegions)
      if (matchedRegion && regionMap.has(matchedRegion)) {
        regionMap.get(matchedRegion)!.camps.push(camp)
      } else {
        unmatchedCamps.push(camp)
      }
    }

    const campOnlyRegions = new Map<string, CampData[]>()
    for (const camp of unmatchedCamps) {
      if (!campOnlyRegions.has(camp.region)) campOnlyRegions.set(camp.region, [])
      campOnlyRegions.get(camp.region)!.push(camp)
    }
    for (const [region, regionCamps] of campOnlyRegions) {
      regionMap.set(region, { name: region, mountains: [], camps: regionCamps, maxHeight: 0 })
    }

    return [...regionMap.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [mountains, camps])

  const filteredRegions = useMemo(() => {
    if (!searchQuery) return regions
    const q = searchQuery.toLowerCase()
    return regions.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.camps.some(c => c.name.toLowerCase().includes(q)) ||
      r.mountains.some(m => m.name.toLowerCase().includes(q))
    )
  }, [regions, searchQuery])

  // Auth + user data
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        supabase.from('user_gear').select('gear_id, gear(id, name, category, weight)')
          .eq('user_id', data.user.id)
          .then(({ data: gearData }) => {
            if (gearData) {
              setUserGearIds(new Set(gearData.map((g: any) => g.gear_id)))
              setUserGearItems(gearData.map((g: any) => g.gear))
            }
          })
        supabase.from('packing_sets').select('id, name, packing_items(gear_id, gear(id, name, category, weight))')
          .eq('user_id', data.user.id)
          .then(({ data: setsData }) => { if (setsData) setUserPackingSets(setsData) })
        // Load existing teams where user is leader
        supabase.from('team_members').select('team_id, role, team:teams(id, name, description)')
          .eq('user_id', data.user.id)
          .then(({ data: tmData }) => {
            if (tmData) setExistingTeams(tmData.filter((t: any) => t.role === 'leader').map((t: any) => t.team))
          })
      }
    })
  }, [])

  // Load gear
  useEffect(() => {
    if (!selectedTemplate && !selectedPackingSet) return
    if (selectedTemplate === 'my_closet') { setTemplateGear(userGearItems); return }
    if (selectedPackingSet) {
      const set = userPackingSets.find((s: any) => s.id === selectedPackingSet)
      if (set?.packing_items) setTemplateGear(set.packing_items.map((pi: any) => pi.gear).filter(Boolean))
      return
    }
    if (selectedTemplate) {
      createClient().from('gear_templates').select('gear_id, gear(id, name, category, weight)')
        .eq('template', selectedTemplate)
        .then(({ data }) => { if (data) setTemplateGear(data.map((d: any) => d.gear)) })
    }
  }, [selectedTemplate, selectedPackingSet, userGearItems, userPackingSets])

  // Load routes for region
  useEffect(() => {
    if (!selectedRegion) return
    const region = regions.find(r => r.name === selectedRegion)
    if (!region || region.mountains.length === 0) { setRoutes([]); return }
    createClient().from('routes').select('*, mountain:mountains(name)')
      .in('mountain_id', region.mountains.map(m => m.id))
      .order('difficulty').order('name')
      .then(({ data }) => { if (data) setRoutes(data) })
  }, [selectedRegion, regions])

  // Load all mountains for team modal
  useEffect(() => {
    createClient().from('mountains').select('id, name').order('name')
      .then(({ data }) => { if (data) setAllMountains(data) })
  }, [])

  function selectRegion(regionName: string) {
    setSelectedRegion(regionName)
    setSelectedCampId(null)
    const region = regions.find(r => r.name === regionName)
    if (!region || region.camps.length === 0) setStep(2)
  }

  async function createTrip() {
    if (!userId || !selectedRegion) return
    if (!selectedTemplate && !selectedPackingSet) return
    setCreating(true)
    const supabase = createClient()

    const tripName = selectedCampId
      ? camps.find(c => c.id === selectedCampId)?.name || selectedRegion
      : selectedRegion
    const templateKey = selectedTemplate && ['light_trek', 'np', 'sp3', 'sp2'].includes(selectedTemplate) ? selectedTemplate : null
    const templateName = TEMPLATES.find(t => t.key === selectedTemplate)?.name
      || userPackingSets.find((s: any) => s.id === selectedPackingSet)?.name
      || 'Мои сборы'

    let packingSetId: string | null = selectedPackingSet || null
    if (!selectedPackingSet) {
      const { data: newSet } = await supabase.from('packing_sets')
        .insert({ user_id: userId, name: `${tripName} — ${templateName}`, route_id: null })
        .select().single()
      packingSetId = newSet?.id || null
    }

    const teamId: string | null = selectedTeamId || null

    const { data: trip } = await supabase.from('trips')
      .insert({
        user_id: userId,
        name: tripName,
        region: selectedRegion,
        camp_id: selectedCampId,
        mountain_id: null,
        template: templateKey,
        status: 'packing',
        packing_set_id: packingSetId,
        team_id: teamId,
      })
      .select().single()

    if (trip) {
      if (!selectedPackingSet && packingSetId && templateGear.length > 0) {
        await supabase.from('packing_items').insert(
          templateGear.map(g => ({ packing_set_id: packingSetId, gear_id: g.id }))
        )
      }
      if (selectedRoutes.size > 0) {
        await supabase.from('trip_routes').insert(
          Array.from(selectedRoutes).map(routeId => ({ trip_id: trip.id, route_id: routeId }))
        )
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

  const stepLabels = ['Район', 'Шаблон', 'Снаряжение', 'Маршруты', 'Отделение']

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
              s <= step ? 'bg-mountain-primary text-white' : 'bg-mountain-surface text-mountain-muted'
            }`}>{s}</div>
            {s < TOTAL_STEPS && <div className={`flex-1 h-0.5 ${s < step ? 'bg-mountain-primary' : 'bg-mountain-border'}`} />}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-mountain-muted">
        {stepLabels.map(l => <span key={l}>{l}</span>)}
      </div>

      {/* Step 1: Region + Camp */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Куда собираемся?</h2>

          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mountain-muted" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Район, лагерь или вершина..."
              className="w-full pl-10 pr-9 py-3 bg-mountain-bg border border-mountain-border rounded-xl text-sm text-mountain-text placeholder:text-mountain-muted focus:outline-none focus:border-mountain-primary transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-mountain-muted hover:text-mountain-text">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="space-y-3">
            {filteredRegions.map(region => (
              <div key={region.name}>
                <button onClick={() => selectRegion(region.name)} className="w-full text-left">
                  <Card hover className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <MapPin size={18} className="text-mountain-primary shrink-0" />
                        {region.name}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-mountain-muted shrink-0">
                        {region.mountains.length > 0 && (
                          <span className="flex items-center gap-1"><Mountain size={12} /> {region.mountains.length} вершин</span>
                        )}
                        {region.maxHeight > 0 && (
                          <span className="font-mono text-mountain-accent">{region.maxHeight} м</span>
                        )}
                      </div>
                    </div>
                    {region.camps.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {region.camps.map(camp => (
                          <span key={camp.id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-mountain-surface text-mountain-muted">
                            <Tent size={10} /> {camp.name}
                            {camp.altitude ? <span className="font-mono">{camp.altitude}м</span> : null}
                          </span>
                        ))}
                      </div>
                    )}
                    {region.mountains.length > 0 && (
                      <p className="text-xs text-mountain-muted">
                        {region.mountains.slice(0, 4).map(m => m.name).join(', ')}
                        {region.mountains.length > 4 && ` и ещё ${region.mountains.length - 4}`}
                      </p>
                    )}
                  </Card>
                </button>

                {selectedRegion === region.name && region.camps.length > 0 && step === 1 && (
                  <div className="ml-6 mt-2 space-y-2">
                    <p className="text-sm text-mountain-muted">Выбери альплагерь (необязательно)</p>
                    {region.camps.map(camp => (
                      <button key={camp.id} onClick={() => { setSelectedCampId(camp.id); setStep(2) }} className="w-full text-left">
                        <Card hover className="py-2.5 px-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium flex items-center gap-1.5">
                              <Tent size={14} className="text-mountain-accent" /> {camp.name}
                            </span>
                            <div className="flex items-center gap-3 text-xs text-mountain-muted">
                              {camp.route_count && <span>{camp.route_count} маршрутов</span>}
                              {camp.difficulty_range && <span className="font-mono">{camp.difficulty_range}</span>}
                              {camp.altitude && <span className="font-mono">{camp.altitude} м</span>}
                            </div>
                          </div>
                        </Card>
                      </button>
                    ))}
                    <button onClick={() => setStep(2)} className="text-sm text-mountain-primary hover:underline pl-2">
                      Без лагеря →
                    </button>
                  </div>
                )}
              </div>
            ))}
            {filteredRegions.length === 0 && (
              <p className="text-sm text-mountain-muted text-center py-4">Ничего не найдено</p>
            )}
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
          <p className="text-sm text-mountain-muted">
            Район: <span className="text-mountain-text font-medium">{selectedRegion}</span>
            {selectedCampId && <> · Лагерь: <span className="text-mountain-text font-medium">{camps.find(c => c.id === selectedCampId)?.name}</span></>}
          </p>

          {(userGearItems.length > 0 || userPackingSets.length > 0) && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-mountain-muted">Мои сборки</h3>
              {userGearItems.length > 0 && (
                <button onClick={() => { setSelectedTemplate('my_closet'); setSelectedPackingSet(null); setStep(3) }} className="w-full text-left">
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
                <button key={s.id} onClick={() => { setSelectedPackingSet(s.id); setSelectedTemplate(null); setStep(3) }} className="w-full text-left">
                  <Card hover className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold">{s.name}</h3>
                      <span className="text-sm font-mono text-mountain-accent">{s.packing_items.length} предметов</span>
                    </div>
                    <p className="text-sm text-mountain-muted">Набор из кладовки</p>
                  </Card>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-mountain-muted">Шаблоны по уровню</h3>
            {TEMPLATES.map(t => (
              <button key={t.key} onClick={() => { setSelectedTemplate(t.key); setSelectedPackingSet(null); setStep(3) }} className="w-full text-left">
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
            <h2 className="text-2xl font-bold">Снаряжение</h2>
          </div>
          <p className="text-sm text-mountain-muted">Это снаряжение будет добавлено в твои сборы.</p>

          <div className="flex flex-wrap gap-4 text-sm">
            <span className="text-mountain-success">&#10003; Есть: {templateGear.filter(g => userGearIds.has(g.id)).length}</span>
            <span className="text-mountain-accent">&#9888; Нужно: {templateGear.filter(g => !userGearIds.has(g.id)).length}</span>
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
              </p>
            </Card>
          )}

          <Button onClick={() => setStep(4)} className="w-full">
            Далее → Маршруты <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      )}

      {/* Step 4: Routes */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(3)} className="text-mountain-muted hover:text-mountain-text"><ArrowLeft size={20} /></button>
              <h2 className="text-2xl font-bold">Маршруты</h2>
            </div>
            <Button variant="outline" onClick={() => setStep(5)} className="text-sm">
              Выберу на месте →
            </Button>
          </div>

          {routes.length > 0 ? (
            <div className="space-y-2">
              {routes.map(r => {
                const grade = r.description?.match(/Категория:\s*(\S+)/)?.[1]
                const mountainName = (r.mountain as any)?.name
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
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-mountain-primary border-mountain-primary' : 'border-mountain-border'}`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                        {grade && <span className="text-xs font-mono font-bold text-mountain-accent">{grade}</span>}
                        <span className="text-sm truncate">{r.name.replace(/^№\d+\.\s*/, '')}</span>
                        {mountainName && <span className="text-xs text-mountain-muted shrink-0">· {mountainName}</span>}
                      </div>
                    </Card>
                  </button>
                )
              })}
            </div>
          ) : (
            <Card className="text-center py-6">
              <p className="text-sm text-mountain-muted">Маршруты для этого района пока не добавлены</p>
            </Card>
          )}

          <Button onClick={() => setStep(5)} className="w-full">
            Далее → Отделение <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      )}

      {/* Step 5: Team */}
      {step === 5 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(4)} className="text-mountain-muted hover:text-mountain-text"><ArrowLeft size={20} /></button>
              <h2 className="text-2xl font-bold">Отделение</h2>
            </div>
            <Button variant="outline" onClick={() => { setTeamMode('skip'); createTrip() }} disabled={creating} className="text-sm">
              {creating && teamMode === 'skip' ? 'Создаём...' : 'Без отделения →'}
            </Button>
          </div>
          <p className="text-sm text-mountain-muted">Создай отделение для совместного выхода или выбери существующее.</p>

          {/* Mode selection */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setShowTeamModal(true)} className="text-left">
              <Card hover className="space-y-1">
                <h3 className="font-semibold flex items-center gap-2">
                  <UsersRound size={16} className="text-mountain-primary" /> Новое отделение
                </h3>
                <p className="text-xs text-mountain-muted">Создать и пригласить участников</p>
              </Card>
            </button>
            {existingTeams.length > 0 && (
              <button onClick={() => setTeamMode('existing')} className="text-left">
                <Card hover className={`space-y-1 ${teamMode === 'existing' ? 'border-mountain-primary' : ''}`}>
                  <h3 className="font-semibold flex items-center gap-2">
                    <UsersRound size={16} className="text-mountain-accent" /> Моё отделение
                  </h3>
                  <p className="text-xs text-mountain-muted">Выбрать из существующих ({existingTeams.length})</p>
                </Card>
              </button>
            )}
          </div>

          {/* Select existing team */}
          {teamMode === 'existing' && (
            <div className="space-y-2">
              {existingTeams.map((t: any) => (
                <button key={t.id} onClick={() => setSelectedTeamId(t.id)} className="w-full text-left">
                  <Card className={`p-3 ${selectedTeamId === t.id ? 'border-mountain-primary' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        selectedTeamId === t.id ? 'bg-mountain-primary border-mountain-primary' : 'border-mountain-border'
                      }`}>
                        {selectedTeamId === t.id && <Check size={14} className="text-white" />}
                      </div>
                      <span className="text-sm font-medium">{t.name}</span>
                    </div>
                    {t.description && <p className="text-xs text-mountain-muted mt-1 ml-7">{t.description}</p>}
                  </Card>
                </button>
              ))}
            </div>
          )}

          {/* Create button */}
          {teamMode === 'existing' && (
            <Button
              onClick={createTrip}
              disabled={creating || !selectedTeamId}
              className="w-full"
            >
              {creating ? 'Создаём...' : 'Создать поездку'}
            </Button>
          )}

          {showTeamModal && userId && (
            <CreateTeamModal
              userId={userId}
              mountains={allMountains}
              hideLocation
              onClose={() => setShowTeamModal(false)}
              onCreate={async (teamId) => {
                setShowTeamModal(false)
                if (teamId) {
                  setSelectedTeamId(teamId)
                  setTeamMode('existing')
                  // Reload teams list to include the newly created team
                  const supabase = createClient()
                  const { data: tmData } = await supabase.from('team_members')
                    .select('team_id, role, team:teams(id, name, description)')
                    .eq('user_id', userId!)
                  if (tmData) setExistingTeams(tmData.filter((t: any) => t.role === 'leader').map((t: any) => t.team))
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
