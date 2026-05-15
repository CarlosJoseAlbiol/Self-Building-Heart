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

// ─── Swirl phase: spiral from center outward ──────────────────────────────────
// Each heart point is "revealed" from center by lerping from (CX, CY) to its
// true position over the swirl duration.
const SWIRL_FRAMES = 90;   // frames to uncoil from center
const DRAW_SPEED  = 3.5;   // heart-points advanced per frame after swirl
const TRAIL_LEN   = 22;    // laser tip trail length

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

// ─── Swirl helpers ────────────────────────────────────────────────────────────
// Returns the screen position of heart point i during the swirl phase.
// progress: 0 = fully at center, 1 = fully at true position.
function getSwirlPoint(i, progress) {
  const p = heartPoints[i];
  return {
    x: CX + (p.x - CX) * progress,
    y: CY + (p.y - CY) * progress,
  };
}

// ─── Draw ─────────────────────────────────────────────────────────────────────
function drawFrame() {
  // Persistent dark fade for trail effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, W, H);

  frame++;

  // ── Phase 1: Swirl (spiral uncoiling from center) ─────────────────────────
  if (frame <= SWIRL_FRAMES) {
    const progress = frame / SWIRL_FRAMES; // 0 → 1

    // Draw all heart segments, morphing from center outward
    for (let i = 1; i <= TOTAL_POINTS; i++) {
      const p1 = getSwirlPoint(i - 1, progress);
      const p2 = getSwirlPoint(i, progress);
      const color = getColor(i);

      // Add a swirl rotation offset — each point lags based on its index,
      // creating the spiral unwind illusion
      const lag = (1 - i / TOTAL_POINTS) * (1 - progress) * Math.PI * 2;
      const rx1 = CX + (p1.x - CX) * Math.cos(lag) - (p1.y - CY) * Math.sin(lag);
      const ry1 = CY + (p1.x - CX) * Math.sin(lag) + (p1.y - CY) * Math.cos(lag);
      const rx2 = CX + (p2.x - CX) * Math.cos(lag) - (p2.y - CY) * Math.sin(lag);
      const ry2 = CY + (p2.x - CX) * Math.sin(lag) + (p2.y - CY) * Math.cos(lag);

      const alpha = progress * 0.85;
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.moveTo(rx1, ry1);
      ctx.lineTo(rx2, ry2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10 * progress;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Bright center spark during swirl
    const sparkR = (1 - progress) * 18 + 2;
    const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, sparkR);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.4, 'rgba(255, 45, 120, 0.7)');
    grad.addColorStop(1, 'rgba(200, 0, 255, 0)');
    ctx.beginPath();
    ctx.arc(CX, CY, sparkR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

  // ── Phase 2: Laser drawing along the settled heart ─────────────────────────
  } else if (!done) {
    drawn += DRAW_SPEED;
    if (drawn >= TOTAL_POINTS) {
      drawn = TOTAL_POINTS;
      done = true;
    }

    const end = Math.floor(drawn);

    // Draw completed segments
    for (let i = 1; i <= end; i++) {
      const p1 = heartPoints[i - 1];
      const p2 = heartPoints[i];
      const color = getColor(i);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.stroke();
    }

    // Laser tip glow trail
    const trailStart = Math.max(0, end - TRAIL_LEN);
    for (let i = trailStart; i <= end; i++) {
      const p = heartPoints[i];
      const t = (i - trailStart) / TRAIL_LEN;
      const color = getColor(i);

      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5 * t + 1, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = t;
      ctx.shadowColor = color;
      ctx.shadowBlur = 28;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

  // ── Phase 3: Pulse glow after heart is fully drawn ─────────────────────────
  } else {
    glowPulse += 0.06;
    const glow  = 14 + Math.sin(glowPulse) * 9;
    const scale = 1 + Math.sin(glowPulse * 0.5) * 0.025;

    ctx.save();
    ctx.translate(CX, CY);
    ctx.scale(scale, scale);
    ctx.translate(-CX, -CY);

    for (let i = 1; i <= TOTAL_POINTS; i++) {
      const p1 = heartPoints[i - 1];
      const p2 = heartPoints[i];
      const color = getColor(i);

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = glow;
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
  frame     = 0;
  drawn     = 0;
  done      = false;
  glowPulse = 0;
  ctx.clearRect(0, 0, W, H);
  drawFrame();
}

document.getElementById('restart-btn').addEventListener('click', restart);

// ─── Kick off ─────────────────────────────────────────────────────────────────
drawFrame();