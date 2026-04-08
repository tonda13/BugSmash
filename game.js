// ─── BugSmash Game Engine ───────────────────────────────────────────
const VERSION = '1.1.1';

const DOT_TYPES = [
  { color: 'green',  points: 1,  weight: 40, size: 52 },
  { color: 'cyan',   points: 3,  weight: 30, size: 46 },
  { color: 'orange', points: 5,  weight: 20, size: 40 },
  { color: 'red',    points: 10, weight: 10, size: 34 },
];

const LEVELS = [
  null,
  { spawnInterval: 2000, maxDots: 1, dotLifetime: 3000 },
  { spawnInterval: 1700, maxDots: 1, dotLifetime: 2600 },
  { spawnInterval: 1400, maxDots: 2, dotLifetime: 2200 },
  { spawnInterval: 1200, maxDots: 2, dotLifetime: 1900 },
  { spawnInterval: 1000, maxDots: 2, dotLifetime: 1600 },
  { spawnInterval:  850, maxDots: 3, dotLifetime: 1400 },
  { spawnInterval:  700, maxDots: 3, dotLifetime: 1200 },
  { spawnInterval:  580, maxDots: 3, dotLifetime: 1000 },
  { spawnInterval:  480, maxDots: 4, dotLifetime:  850 },
  { spawnInterval:  400, maxDots: 4, dotLifetime:  700 },
  { spawnInterval:  330, maxDots: 4, dotLifetime:  600 },
  { spawnInterval:  270, maxDots: 5, dotLifetime:  500 },
  { spawnInterval:  220, maxDots: 5, dotLifetime:  430 },
  { spawnInterval:  180, maxDots: 5, dotLifetime:  370 },
  { spawnInterval:  150, maxDots: 6, dotLifetime:  320 },
  { spawnInterval:  125, maxDots: 6, dotLifetime:  280 },
  { spawnInterval:  105, maxDots: 7, dotLifetime:  240 },
  { spawnInterval:   90, maxDots: 7, dotLifetime:  200 },
  { spawnInterval:   75, maxDots: 8, dotLifetime:  160 },
  { spawnInterval:   60, maxDots: 8, dotLifetime:  300 },
];

const GAME_DURATION     = 90;
const LEVEL_UP_INTERVAL = 4;
const MAX_LIVES         = 5;
const HEART_LIFETIME    = 1000;
const HEART_INTERVAL_MIN = 8000;
const HEART_INTERVAL_MAX = 15000;

// ─── State ──────────────────────────────────────────────────────────
let state = {
  running: false, score: 0, lives: MAX_LIVES, level: 1,
  timeLeft: GAME_DURATION, activeDots: [],
  spawnTimer: null, gameTimer: null, heartTimer: null,
  activeHeart: null, lastNewScoreIndex: -1,
  pendingReload: false,
};

// ─── Audio ──────────────────────────────────────────────────────────
const AC = new (window.AudioContext || window.webkitAudioContext)();
function resumeAC() { if (AC.state === 'suspended') AC.resume(); }

function playHit(points) {
  resumeAC();
  const freq = { 1: 440, 3: 550, 5: 660, 10: 880 }[points] || 440;
  const o = AC.createOscillator(), g = AC.createGain();
  o.connect(g); g.connect(AC.destination);
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(freq * 1.5, AC.currentTime + .1);
  g.gain.setValueAtTime(.3, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + .25);
  o.start(); o.stop(AC.currentTime + .25);
}

function playMiss() {
  resumeAC();
  const o = AC.createOscillator(), g = AC.createGain();
  o.connect(g); g.connect(AC.destination);
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(180, AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(80, AC.currentTime + .2);
  g.gain.setValueAtTime(.2, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + .2);
  o.start(); o.stop(AC.currentTime + .2);
}

function playExpire() {
  resumeAC();
  const o = AC.createOscillator(), g = AC.createGain();
  o.connect(g); g.connect(AC.destination);
  o.type = 'triangle';
  o.frequency.setValueAtTime(300, AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(100, AC.currentTime + .3);
  g.gain.setValueAtTime(.15, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + .3);
  o.start(); o.stop(AC.currentTime + .3);
}

function playLevelUp() {
  resumeAC();
  [523, 659, 784, 1047].forEach((freq, i) => {
    const o = AC.createOscillator(), g = AC.createGain();
    o.connect(g); g.connect(AC.destination);
    o.type = 'sine'; o.frequency.value = freq;
    const t = AC.currentTime + i * .1;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.25, t + .05);
    g.gain.exponentialRampToValueAtTime(.001, t + .3);
    o.start(t); o.stop(t + .3);
  });
}

function playHeartCatch() {
  resumeAC();
  [523, 659, 784, 523, 1047].forEach((freq, i) => {
    const o = AC.createOscillator(), g = AC.createGain();
    o.connect(g); g.connect(AC.destination);
    o.type = 'sine'; o.frequency.value = freq;
    const t = AC.currentTime + i * .07;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.22, t + .03);
    g.gain.exponentialRampToValueAtTime(.001, t + .35);
    o.start(t); o.stop(t + .35);
    const o2 = AC.createOscillator(), g2 = AC.createGain();
    o2.connect(g2); g2.connect(AC.destination);
    o2.type = 'sine'; o2.frequency.value = freq * 1.005;
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(.08, t + .03);
    g2.gain.exponentialRampToValueAtTime(.001, t + .35);
    o2.start(t); o2.stop(t + .35);
  });
}

function playLoseLife() {
  resumeAC();
  const o = AC.createOscillator(), g = AC.createGain();
  o.connect(g); g.connect(AC.destination);
  o.type = 'square';
  o.frequency.setValueAtTime(200, AC.currentTime);
  o.frequency.exponentialRampToValueAtTime(40, AC.currentTime + .4);
  g.gain.setValueAtTime(.25, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(.001, AC.currentTime + .4);
  o.start(); o.stop(AC.currentTime + .4);
}

// ─── Helpers ────────────────────────────────────────────────────────
function weightedRandom() {
  const total = DOT_TYPES.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of DOT_TYPES) { r -= t.weight; if (r <= 0) return t; }
  return DOT_TYPES[0];
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
let dotIdCounter = 0;

// ─── DOM refs ───────────────────────────────────────────────────────
const arena     = document.getElementById('arena');
const scoreEl   = document.getElementById('score');
const levelEl   = document.getElementById('level-display');
const timeEl    = document.getElementById('time-display');
const livesEl   = document.getElementById('lives-display');
const missFlash = document.getElementById('miss-flash');

// ─── Score ──────────────────────────────────────────────────────────
function setScore(val) {
  state.score = val;
  scoreEl.textContent = val;
  scoreEl.classList.remove('pop');
  requestAnimationFrame(() => scoreEl.classList.add('pop'));
  setTimeout(() => scoreEl.classList.remove('pop'), 150);
}

// ─── Lives ──────────────────────────────────────────────────────────
function renderLives() {
  livesEl.innerHTML = '';
  for (let i = 0; i < MAX_LIVES; i++) {
    const h = document.createElement('span');
    h.className = 'life-icon' + (i < state.lives ? '' : ' lost');
    h.textContent = '❤️';
    livesEl.appendChild(h);
  }
}

function loseLife(x, y) {
  if (!state.running) return;
  state.lives--;
  playLoseLife();
  renderLives();
  triggerMissFlash();
  livesEl.classList.remove('shake-lives');
  requestAnimationFrame(() => livesEl.classList.add('shake-lives'));
  setTimeout(() => livesEl.classList.remove('shake-lives'), 400);
  if (state.lives <= 0) endGame();
}

// ─── Dot spawning ────────────────────────────────────────────────────
function spawnDot() {
  if (!state.running) return;
  const cfg = LEVELS[Math.min(state.level, LEVELS.length - 1)];
  if (state.activeDots.length >= cfg.maxDots) return;

  const type = weightedRandom();
  const id = ++dotIdCounter;
  const arenaW = arena.offsetWidth, arenaH = arena.offsetHeight;
  const margin = type.size;
  const x = clamp(Math.random() * arenaW, margin, arenaW - margin);
  const y = clamp(Math.random() * arenaH, margin, arenaH - margin);

  const el = document.createElement('div');
  el.className = 'dot';
  el.dataset.color = type.color;
  el.dataset.id = id;
  el.style.cssText = `width:${type.size}px;height:${type.size}px;left:${x}px;top:${y}px`;

  // Timer ring
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  const r = (type.size / 2) + 7, circ = 2 * Math.PI * r;
  svg.setAttribute('width', type.size + 20); svg.setAttribute('height', type.size + 20);
  svg.style.cssText = `position:absolute;top:-10px;left:-10px;pointer-events:none;transform:rotate(-90deg)`;
  const circle = document.createElementNS(svgNS, 'circle');
  circle.setAttribute('cx', r + 3); circle.setAttribute('cy', r + 3); circle.setAttribute('r', r);
  circle.setAttribute('fill', 'none');
  circle.setAttribute('stroke', getComputedStyle(document.documentElement).getPropertyValue(`--dot-${type.color}`).trim());
  circle.setAttribute('stroke-width', '2.5');
  circle.setAttribute('stroke-dasharray', circ); circle.setAttribute('stroke-dashoffset', '0');
  circle.setAttribute('opacity', '0.7');
  svg.appendChild(circle); el.appendChild(svg);

  const lifetime = cfg.dotLifetime, t0 = performance.now();
  let rafId;
  function animRing(now) {
    if (!state.running) return;
    const p = clamp((now - t0) / lifetime, 0, 1);
    circle.setAttribute('stroke-dashoffset', circ * p);
    if (p >= .7) el.classList.add('expiring');
    if (p < 1) rafId = requestAnimationFrame(animRing);
  }
  rafId = requestAnimationFrame(animRing);

  el.addEventListener('pointerdown', function onTap(e) {
    e.preventDefault(); e.stopPropagation();
    if (!state.running) return;
    cancelAnimationFrame(rafId); clearTimeout(dotEntry.timeout);
    removeDot(id, false);
    playHit(type.points); setScore(state.score + type.points);
    spawnParticles(x, y, type.color, true);
    showFloatScore(`+${type.points}`, x, y, type.color);
  });

  const dotEntry = {
    id, el, type, rafId,
    timeout: setTimeout(() => {
      cancelAnimationFrame(rafId);
      if (!state.running) return;
      removeDot(id, true);
      playExpire();
      loseLife(x, y);
      showFloatScore('💔', x, y, 'miss');
    }, lifetime),
  };
  state.activeDots.push(dotEntry);
  arena.appendChild(el);
}

function removeDot(id, expired) {
  const idx = state.activeDots.findIndex(d => d.id === id);
  if (idx === -1) return;
  const d = state.activeDots.splice(idx, 1)[0];
  d.el.style.pointerEvents = 'none';
  d.el.style.transition = 'transform .15s, opacity .15s';
  d.el.style.transform = expired ? 'translate(-50%,-50%) scale(0) rotate(20deg)' : 'translate(-50%,-50%) scale(1.4)';
  d.el.style.opacity = '0';
  setTimeout(() => d.el.remove(), 200);
}

// ─── Heart ──────────────────────────────────────────────────────────
function scheduleHeart() {
  if (!state.running || state.level < 9) return;
  const delay = HEART_INTERVAL_MIN + Math.random() * (HEART_INTERVAL_MAX - HEART_INTERVAL_MIN);
  state.heartTimer = setTimeout(() => {
    if (state.running && state.level >= 9) spawnHeart();
  }, delay);
}

function spawnHeart() {
  if (!state.running || state.activeHeart) return;
  const size = 48;
  const arenaW = arena.offsetWidth, arenaH = arena.offsetHeight;
  const margin = size + 10;
  const x = clamp(Math.random() * arenaW, margin, arenaW - margin);
  const y = clamp(Math.random() * arenaH, margin, arenaH - margin);

  const el = document.createElement('div');
  el.className = 'heart-pickup';
  el.textContent = '❤️';
  el.style.cssText = `left:${x}px;top:${y}px`;

  // Pink timer ring
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  const r = (size / 2) + 9, circ = 2 * Math.PI * r;
  svg.setAttribute('width', size + 24); svg.setAttribute('height', size + 24);
  svg.style.cssText = `position:absolute;top:-12px;left:-12px;pointer-events:none;transform:rotate(-90deg)`;
  const circle = document.createElementNS(svgNS, 'circle');
  circle.setAttribute('cx', r + 3); circle.setAttribute('cy', r + 3); circle.setAttribute('r', r);
  circle.setAttribute('fill', 'none'); circle.setAttribute('stroke', '#ff69b4');
  circle.setAttribute('stroke-width', '3');
  circle.setAttribute('stroke-dasharray', circ); circle.setAttribute('stroke-dashoffset', '0');
  circle.setAttribute('opacity', '0.85');
  svg.appendChild(circle); el.appendChild(svg);

  const t0 = performance.now();
  let rafId;
  function animRing(now) {
    if (!state.running) return;
    const p = clamp((now - t0) / HEART_LIFETIME, 0, 1);
    circle.setAttribute('stroke-dashoffset', circ * p);
    if (p >= .6) el.classList.add('expiring');
    if (p < 1) rafId = requestAnimationFrame(animRing);
  }
  rafId = requestAnimationFrame(animRing);

  el.addEventListener('pointerdown', function onTap(e) {
    e.preventDefault(); e.stopPropagation();
    if (!state.running) return;
    cancelAnimationFrame(rafId); clearTimeout(heartEntry.timeout);
    removeHeart(false);
    playHeartCatch();
    if (state.lives < MAX_LIVES) { state.lives++; renderLives(); }
    showFloatScore('+❤️', x, y, 'heart');
    spawnParticles(x, y, 'heart', true);
    scheduleHeart();
  });

  const heartEntry = {
    el, rafId,
    timeout: setTimeout(() => {
      cancelAnimationFrame(rafId);
      if (!state.running) return;
      removeHeart(true);
      scheduleHeart();
    }, HEART_LIFETIME),
  };
  state.activeHeart = heartEntry;
  arena.appendChild(el);
}

function removeHeart(expired) {
  if (!state.activeHeart) return;
  const h = state.activeHeart;
  state.activeHeart = null;
  h.el.style.pointerEvents = 'none';
  h.el.style.transition = 'transform .15s, opacity .15s';
  h.el.style.transform = expired ? 'translate(-50%,-50%) scale(0)' : 'translate(-50%,-50%) scale(1.5)';
  h.el.style.opacity = '0';
  setTimeout(() => h.el.remove(), 200);
}

// ─── Particles & floaters ────────────────────────────────────────────
const colorMap = {
  green:'#39ff14', cyan:'#00e5ff', orange:'#ff8c00',
  red:'#ff3c5a', miss:'#ff3c5a', heart:'#ff69b4',
};

function spawnParticles(x, y, color, hit) {
  const count = hit ? 8 : 4;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = hit ? (4 + Math.random() * 8) : (3 + Math.random() * 5);
    const angle = Math.random() * Math.PI * 2;
    const dist  = hit ? (30 + Math.random() * 60) : (15 + Math.random() * 30);
    p.style.cssText = `width:${size}px;height:${size}px;background:${colorMap[color]||'#fff'};left:${x}px;top:${y}px;--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;box-shadow:0 0 4px ${colorMap[color]||'#fff'}`;
    arena.appendChild(p);
    setTimeout(() => p.remove(), 500);
  }
}

function showFloatScore(text, x, y, color) {
  const el = document.createElement('div');
  el.className = 'float-score';
  el.textContent = text;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  el.style.color = colorMap[color] || '#fff';
  arena.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

function triggerMissFlash() {
  missFlash.classList.add('active');
  setTimeout(() => missFlash.classList.remove('active'), 150);
}

// ─── Miss tap on empty arena ─────────────────────────────────────────
arena.addEventListener('pointerdown', (e) => {
  if (!state.running || e.target !== arena) return;
  playMiss(); triggerMissFlash();
  setScore(Math.max(0, state.score - 1));
  showFloatScore('-1', e.clientX, e.clientY - arena.getBoundingClientRect().top, 'miss');
});

// ─── Game loop ───────────────────────────────────────────────────────
function startGame() {
  if (state.pendingReload) { location.reload(); return; }
  clearAllDots();
  clearTimeout(state.spawnTimer); clearInterval(state.gameTimer); clearTimeout(state.heartTimer);
  if (state.activeHeart) removeHeart(true);

  state.score = 0; state.lives = MAX_LIVES; state.level = 1;
  state.timeLeft = GAME_DURATION; state.running = true; state.lastNewScoreIndex = -1;

  document.body.style.filter = '';
  scoreEl.textContent = '0'; levelEl.textContent = '1'; timeEl.textContent = GAME_DURATION;
  renderLives();
  showScreen(null);
  resumeAC();

  function scheduleSpawn() {
    if (!state.running) return;
    const cfg = LEVELS[Math.min(state.level, LEVELS.length - 1)];
    spawnDot();
    state.spawnTimer = setTimeout(scheduleSpawn, cfg.spawnInterval + (Math.random() * 400 - 200));
  }
  scheduleSpawn();

  state.gameTimer = setInterval(() => {
    if (!state.running) { clearInterval(state.gameTimer); return; }
    state.timeLeft--;
    timeEl.textContent = state.timeLeft;

    const newLevel = Math.min(20, 1 + Math.floor((GAME_DURATION - state.timeLeft) / LEVEL_UP_INTERVAL));
    if (newLevel > state.level) {
      const prevLevel = state.level;
      state.level = newLevel;
      levelEl.textContent = newLevel;
      playLevelUp();
      if (newLevel >= 10) {
        document.body.style.transition = 'filter .3s';
        document.body.style.filter = `hue-rotate(${(newLevel-10)*12}deg) saturate(${1+(newLevel-10)*.15})`;
      }
      if (newLevel >= 15) { arena.classList.add('shake'); setTimeout(() => arena.classList.remove('shake'), 400); }
      const luf = document.getElementById('levelup-flash');
      const labels = ['','','','','','','','','','','','','','','','ŠÍLENÉ!','ĎÁBELSKÉ!','NEMOŽNÉ!','KONEC SVĚTA!','💀 SMRT 💀'];
      luf.querySelector('.luf-text').textContent = newLevel >= 15 ? labels[newLevel] : `LEVEL ${newLevel}!`;
      luf.classList.remove('active');
      requestAnimationFrame(() => luf.classList.add('active'));
      if (prevLevel < 9 && newLevel >= 9) scheduleHeart();
    }

    if (state.timeLeft <= 0) endGame();
  }, 1000);
}

function clearAllDots() {
  state.activeDots.forEach(d => { clearTimeout(d.timeout); cancelAnimationFrame(d.rafId); d.el.remove(); });
  state.activeDots = [];
}

function endGame() {
  state.running = false;
  clearTimeout(state.spawnTimer); clearInterval(state.gameTimer); clearTimeout(state.heartTimer);
  clearAllDots();
  if (state.activeHeart) removeHeart(true);
  document.getElementById('gameover-score').textContent = state.score;
  const top10 = getTop10();
  const qualifies = top10.length < 10 || state.score > top10[top10.length - 1].score;
  document.getElementById('name-section').style.display = qualifies ? 'flex' : 'none';
  document.getElementById('player-name').value = sessionStorage.getItem('bugsmash_player') || '';
  const block = document.getElementById('gameover-click-block');
  block.classList.remove('unblocked');
  showScreen('gameover');
  setTimeout(() => block.classList.add('unblocked'), 600);
}

// ─── Screens ─────────────────────────────────────────────────────────
function showScreen(name) {
  ['start','gameover','leaderboard'].forEach(s =>
    document.getElementById(`screen-${s}`).classList.toggle('hidden', s !== name)
  );
}
function backToStart()     { showScreen('start'); }
function showLeaderboard() { renderLeaderboard(); showScreen('leaderboard'); }

// ─── Leaderboard ─────────────────────────────────────────────────────
function getTop10() {
  try { return JSON.parse(localStorage.getItem('bugsmash_top10') || '[]'); } catch { return []; }
}
function saveScore() {
  const name = document.getElementById('player-name').value.trim() || 'Hráč';
  sessionStorage.setItem('bugsmash_player', name);
  const entry = { name, score: state.score, level: state.level, date: new Date().toLocaleDateString('cs-CZ') };
  let top10 = getTop10();
  top10.push(entry); top10.sort((a,b) => b.score - a.score); top10 = top10.slice(0,10);
  localStorage.setItem('bugsmash_top10', JSON.stringify(top10));
  state.lastNewScoreIndex = top10.findIndex(e => e === entry);
  showLeaderboard();
}
function renderLeaderboard() {
  const top10 = getTop10(), lb = document.getElementById('leaderboard');
  lb.innerHTML = '';
  if (!top10.length) { lb.innerHTML = '<div class="lb-empty">Zatím žádné záznamy.<br>Buď první!</div>'; return; }
  top10.forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'lb-row' + (i === state.lastNewScoreIndex ? ' highlight' : '');
    const medals = ['🥇','🥈','🥉'];
    const rankClass = i===0?'gold':i===1?'silver':i===2?'bronze':'';
    row.innerHTML = `<div class="lb-rank ${rankClass}">${i<3?medals[i]:i+1}</div><div class="lb-name">${escapeHtml(entry.name)}</div><div class="lb-level">Lv.${entry.level ?? '?'}</div><div class="lb-score">${entry.score}</div>`;
    lb.appendChild(row);
  });
}
function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
document.getElementById('player-name').addEventListener('keydown', e => { if(e.key==='Enter') saveScore(); });

// ─── Share result ────────────────────────────────────────────────────
function buildResultCanvas() {
  const W = 640, H = 400;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // Background
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, W, H);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

  // Glow circles (decorative)
  const glow = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  glow(80,  80,  120, 'rgba(0,229,255,0.08)');
  glow(560, 320, 140, 'rgba(57,255,20,0.06)');
  glow(320, 380, 100, 'rgba(255,60,90,0.06)');

  // Top border gradient line
  const line = ctx.createLinearGradient(0, 0, W, 0);
  line.addColorStop(0,   'transparent');
  line.addColorStop(0.3, '#00e5ff');
  line.addColorStop(0.7, '#39ff14');
  line.addColorStop(1,   'transparent');
  ctx.strokeStyle = line; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(W, 2); ctx.stroke();

  // Title
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(90,90,138,0.9)';
  ctx.font = '600 15px Nunito, sans-serif';
  ctx.fillText('SMASH THEM ALL!', W / 2, 36);

  // Player name
  const playerName = (document.getElementById('player-name').value.trim() || sessionStorage.getItem('bugsmash_player') || 'Hráč').toUpperCase();
  ctx.font = 'bold 28px Nunito, sans-serif';
  ctx.fillStyle = '#e8e8ff';
  ctx.fillText(playerName, W / 2, 72);

  // Score — big gradient number
  const scoreGrad = ctx.createLinearGradient(0, 90, 0, 195);
  scoreGrad.addColorStop(0, '#00e5ff');
  scoreGrad.addColorStop(1, '#39ff14');
  ctx.fillStyle = scoreGrad;
  ctx.font = 'bold 120px Nunito, sans-serif';
  ctx.fillText(state.score, W / 2, 195);

  // "bodů" label
  ctx.fillStyle = 'rgba(90,90,138,0.8)';
  ctx.font = '600 16px Nunito, sans-serif';
  ctx.fillText('BODŮ', W / 2, 220);

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(80, 242); ctx.lineTo(W - 80, 242); ctx.stroke();

  // Stats row — level & date
  const top10 = getTop10();
  const rank  = top10.findIndex(e => e.score === state.score) + 1;

  const stats = [
    { label: 'LEVEL', value: state.level },
    ...(rank > 0 ? [{ label: 'ŽEBŘÍČEK', value: `#${rank}` }] : []),
    { label: 'DATUM', value: new Date().toLocaleDateString('cs-CZ') },
  ];

  const colW = W / stats.length;
  stats.forEach((s, i) => {
    const cx = colW * i + colW / 2;
    ctx.fillStyle = 'rgba(90,90,138,0.8)';
    ctx.font = '600 12px Nunito, sans-serif';
    ctx.fillText(s.label, cx, 272);
    ctx.fillStyle = '#e8e8ff';
    ctx.font = 'bold 22px Nunito, sans-serif';
    ctx.fillText(s.value, cx, 298);
  });

  // Bottom tag
  ctx.fillStyle = 'rgba(90,90,138,0.5)';
  ctx.font = '500 13px Nunito, sans-serif';
  ctx.fillText('smash.icx.cz  •  v' + VERSION, W / 2, H - 18);

  return cv;
}

async function shareResult() {
  const btn = document.getElementById('share-btn');
  btn.textContent = '⏳ Připravuji...';
  btn.disabled = true;

  // Wait for fonts to be ready
  await document.fonts.ready;

  const canvas = buildResultCanvas();

  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'bugsmash-vysledek.png', { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'BugSmash!',
        text: `Dosáhl jsem ${state.score} bodů na levelu ${state.level}! Zkus to překonat 👉 smash.icx.cz`,
      });
    } else {
      // Fallback: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'bugsmash-vysledek.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch (err) {
    if (err.name !== 'AbortError') console.error(err);
  }

  btn.textContent = '📤 SDÍLET VÝSLEDEK';
  btn.disabled = false;
}

// ─── PWA ─────────────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data?.type === 'SW_UPDATED') state.pendingReload = true;
  });
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  document.getElementById('install-btn').classList.remove('hidden');
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  document.getElementById('install-btn').classList.add('hidden');
});
async function installPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById('install-btn').classList.add('hidden');
}
if('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(console.error));
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', e => e.preventDefault());
