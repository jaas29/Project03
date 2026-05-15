import { useEffect } from 'react';
import flameIcon from '../assets/icons/fire_icon_138608.svg';

function streakMessage(days: number): string {
  if (days <= 0) return 'Every champion starts with day one. Light it up.';
  if (days === 1) return 'Strong start. Show up again tomorrow.';
  if (days < 4) return 'Momentum is building. Keep your rhythm.';
  if (days < 7) return 'You are in the zone. Do not break the chain.';
  if (days < 14) return 'A full week plus. Consistency is becoming your edge.';
  if (days < 30) return 'Elite discipline. Keep stacking those days.';
  return 'Legendary streak. You are setting the standard.';
}

export function StreakPanel({
  open,
  days,
  onClose,
}: {
  open: boolean;
  days: number;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/60 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-3xl border-2 border-ink bg-cream-50 p-8 text-center shadow-card-lift"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Streak panel"
      >
        <img
          src={flameIcon}
          alt=""
          aria-hidden
          className="mx-auto h-24 w-24 object-contain"
          style={{ filter: 'brightness(0) saturate(100%) invert(30%) sepia(99%) saturate(2600%) hue-rotate(355deg) brightness(84%) contrast(110%)' }}
        />
        <p className="mt-5 font-display text-4xl leading-none text-ink">
          {days} Day Streak!
        </p>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          {streakMessage(days)}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-full bg-ink px-5 py-2 font-display text-xs uppercase tracking-widest text-cream-50"
        >
          Close
        </button>
      </div>
    </div>
  );
}
