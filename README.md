# 🏓 TrayPong

A Pong game that lives in your macOS menu bar. Click the tray icon, instantly play.

## Features

- **Classic Pong** – Player vs. AI with smart tracking
- **Satisfying game feel** – Ball trail, screen shake, speed escalation
- **Web Audio sounds** – Procedural tick/bounce/score sounds with rally pitch scaling
- **Leaderboard** – Top 10 scores saved locally, with name entry
- **macOS tray app** – Frameless popover, hides on blur, no Dock icon
- **Pause on hide** – Game pauses automatically when window loses focus

---

## Project Structure

```
tray-pong/
├── electron/
│   ├── main.js          # Electron main process — tray, window management
│   ├── preload.js       # Secure IPC bridge (contextBridge)
│   ├── tray-icon.png    # 16×16 menu bar icon
│   └── generate-icon.js # Icon generation notes
├── public/
│   └── index.html       # HTML shell
├── src/
│   ├── App.jsx           # Root component, view routing (game / leaderboard)
│   ├── App.css
│   ├── index.js          # React entry point
│   ├── components/
│   │   ├── GameCanvas/
│   │   │   ├── GameCanvas.jsx   # Canvas rendering (paddles, ball, trail, overlays)
│   │   │   └── GameCanvas.css
│   │   ├── Leaderboard/
│   │   │   ├── Leaderboard.jsx  # Top 10 display with highlight
│   │   │   └── Leaderboard.css
│   │   └── UIOverlay/
│   │       ├── UIOverlay.jsx    # Top bar + score submission modal
│   │       └── UIOverlay.css
│   ├── hooks/
│   │   └── useGameLoop.js       # Game loop, state machine, physics integration
│   └── utils/
│       ├── physics.js           # Pure physics helpers (bounce, AI, trail, lerp)
│       ├── sound.js             # Web Audio API sound engine
│       └── storage.js           # Leaderboard localStorage CRUD
└── package.json
```

---

## Quick Start

### Prerequisites

- **Node.js** ≥ 18  
- **npm** ≥ 9  
- **macOS** (for full tray experience; works in browser on any OS for dev)

### 1. Install dependencies

```bash
npm install
```

### 2. Run in development (browser only — fastest feedback loop)

```bash
npm start
```

Opens `http://localhost:3000` in your browser. Full game is playable here.  
Sound requires a user click to unlock the AudioContext (browser security).

### 3. Run as Electron app (development)

```bash
npm run electron:dev
```

This starts the React dev server **and** Electron simultaneously using `concurrently`.  
The tray icon will appear in your macOS menu bar. Click it to open the game window.

> **Tip:** If the tray icon doesn't appear immediately, wait ~3 seconds for the dev server to boot.

---

## Building for Production

### Step 1 — Build the React app

```bash
npm run build
```

Outputs optimized static files to `./build/`.

### Step 2 — Package the Electron app

```bash
npm run electron:build
```

Produces a `.dmg` and `.zip` in `./dist/` (macOS).

For a quick unpacked test (faster, no installer):

```bash
npm run electron:pack
```

Outputs to `./dist/mac/TrayPong.app` — drag to Applications or double-click to run.

---

## Customization

### Tray Icon

Replace `electron/tray-icon.png` with your own **16×16** PNG.  
For best macOS appearance, use a **black "Template" image** (macOS auto-inverts for dark/light mode):
- Name it `tray-iconTemplate.png`
- Update the path in `electron/main.js`

### Winning Score

In `src/hooks/useGameLoop.js`:
```js
const WINNING_SCORE = 7; // Change to any number
```

### AI Difficulty

In `src/utils/physics.js`:
```js
export const AI_BASE_SPEED = 2.8;  // Starting AI speed
export const AI_MAX_SPEED  = 5.5;  // Max AI speed at full difficulty
```

### Ball Speed

```js
export const INITIAL_BALL_SPEED = 4.2;
export const MAX_BALL_SPEED     = 9.5;
export const SPEED_INCREMENT    = 0.18; // Per paddle hit
```

---

## Architecture Notes

### State Machine
The game uses a simple state enum (`IDLE → PLAYING → SCORED → GAME_OVER`) managed in a ref to avoid stale closure issues inside `requestAnimationFrame`. React state is only synced for rendering via `setRenderState({ ...stateRef.current })`.

### Rendering
All game visuals are drawn to a `<canvas>` element in a `useEffect` keyed to `renderState`. This keeps the Canvas imperative drawing fully separate from React's declarative model.

### Sound
All sounds are generated procedurally using the Web Audio API — no external files needed. The `SoundEngine` class is a singleton with lazy AudioContext initialization (required for browser autoplay policy).

### Physics
`src/utils/physics.js` contains only pure functions. The bounce angle is computed from the ball's normalized hit position on the paddle (0 = left edge, 1 = right edge), mapped to ±60°. This ensures edge hits produce sharp angles while center hits return nearly straight.

### IPC Security
The Electron preload uses `contextBridge` to expose only two safe methods (`closeWindow`, `onWindowHidden`, `onWindowShown`) — Node.js APIs are never directly accessible from the renderer.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Tray icon not visible | macOS may hide menu bar icons when crowded — expand the menu bar or use Bartender |
| No sound | Click anywhere in the game window first (browser AudioContext policy) |
| Window doesn't position near tray | Known issue on multi-monitor setups — the window will appear at a reasonable screen position |
| `electron` not found | Run `npm install` first |
| Build fails on Apple Silicon | Ensure you're on Node ≥ 18 and run `npm install` fresh (no x86 node_modules) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 (functional components + hooks) |
| Game Rendering | HTML5 Canvas 2D |
| Desktop Shell | Electron 28 |
| Sound | Web Audio API (procedural) |
| Persistence | localStorage |
| Bundler | Create React App (react-scripts) |
| Packaging | electron-builder |

---

## License

MIT
