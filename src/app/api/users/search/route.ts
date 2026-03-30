import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  if (!email || email.length < 3) {
    return NextResponse.json({ users: [] })
  }

  // Verify the requester is authenticated
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Search auth.users by email (partial match)
  const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const matches = (listData?.users ?? []).filter(u =>
    u.email?.toLowerCase().includes(email) && u.id !== user.id
  )

  if (matches.length === 0) return NextResponse.json({ users: [] })

  // Fetch their profiles
  const ids = matches.slice(0, 10).map(u => u.id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', ids)

  const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  const users = matches.slice(0, 10).map(u => ({
    id: u.id,
    email: u.email,
    display_name: profileMap[u.id]?.display_name ?? null,
  }))

  return NextResponse.json({ users })
}
