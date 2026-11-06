import { useEffect, useRef, useState } from 'react'

interface AccountMenuProps {
  email: string
  onOpenJournal: () => void
  onOpenSettings: () => void
  onLogOut: () => void
}

/** Account dropdown in the top-right corner. Closes on outside click and Escape. */
export function AccountMenu({ email, onOpenJournal, onOpenSettings, onLogOut }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const choose = (action: () => void) => () => {
    setOpen(false)
    action()
  }

  const item =
    'block w-full rounded-xl px-4 py-2.5 text-left text-sm transition-colors hover:bg-sand focus-visible:bg-sand focus-visible:outline-none'

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Меню аккаунта"
        onClick={() => setOpen((value) => !value)}
        className="flex size-11 items-center justify-center rounded-full bg-clay-soft font-serif text-lg text-clay-deep uppercase transition-colors hover:bg-clay hover:text-card focus-visible:ring-4 focus-visible:ring-clay/25 focus-visible:outline-none aria-expanded:bg-clay aria-expanded:text-card"
      >
        {email.charAt(0) || '·'}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-64 space-y-1 rounded-2xl border border-line bg-card p-2 shadow-[0_16px_40px_-20px_rgba(59,47,42,0.4)]"
        >
          <p className="truncate px-4 pt-2 pb-3 text-xs text-ink-soft">{email}</p>
          <button role="menuitem" type="button" className={item} onClick={choose(onOpenJournal)}>
            Мой дневник
          </button>
          <button role="menuitem" type="button" className={item} onClick={choose(onOpenSettings)}>
            Настройки аккаунта
          </button>
          <div className="my-1 border-t border-line" />
          <button role="menuitem" type="button" className={`${item} text-ink-soft`} onClick={choose(onLogOut)}>
            Выйти
          </button>
        </div>
      )}
    </div>
  )
}
