'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/cn';

const variants = {
  /** Cream/white public pages (login, register) — readable even when html.dark is set. */
  editorial: {
    field: [
      'border-ink-300 focus:border-ink-900',
      'text-ink-900 caret-ink-900',
      '[&:-webkit-autofill]:[-webkit-text-fill-color:#1e1b15]',
      '[&:-webkit-autofill]:[box-shadow:0_0_0_1000px_#fff8f1_inset]',
    ].join(' '),
    label: 'text-ink-400',
    hint: 'text-ink-400',
  },
  /** Author/admin dashboard — follows site light/dark tokens. */
  dashboard: {
    field: 'border-surface-variant focus:border-on-surface text-on-surface caret-studio-accent',
    label: 'text-on-surface-variant',
    hint: 'text-on-surface-variant',
  },
};

export default function TextInput({
  label,
  type = 'text',
  value,
  defaultValue,
  onChange,
  onBlur,
  onFocus,
  name,
  required,
  error,
  hint,
  autoComplete,
  className,
  inputClassName,
  multiline = false,
  rows = 4,
  variant = 'editorial',
  ...rest
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const isFilled = value !== undefined ? value !== '' && value !== null && value !== undefined : !!defaultValue;
  const isFloating = focused || isFilled;
  const v = variants[variant] ?? variants.editorial;

  const Field = multiline ? 'textarea' : 'input';

  return (
    <div className={cn('relative', className)}>
      <Field
        id={id}
        name={name}
        type={multiline ? undefined : type}
        rows={multiline ? rows : undefined}
        value={value}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        onChange={onChange}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        className={cn(
          'peer block w-full bg-transparent border-0 border-b py-3 px-0',
          'focus:outline-none placeholder-transparent',
          v.field,
          error && 'border-danger',
          inputClassName,
        )}
        placeholder={label || ''}
        aria-invalid={error ? 'true' : undefined}
        {...rest}
      />
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'absolute left-0 transition-all pointer-events-none label-sm',
            v.label,
            isFloating ? 'top-0 text-[11px] tracking-labelTight' : 'top-3 text-[14px] tracking-normal normal-case',
          )}
        >
          {label}
          {required ? <span className="text-danger ml-1">*</span> : null}
        </label>
      )}
      {(error || hint) && (
        <p className={cn('mt-1 text-[12px]', error ? 'text-danger' : v.hint)}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
