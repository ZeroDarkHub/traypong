/**
 * src/App.jsx
 * Root component for TrayPong.
 * Orchestrates GameCanvas, UIOverlay, and Leaderboard with view transitions.
 */

import React, { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas/GameCanvas';
import Leaderboard from './components/Leaderboard/Leaderboard';
import UIOverlay from './components/UIOverlay/UIOverlay';
import LandingPage from './components/LandingPage';
import './App.css';

// Views
const VIEW = {
  LANDING: 'landing',
  GAME: 'game',
  LEADERBOARD: 'leaderboard',
};

export default function App() {
  // Start with landing page in browser, game directly in Electron
  const isElectron = window.electronAPI?.isElectron;
  const [view, setView] = useState(isElectron ? VIEW.GAME : VIEW.LANDING);
  const [gameOver, setGameOver] = useState(false);
  const [playerScore, setPlayerScore] = useState(0);
  const [winner, setWinner] = useState(null);
  const [savedRank, setSavedRank] = useState(null);
  const [savedScore, setSavedScore] = useState(null);

  const handleGameOver = useCallback((score, gameWinner) => {
    setPlayerScore(score);
    setWinner(gameWinner);
    setGameOver(true);
  }, []);

  const handleScoreSaved = useCallback((rank, score) => {
    setSavedRank(rank);
    setSavedScore(score);
    // Auto-show leaderboard to see rank
    if (rank !== null) {
      setTimeout(() => setView(VIEW.LEADERBOARD), 600);
    }
  }, []);

  const handleNewGame = useCallback(() => {
    setGameOver(false);
    setWinner(null);
    setPlayerScore(0);
    setSavedRank(null);
  }, []);

  // When coming back from leaderboard, game should still be in GAME_OVER or IDLE state
  const handleShowLeaderboard = useCallback(() => {
    setView(VIEW.LEADERBOARD);
  }, []);

  const handleBackToGame = useCallback(() => {
    setView(VIEW.GAME);
    handleNewGame();
  }, [handleNewGame]);

  const handleStartGame = useCallback(() => {
    setView(VIEW.GAME);
    handleNewGame();
  }, [handleNewGame]);

  const handleShowLanding = useCallback(() => {
    setView(VIEW.LANDING);
  }, []);

  return (
    <div className="app" data-view={view}>
      {/* Only show UIOverlay when not on landing page */}
      {view !== VIEW.LANDING && (
        <UIOverlay
          onShowLeaderboard={handleShowLeaderboard}
          gameOver={gameOver}
          playerScore={playerScore}
          winner={winner}
          onScoreSaved={handleScoreSaved}
          onShowLanding={handleShowLanding}
        />
      )}

      <div className="app-body">
        {view === VIEW.LANDING && (
          <div className="view-landing">
            <LandingPage onStartGame={handleStartGame} />
          </div>
        )}

        {view === VIEW.GAME && (
          <div className="view-game">
            <GameCanvas onGameOver={handleGameOver} />
          </div>
        )}

        {view === VIEW.LEADERBOARD && (
          <div className="view-leaderboard">
            <Leaderboard
              highlightRank={savedRank}
              highlightScore={savedScore}
              onClose={handleBackToGame}
            />
          </div>
        )}
      </div>
    </div>
  );
}
