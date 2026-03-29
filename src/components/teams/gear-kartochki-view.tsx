'use client'

import { RequiredGearItem, MemberGearEntry, Member, SECTIONS } from './gear-constants'

interface GearKartochkiViewProps {
  items: RequiredGearItem[]
  memberGear: MemberGearEntry[]
  members: Member[]
  currentUserId: string
}

export function GearKartochkiView({ items, memberGear, members, currentUserId }: GearKartochkiViewProps) {
  const getQuantity = (itemId: string, userId: string) =>
    memberGear.find(e => e.required_gear_id === itemId && e.user_id === userId)?.quantity ?? 0

  const getBadge = (userId: string) => {
    const covered = items.filter(item => getQuantity(item.id, userId) > 0).length
    return { covered, total: items.length }
  }

  // Current user's card first
  const sortedMembers = [
    ...members.filter(m => m.user_id === currentUserId),
    ...members.filter(m => m.user_id !== currentUserId),
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sortedMembers.map(member => {
        const isCurrent = member.user_id === currentUserId
        const { covered, total } = getBadge(member.user_id)
        const allGood = covered === total

        return (
          <div
            key={member.user_id}
            className={`glass-card p-4 space-y-3 ${isCurrent ? 'border-2 border-mountain-primary' : ''}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-mountain-text">{member.display_name}</span>
                {isCurrent && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-mountain-primary/20 text-mountain-primary">Вы</span>
                )}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                allGood
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-amber-500/20 text-amber-400'
              }`}>
                {covered} / {total} {allGood ? '✓' : '⚠'}
              </span>
            </div>

            {/* Gear list grouped by section */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {(['personal', 'group', 'personal_items', 'clothing'] as const).map(section => {
                const sectionItems = items.filter(i => i.section === section)
                if (sectionItems.length === 0) return null
                return (
                  <div key={section}>
                    <p className="text-xs text-mountain-muted uppercase tracking-wide mb-1">
                      {SECTIONS[section]}
                    </p>
                    <div className="space-y-0.5">
                      {sectionItems.map(item => {
                        const qty = getQuantity(item.id, member.user_id)
                        const isGroup = item.section === 'group'
                        const norm = item.norm_per_person
                        const missing = norm !== null && qty < norm

                        return (
                          <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isGroup && (
                                <span className="shrink-0 px-1 py-px rounded text-[10px] bg-emerald-500/15 text-emerald-400">
                                  Общее
                                </span>
                              )}
                              <span className={`truncate ${missing ? 'text-red-400' : qty > 0 ? 'text-mountain-text' : 'text-mountain-muted'}`}>
                                {item.name}
                              </span>
                            </div>
                            <span className={`shrink-0 font-medium ${
                              missing ? 'text-red-400' : qty > 0 ? 'text-mountain-text' : 'text-mountain-muted'
                            }`}>
                              {qty > 0 ? qty : (missing ? '0 ⚠' : '—')}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
