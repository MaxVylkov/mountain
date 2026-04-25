'use client'

import { useState, useEffect, FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X } from 'lucide-react'

interface Route {
  id: string
  name: string
}

interface CreateTeamModalProps {
  userId: string
  mountains: { id: string; name: string }[]
  onClose: () => void
  onCreate: (teamId?: string) => void
  hideLocation?: boolean
}

export default function CreateTeamModal({
  userId,
  mountains,
  onClose,
  onCreate,
  hideLocation = false,
}: CreateTeamModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [mountainId, setMountainId] = useState('')
  const [routeId, setRouteId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [routes, setRoutes] = useState<Route[]>([])
  const [loadingRoutes, setLoadingRoutes] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!mountainId) {
      setRoutes([])
      setRouteId('')
      return
    }

    const fetchRoutes = async () => {
      setLoadingRoutes(true)
      setRouteId('')
      const supabase = createClient()
      const { data } = await supabase
        .from('routes')
        .select('id, name')
        .eq('mountain_id', mountainId)
        .order('name')

      setRoutes(data ?? [])
      setLoadingRoutes(false)
    }

    fetchRoutes()
  }, [mountainId])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Введите название отделения')
      return
    }

    setSubmitting(true)
    setError('')

    const supabase = createClient()

    const { data: team, error: insertError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        mountain_id: mountainId || null,
        route_id: routeId || null,
        start_date: startDate || null,
        end_date: endDate || null,
        leader_id: userId,
      })
      .select('id')
      .single()

    if (insertError || !team) {
      setError('Не удалось создать отделение. Попробуйте ещё раз.')
      setSubmitting(false)
      return
    }

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: userId,
        role: 'leader',
      })

    if (memberError) {
      setError('Отделение создано, но не удалось добавить вас как руководителя.')
      setSubmitting(false)
      return
    }

    onCreate(team.id)
  }

  const selectStyles =
    'w-full rounded-xl border border-mountain-border bg-mountain-surface px-4 py-2 text-mountain-text focus:outline-none focus:ring-2 focus:ring-mountain-primary/50'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="surface-card w-full max-w-lg p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-mountain-text">Новое отделение</h2>
            <p className="mt-1 text-sm text-mountain-muted">
              Дай отделению понятное имя. Участников и снаряжение можно добавить после создания.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-mountain-muted hover:bg-mountain-bg hover:text-mountain-text"
            aria-label="Закрыть"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="team-name"
            label="Название"
            placeholder="Например: Алтай, майские"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label htmlFor="team-desc" className="block text-sm text-mountain-muted">
              Описание
            </label>
            <textarea
              id="team-desc"
              className={`${selectStyles} min-h-[80px] resize-y`}
              placeholder="Кто идет, цель выхода, важные вводные..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {!hideLocation && (
            <>
              <div className="space-y-1">
                <label htmlFor="team-mountain" className="block text-sm text-mountain-muted">
                  Горный массив
                </label>
                <select
                  id="team-mountain"
                  className={selectStyles}
                  value={mountainId}
                  onChange={(e) => setMountainId(e.target.value)}
                >
                  <option value="">Не выбран</option>
                  {mountains.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="team-route" className="block text-sm text-mountain-muted">
                  Маршрут
                </label>
                <select
                  id="team-route"
                  className={selectStyles}
                  value={routeId}
                  onChange={(e) => setRouteId(e.target.value)}
                  disabled={!mountainId || loadingRoutes}
                >
                  <option value="">
                    {!mountainId
                      ? 'Сначала выберите массив'
                      : loadingRoutes
                        ? 'Загрузка...'
                        : routes.length === 0
                          ? 'Нет маршрутов'
                          : 'Не выбран'}
                  </option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="team-start"
              label="Дата начала"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              id="team-end"
              label="Дата окончания"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-mountain-danger">{error}</p>
          )}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={submitting}
            >
              Отмена
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={submitting}
            >
              {submitting ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
