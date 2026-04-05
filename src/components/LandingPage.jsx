import { useState, useEffect, useRef } from "react";

const FEATURES = [
  {
    icon: "🏓",
    title: "Classic Pong",
    desc: "Tight mouse controls, responsive AI, and realistic bounce angles based on where you hit the paddle. Edge hits = sharp angles.",
    tag: "Physics engine",
  },
  {
    icon: "✨",
    title: "Ball trail & shake",
    desc: "Subtle motion trail follows the ball. Screen shakes on every paddle hit. Small details that make the game feel alive.",
    tag: "Game feel",
  },
  {
    icon: "🔊",
    title: "Procedural sounds",
    desc: "All sounds generated with the Web Audio API. Pitch rises with rally length. No audio files, zero latency, no glitches.",
    tag: "Web Audio API",
  },
  {
    icon: "🏆",
    title: "Leaderboard",
    desc: "Top 10 scores saved locally. Enter your name after a win and see your rank instantly. Persistent between sessions.",
    tag: "localStorage",
  },
  {
    icon: "🍎",
    title: "True tray app",
    desc: "No Dock icon. Lives only in your menu bar. Click to open, click away to close. Auto-pauses when you switch apps.",
    tag: "Electron",
  },
  {
    icon: "⚡",
    title: "Gradual difficulty",
    desc: "Ball speeds up with each hit. AI gets sharper as the game progresses. Every match is a little harder than the last.",
    tag: "Adaptive AI",
  },
];

const STEPS = [
  {
    num: "1",
    title: "Download the .dmg",
    desc: "Click the download button and save TrayPong.dmg to your Mac.",
    warn: null,
  },
  {
    num: "2",
    title: "Open and drag to Applications",
    desc: "Double-click the .dmg, then drag TrayPong into your Applications folder.",
    warn: null,
  },
  {
    num: "3",
    title: "First launch — bypass Gatekeeper",
    desc: "Because TrayPong isn't signed by Apple, macOS will block it on first open. Right-click the app in Applications and choose Open, then confirm. You'll only see this once.",
    warn: {
      label: "If right-click doesn't work",
      detail: "Go to System Settings → Privacy & Security → scroll down and click Open Anyway next to TrayPong.",
    },
  },
  {
    num: "4",
    title: "Find it in your menu bar",
    desc: "That's it. A 🏓 icon appears in your macOS menu bar. Click it anytime to play.",
    warn: null,
  },
];

const STATS = [
  { num: "60", unit: "fps", label: "Buttery smooth" },
  { num: "0", unit: "ms", label: "Input lag felt" },
  { num: "~3", unit: "mb", label: "App size" },
];

function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

function Reveal({ children, delay = 0, style = {} }) {
  const [ref, visible] = useReveal();
  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(24px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Exact constants from the real game (physics.js) ───────────────────────────
const CW = 300, CH = 380;
const PW = 56, PH = 8, BR = 5;
const PY_PLAYER = CH - 24;   // 356
const PY_AI = 16;

// ── Exact drawing functions copied from GameCanvas.jsx ────────────────────────
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
  const glow = isPlayer ? "rgba(232,232,255,0.35)" : "rgba(232,64,64,0.35)";
  const color = isPlayer ? "#e8e8f0" : "#e84040";
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color;
  drawRoundRect(ctx, x, y, PW, PH, PH / 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = color;
  drawRoundRect(ctx, x, y, PW, PH, PH / 2);
  ctx.fill();
}

function drawBall(ctx, ball) {
  const { trail, x, y } = ball;
  for (let i = 0; i < trail.length; i++) {
    const alpha = (i / trail.length) * 0.5;
    const r = BR * 0.5 + (i / trail.length) * BR * 0.5;
    ctx.beginPath();
    ctx.arc(trail[i].x, trail[i].y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,170,255,${alpha})`;
    ctx.fill();
  }
  ctx.save();
  ctx.shadowColor = "rgba(153,102,255,0.4)";
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.arc(x, y, BR, 0, Math.PI * 2);
  ctx.fillStyle = "#f0f0ff";
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x, y, BR, 0, Math.PI * 2);
  ctx.fillStyle = "#f0f0ff";
  ctx.fill();
}

function drawNet(ctx) {
  ctx.strokeStyle = "#2a2a35";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 5]);
  ctx.beginPath();
  ctx.moveTo(CW / 2, 0);
  ctx.lineTo(CW / 2, CH);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawOverlay(ctx, text, subtext) {
  ctx.fillStyle = "rgba(13,13,15,0.78)";
  ctx.fillRect(0, 0, CW, CH);
  ctx.textAlign = "center";
  ctx.fillStyle = "#e8e8f0";
  ctx.font = 'bold 16px "SF Pro Display","Helvetica Neue",sans-serif';
  ctx.fillText(text, CW / 2, CH / 2 - 12);
  if (subtext) {
    ctx.fillStyle = "#555560";
    ctx.font = '12px "SF Pro Display","Helvetica Neue",sans-serif';
    ctx.fillText(subtext, CW / 2, CH / 2 + 14);
  }
}

function drawFrame(ctx, state) {
  // Background gradient — exact match
  const grad = ctx.createLinearGradient(0, 0, 0, CH);
  grad.addColorStop(0, "#14141a");
  grad.addColorStop(1, "#0d0d0f");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CW, CH);

  drawNet(ctx);
  drawPaddle(ctx, state.playerX, PY_PLAYER, true);
  drawPaddle(ctx, state.aiX, PY_AI, false);
  drawBall(ctx, state.ball);
}

// ── Scripted demo simulation ──────────────────────────────────────────────────
// Pre-computed waypoints the ball travels through — looks like a real rally
const DEMO_WAYPOINTS = [
  { x: 150, y: 340, vx: 3.2,  vy: -4.5 },
  { x: 240, y: 30,  vx: -3.8, vy: 4.2  },
  { x: 60,  y: 340, vx: 4.1,  vy: -4.8 },
  { x: 200, y: 25,  vx: -2.9, vy: 4.6  },
  { x: 110, y: 345, vx: 3.5,  vy: -4.3 },
  { x: 260, y: 28,  vx: -4.0, vy: 4.5  },
];

function makeDemoState() {
  return {
    playerX: CW / 2 - PW / 2,
    aiX: CW / 2 - PW / 2,
    aiScore: 3,
    playerScore: 5,
    ball: { x: 150, y: 190, vx: 3.2, vy: -4.5, trail: [] },
    waypointIdx: 0,
  };
}

function stepDemo(state, dt) {
  const MAX_TRAIL = 8;
  let { ball, playerX, aiX, waypointIdx } = state;

  // Update trail
  const trail = [...ball.trail, { x: ball.x, y: ball.y }];
  if (trail.length > MAX_TRAIL) trail.shift();

  let { x, y, vx, vy } = ball;
  x += vx * dt;
  y += vy * dt;

  // Wall bounce
  if (x - BR <= 0)  { x = BR;      vx = Math.abs(vx); }
  if (x + BR >= CW) { x = CW - BR; vx = -Math.abs(vx); }

  // Paddle hit — player (bottom)
  if (vy > 0 && y + BR >= PY_PLAYER && y + BR <= PY_PLAYER + PH &&
      x > playerX && x < playerX + PW) {
    vy = -Math.abs(vy) * 1.04;
    y = PY_PLAYER - BR;
  }

  // Paddle hit — AI (top)
  if (vy < 0 && y - BR <= PY_AI + PH && y - BR >= PY_AI &&
      x > aiX && x < aiX + PW) {
    vy = Math.abs(vy) * 1.04;
    y = PY_AI + PH + BR;
  }

  // Reset ball if it goes out instead of scoring (keeps the demo looping)
  if (y > CH + 20 || y < -20) {
    waypointIdx = (waypointIdx + 1) % DEMO_WAYPOINTS.length;
    const wp = DEMO_WAYPOINTS[waypointIdx];
    x = wp.x; y = wp.y; vx = wp.vx; vy = wp.vy;
  }

  // AI tracks ball smoothly
  const aiTarget = x - PW / 2;
  const aiSpeed = 3.2;
  const aiDiff = aiTarget - aiX;
  const aiMove = Math.sign(aiDiff) * Math.min(Math.abs(aiDiff) * 0.09, aiSpeed * dt);
  aiX = Math.max(0, Math.min(CW - PW, aiX + aiMove));

  // Player paddle smoothly follows ball with slight lag (demo illusion)
  const plTarget = x - PW / 2;
  const plDiff = plTarget - playerX;
  const plMove = Math.sign(plDiff) * Math.min(Math.abs(plDiff) * 0.07, 3.8 * dt);
  playerX = Math.max(0, Math.min(CW - PW, playerX + plMove));

  return {
    ...state,
    ball: { x, y, vx, vy, trail },
    playerX,
    aiX,
    waypointIdx,
  };
}

function AppMockup() {
  const canvasRef = useRef(null);
  const stateRef = useRef(makeDemoState());
  const rafRef = useRef(null);
  const lastRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    function tick(ts) {
      if (lastRef.current === null) lastRef.current = ts;
      const dt = Math.min((ts - lastRef.current) / 16.67, 2);
      lastRef.current = ts;

      stateRef.current = stepDemo(stateRef.current, dt);
      drawFrame(ctx, stateRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column" }}>
      {/* Ambient glow behind the whole mockup */}
      <div style={{
        position: "absolute", inset: -60,
        background: "radial-gradient(ellipse at center, rgba(153,102,255,0.07) 0%, transparent 65%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      {/* macOS menu bar strip */}
      <div style={{
        background: "rgba(30,30,40,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px 12px 0 0",
        padding: "8px 16px",
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        gap: 12, width: CW + 40,
      }}>
        {["Tue 9:41", "WiFi", "🔋"].map(item => (
          <span key={item} style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace" }}>{item}</span>
        ))}
        <span style={{ fontSize: 11, color: "#9966ff", fontWeight: 500, fontFamily: "'DM Mono', monospace" }}>🏓</span>
      </div>

      {/* App window chrome */}
      <div style={{
        width: CW + 40, background: "#0d0d0f",
        border: "1px solid rgba(153,102,255,0.25)", borderTop: "none",
        borderRadius: "0 0 16px 16px", overflow: "hidden",
        boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(153,102,255,0.1)",
      }}>
        {/* UIOverlay top bar — exact match */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px 6px", borderBottom: "1px solid #1a1a22",
          background: "#0d0d0f",
        }}>
          <span style={{ fontSize: 9, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9966ff", fontFamily: "'DM Mono', monospace" }}>TRAY PONG</span>
          <div style={{ display: "flex", gap: 4 }}>
            <span style={{ fontSize: 13, color: "#44444f" }}>🔈</span>
            <span style={{ fontSize: 13, color: "#44444f" }}>🏆</span>
            <span style={{ fontSize: 13, color: "#44444f" }}>✕</span>
          </div>
        </div>

        {/* Score bar — exact match to GameCanvas.css */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 16, padding: "10px 20px 8px", background: "#0d0d0f",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "'SF Pro Display','Helvetica Neue',sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#44444f" }}>AI</span>
            <span style={{ fontFamily: "'SF Pro Display','Helvetica Neue',sans-serif", fontSize: 28, fontWeight: 700, color: "#e84040", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>3</span>
          </div>
          <span style={{ fontSize: 20, color: "#2a2a35", fontWeight: 300, marginTop: -2 }}>:</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "'SF Pro Display','Helvetica Neue',sans-serif", fontSize: 28, fontWeight: 700, color: "#e8e8f0", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>5</span>
            <span style={{ fontFamily: "'SF Pro Display','Helvetica Neue',sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#44444f" }}>YOU</span>
          </div>
        </div>

        {/* Enhanced scoring row — exact match to GameCanvas.jsx */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 20px 8px", background: "#0d0d0f",
        }}>
          <span style={{ color: "#c299ff", fontSize: 12, fontWeight: "bold", fontFamily: "'SF Pro Display','Helvetica Neue',sans-serif" }}>COMBO x3</span>
          <span style={{ color: "#7ec8a4", fontSize: 12, fontWeight: "bold", fontFamily: "'SF Pro Display','Helvetica Neue',sans-serif" }}>2x</span>
          <span style={{ color: "#e8e8f0", fontSize: 14, fontWeight: "bold", fontFamily: "'SF Pro Display','Helvetica Neue',sans-serif" }}>SCORE: 840</span>
        </div>

        {/* The real canvas — exact dimensions from physics.js */}
        <canvas
          ref={canvasRef}
          width={CW}
          height={CH}
          style={{ display: "block", margin: "0 20px 20px" }}
        />
      </div>
    </div>
  );
}

export default function TrayPongLanding({ onStartGame }) {

  return (
    <div
      style={{
        background: "#080810", color: "#f0f0fa",
        fontFamily: "'DM Mono', monospace",
        WebkitFontSmoothing: "antialiased",
        position: "relative", overflowX: "hidden",
      }}
    >
      {/* Google Fonts */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=Syne:wght@700;800&display=swap" rel="stylesheet" />

      {/* Keyframes injected globally */}
      <style>{`
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.7)} }
        @keyframes paddleAi { 0%,100%{transform:translateX(-50%) translateX(-60px)} 50%{transform:translateX(-50%) translateX(60px)} }
        @keyframes paddlePlayer { 0%,100%{transform:translateX(-50%) translateX(40px)} 50%{transform:translateX(-50%) translateX(-80px)} }
        @keyframes ballFloat { 0%{transform:translate(-50%,-50%) translate(-80px,80px)} 25%{transform:translate(-50%,-50%) translate(80px,-80px)} 50%{transform:translate(-50%,-50%) translate(-40px,60px)} 75%{transform:translate(-50%,-50%) translate(60px,-60px)} 100%{transform:translate(-50%,-50%) translate(-80px,80px)} }
        @keyframes mockAi { 0%,100%{left:80px} 50%{left:160px} }
        @keyframes mockPlayer { 0%,100%{left:160px} 50%{left:60px} }
        @keyframes mockBall { 0%{left:170px;top:180px} 25%{left:240px;top:60px} 50%{left:120px;top:40px} 75%{left:80px;top:170px} 100%{left:170px;top:180px} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanlines { 0%{background-position:0 0} 100%{background-position:0 4px} }
      `}</style>

      {/* Scanline overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 998,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)",
      }} />

      {/* ── Nav ── */}
      <nav style={{
        position: "sticky", top: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "clamp(16px, 4vw, 20px) clamp(20px, 5vw, 48px)",
        background: "linear-gradient(to bottom, rgba(8,8,16,0.97), rgba(8,8,16,0.85))",
        backdropFilter: "blur(8px)",
        zIndex: 100, borderBottom: "1px solid rgba(255,255,255,0.04)",
        flexWrap: "wrap", gap: "16px",
      }}>
        <a href="#" style={{ fontFamily: "var(--font)", fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 800, letterSpacing: "0.06em", color: "#f0f0fa", textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#9966ff", animation: "pulseDot 2s ease infinite" }} />
          TRAYPONG
        </a>
        <div style={{ display: "flex", gap: "clamp(16px, 4vw, 32px)", flexWrap: "wrap" }}>
          {[
            ["#features", "Features"],
            ["#howto", "How to Play"],
            ["download", "Play Demo"]
          ].map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: "clamp(10px, 2.5vw, 11px)", letterSpacing: "0.1em", textTransform: "uppercase", color: "#55556a", textDecoration: "none", fontFamily: "var(--font)" }}>{label}</a>
          ))}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        minHeight: "92vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "clamp(60px, 8vh, 80px) clamp(16px, 4vw, 24px) clamp(40px, 6vh, 60px)",
        position: "relative", overflow: "hidden",
      }}>
        {/* Court background */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {/* Center line */}
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "linear-gradient(to bottom, transparent, rgba(153,102,255,0.12) 20%, rgba(153,102,255,0.12) 80%, transparent)" }} />
          {/* Net */}
          <div style={{ position: "absolute", left: "50%", top: "20%", height: "60%", width: 1, background: "repeating-linear-gradient(to bottom, rgba(153,102,255,0.2) 0, rgba(153,102,255,0.2) 6px, transparent 6px, transparent 12px)" }} />
          {/* AI paddle - mobile responsive */}
          <div style={{ 
            position: "absolute", top: "14%", left: "50%", 
            width: "clamp(48px, 8vw, 72px)", height: "clamp(6px, 1.2vw, 8px)", 
            borderRadius: 4, background: "#e84040", 
            boxShadow: "0 0 20px rgba(232,64,64,0.4)", 
            animation: "paddleAi 4s ease-in-out infinite" 
          }} />
          {/* Player paddle - mobile responsive */}
          <div style={{ 
            position: "absolute", bottom: "14%", left: "50%", 
            width: "clamp(48px, 8vw, 72px)", height: "clamp(6px, 1.2vw, 8px)", 
            borderRadius: 4, background: "#f0f0fa", 
            boxShadow: "0 0 20px rgba(240,240,255,0.3)", 
            animation: "paddlePlayer 4s ease-in-out infinite 0.5s" 
          }} />
          {/* Ball - mobile responsive */}
          <div style={{ 
            position: "absolute", 
            width: "clamp(8px, 1.5vw, 10px)", height: "clamp(8px, 1.5vw, 10px)", 
            borderRadius: "50%", background: "#fff", 
            boxShadow: "0 0 16px rgba(200,170,255,0.9), 0 0 40px rgba(153,102,255,0.4)", 
            left: "50%", top: "50%", animation: "ballFloat 4s linear infinite" 
          }} />
          {/* Radial glow - mobile responsive */}
          <div style={{ 
            position: "absolute", 
            width: "clamp(300px, 60vw, 600px)", height: "clamp(300px, 60vw, 600px)", 
            borderRadius: "50%", 
            background: "radial-gradient(circle, rgba(153,102,255,0.08) 0%, transparent 70%)", 
            top: "50%", left: "50%", transform: "translate(-50%,-50%)" 
          }} />
        </div>

        <div style={{ position: "relative", zIndex: 2 }}>
          <p style={{ 
            fontSize: "clamp(10px, 2.5vw, 11px)", 
            letterSpacing: "0.18em", textTransform: "uppercase", 
            color: "#9966ff", marginBottom: "clamp(16px, 3vw, 24px)", 
            animation: "fadeUp 0.8s ease both" 
          }}>
            macOS menu bar · instantly playable
          </p>
          <h1 style={{
            fontFamily: "var(--font)", fontSize: "clamp(48px, 10vw, 128px)",
            fontWeight: 800, lineHeight: "clamp(0.8, 1.1, 0.9)", letterSpacing: "-0.02em",
            marginBottom: "clamp(20px, 4vw, 28px)", animation: "fadeUp 0.8s 0.1s ease both",
          }}>
            TRAY<span style={{ color: "#9966ff" }}>PONG</span>
          </h1>
          <p style={{
            fontFamily: "var(--font)", fontStyle: "italic",
            fontSize: "clamp(16px, 4vw, 24px)", color: "#55556a",
            maxWidth: "clamp(280px, 80vw, 480px)", margin: "0 auto clamp(32px, 6vw, 48px)", 
            lineHeight: 1.5, animation: "fadeUp 0.8s 0.2s ease both",
          }}>
            Classic Pong, always one click away in your menu bar.
          </p>
          <div style={{ 
            display: "flex", alignItems: "center", 
            gap: "clamp(12px, 3vw, 16px)", 
            justifyContent: "center", 
            flexDirection: "row", flexWrap: "wrap",
            animation: "fadeUp 0.8s 0.3s ease both" 
          }}>
            <button onClick={onStartGame} style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "#9966ff", color: "#fff",
              fontFamily: "'DM Mono', monospace", fontSize: "clamp(12px, 3vw, 13px)", fontWeight: 500,
              letterSpacing: "0.04em", padding: "clamp(12px, 3vw, 14px) clamp(24px, 6vw, 28px)", borderRadius: 6,
              textDecoration: "none", border: "none",
              transition: "background 0.2s, transform 0.15s",
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4 4 4-4M3 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Play Now
            </button>
            <a href="#features" style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "transparent", color: "#55556a",
              fontFamily: "'DM Mono', monospace", fontSize: "clamp(11px, 2.8vw, 12px)",
              letterSpacing: "0.04em", padding: "clamp(12px, 3vw, 14px) clamp(16px, 4vw, 20px)", borderRadius: 6,
              textDecoration: "none", border: "1px solid rgba(255,255,255,0.07)",
            }}>
              See features →
            </a>
          </div>
        </div>
      </section>

      {/* ── App Mockup ── */}
      <section style={{ padding: "20px 24px 100px", display: "flex", justifyContent: "center" }}>
        <Reveal>
          <AppMockup />
        </Reveal>
      </section>

      {/* ── Stats ── */}
      <Reveal>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          flexWrap: "wrap", gap: "6px",
          padding: "20px clamp(24px, 5vw, 48px)",
        }}>
          {STATS.map(({ num, unit, label }, i) => (
            <div key={label} style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 18px",
              background: "#0f0f1a",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "100px",
            }}>
              <span style={{
                fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 800,
                letterSpacing: "-0.02em", color: "#f0f0fa", lineHeight: 1,
              }}>
                {num}<span style={{ color: "#9966ff" }}>{unit}</span>
              </span>
              <span style={{
                fontSize: 11, color: "#33333f",
                letterSpacing: "0.03em",
              }}>{label}</span>
            </div>
          ))}
        </div>
      </Reveal>

      {/* ── Features ── */}
      <section id="features" style={{ 
        padding: "clamp(60px, 8vh, 80px) clamp(24px, 5vw, 48px) clamp(80px, 10vh, 100px)", 
        maxWidth: 1100, margin: "0 auto" 
      }}>
        <Reveal><p style={{ 
          fontSize: "clamp(10px, 2.5vw, 10px)", 
          letterSpacing: "0.18em", textTransform: "uppercase", 
          color: "#9966ff", marginBottom: "clamp(12px, 3vw, 16px)" 
        }}>What's inside</p></Reveal>
        <Reveal delay={0.05}>
          <h2 style={{ 
            fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 6vw, 56px)", 
            fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em", 
            marginBottom: "clamp(40px, 6vw, 64px)" 
          }}>
            Crafted for <em style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, color: "#55556a" }}>feel,</em><br/>not features.
          </h2>
        </Reveal>

        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", 
          gap: "clamp(16px, 4vw, 24px)" 
        }}>
          {FEATURES.map(({ icon, title, desc, tag }, i) => (
            <Reveal key={title} delay={(i % 3) * 0.1}>
              <FeatureCard icon={icon} title={title} desc={desc} tag={tag} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── How To ── */}
      <section id="howto" style={{ 
        padding: "clamp(60px, 8vh, 60px) clamp(24px, 5vw, 48px) clamp(80px, 10vh, 100px)", 
        maxWidth: 900, margin: "0 auto" 
      }}>
        <Reveal><p style={{ 
          fontSize: "clamp(10px, 2.5vw, 10px)", 
          letterSpacing: "0.18em", textTransform: "uppercase", 
          color: "#9966ff", marginBottom: "clamp(12px, 3vw, 16px)" 
        }}>Get playing in 60 seconds</p></Reveal>
        <Reveal delay={0.05}>
          <h2 style={{ 
            fontFamily: "'Syne', sans-serif", fontSize: "clamp(32px, 6vw, 56px)", 
            fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em", 
            marginBottom: "clamp(40px, 6vw, 56px)" 
          }}>
            Up in <em style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, color: "#55556a" }}>four steps.</em>
          </h2>
        </Reveal>

        <div style={{ 
          paddingLeft: 56, 
          position: "relative" 
        }}>
          <div style={{ 
            position: "absolute", left: 15,
            top: 20, bottom: 20, width: 1, 
            background: "linear-gradient(to bottom, #9966ff, rgba(153,102,255,0.1))" 
          }} />
          {STEPS.map(({ num, title, desc, warn }, i) => (
            <Reveal key={num} delay={i * 0.07}>
              <div style={{ 
                position: "relative", 
                padding: "28px 0", 
                borderBottom: i < STEPS.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" 
              }}>
                <div style={{
                  position: "absolute", left: -56, top: 28,
                  width: 32, height: 32, borderRadius: "50%",
                  background: "#0f0f1a", border: "1px solid rgba(153,102,255,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, color: "#9966ff", fontWeight: 500,
                  flexShrink: 0,
                }}>{num}</div>
                <div style={{ 
                  fontFamily: "'Syne', sans-serif", 
                  fontSize: 18,
                  fontWeight: 700, marginBottom: 10,
                  color: "#f0f0fa",
                  lineHeight: 1.3,
                }}>{title}</div>
                <p style={{ 
                  fontSize: 14, 
                  lineHeight: 1.75, color: "#888899",
                }}>{desc}</p>
                {warn && (
                  <div style={{
                    marginTop: 14,
                    padding: "12px 16px",
                    background: "rgba(232,160,40,0.06)",
                    border: "1px solid rgba(232,160,40,0.18)",
                    borderLeft: "3px solid rgba(232,160,40,0.5)",
                    borderRadius: "0 6px 6px 0",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "#c8a050", marginBottom: 5, letterSpacing: "0.04em" }}>
                      {warn.label}
                    </div>
                    <div style={{ fontSize: 13, color: "#888899", lineHeight: 1.65 }}>{warn.detail}</div>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Download CTA ── */}
      <section id="download" style={{ 
        padding: "clamp(80px, 12vh, 120px) clamp(24px, 5vw, 48px)", 
        textAlign: "center", position: "relative", overflow: "hidden" 
      }}>
        <div style={{ 
          position: "absolute", 
          width: "clamp(400px, 80vw, 800px)", height: "clamp(200px, 40vw, 400px)", 
          borderRadius: "50%", 
          background: "radial-gradient(ellipse, rgba(153,102,255,0.1) 0%, transparent 70%)", 
          top: "50%", left: "50%", transform: "translate(-50%,-50%)", 
          pointerEvents: "none" 
        }} />
        <Reveal>
          <h2 style={{ 
            fontFamily: "'Syne', sans-serif", 
            fontSize: "clamp(36px, 8vw, 80px)", 
            fontWeight: 800, letterSpacing: "-0.03em", 
            lineHeight: "clamp(0.9, 1.2, 0.95)", 
            marginBottom: "clamp(16px, 3vw, 24px)", 
            position: "relative" 
          }}>
            Ready to<br/>play?
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p style={{ 
            fontFamily: "'Instrument Serif', serif", fontStyle: "italic", 
            fontSize: "clamp(16px, 4vw, 18px)", 
            color: "#55556a", 
            marginBottom: "clamp(32px, 6vw, 48px)", 
            position: "relative",
            maxWidth: "clamp(280px, 80vw, 400px)",
            margin: "0 auto clamp(32px, 6vw, 48px)"
          }}>
            Your menu bar has been too boring for too long.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <a href="TrayPong.dmg" download style={{
              display: "inline-flex", alignItems: "center", gap: 12,
              background: "#f0f0fa", color: "#080810",
              fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700,
              letterSpacing: "0.02em", padding: "18px 40px", borderRadius: 8,
              textDecoration: "none", cursor: "pointer",
              transition: "transform 0.15s, box-shadow 0.2s",
              boxShadow: "0 0 60px rgba(240,240,255,0.15)",
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4 4 4-4M3 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Download for macOS
            </a>
            <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "#55556a", textTransform: "uppercase" }}>Free · macOS 12+</span>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer style={{ 
        borderTop: "1px solid rgba(255,255,255,0.07)", 
        padding: "clamp(24px, 5vw, 32px) clamp(24px, 5vw, 48px)", 
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "clamp(16px, 3vw, 20px)"
      }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 13, color: "#f0f0fa" }}>TRAYPONG</span>

        <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontSize: 13, color: "#9966ff" }}>
          © {new Date().getFullYear()} TrayPong · Your menu bar has been too boring for too long
        </span>

        <div style={{ display: "flex", gap: "clamp(16px, 4vw, 24px)", flexWrap: "wrap" }}>
          {[["#features", "Features"], ["#howto", "Install"], ["TrayPong.dmg", "Download"]].map(([href, label]) => (
            <a key={label} href={href} style={{ fontSize: 11, color: "#55556a", textDecoration: "none" }}>{label}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, tag }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "#161624" : "#0f0f1a",
        padding: "32px 28px",
        border: `1px solid ${hovered ? "rgba(153,102,255,0.35)" : "rgba(255,255,255,0.07)"}`,
        transition: "border-color 0.2s, background 0.2s",
        position: "relative", overflow: "hidden", height: "100%",
      }}
    >
      {hovered && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(to right, transparent, rgba(153,102,255,0.4), transparent)" }} />
      )}
      <span style={{ fontSize: 22, marginBottom: 16, display: "block" }}>{icon}</span>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, marginBottom: 10, color: "#f0f0fa" }}>{title}</div>
      <p style={{ fontSize: 12, lineHeight: 1.75, color: "#55556a" }}>{desc}</p>
      <span style={{
        display: "inline-block", marginTop: 14, fontSize: 10, letterSpacing: "0.08em",
        padding: "3px 8px", borderRadius: 3,
        background: "rgba(153,102,255,0.1)", color: "#c299ff",
        border: "1px solid rgba(153,102,255,0.15)",
      }}>{tag}</span>
    </div>
  );
}
