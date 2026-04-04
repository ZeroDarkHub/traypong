/**
 * electron/generate-icon.js
 * Generates a simple tray icon PNG programmatically using canvas.
 * Run once: node electron/generate-icon.js
 * Requires: npm install canvas (or use the pre-generated one)
 */

// This script is optional — if you have a real icon PNG, place it at
// electron/tray-icon.png (16x16 or 32x32, ideally a "Template" image
// for macOS dark/light mode support).
//
// For development without the canvas package, a placeholder approach:
// The main.js handles the missing icon gracefully.

console.log('Place your 16x16 tray icon at: electron/tray-icon.png');
console.log('For macOS, use a "Template" image (black with transparency)');
console.log('for automatic dark/light mode adaptation.');
