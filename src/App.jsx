/**
 * src/App.jsx
 * Root component for TrayPong.
 * Orchestrates GameCanvas, UIOverlay, and Leaderboard with view transitions.
 */

import React, { useState, useCallback, useEffect } from 'react';
import GameCanvas from './components/GameCanvas/GameCanvas';
import Leaderboard from './components/Leaderboard/Leaderboard';
import UIOverlay from './components/UIOverlay/UIOverlay';
import LandingPage from './components/LandingPage';
import SecurityPolicy from './components/SecurityPolicy';
import './App.css';

// Views
const VIEW = {
  LANDING: 'landing',
  GAME: 'game',
  LEADERBOARD: 'leaderboard',
  SECURITY: 'security',
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

  // Handle hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1); // Remove # from hash
      if (hash && hash !== view) {
        setView(hash);
      }
    };

    // Initial hash check
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [view]);

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
    <div className="app" data-view={view} data-electron={isElectron ? "true" : "false"}>
      {/* Only show UIOverlay when not on landing or security page */}
      {view !== VIEW.LANDING && view !== VIEW.SECURITY && (
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
            <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
              <GameCanvas onGameOver={handleGameOver} />
            </div>
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

        {view === VIEW.SECURITY && (
          <div className="view-security">
            <SecurityPolicy />
          </div>
        )}
      </div>
    </div>
  );
}
