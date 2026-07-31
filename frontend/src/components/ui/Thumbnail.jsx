import { useMemo, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveImageFallbacks } from '@/lib/images';

export function Thumbnail({
  src,
  alt = '',
  fallbackName,
  category = '',
  className,
  size = 'md',
  rounded = 'lg',
}) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const urls = useMemo(
    () => resolveImageFallbacks(src, fallbackName || alt, 300, 300, category),
    [src, fallbackName, alt, category]
  );

  const sizes = {
    xs: 'h-8 w-8',
    sm: 'h-10 w-10',
    md: 'h-14 w-14',
    lg: 'h-20 w-20',
    xl: 'h-32 w-full',
    cover: 'h-40 w-full',
  };

  const roundedClass = {
    sm: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  if (failed || index >= urls.length) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground shrink-0',
          sizes[size],
          roundedClass[rounded],
          className
        )}
      >
        <ImageOff className="h-4 w-4" />
      </div>
    );
  }

  return (
    <img
      src={urls[index]}
      alt={alt}
      loading="lazy"
      onError={() => {
        if (index < urls.length - 1) {
          setIndex((i) => i + 1);
        } else {
          setFailed(true);
        }
      }}
      className={cn(
        'object-cover shrink-0 bg-muted',
        sizes[size],
        roundedClass[rounded],
        className
      )}
    />
  );
}
