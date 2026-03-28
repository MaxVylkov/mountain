import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardWizard } from '@/components/onboarding/onboard-wizard'

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
    .select('onboarded')
    .eq('id', user.id)
    .single()

  const params = await searchParams

  if (profile?.onboarded === true && params.view !== 'true') {
    redirect('/')
  }

  return (
    <div className="mx-auto max-w-3xl py-12">
      <OnboardWizard />
    </div>
  )
}
