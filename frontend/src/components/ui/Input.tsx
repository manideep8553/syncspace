import type { InputHTMLAttributes } from 'react';
import { cn } from '../../utils/helpers';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className, id, ...rest }: InputProps) {
  const inputId = id ?? rest.name;
  return (
    <div>
      {label && <label className="label" htmlFor={inputId}>{label}</label>}
      <input id={inputId} className={cn('input', className)} {...rest} />
    </div>
  );
}