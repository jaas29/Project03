import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface DailyStats {
  playersToday: number;
  streak: number;
  puzzleNumber: number;
}

export default function HomePage() {
  const [stats, setStats] = useState<DailyStats>({
    playersToday: 2841,
    streak: 0,
    puzzleNumber: 42,
  });
  const [visible, setVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    // Staggered entrance
    const t = setTimeout(() => setVisible(true), 80);

    // Countdown to midnight UTC
    const tick = () => {
      const now = new Date();
      const tomorrow = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
      );
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    tick();
    const interval = setInterval(tick, 1000);

    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, []);

  const puzzles = [
    {
      id: "grid",
      label: "Football Grid",
      icon: "⊞",
      description: "Fill the 3×3 grid with players who match each club & stat combo.",
      href: "/play/grid",
      accent: "#00e676",
    },
    {
      id: "connections",
      label: "Connections",
      icon: "◈",
      description: "Group 16 players into four hidden categories.",
      href: "/play/connections",
      accent: "#29b6f6",
    },
    {
      id: "wordle",
      label: "Footballe",
      icon: "⬛",
      description: "Six guesses to name the mystery footballer.",
      href: "/play/wordle",
      accent: "#ffd740",
    },
  ];

  return (
    <div className="home-root">
      {/* ── Pitch texture background ── */}
      <div className="pitch-bg" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="pitch-stripe" />
        ))}
        <div className="center-circle" />
        <div className="halfway-line" />
      </div>

      <main className={`home-content ${visible ? "home-content--in" : ""}`}>
        {/* ── Header ── */}
        <header className="home-header">
          <div className="logo-lockup">
            <span className="logo-ball">⚽</span>
            <div>
              <h1 className="logo-title">Jogo Bonito</h1>
              <p className="logo-sub">Daily</p>
            </div>
          </div>
          <div className="header-actions">
            <Link to="/leaderboard" className="btn btn-ghost">
              🏆 Leaderboard
            </Link>
            <Link to="/profile" className="btn btn-ghost">
              👤 Profile
            </Link>
          </div>
        </header>

        {/* ── Today's banner ── */}
        <section className="today-banner">
          <div className="today-label">
            <span className="today-dot" />
            Puzzle #{stats.puzzleNumber} — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <div className="today-countdown">
            Next puzzle in <span className="countdown-time">{timeLeft}</span>
          </div>
        </section>

        {/* ── Puzzle cards ── */}
        <section className="puzzle-grid">
          {puzzles.map((p, i) => (
            <Link
              key={p.id}
              to={p.href}
              className="puzzle-card"
              style={{ "--accent": p.accent, "--delay": `${i * 120}ms` } as React.CSSProperties}
            >
              <div className="puzzle-icon">{p.icon}</div>
              <div className="puzzle-info">
                <h2 className="puzzle-name">{p.label}</h2>
                <p className="puzzle-desc">{p.description}</p>
              </div>
              <div className="puzzle-arrow">→</div>
              <div className="puzzle-glow" />
            </Link>
          ))}
        </section>

        {/* ── Stats bar ── */}
        <section className="stats-bar">
          <div className="stat">
            <span className="stat-value">{stats.playersToday.toLocaleString()}</span>
            <span className="stat-label">playing today</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-value">{stats.streak}</span>
            <span className="stat-label">day streak 🔥</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <Link to="/duel" className="stat-value stat-value--cta">
              ⚔ Challenge a Friend
            </Link>
            <span className="stat-label">1v1 duel</span>
          </div>
        </section>
      </main>

      <style>{`
        /* ── Reset / root ── */
        .home-root {
          position: relative;
          min-height: 100vh;
          background: #0a0f0d;
          color: #e8f5e9;
          font-family: 'DM Sans', 'Segoe UI', sans-serif;
          overflow: hidden;
        }

        /* ── Pitch background ── */
        .pitch-bg {
          position: absolute;
          inset: 0;
          display: flex;
          pointer-events: none;
          opacity: 0.06;
        }
        .pitch-stripe {
          flex: 1;
          background: #2e7d32;
          border-right: 1px solid #1b5e20;
        }
        .pitch-stripe:nth-child(even) { background: #1b5e20; }
        .halfway-line {
          position: absolute;
          top: 50%;
          left: 0; right: 0;
          height: 2px;
          background: #fff;
        }
        .center-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 220px;
          height: 220px;
          border-radius: 50%;
          border: 2px solid #fff;
        }

        /* ── Content ── */
        .home-content {
          position: relative;
          z-index: 1;
          max-width: 900px;
          margin: 0 auto;
          padding: 32px 20px 64px;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .home-content--in {
          opacity: 1;
          transform: none;
        }

        /* ── Header ── */
        .home-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 48px;
        }
        .logo-lockup {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .logo-ball {
          font-size: 2.6rem;
          line-height: 1;
          filter: drop-shadow(0 0 12px rgba(0,230,118,0.5));
          animation: spin-slow 12s linear infinite;
        }
        @keyframes spin-slow {
          to { transform: rotate(360deg); }
        }
        .logo-title {
          font-size: 1.9rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1;
          background: linear-gradient(135deg, #00e676, #69f0ae);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .logo-sub {
          font-size: 0.78rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #66bb6a;
          margin: 2px 0 0;
        }
        .header-actions {
          display: flex;
          gap: 10px;
        }
        .btn {
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.18s, color 0.18s;
        }
        .btn-ghost {
          background: rgba(255,255,255,0.06);
          color: #a5d6a7;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .btn-ghost:hover {
          background: rgba(0,230,118,0.12);
          color: #00e676;
          border-color: rgba(0,230,118,0.3);
        }

        /* ── Today banner ── */
        .today-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 14px 22px;
          margin-bottom: 36px;
          backdrop-filter: blur(6px);
        }
        .today-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          color: #c8e6c9;
          font-weight: 500;
        }
        .today-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #00e676;
          box-shadow: 0 0 8px #00e676;
          animation: pulse-dot 2s ease infinite;
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.4); }
        }
        .today-countdown {
          font-size: 0.8rem;
          color: #81c784;
        }
        .countdown-time {
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 0.95rem;
          font-weight: 700;
          color: #00e676;
          letter-spacing: 0.05em;
        }

        /* ── Puzzle cards ── */
        .puzzle-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 40px;
        }
        .puzzle-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 22px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 24px 28px;
          text-decoration: none;
          overflow: hidden;
          transition: transform 0.22s ease, border-color 0.22s ease, background 0.22s ease;
          animation: card-in 0.5s ease both;
          animation-delay: var(--delay);
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: none; }
        }
        .puzzle-card:hover {
          transform: translateX(6px);
          background: rgba(255,255,255,0.06);
          border-color: var(--accent, #00e676);
        }
        .puzzle-card:hover .puzzle-glow {
          opacity: 1;
        }
        .puzzle-icon {
          font-size: 2.4rem;
          line-height: 1;
          min-width: 48px;
          text-align: center;
          filter: drop-shadow(0 0 8px var(--accent, #00e676));
        }
        .puzzle-info {
          flex: 1;
        }
        .puzzle-name {
          font-size: 1.2rem;
          font-weight: 700;
          color: #e8f5e9;
          margin: 0 0 4px;
          letter-spacing: -0.02em;
        }
        .puzzle-desc {
          font-size: 0.85rem;
          color: #81c784;
          margin: 0;
          line-height: 1.5;
        }
        .puzzle-arrow {
          font-size: 1.4rem;
          color: var(--accent, #00e676);
          opacity: 0;
          transform: translateX(-8px);
          transition: opacity 0.2s, transform 0.2s;
        }
        .puzzle-card:hover .puzzle-arrow {
          opacity: 1;
          transform: none;
        }
        .puzzle-glow {
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 4px;
          background: var(--accent, #00e676);
          box-shadow: 0 0 16px var(--accent, #00e676);
          opacity: 0;
          transition: opacity 0.22s;
          border-radius: 16px 0 0 16px;
        }

        /* ── Stats bar ── */
        .stats-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          padding: 20px 32px;
        }
        .stat {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .stat-value {
          font-size: 1.45rem;
          font-weight: 800;
          color: #00e676;
          letter-spacing: -0.03em;
        }
        .stat-value--cta {
          font-size: 1rem;
          text-decoration: none;
          color: #ffd740;
          transition: color 0.18s;
        }
        .stat-value--cta:hover { color: #fff176; }
        .stat-label {
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #66bb6a;
        }
        .stat-divider {
          width: 1px;
          height: 44px;
          background: rgba(255,255,255,0.1);
          margin: 0 8px;
        }

        /* ── Responsive ── */
        @media (max-width: 600px) {
          .home-header { flex-direction: column; gap: 20px; align-items: flex-start; }
          .stats-bar { flex-direction: column; gap: 16px; }
          .stat-divider { width: 80%; height: 1px; margin: 0; }
        }
      `}</style>
    </div>
  );
}
