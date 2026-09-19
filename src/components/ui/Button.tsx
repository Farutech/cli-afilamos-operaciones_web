import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  style,
  disabled,
  ...props
}) => {
  const getBackground = () => {
    if (disabled) return 'var(--color-surface-hover)'
    switch (variant) {
      case 'primary': return 'var(--color-primary)'
      case 'secondary': return 'var(--color-surface)'
      case 'danger': return 'var(--color-danger)'
      case 'ghost':
      case 'outline':
        return 'transparent'
    }
  }

  const getPadding = () => {
    switch (size) {
      case 'sm': return '6px 12px'
      case 'md': return '10px 18px'
      case 'lg': return '14px 24px'
    }
  }

  return (
    <button
      disabled={disabled}
      style={{
        backgroundColor: getBackground(),
        color: disabled ? 'var(--color-text-muted)' : 'var(--color-text)',
        border: variant === 'secondary' || variant === 'ghost' || variant === 'outline' ? '1px solid var(--color-border)' : 'none',
        borderRadius: 'var(--radius-sm)',
        padding: getPadding(),
        fontSize: size === 'sm' ? '0.875rem' : size === 'lg' ? '1.125rem' : '1rem',
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : undefined,
        transition: 'all 0.2s ease',
        boxShadow: variant === 'primary' && !disabled ? 'var(--shadow-sm)' : 'none',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
