import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardWizard } from '@/components/onboarding/onboard-wizard'
import {
  fetchKGStats,
  fetchKnotStats,
  fetchGearCount,
  fetchActiveTrip,
  fetchCompletedRoutes,
  calcFoothillsPercent,
} from '@/lib/dashboard-data'

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded, experience_level')
    .eq('id', user.id)
    .single()

  const params = await searchParams

  if (profile?.onboarded === true && params.view !== 'true') {
    redirect('/')
  }

  // Fetch real progress for journey map when viewing
  const isViewMode = params.view === 'true'
  let stageProgress: { id: string; overallProgress: number }[] | undefined

  if (isViewMode) {
    const [kgStats, knotStats, gearCount, activeTrip, completedRoutes] = await Promise.all([
      fetchKGStats(supabase, user.id),
      fetchKnotStats(supabase, user.id),
      fetchGearCount(supabase, user.id),
      fetchActiveTrip(supabase, user.id),
      fetchCompletedRoutes(supabase, user.id),
    ])

    const foothillsPercent = calcFoothillsPercent(
      kgStats.studied, kgStats.total,
      knotStats.mastered, knotStats.total,
    )

    stageProgress = [
      { id: 'foothills', overallProgress: foothillsPercent },
      { id: 'base-camp', overallProgress: Math.min(100, Math.round(gearCount / 15 * 100)) },
      { id: 'assault-camp', overallProgress: activeTrip ? activeTrip.packingPercent : 0 },
      { id: 'summit', overallProgress: completedRoutes > 0 ? 100 : 0 },
    ]
  }

  return (
    <div className="mx-auto max-w-3xl py-12">
      <OnboardWizard
        initialProgress={stageProgress}
        initialLevel={isViewMode ? (profile?.experience_level as 'beginner' | 'intermediate' | 'advanced' | undefined) : undefined}
      />
    </div>
  )
}
