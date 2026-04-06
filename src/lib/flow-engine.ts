import type { KGStats, KnotStats, ActiveTrip } from './dashboard-data'

// ─── Journey stages ─────────────────────────────────────────────────────────

export type JourneyStage = 'foothills' | 'basecamp' | 'assault' | 'summit'

export interface JourneyState {
  stage: JourneyStage
  stageIndex: number          // 0–3
  stageProgress: number       // 0–100 within current stage
  foothillsPercent: number
  gearCount: number
  hasTrip: boolean
  completedRoutes: number
}

export function detectJourneyStage(
  foothillsPercent: number,
  gearCount: number,
  activeTrip: ActiveTrip | null,
  completedRoutes: number,
): JourneyState {
  if (completedRoutes > 0) {
    return {
      stage: 'summit', stageIndex: 3, stageProgress: 100,
      foothillsPercent, gearCount, hasTrip: !!activeTrip, completedRoutes,
    }
  }
  if (activeTrip) {
    return {
      stage: 'assault', stageIndex: 2, stageProgress: activeTrip.packingPercent,
      foothillsPercent, gearCount, hasTrip: true, completedRoutes,
    }
  }
  if (gearCount >= 5 && foothillsPercent >= 40) {
    return {
      stage: 'basecamp', stageIndex: 1, stageProgress: Math.min(100, Math.round(gearCount / 15 * 100)),
      foothillsPercent, gearCount, hasTrip: false, completedRoutes,
    }
  }
  return {
    stage: 'foothills', stageIndex: 0, stageProgress: foothillsPercent,
    foothillsPercent, gearCount, hasTrip: false, completedRoutes,
  }
}

export const STAGE_META: Record<JourneyStage, { label: string; hint: string }> = {
  foothills: { label: 'Подножие', hint: 'Изучай теорию и узлы' },
  basecamp: { label: 'Базовый лагерь', hint: 'Собирай снаряжение' },
  assault: { label: 'Штурмовой лагерь', hint: 'Готовься к выходу' },
  summit: { label: 'Вершина', hint: 'Маршруты пройдены' },
}

// ─── Next-step engine ────────────────────────────────────────────────────────

export interface NextStep {
  title: string
  description: string
  href: string
  module: string
  priority: number  // lower = more urgent
}

/**
 * Determines the next logical step for a user based on their progress.
 * Returns an ordered list of suggestions — first item is the primary recommendation.
 */
export function computeNextSteps(
  kgStats: KGStats,
  knotStats: KnotStats,
  gearCount: number,
  activeTrip: ActiveTrip | null,
  completedRoutes: number,
  experienceLevel: string | null,
): NextStep[] {
  const steps: NextStep[] = []
  const kgPercent = kgStats.total > 0 ? Math.round((kgStats.studied / kgStats.total) * 100) : 0
  const knotPercent = knotStats.total > 0 ? Math.round((knotStats.mastered / knotStats.total) * 100) : 0

  // ── Beginner path: Knowledge → Knots → Gear → Training → Mountains
  if (experienceLevel === 'beginner' || !experienceLevel) {
    if (kgPercent < 20) {
      steps.push({
        title: 'Начни с теории',
        description: `Изучено ${kgStats.studied} из ${kgStats.total} тем. Пройди основы: снаряжение, страховка, тактика.`,
        href: '/knowledge',
        module: 'knowledge',
        priority: 1,
      })
    } else if (kgPercent < 60) {
      steps.push({
        title: 'Продолжи изучение',
        description: `${kgPercent}% теории пройдено. Следующий шаг — ${kgPercent < 40 ? 'страховка и работа с верёвкой' : 'тактика и планирование'}.`,
        href: '/knowledge',
        module: 'knowledge',
        priority: 2,
      })
    }

    if (kgPercent >= 15 && knotPercent < 30) {
      steps.push({
        title: knotStats.mastered === 0 ? 'Пора учить узлы' : 'Продолжи с узлами',
        description: knotStats.mastered === 0
          ? 'Теория пошла — пора закрепить руками. Начни с восьмёрки и булиня.'
          : `Освоено ${knotStats.mastered} из ${knotStats.total}. Переходи к следующему уровню.`,
        href: '/knots',
        module: 'knots',
        priority: kgPercent >= 30 ? 1 : 3,
      })
    }

    if (kgPercent >= 20 && gearCount < 5) {
      steps.push({
        title: 'Собери стартовый набор',
        description: 'Добавь в Кладовку базовое снаряжение — каска, система, карабины.',
        href: '/gear',
        module: 'gear',
        priority: 4,
      })
    }

    if (kgPercent >= 10) {
      steps.push({
        title: 'Начни тренироваться',
        description: 'Кардио, ноги, кор — начни за 3–4 месяца до первого выхода.',
        href: '/training',
        module: 'training',
        priority: 5,
      })
    }
  }

  // ── Expert path: Routes → Teams → Gear → Trips
  if (experienceLevel === 'intermediate' || experienceLevel === 'advanced') {
    if (!activeTrip) {
      steps.push({
        title: 'Спланируй выход',
        description: 'Создай поездку — маршрут, даты, участники.',
        href: '/trips',
        module: 'trips',
        priority: 1,
      })
    } else if (activeTrip.status === 'planning') {
      steps.push({
        title: 'Перейди к сборам',
        description: `Поездка «${activeTrip.name}» — добавь снаряжение и раскладку.`,
        href: `/trips/${activeTrip.id}`,
        module: 'trips',
        priority: 1,
      })
    } else if (activeTrip.status === 'packing' && activeTrip.packingPercent < 100) {
      steps.push({
        title: 'Закончи сборы',
        description: `Собрано ${activeTrip.packingPercent}%. Проверь снаряжение перед выходом.`,
        href: `/trips/${activeTrip.id}`,
        module: 'trips',
        priority: 1,
      })
    }

    steps.push({
      title: 'Смотри маршруты',
      description: 'Выбери маршрут по категории и региону.',
      href: '/mountains',
      module: 'mountains',
      priority: activeTrip ? 3 : 2,
    })
  }

  return steps.sort((a, b) => a.priority - b.priority)
}

// ─── Cross-module suggestions ────────────────────────────────────────────────

export interface ModuleLink {
  label: string
  href: string
  reason: string
}

/**
 * Returns contextual links to show at the bottom of a module page,
 * bridging the user to the next logical module.
 */
export function getModuleBridges(
  currentModule: 'knowledge' | 'knots' | 'training' | 'gear' | 'mountains',
  kgPercent: number,
  knotPercent: number,
  gearCount: number,
): ModuleLink[] {
  const links: ModuleLink[] = []

  switch (currentModule) {
    case 'knowledge':
      links.push({
        label: 'Узлы',
        href: '/knots',
        reason: knotPercent === 0
          ? 'Закрепи теорию на практике — начни с базовых узлов'
          : `Продолжи практику — ${knotPercent}% узлов освоено`,
      })
      if (kgPercent >= 30) {
        links.push({
          label: 'Тренировки',
          href: '/training',
          reason: 'Теория пошла — пора готовить тело',
        })
      }
      break

    case 'knots':
      if (kgPercent < 50) {
        links.push({
          label: 'Граф знаний',
          href: '/knowledge',
          reason: 'Узнай больше теории, чтобы понять контекст узлов',
        })
      }
      links.push({
        label: 'Кладовка',
        href: '/gear',
        reason: gearCount === 0
          ? 'Узлы требуют снаряжения — собери стартовый набор'
          : 'Проверь, всё ли снаряжение на месте',
      })
      break

    case 'training':
      links.push({
        label: 'Маршруты',
        href: '/mountains',
        reason: 'Посмотри маршруты, к которым готовишься',
      })
      if (knotPercent < 50) {
        links.push({
          label: 'Узлы',
          href: '/knots',
          reason: 'Между тренировками — практикуй узлы',
        })
      }
      break

    case 'gear':
      links.push({
        label: 'Маршруты',
        href: '/mountains',
        reason: 'Подбери маршрут под своё снаряжение',
      })
      if (kgPercent < 40) {
        links.push({
          label: 'Граф знаний',
          href: '/knowledge',
          reason: 'Узнай, какое снаряжение для чего',
        })
      }
      break

    case 'mountains':
      links.push({
        label: 'Поездки',
        href: '/trips',
        reason: 'Нашёл маршрут? Создай поездку',
      })
      if (gearCount < 5) {
        links.push({
          label: 'Кладовка',
          href: '/gear',
          reason: 'Проверь снаряжение перед маршрутом',
        })
      }
      break
  }

  return links
}

// ─── Milestones ──────────────────────────────────────────────────────────────

export interface Milestone {
  id: string
  title: string
  description: string
  icon: 'trophy' | 'star' | 'mountain' | 'check'
}

export function checkMilestones(
  kgStats: KGStats,
  knotStats: KnotStats,
  gearCount: number,
  completedRoutes: number,
  previousState?: { kgStudied: number; knotsMastered: number; gearCount: number; completedRoutes: number },
): Milestone[] {
  if (!previousState) return []

  const milestones: Milestone[] = []

  // First KG topic studied
  if (previousState.kgStudied === 0 && kgStats.studied > 0) {
    milestones.push({
      id: 'first-kg',
      title: 'Первый шаг',
      description: 'Первая тема изучена — начало положено!',
      icon: 'star',
    })
  }

  // 50% KG
  if (kgStats.total > 0) {
    const prevPercent = Math.round((previousState.kgStudied / kgStats.total) * 100)
    const nowPercent = Math.round((kgStats.studied / kgStats.total) * 100)
    if (prevPercent < 50 && nowPercent >= 50) {
      milestones.push({
        id: 'kg-half',
        title: 'Половина пути',
        description: 'Изучено больше половины теории. Отличная работа!',
        icon: 'trophy',
      })
    }
  }

  // First knot mastered
  if (previousState.knotsMastered === 0 && knotStats.mastered > 0) {
    milestones.push({
      id: 'first-knot',
      title: 'Первый узел',
      description: 'Первый узел освоен — руки запоминают!',
      icon: 'check',
    })
  }

  // All basic knots (level 1) — approximate threshold
  if (previousState.knotsMastered < 5 && knotStats.mastered >= 5) {
    milestones.push({
      id: 'basic-knots',
      title: 'Базовые узлы',
      description: 'Все базовые узлы освоены. Переходи к среднему уровню!',
      icon: 'trophy',
    })
  }

  // First route completed
  if (previousState.completedRoutes === 0 && completedRoutes > 0) {
    milestones.push({
      id: 'first-route',
      title: 'Первая вершина!',
      description: 'Поздравляем с первым восхождением!',
      icon: 'mountain',
    })
  }

  return milestones
}
