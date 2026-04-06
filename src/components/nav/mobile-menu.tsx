import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface MobileMenuProps {
  links: { href: string; label: string; icon: LucideIcon }[]
  pathname: string
  onClose: () => void
}

type LinkItem = { href: string; label: string; icon: LucideIcon }

const groups: { title: string; hrefs: string[] }[] = [
  { title: 'Активность', hrefs: ['/mountains', '/weather', '/trips', '/teams'] },
  { title: 'Подготовка', hrefs: ['/knowledge', '/knots', '/training', '/resources', '/gear', '/rations'] },
  { title: 'Сообщество', hrefs: ['/forum'] },
]

function groupLinks(links: LinkItem[]) {
  return groups
    .map(group => ({
      title: group.title,
      items: group.hrefs
        .map(href => links.find(l => l.href === href))
        .filter((l): l is LinkItem => !!l),
    }))
    .filter(g => g.items.length > 0)
}

export function MobileMenu({ links, pathname, onClose }: MobileMenuProps) {
  const grouped = groupLinks(links)

  return (
    <div className="md:hidden border-t border-mountain-border bg-mountain-bg/95 backdrop-blur-md">
      <div className="px-4 py-3">
        {grouped.map((group, idx) => (
          <div key={group.title}>
            {idx > 0 && <div className="border-t border-mountain-border my-2" />}
            <div className="text-xs uppercase text-mountain-muted font-medium tracking-wider px-3 pt-2 pb-1">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => (
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
        ))}
      </div>
    </div>
  )
}
