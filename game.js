const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const ui = {
  health: document.querySelector('#healthFill'),
  level: document.querySelector('#levelText'),
  score: document.querySelector('#scoreText'),
  coins: document.querySelector('#coinText'),
  power: document.querySelector('#powerText'),
  overlay: document.querySelector('#overlay'),
  title: document.querySelector('#overlayTitle'),
  text: document.querySelector('#overlayText'),
  start: document.querySelector('#startBtn'),
};

const W = canvas.width;
const H = canvas.height;
const GRAVITY = 0.75;
const keys = { left: false, right: false, jump: false, fire: false };
let game;

const LEVELS = [
  {
    name: 'Meadow 1-1', width: 2600, sky: ['#74d8ff', '#b9edff'],
    player: { x: 80, y: 360 }, flag: { x: 2440, y: 310 },
    platforms: [[0, 492, 820, 60], [940, 492, 520, 60], [1580, 492, 1020, 60], [380, 390, 170, 26], [690, 318, 160, 26], [1150, 382, 210, 26], [1780, 352, 190, 26], [2100, 292, 160, 26]],
    coins: [[430, 350], [720, 278], [770, 278], [1210, 342], [1840, 312], [2160, 252], [2320, 452]],
    gems: [[1340, 452], [2215, 252]],
    springs: [[520, 370]],
    checkpoints: [[1460, 412]],
    powerups: [{ x: 705, y: 280, type: 'fire' }, { x: 1810, y: 314, type: 'heart' }],
    enemies: [{ x: 560, y: 456, min: 470, max: 760 }, { x: 1260, y: 346, min: 1160, max: 1340 }, { x: 1980, y: 456, min: 1740, max: 2260 }],
  },
  {
    name: 'Cloud Climb 1-2', width: 3000, sky: ['#6a88ff', '#bde3ff'],
    player: { x: 80, y: 300 }, flag: { x: 2820, y: 260 },
    platforms: [[0, 492, 640, 60], [735, 492, 500, 60], [1360, 492, 440, 60], [1960, 492, 1040, 60], [260, 390, 190, 24], [560, 335, 210, 24], [900, 292, 190, 24], [1190, 365, 220, 24], [1580, 308, 230, 24], [2050, 392, 220, 24], [2380, 330, 250, 24]],
    coins: [[300, 350], [585, 295], [650, 295], [940, 252], [1230, 325], [1625, 268], [1700, 268], [2100, 352], [2460, 290], [2550, 290]],
    gems: [[1080, 452], [1760, 452], [2650, 452]],
    springs: [[610, 472], [1418, 472]],
    checkpoints: [[1510, 412]],
    powerups: [{ x: 930, y: 253, type: 'star' }, { x: 2440, y: 291, type: 'heart' }],
    enemies: [{ x: 850, y: 456, min: 760, max: 1180 }, { x: 1380, y: 456, min: 1370, max: 1760 }, { x: 2120, y: 356, min: 2060, max: 2240 }, { x: 2520, y: 456, min: 2240, max: 2720 }],
  },
  {
    name: 'Castle Sprint 1-3', width: 3300, sky: ['#332d4f', '#e77964'],
    player: { x: 80, y: 350 }, flag: { x: 3140, y: 285 },
    platforms: [[0, 492, 700, 60], [860, 492, 430, 60], [1440, 492, 410, 60], [2020, 492, 1280, 60], [360, 382, 160, 26], [930, 325, 210, 26], [1510, 392, 180, 26], [1880, 310, 210, 26], [2340, 370, 170, 26], [2750, 300, 210, 26]],
    coins: [[400, 342], [970, 285], [1030, 285], [1560, 352], [1930, 270], [2410, 330], [2810, 260], [2870, 260], [3040, 452]],
    gems: [[1140, 285], [1830, 452], [3080, 452]],
    springs: [[520, 472], [2510, 472]],
    checkpoints: [[1910, 230]],
    powerups: [{ x: 970, y: 286, type: 'fire' }, { x: 1915, y: 272, type: 'star' }, { x: 2400, y: 332, type: 'heart' }],
    enemies: [{ x: 460, y: 456, min: 260, max: 650 }, { x: 1030, y: 289, min: 940, max: 1120 }, { x: 1600, y: 456, min: 1480, max: 1820 }, { x: 2140, y: 456, min: 2050, max: 2540 }, { x: 2880, y: 456, min: 2650, max: 3080 }],
  },
];

function rects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function makeGame(level = 0, carry = { score: 0, coins: 0 }) {
  const data = LEVELS[level];
  return {
    state: 'ready', level, data, camera: 0, score: carry.score, coins: carry.coins, bullets: [], particles: [], fireCooldown: 0,
    player: { x: data.player.x, y: data.player.y, w: 34, h: 48, vx: 0, vy: 0, onGround: false, health: 100, inv: 0, power: '', powerTime: 0, facing: 1, respawnX: data.player.x, respawnY: data.player.y },
    coinsList: data.coins.map(([x, y]) => ({ x, y, w: 22, h: 22, got: false })),
    gems: (data.gems || []).map(([x, y]) => ({ x, y, w: 24, h: 24, got: false })),
    springs: (data.springs || []).map(([x, y]) => ({ x, y, w: 34, h: 20 })),
    checkpoints: (data.checkpoints || []).map(([x, y]) => ({ x, y, w: 22, h: 80, active: false })),
    powerups: data.powerups.map(p => ({ ...p, w: 28, h: 28, got: false })),
    enemies: data.enemies.map(e => ({ ...e, y: e.y, w: 36, h: 36, vx: 1.15, dead: false })),
  };
}

function start(level = 0, carry) { game = makeGame(level, carry); game.state = 'playing'; ui.overlay.classList.add('hidden'); updateUI(); }
function show(title, text, button = 'Play Again') { ui.title.textContent = title; ui.text.textContent = text; ui.start.textContent = button; ui.overlay.classList.remove('hidden'); }

function update() {
  if (!game || game.state !== 'playing') return;
  const p = game.player;
  p.vx = (keys.left ? -4.2 : 0) + (keys.right ? 4.2 : 0);
  if (p.vx) p.facing = Math.sign(p.vx);
  if (keys.jump && p.onGround) { p.vy = -14.5; p.onGround = false; }
  if (keys.fire && game.fireCooldown <= 0 && (p.power === 'fire' || p.power === 'star')) {
    game.bullets.push({ x: p.x + p.w / 2, y: p.y + 20, w: 14, h: 8, vx: 9 * p.facing });
    game.fireCooldown = 18;
  }
  game.fireCooldown--;
  p.vy += GRAVITY; p.x += p.vx; collide(p, 'x'); p.y += p.vy; p.onGround = false; collide(p, 'y');
  if (p.x < 0) p.x = 0; if (p.x + p.w > game.data.width) p.x = game.data.width - p.w;
  if (p.y > H + 80) fallRespawn();
  if (p.inv > 0) p.inv--; if (p.powerTime > 0 && --p.powerTime === 0) p.power = '';
  updateItems(); updateSprings(); updateEnemies(); updateBullets();
  if (rects(p, { ...game.data.flag, w: 44, h: 190 })) nextLevel();
  game.camera = Math.max(0, Math.min(game.data.width - W, p.x - W * 0.42));
  updateUI();
}

function collide(p, axis) {
  for (const [x, y, w, h] of game.data.platforms) {
    const plat = { x, y, w, h };
    if (!rects(p, plat)) continue;
    if (axis === 'x') p.x = p.vx > 0 ? x - p.w : x + w;
    else if (p.vy > 0) { p.y = y - p.h; p.vy = 0; p.onGround = true; }
    else if (p.vy < 0) { p.y = y + h; p.vy = 0; }
  }
}
function updateItems() {
  for (const c of game.coinsList) if (!c.got && rects(game.player, c)) { c.got = true; game.coins++; game.score += 100; pop(c.x, c.y, '#ffd75a'); }
  for (const gem of game.gems) if (!gem.got && rects(game.player, gem)) { gem.got = true; game.score += 500; pop(gem.x, gem.y, '#72f7ff'); }
  for (const cp of game.checkpoints) if (!cp.active && rects(game.player, cp)) { game.checkpoints.forEach(c => c.active = false); cp.active = true; game.player.respawnX = cp.x; game.player.respawnY = cp.y - game.player.h; game.score += 150; pop(cp.x, cp.y, '#7cff9e'); }
  for (const item of game.powerups) if (!item.got && rects(game.player, item)) {
    item.got = true; game.score += 250; pop(item.x, item.y, item.type === 'heart' ? '#ff5c74' : '#5dff9d');
    if (item.type === 'heart') game.player.health = Math.min(100, game.player.health + 35);
    else { game.player.power = item.type; game.player.powerTime = item.type === 'star' ? 720 : 9999; }
  }
}
function updateSprings() {
  const p = game.player;
  for (const spring of game.springs) if (p.vy >= 0 && rects(p, spring)) { p.y = spring.y - p.h; p.vy = -19; p.onGround = false; pop(spring.x, spring.y, '#ff78d2'); }
}
function updateEnemies() {
  for (const e of game.enemies) {
    if (e.dead) continue;
    e.x += e.vx; if (e.x < e.min || e.x > e.max) e.vx *= -1;
    if (rects(game.player, e)) {
      if (game.player.vy > 2 || game.player.power === 'star') { e.dead = true; game.player.vy = -9; game.score += 300; pop(e.x, e.y, '#fff'); }
      else hurt(18);
    }
  }
}
function updateBullets() {
  for (const b of game.bullets) b.x += b.vx;
  for (const b of game.bullets) for (const e of game.enemies) if (!e.dead && rects(b, e)) { e.dead = true; b.dead = true; game.score += 200; pop(e.x, e.y, '#ffed80'); }
  game.bullets = game.bullets.filter(b => !b.dead && b.x > game.camera - 40 && b.x < game.camera + W + 40);
  game.particles = game.particles.filter(pt => --pt.life > 0);
}
function hurt(amount) {
  const p = game.player; if (p.inv > 0 || p.power === 'star') return;
  p.health -= amount; p.inv = 65; p.vx = -p.facing * 5; p.vy = -7;
  if (p.health <= 0) { game.state = 'gameover'; show('Game Over', `You reached ${game.data.name} with ${game.coins} coins and ${game.score} points.`); }
}
function fallRespawn() {
  const p = game.player;
  hurt(28);
  if (game.state !== 'playing') return;
  p.x = p.respawnX; p.y = p.respawnY; p.vx = 0; p.vy = 0; p.inv = 90;
}
function nextLevel() {
  game.score += 1000;
  if (game.level + 1 >= LEVELS.length) { game.state = 'won'; show('You Won!', `Final score: ${game.score}. Coins collected: ${game.coins}.`, 'Restart'); }
  else start(game.level + 1, { score: game.score, coins: game.coins });
}
function pop(x, y, color) { for (let i = 0; i < 10; i++) game.particles.push({ x, y, color, life: 30 + Math.random() * 20, vx: Math.random() * 5 - 2.5, vy: Math.random() * -4 - 1 }); }

function draw() {
  if (!game) return;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, game.data.sky[0]); g.addColorStop(1, game.data.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cam = game.camera;
  ctx.save(); ctx.translate(-cam, 0);
  drawBackground(cam); drawPlatforms(); drawFlag(); drawItems(); drawSprings(); drawCheckpoints(); drawEnemies(); drawBullets(); drawPlayer(); drawParticles();
  ctx.restore();
}
function drawBackground(cam) {
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  for (let x = -200; x < game.data.width + 400; x += 360) { ctx.beginPath(); ctx.ellipse(x + 80, 90 + (x % 3) * 16, 58, 22, 0, 0, Math.PI * 2); ctx.ellipse(x + 130, 86, 48, 20, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#4fa647'; for (let x = -100; x < game.data.width; x += 260) ctx.fillRect(x, 455, 100, 45);
}
function drawPlatforms() { for (const [x, y, w, h] of game.data.platforms) { ctx.fillStyle = '#7a4a2a'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#36b24a'; ctx.fillRect(x, y, w, 12); ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.fillRect(x, y + 14, w, 5); } }
function drawFlag() { const f = game.data.flag; ctx.fillStyle = '#f8f8ff'; ctx.fillRect(f.x, f.y, 8, 190); ctx.fillStyle = '#ff4e64'; ctx.beginPath(); ctx.moveTo(f.x + 8, f.y + 8); ctx.lineTo(f.x + 92, f.y + 38); ctx.lineTo(f.x + 8, f.y + 68); ctx.fill(); }
function drawItems() { for (const c of game.coinsList) if (!c.got) { ctx.fillStyle = '#ffd75a'; ctx.beginPath(); ctx.ellipse(c.x + 11, c.y + 11, 10, 13, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff3a7'; ctx.fillRect(c.x + 9, c.y + 3, 4, 16); } for (const gem of game.gems) if (!gem.got) { ctx.fillStyle = '#72f7ff'; ctx.beginPath(); ctx.moveTo(gem.x + 12, gem.y); ctx.lineTo(gem.x + 24, gem.y + 10); ctx.lineTo(gem.x + 12, gem.y + 24); ctx.lineTo(gem.x, gem.y + 10); ctx.closePath(); ctx.fill(); } for (const p of game.powerups) if (!p.got) { ctx.fillStyle = p.type === 'heart' ? '#ff5c74' : p.type === 'star' ? '#abff5d' : '#ff8d3d'; ctx.fillRect(p.x, p.y, p.w, p.h); ctx.fillStyle = '#fff'; ctx.fillText(p.type === 'heart' ? '♥' : p.type === 'star' ? '★' : 'F', p.x + 7, p.y + 20); } }
function drawSprings() { for (const s of game.springs) { ctx.fillStyle = '#ff78d2'; ctx.fillRect(s.x, s.y + 10, s.w, 10); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x + 5, s.y + 12); ctx.lineTo(s.x + 12, s.y + 2); ctx.lineTo(s.x + 20, s.y + 12); ctx.lineTo(s.x + 28, s.y + 2); ctx.stroke(); } }
function drawCheckpoints() { for (const cp of game.checkpoints) { ctx.fillStyle = '#f8f8ff'; ctx.fillRect(cp.x, cp.y, 5, cp.h); ctx.fillStyle = cp.active ? '#7cff9e' : '#ffe45c'; ctx.beginPath(); ctx.moveTo(cp.x + 5, cp.y + 5); ctx.lineTo(cp.x + 54, cp.y + 21); ctx.lineTo(cp.x + 5, cp.y + 38); ctx.fill(); } }
function drawEnemies() { for (const e of game.enemies) if (!e.dead) { ctx.fillStyle = '#7030a0'; ctx.fillRect(e.x, e.y, e.w, e.h); ctx.fillStyle = '#1c082d'; ctx.fillRect(e.x + 7, e.y + 9, 6, 6); ctx.fillRect(e.x + 23, e.y + 9, 6, 6); } }
function drawBullets() { ctx.fillStyle = '#ffe45c'; for (const b of game.bullets) ctx.fillRect(b.x, b.y, b.w, b.h); }
function drawPlayer() { const p = game.player; if (p.inv % 10 > 5) return; ctx.fillStyle = p.power === 'star' ? '#fff06b' : '#e83d49'; ctx.fillRect(p.x + 3, p.y, 28, 18); ctx.fillStyle = '#3266d8'; ctx.fillRect(p.x, p.y + 18, p.w, 30); ctx.fillStyle = '#ffd1a3'; ctx.fillRect(p.x + 8, p.y + 5, 18, 16); ctx.fillStyle = '#20120e'; ctx.fillRect(p.x + (p.facing > 0 ? 22 : 8), p.y + 10, 4, 4); }
function drawParticles() { for (const pt of game.particles) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += .2; ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life / 40); ctx.fillRect(pt.x, pt.y, 5, 5); ctx.globalAlpha = 1; } }
function updateUI() { const p = game.player; ui.health.style.width = `${Math.max(0, p.health)}%`; ui.level.textContent = `${game.level + 1}/3`; ui.score.textContent = game.score; ui.coins.textContent = game.coins; ui.power.textContent = p.power ? (p.power === 'star' ? `Star ${Math.ceil(p.powerTime / 60)}s` : 'Fire') : '-'; }
function loop() { update(); draw(); requestAnimationFrame(loop); }

const keyMap = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', j: 'fire', J: 'fire', f: 'fire', F: 'fire' };
addEventListener('keydown', e => { if (keyMap[e.key]) { keys[keyMap[e.key]] = true; e.preventDefault(); } if (e.key === 'p' || e.key === 'P') { game.state = game.state === 'playing' ? 'paused' : 'playing'; if (game.state === 'paused') show('Paused', 'Press P or Start to resume.', 'Resume'); else ui.overlay.classList.add('hidden'); } if (e.key === 'r' || e.key === 'R') start(); });
addEventListener('keyup', e => { if (keyMap[e.key]) keys[keyMap[e.key]] = false; });
document.querySelectorAll('[data-key]').forEach(btn => { const k = btn.dataset.key; const on = e => { e.preventDefault(); keys[k] = true; btn.classList.add('active'); }; const off = e => { e.preventDefault(); keys[k] = false; btn.classList.remove('active'); }; btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointercancel', off); btn.addEventListener('pointerleave', off); });
ui.start.addEventListener('click', () => game?.state === 'paused' ? (game.state = 'playing', ui.overlay.classList.add('hidden')) : start());
game = makeGame(); updateUI(); draw(); loop();
