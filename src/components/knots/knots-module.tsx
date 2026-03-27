'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Lock, BookOpen, Brain, Trophy, Check, ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react'

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
  const [mode, setMode] = useState<'map' | 'learn' | 'practice' | 'test'>('map')
  const [currentStep, setCurrentStep] = useState(0)
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({})
  const [testSubmitted, setTestSubmitted] = useState(false)

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
    // Auto-unlock: first knot of each level if previous level has at least one mastered
    const levelKnots = knots.filter(k => k.difficulty_level === knot.difficulty_level)
    const isFirst = levelKnots[0]?.id === knot.id

    if (knot.difficulty_level === 1 && isFirst) return 'available'

    // Unlock next knot in same level if previous is at least 'learning'
    const sameLevel = knots.filter(k => k.difficulty_level === knot.difficulty_level)
    const knotIndex = sameLevel.findIndex(k => k.id === knot.id)
    if (knotIndex > 0) {
      const prevKnot = sameLevel[knotIndex - 1]
      const prevStatus = progress[prevKnot.id]?.status
      if (prevStatus === 'learning' || prevStatus === 'mastered') return 'available'
    }

    // Unlock first knot of next level if all previous level mastered
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
  }

  function startTest(knot: Knot) {
    setSelectedKnot(knot)
    setMode('test')
    setTestAnswers({})
    setTestSubmitted(false)
  }

  function submitTest() {
    if (!selectedKnot?.steps_json) return
    setTestSubmitted(true)
    // Calculate score: each correct step order = points
    const totalSteps = selectedKnot.steps_json.length
    let correct = 0
    selectedKnot.steps_json.forEach((s, i) => {
      if (testAnswers[i] === s.text) correct++
    })
    const score = Math.round((correct / totalSteps) * 100)

    if (score >= 80) {
      updateKnotProgress(selectedKnot.id, 'mastered', score)
    } else {
      updateKnotProgress(selectedKnot.id, 'learning', Math.max(progress[selectedKnot.id]?.score || 0, score))
    }
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
              <div className="h-3 bg-mountain-surface rounded-full overflow-hidden">
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
                      hover={!isLocked}
                      className={`p-4 ${isLocked ? 'opacity-50' : 'cursor-pointer'}`}
                      onClick={() => !isLocked && startLearn(knot)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Icon size={18} className={statusInfo.color} />
                            <h3 className="font-bold">{knot.name}</h3>
                          </div>
                          {knot.category && (
                            <span className="text-xs text-mountain-muted">{knot.category}</span>
                          )}
                          <p className="text-xs text-mountain-muted line-clamp-2">{knot.description}</p>
                        </div>
                        {status === 'mastered' && (
                          <span className="text-sm font-mono text-mountain-success">{score}%</span>
                        )}
                        {status === 'learning' && score > 0 && (
                          <span className="text-sm font-mono text-mountain-accent">{score}%</span>
                        )}
                      </div>
                      {!isLocked && status !== 'locked' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); startLearn(knot) }}
                            className="text-xs px-2 py-1 rounded bg-mountain-primary/20 text-mountain-primary hover:bg-mountain-primary/30"
                          >
                            Изучить
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); startPractice(knot) }}
                            className="text-xs px-2 py-1 rounded bg-mountain-accent/20 text-mountain-accent hover:bg-mountain-accent/30"
                          >
                            Практика
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); startTest(knot) }}
                            className="text-xs px-2 py-1 rounded bg-mountain-success/20 text-mountain-success hover:bg-mountain-success/30"
                          >
                            Тест
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
        <button onClick={backToMap} className="flex items-center gap-2 text-sm text-mountain-muted hover:text-mountain-text">
          <ArrowLeft size={16} /> Карта узлов
        </button>

        <div>
          <h2 className="text-2xl font-bold">{selectedKnot.name}</h2>
          <p className="text-sm text-mountain-muted mt-1">{selectedKnot.description}</p>
        </div>

        {/* Step progress */}
        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div key={i} className={`flex-1 h-2 rounded-full ${i <= currentStep ? 'bg-mountain-primary' : 'bg-mountain-surface'}`} />
          ))}
        </div>

        {step && (
          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-mountain-primary text-white font-bold">
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
              <Brain size={16} className="mr-2" /> Перейти к практике
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

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={backToMap} className="flex items-center gap-2 text-sm text-mountain-muted hover:text-mountain-text">
          <ArrowLeft size={16} /> Карта узлов
        </button>

        <div>
          <h2 className="text-2xl font-bold">{selectedKnot.name} — Практика</h2>
          <p className="text-sm text-mountain-accent">Завяжи узел по памяти. Подсказки покажутся по нажатию.</p>
        </div>

        <div className="flex gap-1">
          {steps.map((_, i) => (
            <div key={i} className={`flex-1 h-2 rounded-full ${i <= currentStep ? 'bg-mountain-accent' : 'bg-mountain-surface'}`} />
          ))}
        </div>

        {step && (
          <Card className="space-y-4">
            <p className="text-lg font-medium">Шаг {step.step}: Что делать?</p>
            <details className="cursor-pointer">
              <summary className="text-mountain-primary hover:underline">Показать подсказку</summary>
              <p className="mt-2 text-mountain-muted">{step.text}</p>
            </details>
          </Card>
        )}

        <div className="flex justify-between">
          <Button variant="outline" disabled={currentStep === 0} onClick={() => setCurrentStep(prev => prev - 1)}>
            <ArrowLeft size={16} className="mr-2" /> Назад
          </Button>
          {currentStep < steps.length - 1 ? (
            <Button onClick={() => setCurrentStep(prev => prev + 1)}>
              Сделал! Дальше <ArrowRight size={16} className="ml-2" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => startLearn(selectedKnot)}>Повторить</Button>
              <Button onClick={() => startTest(selectedKnot)}>
                <Trophy size={16} className="mr-2" /> Пройти тест
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // TEST MODE: reorder steps correctly
  if (mode === 'test' && selectedKnot) {
    const steps = selectedKnot.steps_json || []
    // Shuffle steps for the test
    const [shuffledSteps] = useState(() =>
      [...steps].sort(() => Math.random() - 0.5)
    )

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={backToMap} className="flex items-center gap-2 text-sm text-mountain-muted hover:text-mountain-text">
          <ArrowLeft size={16} /> Карта узлов
        </button>

        <div>
          <h2 className="text-2xl font-bold">{selectedKnot.name} — Тест</h2>
          <p className="text-sm text-mountain-muted">Расставь шаги в правильном порядке.</p>
        </div>

        <div className="space-y-2">
          {steps.map((_, i) => (
            <Card key={i} className="p-3">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-mountain-surface text-mountain-muted font-bold text-sm">
                  {i + 1}
                </span>
                <select
                  className="flex-1 bg-mountain-surface border border-mountain-border rounded-lg px-3 py-2 text-sm text-mountain-text"
                  value={testAnswers[i] || ''}
                  onChange={(e) => setTestAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                  disabled={testSubmitted}
                >
                  <option value="">Выбери шаг...</option>
                  {shuffledSteps.map((s, j) => (
                    <option key={j} value={s.text}>{s.text.substring(0, 80)}...</option>
                  ))}
                </select>
                {testSubmitted && (
                  testAnswers[i] === steps[i].text
                    ? <Check size={20} className="text-mountain-success shrink-0" />
                    : <span className="text-mountain-danger text-xs shrink-0">✗</span>
                )}
              </div>
              {testSubmitted && testAnswers[i] !== steps[i].text && (
                <p className="text-xs text-mountain-success mt-2 ml-11">Правильно: {steps[i].text}</p>
              )}
            </Card>
          ))}
        </div>

        {!testSubmitted ? (
          <Button
            onClick={submitTest}
            disabled={Object.keys(testAnswers).length < steps.length}
            className="w-full"
          >
            Проверить
          </Button>
        ) : (
          <div className="space-y-3">
            {(() => {
              const totalSteps = steps.length
              let correct = 0
              steps.forEach((s, i) => { if (testAnswers[i] === s.text) correct++ })
              const score = Math.round((correct / totalSteps) * 100)
              const passed = score >= 80

              return (
                <Card className={`p-4 text-center ${passed ? 'border-mountain-success/30' : 'border-mountain-danger/30'}`}>
                  <p className={`text-2xl font-bold ${passed ? 'text-mountain-success' : 'text-mountain-danger'}`}>
                    {score}%
                  </p>
                  <p className="text-sm text-mountain-muted mt-1">
                    {passed ? 'Узел освоен! Отличная работа.' : 'Нужно ещё потренироваться. 80% для освоения.'}
                  </p>
                </Card>
              )
            })()}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => startTest(selectedKnot)} className="flex-1">
                Пройти снова
              </Button>
              <Button onClick={backToMap} className="flex-1">
                К карте узлов
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
