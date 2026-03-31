'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, BookOpen, Trophy, ArrowLeft, ArrowRight, ChevronRight, Eye, EyeOff } from 'lucide-react'

interface Knot {
  id: string
  name: string
  difficulty_level: number
  category: string | null
  description: string | null
  steps_json: { step: number; text: string }[] | null
}

interface KnotProgress {
  knot_id: string
  status: string // locked, available, learning, mastered
  score: number
}

const LEVEL_LABELS: Record<number, { name: string; color: string }> = {
  1: { name: 'Базовые', color: 'text-mountain-success' },
  2: { name: 'Средние', color: 'text-mountain-accent' },
  3: { name: 'Продвинутые', color: 'text-mountain-danger' },
}

const STATUS_ICONS: Record<string, { icon: any; color: string; label: string }> = {
  locked: { icon: Lock, color: 'text-mountain-muted', label: 'Заблокирован' },
  available: { icon: ChevronRight, color: 'text-mountain-primary', label: 'Доступен' },
  learning: { icon: BookOpen, color: 'text-mountain-accent', label: 'Изучается' },
  mastered: { icon: Trophy, color: 'text-mountain-success', label: 'Освоен' },
}

export function KnotsModule({ knots }: { knots: Knot[] }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [progress, setProgress] = useState<Record<string, KnotProgress>>({})
  const [selectedKnot, setSelectedKnot] = useState<Knot | null>(null)
  const [mode, setMode] = useState<'map' | 'learn' | 'practice'>('map')
  const [currentStep, setCurrentStep] = useState(0)
  const [hintVisible, setHintVisible] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id)
        supabase
          .from('knot_progress')
          .select('knot_id, status, score')
          .eq('user_id', data.user.id)
          .then(({ data: progressData }) => {
            if (progressData) {
              const map: Record<string, KnotProgress> = {}
              progressData.forEach((p: any) => { map[p.knot_id] = p })
              setProgress(map)
            }
          })
      }
    })
  }, [])

  function getKnotStatus(knot: Knot): string {
    if (progress[knot.id]) return progress[knot.id].status
    const levelKnots = knots.filter(k => k.difficulty_level === knot.difficulty_level)
    const isFirst = levelKnots[0]?.id === knot.id

    if (knot.difficulty_level === 1 && isFirst) return 'available'

    const sameLevel = knots.filter(k => k.difficulty_level === knot.difficulty_level)
    const knotIndex = sameLevel.findIndex(k => k.id === knot.id)
    if (knotIndex > 0) {
      const prevKnot = sameLevel[knotIndex - 1]
      const prevStatus = progress[prevKnot.id]?.status
      if (prevStatus === 'learning' || prevStatus === 'mastered') return 'available'
    }

    if (isFirst && knot.difficulty_level > 1) {
      const prevLevel = knots.filter(k => k.difficulty_level === knot.difficulty_level - 1)
      const allMastered = prevLevel.every(k => progress[k.id]?.status === 'mastered')
      if (allMastered) return 'available'
    }

    return 'locked'
  }

  async function updateKnotProgress(knotId: string, status: string, score: number) {
    if (!userId) return
    const supabase = createClient()
    await supabase
      .from('knot_progress')
      .upsert({ user_id: userId, knot_id: knotId, status, score }, { onConflict: 'user_id,knot_id' })
    setProgress(prev => ({ ...prev, [knotId]: { knot_id: knotId, status, score } }))
  }

  function startLearn(knot: Knot) {
    setSelectedKnot(knot)
    setMode('learn')
    setCurrentStep(0)
    if (getKnotStatus(knot) === 'available') {
      updateKnotProgress(knot.id, 'learning', 0)
    }
  }

  function startPractice(knot: Knot) {
    setSelectedKnot(knot)
    setMode('practice')
    setCurrentStep(0)
    setHintVisible(false)
  }

  function backToMap() {
    setSelectedKnot(null)
    setMode('map')
  }

  const totalKnots = knots.length
  const masteredKnots = knots.filter(k => progress[k.id]?.status === 'mastered').length

  // LEVEL MAP VIEW
  if (mode === 'map') {
    return (
      <div className="space-y-8">
        {/* Progress */}
        {userId && (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm text-mountain-muted mb-1">
                <span>Прогресс</span>
                <span>{masteredKnots}/{totalKnots} узлов освоено</span>
              </div>
              <div
                className="h-3 bg-mountain-surface rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={masteredKnots}
                aria-valuemax={totalKnots}
                aria-label="Прогресс изучения узлов"
              >
                <div className="h-full bg-mountain-success rounded-full transition-all" style={{ width: `${(masteredKnots / totalKnots) * 100}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Knot levels */}
        {[1, 2, 3].map(level => {
          const levelKnots = knots.filter(k => k.difficulty_level === level)
          const levelInfo = LEVEL_LABELS[level]
          if (levelKnots.length === 0) return null

          return (
            <div key={level} className="space-y-3">
              <h2 className={`text-lg font-bold ${levelInfo.color}`}>
                Уровень {level}: {levelInfo.name}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {levelKnots.map(knot => {
                  const status = getKnotStatus(knot)
                  const statusInfo = STATUS_ICONS[status]
                  const Icon = statusInfo.icon
                  const isLocked = status === 'locked'
                  const score = progress[knot.id]?.score || 0

                  return (
                    <Card
                      key={knot.id}
                      className={`p-4 ${isLocked ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Icon size={18} className={statusInfo.color} aria-label={statusInfo.label} />
                            <h3 className="font-bold">{knot.name}</h3>
                          </div>
                          {knot.category && (
                            <span className="text-xs text-mountain-muted">{knot.category}</span>
                          )}
                          <p className="text-xs text-mountain-muted line-clamp-2">{knot.description}</p>
                        </div>
                        {status === 'mastered' && (
                          <span className="text-sm text-mountain-success">Освоен</span>
                        )}
                      </div>
                      {!isLocked && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => startLearn(knot)}
                            className="text-xs px-3 py-1.5 rounded bg-mountain-primary/20 text-mountain-primary hover:bg-mountain-primary/30 transition-colors"
                          >
                            Изучить
                          </button>
                          <button
                            onClick={() => startPractice(knot)}
                            className="text-xs px-3 py-1.5 rounded bg-mountain-accent/20 text-mountain-accent hover:bg-mountain-accent/30 transition-colors"
                          >
                            Практика
                          </button>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}

        {!userId && (
          <Card>
            <p className="text-mountain-muted text-center text-sm">
              <a href="/login" className="text-mountain-primary hover:underline">Войди</a>, чтобы отслеживать прогресс изучения узлов.
            </p>
          </Card>
        )}
      </div>
    )
  }

  // LEARN MODE: step-by-step with descriptions
  if (mode === 'learn' && selectedKnot) {
    const steps = selectedKnot.steps_json || []
    const step = steps[currentStep]

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={backToMap} className="flex items-center gap-2 text-sm text-mountain-muted hover:text-mountain-text transition-colors">
          <ArrowLeft size={16} /> Карта узлов
        </button>

        <div>
          <h2 className="text-2xl font-bold">{selectedKnot.name}</h2>
          <p className="text-sm text-mountain-muted mt-1">{selectedKnot.description}</p>
        </div>

        {/* Step progress */}
        <div className="flex gap-1" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemax={steps.length} aria-label="Прогресс по шагам">
          {steps.map((_, i) => (
            <div key={i} className={`flex-1 h-2 rounded-full transition-colors ${i <= currentStep ? 'bg-mountain-primary' : 'bg-mountain-surface'}`} />
          ))}
        </div>

        {step && (
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-mountain-primary text-white font-bold shrink-0">
                {step.step}
              </span>
              <span className="text-sm text-mountain-muted">Шаг {currentStep + 1} из {steps.length}</span>
            </div>
            <p className="text-lg leading-relaxed">{step.text}</p>
          </Card>
        )}

        <div className="flex justify-between">
          <Button
            variant="outline"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep(prev => prev - 1)}
          >
            <ArrowLeft size={16} className="mr-2" /> Назад
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button onClick={() => setCurrentStep(prev => prev + 1)}>
              Далее <ArrowRight size={16} className="ml-2" />
            </Button>
          ) : (
            <Button onClick={() => startPractice(selectedKnot)}>
              Перейти к практике <ArrowRight size={16} className="ml-2" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  // PRACTICE MODE: show steps one by one, user confirms they did it
  if (mode === 'practice' && selectedKnot) {
    const steps = selectedKnot.steps_json || []
    const step = steps[currentStep]
    const isLastStep = currentStep === steps.length - 1

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={backToMap} className="flex items-center gap-2 text-sm text-mountain-muted hover:text-mountain-text transition-colors">
          <ArrowLeft size={16} /> Карта узлов
        </button>

        <div>
          <h2 className="text-2xl font-bold">{selectedKnot.name} — Практика</h2>
          <p className="text-sm text-mountain-accent">Завяжи узел по памяти. Подсказка покажется по нажатию.</p>
        </div>

        <div className="flex gap-1" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemax={steps.length} aria-label="Прогресс практики">
          {steps.map((_, i) => (
            <div key={i} className={`flex-1 h-2 rounded-full transition-colors ${i <= currentStep ? 'bg-mountain-accent' : 'bg-mountain-surface'}`} />
          ))}
        </div>

        {step && (
          <Card className="space-y-4">
            <p className="text-lg font-medium">Шаг {step.step} из {steps.length}</p>

            <button
              onClick={() => setHintVisible(v => !v)}
              className="flex items-center gap-2 text-sm text-mountain-primary hover:text-mountain-primary/80 transition-colors"
            >
              {hintVisible ? <EyeOff size={15} /> : <Eye size={15} />}
              {hintVisible ? 'Скрыть подсказку' : 'Показать подсказку'}
            </button>

            {hintVisible && (
              <p className="text-mountain-muted text-sm leading-relaxed border-l-2 border-mountain-primary/30 pl-3">
                {step.text}
              </p>
            )}
          </Card>
        )}

        <div className="flex justify-between">
          <Button
            variant="outline"
            disabled={currentStep === 0}
            onClick={() => { setCurrentStep(prev => prev - 1); setHintVisible(false) }}
          >
            <ArrowLeft size={16} className="mr-2" /> Назад
          </Button>
          {!isLastStep ? (
            <Button onClick={() => { setCurrentStep(prev => prev + 1); setHintVisible(false) }}>
              Сделал! Дальше <ArrowRight size={16} className="ml-2" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => startLearn(selectedKnot)}>
                Повторить теорию
              </Button>
              <Button
                onClick={async () => {
                  await updateKnotProgress(selectedKnot.id, 'mastered', 100)
                  backToMap()
                }}
              >
                <Trophy size={16} className="mr-2" /> Узел освоен
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
