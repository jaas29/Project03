import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ShareCard from "../components/ShareCard";

interface UserProfile {
  username: string;
  avatarInitials: string;
  joinedDate: string;
  currentStreak: number;
  maxStreak: number;
  totalPlayed: number;
  winRate: number;
  eloRating: number;
  eloRank: string;
  gamesHistory: GameResult[];
}

interface GameResult {
  date: string;
  puzzleNum: number;
  gridScore: number | null;
  connectionsScore: number | null;
  wordleGuesses: number | null;
  completed: boolean;
}

const MOCK_PROFILE: UserProfile = {
  username: "HugoFC",
  avatarInitials: "HC",
  joinedDate: "March 2026",
  currentStreak: 7,
  maxStreak: 23,
  totalPlayed: 41,
  winRate: 87,
  eloRating: 1342,
  eloRank: "Gold II",
  gamesHistory: [
    { date: "Today", puzzleNum: 42, gridScore: 7, connectionsScore: 3, wordleGuesses: 4, completed: true },
    { date: "Yesterday", puzzleNum: 41, gridScore: 5, connectionsScore: 4, wordleGuesses: 3, completed: true },
    { date: "May 12", puzzleNum: 40, gridScore: 9, connectionsScore: 2, wordleGuesses: 2, completed: true },
    { date: "May 11", puzzleNum: 39, gridScore: null, connectionsScore: 3, wordleGuesses: 6, completed: false },
    { date: "May 10", puzzleNum: 38, gridScore: 8, connectionsScore: 4, wordleGuesses: 3, completed: true },
    { date: "May 9", puzzleNum: 37, gridScore: 6, connectionsScore: 3, wordleGuesses: 5, completed: true },
    { date: "May 8", puzzleNum: 36, gridScore: 7, connectionsScore: 4, wordleGuesses: 2, completed: true },
  ],
};

const ELO_BADGES: Record<string, { color: string; emoji: string }> = {
  "Bronze": { color: "#cd7f32", emoji: "🥉" },
  "Silver": { color: "#a8a9ad", emoji: "🥈" },
  "Gold II": { color: "#ffd700", emoji: "🥇" },
  "Gold I": { color: "#ffc200", emoji: "🏅" },
  "Platinum": { color: "#00e5ff", emoji: "💎" },
  "Diamond": { color: "#b39ddb", emoji: "💠" },
};

export default function ProfilePage() {
  const [profile] = useState<UserProfile>(MOCK_PROFILE);
  const [tab, setTab] = useState<"history" | "stats">("history");
  const [showShare, setShowShare] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const badge = ELO_BADGES[profile.eloRank] ?? { color: "#66bb6a", emoji: "⚽" };

  const avgWordle =
    profile.gamesHistory
      .filter((g) => g.wordleGuesses !== null)
      .reduce((acc, g) => acc + (g.wordleGuesses ?? 0), 0) /
    profile.gamesHistory.filter((g) => g.wordleGuesses !== null).length;

  return (
    <div className="profile-root">
      <div className={`profile-content ${visible ? "profile-content--in" : ""}`}>
        {/* ── Back nav ── */}
        <nav className="back-nav">
          <Link to="/" className="back-link">← Home</Link>
        </nav>

        {/* ── Hero card ── */}
        <div className="hero-card">
          <div className="avatar" style={{ "--badge-color": badge.color } as React.CSSProperties}>
            <span className="avatar-initials">{profile.avatarInitials}</span>
            <span className="avatar-ring" />
          </div>

          <div className="hero-info">
            <h1 className="hero-username">{profile.username}</h1>
            <p className="hero-joined">Member since {profile.joinedDate}</p>

            <div className="hero-badges">
              <span className="rank-badge" style={{ background: badge.color + "22", borderColor: badge.color, color: badge.color }}>
                {badge.emoji} {profile.eloRank} · {profile.eloRating} ELO
              </span>
            </div>
          </div>

          <button className="share-btn" onClick={() => setShowShare(true)}>
            Share Stats
          </button>
        </div>

        {/* ── Quick stats ── */}
        <div className="quick-stats">
          {[
            { label: "Current Streak", value: `${profile.currentStreak} 🔥`, highlight: true },
            { label: "Best Streak", value: `${profile.maxStreak}` },
            { label: "Played", value: profile.totalPlayed },
            { label: "Win %", value: `${profile.winRate}%` },
            { label: "Avg Wordle", value: avgWordle.toFixed(1) },
          ].map((s) => (
            <div key={s.label} className={`qs-item ${s.highlight ? "qs-item--hi" : ""}`}>
              <span className="qs-value">{s.value}</span>
              <span className="qs-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="tab-row">
          {(["history", "stats"] as const).map((t) => (
            <button key={t} className={`tab-btn ${tab === t ? "tab-btn--active" : ""}`} onClick={() => setTab(t)}>
              {t === "history" ? "📋 History" : "📊 Stats"}
            </button>
          ))}
        </div>

        {/* ── History list ── */}
        {tab === "history" && (
          <div className="history-list">
            {profile.gamesHistory.map((g, i) => (
              <div key={i} className={`history-row ${!g.completed ? "history-row--miss" : ""}`}>
                <div className="hr-date">
                  <span className="hr-puzzle">#{g.puzzleNum}</span>
                  <span className="hr-day">{g.date}</span>
                </div>
                <div className="hr-scores">
                  <span className="hr-pill hr-pill--grid" title="Grid score">
                    ⊞ {g.gridScore ?? "—"}/9
                  </span>
                  <span className="hr-pill hr-pill--conn" title="Connections">
                    ◈ {g.connectionsScore ?? "—"}/4
                  </span>
                  <span className="hr-pill hr-pill--wrd" title="Wordle guesses">
                    ⬛ {g.wordleGuesses ?? "X"}/6
                  </span>
                </div>
                <span className={`hr-status ${g.completed ? "hr-status--win" : "hr-status--miss"}`}>
                  {g.completed ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Stats chart ── */}
        {tab === "stats" && (
          <div className="stats-panel">
            <p className="stats-section-label">Wordle Guess Distribution</p>
            {[1, 2, 3, 4, 5, 6].map((guess) => {
              const count = profile.gamesHistory.filter((g) => g.wordleGuesses === guess).length;
              const pct = Math.round((count / profile.totalPlayed) * 100);
              return (
                <div key={guess} className="dist-row">
                  <span className="dist-label">{guess}</span>
                  <div className="dist-bar-bg">
                    <div className="dist-bar-fill" style={{ width: `${Math.max(pct, 4)}%` }}>
                      {count > 0 && <span className="dist-bar-val">{count}</span>}
                    </div>
                  </div>
                </div>
              );
            })}

            <p className="stats-section-label" style={{ marginTop: 28 }}>Grid Score Distribution</p>
            {[9, 8, 7, 6, 5].map((score) => {
              const count = profile.gamesHistory.filter((g) => g.gridScore === score).length;
              const pct = Math.round((count / profile.totalPlayed) * 100);
              return (
                <div key={score} className="dist-row">
                  <span className="dist-label">{score}</span>
                  <div className="dist-bar-bg">
                    <div className="dist-bar-fill dist-bar-fill--grid" style={{ width: `${Math.max(pct, 4)}%` }}>
                      {count > 0 && <span className="dist-bar-val">{count}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Share card modal ── */}
      {showShare && (
        <div className="modal-overlay" onClick={() => setShowShare(false)}>
          <div className="modal-inner" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowShare(false)}>✕</button>
            <ShareCard
              username={profile.username}
              puzzleNum={profile.gamesHistory[0].puzzleNum}
              gridScore={profile.gamesHistory[0].gridScore ?? 0}
              connectionsScore={profile.gamesHistory[0].connectionsScore ?? 0}
              wordleGuesses={profile.gamesHistory[0].wordleGuesses ?? 0}
            />
          </div>
        </div>
      )}

      <style>{`
        .profile-root {
          min-height: 100vh;
          background: #0a0f0d;
          color: #e8f5e9;
          font-family: 'DM Sans', 'Segoe UI', sans-serif;
          padding: 0 0 80px;
        }
        .profile-content {
          max-width: 720px;
          margin: 0 auto;
          padding: 28px 20px;
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .profile-content--in { opacity: 1; transform: none; }

        .back-nav { margin-bottom: 24px; }
        .back-link {
          color: #66bb6a;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 600;
          transition: color 0.15s;
        }
        .back-link:hover { color: #00e676; }

        /* ── Hero ── */
        .hero-card {
          display: flex;
          align-items: center;
          gap: 24px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 28px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .avatar {
          position: relative;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1b5e20, #2e7d32);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .avatar-initials {
          font-size: 1.6rem;
          font-weight: 800;
          color: #a5d6a7;
          letter-spacing: -0.04em;
        }
        .avatar-ring {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 3px solid var(--badge-color, #00e676);
          box-shadow: 0 0 12px var(--badge-color, #00e676);
        }
        .hero-info { flex: 1; min-width: 180px; }
        .hero-username {
          font-size: 1.7rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          margin: 0 0 4px;
          background: linear-gradient(135deg, #00e676, #69f0ae);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-joined { font-size: 0.82rem; color: #66bb6a; margin: 0 0 12px; }
        .hero-badges { display: flex; gap: 8px; flex-wrap: wrap; }
        .rank-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 999px;
          border: 1px solid;
          font-size: 0.82rem;
          font-weight: 700;
        }
        .share-btn {
          padding: 10px 22px;
          border-radius: 10px;
          border: 1px solid rgba(0,230,118,0.35);
          background: rgba(0,230,118,0.1);
          color: #00e676;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.18s, border-color 0.18s;
          white-space: nowrap;
        }
        .share-btn:hover { background: rgba(0,230,118,0.2); border-color: #00e676; }

        /* ── Quick stats ── */
        .quick-stats {
          display: flex;
          gap: 0;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          margin-bottom: 24px;
          overflow: hidden;
        }
        .qs-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 18px 8px;
          border-right: 1px solid rgba(255,255,255,0.06);
          gap: 4px;
        }
        .qs-item:last-child { border-right: none; }
        .qs-item--hi { background: rgba(0,230,118,0.05); }
        .qs-value { font-size: 1.3rem; font-weight: 800; color: #00e676; letter-spacing: -0.03em; }
        .qs-item--hi .qs-value { font-size: 1.5rem; }
        .qs-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.1em; color: #66bb6a; text-align: center; }

        /* ── Tabs ── */
        .tab-row { display: flex; gap: 8px; margin-bottom: 16px; }
        .tab-btn {
          padding: 8px 20px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: #81c784;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.16s;
        }
        .tab-btn--active {
          background: rgba(0,230,118,0.12);
          border-color: rgba(0,230,118,0.35);
          color: #00e676;
        }

        /* ── History ── */
        .history-list { display: flex; flex-direction: column; gap: 8px; }
        .history-row {
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 14px 18px;
          animation: row-in 0.3s ease both;
        }
        .history-row--miss { border-color: rgba(239,83,80,0.2); }
        @keyframes row-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: none; }
        }
        .hr-date { display: flex; flex-direction: column; min-width: 60px; }
        .hr-puzzle { font-size: 0.75rem; color: #66bb6a; font-weight: 700; }
        .hr-day { font-size: 0.82rem; color: #a5d6a7; }
        .hr-scores { flex: 1; display: flex; gap: 8px; flex-wrap: wrap; }
        .hr-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 600;
          border: 1px solid;
        }
        .hr-pill--grid { background: rgba(0,230,118,0.08); border-color: rgba(0,230,118,0.2); color: #69f0ae; }
        .hr-pill--conn { background: rgba(41,182,246,0.08); border-color: rgba(41,182,246,0.2); color: #29b6f6; }
        .hr-pill--wrd  { background: rgba(255,215,64,0.08); border-color: rgba(255,215,64,0.2); color: #ffd740; }
        .hr-status { font-size: 1.1rem; font-weight: 800; }
        .hr-status--win { color: #00e676; }
        .hr-status--miss { color: #ef5350; }

        /* ── Stats panel ── */
        .stats-panel { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; }
        .stats-section-label { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.12em; color: #66bb6a; margin: 0 0 12px; }
        .dist-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .dist-label { width: 16px; font-size: 0.85rem; font-weight: 700; color: #a5d6a7; text-align: right; }
        .dist-bar-bg { flex: 1; background: rgba(255,255,255,0.05); border-radius: 4px; height: 24px; overflow: hidden; }
        .dist-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #1b5e20, #00e676);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 8px;
          transition: width 0.6s cubic-bezier(.22,.61,.36,1);
        }
        .dist-bar-fill--grid { background: linear-gradient(90deg, #1565c0, #29b6f6); }
        .dist-bar-val { font-size: 0.75rem; font-weight: 700; color: #fff; }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(4px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-inner {
          position: relative;
          background: #0f1a13;
          border: 1px solid rgba(0,230,118,0.2);
          border-radius: 20px;
          padding: 32px;
          max-width: 420px;
          width: 100%;
        }
        .modal-close {
          position: absolute;
          top: 16px; right: 16px;
          background: none;
          border: none;
          color: #66bb6a;
          font-size: 1.1rem;
          cursor: pointer;
        }

        @media (max-width: 540px) {
          .hero-card { flex-direction: column; align-items: flex-start; }
          .quick-stats { flex-wrap: wrap; }
          .qs-item { min-width: 30%; }
        }
      `}</style>
    </div>
  );
}
