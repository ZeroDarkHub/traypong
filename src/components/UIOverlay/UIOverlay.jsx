/**
 * src/components/UIOverlay/UIOverlay.jsx
 * Top bar with controls: volume, leaderboard toggle, close button.
 * Also handles score submission modal after game over.
 */

import React, { useState, useEffect, useRef } from 'react';
import { saveScore, wouldQualify } from '../../utils/storage';
import { sound } from '../../utils/sound';
import './UIOverlay.css';

export default function UIOverlay({
  onShowLeaderboard,
  gameOver,
  playerScore,
  winner,
  onScoreSaved,
  onShowLanding,
}) {
  const [volume, setVolume] = useState(0.6);
  const [muted, setMuted] = useState(false);
  const [showScoreForm, setShowScoreForm] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem('traypong_name') || '');
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef(null);

  // Check if score qualifies for leaderboard after game over
  useEffect(() => {
    if (gameOver && winner === 'player' && wouldQualify(playerScore) && !submitted) {
      setShowScoreForm(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [gameOver, playerScore, winner, submitted]);

  // Reset form when new game starts
  useEffect(() => {
    if (!gameOver) {
      setShowScoreForm(false);
      setSubmitted(false);
    }
  }, [gameOver]);

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    sound.setVolume(v);
    if (muted && v > 0) setMuted(false);
  };

  const handleToggleMute = () => {
    const nowMuted = sound.toggleMute();
    setMuted(nowMuted);
  };

  const handleSubmitScore = (e) => {
    e.preventDefault();
    const playerName = name.trim() || 'Anonymous';
    localStorage.setItem('traypong_name', playerName);
    const { rank } = saveScore(playerName, playerScore);
    setSubmitted(true);
    setShowScoreForm(false);
    if (onScoreSaved) onScoreSaved(rank, playerScore);
    if (rank === 1) sound.newHighScore();
  };

  const handleClose = () => {
    if (window.electronAPI?.isElectron) {
      window.electronAPI.closeWindow();
    } else {
      window.close();
    }
  };

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="ui-overlay">
        <div className="ui-left">
          <span className="app-name">TRAY PONG</span>
        </div>

        <div className="ui-right">
          {/* Home/Landing - only show in browser, not Electron */}
          {!window.electronAPI?.isElectron && (
            <button
              className="icon-btn"
              onClick={onShowLanding}
              title="Home"
            >
              🏠
            </button>
          )}

          {/* Volume */}
          <div className="volume-control">
            <button
              className={`icon-btn ${muted ? 'muted' : ''}`}
              onClick={handleToggleMute}
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? '🔇' : '🔈'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
              title="Volume"
            />
          </div>

          {/* Leaderboard */}
          <button
            className="icon-btn"
            onClick={onShowLeaderboard}
            title="Leaderboard"
          >
            🏆
          </button>

          {/* Close */}
          <button
            className="icon-btn close-btn"
            onClick={handleClose}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Score submission modal ───────────────────────────────────────────── */}
      {showScoreForm && (
        <div className="score-modal-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="score-modal">
            <div className="score-modal-title">🏆 New High Score!</div>
            <div className="score-modal-score">{playerScore} pts</div>
            <form onSubmit={handleSubmitScore} className="score-form">
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={16}
                className="score-input"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="score-submit">
                Save →
              </button>
            </form>
            <button
              className="score-skip"
              onClick={() => setShowScoreForm(false)}
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </>
  );
}
