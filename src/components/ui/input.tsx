import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={id} className="block text-sm text-mountain-muted">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={`
            w-full rounded-xl border bg-mountain-surface px-4 py-2
            text-mountain-text placeholder:text-mountain-muted/50
            focus:outline-none focus:ring-2 focus:ring-mountain-primary/50
            ${error ? 'border-mountain-danger' : 'border-mountain-border'}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-sm text-mountain-danger">{error}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
