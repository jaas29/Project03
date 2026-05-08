import { forwardRef, type InputHTMLAttributes } from 'react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, hint, error, id, className = '', ...rest }, ref) => {
    const inputId = id ?? rest.name ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <label htmlFor={inputId} className="block">
        <span className="block font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
          {label}
        </span>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={`mt-2 block w-full rounded-full border-2 border-ink/15 bg-cream-100 px-5 py-3.5 text-base text-ink placeholder-ink-soft/60 outline-none transition-colors focus:border-ink focus:bg-cream-50 ${
            error ? 'border-flame focus:border-flame' : ''
          } ${className}`}
          {...rest}
        />
        {error ? (
          <span id={`${inputId}-error`} className="mt-2 block pl-2 text-xs text-flame">
            {error}
          </span>
        ) : hint ? (
          <span id={`${inputId}-hint`} className="mt-2 block pl-2 text-xs text-ink-soft">
            {hint}
          </span>
        ) : null}
      </label>
    );
  }
);
Field.displayName = 'Field';
