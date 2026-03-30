import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Stable password derived only from Telegram user ID — never changes
function stablePassword(telegramId: number): string {
  return `tg_mtn_${telegramId}`
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { id, first_name, last_name, username, photo_url } = body

  if (!id) {
    return NextResponse.json({ error: 'Missing Telegram user id' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const email = `tg_${id}@telegram.user`
  const password = stablePassword(id)
  const displayName = [first_name, last_name].filter(Boolean).join(' ')

  // Try to find existing user and update their password to the stable one
  const { data: listData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = listData?.users.find((u) => u.email === email)

  if (existing) {
    // Update to stable password (fixes users who registered with hash-based password)
    await admin.auth.admin.updateUserById(existing.id, { password })
  } else {
    // Create new user
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        telegram_id: id,
        telegram_username: username,
        avatar_url: photo_url,
      },
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ email, password })
}
