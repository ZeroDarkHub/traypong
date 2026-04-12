import { useEffect } from "react";

export default function SecurityPolicy() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const section = (title, children) => (
    <div style={{ marginBottom: 48 }}>
      <h2 style={{
        fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800,
        letterSpacing: "-0.01em", color: "#f0f0fa", marginBottom: 16,
      }}>{title}</h2>
      {children}
    </div>
  );

  const p = (text) => (
    <p style={{ fontSize: 14, lineHeight: 1.8, color: "#888899", marginBottom: 12 }}>{text}</p>
  );

  const li = (text) => (
    <li style={{ fontSize: 14, lineHeight: 1.8, color: "#888899", marginBottom: 6 }}>{text}</li>
  );

  return (
    <div style={{
      background: "#080810", color: "#f0f0fa",
      fontFamily: "'DM Mono', monospace",
      WebkitFontSmoothing: "antialiased",
      height: "100vh",
      overflowY: "auto",
    }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet" />

      {/* Scanline overlay */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 998, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)" }} />

      {/* Nav */}
      <nav style={{
        position: "sticky", top: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px clamp(24px, 5vw, 48px)",
        background: "rgba(8,8,16,0.97)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.04)", zIndex: 100,
      }}>
        <a href="/" style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#55556a", textDecoration: "none" }}>
          ← Back
        </a>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(48px, 8vh, 80px) clamp(24px, 5vw, 48px)" }}>

        {/* Header */}
        <div style={{ marginBottom: 56 }}>
          <p style={{ fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9966ff", marginBottom: 16 }}>Legal</p>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 20 }}>
            Security Policy
          </h1>
          <p style={{ fontSize: 13, color: "#55556a" }}>Last updated: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        {/* Sections */}
        {section("Overview", <>
          {p("TrayPong is a free, open-source game that runs locally on your Mac. This security policy explains how the application is built, what data it does and does not collect, and how to report any security concerns.")}
        </>)}

        {section("No Data Collection", <>
          {p("TrayPong does not collect, transmit, or store any personal data on external servers. The application has no backend, no analytics, no tracking, and no telemetry of any kind.")}
          {p("The only data stored by TrayPong is your leaderboard scores and player name, which are saved exclusively in your browser's localStorage or Electron's local storage on your own device. This data never leaves your machine.")}
        </>)}

        {section("No Network Requests", <>
          {p("Once installed, TrayPong makes no outbound network requests during gameplay. The application runs entirely offline. The only external resource loaded is Google Fonts, which is fetched by the landing page in your browser — not by the desktop app itself.")}
        </>)}

        {section("Electron Security", <>
          {p("The desktop application is built with Electron and follows Electron's recommended security practices:")}
          <ul style={{ paddingLeft: 20, marginBottom: 12 }}>
            {li("Node integration is disabled in the renderer process.")}
            {li("Context isolation is enabled, separating the main and renderer processes.")}
            {li("A preload script (contextBridge) is used to expose only the minimal API surface needed for window management.")}
            {li("No remote content is loaded inside the Electron window.")}
          </ul>
        </>)}

        {section("macOS Gatekeeper", <>
          {p("TrayPong is not signed with an Apple Developer certificate. This means macOS Gatekeeper will show a warning on first launch. This is expected behaviour for independently distributed software.")}
          {p("To verify the integrity of the application yourself, you can inspect the full source code before building. The source is available and the app can be built locally from scratch using npm run electron:build.")}
        </>)}

        {section("Open Source", <>
          {p("TrayPong is open source. You are encouraged to review the code before running it. All game logic, sound generation, and Electron configuration are fully visible and auditable.")}
        </>)}

        {section("Reporting a Vulnerability", <>
          {p("If you discover a security vulnerability in TrayPong, please report it responsibly. Do not open a public GitHub issue for security-related findings.")}
          {p("To report a vulnerability, contact us via Buy Me a Coffee at buymeacoffee.com/netwoke with a description of the issue, steps to reproduce, and the potential impact. We will respond as quickly as possible and credit you if a fix is released.")}
        </>)}

        {section("Scope", <>
          {p("This security policy applies to the TrayPong desktop application and its associated landing page. It does not cover third-party services such as Buy Me a Coffee, which have their own privacy and security policies.")}
        </>)}

        {section("Changes to This Policy", <>
          {p("This policy may be updated from time to time. The date at the top of this page will reflect the most recent revision. Continued use of TrayPong after any changes constitutes acceptance of the updated policy.")}
        </>)}

        {/* Divider */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 32, marginTop: 16 }}>
          <p style={{ fontSize: 12, color: "#33333f", lineHeight: 1.7 }}>
            TrayPong is a free, independent project. It is provided as-is with no warranty. Use at your own discretion.
          </p>
        </div>
      </div>

    </div>
  );
}
