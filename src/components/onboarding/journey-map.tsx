'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Backpack, Navigation, Mountain, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StageProgress {
  id: string
  overallProgress: number
}

interface JourneyMapProps {
  level: 'beginner' | 'intermediate' | 'advanced'
  onComplete: () => void
  viewMode?: boolean
  progress?: StageProgress[]
}

type Level = 'beginner' | 'intermediate' | 'advanced'

// Hover hints per level per stage
const hoverHints: Record<string, Record<Level, string>> = {
  foothills: {
    beginner: 'Начни с раздела «Граф знаний» — там вся теория из учебника альпинизма. Потом переходи к «Узлам» — учи их пошагово как в Duolingo. А «Тренировки» помогут подготовить тело к горам.',
    intermediate: 'Ты уже знаешь основы. Используй «Граф знаний» чтобы закрепить сложные темы — метеорологию, спасработы, лавинную безопасность. В «Узлах» проверь себя в режиме теста.',
    advanced: 'Этот этап ты уже прошёл. Но можешь вернуться к «Графу знаний» для повторения специфических тем перед сложными восхождениями.',
  },
  'base-camp': {
    beginner: 'В «Кладовке» занеси всё своё снаряжение — приложение поможет ничего не забыть при сборах. В «Маршрутах» изучи районы и выбери подходящий альплагерь на карте.',
    intermediate: 'Веди учёт снаряжения в «Кладовке» и отмечай маршруты которые хочешь пройти. Используй карту альплагерей чтобы спланировать следующий выезд.',
    advanced: 'Используй «Маршруты» для выбора новых целей — фильтруй по сложности, изучай описания. «Кладовка» поможет быстро собраться в поездку.',
  },
  'assault-camp': {
    beginner: 'Когда будешь готов — создай свою первую поездку в разделе «Поездки». Выбери маршрут, собери снаряжение из кладовки, проверь чек-лист готовности.',
    intermediate: 'Планируй восхождения в «Поездках» — выбирай маршруты, распределяй снаряжение по рюкзакам, отмечай статус подготовки.',
    advanced: 'Создавай поездки, добавляй несколько маршрутов, веди статистику восхождений. Скоро здесь появится возможность объединяться в отделения с другими альпинистами.',
  },
  summit: {
    beginner: 'Это твоя цель! Когда пройдёшь все этапы подготовки — ты будешь готов к своему первому восхождению. Удачи на маршруте!',
    intermediate: 'Отмечай свои восхождения, веди историю пройденных маршрутов. Каждая вершина — это шаг к следующему разряду.',
    advanced: 'Фиксируй результаты восхождений, собирай статистику. Твой опыт — основа для планирования всё более сложных маршрутов.',
  },
}

// Order: bottom to top (Подножие first, Вершина last)
const stages = [
  {
    id: 'foothills',
    name: 'ПОДНОЖИЕ',
    subtitle: 'Знания и подготовка',
    description: 'Изучи теорию, освой узлы, начни тренироваться',
    icon: BookOpen,
    modules: ['Граф знаний', 'Узлы', 'Тренировки'],
    colorClass: 'text-mountain-success',
    bgClass: 'bg-mountain-success/20',
    barClass: 'bg-mountain-success',
    pillBg: 'bg-mountain-success/10',
    pillText: 'text-mountain-success',
    borderHover: 'hover:border-mountain-success/50',
    isSummit: false,
  },
  {
    id: 'base-camp',
    name: 'БАЗОВЫЙ ЛАГЕРЬ',
    subtitle: 'Снаряжение и маршруты',
    description: 'Собери своё снаряжение и изучи маршруты района',
    icon: Backpack,
    modules: ['Кладовка', 'Маршруты'],
    colorClass: 'text-mountain-primary',
    bgClass: 'bg-mountain-primary/20',
    barClass: 'bg-mountain-primary',
    pillBg: 'bg-mountain-primary/10',
    pillText: 'text-mountain-primary',
    borderHover: 'hover:border-mountain-primary/50',
    isSummit: false,
  },
  {
    id: 'assault-camp',
    name: 'ШТУРМОВОЙ ЛАГЕРЬ',
    subtitle: 'Планирование поездки',
    description: 'Спланируй маршрут, собери снаряжение, проверь готовность',
    icon: Navigation,
    modules: ['Поездки'],
    colorClass: 'text-mountain-accent',
    bgClass: 'bg-mountain-accent/20',
    barClass: 'bg-mountain-accent',
    pillBg: 'bg-mountain-accent/10',
    pillText: 'text-mountain-accent',
    borderHover: 'hover:border-mountain-accent/50',
    isSummit: false,
  },
  {
    id: 'summit',
    name: 'ВЕРШИНА',
    subtitle: 'Выход на маршрут',
    description: 'Ты готов к восхождению!',
    icon: Mountain,
    modules: [],
    colorClass: 'text-mountain-danger',
    bgClass: 'bg-mountain-danger/20',
    barClass: 'bg-mountain-danger',
    pillBg: 'bg-mountain-danger/10',
    pillText: 'text-mountain-danger',
    borderHover: 'hover:border-mountain-danger/50',
    isSummit: true,
  },
]

function isStageCompleted(_stageId: string, _level: string): boolean {
  return false
}

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.25,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
}

export function JourneyMap({ level, onComplete, viewMode, progress }: JourneyMapProps) {
  const [hoveredStage, setHoveredStage] = useState<string | null>(null)

  function getStageProgress(stageId: string): number | undefined {
    if (!progress) return undefined
    const found = progress.find((p) => p.id === stageId)
    return found?.overallProgress
  }

  const activeHint = hoveredStage ? hoverHints[hoveredStage]?.[level] : null

  return (
    <div className="w-full max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-10 text-mountain-text">
        Твой путь к вершине
      </h2>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: stages */}
        <motion.div
          className="relative flex-1"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="relative flex flex-col gap-6" style={{ zIndex: 1 }}>
            {stages.map((stage, index) => {
              const completed = isStageCompleted(stage.id, level)
              const stageProgress = getStageProgress(stage.id)
              const offsetPercent = index * 12
              const isHovered = hoveredStage === stage.id

              return (
                <motion.div
                  key={stage.id}
                  variants={itemVariants}
                  style={{ marginLeft: `${offsetPercent}%` }}
                  onMouseEnter={() => setHoveredStage(stage.id)}
                  onMouseLeave={() => setHoveredStage(null)}
                >
                  <div
                    className={`
                      relative bg-mountain-surface/80 backdrop-blur border rounded-xl transition-all cursor-pointer
                      ${stage.isSummit ? 'p-5' : 'p-4'}
                      ${completed ? 'opacity-50 border-mountain-border' : ''}
                      ${isHovered && !completed ? 'border-mountain-text/30 scale-[1.02]' : 'border-mountain-border'}
                      ${!completed ? stage.borderHover : ''}
                    `}
                  >
                    {stage.isSummit && (
                      <div className="absolute inset-0 rounded-xl bg-mountain-danger/5 shadow-[0_0_30px_rgba(239,68,68,0.2)] pointer-events-none" />
                    )}

                    <div className="flex items-start gap-3 relative">
                      <div
                        className={`
                          flex-shrink-0 flex items-center justify-center rounded-full
                          ${stage.bgClass}
                          ${stage.isSummit ? 'w-12 h-12' : 'w-10 h-10'}
                        `}
                      >
                        {completed ? (
                          <Check className={`w-5 h-5 ${stage.colorClass}`} />
                        ) : (
                          <span className={`font-bold ${stage.isSummit ? 'text-xl' : 'text-lg'} ${stage.colorClass}`}>
                            {index + 1}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-mountain-text ${stage.isSummit ? 'text-base' : 'text-sm'}`}>
                          {stage.name}
                          <span className="font-normal text-mountain-muted text-xs ml-1.5">
                            — {stage.subtitle}
                          </span>
                        </h3>
                        <p className="text-xs text-mountain-muted mt-0.5">{stage.description}</p>

                        {stage.modules.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {stage.modules.map((mod) => (
                              <span
                                key={mod}
                                className={`text-xs px-2 py-0.5 rounded-full ${stage.pillBg} ${stage.pillText}`}
                              >
                                {mod}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {completed && (
                      <div className="absolute top-2 right-2">
                        <div className="w-5 h-5 rounded-full bg-mountain-success/20 flex items-center justify-center">
                          <Check className="w-3 h-3 text-mountain-success" />
                        </div>
                      </div>
                    )}

                    {stageProgress !== undefined && (
                      <div className="mt-2 w-full h-1 rounded-full bg-mountain-border/50">
                        <div
                          className={`h-1 rounded-full ${stage.barClass} transition-all duration-500`}
                          style={{ width: `${Math.min(100, Math.max(0, stageProgress))}%` }}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Right: hover hint panel */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="lg:sticky lg:top-24 min-h-[120px]">
            <AnimatePresence mode="wait">
              {activeHint ? (
                <motion.div
                  key={hoveredStage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-mountain-surface/60 backdrop-blur border border-mountain-border rounded-xl p-4"
                >
                  <p className="text-sm text-mountain-text leading-relaxed">{activeHint}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-mountain-surface/30 border border-mountain-border/50 rounded-xl p-4"
                >
                  <p className="text-sm text-mountain-muted text-center">
                    Наведи на этап, чтобы узнать подробнее
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {!viewMode && (
        <div className="mt-10 flex justify-center">
          <Button variant="primary" onClick={onComplete}>
            Начать путь →
          </Button>
        </div>
      )}
    </div>
  )
}
