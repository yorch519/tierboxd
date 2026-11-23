import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string;
}

export function Select({ className = '', wrapperClassName = '', children, ...props }: Props) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select {...props} className={`input appearance-none pr-9 ${className}`}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
        strokeWidth={2.2}
      />
    </div>
  );
}
