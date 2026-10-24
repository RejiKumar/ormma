const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Gradient background
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#4A90E2');
  grad.addColorStop(1, '#2E5BBA');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(0, 0, size, size, size * 0.22) : (() => {
    const r = size * 0.22;
    ctx.moveTo(r, 0);
    ctx.arcTo(size, 0, size, r, r);
    ctx.arcTo(size, size, size - r, size, r);
    ctx.arcTo(0, size, 0, size - r, r);
    ctx.arcTo(0, 0, r, 0, r);
    ctx.closePath();
  })();
  ctx.fill();
  
  // White heart shape
  ctx.fillStyle = '#FFFFFF';
  ctx.save();
  ctx.translate(size * 0.5, size * 0.58);
  const heartSize = size * 0.32;
  ctx.beginPath();
  ctx.moveTo(0, heartSize * 0.3);
  ctx.bezierCurveTo(0, heartSize * 0.1, -heartSize * 0.5, 0, -heartSize * 0.5, heartSize * 0.25);
  ctx.bezierCurveTo(-heartSize * 0.5, heartSize * 0.55, 0, heartSize * 0.85, 0, heartSize);
  ctx.bezierCurveTo(0, heartSize * 0.85, heartSize * 0.5, heartSize * 0.55, heartSize * 0.5, heartSize * 0.25);
  ctx.bezierCurveTo(heartSize * 0.5, 0, 0, heartSize * 0.1, 0, heartSize * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  
  // Speech bubble/mic icon
  ctx.fillStyle = '#2E5BBA';
  ctx.beginPath();
  ctx.arc(size * 0.68, size * 0.32, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  // Mic
  ctx.fillRect(size * 0.66, size * 0.28, size * 0.04, size * 0.08);
  ctx.beginPath();
  ctx.arc(size * 0.68, size * 0.38, size * 0.02, 0, Math.PI);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = size * 0.02;
  ctx.stroke();
  
  return canvas.toBuffer('image/png');
}

const assetsDir = path.join(__dirname, '..', 'mobile', 'assets');
fs.writeFileSync(path.join(assetsDir, 'icon.png'), drawIcon(1024));
fs.writeFileSync(path.join(assetsDir, 'splash-icon.png'), drawIcon(1024));
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), drawIcon(48));

// Foreground for adaptive icon (transparent bg concept - white on transparent)
function drawForeground(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.save();
  ctx.translate(size * 0.5, size * 0.58);
  const heartSize = size * 0.32;
  ctx.beginPath();
  ctx.moveTo(0, heartSize * 0.3);
  ctx.bezierCurveTo(0, heartSize * 0.1, -heartSize * 0.5, 0, -heartSize * 0.5, heartSize * 0.25);
  ctx.bezierCurveTo(-heartSize * 0.5, heartSize * 0.55, 0, heartSize * 0.85, 0, heartSize);
  ctx.bezierCurveTo(0, heartSize * 0.85, heartSize * 0.5, heartSize * 0.55, heartSize * 0.5, heartSize * 0.25);
  ctx.bezierCurveTo(heartSize * 0.5, 0, 0, heartSize * 0.1, 0, heartSize * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // Mic
  ctx.fillStyle = '#4A90E2';
  ctx.beginPath();
  ctx.arc(size * 0.68, size * 0.32, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(size * 0.66, size * 0.28, size * 0.04, size * 0.08);
  ctx.beginPath();
  ctx.arc(size * 0.68, size * 0.38, size * 0.02, 0, Math.PI);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = size * 0.02;
  ctx.stroke();
  return canvas.toBuffer('image/png');
}

function drawBg(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#4A90E2');
  grad.addColorStop(1, '#2E5BBA');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas.toBuffer('image/png');
}

function drawMono(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000000';
  ctx.save();
  ctx.translate(size * 0.5, size * 0.58);
  const heartSize = size * 0.32;
  ctx.beginPath();
  ctx.moveTo(0, heartSize * 0.3);
  ctx.bezierCurveTo(0, heartSize * 0.1, -heartSize * 0.5, 0, -heartSize * 0.5, heartSize * 0.25);
  ctx.bezierCurveTo(-heartSize * 0.5, heartSize * 0.55, 0, heartSize * 0.85, 0, heartSize);
  ctx.bezierCurveTo(0, heartSize * 0.85, heartSize * 0.5, heartSize * 0.55, heartSize * 0.5, heartSize * 0.25);
  ctx.bezierCurveTo(heartSize * 0.5, 0, 0, heartSize * 0.1, 0, heartSize * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  return canvas.toBuffer('image/png');
}

fs.writeFileSync(path.join(assetsDir, 'android-icon-foreground.png'), drawForeground(1024));
fs.writeFileSync(path.join(assetsDir, 'android-icon-background.png'), drawBg(1024));
fs.writeFileSync(path.join(assetsDir, 'android-icon-monochrome.png'), drawMono(1024));
console.log('done');
