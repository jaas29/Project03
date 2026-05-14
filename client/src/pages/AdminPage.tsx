import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";

// In real app: replace with useAuth() hook
const MOCK_IS_ADMIN = true;

interface PuzzleRow {
  id: string;
  date: string;
  type: "grid" | "connections" | "wordle";
  status: "published" | "draft" | "scheduled";
  plays: number;
  avgScore: number;
}

interface UserRow {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "banned";
  joined: string;
  plays: number;
}

type AdminTab = "puzzles" | "users" | "stats";

const MOCK_PUZZLES: PuzzleRow[] = [
  { id: "p42", date: "2026-05-14", type: "grid", status: "published", plays: 2841, avgScore: 6.4 },
  { id: "p42c", date: "2026-05-14", type: "connections", status: "published", plays: 2619, avgScore: 3.1 },
  { id: "p42w", date: "2026-05-14", type: "wordle", status: "published", plays: 2503, avgScore: 4.2 },
  { id: "p43", date: "2026-05-15", type: "grid", status: "scheduled", plays: 0, avgScore: 0 },
  { id: "p43c", date: "2026-05-15", type: "connections", status: "draft", plays: 0, avgScore: 0 },
  { id: "p43w", date: "2026-05-15", type: "wordle", status: "draft", plays: 0, avgScore: 0 },
];

const MOCK_USERS: UserRow[] = [
  { id: "u1", username: "PepGuardiola", email: "pep@example.com", role: "user", status: "active", joined: "Jan 2026", plays: 89 },
  { id: "u2", username: "HugoFC", email: "hugo@example.com", role: "admin", status: "active", joined: "Mar 2026", plays: 41 },
  { id: "u3", username: "TikiTaka99", email: "tiki@example.com", role: "user", status: "active", joined: "Feb 2026", plays: 71 },
  { id: "u4", username: "SpamBot420", email: "spam@example.com", role: "user", status: "banned", joined: "May 2026", plays: 3 },
  { id: "u5", username: "SebSoccer", email: "seb@example.com", role: "user", status: "active", joined: "Mar 2026", plays: 55 },
];

const STATUS_STYLES: Record<string, string> = {
  published: "status--green",
  scheduled: "status--blue",
  draft: "status--gray",
  active: "status--green",
  banned: "status--red",
};

const TYPE_ICONS: Record<string, string> = { grid: "⊞", connections: "◈", wordle: "⬛" };

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("puzzles");
  const [visible, setVisible] = useState(false);
  const [searchUser, setSearchUser] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setTimeout(() => setVisible(true), 60);
  }, []);

  if (!MOCK_IS_ADMIN) {
    return <Navigate to="/" replace />;
  }

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const filteredUsers = MOCK_USERS.filter((u) =>
    u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const totalPlays = MOCK_PUZZLES.reduce((a, p) => a + p.plays, 0);
  const totalUsers = MOCK_USERS.filter((u) => u.status === "active").length;
  const todayPuzzles = MOCK_PUZZLES.filter((p) => p.date === "2026-05-14");

  return (
    <div className="admin-root">
      <div className={`admin-content ${visible ? "admin-content--in" : ""}`}>

        {/* ── Header ── */}
        <header className="admin-header">
          <div className="admin-title-group">
            <Link to="/" className="back-link">← App</Link>
            <h1 className="admin-title">
              <span className="admin-badge">Admin</span>
              Control Panel
            </h1>
          </div>
          <div className="admin-header-meta">
            <span className="admin-user">Logged in as <strong>HugoFC</strong></span>
          </div>
        </header>

        {/* ── KPI strip ── */}
        <div className="kpi-strip">
          {[
            { label: "Total Plays Today", value: totalPlays.toLocaleString(), icon: "🎮" },
            { label: "Active Users", value: totalUsers, icon: "👥" },
            { label: "Today's Puzzles", value: `${todayPuzzles.filter((p) => p.status === "published").length}/3`, icon: "✅" },
            { label: "Banned Accounts", value: MOCK_USERS.filter((u) => u.status === "banned").length, icon: "🚫" },
          ].map((k) => (
            <div key={k.label} className="kpi-item">
              <span className="kpi-icon">{k.icon}</span>
              <span className="kpi-val">{k.value}</span>
              <span className="kpi-label">{k.label}</span>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="admin-tabs">
          {(["puzzles", "users", "stats"] as AdminTab[]).map((t) => (
            <button
              key={t}
              className={`admin-tab ${tab === t ? "admin-tab--active" : ""}`}
              onClick={() => setTab(t)}
            >
              {t === "puzzles" ? "🧩 Puzzles" : t === "users" ? "👤 Users" : "📊 Stats"}
            </button>
          ))}
        </div>

        {/* ══ PUZZLES TAB ══ */}
        {tab === "puzzles" && (
          <div className="panel">
            <div className="panel-topbar">
              <h2 className="panel-heading">Puzzle Management</h2>
              <button className="action-btn action-btn--primary" onClick={() => showToast("Puzzle creator coming soon")}>
                + New Puzzle
              </button>
            </div>

            <div className="data-table">
              <div className="dt-head">
                <div className="dt-th dt-th--id">ID</div>
                <div className="dt-th dt-th--date">Date</div>
                <div className="dt-th dt-th--type">Type</div>
                <div className="dt-th dt-th--status">Status</div>
                <div className="dt-th dt-th--plays">Plays</div>
                <div className="dt-th dt-th--score">Avg Score</div>
                <div className="dt-th dt-th--actions">Actions</div>
              </div>

              {MOCK_PUZZLES.map((p, i) => (
                <div key={p.id} className="dt-row" style={{ "--delay": `${i * 40}ms` } as React.CSSProperties}>
                  <div className="dt-td dt-td--id"><code>{p.id}</code></div>
                  <div className="dt-td dt-td--date">{p.date}</div>
                  <div className="dt-td dt-td--type">
                    <span className="type-chip">{TYPE_ICONS[p.type]} {p.type}</span>
                  </div>
                  <div className="dt-td dt-td--status">
                    <span className={`status-chip ${STATUS_STYLES[p.status]}`}>{p.status}</span>
                  </div>
                  <div className="dt-td dt-td--plays">{p.plays > 0 ? p.plays.toLocaleString() : "—"}</div>
                  <div className="dt-td dt-td--score">{p.avgScore > 0 ? p.avgScore.toFixed(1) : "—"}</div>
                  <div className="dt-td dt-td--actions">
                    <button className="icon-btn" title="Edit" onClick={() => showToast(`Edit ${p.id}`)}>✏️</button>
                    {p.status === "draft" && (
                      <button className="icon-btn" title="Publish" onClick={() => showToast(`Published ${p.id}`)}>📤</button>
                    )}
                    {p.status !== "published" && (
                      <button className="icon-btn icon-btn--danger" title="Delete" onClick={() => showToast(`Deleted ${p.id}`)}>🗑</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ USERS TAB ══ */}
        {tab === "users" && (
          <div className="panel">
            <div className="panel-topbar">
              <h2 className="panel-heading">User Management</h2>
              <input
                className="search-input"
                placeholder="Search username or email…"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
              />
            </div>

            <div className="data-table">
              <div className="dt-head">
                <div className="dt-th dt-th--user">User</div>
                <div className="dt-th dt-th--email">Email</div>
                <div className="dt-th dt-th--role">Role</div>
                <div className="dt-th dt-th--ustatus">Status</div>
                <div className="dt-th dt-th--joined">Joined</div>
                <div className="dt-th dt-th--plays">Plays</div>
                <div className="dt-th dt-th--actions">Actions</div>
              </div>

              {filteredUsers.map((u, i) => (
                <div key={u.id} className="dt-row" style={{ "--delay": `${i * 40}ms` } as React.CSSProperties}>
                  <div className="dt-td dt-td--user">
                    <div className="u-avatar">{u.username[0]}</div>
                    <span className="u-name">{u.username}</span>
                  </div>
                  <div className="dt-td dt-td--email"><span className="dimmed">{u.email}</span></div>
                  <div className="dt-td dt-td--role">
                    <span className={`role-chip ${u.role === "admin" ? "role-chip--admin" : ""}`}>{u.role}</span>
                  </div>
                  <div className="dt-td dt-td--ustatus">
                    <span className={`status-chip ${STATUS_STYLES[u.status]}`}>{u.status}</span>
                  </div>
                  <div className="dt-td dt-td--joined dimmed">{u.joined}</div>
                  <div className="dt-td dt-td--plays">{u.plays}</div>
                  <div className="dt-td dt-td--actions">
                    <button className="icon-btn" title="View profile" onClick={() => showToast(`Viewing ${u.username}`)}>👁</button>
                    {u.status === "active" ? (
                      <button className="icon-btn icon-btn--danger" title="Ban user" onClick={() => showToast(`Banned ${u.username}`)}>🚫</button>
                    ) : (
                      <button className="icon-btn" title="Unban user" onClick={() => showToast(`Unbanned ${u.username}`)}>✅</button>
                    )}
                    {u.role !== "admin" && (
                      <button className="icon-btn" title="Make admin" onClick={() => showToast(`Promoted ${u.username}`)}>⬆</button>
                    )}
                  </div>
                </div>
              ))}

              {filteredUsers.length === 0 && (
                <div className="dt-empty">No users match your search.</div>
              )}
            </div>
          </div>
        )}

        {/* ══ STATS TAB ══ */}
        {tab === "stats" && (
          <div className="panel">
            <h2 className="panel-heading">Platform Stats</h2>

            <div className="stats-grid">
              {[
                { label: "Puzzle #42 plays", value: "2,841", sub: "+14% vs yesterday" },
                { label: "Avg session length", value: "8.4 min", sub: "across all games" },
                { label: "Daily active users", value: "1,203", sub: "past 7-day avg: 1,087" },
                { label: "Completion rate", value: "78%", sub: "all 3 puzzles today" },
                { label: "Duel matches today", value: "312", sub: "hot-seat + online" },
                { label: "New signups today", value: "94", sub: "↑ from 71 yesterday" },
              ].map((s) => (
                <div key={s.label} className="stat-card">
                  <div className="stat-card-val">{s.value}</div>
                  <div className="stat-card-label">{s.label}</div>
                  <div className="stat-card-sub">{s.sub}</div>
                </div>
              ))}
            </div>

            <p className="stats-note">
              📌 Full analytics dashboard is wired to the <code>/api/admin/stats</code> endpoint (Sebas's cron data).
            </p>
          </div>
        )}
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      <style>{`
        .admin-root {
          min-height: 100vh;
          background: #080d0a;
          color: #e8f5e9;
          font-family: 'DM Sans', 'Segoe UI', sans-serif;
          padding: 0 0 80px;
        }
        .admin-content {
          max-width: 1100px;
          margin: 0 auto;
          padding: 28px 20px;
          opacity: 0;
          transform: translateY(12px);
          transition: opacity 0.4s ease, transform 0.4s ease;
        }
        .admin-content--in { opacity: 1; transform: none; }

        /* ── Header ── */
        .admin-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .admin-title-group { display: flex; flex-direction: column; gap: 8px; }
        .back-link { color: #66bb6a; text-decoration: none; font-size: 0.82rem; font-weight: 600; transition: color 0.15s; }
        .back-link:hover { color: #00e676; }
        .admin-title {
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #e8f5e9;
        }
        .admin-badge {
          font-size: 0.62rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          background: rgba(239,83,80,0.15);
          border: 1px solid rgba(239,83,80,0.4);
          color: #ef9a9a;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: 800;
        }
        .admin-header-meta { display: flex; align-items: center; }
        .admin-user { font-size: 0.82rem; color: #66bb6a; }
        .admin-user strong { color: #00e676; }

        /* ── KPI strip ── */
        .kpi-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .kpi-item {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          padding: 18px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .kpi-icon { font-size: 1.3rem; }
        .kpi-val { font-size: 1.5rem; font-weight: 800; color: #00e676; letter-spacing: -0.03em; }
        .kpi-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; color: #546e7a; }

        /* ── Tabs ── */
        .admin-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
        .admin-tab {
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
        .admin-tab--active {
          background: rgba(0,230,118,0.1);
          border-color: rgba(0,230,118,0.35);
          color: #00e676;
        }

        /* ── Panel ── */
        .panel {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 18px;
          padding: 24px;
        }
        .panel-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .panel-heading {
          font-size: 1.05rem;
          font-weight: 700;
          color: #c8e6c9;
          margin: 0;
        }
        .action-btn {
          padding: 8px 18px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.16s;
        }
        .action-btn--primary {
          background: rgba(0,230,118,0.12);
          border: 1px solid rgba(0,230,118,0.35);
          color: #00e676;
        }
        .action-btn--primary:hover { background: rgba(0,230,118,0.22); }
        .search-input {
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #c8e6c9;
          font-size: 0.85rem;
          outline: none;
          min-width: 240px;
          transition: border-color 0.16s;
        }
        .search-input:focus { border-color: rgba(0,230,118,0.4); }
        .search-input::placeholder { color: #546e7a; }

        /* ── Data table ── */
        .data-table { overflow-x: auto; }
        .dt-head {
          display: flex;
          padding: 10px 16px;
          border-radius: 8px;
          background: rgba(255,255,255,0.03);
          margin-bottom: 4px;
        }
        .dt-th {
          font-size: 0.66rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #546e7a;
          font-weight: 700;
        }
        .dt-row {
          display: flex;
          align-items: center;
          padding: 11px 16px;
          border-radius: 10px;
          border: 1px solid transparent;
          transition: background 0.14s, border-color 0.14s;
          animation: row-in 0.3s ease both;
          animation-delay: var(--delay);
        }
        @keyframes row-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: none; }
        }
        .dt-row:hover {
          background: rgba(255,255,255,0.03);
          border-color: rgba(255,255,255,0.06);
        }
        .dt-td { font-size: 0.84rem; color: #c8e6c9; }
        .dt-td code { font-size: 0.75rem; color: #66bb6a; background: rgba(0,230,118,0.06); padding: 2px 6px; border-radius: 4px; }
        .dimmed { color: #546e7a !important; }
        .dt-empty { padding: 32px; text-align: center; color: #546e7a; font-size: 0.875rem; }

        /* Column widths — Puzzles */
        .dt-th--id, .dt-td--id { width: 72px; }
        .dt-th--date, .dt-td--date { width: 110px; }
        .dt-th--type, .dt-td--type { width: 130px; }
        .dt-th--status, .dt-td--status, .dt-th--ustatus, .dt-td--ustatus { width: 100px; }
        .dt-th--plays, .dt-td--plays { width: 80px; text-align: right; }
        .dt-th--score, .dt-td--score { width: 90px; text-align: right; }
        .dt-th--actions, .dt-td--actions { flex: 1; display: flex; gap: 6px; justify-content: flex-end; }

        /* Column widths — Users */
        .dt-th--user, .dt-td--user { width: 160px; display: flex; align-items: center; gap: 8px; }
        .dt-th--email, .dt-td--email { flex: 1; }
        .dt-th--role, .dt-td--role { width: 80px; }
        .dt-th--joined, .dt-td--joined { width: 90px; }

        /* Chips */
        .type-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #a5d6a7;
          background: rgba(255,255,255,0.05);
          padding: 3px 8px;
          border-radius: 6px;
        }
        .status-chip {
          display: inline-block;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid;
        }
        .status--green { background: rgba(0,230,118,0.1); border-color: rgba(0,230,118,0.3); color: #00e676; }
        .status--blue  { background: rgba(41,182,246,0.1); border-color: rgba(41,182,246,0.3); color: #29b6f6; }
        .status--gray  { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); color: #78909c; }
        .status--red   { background: rgba(239,83,80,0.1); border-color: rgba(239,83,80,0.3); color: #ef5350; }

        .role-chip {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #78909c;
          text-transform: capitalize;
        }
        .role-chip--admin { background: rgba(239,83,80,0.08); border-color: rgba(239,83,80,0.25); color: #ef9a9a; }

        .u-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1b5e20, #2e7d32);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 800;
          color: #a5d6a7;
          flex-shrink: 0;
        }
        .u-name { font-weight: 600; }

        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          padding: 4px 6px;
          border-radius: 6px;
          transition: background 0.14s;
        }
        .icon-btn:hover { background: rgba(255,255,255,0.08); }
        .icon-btn--danger:hover { background: rgba(239,83,80,0.12); }

        /* ── Stats grid ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin: 20px 0;
        }
        .stat-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          padding: 18px;
        }
        .stat-card-val { font-size: 1.5rem; font-weight: 800; color: #00e676; letter-spacing: -0.03em; }
        .stat-card-label { font-size: 0.78rem; font-weight: 600; color: #c8e6c9; margin: 4px 0 2px; }
        .stat-card-sub { font-size: 0.72rem; color: #546e7a; }
        .stats-note { font-size: 0.8rem; color: #546e7a; margin-top: 8px; }
        .stats-note code { color: #66bb6a; }

        /* ── Toast ── */
        .toast {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #1b5e20;
          border: 1px solid rgba(0,230,118,0.3);
          color: #00e676;
          padding: 12px 22px;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          animation: toast-in 0.25s ease;
          z-index: 999;
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: none; }
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .kpi-strip { grid-template-columns: repeat(2, 1fr); }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .kpi-strip { grid-template-columns: 1fr 1fr; }
          .stats-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
