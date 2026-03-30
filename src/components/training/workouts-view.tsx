'use client'

import { useState, useEffect } from 'react'
import { Clock, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { CreateWorkoutModal } from './create-workout-modal'

interface Exercise {
  name: string
  sets?: string
  notes?: string
}

interface Workout {
  id: string
  title: string
  category: string
  categoryColor: string
  duration: string
  goal: string
  description: string
  exercises: Exercise[]
}

const WORKOUTS: Workout[] = [
  {
    id: '1',
    title: 'Тренировка пальцев на хангборде',
    category: 'Специальная',
    categoryColor: 'bg-purple-500/15 text-purple-400',
    duration: '30–40 мин',
    goal: 'Сила пальцев',
    description: 'Ключевая тренировка для скалолазов и альпинистов. Развивает силу хвата, необходимую для работы на скальном рельефе.',
    exercises: [
      { name: 'Разминка — сгибание и разгибание пальцев', sets: '2 мин' },
      { name: 'Мёртвый хват (dead hang) на полке 20 мм', sets: '5 × 10 сек / отдых 3 мин' },
      { name: 'Мёртвый хват на полке 15 мм', sets: '3 × 7 сек / отдых 3 мин' },
      { name: 'Хват щипком (pinch grip)', sets: '4 × 8 сек / отдых 2 мин' },
      { name: 'Открытый хват на макро-зацепе', sets: '3 × 12 сек / отдых 2 мин' },
      { name: 'Заминка — самомассаж ладоней и пальцев', sets: '5 мин' },
    ],
  },
  {
    id: '2',
    title: 'Длинный бег в горах',
    category: 'Выносливость',
    categoryColor: 'bg-mountain-success/15 text-mountain-success',
    duration: '60–90 мин',
    goal: 'Аэробная база',
    description: 'Строит аэробную базу — фундамент для многодневных восхождений. Бег по пересечённой местности имитирует нагрузку на подходах.',
    exercises: [
      { name: 'Разминочная ходьба', sets: '5 мин' },
      { name: 'Лёгкий бег (пульс 130–140 уд/мин)', sets: '15 мин' },
      { name: 'Бег по пересечённой местности или горке', sets: '40–60 мин' },
      { name: 'Заминка — ходьба', sets: '5 мин' },
      { name: 'Растяжка икр, бёдер, поясницы', sets: '10 мин' },
    ],
  },
  {
    id: '3',
    title: 'Интервальный бег',
    category: 'Кардио',
    categoryColor: 'bg-orange-500/15 text-orange-400',
    duration: '40–45 мин',
    goal: 'МПК и скорость',
    description: 'Повышает максимальное потребление кислорода (МПК). Незаменим для адаптации к высоте и быстрых забросок на маршрут.',
    exercises: [
      { name: 'Разминочный бег', sets: '10 мин легко' },
      { name: 'Спринт в горку 30 сек + ходьба вниз', sets: '8–10 повторов' },
      { name: 'Бег в темпе 80% от максимума', sets: '3 × 5 мин / отдых 2 мин' },
      { name: 'Заминка', sets: '10 мин легко' },
    ],
  },
  {
    id: '4',
    title: 'Силовая на турнике',
    category: 'Силовая',
    categoryColor: 'bg-yellow-500/15 text-yellow-400',
    duration: '45–50 мин',
    goal: 'Сила верхней части тела',
    description: 'Развивает тянущую силу — основу работы на скалах и льду. Сильные спина и бицепс критичны на крутых маршрутах.',
    exercises: [
      { name: 'Подтягивания широким хватом', sets: '4 × max (отдых 2 мин)' },
      { name: 'Подтягивания узким обратным хватом', sets: '3 × 8–10' },
      { name: 'Выход силой (muscle-up)', sets: '3 × 3–5', notes: 'или негативные повторы' },
      { name: 'Отжимания на брусьях', sets: '4 × 10–12' },
      { name: 'Горизонтальные подтягивания (австралийские)', sets: '3 × 12' },
      { name: 'Вис на одной руке', sets: '3 × 5 сек на каждую руку' },
    ],
  },
  {
    id: '5',
    title: 'Тренировка кора',
    category: 'Силовая',
    categoryColor: 'bg-yellow-500/15 text-yellow-400',
    duration: '30 мин',
    goal: 'Стабилизация и баланс',
    description: 'Сильный кор — основа равновесия на сложном рельефе, защита поясницы при ношении тяжёлого рюкзака.',
    exercises: [
      { name: 'Планка на локтях', sets: '3 × 45–60 сек' },
      { name: 'Боковая планка', sets: '3 × 30 сек на каждую сторону' },
      { name: 'Скручивания с подъёмом ног', sets: '3 × 15' },
      { name: 'Обратная планка', sets: '3 × 30 сек' },
      { name: 'Подъём ног в висе', sets: '4 × 10' },
      { name: 'Колесо (ab wheel rollout)', sets: '3 × 8', notes: 'или складной нож' },
    ],
  },
  {
    id: '6',
    title: 'Тренировка ног',
    category: 'Силовая',
    categoryColor: 'bg-yellow-500/15 text-yellow-400',
    duration: '50 мин',
    goal: 'Сила и мощность ног',
    description: 'Мощные ноги — двигатель альпиниста. Эта тренировка имитирует нагрузку подъёма и спуска с тяжёлым рюкзаком.',
    exercises: [
      { name: 'Приседания со штангой или рюкзаком', sets: '4 × 8–10' },
      { name: 'Выпады в ходьбе', sets: '3 × 12 на каждую ногу' },
      { name: 'Болгарские сплит-приседания', sets: '3 × 10 на каждую ногу' },
      { name: 'Запрыгивание на ящик (box jump)', sets: '4 × 6' },
      { name: 'Подъём на носки (икры)', sets: '4 × 20' },
      { name: 'Ступеньки с рюкзаком 10–15 кг', sets: '10 мин непрерывно' },
    ],
  },
  {
    id: '7',
    title: 'Скалолазание на стенде',
    category: 'Специальная',
    categoryColor: 'bg-purple-500/15 text-purple-400',
    duration: '90–120 мин',
    goal: 'Техника и специальная сила',
    description: 'Прямая симуляция горного рельефа. Развивает технику движения, координацию и специальную выносливость одновременно.',
    exercises: [
      { name: 'Разминка — лёгкие трассы на 2–3 ступени ниже максимума', sets: '20 мин' },
      { name: 'Лазание на результат — трассы на уровне максимума', sets: '3–5 проектов' },
      { name: 'Связки (4b) — пролезть трассу вниз-вверх без отдыха', sets: '5 × 2 трассы' },
      { name: 'Лазание с закрытыми глазами (тактильное)', sets: '2 лёгкие трассы' },
      { name: 'Заминка — тряска рук, самомассаж предплечий', sets: '10 мин' },
    ],
  },
  {
    id: '8',
    title: 'Поход с рюкзаком',
    category: 'Выносливость',
    categoryColor: 'bg-mountain-success/15 text-mountain-success',
    duration: '3–6 часов',
    goal: 'Специфическая выносливость',
    description: 'Наиболее специфичная подготовка для альпиниста. Тренирует и ноги, и сердечно-сосудистую систему с реальной нагрузкой.',
    exercises: [
      { name: 'Рюкзак 12–20 кг (добавить воду или камни)', notes: 'Зависит от уровня' },
      { name: 'Подъём в горку с набором 600–1000 м', sets: 'непрерывно' },
      { name: 'Темп — комфортный разговорный (пульс до 150)', notes: 'Не задыхаться' },
      { name: 'Остановки только для воды и еды', sets: 'каждые 90 мин' },
      { name: 'Спуск — контроль коленей, короткий шаг', notes: 'Медленнее чем подъём' },
    ],
  },
  {
    id: '9',
    title: 'Тренировка равновесия и проприоцепции',
    category: 'Специальная',
    categoryColor: 'bg-purple-500/15 text-purple-400',
    duration: '30 мин',
    goal: 'Баланс и координация',
    description: 'Чёткий баланс на узких зацепах и осыпном рельефе снижает риск падений. Тренирует лодыжки и укрепляет суставы.',
    exercises: [
      { name: 'Стойка на одной ноге с закрытыми глазами', sets: '3 × 30 сек на каждую' },
      { name: 'Ходьба по слэклайну или бревну', sets: '10 мин' },
      { name: 'Приседания на одной ноге (пистолет) на нестабильной поверхности', sets: '3 × 6' },
      { name: 'Прыжки на одной ноге с приземлением и удержанием', sets: '3 × 8' },
      { name: 'Стойка на полусфере BOSU (или сложенном коврике)', sets: '5 × 40 сек' },
    ],
  },
  {
    id: '10',
    title: 'Растяжка и восстановление',
    category: 'Восстановление',
    categoryColor: 'bg-blue-500/15 text-blue-400',
    duration: '30–40 мин',
    goal: 'Гибкость и восстановление',
    description: 'Гибкость ног и бёдер напрямую влияет на возможность высоких шагов на скале. Обязательна после тяжёлых дней.',
    exercises: [
      { name: 'Растяжка сгибателей бедра (поза выпада)', sets: '3 × 60 сек на каждую' },
      { name: 'Растяжка подколенных сухожилий', sets: '3 × 45 сек' },
      { name: 'Поза голубя (грушевидная мышца)', sets: '3 × 60 сек на каждую' },
      { name: 'Растяжка плеч и широчайших (рука за голову)', sets: '3 × 40 сек' },
      { name: 'Скрутка лёжа (торакальная мобильность)', sets: '10 повторов на каждую сторону' },
      { name: 'Перекат на МФР-ролле — икры, бёдра, спина', sets: '10 мин' },
    ],
  },
]

const CATEGORIES = ['Все', 'Силовая', 'Выносливость', 'Кардио', 'Специальная', 'Восстановление']

const CATEGORY_COLORS: Record<string, string> = {
  'Силовая': 'bg-yellow-500/15 text-yellow-400',
  'Выносливость': 'bg-mountain-success/15 text-mountain-success',
  'Кардио': 'bg-orange-500/15 text-orange-400',
  'Специальная': 'bg-purple-500/15 text-purple-400',
  'Восстановление': 'bg-blue-500/15 text-blue-400',
}

export default function WorkoutsView() {
  const [activeCategory, setActiveCategory] = useState('Все')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [userWorkouts, setUserWorkouts] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      supabase.from('user_workouts').select('*').eq('user_id', data.user.id).order('created_at', { ascending: false })
        .then(({ data: rows }) => setUserWorkouts(rows ?? []))
    })
  }, [])

  const deleteWorkout = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const supabase = createClient()
    await supabase.from('user_workouts').delete().eq('id', id)
    setUserWorkouts(prev => prev.filter(w => w.id !== id))
  }

  const allWorkouts = [
    ...userWorkouts.map(w => ({ ...w, isUser: true, categoryColor: CATEGORY_COLORS[w.category] ?? 'bg-mountain-surface text-mountain-text' })),
    ...WORKOUTS.map(w => ({ ...w, isUser: false })),
  ]

  const filtered = activeCategory === 'Все'
    ? allWorkouts
    : allWorkouts.filter(w => w.category === activeCategory)

  return (
    <>
    {showModal && (
      <CreateWorkoutModal
        onClose={() => setShowModal(false)}
        onCreated={w => setUserWorkouts(prev => [{ ...w, isUser: true, categoryColor: CATEGORY_COLORS[w.category] ?? '' }, ...prev])}
      />
    )}
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              activeCategory === cat
                ? 'bg-mountain-primary text-white'
                : 'bg-mountain-surface text-mountain-muted hover:text-mountain-text border border-mountain-border'
            }`}
          >
            {cat}
          </button>
        ))}
        </div>
        {userId && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mountain-primary text-white text-sm font-medium hover:bg-mountain-primary/80 transition-colors shrink-0"
          >
            <Plus size={16} />
            Своя тренировка
          </button>
        )}
      </div>

      {/* Workout cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map(workout => {
          const isExpanded = expanded === workout.id
          return (
            <div
              key={workout.id}
              className="surface-card interactive-card overflow-hidden cursor-pointer"
              onClick={() => setExpanded(isExpanded ? null : workout.id)}
            >
              {/* Header */}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {workout.isUser && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-mountain-primary/15 text-mountain-primary">
                          Моя
                        </span>
                      )}
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${workout.categoryColor}`}>
                        {workout.category}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-mountain-muted">
                        <Clock size={12} />
                        {workout.duration}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-mountain-text">{workout.title}</h3>
                    {workout.description && (
                      <p className="text-xs text-mountain-muted leading-relaxed">{workout.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 mt-1">
                    {workout.isUser && (
                      <button
                        onClick={(e) => deleteWorkout(workout.id, e)}
                        className="p-1 text-mountain-muted hover:text-mountain-danger transition-colors"
                        title="Удалить"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                    {isExpanded
                      ? <ChevronUp size={18} className="text-mountain-muted" />
                      : <ChevronDown size={18} className="text-mountain-muted" />
                    }
                  </div>
                </div>

                <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-mountain-surface border border-mountain-border text-xs text-mountain-accent font-medium">
                  Цель: {workout.goal}
                </div>
              </div>

              {/* Exercises list */}
              {isExpanded && (
                <div className="border-t border-mountain-border px-5 pb-5 pt-4">
                  <p className="text-xs font-semibold text-mountain-muted uppercase tracking-wide mb-3">Упражнения</p>
                  <ol className="space-y-2.5">
                    {workout.exercises.map((ex: any, i: number) => (
                      <li key={i} className="flex gap-3">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-mountain-primary/15 text-mountain-primary text-xs font-bold flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-mountain-text">{ex.name}</span>
                          {ex.sets && (
                            <span className="ml-2 text-xs text-mountain-accent font-mono">{ex.sets}</span>
                          )}
                          {ex.notes && (
                            <p className="text-xs text-mountain-muted mt-0.5">{ex.notes}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
    </>
  )
}
