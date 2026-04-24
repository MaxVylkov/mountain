import type { ReactElement, SVGProps } from 'react'

export type GearCategory =
  | 'clothing'
  | 'footwear'
  | 'hardware'
  | 'ropes'
  | 'bivouac'
  | 'electronics'
  | 'other'

type GearCategoryIconComponent = (props: SVGProps<SVGSVGElement>) => ReactElement

type GearCategoryIconProps = SVGProps<SVGSVGElement> & {
  category: string | null | undefined
}

function IconBase({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

function RopeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M7.5 7.5c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4h-2" />
      <path d="M16.5 16.5c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4h2" />
      <path d="M9.5 11.5h5" />
      <path d="M9.5 12.5h5" />
    </IconBase>
  )
}

function HardwareIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M8.5 4.5c2.8-1.4 6.2-.3 7.7 2.5l2.2 4.1c1.6 3-.3 6.7-3.7 7.1l-2.3.3" />
      <path d="M12 5.5 8.2 7.6c-1.7.9-2.3 3-1.4 4.7l2.2 4.2c.9 1.6 2.8 2.3 4.5 1.6" />
      <path d="M9.6 8.7 14 17" />
      <path d="M6.1 17.6 4 19.7" />
      <path d="m4.3 15.9 3.8 3.8" />
    </IconBase>
  )
}

function ClothingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M8.2 4.5 5 6.2 3.5 11l3 1.1 1-2.2V20h9V9.9l1 2.2 3-1.1L19 6.2l-3.2-1.7" />
      <path d="M9 4.5c.6 1.2 1.6 1.9 3 1.9s2.4-.7 3-1.9" />
      <path d="M9.5 14h5" />
    </IconBase>
  )
}

function FootwearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4.8 14.5c1.9.7 3.4.6 4.5-.3.7-.6 1.2-1.4 1.6-2.4l3.6 2.3c1.4.9 3.1 1.2 4.7.8l.8 2.8c-1.9 1-4.2 1.5-6.6 1.3L7.1 18c-1.8-.2-3-1.7-2.8-3.5h.5Z" />
      <path d="M10.9 11.8 9.7 7.5" />
      <path d="M14.2 14 15 11" />
      <path d="m16.5 14.8.7-2.8" />
    </IconBase>
  )
}

function BivouacIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M3 20h18" />
      <path d="M5 20 12 4l7 16" />
      <path d="M12 4v16" />
      <path d="m9.2 20 2.8-5 2.8 5" />
      <path d="M5.8 13.2h12.4" />
    </IconBase>
  )
}

function ElectronicsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="6" y="3.5" width="12" height="17" rx="2.2" />
      <path d="M9 7h6" />
      <path d="M10 17h4" />
      <path d="M10.2 11.8 12 10l1.8 1.8" />
      <path d="M12 10v4" />
      <path d="M4 9.5h2" />
      <path d="M18 9.5h2" />
    </IconBase>
  )
}

function OtherGearIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4.5 8.5 12 4l7.5 4.5v7L12 20l-7.5-4.5v-7Z" />
      <path d="m4.8 8.7 7.2 4.2 7.2-4.2" />
      <path d="M12 12.9V20" />
      <path d="m8.2 6.3 7.3 4.3" />
    </IconBase>
  )
}

const GEAR_CATEGORY_ICONS: Record<GearCategory, GearCategoryIconComponent> = {
  clothing: ClothingIcon,
  footwear: FootwearIcon,
  hardware: HardwareIcon,
  ropes: RopeIcon,
  bivouac: BivouacIcon,
  electronics: ElectronicsIcon,
  other: OtherGearIcon,
}

export function GearCategoryIcon({ category, ...props }: GearCategoryIconProps) {
  const Icon = GEAR_CATEGORY_ICONS[(category || 'other') as GearCategory] ?? OtherGearIcon
  return <Icon {...props} />
}
