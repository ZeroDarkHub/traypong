/**
 * src/hooks/useGameLoop.js
 * Core game loop and state management for TrayPong.
 * Encapsulates all game logic, keeping GameCanvas purely presentational.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import {
  CANVAS_W, CANVAS_H,
  PADDLE_W, PADDLE_H, BALL_RADIUS,
  PADDLE_Y_PLAYER, PADDLE_Y_AI,
  createBall, computePaddleBounce, reflectWall,
  ballHitsPaddle, moveAI, updateTrail, clamp, lerp,
} from '../utils/physics';
import { sound } from '../utils/sound';

// ─── Game states ──────────────────────────────────────────────────────────────
export const GAME_STATE = {
  IDLE: 'idle',       // waiting to start
  PLAYING: 'playing',
  PAUSED: 'paused',
  SCORED: 'scored',   // brief pause after scoring
  GAME_OVER: 'gameover',
};

const WINNING_SCORE = 7;
const SCORE_PAUSE_MS = 800; // ms pause after each point
const SHAKE_DURATION = 12; // frames

// ─── Initial state factory ────────────────────────────────────────────────────
function makeInitialState() {
  return {
    gameState: GAME_STATE.IDLE,
    playerScore: 0,
    aiScore: 0,
    playerX: CANVAS_W / 2 - PADDLE_W / 2,
    aiX: CANVAS_W / 2 - PADDLE_W / 2,
    ball: createBall(),
    shake: 0,        // remaining frames of screen shake
    rallyCount: 0,   // consecutive paddle hits this rally
    difficulty: 0,   // 0..1, increases with score
    winner: null,    // 'player' | 'ai'
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGameLoop(canvasRef) {
  const stateRef = useRef(makeInitialState());
  const [renderState, setRenderState] = useState(stateRef.current);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const mouseXRef = useRef(CANVAS_W / 2);
  const scorePauseRef = useRef(null);
  const pausedRef = useRef(false);

  // ─── Render sync ────────────────────────────────────────────────────────────
  const syncRender = useCallback(() => {
    setRenderState({ ...stateRef.current });
  }, []);

  // ─── Game loop tick ──────────────────────────────────────────────────────────
  const tick = useCallback((timestamp) => {
    if (pausedRef.current) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const s = stateRef.current;
    if (s.gameState !== GAME_STATE.PLAYING && s.gameState !== GAME_STATE.SCORED) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // Delta time (capped at 2 frames to avoid spiral of death)
    if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
    const rawDt = (timestamp - lastTimeRef.current) / 16.67; // normalized to 60fps
    const dt = Math.min(rawDt, 2);
    lastTimeRef.current = timestamp;

    let { ball, playerX, aiX, playerScore, aiScore, shake, rallyCount, difficulty, gameState } = s;

    // If in SCORED state, just wait for timeout to reset
    if (gameState === GAME_STATE.SCORED) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    // ── Player paddle follows mouse (smooth lerp) ──────────────────────────
    const targetPlayerX = clamp(mouseXRef.current - PADDLE_W / 2, 0, CANVAS_W - PADDLE_W);
    playerX = lerp(playerX, targetPlayerX, 0.25);

    // ── AI movement ────────────────────────────────────────────────────────
    aiX = moveAI(aiX, ball.x, difficulty, dt);

    // ── Ball movement ───────────────────────────────────────────────────────
    const ballObj = { ...ball };
    let { x, y, vx, vy, speed, trail } = ballObj;

    // Debug: Check if speed is already NaN
    if (isNaN(speed)) {
      console.error('Ball speed is NaN at start of tick!', ball);
    }

    trail = updateTrail(trail, x, y);
    x += vx * dt;
    y += vy * dt;

    // Wall bounces (left/right)
    if (x - BALL_RADIUS <= 0) {
      x = BALL_RADIUS;
      vx = Math.abs(vx);
      sound.wallHit();
    } else if (x + BALL_RADIUS >= CANVAS_W) {
      x = CANVAS_W - BALL_RADIUS;
      vx = -Math.abs(vx);
      sound.wallHit();
    }

    // ── Player paddle collision ────────────────────────────────────────────
    const playerPaddleHit = ballHitsPaddle({ x, y }, playerX, PADDLE_Y_PLAYER);
    if (playerPaddleHit && vy > 0) {
      console.log('Player paddle hit!', { x, y, vx, vy, playerX, ballSpeed: ball.speed });
      console.log('Ball object before bounce:', ball);
      y = PADDLE_Y_PLAYER - BALL_RADIUS;
      const bounce = computePaddleBounce({ x, y }, playerX, 1);
      console.log('Bounce result:', bounce);
      if (isNaN(bounce.vx) || isNaN(bounce.vy) || isNaN(bounce.speed)) {
        console.error('NaN detected in bounce! Inputs:', { x, y, playerX, ball });
      }
      vx = bounce.vx;
      vy = bounce.vy;
      speed = bounce.speed;
      rallyCount++;
      shake = SHAKE_DURATION;
      sound.paddleHit(rallyCount);
      difficulty = Math.min(1, difficulty + 0.015);
    }

    // ── AI paddle collision ─────────────────────────────────────────────────
    const aiPaddleHit = ballHitsPaddle({ x, y }, aiX, PADDLE_Y_AI);
    if (aiPaddleHit && vy < 0) {
      y = PADDLE_Y_AI + PADDLE_H + BALL_RADIUS;
      const bounce = computePaddleBounce({ x, y }, aiX, -1);
      vx = bounce.vx;
      vy = bounce.vy;
      speed = bounce.speed;
      rallyCount++;
      shake = SHAKE_DURATION;
      sound.paddleHit(rallyCount);
      difficulty = Math.min(1, difficulty + 0.01);
    }

    // Decay shake
    if (shake > 0) shake--;

    ball = { x, y, vx, vy, speed, trail };

    // ── Scoring ─────────────────────────────────────────────────────────────
    let scored = false;

    if (y + BALL_RADIUS > CANVAS_H) {
      // AI scores
      aiScore++;
      sound.aiScore();
      scored = true;
      rallyCount = 0;

      if (aiScore >= WINNING_SCORE) {
        stateRef.current = { ...s, ball, playerX, aiX, aiScore, playerScore, rallyCount, difficulty, shake, gameState: GAME_STATE.GAME_OVER, winner: 'ai' };
        sound.gameOver();
        syncRender();
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
    }

    if (y - BALL_RADIUS < 0) {
      // Player scores
      playerScore++;
      sound.playerScore();
      scored = true;
      rallyCount = 0;

      if (playerScore >= WINNING_SCORE) {
        stateRef.current = { ...s, ball, playerX, aiX, aiScore, playerScore, rallyCount, difficulty, shake, gameState: GAME_STATE.GAME_OVER, winner: 'player' };
        sound.newHighScore();
        syncRender();
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
    }

    if (scored) {
      gameState = GAME_STATE.SCORED;
      stateRef.current = { ...s, ball, playerX, aiX, aiScore, playerScore, rallyCount, difficulty, shake, gameState };
      syncRender();

      // Reset ball after pause
      clearTimeout(scorePauseRef.current);
      scorePauseRef.current = setTimeout(() => {
        const fresh = createBall();
        stateRef.current = { ...stateRef.current, ball: fresh, gameState: GAME_STATE.PLAYING };
        sound.serve();
        lastTimeRef.current = null;
        syncRender();
      }, SCORE_PAUSE_MS);
    } else {
      ball = { x, y, vx, vy, speed, trail };
      stateRef.current = { ...s, ball, playerX, aiX, aiScore, playerScore, rallyCount, difficulty, shake, gameState };
      syncRender();
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [syncRender]);

  // ─── Loop management ─────────────────────────────────────────────────────────
  const startLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastTimeRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    clearTimeout(scorePauseRef.current);
  }, []);

  // ─── Public actions ──────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    sound.unlock();
    sound.serve();
    stateRef.current = {
      ...makeInitialState(),
      gameState: GAME_STATE.PLAYING,
    };
    syncRender();
    startLoop();
  }, [startLoop, syncRender]);

  const pauseGame = useCallback(() => {
    pausedRef.current = true;
    if (stateRef.current.gameState === GAME_STATE.PLAYING) {
      stateRef.current = { ...stateRef.current, gameState: GAME_STATE.PAUSED };
      syncRender();
    }
  }, [syncRender]);

  const resumeGame = useCallback(() => {
    if (stateRef.current.gameState === GAME_STATE.PAUSED) {
      stateRef.current = { ...stateRef.current, gameState: GAME_STATE.PLAYING };
      lastTimeRef.current = null;
      syncRender();
    }
    pausedRef.current = false;
  }, [syncRender]);

  const updateMouseX = useCallback((x) => {
    mouseXRef.current = x;
  }, []);

  // ─── Window visibility integration ───────────────────────────────────────────
  useEffect(() => {
    const isElectron = window.electronAPI?.isElectron;
    let cleanupHidden, cleanupShown;

    if (isElectron) {
      cleanupHidden = window.electronAPI.onWindowHidden(() => pauseGame());
      cleanupShown = window.electronAPI.onWindowShown(() => resumeGame());
    } else {
      // Browser fallback
      const onVisibilityChange = () => {
        if (document.hidden) pauseGame();
        else resumeGame();
      };
      document.addEventListener('visibilitychange', onVisibilityChange);
      return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      cleanupHidden?.();
      cleanupShown?.();
    };
  }, [pauseGame, resumeGame]);

  // ─── Start loop on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    startLoop();
    return () => stopLoop();
  }, [startLoop, stopLoop]);

  return {
    renderState,
    startGame,
    pauseGame,
    resumeGame,
    updateMouseX,
  };
}
