'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/cn';

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
  ...rest
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const isFilled = value !== undefined ? value !== '' && value !== null && value !== undefined : !!defaultValue;
  const isFloating = focused || isFilled;

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
          'border-surface-variant focus:border-on-surface focus:outline-none',
          'placeholder-transparent text-on-surface caret-studio-accent',
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
            isFloating ? 'top-0 text-[11px] tracking-labelTight text-on-surface-variant' : 'top-3 text-[14px] tracking-normal text-on-surface-variant normal-case',
          )}
        >
          {label}
          {required ? <span className="text-danger ml-1">*</span> : null}
        </label>
      )}
      {(error || hint) && (
        <p className={cn('mt-1 text-[12px]', error ? 'text-danger' : 'text-on-surface-variant')}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
