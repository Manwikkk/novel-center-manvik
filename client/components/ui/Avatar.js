'use client';

import { useState } from 'react';
import { initials } from '@/lib/format';
import { cn } from '@/lib/cn';
import { resolveImageUrl } from '@/lib/image';

function InitialsAvatar({ name, size, className }) {
  return (
    <div
      className={cn(
        'rounded-full bg-cream-300 text-ink-900 font-sans font-semibold flex items-center justify-center',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.floor(size * 0.4)) }}
      aria-label={name || 'avatar'}
    >
      {initials(name) || '·'}
    </div>
  );
}

export default function Avatar({ name, src, size = 36, className }) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveImageUrl(src);

  if (resolved && !failed) {
    return (
      <img
        src={resolved}
        alt={name || 'avatar'}
        width={size}
        height={size}
        className={cn('rounded-full object-cover', className)}
        style={{ width: size, height: size }}
        onError={() => setFailed(true)}
      />
    );
  }

  return <InitialsAvatar name={name} size={size} className={className} />;
}
