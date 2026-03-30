'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X, Plus, Trash2 } from 'lucide-react'

interface Exercise {
  name: string
  sets: string
  notes: string
}

interface Props {
  onClose: () => void
  onCreated: (workout: any) => void
}

const CATEGORIES = ['Силовая', 'Выносливость', 'Кардио', 'Специальная', 'Восстановление']

export function CreateWorkoutModal({ onClose, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Силовая')
  const [duration, setDuration] = useState('')
  const [goal, setGoal] = useState('')
  const [description, setDescription] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([{ name: '', sets: '', notes: '' }])
  const [saving, setSaving] = useState(false)

  const addExercise = () => setExercises(prev => [...prev, { name: '', sets: '', notes: '' }])
  const removeExercise = (i: number) => setExercises(prev => prev.filter((_, idx) => idx !== i))
  const updateExercise = (i: number, field: keyof Exercise, value: string) =>
    setExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))

  const submit = async () => {
    if (!title.trim()) return
    const validExercises = exercises.filter(e => e.name.trim())
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { data, error } = await supabase
      .from('user_workouts')
      .insert({
        user_id: user.id,
        title: title.trim(),
        category,
        duration: duration.trim() || '—',
        goal: goal.trim() || category,
        description: description.trim() || null,
        exercises: validExercises,
      })
      .select()
      .single()

    setSaving(false)
    if (!error && data) {
      onCreated(data)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-mountain-bg border border-mountain-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-mountain-border shrink-0">
          <h2 className="font-semibold text-mountain-text">Своя тренировка</h2>
          <button onClick={onClose} className="text-mountain-muted hover:text-mountain-text transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Название тренировки"
            className="w-full rounded-xl border border-mountain-border bg-mountain-bg px-4 py-2.5 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
          />

          {/* Category + Duration row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-mountain-muted mb-1 block">Тип</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full rounded-xl border border-mountain-border bg-mountain-bg px-3 py-2.5 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-mountain-muted mb-1 block">Длительность</label>
              <input
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="45 мин"
                className="w-full rounded-xl border border-mountain-border bg-mountain-bg px-3 py-2.5 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
              />
            </div>
          </div>

          {/* Goal */}
          <input
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="Цель тренировки (например: Сила рук)"
            className="w-full rounded-xl border border-mountain-border bg-mountain-bg px-4 py-2.5 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Описание (необязательно)"
            rows={2}
            className="w-full rounded-xl border border-mountain-border bg-mountain-bg px-4 py-2.5 text-sm text-mountain-text resize-none focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
          />

          {/* Exercises */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-mountain-muted uppercase tracking-wide">Упражнения</p>
            {exercises.map((ex, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="w-5 h-5 rounded-full bg-mountain-primary/15 text-mountain-primary text-xs font-bold flex items-center justify-center mt-2.5 shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 space-y-1.5">
                  <input
                    value={ex.name}
                    onChange={e => updateExercise(i, 'name', e.target.value)}
                    placeholder="Название упражнения"
                    className="w-full rounded-lg border border-mountain-border bg-mountain-bg px-3 py-2 text-sm text-mountain-text focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      value={ex.sets}
                      onChange={e => updateExercise(i, 'sets', e.target.value)}
                      placeholder="Подходы/время"
                      className="rounded-lg border border-mountain-border bg-mountain-bg px-3 py-1.5 text-xs text-mountain-text focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
                    />
                    <input
                      value={ex.notes}
                      onChange={e => updateExercise(i, 'notes', e.target.value)}
                      placeholder="Заметка"
                      className="rounded-lg border border-mountain-border bg-mountain-bg px-3 py-1.5 text-xs text-mountain-text focus:outline-none focus:border-mountain-primary placeholder:text-mountain-muted"
                    />
                  </div>
                </div>
                {exercises.length > 1 && (
                  <button
                    onClick={() => removeExercise(i)}
                    className="mt-2.5 text-mountain-muted hover:text-mountain-danger transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addExercise}
              className="flex items-center gap-1.5 text-sm text-mountain-primary hover:text-mountain-primary/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Добавить упражнение
            </button>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-mountain-border flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-mountain-border text-mountain-muted text-sm hover:text-mountain-text transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={submit}
            disabled={saving || !title.trim()}
            className="px-4 py-2 rounded-xl bg-mountain-primary text-white text-sm font-medium hover:bg-mountain-primary/80 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Сохраняю...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  )
}
