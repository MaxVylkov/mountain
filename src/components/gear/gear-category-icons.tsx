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

export type GearIconKey =
  | 'rope'
  | 'carabiner'
  | 'jacket'
  | 'boot'
  | 'tent'
  | 'device'
  | 'box'
  | 'helmet'
  | 'ice_axe'
  | 'backpack'
  | 'headlamp'
  | 'stove'
  | 'first_aid'
  | 'map'
  | 'bottle'

type GearCategoryIconProps = SVGProps<SVGSVGElement> & {
  category: string | null | undefined
}

type GearIconProps = SVGProps<SVGSVGElement> & {
  category?: string | null
  iconKey?: string | null
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

function HelmetIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 13.5C4 8.8 7.6 5 12 5s8 3.8 8 8.5V16H4v-2.5Z" />
      <path d="M4 16h16" />
      <path d="M7 16v2.5h10V16" />
      <path d="M12 5v6" />
      <path d="M8.5 6.6 10 11" />
      <path d="m15.5 6.6-1.5 4.4" />
    </IconBase>
  )
}

function IceAxeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M7 5.5c3.5-1.7 7.1-1.7 10.5 0" />
      <path d="M9 5.2 12 8l3-2.8" />
      <path d="M12 8v12" />
      <path d="m9.5 17 2.5 3 2.5-3" />
      <path d="M6.5 6.2 4.5 8" />
      <path d="m17.5 6.2 2 1.8" />
    </IconBase>
  )
}

function BackpackIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M8 7V5.8C8 4.2 9.8 3 12 3s4 1.2 4 2.8V7" />
      <rect x="5.5" y="6.5" width="13" height="14" rx="3" />
      <path d="M8 11h8" />
      <path d="M8.5 15.5h7" />
      <path d="M5.5 12H4" />
      <path d="M20 12h-1.5" />
    </IconBase>
  )
}

function HeadlampIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M3.5 10.5h17" />
      <path d="M3.5 13.5h17" />
      <rect x="8" y="7" width="8" height="10" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="m16 9 3-2" />
      <path d="m16 15 3 2" />
    </IconBase>
  )
}

function StoveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M9 3.5h6" />
      <path d="M8 7h8l-1 5H9L8 7Z" />
      <path d="M9.5 12 7 20h10l-2.5-8" />
      <path d="M8.5 16h7" />
      <path d="M12 3.5V7" />
    </IconBase>
  )
}

function FirstAidIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="4" y="7" width="16" height="12" rx="2" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M12 10.5v5" />
      <path d="M9.5 13h5" />
    </IconBase>
  )
}

function MapIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M4 6.5 9.5 4l5 2.5L20 4v13.5L14.5 20l-5-2.5L4 20V6.5Z" />
      <path d="M9.5 4v13.5" />
      <path d="M14.5 6.5V20" />
      <path d="m6.5 9.5 1.2-.6" />
      <path d="m16.6 15.4 1.2-.6" />
    </IconBase>
  )
}

function BottleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M10 3.5h4" />
      <path d="M10.5 6.5h3" />
      <path d="M9 8.5c-1 1-1.5 2.2-1.5 3.7V18a3 3 0 0 0 3 3h3a3 3 0 0 0 3-3v-5.8c0-1.5-.5-2.7-1.5-3.7l-1.5-1.5v-3h-3v3L9 8.5Z" />
      <path d="M8 15h8" />
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

const GEAR_ICONS: Record<GearIconKey, GearCategoryIconComponent> = {
  rope: RopeIcon,
  carabiner: HardwareIcon,
  jacket: ClothingIcon,
  boot: FootwearIcon,
  tent: BivouacIcon,
  device: ElectronicsIcon,
  box: OtherGearIcon,
  helmet: HelmetIcon,
  ice_axe: IceAxeIcon,
  backpack: BackpackIcon,
  headlamp: HeadlampIcon,
  stove: StoveIcon,
  first_aid: FirstAidIcon,
  map: MapIcon,
  bottle: BottleIcon,
}

export const GEAR_ICON_OPTIONS: Array<{ key: GearIconKey; label: string }> = [
  { key: 'rope', label: 'Верёвка' },
  { key: 'carabiner', label: 'Карабин' },
  { key: 'helmet', label: 'Каска' },
  { key: 'ice_axe', label: 'Ледоруб' },
  { key: 'backpack', label: 'Рюкзак' },
  { key: 'boot', label: 'Ботинок' },
  { key: 'jacket', label: 'Куртка' },
  { key: 'tent', label: 'Палатка' },
  { key: 'headlamp', label: 'Фонарь' },
  { key: 'stove', label: 'Горелка' },
  { key: 'first_aid', label: 'Аптечка' },
  { key: 'map', label: 'Карта' },
  { key: 'bottle', label: 'Фляга' },
  { key: 'device', label: 'Прибор' },
  { key: 'box', label: 'Прочее' },
]

export function GearIcon({ category, iconKey, ...props }: GearIconProps) {
  const Icon =
    (iconKey ? GEAR_ICONS[iconKey as GearIconKey] : null) ??
    GEAR_CATEGORY_ICONS[(category || 'other') as GearCategory] ??
    OtherGearIcon

  return <Icon {...props} />
}

export function GearCategoryIcon({ category, ...props }: GearCategoryIconProps) {
  return <GearIcon category={category} {...props} />
}
