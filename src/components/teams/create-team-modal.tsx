'use client'

import { useState, useEffect, FormEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Route {
  id: string
  name: string
}

interface CreateTeamModalProps {
  userId: string
  mountains: { id: string; name: string }[]
  onClose: () => void
  onCreate: () => void
}

export default function CreateTeamModal({
  userId,
  mountains,
  onClose,
  onCreate,
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

    onCreate()
  }

  const selectStyles =
    'w-full rounded-xl border border-mountain-border bg-mountain-surface px-4 py-2 text-mountain-text focus:outline-none focus:ring-2 focus:ring-mountain-primary/50'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="glass-card w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-mountain-text">
          Создать отделение
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="team-name"
            label="Название"
            placeholder="Название отделения"
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
              placeholder="Описание (необязательно)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

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

          <div className="grid grid-cols-2 gap-4">
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

          <div className="flex gap-3 pt-2">
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
