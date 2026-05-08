interface WordmarkProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}

export function Wordmark({ variant = 'light', size = 'md' }: WordmarkProps) {
  const inkClass = variant === 'light' ? 'text-cream-50' : 'text-ink';
  const ringClass = variant === 'light' ? 'border-cream-50' : 'border-ink';
  const sizeClass =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-3xl' : 'text-xl';
  const ringSize = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center rounded-full border-2 ${ringClass} ${ringSize}`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 18 L12 4 L20 18 Z" />
          <circle cx="12" cy="13" r="2" fill="currentColor" />
        </svg>
      </div>
      <div className={`font-wordmark leading-[0.9] tracking-tight ${inkClass} ${sizeClass}`}>
        <div>jogo</div>
        <div>
          bonito<span className="text-flame">.</span>
        </div>
      </div>
    </div>
  );
}
