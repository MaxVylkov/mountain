import { ButtonHTMLAttributes, forwardRef } from 'react'

type ButtonVariant = 'primary' | 'outline' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-mountain-primary text-white hover:bg-mountain-primary/90',
  outline: 'border border-mountain-border text-mountain-text hover:bg-mountain-surface',
  ghost: 'text-mountain-muted hover:text-mountain-text hover:bg-mountain-surface',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`
          inline-flex items-center justify-center rounded-xl px-4 py-2.5
          text-sm font-medium transition-colors duration-200
          focus-visible:ring-2 focus-visible:ring-mountain-accent focus-visible:ring-offset-2 focus-visible:ring-offset-mountain-bg
          disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
