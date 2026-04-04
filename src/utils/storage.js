/**
 * src/utils/storage.js
 * Leaderboard persistence via localStorage.
 * Keeps top 10 scores, sorted descending.
 */

const STORAGE_KEY = 'traypong_leaderboard';
const MAX_ENTRIES = 10;

/**
 * @typedef {{ name: string, score: number, date: string }} LeaderboardEntry
 */

/**
 * Load the leaderboard from localStorage.
 * @returns {LeaderboardEntry[]}
 */
export function loadLeaderboard() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save a new score. Returns the updated leaderboard and the entry's rank (1-based),
 * or null if the score didn't make the top 10.
 *
 * @param {string} name
 * @param {number} score
 * @returns {{ leaderboard: LeaderboardEntry[], rank: number | null }}
 */
export function saveScore(name, score) {
  if (score <= 0) return { leaderboard: loadLeaderboard(), rank: null };

  const board = loadLeaderboard();

  const entry = {
    name: (name || 'Anonymous').slice(0, 16),
    score,
    date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };

  board.push(entry);
  board.sort((a, b) => b.score - a.score);

  // Keep only top MAX_ENTRIES
  const trimmed = board.slice(0, MAX_ENTRIES);

  // Find rank of new entry (first occurrence with same score+name)
  const rank = trimmed.findIndex(
    (e) => e.name === entry.name && e.score === entry.score && e.date === entry.date
  );

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage might be unavailable in some Electron configs
  }

  return { leaderboard: trimmed, rank: rank === -1 ? null : rank + 1 };
}

/**
 * Check if a score would make the leaderboard without saving.
 * @param {number} score
 * @returns {boolean}
 */
export function wouldQualify(score) {
  if (score <= 0) return false;
  const board = loadLeaderboard();
  if (board.length < MAX_ENTRIES) return true;
  return score > board[board.length - 1].score;
}

/**
 * Clear the entire leaderboard.
 */
export function clearLeaderboard() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
