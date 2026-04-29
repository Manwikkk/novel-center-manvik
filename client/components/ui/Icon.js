import { cn } from '@/lib/cn';

/**
 * Renders a Material Symbols Outlined icon glyph.
 *
 * Usage: <Icon name="menu_book" /> or <Icon name="favorite" filled size={20} />
 *
 * The Material Symbols font is loaded globally in app/layout.js, so this is
 * just a thin wrapper that applies the right utility class names. Pixel-
 * perfect Stitch markup uses the raw `<span class="material-symbols-outlined">`
 * pattern, so we keep the same DOM shape.
 */
export default function Icon({
  name,
  filled = false,
  weight,
  size,
  className,
  style,
  ...rest
}) {
  const variation = [
    `'FILL' ${filled ? 1 : 0}`,
    weight ? `'wght' ${weight}` : null,
    `'GRAD' 0`,
    `'opsz' ${size || 24}`,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <span
      aria-hidden="true"
      className={cn('material-symbols-outlined', filled && 'fill', className)}
      style={{
        fontSize: size ? `${size}px` : undefined,
        fontVariationSettings: variation,
        ...style,
      }}
      {...rest}
    >
      {name}
    </span>
  );
}
