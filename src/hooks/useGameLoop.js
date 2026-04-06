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

const AI_WINNING_SCORE = 3; // AI only needs 3 points to win
const SCORE_PAUSE_MS = 800; // ms pause after each point
const SHAKE_DURATION = 12; // frames

// ─── High Score Management ─────────────────────────────────────────────────────
function saveHighScore(score, roundsWon, playerName = 'Anonymous') {
  try {
    // Use the same storage key as Leaderboard component
    const STORAGE_KEY = 'traypong_leaderboard';
    const currentHighScores = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    currentHighScores.push({
      name: playerName, // Leaderboard expects 'name' not 'playerName'
      score: score,
      roundsWon: roundsWon, // Add rounds won to data structure
      date: new Date().toISOString(),
    });
    // Keep top 10 scores (sorted by score descending)
    currentHighScores.sort((a, b) => b.score - a.score);
    const topScores = currentHighScores.slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(topScores));
    
    // Verify it was saved
    const verify = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    console.log('Saved and verified:', verify);
    
    return topScores;
  } catch (error) {
    console.error('Failed to save high score:', error);
    return [];
  }
}

function getHighScores() {
  try {
    return JSON.parse(localStorage.getItem('traypong_leaderboard') || '[]');
  } catch (error) {
    console.error('Failed to get high scores:', error);
    return [];
  }
}

// ─── Initial state factory ────────────────────────────────────────────────────
function makeInitialState() {
  return {
    gameState: GAME_STATE.IDLE,
    playerScore: 0,
    aiScore: 0,
    playerX: CANVAS_W / 2 - PADDLE_W / 2, // Center position
    aiX: CANVAS_W / 2 - PADDLE_W / 2,     // Center position
    ball: createBall(),
    shake: 0,        // remaining frames of screen shake
    rallyCount: 0,   // consecutive paddle hits this rally
    difficulty: 0,   // 0..1, increases with score
    winner: null,    // 'player' | 'ai'
    // Enhanced scoring system
    comboCount: 0,    // consecutive successful hits
    multiplier: 1,    // score multiplier based on combo
    totalScore: 0,    // endless scoring total
    lastHitPosition: null, // for edge hit bonuses
    highScores: getHighScores(), // Load existing high scores
    finalScore: 0,   // Final score when game ends
    roundsWon: 0,    // Number of rounds player won
    playerName: '',  // Player name for high score
    isEnteringName: false, // Whether player is entering name
  };
}

// ─── Enhanced Scoring System ────────────────────────────────────────────────
function calculateMultiplier(comboCount) {
  if (comboCount >= 20) return 5;
  if (comboCount >= 11) return 3;
  if (comboCount >= 6) return 2;
  return 1;
}

function calculateEdgeBonus(hitPosition, paddleX) {
  const hitPos = Math.abs(hitPosition - paddleX) / PADDLE_W; // 0..1
  const edgeDistance = Math.min(hitPos, 1 - hitPos); // distance from nearest edge
  
  if (edgeDistance > 0.8) return 50; // Edge hit bonus
  if (edgeDistance > 0.6) return 20; // Near edge bonus
  return 0; // No bonus
}

function updateScoring(state, hitPosition, paddleX) {
  const edgeBonus = calculateEdgeBonus(hitPosition, paddleX);
  const newComboCount = state.comboCount + 1;
  const newMultiplier = calculateMultiplier(newComboCount);
  
  // Base points + speed bonus + edge bonus
  const basePoints = 10;
  const speedBonus = Math.floor(state.difficulty * 20);
  const totalPoints = (basePoints + speedBonus + edgeBonus) * newMultiplier;
  
  return {
    ...state,
    comboCount: newComboCount,
    multiplier: newMultiplier,
    totalScore: state.totalScore + totalPoints,
    lastHitPosition: hitPosition,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGameLoop(canvasRef) {
  const stateRef = useRef(makeInitialState());
  const [renderState, setRenderState] = useState(stateRef.current);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);
  const mouseXRef = useRef(CANVAS_W / 2); // Start centered
  const scorePauseRef = useRef(null);
  const pausedRef = useRef(false);
  const keysRef = useRef({ left: false, right: false });

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

    // ── Player paddle follows mouse or keyboard ────────────────────────────────
    let targetPlayerX;
    
    if (keysRef.current.left || keysRef.current.right) {
      // Keyboard control - calculate target position
      const keyboardSpeed = 8; // pixels per frame
      if (keysRef.current.left) {
        targetPlayerX = Math.max(0, playerX - keyboardSpeed);
      } else {
        targetPlayerX = Math.min(CANVAS_W - PADDLE_W, playerX + keyboardSpeed);
      }
    } else {
      // Mouse control
      targetPlayerX = clamp(mouseXRef.current - PADDLE_W / 2, 0, CANVAS_W - PADDLE_W);
    }
    
    // Apply smooth lerp movement for both keyboard and mouse
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
      
      // Update enhanced scoring
      const scoringState = updateScoring(stateRef.current, x, playerX);
      s.comboCount = scoringState.comboCount;
      s.multiplier = scoringState.multiplier;
      s.totalScore = scoringState.totalScore;
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
      // AI scores - reset combo
      aiScore++;
      sound.aiScore();
      scored = true;
      rallyCount = 0;
      s.comboCount = 0; // Reset combo on miss
      s.multiplier = 1; // Reset multiplier

      if (aiScore >= AI_WINNING_SCORE) {
        // Trigger name entry when AI wins (don't save score yet)
        const finalScore = s.totalScore; // Use total points scored
        const roundsWon = playerScore; // Player's score represents rounds won
        
        stateRef.current = { 
          ...s, 
          ball, 
          playerX, 
          aiX, 
          aiScore, 
          playerScore, 
          rallyCount, 
          difficulty, 
          shake, 
          comboCount: s.comboCount, 
          multiplier: s.multiplier, 
          totalScore: s.totalScore, 
          gameState: GAME_STATE.GAME_OVER, 
          winner: 'ai',
          finalScore: finalScore,
          roundsWon: roundsWon,
          isEnteringName: true, // Trigger name entry mode
          playerName: '' // Clear previous name
        };
        sound.gameOver();
        syncRender();
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
    }

    if (y - BALL_RADIUS < 0) {
      // Player scores - just increment, no winning condition
      playerScore++;
      sound.playerScore();
      scored = true;
      rallyCount = 0;
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
      stateRef.current = { ...s, ball, playerX, aiX, aiScore, playerScore, rallyCount, difficulty, shake, comboCount: s.comboCount, multiplier: s.multiplier, totalScore: s.totalScore, gameState };
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

  // ─── Keyboard controls ───────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    // Don't handle game controls if user is entering name
    if (stateRef.current.isEnteringName) return;
    
    if (e.key === 'ArrowLeft') {
      keysRef.current.left = true;
      keysRef.current.right = false; // Cancel opposite direction
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      keysRef.current.right = true;
      keysRef.current.left = false; // Cancel opposite direction
      e.preventDefault();
    } else if (e.key === ' ') {
      // Space bar to start/restart game
      const { gameState } = stateRef.current;
      if (
        gameState === GAME_STATE.IDLE ||
        gameState === GAME_STATE.GAME_OVER ||
        gameState === GAME_STATE.PAUSED
      ) {
        startGame();
      }
      e.preventDefault();
    }
  }, []);

  const handleKeyUp = useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      keysRef.current.left = false;
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      keysRef.current.right = false;
      e.preventDefault();
    }
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

  // ─── Name input functions ─────────────────────────────────────────────────────
  const updatePlayerName = useCallback((name) => {
    stateRef.current = { ...stateRef.current, playerName: name };
    syncRender();
  }, [syncRender]);

  const submitHighScore = useCallback(() => {
    console.log('🔥 submitHighScore called');
    const s = stateRef.current;
    console.log('Current state:', s);
    if (s.isEnteringName && s.finalScore > 0) {
      console.log('✅ Conditions met, saving score...');
      const name = (s.playerName && s.playerName.trim()) ? s.playerName.trim() : 'Anonymous';
      console.log('Player name:', name);
      const highScores = saveHighScore(s.finalScore, s.roundsWon, name);
      console.log('Saved high scores:', highScores);
      stateRef.current = { 
        ...s, 
        highScores: highScores, 
        isEnteringName: false 
      };
      syncRender();
      
      // Trigger storage event to refresh Leaderboard component
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'traypong_leaderboard',
        newValue: localStorage.getItem('traypong_leaderboard')
      }));
      console.log('✅ Score saved successfully');
    } else {
      console.log('❌ Conditions not met:', { isEnteringName: s.isEnteringName, finalScore: s.finalScore });
    }
  }, [syncRender, stateRef]);

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
    handleKeyDown,
    handleKeyUp,
    updatePlayerName,
    submitHighScore,
  };
}
