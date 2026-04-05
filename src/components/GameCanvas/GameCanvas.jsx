/**
 * src/components/GameCanvas/GameCanvas.jsx
 * Canvas rendering component for TrayPong.
 * Purely presentational — receives game state from useGameLoop hook.
 * Uses requestAnimationFrame-driven Canvas 2D rendering.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  CANVAS_W, CANVAS_H,
  PADDLE_W, PADDLE_H, BALL_RADIUS,
  PADDLE_Y_PLAYER, PADDLE_Y_AI,
} from '../../utils/physics';
import { useGameLoop, GAME_STATE } from '../../hooks/useGameLoop';
import './GameCanvas.css';

// ─── Color palette ────────────────────────────────────────────────────────────
const COLORS = {
  bg: '#0d0d0f',
  bgAlt: '#111114',
  court: '#1a1a1f',
  net: '#2a2a35',
  playerPaddle: '#e8e8f0',
  aiPaddle: '#e84040',
  ball: '#f0f0ff',
  trailStart: 'rgba(232, 200, 255, 0.6)',
  trailEnd: 'rgba(232, 200, 255, 0)',
  scoreText: '#e8e8f0',
  dimText: '#555560',
  accent: '#9966ff',
  accentGlow: 'rgba(153, 102, 255, 0.4)',
  combo: '#c299ff',
  multiplier: '#7ec8a4',
  playerGlow: 'rgba(232, 232, 255, 0.35)',
  aiGlow: 'rgba(232, 64, 64, 0.35)',
};

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPaddle(ctx, x, y, isPlayer) {
  const glow = isPlayer ? COLORS.playerGlow : COLORS.aiGlow;
  const color = isPlayer ? COLORS.playerPaddle : COLORS.aiPaddle;

  // Glow halo
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  drawRoundRect(ctx, x, y, PADDLE_W, PADDLE_H, PADDLE_H / 2);
  ctx.fill();
  ctx.restore();

  // Paddle body
  ctx.fillStyle = color;
  drawRoundRect(ctx, x, y, PADDLE_W, PADDLE_H, PADDLE_H / 2);
  ctx.fill();
}

function drawBall(ctx, ball) {
  // Trail
  const { trail, x, y } = ball;
  for (let i = 0; i < trail.length; i++) {
    const alpha = (i / trail.length) * 0.5;
    const r = BALL_RADIUS * 0.5 + (i / trail.length) * BALL_RADIUS * 0.5;
    ctx.beginPath();
    ctx.arc(trail[i].x, trail[i].y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200, 170, 255, ${alpha})`;
    ctx.fill();
  }

  // Glow
  ctx.save();
  ctx.shadowColor = COLORS.accentGlow;
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.ball;
  ctx.fill();
  ctx.restore();

  // Core
  ctx.beginPath();
  ctx.arc(x, y, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.ball;
  ctx.fill();
}

function drawNet(ctx) {
  const segH = 8;
  const segGap = 5;
  const totalSegs = Math.floor(CANVAS_H / (segH + segGap));
  const netY = CANVAS_H / 2;
  ctx.strokeStyle = COLORS.net;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([segH, segGap]);
  ctx.beginPath();
  ctx.moveTo(CANVAS_W / 2, 0);
  ctx.lineTo(CANVAS_W / 2, CANVAS_H);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawOverlay(ctx, text, subtext) {
  ctx.fillStyle = 'rgba(13, 13, 15, 0.78)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.scoreText;
  ctx.font = 'bold 16px "SF Pro Display", "Helvetica Neue", sans-serif';
  ctx.fillText(text, CANVAS_W / 2, CANVAS_H / 2 - 12);

  if (subtext) {
    ctx.fillStyle = COLORS.dimText;
    ctx.font = '12px "SF Pro Display", "Helvetica Neue", sans-serif';
    ctx.fillText(subtext, CANVAS_W / 2, CANVAS_H / 2 + 14);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GameCanvas({ onGameOver }) {
  const canvasRef = useRef(null);
  const { renderState, startGame, updateMouseX, handleKeyDown, handleKeyUp, pauseGame, resumeGame, updatePlayerName, submitHighScore } = useGameLoop(canvasRef);

  // ─── Draw to canvas whenever renderState changes ─────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const { gameState, ball, playerX, aiX, shake } = renderState;

    // ── Apply screen shake ──────────────────────────────────────────────────
    ctx.save();
    if (shake > 0) {
      const intensity = (shake / 12) * 2.5;
      ctx.translate(
        (Math.random() - 0.5) * intensity,
        (Math.random() - 0.5) * intensity
      );
    }

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Subtle court gradient
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#14141a');
    grad.addColorStop(1, '#0d0d0f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ── Net ─────────────────────────────────────────────────────────────────
    drawNet(ctx);

    // ── Paddles ─────────────────────────────────────────────────────────────
    drawPaddle(ctx, playerX, PADDLE_Y_PLAYER, true);
    drawPaddle(ctx, aiX, PADDLE_Y_AI, false);

    // ── Ball ────────────────────────────────────────────────────────────────
    if (gameState !== GAME_STATE.IDLE && gameState !== GAME_STATE.SCORED) {
      drawBall(ctx, ball);
    }

    // ── Overlays ────────────────────────────────────────────────────────────
    if (gameState === GAME_STATE.IDLE) {
      const isTouchDevice = 'ontouchstart' in window;
      drawOverlay(ctx, 'TRAY PONG', isTouchDevice ? 'Tap to play' : 'Click to play');
    } else if (gameState === GAME_STATE.PAUSED) {
      drawOverlay(ctx, 'PAUSED', 'Click to resume');
    } else if (gameState === GAME_STATE.SCORED) {
      const { aiScore, playerScore } = renderState;
      const msg = playerScore > aiScore ? 'YOU SCORE!' : 'AI SCORES!';
      drawOverlay(ctx, msg, 'Get ready...');
    } else if (gameState === GAME_STATE.GAME_OVER) {
      const { winner, finalScore, highScores, roundsWon, isEnteringName, playerName } = renderState;
      if (winner === 'ai') {
        if (isEnteringName) {
          // Show name input screen
          drawOverlay(ctx, `GAME OVER - ${finalScore} pts (${roundsWon} rounds)`, 'Enter your name:');
        } else {
          // Show final score and high scores
          const highScoreText = highScores.length > 0 
            ? `Best: ${highScores[0].score} pts by ${highScores[0].playerName}` 
            : 'No high scores yet';
          drawOverlay(ctx, `Score saved! ${finalScore} pts`, highScoreText);
        }
      } else {
        drawOverlay(ctx, '🏆 YOU WIN!', 'Click to play again');
      }
    }

    ctx.restore();
  }, [renderState]);

  // ─── Mouse tracking ────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    updateMouseX(e.clientX - rect.left);
  }, [updateMouseX]);

  // ─── Touch tracking ────────────────────────────────────────────────────────
  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    // Scale touch position to canvas coordinate space
    const scaleX = CANVAS_W / rect.width;
    updateMouseX((touch.clientX - rect.left) * scaleX);
  }, [updateMouseX]);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const scaleX = CANVAS_W / rect.width;
    updateMouseX((touch.clientX - rect.left) * scaleX);

    // Also trigger game start on tap
    const { gameState, isEnteringName } = renderState;
    if (isEnteringName) return;
    if (
      gameState === GAME_STATE.IDLE ||
      gameState === GAME_STATE.GAME_OVER ||
      gameState === GAME_STATE.PAUSED
    ) {
      startGame();
    }
  }, [updateMouseX, renderState, startGame]);

  // ─── Mouse enter/leave for pause/resume ───────────────────────────────────────
  const handleMouseEnter = useCallback(() => {
    resumeGame();
  }, [resumeGame]);

  const handleMouseLeave = useCallback(() => {
    pauseGame();
  }, [pauseGame]);

  // ─── Keyboard event listeners ───────────────────────────────────────────────
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // ─── Click to start / restart ──────────────────────────────────────────────
  const handleClick = useCallback(() => {
    const { gameState, isEnteringName } = renderState;
    // Don't start game if user is entering name
    if (isEnteringName) return;
    
    if (
      gameState === GAME_STATE.IDLE ||
      gameState === GAME_STATE.GAME_OVER ||
      gameState === GAME_STATE.PAUSED
    ) {
      startGame();
    }

    // Notify parent if game just ended
    if (gameState === GAME_STATE.GAME_OVER && onGameOver) {
      onGameOver(renderState.playerScore, renderState.winner);
    }
  }, [renderState, startGame, onGameOver]);

  // Trigger onGameOver when state becomes GAME_OVER
  useEffect(() => {
    if (renderState.gameState === GAME_STATE.GAME_OVER && onGameOver) {
      onGameOver(renderState.playerScore, renderState.winner);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderState.gameState]);

  return (
    <div className="game-canvas-wrapper">
      {/* Score bar */}
      <div className="score-bar">
        <div className="score ai-score">
          <span className="score-label">AI</span>
          <span className="score-value">{renderState.aiScore}</span>
        </div>
        <div className="score-divider">:</div>
        <div className="score player-score">
          <span className="score-value">{renderState.playerScore}</span>
          <span className="score-label">YOU</span>
        </div>
      </div>
      
      {/* Enhanced scoring display */}
      <div className="enhanced-score">
        <div className="combo-display">
          <span style={{ color: COLORS.combo, fontSize: '12px', fontWeight: 'bold' }}>
            COMBO x{renderState.comboCount || 0}
          </span>
        </div>
        <div className="multiplier-display">
          <span style={{ color: COLORS.multiplier, fontSize: '12px', fontWeight: 'bold' }}>
            {renderState.multiplier || 1}x
          </span>
        </div>
        <div className="total-score-display">
          <span style={{ color: COLORS.scoreText, fontSize: '14px', fontWeight: 'bold' }}>
            SCORE: {renderState.totalScore || 0}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="game-canvas"
      />

      {/* Rally indicator */}
      {renderState.gameState === GAME_STATE.PLAYING && renderState.rallyCount > 3 && (
        <div className="rally-badge">
          🔥 {renderState.rallyCount} rally
        </div>
      )}

      {/* Name input for high score */}
      {renderState.gameState === GAME_STATE.GAME_OVER && renderState.winner === 'ai' && renderState.isEnteringName && (
        <div style={{
          position: 'absolute',
          top: '65%',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(13, 13, 15, 0.9)',
          padding: '8px 12px',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <input
            type="text"
            value={renderState.playerName}
            onChange={(e) => updatePlayerName(e.target.value.slice(0, 10))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                submitHighScore();
              }
            }}
            maxLength={10}
            placeholder="Enter your name (10 chars max)..."
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f0f0ff',
              fontSize: '12px',
              fontFamily: '"SF Pro Display", "Helvetica Neue", sans-serif',
              textAlign: 'center',
              outline: 'none',
              width: '140px',
            }}
            autoFocus
          />
          <button
            onClick={submitHighScore}
            style={{
              background: '#9966ff',
              border: 'none',
              color: '#ffffff',
              fontSize: '11px',
              fontFamily: '"SF Pro Display", "Helvetica Neue", sans-serif',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '6px',
              width: '100%',
            }}
          >
            Save Score
          </button>
        </div>
      )}
    </div>
  );
}
