import { useState, useRef } from "react";

interface ShareCardProps {
  username: string;
  puzzleNum: number;
  gridScore: number;
  connectionsScore: number;
  wordleGuesses: number;
}

function buildEmojiGrid(score: number): string {
  const total = 9;
  const filled = score;
  let row = "";
  for (let i = 0; i < total; i++) {
    row += i < filled ? "🟩" : "⬜";
    if ((i + 1) % 3 === 0 && i < total - 1) row += "\n";
  }
  return row;
}

function buildConnectionsEmoji(score: number): string {
  const colors = ["🟨", "🟩", "🟦", "🟪"];
  return colors.slice(0, score).join(" ") + (score < 4 ? " " + Array(4 - score).fill("⬜").join(" ") : "");
}

function buildWordleEmoji(guesses: number): string {
  const emojis = [];
  for (let i = 0; i < guesses; i++) {
    if (i < guesses - 1) emojis.push("⬛⬛⬛⬛⬛");
    else emojis.push("🟩🟩🟩🟩🟩");
  }
  return emojis.join("\n");
}

export default function ShareCard({
  username,
  puzzleNum,
  gridScore,
  connectionsScore,
  wordleGuesses,
}: ShareCardProps) {
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const shareText = [
    `⚽ Jogo Bonito Daily #${puzzleNum} — ${today}`,
    `@${username}`,
    ``,
    `Football Grid: ${gridScore}/9`,
    buildEmojiGrid(gridScore),
    ``,
    `Connections: ${connectionsScore}/4`,
    buildConnectionsEmoji(connectionsScore),
    ``,
    `Footballe: ${wordleGuesses}/6`,
    buildWordleEmoji(wordleGuesses),
    ``,
    `🔗 jogobonito.daily`,
  ].join("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({ text: shareText, title: "Jogo Bonito Daily" });
    } else {
      handleCopy();
    }
  };

  const totalScore = gridScore + connectionsScore * 10 + Math.max(0, 7 - wordleGuesses) * 5;

  return (
    <div className="sc-wrapper">
      {/* ── Visual card (shareable look) ── */}
      <div className="sc-card" ref={cardRef}>
        {/* Header */}
        <div className="sc-header">
          <span className="sc-ball">⚽</span>
          <div>
            <div className="sc-title">Jogo Bonito Daily</div>
            <div className="sc-subtitle">Puzzle #{puzzleNum} · {today}</div>
          </div>
          <div className="sc-user">@{username}</div>
        </div>

        {/* Score summary */}
        <div className="sc-score-ring">
          <div className="sc-ring-inner">
            <span className="sc-total">{totalScore}</span>
            <span className="sc-total-label">pts</span>
          </div>
        </div>

        {/* Individual scores */}
        <div className="sc-scores">
          <div className="sc-score-item" style={{ "--c": "#00e676" } as React.CSSProperties}>
            <div className="sc-score-icon">⊞</div>
            <div className="sc-score-val">{gridScore}/9</div>
            <div className="sc-score-name">Grid</div>
            <div className="sc-score-bar">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`sc-bar-cell ${i < gridScore ? "sc-bar-cell--on" : ""}`} />
              ))}
            </div>
          </div>

          <div className="sc-score-item" style={{ "--c": "#29b6f6" } as React.CSSProperties}>
            <div className="sc-score-icon">◈</div>
            <div className="sc-score-val">{connectionsScore}/4</div>
            <div className="sc-score-name">Connections</div>
            <div className="sc-score-bar">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`sc-bar-cell ${i < connectionsScore ? "sc-bar-cell--on" : ""}`} />
              ))}
            </div>
          </div>

          <div className="sc-score-item" style={{ "--c": "#ffd740" } as React.CSSProperties}>
            <div className="sc-score-icon">⬛</div>
            <div className="sc-score-val">{wordleGuesses}/6</div>
            <div className="sc-score-name">Footballe</div>
            <div className="sc-score-bar">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className={`sc-bar-cell ${i < wordleGuesses ? "sc-bar-cell--on" : ""}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer branding */}
        <div className="sc-footer">
          jogobonito.daily
        </div>

        {/* Decorative lines */}
        <div className="sc-deco sc-deco-tl" />
        <div className="sc-deco sc-deco-br" />
      </div>

      {/* ── Action buttons ── */}
      <div className="sc-actions">
        <button className="sc-btn sc-btn--copy" onClick={handleCopy}>
          {copied ? "✓ Copied!" : "📋 Copy Text"}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button className="sc-btn sc-btn--share" onClick={handleNativeShare}>
            📤 Share
          </button>
        )}
      </div>

      <style>{`
        .sc-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        /* ── Card ── */
        .sc-card {
          position: relative;
          width: 340px;
          background: linear-gradient(160deg, #0d1f14 0%, #0a1510 100%);
          border: 1px solid rgba(0,230,118,0.25);
          border-radius: 20px;
          padding: 24px 22px 20px;
          overflow: hidden;
          box-shadow: 0 0 40px rgba(0,230,118,0.08), inset 0 1px 0 rgba(255,255,255,0.06);
        }

        /* Decorative corner accents */
        .sc-deco {
          position: absolute;
          width: 40px;
          height: 40px;
          border-color: rgba(0,230,118,0.3);
          border-style: solid;
        }
        .sc-deco-tl { top: 10px; left: 10px; border-width: 2px 0 0 2px; border-radius: 4px 0 0 0; }
        .sc-deco-br { bottom: 10px; right: 10px; border-width: 0 2px 2px 0; border-radius: 0 0 4px 0; }

        /* Header */
        .sc-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }
        .sc-ball { font-size: 1.6rem; filter: drop-shadow(0 0 8px rgba(0,230,118,0.5)); }
        .sc-title { font-size: 0.92rem; font-weight: 800; color: #00e676; font-family: 'DM Sans', sans-serif; }
        .sc-subtitle { font-size: 0.72rem; color: #66bb6a; }
        .sc-user { margin-left: auto; font-size: 0.78rem; font-weight: 700; color: #a5d6a7; background: rgba(255,255,255,0.05); border-radius: 6px; padding: 3px 8px; }

        /* Ring */
        .sc-score-ring {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }
        .sc-ring-inner {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 3px solid #00e676;
          box-shadow: 0 0 20px rgba(0,230,118,0.35), inset 0 0 20px rgba(0,230,118,0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .sc-total { font-size: 1.8rem; font-weight: 900; color: #00e676; line-height: 1; letter-spacing: -0.04em; }
        .sc-total-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: #66bb6a; }

        /* Scores */
        .sc-scores { display: flex; gap: 12px; margin-bottom: 16px; }
        .sc-score-item {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          padding: 12px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
        }
        .sc-score-icon { font-size: 1.1rem; color: var(--c, #00e676); }
        .sc-score-val { font-size: 1.1rem; font-weight: 800; color: var(--c, #00e676); letter-spacing: -0.03em; }
        .sc-score-name { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.1em; color: #66bb6a; }
        .sc-score-bar { display: flex; gap: 2px; margin-top: 6px; }
        .sc-bar-cell {
          width: 8px;
          height: 6px;
          border-radius: 2px;
          background: rgba(255,255,255,0.08);
          transition: background 0.2s;
        }
        .sc-bar-cell--on { background: var(--c, #00e676); }

        /* Footer */
        .sc-footer {
          text-align: center;
          font-size: 0.7rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(102,187,106,0.5);
        }

        /* ── Buttons ── */
        .sc-actions { display: flex; gap: 10px; }
        .sc-btn {
          padding: 10px 22px;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.18s;
        }
        .sc-btn--copy {
          background: rgba(0,230,118,0.1);
          border: 1px solid rgba(0,230,118,0.35);
          color: #00e676;
        }
        .sc-btn--copy:hover { background: rgba(0,230,118,0.2); }
        .sc-btn--share {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: #c8e6c9;
        }
        .sc-btn--share:hover { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
