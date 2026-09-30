import {
  LayoutDashboard,
  Megaphone,
  Building2,
  Radio,
  LineChart,
  FileText,
} from 'lucide-react'

export const NAV = [
  {
    to: '/app/campaigns',
    label: 'Кампании',
    icon: Megaphone,
    roles: ['admin', 'viewer', 'advertiser'],
  },
  {
    to: '/app/overview',
    label: 'Обзор',
    icon: LayoutDashboard,
    roles: ['admin', 'viewer'],
  },
  {
    to: '/app/contracts',
    label: 'Договоры',
    icon: FileText,
    roles: ['admin', 'viewer'],
  },
  {
    to: '/app/advertisers',
    label: 'Рекламодатели',
    icon: Building2,
    roles: ['admin', 'viewer'],
  },
  {
    to: '/app/channels',
    label: 'Площадки',
    icon: Radio,
    roles: ['admin', 'viewer', 'advertiser'],
    hidden: true,
  },
  {
    to: '/app/reports',
    label: 'Отчёт',
    icon: LineChart,
    roles: ['advertiser'],
  },
]

/** Номер раздела на «указателе»: 01, 02… — как залы на плане выставки. */
export const sectionNo = (index) => String(index + 1).padStart(2, '0')
