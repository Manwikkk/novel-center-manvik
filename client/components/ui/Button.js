'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';

const baseClass =
  'inline-flex items-center justify-center select-none transition-colors duration-150 ' +
  'tracking-label uppercase font-semibold disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-gold focus-visible:ring-offset-cream-100';

const variants = {
  primary: 'bg-ink-900 text-cream-100 hover:bg-ink-800 active:bg-black',
  secondary: 'border border-ink-300 text-ink-900 hover:border-ink-700 bg-transparent',
  ghost: 'text-ink-700 hover:text-ink-900 bg-transparent',
  gold: 'bg-gold text-ink-900 hover:bg-gold-dim',
  danger: 'bg-danger text-white hover:bg-danger/90',
  tertiary:
    'relative bg-transparent text-ink-900 px-0 ' +
    'after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-[2px] after:bg-ink-900 ' +
    'after:scale-x-100 hover:after:bg-gold',
};

const sizes = {
  sm: 'text-[12px] tracking-labelTight px-3 py-1.5 rounded',
  md: 'text-[14px] px-5 py-2.5 rounded',
  lg: 'text-[15px] px-7 py-3 rounded',
};

export default function Button({
  as,
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  type,
  ...rest
}) {
  const classes = cn(baseClass, variants[variant], variant === 'tertiary' ? 'tracking-label' : sizes[size], className);
  if (href) {
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  const Tag = as || 'button';
  return (
    <Tag type={type || 'button'} className={classes} {...rest}>
      {children}
    </Tag>
  );
}
