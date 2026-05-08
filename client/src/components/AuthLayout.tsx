import type { ReactNode } from 'react';
import { Wordmark } from './Wordmark';
import { JerseyCards } from './JerseyCards';

interface AuthLayoutProps {
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
  footer: ReactNode;
}

export function AuthLayout({ eyebrow, title, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full bg-cream-50 text-ink">
      <div className="grid min-h-screen w-full lg:grid-cols-2">
        {/* DARK PANEL — marketing */}
        <section className="relative overflow-hidden bg-ink text-cream-50">
          <div
            className="absolute inset-0 bg-dot-grid bg-dot-grid opacity-100"
            aria-hidden
          />
          <div className="relative z-10 flex min-h-full flex-col justify-between px-10 py-10 lg:px-16 lg:py-14">
            <Wordmark variant="light" size="md" />

            <div className="mt-12 max-w-xl lg:mt-0">
              <div className="font-mono text-[11px] font-medium uppercase tracking-widest text-gold">
                Five minutes a day
              </div>
              <h2 className="mt-5 font-display text-6xl leading-[0.95] text-cream-50 sm:text-7xl lg:text-[92px]">
                Daily football<br />
                <span className="text-gold">brain food.</span>
              </h2>
              <p className="mt-6 max-w-md text-base leading-relaxed text-cream-50/60">
                Three soccer puzzles, one fresh set every day. Build a streak. Duel a friend.
                Climb the ladder.
              </p>
            </div>

            <div className="mt-10 hidden lg:block">
              <JerseyCards />
            </div>
          </div>
        </section>

        {/* CREAM PANEL — form */}
        <section className="flex flex-col justify-center bg-cream-50 px-8 py-12 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-md">
            <p className="font-mono text-[11px] font-medium uppercase tracking-widest text-ink-soft">
              {eyebrow}
            </p>
            <h1 className="mt-3 font-display text-5xl leading-[1.02] text-ink sm:text-6xl">
              {title}
            </h1>

            <div className="mt-10">{children}</div>

            <div className="mt-10 text-center text-sm text-ink-soft">{footer}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
