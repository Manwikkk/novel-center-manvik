import { cn } from '@/lib/cn';
import Link from 'next/link';
import Image from 'next/image';

export default function Logo({ className, mark = true, variant = 'ink', size = 40, label = true }) {
  return (
    <Link href="/" className={cn('inline-flex items-center gap-3', className)}>
      {mark && (
        <span className={cn('inline-flex items-center justify-center overflow-hidden rounded-sm', variant === 'cream' && 'bg-cream-100 p-1')}>
          <Image
            src="/images/Novel_Center_Logo.png"
            alt="Novel Centre logo"
            width={size}
            height={size}
            className="object-contain"
            priority
          />
        </span>
      )}
      {label ? (
        <span className={cn('font-serif text-[20px] leading-none tracking-tightDisplay', variant === 'cream' ? 'text-cream-100' : 'text-ink-900')}>
          Novel Centre
        </span>
      ) : null}
    </Link>
  );
}
