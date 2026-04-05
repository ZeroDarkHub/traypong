/**
 * electron/generate-icon.js
 * Generates a simple tray icon PNG with "TrayPong" text.
 * Run once: node electron/generate-icon.js
 * Requires: npm install canvas
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function createTrayIcon() {
  const canvas = createCanvas(16, 16);
  const ctx = canvas.getContext('2d');
  
  // Clear with transparent background
  ctx.clearRect(0, 0, 16, 16);
  
  // Draw "TP" text in white (shorter version for better visibility)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 8px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TP', 8, 8);
  
  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  const iconPath = path.join(__dirname, '../electron/tray-icon.png');
  fs.writeFileSync(iconPath, buffer);
  
  console.log('TrayPong icon generated:', iconPath);
  console.log('TP text in white');
}

// Run the function
createTrayIcon();
