'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Check, Compass, Plus, Tent, MapPin, Search, X, Mountain, UsersRound } from 'lucide-react'
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

const TOTAL_STEPS = 3

export function TripWizard({ mountains, camps }: { mountains: MountainData[]; camps: CampData[] }) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [userId, setUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Step 1: Region + camp
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null)

  // Step 2: Routes
  const [routes, setRoutes] = useState<any[]>([])
  const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set())

  // Step 3: Team
  const [teamMode, setTeamMode] = useState<'skip' | 'existing' | null>(null)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [existingTeams, setExistingTeams] = useState<any[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [teamSearchQuery, setTeamSearchQuery] = useState('')
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
        // Load existing teams where user is leader
        supabase.from('team_members').select('team_id, role, team:teams(id, name, description)')
          .eq('user_id', data.user.id)
          .then(({ data: tmData }) => {
            if (tmData) setExistingTeams(tmData.filter((t: any) => t.role === 'leader').map((t: any) => t.team))
          })
      }
    })
  }, [])

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
    setCreating(true)
    const supabase = createClient()

    const tripName = selectedCampId
      ? camps.find(c => c.id === selectedCampId)?.name || selectedRegion
      : selectedRegion
    const teamId: string | null = selectedTeamId || null

    const { data: trip } = await supabase.from('trips')
      .insert({
        user_id: userId,
        name: tripName,
        region: selectedRegion,
        camp_id: selectedCampId,
        mountain_id: null,
        template: null,
        status: 'planning',
        packing_set_id: null,
        team_id: teamId,
      })
      .select().single()

    if (trip) {
      if (selectedRoutes.size > 0) {
        await supabase.from('trip_routes').insert(
          Array.from(selectedRoutes).map(routeId => ({ trip_id: trip.id, route_id: routeId }))
        )
      }
      router.push(`/trips/${trip.id}`)
    }
    setCreating(false)
  }

  const stepLabels = ['Район', 'Маршруты', 'Отделение']
  const currentRegion = selectedRegion ? regions.find(r => r.name === selectedRegion) : null
  const selectedCamp = selectedCampId ? camps.find(c => c.id === selectedCampId) : null
  const progressPercent = Math.round((step / TOTAL_STEPS) * 100)
  const filteredTeams = useMemo(() => {
    const q = teamSearchQuery.trim().toLowerCase()
    if (!q) return existingTeams
    return existingTeams.filter((team: any) =>
      team.name?.toLowerCase().includes(q) ||
      team.description?.toLowerCase().includes(q)
    )
  }, [existingTeams, teamSearchQuery])
  const selectedTeam = existingTeams.find((team: any) => team.id === selectedTeamId)

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
    <div className="max-w-5xl mx-auto space-y-6">
      <Card className="p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-mountain-muted">
          <Compass className="h-4 w-4 text-mountain-primary" />
          Создание поездки
        </div>
        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-mountain-text">{stepLabels[step - 1]}</h1>
            <p className="mt-1 text-sm text-mountain-muted">
              {step === 1 && 'Выбери район, лагерь или вершину. Остальное подстроится под этот выбор.'}
              {step === 2 && 'Добавь маршруты в план поездки или оставь выбор на месте.'}
              {step === 3 && 'Свяжи поездку с отделением. Снаряжение будет готовиться уже там.'}
            </p>
          </div>
          <div className="min-w-48 md:w-64">
            <div className="mb-2 flex items-center justify-between text-xs text-mountain-muted">
              <span>Шаг {step} из {TOTAL_STEPS}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-mountain-bg">
              <div className="h-full rounded-full bg-mountain-primary transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Step 1: Region + Camp */}
      {step === 1 && (
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mountain-muted" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Район, лагерь или вершина..."
                className="w-full pl-10 pr-9 py-3 bg-mountain-surface border border-mountain-border rounded-xl text-sm text-mountain-text placeholder:text-mountain-muted focus:outline-none focus:border-mountain-primary transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-mountain-muted hover:text-mountain-text">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {filteredRegions.map(region => {
                const active = selectedRegion === region.name
                return (
                  <div key={region.name}>
                    <button onClick={() => selectRegion(region.name)} className="w-full text-left">
                      <Card hover className={`p-4 transition-colors ${active ? 'border-mountain-primary bg-mountain-primary/5' : ''}`}>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="flex items-center gap-2 text-base font-bold text-mountain-text">
                              <MapPin size={17} className="text-mountain-primary shrink-0" />
                              <span className="truncate">{region.name}</span>
                            </h3>
                            <p className="mt-1 text-sm text-mountain-muted">
                              {region.camps.length > 0
                                ? region.camps.slice(0, 3).map(c => c.name).join(', ')
                                : region.mountains.slice(0, 4).map(m => m.name).join(', ')}
                              {region.camps.length > 3 && ` и ещё ${region.camps.length - 3}`}
                              {region.camps.length === 0 && region.mountains.length > 4 && ` и ещё ${region.mountains.length - 4}`}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2 text-xs text-mountain-muted sm:justify-end">
                            {region.mountains.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-mountain-bg px-2 py-1">
                                <Mountain size={12} />
                                {region.mountains.length} вершин
                              </span>
                            )}
                            {region.camps.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-mountain-bg px-2 py-1">
                                <Tent size={12} />
                                {region.camps.length} лагеря
                              </span>
                            )}
                            {region.maxHeight > 0 && (
                              <span className="rounded-lg bg-mountain-bg px-2 py-1 font-mono text-mountain-accent">{region.maxHeight} м</span>
                            )}
                          </div>
                        </div>
                      </Card>
                    </button>

                    {active && region.camps.length > 0 && step === 1 && (
                      <div className="mt-2 rounded-xl border border-mountain-border bg-mountain-surface/40 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-mountain-muted">Альплагерь</p>
                          <button onClick={() => setStep(2)} className="text-xs font-medium text-mountain-primary hover:text-mountain-primary/80">
                            Без лагеря →
                          </button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {region.camps.map(camp => (
                            <button
                              key={camp.id}
                              onClick={() => { setSelectedCampId(camp.id); setStep(2) }}
                              className="rounded-lg border border-mountain-border bg-mountain-bg p-3 text-left transition-colors hover:border-mountain-primary"
                            >
                              <span className="flex items-center gap-1.5 text-sm font-medium text-mountain-text">
                                <Tent size={14} className="text-mountain-accent" />
                                {camp.name}
                              </span>
                              <span className="mt-1 flex flex-wrap gap-2 text-xs text-mountain-muted">
                                {camp.route_count && <span>{camp.route_count} маршрутов</span>}
                                {camp.difficulty_range && <span className="font-mono">{camp.difficulty_range}</span>}
                                {camp.altitude && <span className="font-mono">{camp.altitude} м</span>}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              {filteredRegions.length === 0 && (
                <p className="text-sm text-mountain-muted text-center py-4">Ничего не найдено</p>
              )}
            </div>
          </div>

          <aside className="lg:sticky lg:top-20 lg:self-start">
            <Card className="p-4 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-mountain-muted">Выбор района</p>
                <h2 className="mt-1 text-xl font-bold text-mountain-text">
                  {selectedRegion || 'Пока ничего не выбрано'}
                </h2>
                <p className="mt-1 text-sm text-mountain-muted">
                  {selectedCamp ? `Лагерь: ${selectedCamp.name}` : currentRegion ? 'Можно продолжить без лагеря или выбрать лагерь из списка.' : 'Начни с района, лагеря или вершины.'}
                </p>
              </div>

              {currentRegion && (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-mountain-bg p-2">
                    <p className="text-lg font-bold text-mountain-text">{currentRegion.mountains.length}</p>
                    <p className="text-[11px] text-mountain-muted">вершин</p>
                  </div>
                  <div className="rounded-lg bg-mountain-bg p-2">
                    <p className="text-lg font-bold text-mountain-text">{currentRegion.camps.length}</p>
                    <p className="text-[11px] text-mountain-muted">лагерей</p>
                  </div>
                  <div className="rounded-lg bg-mountain-bg p-2">
                    <p className="text-lg font-bold text-mountain-text">{currentRegion.maxHeight || '—'}</p>
                    <p className="text-[11px] text-mountain-muted">метров</p>
                  </div>
                </div>
              )}

              <Button onClick={() => selectedRegion && setStep(2)} disabled={!selectedRegion} className="w-full">
                Далее: маршруты
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Card>
          </aside>
          </div>
      )}

      {/* Step 2: Routes */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(1)} className="text-mountain-muted hover:text-mountain-text"><ArrowLeft size={20} /></button>
              <h2 className="text-2xl font-bold">Маршруты</h2>
            </div>
            <Button variant="outline" onClick={() => setStep(3)} className="text-sm">
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

          <Button onClick={() => setStep(3)} className="w-full">
            Далее → Отделение <ArrowRight size={16} className="ml-2" />
          </Button>
        </div>
      )}

      {/* Step 3: Team */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep(2)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-mountain-border text-mountain-muted hover:border-mountain-primary/60 hover:text-mountain-text"
                aria-label="Назад к маршрутам"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h2 className="text-2xl font-bold">Отделение</h2>
                <p className="text-sm text-mountain-muted">Можно привязать поездку к команде сейчас или сделать это позже.</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => { setTeamMode('skip'); createTrip() }}
              disabled={creating}
              className="self-start sm:self-auto"
            >
              {creating && teamMode === 'skip' ? 'Создаём...' : 'Пропустить'}
            </Button>
          </div>

          <Card className="p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-mountain-primary/10 text-mountain-primary">
                  <UsersRound size={18} />
                </div>
                <div>
                  <h3 className="font-semibold">Кто идет на маршрут?</h3>
                  <p className="mt-1 text-sm text-mountain-muted">
                    В отделении потом удобно распределить снаряжение, участников и готовность.
                  </p>
                </div>
              </div>
              <Button onClick={() => setShowTeamModal(true)} className="shrink-0">
                <Plus size={16} className="mr-2" />
                Новое отделение
              </Button>
            </div>
          </Card>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-semibold">Мои отделения</h3>
                <p className="text-sm text-mountain-muted">
                  {existingTeams.length > 0 ? `Доступно ${existingTeams.length}` : 'Пока нет созданных отделений'}
                </p>
              </div>
              {existingTeams.length > 5 && (
                <div className="relative w-full sm:w-72">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mountain-muted" />
                  <input
                    value={teamSearchQuery}
                    onChange={e => setTeamSearchQuery(e.target.value)}
                    placeholder="Найти отделение..."
                    className="w-full rounded-xl border border-mountain-border bg-mountain-surface py-2 pl-9 pr-3 text-sm text-mountain-text placeholder:text-mountain-muted focus:border-mountain-primary focus:outline-none"
                  />
                </div>
              )}
            </div>

            {existingTeams.length === 0 ? (
              <Card className="p-5 text-center">
                <p className="text-sm text-mountain-muted">Создай первое отделение, и оно сразу появится здесь.</p>
              </Card>
            ) : filteredTeams.length === 0 ? (
              <Card className="p-5 text-center">
                <p className="text-sm text-mountain-muted">По этому запросу ничего не нашлось.</p>
              </Card>
            ) : (
              <div className="grid gap-2">
                {filteredTeams.map((t: any) => {
                  const isSelected = selectedTeamId === t.id
                  return (
                    <button key={t.id} onClick={() => { setSelectedTeamId(t.id); setTeamMode('existing') }} className="w-full text-left">
                      <Card hover className={`p-4 transition-colors ${isSelected ? 'border-mountain-primary bg-mountain-primary/5' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                            isSelected ? 'border-mountain-primary bg-mountain-primary' : 'border-mountain-border'
                          }`}>
                            {isSelected && <Check size={14} className="text-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <span className="font-medium text-mountain-text">{t.name}</span>
                              {isSelected && <span className="text-xs font-medium text-mountain-primary">Выбрано</span>}
                            </div>
                            {t.description && <p className="mt-1 line-clamp-2 text-sm text-mountain-muted">{t.description}</p>}
                          </div>
                        </div>
                      </Card>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <Card className="sticky bottom-4 p-4 shadow-lg shadow-black/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  {selectedTeam ? selectedTeam.name : 'Отделение не выбрано'}
                </p>
                <p className="text-xs text-mountain-muted">
                  {selectedTeam ? 'Поездка будет связана с этим отделением.' : 'Можно создать новое, выбрать из списка или пропустить.'}
                </p>
              </div>
              <Button
                onClick={createTrip}
                disabled={creating || !selectedTeamId}
                className="sm:w-auto"
              >
                {creating ? 'Создаём...' : 'Создать поездку'}
                {!creating && <ArrowRight size={16} className="ml-2" />}
              </Button>
            </div>
          </Card>

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
