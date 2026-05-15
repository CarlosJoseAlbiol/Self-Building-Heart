const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const W = 500;
const H = 500;
canvas.width = W;
canvas.height = H;

// ─── Heart parametric equations ───────────────────────────────────────────────
function heartX(t) {
  return 16 * Math.pow(Math.sin(t), 3);
}

function heartY(t) {
  return -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
}

const SCALE = 13;
const CX = W / 2;
const CY = H / 2 + 20;
const TOTAL_POINTS = 360;

// ─── Pre-compute heart path points ────────────────────────────────────────────
const heartPoints = [];
for (let i = 0; i <= TOTAL_POINTS; i++) {
  const t = (i / TOTAL_POINTS) * 2 * Math.PI;
  heartPoints.push({
    x: CX + heartX(t) * SCALE,
    y: CY + heartY(t) * SCALE,
  });
}

// ─── Config ───────────────────────────────────────────────────────────────────
const SPIRAL_TURNS   = 5;     // how many full rotations the spiral makes
const SPIRAL_FRAMES  = 260;   // frames for the outward spiral phase (slow build-up)
const DRAW_SPEED     = 0.7;   // heart-points advanced per frame (super slow)
const TRAIL_LEN      = 32;    // laser tip trail length

// ─── Laser colors along the heart ─────────────────────────────────────────────
const COLORS = [
  '#ff2d78',
  '#ff6ec7',
  '#ff0055',
  '#c800ff',
  '#ff4fa3',
  '#ff69b4',
];

function getColor(i) {
  return COLORS[Math.floor((i / TOTAL_POINTS) * COLORS.length)];
}

// ─── State ────────────────────────────────────────────────────────────────────
let frame       = 0;
let drawn       = 0;
let done        = false;
let glowPulse   = 0;
let animId      = null;
const trailHistory = [];

// ─── Spiral OUTWARD from center ───────────────────────────────────────────────
function getSpiralPos(f) {
  const prog  = f / SPIRAL_FRAMES;
  const angle = prog * SPIRAL_TURNS * 2 * Math.PI - Math.PI / 2;
  const maxR  = 175;
  const r     = maxR * prog; // grows from 0 outward
  return {
    x: CX + Math.cos(angle) * r,
    y: CY + Math.sin(angle) * r,
  };
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function drawFrame() {
  // Persistent dark fade for trail effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
  ctx.fillRect(0, 0, W, H);

  frame++;

  // ── Phase 1: Spiral outward from center ──────────────────────────────────
  if (frame <= SPIRAL_FRAMES) {
    const pos  = getSpiralPos(frame);
    const prog = frame / SPIRAL_FRAMES;

    trailHistory.push({ ...pos });
    if (trailHistory.length > 80) trailHistory.shift();

    // Draw spiral trail
    for (let i = 1; i < trailHistory.length; i++) {
      const t  = i / trailHistory.length;
      const p1 = trailHistory[i - 1];
      const p2 = trailHistory[i];
      const hue = 300 + t * 70;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = `hsl(${hue}, 100%, 62%)`;
      ctx.lineWidth   = 1.8 * t;
      ctx.globalAlpha = t * 0.85;
      ctx.shadowColor = `hsl(${hue}, 100%, 62%)`;
      ctx.shadowBlur  = 10 * t;
      ctx.stroke();
    }

    // Bright glowing head at spiral tip
    const headR = 3 + prog * 3;
    const grad  = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, headR * 4);
    grad.addColorStop(0,   'rgba(255, 255, 255, 0.99)');
    grad.addColorStop(0.25,'rgba(255, 45,  120, 0.95)');
    grad.addColorStop(0.7, 'rgba(200, 0,   255, 0.4)');
    grad.addColorStop(1,   'rgba(200, 0,   255, 0)');
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, headR * 4, 0, Math.PI * 2);
    ctx.fillStyle   = grad;
    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;
    ctx.fill();

    // Small center spark at the very start
    if (prog < 0.15) {
      const fade   = 1 - prog / 0.15;
      const sparkR = fade * 10 + 2;
      const sg     = ctx.createRadialGradient(CX, CY, 0, CX, CY, sparkR);
      sg.addColorStop(0,   'rgba(255, 255, 255, 0.9)');
      sg.addColorStop(0.5, 'rgba(255, 45,  120, 0.5)');
      sg.addColorStop(1,   'rgba(200, 0,   255, 0)');
      ctx.beginPath();
      ctx.arc(CX, CY, sparkR, 0, Math.PI * 2);
      ctx.fillStyle   = sg;
      ctx.globalAlpha = fade;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;

  // ── Phase 2: Laser slowly draws the heart outline ────────────────────────
  } else if (!done) {
    drawn += DRAW_SPEED;
    if (drawn >= TOTAL_POINTS) {
      drawn = TOTAL_POINTS;
      done  = true;
    }

    const end = Math.floor(drawn);

    // Draw completed heart segments
    for (let i = 1; i <= end; i++) {
      const p1    = heartPoints[i - 1];
      const p2    = heartPoints[i];
      const color = getColor(i);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1.8;
      ctx.shadowColor = color;
      ctx.shadowBlur  = 10;
      ctx.globalAlpha = 1;
      ctx.stroke();
    }

    // Laser tip glow trail
    const trailStart = Math.max(0, end - TRAIL_LEN);
    for (let i = trailStart; i <= end; i++) {
      const p     = heartPoints[i];
      const t     = (i - trailStart) / TRAIL_LEN;
      const color = getColor(i);

      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.8 * t + 0.5, 0, Math.PI * 2);
      ctx.fillStyle   = color;
      ctx.globalAlpha = t;
      ctx.shadowColor = color;
      ctx.shadowBlur  = 32;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur  = 0;

  // ── Phase 3: Pulse glow after heart is fully drawn ─────────────────────────
  } else {
    glowPulse += 0.04;
    const glow  = 12 + Math.sin(glowPulse) * 9;
    const scale = 1 + Math.sin(glowPulse * 0.5) * 0.022;

    ctx.save();
    ctx.translate(CX, CY);
    ctx.scale(scale, scale);
    ctx.translate(-CX, -CY);

    for (let i = 1; i <= TOTAL_POINTS; i++) {
      const p1    = heartPoints[i - 1];
      const p2    = heartPoints[i];
      const color = getColor(i);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.2;
      ctx.shadowColor = color;
      ctx.shadowBlur  = glow;
      ctx.stroke();
    }

    ctx.restore();
    ctx.shadowBlur = 0;
  }

  animId = requestAnimationFrame(drawFrame);
}

// ─── Restart ──────────────────────────────────────────────────────────────────
function restart() {
  cancelAnimationFrame(animId);
  frame             = 0;
  drawn             = 0;
  done              = false;
  glowPulse         = 0;
  trailHistory.length = 0;
  ctx.clearRect(0, 0, W, H);
  drawFrame();
}

document.getElementById('restart-btn').addEventListener('click', restart);

// ─── Kick off ─────────────────────────────────────────────────────────────────
drawFrame();
