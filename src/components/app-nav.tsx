import { SiteNav } from '@pglevy/sailwind'
import { LayoutGrid, List, Layers, CircleHelp, Shuffle } from 'lucide-react'

const navItems = [
  { label: 'Clause Sets', icon: LayoutGrid },
  { label: 'Clauses', icon: List },
  { label: 'Templates', icon: Layers },
  { label: 'Questionnaires', icon: CircleHelp },
  { label: 'Rules', icon: Shuffle },
]

export type AppNavItem = (typeof navItems)[number]['label']

/** Left site navigation shared by the Clause Automation pages. */
export default function AppNav({ selected }: { selected: AppNavItem }) {
  const pages = navItems.map(item => ({ ...item, isSelected: item.label === selected }))

  return (
    // SiteNav is fixed at 240px with 14px labels. The arbitrary variants widen it to 280px and bump the text.
    <div className="h-full shrink-0 [&>nav]:w-[280px] [&_nav_span.text-sm]:text-base [&_nav_span.text-lg]:text-xl">
      <SiteNav
        displayName="Clause Automation"
        pages={pages}
        userName="Privilege User"
        appianLogoSrc="/images/icon-appian-header-blue.svg"
        highlightColor="#C7C4F4"
      />
    </div>
  )
}
