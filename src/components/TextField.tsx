import { useId, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

export function TextField({ label, hint, ...props }: TextFieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint ? hintId : undefined}
        className="block w-full rounded-xl border border-line bg-card px-4 py-3 text-base focus:border-clay focus:ring-4 focus:ring-clay/15 focus:outline-none"
        {...props}
      />
      {hint && (
        <p id={hintId} className="text-xs text-ink-soft">
          {hint}
        </p>
      )}
    </div>
  )
}
