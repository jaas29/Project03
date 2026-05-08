/**
 * Decorative jersey-card mockups (Vinicius / Erling) — pure SVG, no images.
 * Used as illustrative anchor on the dark auth panels.
 */
export function JerseyCards() {
  return (
    <div className="pointer-events-none relative h-72">
      {/* Card 1 — RMA white/gold */}
      <div
        className="absolute bottom-0 left-2 h-72 w-44 -rotate-[14deg] rounded-md border-2 border-ink bg-cream-50 p-3 shadow-card-lift"
        aria-hidden
      >
        <div className="rounded-sm border border-ink/80 bg-cream-50 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-ink w-fit">
          RMA
        </div>
        <div className="absolute inset-x-3 top-12 bottom-3 overflow-hidden rounded-sm">
          <div className="absolute inset-0 bg-cream-50" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gold" />
          <div className="absolute inset-x-0 bottom-1/3 h-2 bg-flame" />
          <div className="absolute inset-x-0 bottom-0 grid place-items-center">
            <div className="font-display text-5xl text-cream-50 mix-blend-difference">VJ</div>
          </div>
          <div className="absolute inset-x-0 bottom-0 pb-3 text-center font-mono text-[9px] font-bold uppercase tracking-widest text-ink">
            Vinicius&nbsp;Jr
          </div>
        </div>
      </div>

      {/* Card 2 — MCI navy/sky */}
      <div
        className="absolute bottom-0 left-32 h-72 w-44 rotate-[10deg] rounded-md border-2 border-ink bg-cream-50 p-3 shadow-card-lift"
        aria-hidden
      >
        <div className="rounded-sm border border-ink/80 bg-cream-50 px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest text-ink w-fit">
          MCI
        </div>
        <div className="absolute inset-x-3 top-12 bottom-3 overflow-hidden rounded-sm">
          <div className="absolute inset-0 bg-sky" />
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(28,44,91,0) 0 14px, rgba(28,44,91,0.55) 14px 18px)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 grid place-items-center pb-10">
            <div className="font-display text-5xl text-cream-50 drop-shadow">EH</div>
          </div>
          <div className="absolute inset-x-0 bottom-0 pb-3 text-center font-mono text-[9px] font-bold uppercase tracking-widest text-cream-50">
            Erling&nbsp;Haaland
          </div>
        </div>
      </div>
    </div>
  );
}
