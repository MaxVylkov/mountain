'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Mountain,
  Backpack,
  BookOpen,
  Grip,
  Dumbbell,
  User,
  Menu,
  Navigation,
  UtensilsCrossed,
  UsersRound,
  MessageCircle,
  ChevronDown,
  Globe,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MobileMenu } from './mobile-menu'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { LucideIcon } from 'lucide-react'

interface NavLink {
  href: string
  label: string
  icon: LucideIcon
}

// All links — passed to MobileMenu so mobile stays complete
const navLinks: NavLink[] = [
  { href: '/mountains', label: 'Маршруты', icon: Mountain },
  { href: '/trips', label: 'Поездки', icon: Navigation },
  { href: '/teams', label: 'Отделения', icon: UsersRound },
  { href: '/knowledge', label: 'Знания', icon: BookOpen },
  { href: '/knots', label: 'Узлы', icon: Grip },
  { href: '/training', label: 'Тренировки', icon: Dumbbell },
  { href: '/resources', label: 'Ресурсы', icon: Globe },
  { href: '/gear', label: 'Кладовка', icon: Backpack },
  { href: '/rations', label: 'Раскладка', icon: UtensilsCrossed },
  { href: '/forum', label: 'Форум', icon: MessageCircle },
]

const primaryLinks: NavLink[] = [
  { href: '/mountains', label: 'Маршруты', icon: Mountain },
  { href: '/trips', label: 'Поездки', icon: Navigation },
  { href: '/teams', label: 'Отделения', icon: UsersRound },
]

const learningLinks: NavLink[] = [
  { href: '/knowledge', label: 'Знания', icon: BookOpen },
  { href: '/knots', label: 'Узлы', icon: Grip },
  { href: '/training', label: 'Тренировки', icon: Dumbbell },
  { href: '/resources', label: 'Ресурсы', icon: Globe },
]

const gearLinks: NavLink[] = [
  { href: '/gear', label: 'Кладовка', icon: Backpack },
  { href: '/rations', label: 'Раскладка', icon: UtensilsCrossed },
]

interface DropdownMenuProps {
  links: NavLink[]
  pathname: string
  onClose: () => void
}

function DropdownMenu({ links, pathname, onClose }: DropdownMenuProps) {
  return (
    <div className="absolute left-0 top-full mt-1 min-w-[160px] rounded-xl border border-mountain-border bg-mountain-bg py-1 shadow-lg">
      {links.map(({ href, label: linkLabel, icon: Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors
              ${active
                ? 'text-mountain-primary bg-mountain-surface'
                : 'text-mountain-muted hover:text-mountain-text hover:bg-mountain-surface'
              }`}
          >
            <Icon size={16} />
            {linkLabel}
          </Link>
        )
      })}
    </div>
  )
}

interface NavDropdownProps {
  label: string
  links: NavLink[]
  pathname: string
}

function NavDropdown({ label, links, pathname }: NavDropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const hasActive = links.some(({ href }) => pathname.startsWith(href))

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on route change
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors
          ${hasActive
            ? 'text-mountain-primary'
            : 'text-mountain-muted hover:text-mountain-text hover:bg-mountain-surface'
          }`}
      >
        {label}
        <ChevronDown
          size={14}
          className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <DropdownMenu
          links={links}
          pathname={pathname}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

export function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <nav className="sticky top-0 z-50 border-b border-mountain-border bg-mountain-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold text-mountain-text shrink-0">
          Mountaine
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5">
          {/* Primary links */}
          {primaryLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors
                  ${active
                    ? 'bg-mountain-surface text-mountain-primary'
                    : 'text-mountain-muted hover:text-mountain-text hover:bg-mountain-surface'
                  }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            )
          })}

          {/* Separator */}
          <span className="mx-1 h-4 w-px bg-mountain-border" aria-hidden="true" />

          {/* Secondary dropdowns */}
          <NavDropdown label="Учёба" links={learningLinks} pathname={pathname} />
          <NavDropdown label="Снаряжение" links={gearLinks} pathname={pathname} />
        </div>

        {/* Right side: Forum icon + auth */}
        <div className="flex items-center gap-1">
          {/* Forum — community link with label and accent border */}
          <Link
            href="/forum"
            aria-current={pathname.startsWith('/forum') ? 'page' : undefined}
            className={`hidden md:flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm border transition-colors
              ${pathname.startsWith('/forum')
                ? 'border-mountain-primary/60 bg-mountain-surface text-mountain-primary'
                : 'border-mountain-border text-mountain-muted hover:border-mountain-primary/40 hover:text-mountain-text hover:bg-mountain-surface'
              }`}
          >
            <MessageCircle size={15} />
            Форум
          </Link>

          {/* Auth */}
          {user ? (
            <Link
              href="/profile"
              aria-current={pathname.startsWith('/profile') ? 'page' : undefined}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-mountain-muted hover:text-mountain-text hover:bg-mountain-surface transition-colors"
            >
              <User size={18} />
              <span className="hidden sm:inline">Профиль</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-mountain-primary px-4 py-2 text-sm font-medium text-white hover:bg-mountain-primary/90 transition-colors"
            >
              Войти
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-mountain-muted hover:text-mountain-text"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <MobileMenu
          links={navLinks}
          pathname={pathname}
          onClose={() => setMobileOpen(false)}
        />
      )}
    </nav>
  )
}
