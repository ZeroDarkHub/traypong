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
    title: "Download & unzip",
    desc: "Download the zip below, unzip it, and open a terminal in the folder.",
    code: null,
  },
  {
    num: "2",
    title: "Install dependencies",
    desc: "Requires Node.js ≥ 18. Run once to install everything needed.",
    code: { cmd: "npm", sub: "install" },
  },
  {
    num: "3a",
    title: "Play in your browser",
    desc: "Fastest way to jump in — opens at localhost:3000 with full gameplay.",
    code: { cmd: "npm", sub: "start" },
  },
  {
    num: "3b",
    title: "Run as a real tray app",
    desc: "Launches React + Electron together. The 🏓 icon appears in your macOS menu bar.",
    code: { cmd: "npm run", sub: "electron:dev" },
  },
  {
    num: "4",
    title: "Build a .app for macOS",
    desc: "Package it into a distributable macOS app bundle. Output lands in /dist.",
    code: { cmd: "npm run", sub: "electron:build" },
  },
];

const STATS = [
  { num: "60", unit: "fps", label: "Buttery smooth" },
  { num: "0", unit: "ms", label: "Input lag felt" },
  { num: "~3", unit: "mb", label: "App size" },
  { num: "∞", unit: "", label: "One more game" },
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

function AppMockup({ showLeaderboard, setShowLeaderboard, highScores }) {
  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column" }}>
      {/* Glow ring */}
      <div style={{
        position: "absolute", inset: -60,
        background: "radial-gradient(ellipse at center, rgba(153,102,255,0.07) 0%, transparent 65%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      {/* Menu bar strip */}
      <div style={{
        background: "rgba(30,30,40,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px 12px 0 0",
        padding: "8px 16px",
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        gap: 12, width: 340,
      }}>
        {["Tue 9:41", "WiFi", "🔋"].map(item => (
          <span key={item} style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "DM Mono, monospace" }}>{item}</span>
        ))}
        <span style={{ fontSize: 11, color: "#9966ff", fontWeight: 500, fontFamily: "DM Mono, monospace" }}>🏓</span>
      </div>

      {/* App window */}
      <div style={{
        width: 340, background: "#0d0d0f",
        border: "1px solid rgba(153,102,255,0.25)", borderTop: "none",
        borderRadius: "0 0 16px 16px", overflow: "hidden",
        boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(153,102,255,0.1)",
      }}>
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px 8px", borderBottom: "1px solid #1a1a22",
        }}>
          <span style={{ fontSize: 9, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9966ff", fontFamily: "var(--font)" }}>TRAY PONG</span>
          <div style={{ display: "flex", gap: 8, position: "relative" }}>
            <span style={{ fontSize: 12, color: "#33333f" }}>🔈</span>
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              style={{
                fontSize: 12, color: "#33333f", background: "none", border: "none",
                cursor: "pointer", padding: 0, borderRadius: 2,
                transition: "color 0.2s ease"
              }}
              onMouseEnter={(e) => e.target.style.color = "#9966ff"}
              onMouseLeave={(e) => e.target.style.color = "#33333f"}
            >
              🏆
            </button>
            <span style={{ fontSize: 12, color: "#33333f" }}>✕</span>
            
            {/* Leaderboard Dropdown */}
            {showLeaderboard && (
              <div style={{
                position: "absolute", top: "100%", right: 0, marginTop: "4px",
                background: "#0d0d0f", border: "1px solid #1a1a22", borderRadius: "6px",
                padding: "8px", minWidth: "200px", zIndex: 1000,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
              }}>
                <div style={{
                  color: "#9966ff", fontSize: "10px", fontWeight: "bold",
                  marginBottom: "6px", textAlign: "center", letterSpacing: "0.1em"
                }}>
                  🏆 TOP 10 HIGH SCORES ({highScores.length} found)
                </div>
                <div style={{ color: "#666", fontSize: "8px", marginBottom: "4px", textAlign: "center" }}>
                  {highScores.length > 0 ? `Sample: ${highScores[0].playerName || 'No name'} - ${highScores[0].score || 'No score'}` : 'No data'}
                </div>
                {highScores.length > 0 ? (
                  highScores.slice(0, 10).map((score, index) => (
                    <div key={index} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "3px 0", fontSize: "9px",
                      color: index === 0 ? "#c299ff" : "#f0f0fa",
                      fontWeight: index < 3 ? "bold" : "normal"
                    }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ opacity: 0.6, minWidth: "12px" }}>
                          {index + 1}.
                        </span>
                        <span>{score.playerName}</span>
                      </span>
                      <span>{score.score}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ color: "#666", fontSize: "9px", textAlign: "center", padding: "8px 0" }}>
                    No high scores yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scores */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 20, padding: "10px 20px 8px", background: "#0d0d0f",
        }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 9, letterSpacing: "0.1em", color: "#44444f", fontFamily: "DM Mono, monospace" }}>AI</span>
            <span style={{ fontFamily: "Syne, sans-serif", fontSize: 32, fontWeight: 800, lineHeight: 1, color: "#e84040" }}>3</span>
          </div>
          <span style={{ fontSize: 16, color: "#2a2a35" }}>:</span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontFamily: "Syne, sans-serif", fontSize: 32, fontWeight: 800, lineHeight: 1, color: "#f0f0fa" }}>5</span>
            <span style={{ fontSize: 9, letterSpacing: "0.1em", color: "#44444f", fontFamily: "DM Mono, monospace" }}>YOU</span>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ position: "relative", width: 340, height: 240, background: "linear-gradient(180deg, #14141a 0%, #0d0d0f 100%)", overflow: "hidden" }}>
          {/* Net */}
          <div style={{
            position: "absolute", left: "50%", top: 0, bottom: 0, width: 1,
            background: "repeating-linear-gradient(to bottom, #2a2a35 0, #2a2a35 6px, transparent 6px, transparent 12px)",
          }} />
          {/* AI paddle */}
          <div style={{
            position: "absolute", top: 14, left: 100, width: 80, height: 7,
            borderRadius: 3.5, background: "#e84040",
            boxShadow: "0 0 12px rgba(232,64,64,0.5)",
            animation: "mockAi 3s ease-in-out infinite",
          }} />
          {/* Player paddle */}
          <div style={{
            position: "absolute", bottom: 14, left: 130, width: 80, height: 7,
            borderRadius: 3.5, background: "#f0f0fa",
            boxShadow: "0 0 12px rgba(240,240,255,0.3)",
            animation: "mockPlayer 3s ease-in-out infinite 0.3s",
          }} />
          {/* Trail dots */}
          {[0, -0.15, -0.3].map((delay, i) => (
            <div key={i} style={{
              position: "absolute", width: 6 - i, height: 6 - i,
              borderRadius: "50%", background: "rgba(200,170,255,0.3)",
              animation: `mockBall 3s linear infinite`,
              animationDelay: `${delay}s`,
              opacity: 1 - i * 0.25,
            }} />
          ))}
          {/* Ball */}
          <div style={{
            position: "absolute", width: 9, height: 9, borderRadius: "50%",
            background: "#f0f0ff", boxShadow: "0 0 12px rgba(200,170,255,0.9)",
            animation: "mockBall 3s linear infinite",
          }} />
        </div>
      </div>
    </div>
  );
}

export default function TrayPongLanding({ onStartGame }) {
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorGrow, setCursorGrow] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [highScores, setHighScores] = useState([]);
  const containerRef = useRef(null);

  // Load high scores from localStorage
  useEffect(() => {
    const loadHighScores = () => {
      try {
        const scores = JSON.parse(localStorage.getItem('traypong-highscores') || '[]');
        // Add backward compatibility for old scores
        const processedScores = scores.map(score => ({
          ...score,
          playerName: score.playerName || 'Anonymous',
          roundsWon: score.roundsWon || 0,
        }));
        setHighScores(processedScores);
      } catch (error) {
        console.error('Failed to load high scores:', error);
        setHighScores([]);
      }
    };

    loadHighScores();
    
    // Check for new scores every 2 seconds
    const interval = setInterval(loadHighScores, 2000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  const hoverProps = {
    onMouseEnter: () => setCursorGrow(true),
    onMouseLeave: () => setCursorGrow(false),
  };

  return (
    <div
      ref={containerRef}
      style={{
        background: "#080810", color: "#f0f0fa",
        fontFamily: "'DM Mono', monospace",
        WebkitFontSmoothing: "antialiased",
        position: "relative", overflowX: "hidden",
        cursor: "none",
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

      {/* Custom cursor */}
      <div style={{
        position: "absolute",
        left: cursorPos.x, top: cursorPos.y,
        width: cursorGrow ? 28 : 10, height: cursorGrow ? 28 : 10,
        borderRadius: "50%",
        background: cursorGrow ? "rgba(194,153,255,0.5)" : "#9966ff",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none", zIndex: 9999,
        transition: "width 0.2s ease, height 0.2s ease, background 0.2s ease",
        mixBlendMode: "screen",
      }} />

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
            ["#howto", "Install"],
            ["download", "Play Demo"]
          ].map(([href, label]) => (
            <a key={href} href={href} {...hoverProps} style={{ fontSize: "clamp(10px, 2.5vw, 11px)", letterSpacing: "0.1em", textTransform: "uppercase", color: "#55556a", textDecoration: "none", fontFamily: "var(--font)" }}>{label}</a>
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
            <button onClick={onStartGame} {...hoverProps} style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              background: "#9966ff", color: "#fff",
              fontFamily: "'DM Mono', monospace", fontSize: "clamp(12px, 3vw, 13px)", fontWeight: 500,
              letterSpacing: "0.04em", padding: "clamp(12px, 3vw, 14px) clamp(24px, 6vw, 28px)", borderRadius: 6,
              textDecoration: "none", border: "none", cursor: "none",
              transition: "background 0.2s, transform 0.15s",
            }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4 4 4-4M3 14h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Play Now
            </button>
            <a href="#features" {...hoverProps} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "transparent", color: "#55556a",
              fontFamily: "'DM Mono', monospace", fontSize: "clamp(11px, 2.8vw, 12px)",
              letterSpacing: "0.04em", padding: "clamp(12px, 3vw, 14px) clamp(16px, 4vw, 20px)", borderRadius: 6,
              textDecoration: "none", border: "1px solid rgba(255,255,255,0.07)", cursor: "none",
            }}>
              See features →
            </a>
          </div>
        </div>
      </section>

      {/* ── App Mockup ── */}
      <section style={{ padding: "20px 24px 100px", display: "flex", justifyContent: "center" }}>
        <Reveal>
          <AppMockup 
            showLeaderboard={showLeaderboard} 
            setShowLeaderboard={setShowLeaderboard} 
            highScores={highScores} 
          />
        </Reveal>
      </section>

      {/* ── Stats ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        margin: "0 48px",
      }}>
        {STATS.map(({ num, unit, label }, i) => (
          <Reveal key={label} delay={i * 0.1}>
            <div style={{ 
              padding: "clamp(24px, 4vw, 32px) clamp(20px, 3vw, 32px)", 
              borderRight: i < 3 ? "1px solid rgba(255,255,255,0.07)" : "none" 
            }}>
              <div style={{ 
                fontFamily: "'Syne', sans-serif", 
                fontSize: "clamp(32px, 6vw, 40px)", 
                fontWeight: 800, 
                letterSpacing: "-0.03em", 
                color: "#f0f0fa", 
                lineHeight: 1, 
                marginBottom: "clamp(4px, 1vw, 8px)" 
              }}>
                {num}<span style={{ color: "#9966ff" }}>{unit}</span>
              </div>
              <div style={{ 
                fontSize: "clamp(9px, 2vw, 11px)", 
                color: "#55556a", 
                letterSpacing: "0.05em" 
              }}>{label}</div>
            </div>
          </Reveal>
        ))}
      </div>

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
              <FeatureCard icon={icon} title={title} desc={desc} tag={tag} hoverProps={hoverProps} />
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
            Two ways <em style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, color: "#55556a" }}>to run it.</em>
          </h2>
        </Reveal>

        <div style={{ 
          paddingLeft: "clamp(24px, 5vw, 48px)", 
          position: "relative" 
        }}>
          <div style={{ 
            position: "absolute", left: "clamp(12px, 3vw, 16px)", 
            top: 20, bottom: 20, width: 1, 
            background: "linear-gradient(to bottom, #9966ff, rgba(153,102,255,0.1))" 
          }} />
          {STEPS.map(({ num, title, desc, code }, i) => (
            <Reveal key={num} delay={i * 0.07}>
              <div style={{ 
                position: "relative", 
                padding: "clamp(20px, 4vw, 28px) 0", 
                borderBottom: i < STEPS.length - 1 ? "1px solid rgba(255,255,255,0.07)" : "none" 
              }}>
                <div style={{
                  position: "absolute", left: "clamp(-32px, -6vw, -40)", top: "clamp(20px, 4vw, 28px)",
                  width: "clamp(28px, 5vw, 32px)", height: "clamp(28px, 5vw, 32px)", borderRadius: "50%",
                  background: "#0f0f1a", border: "1px solid rgba(153,102,255,0.35)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "clamp(10px, 2.5vw, 11px)", color: "#9966ff", fontWeight: 500,
                }}>{num}</div>
                <div style={{ 
                  fontFamily: "'Syne', sans-serif", 
                  fontSize: "clamp(18px, 4vw, 20px)", 
                  fontWeight: 700, marginBottom: "clamp(6px, 2vw, 8px)" 
                }}>{title}</div>
                <p style={{ 
                  fontSize: "clamp(12px, 3vw, 13px)", 
                  lineHeight: 1.7, color: "#55556a", 
                  maxWidth: "100%" 
                }}>{desc}</p>
                {code && (
                  <div style={{ 
                    marginTop: "clamp(8px, 2vw, 12px)", 
                    background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.07)", 
                    borderRadius: 6, padding: "clamp(8px, 2vw, 12px) clamp(12px, 3vw, 16px)", 
                    fontSize: "clamp(11px, 2.8vw, 12px)", color: "#c8c8d8", 
                    display: "inline-block", overflowX: "auto", maxWidth: "100%"
                  }}>
                    <span style={{ color: "#c299ff" }}>{code.cmd}</span>{" "}
                    <span style={{ color: "#7ec8a4" }}>{code.sub}</span>
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
          <div style={{ 
            display: "inline-flex", flexDirection: "column", alignItems: "center", 
            gap: "clamp(12px, 3vw, 14px)" 
          }}>
            <button onClick={onStartGame} {...hoverProps} style={{
              display: "inline-flex", alignItems: "center", gap: "clamp(10px, 2.5vw, 12px)",
              background: "#f0f0fa", color: "#080810",
              fontFamily: "'Syne', sans-serif", fontSize: "clamp(14px, 3.5vw, 16px)", fontWeight: 700,
              letterSpacing: "0.02em", 
              padding: "clamp(14px, 3.5vw, 18px) clamp(32px, 7vw, 40px)", 
              borderRadius: 8,
              textDecoration: "none", border: "none", cursor: "none",
              transition: "transform 0.15s, box-shadow 0.2s",
              boxShadow: "0 0 60px rgba(240,240,255,0.15)",
              maxWidth: "100%",
            }}>
              <span style={{ fontSize: "clamp(18px, 4vw, 20px)" }}>🏓</span>
              <span>
                Play TrayPong Now
                <small style={{ 
                  display: "block", fontFamily: "'DM Mono', monospace", 
                  fontSize: "clamp(9px, 2.2vw, 10px)", fontWeight: 400, 
                  opacity: 0.5, letterSpacing: "0.05em", marginTop: 1 
                }}>
                  Start playing instantly
                </small>
              </span>
            </button>
            <span style={{ 
              fontSize: "clamp(9px, 2.2vw, 10px)", 
              letterSpacing: "0.1em", color: "#55556a", textTransform: "uppercase" 
            }}>Free & Open Source</span>
            <p style={{ 
              fontSize: "clamp(10px, 2.5vw, 11px)", 
              color: "#2a2a35", letterSpacing: "0.04em",
              maxWidth: "clamp(250px, 70vw, 350px)",
              margin: "0 auto"
            }}>No account needed · No telemetry · Just Pong</p>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer style={{ 
        borderTop: "1px solid rgba(255,255,255,0.07)", 
        padding: "clamp(24px, 5vw, 32px) clamp(24px, 5vw, 48px)", 
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: "clamp(16px, 3vw, 20px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(12px, 3vw, 16px)" }}>
          <span style={{ 
            fontFamily: "'Syne', sans-serif", fontWeight: 800, 
            fontSize: "clamp(12px, 3vw, 13px)", color: "#f0f0fa" 
          }}>TRAYPONG</span>
          <span style={{ 
            fontSize: "clamp(10px, 2.5vw, 11px)", 
            color: "#55556a" 
          }}>Built with React + Electron</span>
        </div>
        <div style={{ 
          display: "flex", gap: "clamp(16px, 4vw, 24px)", 
          flexWrap: "wrap"
        }}>
          {[["#features", "Features"], ["#howto", "Install"], ["tray-pong.zip", "Download"]].map(([href, label]) => (
            <a key={label} href={href} {...hoverProps} style={{ 
              fontSize: "clamp(10px, 2.5vw, 11px)", 
              color: "#55556a", textDecoration: "none" 
            }}>{label}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, tag, hoverProps }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => { setHovered(true); hoverProps.onMouseEnter(); }}
      onMouseLeave={() => { setHovered(false); hoverProps.onMouseLeave(); }}
      style={{
        background: hovered ? "#161624" : "#0f0f1a",
        padding: "32px 28px",
        border: `1px solid ${hovered ? "rgba(153,102,255,0.35)" : "rgba(255,255,255,0.07)"}`,
        transition: "border-color 0.2s, background 0.2s",
        position: "relative", overflow: "hidden", cursor: "none",
        height: "100%",
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
