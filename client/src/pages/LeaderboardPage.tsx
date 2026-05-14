import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface LeaderEntry {
  rank: number;
  username: string;
  initials: string;
  eloRating: number;
  eloRank: string;
  streak: number;
  weeklyScore: number;
  change: "up" | "down" | "same";
  isMe?: boolean;
}

type BoardView = "global" | "friends" | "weekly";

const MOCK_GLOBAL: LeaderEntry[] = [
  { rank: 1, username: "PepGuardiola", initials: "PG", eloRating: 1892, eloRank: "Diamond", streak: 61, weeklyScore: 2140, change: "same" },
  { rank: 2, username: "TikiTaka99", initials: "TT", eloRating: 1804, eloRank: "Diamond", streak: 44, weeklyScore: 1980, change: "up" },
  { rank: 3, username: "Xaviesque", initials: "XV", eloRating: 1751, eloRank: "Platinum", streak: 37, weeklyScore: 1870, change: "down" },
  { rank: 4, username: "GolazoBruno", initials: "GB", eloRating: 1698, eloRank: "Platinum", streak: 29, weeklyScore: 1740, change: "up" },
  { rank: 5, username: "SebSoccer", initials: "SS", eloRating: 1654, eloRank: "Gold I", streak: 22, weeklyScore: 1690, change: "same" },
  { rank: 6, username: "HugoFC", initials: "HC", eloRating: 1342, eloRank: "Gold II", streak: 7, weeklyScore: 1120, change: "up", isMe: true },
  { rank: 7, username: "FutbolFreak", initials: "FF", eloRating: 1290, eloRank: "Silver", streak: 5, weeklyScore: 1050, change: "down" },
  { rank: 8, username: "GoaledOut", initials: "GO", eloRating: 1201, eloRank: "Silver", streak: 3, weeklyScore: 980, change: "same" },
  { rank: 9, username: "OffsideRule", initials: "OR", eloRating: 1155, eloRank: "Bronze", streak: 1, weeklyScore: 890, change: "up" },
  { rank: 10, username: "NumberTen", initials: "N1", eloRating: 1099, eloRank: "Bronze", streak: 0, weeklyScore: 820, change: "down" },
];

const RANK_COLORS: Record<string, string> = {
  "Diamond": "#b39ddb",
  "Platinum": "#00e5ff",
  "Gold I": "#ffc200",
  "Gold II": "#ffd700",
  "Silver": "#a8a9ad",
  "Bronze": "#cd7f32",
};

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const CHANGE_ICON: Record<string, string> = { up: "▲", down: "▼", same: "—" };
const CHANGE_COLOR: Record<string, string> = { up: "#00e676", down: "#ef5350", same: "#546e7a" };

export default function LeaderboardPage() {
  const [view, setView] = useState<BoardView>("global");
  const [visible, setVisible] = useState(false);
  const [highlightMe, setHighlightMe] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 60);
  }, []);

  const entries = MOCK_GLOBAL;
  const myEntry = entries.find((e) => e.isMe);

  const scrollToMe = () => {
    setHighlightMe(true);
    document.getElementById("my-row")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightMe(false), 2000);
  };

  return (
    <div className="lb-root">
      <div className={`lb-content ${visible ? "lb-content--in" : ""}`}>

        {/* ── Nav ── */}
        <nav className="back-nav">
          <Link to="/" className="back-link">← Home</Link>
        </nav>

        {/* ── Title ── */}
        <header className="lb-header">
          <div>
            <h1 className="lb-title">🏆 Leaderboard</h1>
            <p className="lb-subtitle">Updated daily after midnight UTC</p>
          </div>
          {myEntry && (
            <button className="find-me-btn" onClick={scrollToMe}>
              Find Me
            </button>
          )}
        </header>

        {/* ── View toggle ── */}
        <div className="view-toggle">
          {(["global", "friends", "weekly"] as BoardView[]).map((v) => (
            <button
              key={v}
              className={`vt-btn ${view === v ? "vt-btn--active" : ""}`}
              onClick={() => setView(v)}
            >
              {v === "global" ? "🌍 Global" : v === "friends" ? "👥 Friends" : "📅 This Week"}
            </button>
          ))}
        </div>

        {/* ── My rank snapshot ── */}
        {myEntry && (
          <div className="my-rank-bar">
            <div className="mrb-left">
              <span className="mrb-rank">#{myEntry.rank}</span>
              <div className="mrb-avatar">{myEntry.initials}</div>
              <span className="mrb-name">{myEntry.username} (you)</span>
            </div>
            <div className="mrb-right">
              <span className="mrb-elo" style={{ color: RANK_COLORS[myEntry.eloRank] }}>
                {myEntry.eloRating} ELO
              </span>
              <span className="mrb-streak">{myEntry.streak} 🔥</span>
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <div className="lb-table">
          {/* Column headers */}
          <div className="lb-thead">
            <div className="lb-th lb-th--rank">#</div>
            <div className="lb-th lb-th--player">Player</div>
            <div className="lb-th lb-th--elo">ELO</div>
            <div className="lb-th lb-th--streak">Streak</div>
            <div className="lb-th lb-th--score">Score</div>
            <div className="lb-th lb-th--delta">Δ</div>
          </div>

          {/* Rows */}
          {entries.map((entry, i) => {
            const rc = RANK_COLORS[entry.eloRank] ?? "#66bb6a";
            return (
              <div
                key={entry.rank}
                id={entry.isMe ? "my-row" : undefined}
                className={`lb-row ${entry.isMe ? "lb-row--me" : ""} ${entry.isMe && highlightMe ? "lb-row--pulse" : ""}`}
                style={{ "--rank-color": rc, "--delay": `${i * 50}ms` } as React.CSSProperties}
              >
                <div className="lb-td lb-td--rank">
                  {MEDAL[entry.rank] ?? <span className="rank-num">{entry.rank}</span>}
                </div>

                <div className="lb-td lb-td--player">
                  <div className="player-avatar">{entry.initials}</div>
                  <div className="player-info">
                    <span className="player-name">{entry.username}</span>
                    <span className="player-rank" style={{ color: rc }}>{entry.eloRank}</span>
                  </div>
                </div>

                <div className="lb-td lb-td--elo" style={{ color: rc }}>
                  {entry.eloRating}
                </div>

                <div className="lb-td lb-td--streak">
                  {entry.streak > 0 ? `${entry.streak} 🔥` : "—"}
                </div>

                <div className="lb-td lb-td--score">
                  {entry.weeklyScore.toLocaleString()}
                </div>

                <div
                  className="lb-td lb-td--delta"
                  style={{ color: CHANGE_COLOR[entry.change] }}
                >
                  {CHANGE_ICON[entry.change]}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Friends placeholder ── */}
        {view === "friends" && (
          <div className="friends-cta">
            <p>Challenge friends to see how you compare.</p>
            <Link to="/duel" className="cta-link">⚔ Start a 1v1 Duel</Link>
          </div>
        )}
      </div>

      <style>{`
        .lb-root {
          min-height: 100vh;
          background: #0a0f0d;
          color: #e8f5e9;
          font-family: 'DM Sans', 'Segoe UI', sans-serif;
          padding: 0 0 80px;
        }
        .lb-content {
          max-width: 780px;
          margin: 0 auto;
          padding: 28px 20px;
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .lb-content--in { opacity: 1; transform: none; }

        .back-nav { margin-bottom: 20px; }
        .back-link { color: #66bb6a; text-decoration: none; font-size: 0.9rem; font-weight: 600; transition: color 0.15s; }
        .back-link:hover { color: #00e676; }

        /* ── Header ── */
        .lb-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .lb-title {
          font-size: 1.9rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          margin: 0 0 4px;
          background: linear-gradient(135deg, #00e676, #69f0ae);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lb-subtitle { font-size: 0.8rem; color: #66bb6a; margin: 0; }
        .find-me-btn {
          padding: 8px 18px;
          border-radius: 8px;
          border: 1px solid rgba(0,230,118,0.3);
          background: rgba(0,230,118,0.08);
          color: #00e676;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.16s;
          white-space: nowrap;
        }
        .find-me-btn:hover { background: rgba(0,230,118,0.18); }

        /* ── View toggle ── */
        .view-toggle { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
        .vt-btn {
          padding: 7px 18px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          color: #81c784;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.16s;
        }
        .vt-btn--active {
          background: rgba(0,230,118,0.1);
          border-color: rgba(0,230,118,0.35);
          color: #00e676;
        }

        /* ── My rank bar ── */
        .my-rank-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(0,230,118,0.06);
          border: 1px solid rgba(0,230,118,0.2);
          border-radius: 12px;
          padding: 12px 20px;
          margin-bottom: 16px;
        }
        .mrb-left { display: flex; align-items: center; gap: 12px; }
        .mrb-rank { font-size: 1.1rem; font-weight: 800; color: #00e676; min-width: 30px; }
        .mrb-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1b5e20, #2e7d32);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
          color: #a5d6a7;
          border: 2px solid rgba(0,230,118,0.4);
        }
        .mrb-name { font-weight: 700; color: #c8e6c9; font-size: 0.9rem; }
        .mrb-right { display: flex; align-items: center; gap: 16px; }
        .mrb-elo { font-weight: 800; font-size: 0.9rem; }
        .mrb-streak { font-size: 0.9rem; color: #a5d6a7; }

        /* ── Table ── */
        .lb-table {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          overflow: hidden;
        }
        .lb-thead {
          display: flex;
          align-items: center;
          padding: 12px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.03);
        }
        .lb-th {
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #546e7a;
          font-weight: 700;
        }

        .lb-row {
          display: flex;
          align-items: center;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          transition: background 0.16s;
          animation: row-in 0.35s ease both;
          animation-delay: var(--delay);
        }
        @keyframes row-in {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: none; }
        }
        .lb-row:last-child { border-bottom: none; }
        .lb-row:hover { background: rgba(255,255,255,0.03); }
        .lb-row--me {
          background: rgba(0,230,118,0.05);
          border-color: rgba(0,230,118,0.1);
        }
        .lb-row--me:hover { background: rgba(0,230,118,0.08); }
        @keyframes row-pulse {
          0%, 100% { background: rgba(0,230,118,0.05); }
          50% { background: rgba(0,230,118,0.18); }
        }
        .lb-row--pulse { animation: row-pulse 1s ease 3; }

        /* Column widths */
        .lb-th--rank, .lb-td--rank { width: 48px; flex-shrink: 0; }
        .lb-th--player, .lb-td--player { flex: 1; }
        .lb-th--elo, .lb-td--elo { width: 72px; text-align: right; }
        .lb-th--streak, .lb-td--streak { width: 72px; text-align: right; }
        .lb-th--score, .lb-td--score { width: 80px; text-align: right; }
        .lb-th--delta, .lb-td--delta { width: 32px; text-align: right; font-size: 0.75rem; font-weight: 700; }

        .lb-td { font-size: 0.88rem; color: #c8e6c9; }
        .lb-td--rank { font-size: 1.15rem; }
        .rank-num { font-weight: 700; color: #546e7a; }

        /* Player cell */
        .lb-td--player { display: flex; align-items: center; gap: 12px; }
        .player-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a2a1e, #2d4a32);
          border: 2px solid var(--rank-color, #66bb6a);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 800;
          color: #e8f5e9;
          flex-shrink: 0;
          box-shadow: 0 0 8px color-mix(in srgb, var(--rank-color, #66bb6a) 30%, transparent);
        }
        .player-info { display: flex; flex-direction: column; gap: 1px; }
        .player-name { font-weight: 700; font-size: 0.9rem; color: #e8f5e9; }
        .player-rank { font-size: 0.7rem; font-weight: 600; }

        .lb-td--elo { font-weight: 700; }
        .lb-td--streak { color: #a5d6a7; }
        .lb-td--score { font-weight: 700; color: #c8e6c9; }

        /* ── Friends placeholder ── */
        .friends-cta {
          margin-top: 24px;
          text-align: center;
          color: #66bb6a;
          font-size: 0.9rem;
        }
        .cta-link {
          display: inline-block;
          margin-top: 10px;
          padding: 10px 24px;
          border-radius: 10px;
          background: rgba(255,215,64,0.08);
          border: 1px solid rgba(255,215,64,0.25);
          color: #ffd740;
          text-decoration: none;
          font-weight: 700;
          font-size: 0.9rem;
          transition: background 0.18s;
        }
        .cta-link:hover { background: rgba(255,215,64,0.15); }

        @media (max-width: 540px) {
          .lb-th--elo, .lb-td--elo, .lb-th--streak, .lb-td--streak { display: none; }
        }
      `}</style>
    </div>
  );
}
