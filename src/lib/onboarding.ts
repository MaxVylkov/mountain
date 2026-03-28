export interface ModuleProgress {
  name: string
  href: string
  progress: number // 0-100
}

export interface StageProgress {
  id: string
  name: string
  description: string
  modules: ModuleProgress[]
  overallProgress: number // 0-100, average of modules
}

export async function getUserProgress(
  supabase: any,
  userId: string
): Promise<StageProgress[]> {
  // --- Stage 1: Foothills ---

  // Knowledge progress
  const { count: completedKgCount } = await supabase
    .from('kg_progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'completed')

  const { count: totalKgCount } = await supabase
    .from('kg_nodes')
    .select('id', { count: 'exact', head: true })

  const knowledgeProgress =
    totalKgCount && totalKgCount > 0
      ? Math.round(((completedKgCount ?? 0) / totalKgCount) * 100)
      : 0

  // Knots progress
  const { count: masteredKnotCount } = await supabase
    .from('knot_progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'mastered')

  const { count: totalKnotCount } = await supabase
    .from('knots')
    .select('id', { count: 'exact', head: true })

  const knotsProgress =
    totalKnotCount && totalKnotCount > 0
      ? Math.round(((masteredKnotCount ?? 0) / totalKnotCount) * 100)
      : 0

  // Training progress
  const { data: trainingData } = await supabase
    .from('training_log')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  const trainingProgress =
    trainingData && trainingData.length > 0 ? 100 : 0

  // --- Stage 2: Basecamp ---

  // Gear progress
  const { data: gearData } = await supabase
    .from('user_gear')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  const gearProgress = gearData && gearData.length > 0 ? 100 : 0

  // Routes progress
  const { data: routeData } = await supabase
    .from('user_route_status')
    .select('id')
    .eq('user_id', userId)
    .limit(1)

  const routesProgress = routeData && routeData.length > 0 ? 100 : 0

  // --- Stage 3: Assault ---

  // Trips progress
  const { data: nonPlanningTrips } = await supabase
    .from('trips')
    .select('id')
    .eq('user_id', userId)
    .neq('status', 'planning')
    .limit(1)

  let tripsProgress = 0
  if (nonPlanningTrips && nonPlanningTrips.length > 0) {
    tripsProgress = 100
  } else {
    const { data: anyTrips } = await supabase
      .from('trips')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (anyTrips && anyTrips.length > 0) {
      tripsProgress = 50
    }
  }

  // --- Stage 4: Summit ---

  // Summit reached progress
  const { data: summitData } = await supabase
    .from('trip_routes')
    .select('id, trips!inner(user_id)')
    .eq('trips.user_id', userId)
    .eq('summit_reached', true)
    .limit(1)

  const summitProgress = summitData && summitData.length > 0 ? 100 : 0

  // --- Build stages ---

  const stages: StageProgress[] = [
    {
      id: 'foothills',
      name: 'Подножие',
      description: 'Знания и подготовка',
      modules: [
        { name: 'Знания', href: '/knowledge', progress: knowledgeProgress },
        { name: 'Узлы', href: '/knots', progress: knotsProgress },
        { name: 'Тренировки', href: '/training', progress: trainingProgress },
      ],
      overallProgress: 0,
    },
    {
      id: 'basecamp',
      name: 'Базовый лагерь',
      description: 'Снаряжение и маршруты',
      modules: [
        { name: 'Снаряжение', href: '/gear', progress: gearProgress },
        { name: 'Маршруты', href: '/routes', progress: routesProgress },
      ],
      overallProgress: 0,
    },
    {
      id: 'assault',
      name: 'Штурмовой лагерь',
      description: 'Планирование поездки',
      modules: [
        { name: 'Поездки', href: '/trips', progress: tripsProgress },
      ],
      overallProgress: 0,
    },
    {
      id: 'summit',
      name: 'Вершина',
      description: 'Выход на маршрут',
      modules: [
        { name: 'Вершина', href: '/summit', progress: summitProgress },
      ],
      overallProgress: 0,
    },
  ]

  // Calculate overall progress for each stage
  for (const stage of stages) {
    const total = stage.modules.reduce((sum, m) => sum + m.progress, 0)
    stage.overallProgress = Math.round(total / stage.modules.length)
  }

  return stages
}
