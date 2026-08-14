import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/helpers';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'md' | 'sm' | 'lg';
  block?: boolean;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'default',
  size = 'md',
  block = false,
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        'btn',
        variant !== 'default' && `btn-${variant}`,
        size !== 'md' && `btn-${size}`,
        block && 'btn-block',
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />}
      {children}
    </button>
  );
}
