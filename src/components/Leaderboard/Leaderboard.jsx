/**
 * src/components/Leaderboard/Leaderboard.jsx
 * Displays top 10 scores with rank and optional highlight of latest entry.
 */

import React, { useState } from 'react';
import { loadLeaderboard, clearLeaderboard } from '../../utils/storage';
import './Leaderboard.css';

export default function Leaderboard({ highlightRank, highlightScore, onClose }) {
  const [board, setBoard] = useState(() => loadLeaderboard());
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClear = () => {
    if (confirmClear) {
      clearLeaderboard();
      setBoard([]);
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 2500);
    }
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="leaderboard">
      {/* Header */}
      <div className="lb-header">
        <span className="lb-title">LEADERBOARD</span>
        <button className="lb-close" onClick={onClose} title="Back to game">
          ✕
        </button>
      </div>

      {/* Entries */}
      <div className="lb-list">
        {board.length === 0 ? (
          <div className="lb-empty">
            <div className="lb-empty-icon">🏓</div>
            <div className="lb-empty-text">No scores yet.</div>
            <div className="lb-empty-sub">Play a game to get on the board!</div>
          </div>
        ) : (
          board.map((entry, i) => {
            const rank = i + 1;
            const isHighlighted = rank === highlightRank && entry.score === highlightScore;
            return (
              <div
                key={`${entry.name}-${entry.score}-${i}`}
                className={`lb-entry ${isHighlighted ? 'lb-entry--highlight' : ''}`}
              >
                <span className="lb-rank">
                  {rank <= 3 ? medals[rank - 1] : `#${rank}`}
                </span>
                <span className="lb-name">{entry.name}</span>
                <span className="lb-date">{new Date(entry.date).toLocaleDateString()}</span>
                <span className="lb-rounds">{entry.roundsWon || 0} rounds</span>
                <span className="lb-score">{entry.score}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {board.length > 0 && (
        <div className="lb-footer">
          <button className="lb-clear-btn" onClick={handleClear}>
            {confirmClear ? 'Confirm clear?' : 'Clear scores'}
          </button>
        </div>
      )}
    </div>
  );
}
