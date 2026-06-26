'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/cn';
import Icon from '@/components/ui/Icon';

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
  passwordToggle = true,
  compact = false,
  ...rest
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isFilled = value !== undefined ? value !== '' && value !== null && value !== undefined : !!defaultValue;
  const isFloating = focused || isFilled;
  const v = variants[variant] ?? variants.editorial;
  const isPasswordField = type === 'password' && !multiline;
  const showPasswordToggle = isPasswordField && passwordToggle;
  const inputType = showPasswordToggle && passwordVisible ? 'text' : type;
  const fieldPy = compact ? 'py-2' : 'py-3';
  const labelFloatingTop = compact ? 'top-0' : 'top-0';
  const labelRestTop = compact ? 'top-2' : 'top-3';
  const toggleTop = compact ? 'top-1.5' : 'top-3';

  const Field = multiline ? 'textarea' : 'input';

  return (
    <div className={cn('relative', className)}>
      <Field
        id={id}
        name={name}
        type={multiline ? undefined : inputType}
        rows={multiline ? rows : undefined}
        value={value}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        onChange={onChange}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        className={cn(
          'peer block w-full bg-transparent border-0 border-b px-0',
          fieldPy,
          'focus:outline-none placeholder-transparent',
          v.field,
          error && 'border-danger',
          showPasswordToggle && 'pr-10',
          inputClassName,
        )}
        placeholder={label || ''}
        aria-invalid={error ? 'true' : undefined}
        {...rest}
      />
      {showPasswordToggle ? (
        <button
          type="button"
          onClick={() => setPasswordVisible((v) => !v)}
          className={cn(
            'absolute right-0 p-1 text-ink-400 hover:text-ink-900 transition-colors',
            toggleTop,
            variant === 'dashboard' && 'text-on-surface-variant hover:text-on-surface',
          )}
          aria-label={passwordVisible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          <Icon name={passwordVisible ? 'visibility_off' : 'visibility'} size={compact ? 18 : 20} />
        </button>
      ) : null}
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'absolute left-0 transition-all pointer-events-none label-sm',
            v.label,
            isFloating
              ? cn(labelFloatingTop, 'text-[11px] tracking-labelTight')
              : cn(labelRestTop, compact ? 'text-[13px]' : 'text-[14px]', 'tracking-normal normal-case'),
          )}
        >
          {label}
          {required ? <span className="text-danger ml-1">*</span> : null}
        </label>
      )}
      {(error || hint) && (
        <p className={cn(compact ? 'mt-0.5' : 'mt-1', 'text-[12px]', error ? 'text-danger' : v.hint)}>
          {error || hint}
        </p>
      )}
    </div>
  );
}
