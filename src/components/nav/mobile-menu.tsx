import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface MobileMenuProps {
  links: { href: string; label: string; icon: LucideIcon }[]
  pathname: string
  onClose: () => void
}

export function MobileMenu({ links, pathname, onClose }: MobileMenuProps) {
  return (
    <div className="md:hidden border-t border-mountain-border bg-mountain-bg/95 backdrop-blur-md">
      <div className="space-y-1 px-4 py-3">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={`
              flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors
              ${pathname.startsWith(href)
                ? 'bg-mountain-surface text-mountain-primary'
                : 'text-mountain-muted hover:text-mountain-text hover:bg-mountain-surface'
              }
            `}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
