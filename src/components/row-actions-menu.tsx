import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { ButtonWidget } from '@pglevy/sailwind'
import type { LucideIcon } from 'lucide-react'

export interface RowActionsMenuItem {
  label: string
  icon: LucideIcon
  onSelect: () => void
}

interface RowActionsMenuProps {
  /** Accessible name for the three-dot trigger, e.g. "Actions for pktestrule2". */
  triggerLabel: string
  items: RowActionsMenuItem[]
}

const MENU_GAP = 4

/**
 * Three-dot overflow menu for grid rows. The popover renders in a portal with
 * fixed positioning so the grid's scroll container can't clip it.
 */
export default function RowActionsMenu({ triggerLabel, items }: RowActionsMenuProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = (returnFocus = false) => {
    setOpen(false)
    setPosition(null)
    if (returnFocus) triggerRef.current?.querySelector('button')?.focus()
  }

  // Place the menu under the trigger, right-aligned; flip above if it would overflow the viewport.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return
    const trigger = triggerRef.current.getBoundingClientRect()
    const menuHeight = menuRef.current.offsetHeight
    const fitsBelow = trigger.bottom + MENU_GAP + menuHeight <= window.innerHeight
    setPosition({
      top: fitsBelow ? trigger.bottom + MENU_GAP : Math.max(8, trigger.top - MENU_GAP - menuHeight),
      right: Math.max(8, window.innerWidth - trigger.right - 8),
    })
  }, [open])

  // Focus the first item once positioned, like a native menu.
  useEffect(() => {
    if (position) menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
  }, [position])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      close()
    }
    const onDismiss = () => close()
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('resize', onDismiss)
    window.addEventListener('scroll', onDismiss, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('resize', onDismiss)
      window.removeEventListener('scroll', onDismiss, true)
    }
  }, [open])

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    )
    const current = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      buttons[(current + 1) % buttons.length]?.focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      buttons[(current - 1 + buttons.length) % buttons.length]?.focus()
    } else if (event.key === 'Tab') {
      close()
    }
  }

  return (
    <>
      <span ref={triggerRef} className="inline-flex">
        <ButtonWidget
          style="GHOST"
          color="SECONDARY"
          size="SMALL"
          icon="EllipsisVertical"
          tooltip="Row actions"
          accessibilityText={triggerLabel}
          onClick={() => (open ? close() : setOpen(true))}
        />
      </span>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={triggerLabel}
            onKeyDown={handleMenuKeyDown}
            className="fixed z-50 min-w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg"
            style={{
              top: position?.top ?? 0,
              right: position?.right ?? 0,
              visibility: position ? 'visible' : 'hidden',
            }}
          >
            {items.map(({ label, icon: ItemIcon, onSelect }) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                onClick={() => {
                  close()
                  onSelect()
                }}
                className="flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2 text-left text-base text-gray-900 hover:bg-blue-50 focus:outline-none focus:border-blue-700 focus:bg-blue-50"
              >
                <ItemIcon size={18} fill="currentColor" aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
