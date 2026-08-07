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
const keys = { left: false, right: false, jump: false, fire: false, dash: false };
let game;
let lastTime = performance.now();
let audioCtx = null;
let gameLoopStarted = false;

function beep(freq = 440, duration = 0.06, type = 'square', volume = 0.035) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = volume;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    o.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

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
  {
    name: 'Crystal Caves 1-4', width: 3600, sky: ['#151b46', '#4b75b8'],
    player: { x: 80, y: 350 }, flag: { x: 3450, y: 270 },
    platforms: [[0,492,520,60],[700,492,430,60],[1260,492,420,60],[1840,492,500,60],[2500,492,1100,60],
      [260,390,190,24],[820,340,210,24],[1080,280,180,24],[1370,360,210,24],[1710,300,190,24],
      [2020,370,210,24],[2300,310,180,24],[2700,365,220,24],[3040,290,220,24],[3290,350,150,24]],
    coins: [[300,350],[850,295],[930,295],[1120,235],[1430,315],[1770,255],[2070,325],[2350,265],[2770,320],[3110,245],[3340,305]],
    gems: [[610,450],[1190,450],[2410,450],[3220,450]],
    springs: [[470,472],[1080,472],[1650,472],[2330,472]],
    checkpoints: [[1780,412],[2860,412]],
    powerups: [{x:850,y:295,type:'spread'},{x:2050,y:325,type:'shield'},{x:2760,y:320,type:'rapid'},{x:3120,y:245,type:'laser'}],
    enemies: [
      {x:420,y:456,min:260,max:500,type:'walker'},
      {x:900,y:304,min:820,max:1000,type:'flyer'},
      {x:1450,y:324,min:1380,max:1560,type:'shooter'},
      {x:1940,y:456,min:1880,max:2280,type:'walker'},
      {x:2160,y:334,min:2040,max:2200,type:'flyer'},
      {x:2780,y:329,min:2700,max:2900,type:'shooter'},
      {x:3200,y:314,min:3100,max:3370,type:'walker'}
    ]
  },
  {
    name: 'Volcano Run 1-5', width: 3900, sky: ['#3a1020', '#ef6b32'],
    player: { x: 80, y: 350 }, flag: { x: 3740, y: 270 },
    platforms: [[0,492,650,60],[800,492,390,60],[1380,492,430,60],[1990,492,390,60],[2570,492,520,60],[3260,492,640,60],
      [420,380,180,24],[900,335,190,24],[1210,290,170,24],[1510,365,200,24],[1840,310,170,24],
      [2140,365,190,24],[2440,300,180,24],[2730,365,190,24],[3060,310,190,24],[3430,350,210,24]],
    coins: [[450,335],[940,290],[1250,245],[1550,320],[1880,265],[2180,320],[2480,255],[2770,320],[3100,265],[3470,305],[3650,450]],
    gems: [[680,450],[1320,450],[1920,450],[2500,450],[3170,450]],
    springs: [[610,472],[1190,472],[1800,472],[2550,472],[3070,472]],
    checkpoints: [[1930,412],[3130,412]],
    powerups: [{x:450,y:335,type:'bomb'},{x:940,y:290,type:'fire'},{x:1550,y:320,type:'speed'},{x:2180,y:320,type:'shield'},{x:3100,y:265,type:'star'}],
    enemies: [
      {x:520,y:344,min:430,max:570,type:'shooter'},
      {x:980,y:299,min:850,max:1080,type:'walker'},
      {x:1480,y:329,min:1410,max:1700,type:'flyer'},
      {x:1660,y:456,min:1420,max:1780,type:'walker'},
      {x:2160,y:329,min:2140,max:2310,type:'shooter'},
      {x:2800,y:456,min:2630,max:3040,type:'walker'},
      {x:3150,y:456,min:3000,max:3200,type:'flyer'},
      {x:3500,y:314,min:3420,max:3600,type:'shooter'}
    ]
  },
  {
    name: 'Sky Fortress 1-6', width: 4200, sky: ['#1b214b', '#a4d7ff'],
    player: { x: 70, y: 300 }, flag: { x: 4040, y: 230 },
    platforms: [[0,492,430,60],[570,420,330,24],[1030,492,430,60],[1570,390,350,24],[2040,492,500,60],
      [2680,400,320,24],[3130,492,470,60],[3700,360,360,24],[4010,492,190,60],
      [250,330,160,22],[740,300,170,22],[1180,350,190,22],[1730,300,190,22],[2190,350,190,22],
      [2820,320,180,22],[3260,360,180,22],[3770,280,180,22]],
    coins: [[290,280],[620,365],[790,245],[1210,315],[1770,265],[2230,315],[2860,285],[3300,325],[3810,245],[4060,450]],
    gems: [[470,450],[970,450],[1490,450],[2560,450],[3070,450],[3650,450]],
    springs: [[390,472],[880,400],[1440,472],[1920,378],[2530,472],[3000,388],[3590,472]],
    checkpoints: [[2010,412],[3640,412]],
    powerups: [{x:620,y:365,type:'rapid'},{x:1210,y:315,type:'laser'},{x:1770,y:265,type:'spread'},{x:2860,y:285,type:'shield'},{x:3810,y:245,type:'star'}],
    enemies: [
      {x:650,y:264,min:590,max:850,type:'flyer'},
      {x:1120,y:456,min:1050,max:1400,type:'walker'},
      {x:1800,y:354,min:1600,max:1880,type:'shooter'},
      {x:2150,y:456,min:2070,max:2470,type:'walker'},
      {x:2750,y:364,min:2700,max:2980,type:'flyer'},
      {x:3260,y:456,min:3150,max:3520,type:'shooter'},
      {x:3780,y:324,min:3720,max:4000,type:'flyer'}
    ]
  },
  {
    name: 'Shadow Factory 1-7', width: 4500, sky: ['#090b13', '#4a4e68'],
    player: { x: 70, y: 350 }, flag: { x: 4350, y: 250 },
    platforms: [[0,492,700,60],[850,492,420,60],[1450,492,420,60],[2040,492,430,60],[2630,492,470,60],[3290,492,1210,60],
      [420,360,180,24],[930,330,200,24],[1190,270,170,24],[1530,350,190,24],[1760,290,180,24],
      [2110,340,180,24],[2380,280,170,24],[2720,350,190,24],[3020,290,190,24],[3370,350,190,24],[3710,290,190,24],[4070,340,200,24]],
    coins: [[450,315],[980,285],[1240,225],[1580,305],[1810,245],[2160,295],[2430,235],[2770,305],[3070,245],[3420,305],[3760,245],[4120,295]],
    gems: [[740,450],[1370,450],[1940,450],[2520,450],[3160,450],[4010,450]],
    springs: [[650,472],[1260,472],[1870,472],[2460,472],[3090,472],[3700,472]],
    checkpoints: [[1970,412],[3230,412]],
    powerups: [{x:980,y:285,type:'laser'},{x:1580,y:305,type:'bomb'},{x:2160,y:295,type:'rapid'},{x:2770,y:305,type:'shield'},{x:3420,y:305,type:'spread'},{x:4120,y:295,type:'star'}],
    enemies: [
      {x:500,y:324,min:430,max:620,type:'walker'},
      {x:980,y:294,min:900,max:1120,type:'shooter'},
      {x:1250,y:234,min:1200,max:1330,type:'flyer'},
      {x:1610,y:314,min:1500,max:1780,type:'walker'},
      {x:2180,y:304,min:2070,max:2290,type:'shooter'},
      {x:2810,y:314,min:2700,max:3000,type:'flyer'},
      {x:3450,y:314,min:3340,max:3560,type:'walker'},
      {x:3810,y:254,min:3720,max:3960,type:'shooter'},
      {x:4160,y:304,min:4080,max:4300,type:'flyer'}
    ]
  },
  {
    name: 'Demon Citadel 1-8', width: 5000, sky: ['#17091f', '#8b2e4c'],
    player: { x: 70, y: 350 }, flag: { x: 4860, y: 220 },
    platforms: [[0,492,600,60],[760,492,500,60],[1420,492,420,60],[2110,492,460,60],[2740,492,500,60],[3400,492,600,60],[4140,492,860,60],
      [340,375,180,24],[900,330,200,24],[1170,270,170,24],[1490,360,190,24],[1770,300,180,24],
      [2180,360,190,24],[2470,290,180,24],[2810,350,190,24],[3110,290,180,24],[3470,350,190,24],[3800,290,190,24],[4220,350,190,24],[4530,280,200,24]],
    coins: [[380,330],[950,285],[1220,225],[1540,315],[1820,255],[2230,315],[2520,245],[2860,305],[3160,245],[3520,305],[3850,245],[4270,305],[4580,235],[4750,450]],
    gems: [[650,450],[1330,450],[1980,450],[2620,450],[3320,450],[4070,450],[4780,450]],
    springs: [[560,472],[1250,472],[1930,472],[2560,472],[3230,472],[4080,472]],
    checkpoints: [[2040,412],[3350,412],[4090,412]],
    powerups: [{x:950,y:285,type:'fire'},{x:1540,y:315,type:'bomb'},{x:2230,y:315,type:'shield'},{x:2860,y:305,type:'laser'},{x:3520,y:305,type:'rapid'},{x:4270,y:305,type:'spread'},{x:4580,y:235,type:'star'}],
    enemies: [
      {x:450,y:339,min:350,max:540,type:'walker'},
      {x:1000,y:294,min:900,max:1100,type:'shooter'},
      {x:1540,y:324,min:1450,max:1680,type:'flyer'},
      {x:1810,y:264,min:1770,max:1940,type:'shooter'},
      {x:2250,y:324,min:2160,max:2400,type:'walker'},
      {x:2910,y:314,min:2780,max:3050,type:'flyer'},
      {x:3560,y:314,min:3450,max:3650,type:'shooter'},
      {x:3890,y:254,min:3800,max:4020,type:'walker'},
      {x:4320,y:314,min:4200,max:4400,type:'flyer'},
      {x:4630,y:244,min:4550,max:4780,type:'shooter'},
      {x:4740,y:420,min:4550,max:4880,type:'boss'}
    ]
  }

];

function rects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function makeGame(level = 0, carry = { score: 0, coins: 0 }) {
  const data = LEVELS[level];
  return {
    state: 'ready', level, data, camera: 0, score: carry.score, coins: carry.coins,
    bullets: [], enemyBullets: [], particles: [], fireCooldown: 0, shake: 0, combo: 0, comboTimer: 0,
    elapsed: 0, bestCombo: carry.bestCombo || 0, weapon: carry.weapon || 'basic',
    weaponTime: 0,
    player: { x: data.player.x, y: data.player.y, w: 34, h: 48, vx: 0, vy: 0,
      onGround: false, health: 100, inv: 0, power: '', powerTime: 0, facing: 1,
      respawnX: data.player.x, respawnY: data.player.y, jumps: 0, coyote: 0,
      dash: 0, dashCooldown: 0, speedBoost: 0, shield: 0 },
    coinsList: data.coins.map(([x, y]) => ({ x, y, w: 22, h: 22, got: false })),
    gems: (data.gems || []).map(([x, y]) => ({ x, y, w: 24, h: 24, got: false })),
    springs: (data.springs || []).map(([x, y]) => ({ x, y, w: 34, h: 20 })),
    checkpoints: (data.checkpoints || []).map(([x, y]) => ({ x, y, w: 22, h: 80, active: false })),
    powerups: (data.powerups || []).map(p => ({ ...p, w: 28, h: 28, got: false })),
    enemies: (data.enemies || []).map(e => {
      const type = e.type || 'walker';
      return { ...e, type, y: e.y, w: type === 'boss' ? 72 : 36,
        h: type === 'boss' ? 72 : 36, vx: type === 'flyer' ? 1.4 : 1.15,
        dead: false, hp: type === 'boss' ? 10 : 1,
        shootCooldown: 80 + Math.random() * 80, phase: Math.random() * 6.28 };
    }),
  };
}

function start(level = 0, carry = { score: 0, coins: 0, bestCombo: 0, weapon: 'basic' }) {
  try {
    if (!LEVELS[level]) level = 0;
    game = makeGame(level, carry);
    game.state = 'playing';
    lastTime = performance.now();

    if (ui.overlay) ui.overlay.classList.add('hidden');
    updateUI();
    beep(520, .07);

    // Ensure the animation loop is alive after starting.
    if (!gameLoopStarted) {
      gameLoopStarted = true;
      requestAnimationFrame(loop);
    }
  } catch (err) {
    console.error('Could not start game:', err);
    if (ui.title) ui.title.textContent = 'Game Error';
    if (ui.text) ui.text.textContent = 'The game could not start. Check the browser console for details.';
    if (ui.overlay) ui.overlay.classList.remove('hidden');
  }
}
function show(title, text, button = 'Play Again') { ui.title.textContent = title; ui.text.textContent = text; ui.start.textContent = button; ui.overlay.classList.remove('hidden'); }

function update() {
  if (!game || game.state !== 'playing') return;

  const dt = Math.min(2, (performance.now() - lastTime) / 16.67);
  lastTime = performance.now();
  const p = game.player;
  game.elapsed += dt;

  // Combo timer.
  if (game.comboTimer > 0) game.comboTimer -= dt;
  else game.combo = 0;

  // Smooth acceleration/deceleration.
  const moveSpeed = p.speedBoost > 0 ? 7 : 4.8;
  const target = (keys.left ? -moveSpeed : 0) + (keys.right ? moveSpeed : 0);
  if (target) p.facing = Math.sign(target);
  p.vx += (target - p.vx) * Math.min(1, 0.22 * dt);
  if (!target) p.vx *= Math.pow(0.78, dt);

  // Coyote time makes jumps feel much better.
  if (p.onGround) { p.coyote = 7; p.jumps = 0; }
  else p.coyote = Math.max(0, p.coyote - dt);

  // Double jump. The input listener resets keys.jump after the first frame.
  if (keys.jump && !game._jumpLatch) {
    game._jumpLatch = true;
    if (p.onGround || p.coyote > 0) {
      p.vy = -14.5; p.onGround = false; p.coyote = 0; p.jumps = 1;
      pop(p.x + p.w / 2, p.y + p.h, '#ffffff'); beep(520);
    } else if (p.jumps < 2) {
      p.vy = -12.5; p.jumps++;
      pop(p.x + p.w / 2, p.y + p.h, '#9de9ff'); beep(700);
    }
  }
  if (!keys.jump) game._jumpLatch = false;

  // Dash: Shift/X. Briefly ignores gravity and damages enemies on contact.
  if (keys.dash && !game._dashLatch && p.dashCooldown <= 0) {
    game._dashLatch = true;
    p.dash = 10; p.dashCooldown = 45; p.inv = Math.max(p.inv, 18);
    p.vx = p.facing * 13; p.vy = 0; game.shake = 5;
    pop(p.x + p.w / 2, p.y + p.h / 2, '#8cf6ff'); beep(180, .09, 'sawtooth');
  }
  if (!keys.dash) game._dashLatch = false;

  if (p.dash > 0) {
    p.dash -= dt;
    p.x += p.vx * dt;
    for (const e of game.enemies) {
      if (!e.dead && rects(p, e)) {
        killEnemy(e, 450);
      }
    }
  } else {
    p.vy += GRAVITY * dt;
    p.x += p.vx * dt; collide(p, 'x');
    p.y += p.vy * dt; p.onGround = false; collide(p, 'y');
  }

  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  if (p.x < 0) p.x = 0;
  if (p.x + p.w > game.data.width) p.x = game.data.width - p.w;
  if (p.y > H + 80) fallRespawn();

  if (p.inv > 0) p.inv -= dt;
  if (p.powerTime > 0 && (p.powerTime -= dt) <= 0) p.power = '';
  if (game.weaponTime > 0 && (game.weaponTime -= dt) <= 0) game.weapon = 'basic';
  if (p.speedBoost > 0) p.speedBoost -= dt;
  if (p.shield > 0) p.shield -= dt;

  if (keys.fire && game.fireCooldown <= 0) {
    const weapon = game.weapon;
    const x = p.x + p.w / 2, y = p.y + 20;
    const rate = p.power === 'star' ? 6 : p.power === 'rapid' ? 6 : 15;

    if (weapon === 'spread') {
      [-0.22, 0, 0.22].forEach(a => game.bullets.push({
        x, y, w: 13, h: 7, vx: 10 * p.facing * Math.cos(a), vy: 10 * Math.sin(a),
        life: 65, damage: 1, type:'spread'
      }));
    } else if (weapon === 'laser') {
      game.bullets.push({ x, y: y - 2, w: 32, h: 5, vx: 15 * p.facing, vy: 0,
        life: 35, damage: 2, type:'laser' });
    } else if (weapon === 'bomb') {
      game.bullets.push({ x, y, w: 12, h: 12, vx: 8 * p.facing, vy: -4,
        life: 90, damage: 3, type:'bomb', gravity:.25 });
    } else {
      game.bullets.push({ x, y, w: 14, h: 8, vx: 11 * p.facing, vy: 0,
        life: 75, damage: p.power === 'fire' ? 2 : 1, type:'basic' });
    }
    game.fireCooldown = rate;
    beep(weapon === 'laser' ? 620 : weapon === 'bomb' ? 150 : 260, .04, 'triangle');
  }
  game.fireCooldown -= dt;

  updateItems(); updateSprings(); updateEnemies(); updateBullets();
  if (rects(p, { ...game.data.flag, w: 44, h: 190 })) nextLevel();

  game.camera = Math.max(0, Math.min(game.data.width - W, p.x - W * 0.42));
  game.shake *= 0.86;
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
  for (const c of game.coinsList) if (!c.got && rects(game.player, c)) {
    c.got = true; game.coins++; game.score += 100; pop(c.x, c.y, '#ffd75a'); beep(760, .045, 'sine');
  }
  for (const gem of game.gems) if (!gem.got && rects(game.player, gem)) {
    gem.got = true; game.score += 500; pop(gem.x, gem.y, '#72f7ff'); pop(gem.x, gem.y, '#ffffff'); beep(980, .08, 'sine');
  }
  for (const cp of game.checkpoints) if (!cp.active && rects(game.player, cp)) {
    game.checkpoints.forEach(c => c.active = false); cp.active = true;
    game.player.respawnX = cp.x; game.player.respawnY = cp.y - game.player.h;
    game.score += 150; pop(cp.x, cp.y, '#7cff9e'); beep(880);
  }

  for (const item of game.powerups) if (!item.got && rects(game.player, item)) {
    item.got = true; game.score += 250;
    const p = game.player;
    if (item.type === 'heart') {
      p.health = Math.min(100, p.health + 35);
    } else if (item.type === 'shield') {
      p.shield = 600;
    } else if (item.type === 'speed') {
      p.speedBoost = 600;
    } else if (item.type === 'rapid') {
      p.power = 'rapid'; p.powerTime = 600;
    } else if (item.type === 'star') {
      p.power = 'star'; p.powerTime = 720;
    } else if (item.type === 'fire') {
      p.power = 'fire'; p.powerTime = 9999; game.weapon = 'basic';
    } else if (['spread','laser','bomb'].includes(item.type)) {
      game.weapon = item.type; game.weaponTime = 900;
      p.power = 'fire'; p.powerTime = Math.max(p.powerTime, 900);
    }
    pop(item.x, item.y, item.type === 'heart' ? '#ff5c74' : '#5dff9d');
    pop(item.x + 8, item.y + 8, '#ffffff');
    beep(520 + Math.random() * 400, .1, 'sine');
  }
}
function updateSprings() {
  const p = game.player;
  for (const spring of game.springs) if (p.vy >= 0 && rects(p, spring)) { p.y = spring.y - p.h; p.vy = -19; p.onGround = false; pop(spring.x, spring.y, '#ff78d2'); }
}
function updateEnemies() {
  const p = game.player;
  for (const e of game.enemies) {
    if (e.dead) continue;

    e.phase += 0.035;
    if (e.type === 'flyer') {
      e.x += e.vx;
      e.y += Math.sin(e.phase) * .9;
      if (e.x < e.min || e.x > e.max) e.vx *= -1;
    } else if (e.type === 'boss') {
      e.x += e.vx * .65;
      e.y = 360 + Math.sin(e.phase * .7) * 45;
      if (e.x < e.min || e.x > e.max) e.vx *= -1;
    } else {
      e.x += e.vx;
      if (e.x < e.min || e.x > e.max) e.vx *= -1;
    }

    if ((e.type === 'shooter' || e.type === 'boss') && --e.shootCooldown <= 0) {
      const dx = (p.x + p.w/2) - (e.x + e.w/2);
      const dy = (p.y + p.h/2) - (e.y + e.h/2);
      const len = Math.max(1, Math.hypot(dx, dy));
      const speed = e.type === 'boss' ? 4.2 : 3.4;
      game.enemyBullets.push({
        x:e.x + e.w/2, y:e.y + e.h/2, w:e.type === 'boss' ? 13 : 9,
        h:e.type === 'boss' ? 13 : 9, vx:dx/len*speed, vy:dy/len*speed,
        life:180, damage:e.type === 'boss' ? 24 : 12
      });
      e.shootCooldown = e.type === 'boss' ? 55 : 105;
    }

    if (rects(p, e)) {
      if (p.vy > 2 || p.power === 'star' || p.dash > 0) {
        killEnemy(e, e.type === 'boss' ? 2500 : 300);
        p.vy = e.type === 'boss' ? -12 : -9;
      } else {
        hurt(e.type === 'boss' ? 30 : 18);
      }
    }
  }
}


function killEnemy(e, baseScore = 300) {
  if (e.dead) return;
  e.dead = true;
  game.combo = Math.min(10, game.combo + 1);
  game.comboTimer = 120;
  const multiplier = 1 + Math.max(0, game.combo - 1) * 0.5;
  const gained = Math.round(baseScore * multiplier);
  game.score += gained;
  game.bestCombo = Math.max(game.bestCombo, game.combo);
  game.shake = Math.min(10, game.shake + 2);
  pop(e.x + e.w / 2, e.y + e.h / 2, '#fff');
  pop(e.x + e.w / 2, e.y + e.h / 2, '#ffcf5a');
  beep(220 + game.combo * 45, .07, 'square');
}

function updateBullets() {
  for (const b of game.bullets) {
    b.x += b.vx; b.y += b.vy || 0;
    if (b.gravity) b.vy += b.gravity;
    b.life--;
    if (b.type === 'bomb' && b.life < 25) {
      b.w = b.h = 18;
    }
    if (Math.random() < .45) game.particles.push({
      x:b.x, y:b.y + b.h/2, color:b.type === 'laser' ? '#b9f6ff' : '#fff1a0',
      life:12, vx:-b.vx*.08, vy:0
    });
  }

  for (const b of game.bullets) for (const e of game.enemies) {
    if (!e.dead && rects(b, e)) {
      const damage = b.damage || 1;
      e.hp = (e.hp ?? 1) - damage;
      b.dead = true;
      if (e.hp <= 0) {
        killEnemy(e, e.type === 'boss' ? 2500 : 200);
      } else {
        game.score += 40;
        pop(e.x + e.w/2, e.y + e.h/2, '#ffe47a');
      }

      if (b.type === 'bomb') {
        game.shake = 7;
        for (const other of game.enemies) {
          if (!other.dead && Math.hypot(other.x-e.x, other.y-e.y) < 90) {
            other.hp = (other.hp ?? 1) - 2;
            if (other.hp <= 0) killEnemy(other, 250);
          }
        }
      }
    }
  }

  for (const b of game.enemyBullets) {
    b.x += b.vx; b.y += b.vy; b.life--;
    if (rects(game.player, b)) {
      b.dead = true; hurt(b.damage || 12);
      pop(game.player.x, game.player.y, '#ff6a7b');
    }
  }

  game.bullets = game.bullets.filter(b => !b.dead && b.life > 0 &&
    b.x > game.camera - 100 && b.x < game.camera + W + 100);
  game.enemyBullets = game.enemyBullets.filter(b => !b.dead && b.life > 0 &&
    b.x > game.camera - 120 && b.x < game.camera + W + 120);
  game.particles = game.particles.filter(pt => --pt.life > 0);
}


function hurt(amount) {
  const p = game.player; if (p.inv > 0 || p.power === 'star') return;
  if (p.shield > 0) {
    p.shield = Math.max(0, p.shield - 90);
    p.inv = 35; game.shake = 4; pop(p.x + p.w/2, p.y + p.h/2, '#7cecff'); beep(900, .06, 'sine');
    return;
  }
  p.health -= amount; p.inv = 65; p.vx = -p.facing * 5; p.vy = -7; game.shake = 5;
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
  else start(game.level + 1, { score: game.score, coins: game.coins, weapon: game.weapon, bestCombo: game.bestCombo });
}
function pop(x, y, color) { for (let i = 0; i < 10; i++) game.particles.push({ x, y, color, life: 30 + Math.random() * 20, vx: Math.random() * 5 - 2.5, vy: Math.random() * -4 - 1 }); }

function draw() {
  if (!game) return;
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, game.data.sky[0]); g.addColorStop(1, game.data.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const cam = game.camera;
  ctx.save();
  if (game.shake > .5) ctx.translate((Math.random() - .5) * game.shake, (Math.random() - .5) * game.shake);
  ctx.translate(-cam, 0);
  drawBackground(cam); drawPlatforms(); drawFlag(); drawItems(); drawSprings(); drawCheckpoints(); drawEnemies(); drawBullets(); drawEnemyBullets(); drawPlayer(); drawParticles();
  ctx.restore();
}
function drawBackground(cam) {
  // Parallax hills.
  ctx.fillStyle = 'rgba(35,110,145,.20)';
  for (let x = -500; x < game.data.width + 800; x += 520) {
    ctx.beginPath(); ctx.arc(x - cam * .18, 470, 190, Math.PI, 0); ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.58)';
  for (let x = -200; x < game.data.width + 400; x += 360) {
    ctx.beginPath();
    ctx.ellipse(x + 80, 90 + (x % 3) * 16, 58, 22, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 130, 86, 48, 20, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#4fa647';
  for (let x = -100; x < game.data.width; x += 260) ctx.fillRect(x, 455, 100, 45);
}
function drawPlatforms() { for (const [x, y, w, h] of game.data.platforms) { ctx.fillStyle = '#7a4a2a'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#36b24a'; ctx.fillRect(x, y, w, 12); ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.fillRect(x, y + 14, w, 5); } }
function drawFlag() { const f = game.data.flag; ctx.fillStyle = '#f8f8ff'; ctx.fillRect(f.x, f.y, 8, 190); ctx.fillStyle = '#ff4e64'; ctx.beginPath(); ctx.moveTo(f.x + 8, f.y + 8); ctx.lineTo(f.x + 92, f.y + 38); ctx.lineTo(f.x + 8, f.y + 68); ctx.fill(); }
function drawItems() {
  for (const c of game.coinsList) if (!c.got) {
    ctx.fillStyle = '#ffd75a'; ctx.beginPath(); ctx.ellipse(c.x + 11, c.y + 11, 10, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3a7'; ctx.fillRect(c.x + 9, c.y + 3, 4, 16);
  }
  for (const gem of game.gems) if (!gem.got) {
    ctx.fillStyle = '#72f7ff'; ctx.beginPath(); ctx.moveTo(gem.x + 12, gem.y); ctx.lineTo(gem.x + 24, gem.y + 10); ctx.lineTo(gem.x + 12, gem.y + 24); ctx.lineTo(gem.x, gem.y + 10); ctx.closePath(); ctx.fill();
  }
  for (const item of game.powerups) if (!item.got) {
    const colors = {heart:'#ff5c74',star:'#abff5d',fire:'#ff8d3d',shield:'#58d9ff',speed:'#ffe45c',
      rapid:'#c678ff',spread:'#8cff5c',laser:'#b9f6ff',bomb:'#ff704d'};
    ctx.fillStyle = colors[item.type] || '#fff';
    ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle;
    ctx.fillRect(item.x, item.y, item.w, item.h); ctx.shadowBlur = 0;
    ctx.fillStyle = '#17131b'; ctx.font = 'bold 16px system-ui';
    const icon = {heart:'♥',star:'★',fire:'F',shield:'S',speed:'»',rapid:'R',spread:'W',laser:'L',bomb:'B'}[item.type] || '?';
    ctx.fillText(icon, item.x + 7, item.y + 20);
  }
}
function drawSprings() { for (const s of game.springs) { ctx.fillStyle = '#ff78d2'; ctx.fillRect(s.x, s.y + 10, s.w, 10); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x + 5, s.y + 12); ctx.lineTo(s.x + 12, s.y + 2); ctx.lineTo(s.x + 20, s.y + 12); ctx.lineTo(s.x + 28, s.y + 2); ctx.stroke(); } }
function drawCheckpoints() { for (const cp of game.checkpoints) { ctx.fillStyle = '#f8f8ff'; ctx.fillRect(cp.x, cp.y, 5, cp.h); ctx.fillStyle = cp.active ? '#7cff9e' : '#ffe45c'; ctx.beginPath(); ctx.moveTo(cp.x + 5, cp.y + 5); ctx.lineTo(cp.x + 54, cp.y + 21); ctx.lineTo(cp.x + 5, cp.y + 38); ctx.fill(); } }
function drawEnemies() {
  for (const e of game.enemies) if (!e.dead) {
    const x = e.x, y = e.y, w = e.w, h = e.h;
    if (e.type === 'boss') {
      ctx.fillStyle = '#5e173f'; ctx.fillRect(x,y,w,h);
      ctx.fillStyle = '#d83270'; ctx.fillRect(x+9,y+10,w-18,15);
      ctx.fillStyle = '#ffd447'; ctx.fillRect(x+15,y+34,12,12); ctx.fillRect(x+w-27,y+34,12,12);
      ctx.fillStyle = '#fff'; ctx.fillRect(x+18,y+20,8,8); ctx.fillRect(x+w-26,y+20,8,8);
      ctx.fillStyle = '#ff4e64'; ctx.fillRect(x+15,y-10,w-30,5);
      ctx.fillStyle = '#63ff86'; ctx.fillRect(x+15,y-10,(w-30)*Math.max(0,e.hp ?? 10)/10,5);
      continue;
    }
    if (e.type === 'flyer') {
      ctx.fillStyle = '#21a7b8'; ctx.beginPath();
      ctx.moveTo(x+w/2,y); ctx.lineTo(x+w,y+h/2); ctx.lineTo(x+w/2,y+h); ctx.lineTo(x,y+h/2); ctx.closePath(); ctx.fill();
    } else if (e.type === 'shooter') {
      ctx.fillStyle = '#a43e7a'; ctx.fillRect(x,y,w,h);
      ctx.fillStyle = '#ffcf5a'; ctx.fillRect(x+w/2-5,y+h-5,10,10);
      ctx.fillStyle = '#fff'; ctx.fillRect(x+7,y+9,6,6); ctx.fillRect(x+23,y+9,6,6);
    } else {
      ctx.fillStyle = '#7030a0'; ctx.fillRect(x,y,w,h);
      ctx.fillStyle = '#1c082d'; ctx.fillRect(x+7,y+9,6,6); ctx.fillRect(x+23,y+9,6,6);
    }
  }
}

function drawBullets() {
  for (const b of game.bullets) {
    ctx.fillStyle = b.type === 'laser' ? '#b9f6ff' :
      b.type === 'bomb' ? '#ff704d' :
      b.type === 'spread' ? '#c9ff65' : '#ffe45c';
    ctx.shadowBlur = b.type === 'laser' ? 14 : 5;
    ctx.shadowColor = ctx.fillStyle;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.shadowBlur = 0;
  }
}
function drawEnemyBullets() {
  for (const b of game.enemyBullets) {
    ctx.fillStyle = '#ff5570';
    ctx.beginPath(); ctx.arc(b.x+b.w/2,b.y+b.h/2,b.w/2,0,Math.PI*2); ctx.fill();
  }
}
function drawPlayer() {
  const p = game.player;
  if (p.inv % 10 > 5) return;

  if (p.shield > 0) {
    ctx.globalAlpha = .22 + Math.sin(game.elapsed * .18) * .08;
    ctx.strokeStyle = '#72eaff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(p.x+p.w/2,p.y+p.h/2,29,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (p.power === 'star') {
    ctx.globalAlpha = .25 + Math.sin(game.elapsed * .25) * .1;
    ctx.fillStyle = '#fff06b'; ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 31, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if (p.dash > 0) {
    ctx.globalAlpha = .3;
    ctx.fillStyle = '#8cf6ff';
    ctx.fillRect(p.x - p.facing * 25, p.y + 10, 28, 26);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = p.power === 'star' ? '#fff06b' : p.power === 'fire' ? '#ff713b' : '#e83d49';
  ctx.fillRect(p.x + 3, p.y, 28, 18);
  ctx.fillStyle = '#3266d8'; ctx.fillRect(p.x, p.y + 18, p.w, 30);
  ctx.fillStyle = '#ffd1a3'; ctx.fillRect(p.x + 8, p.y + 5, 18, 16);
  ctx.fillStyle = '#20120e'; ctx.fillRect(p.x + (p.facing > 0 ? 22 : 8), p.y + 10, 4, 4);
}
function drawParticles() { for (const pt of game.particles) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += .2; ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life / 40); ctx.fillRect(pt.x, pt.y, 5, 5); ctx.globalAlpha = 1; } }
function updateUI() { const p = game.player; ui.health.style.width = `${Math.max(0, p.health)}%`; ui.level.textContent = `${game.level + 1}/${LEVELS.length}`; ui.score.textContent = game.score; ui.coins.textContent = game.coins; const weaponName = game.weapon === 'basic' ? 'Basic' : game.weapon[0].toUpperCase() + game.weapon.slice(1);
  const buffs = [
    p.power ? (p.power === 'star' ? `Star ${Math.ceil(p.powerTime / 60)}s` : p.power.toUpperCase()) : '',
    `Weapon: ${weaponName}`,
    p.shield > 0 ? `Shield ${Math.ceil(p.shield/60)}s` : '',
    p.speedBoost > 0 ? `Speed ${Math.ceil(p.speedBoost/60)}s` : '',
    `Combo x${game.combo || 0}`,
    `Dash ${p.dashCooldown <= 0 ? 'READY' : Math.ceil(p.dashCooldown / 60) + 's'}`
  ].filter(Boolean);
  if (ui.power) ui.power.textContent = buffs.join(' | '); }
function loop() { update(); draw(); requestAnimationFrame(loop); }

const keyMap = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', j: 'fire', J: 'fire', f: 'fire', F: 'fire',
  Shift: 'dash', x: 'dash', X: 'dash' };
addEventListener('keydown', e => { if (keyMap[e.key]) { keys[keyMap[e.key]] = true; e.preventDefault(); } if (e.key === 'p' || e.key === 'P') { game.state = game.state === 'playing' ? 'paused' : 'playing'; if (game.state === 'paused') show('Paused', 'Press P or Start to resume.', 'Resume'); else ui.overlay.classList.add('hidden'); } if (e.key === 'r' || e.key === 'R') start();
  if (e.key === 'q' || e.key === 'Q') {
    const weapons = ['basic','spread','laser','bomb'];
    const i = weapons.indexOf(game.weapon);
    game.weapon = weapons[(i + 1) % weapons.length];
    game.weaponTime = 9999;
    beep(700, .05);
  } });
addEventListener('keyup', e => { if (keyMap[e.key]) keys[keyMap[e.key]] = false; });
document.querySelectorAll('[data-key]').forEach(btn => { const k = btn.dataset.key; const on = e => { e.preventDefault(); keys[k] = true; btn.classList.add('active'); }; const off = e => { e.preventDefault(); keys[k] = false; btn.classList.remove('active'); }; btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointercancel', off); btn.addEventListener('pointerleave', off); });
if (ui.start) {
  ui.start.addEventListener('click', (e) => {
    e.preventDefault();
    beep(440, .05);

    if (game && game.state === 'paused') {
      game.state = 'playing';
      if (ui.overlay) ui.overlay.classList.add('hidden');
      lastTime = performance.now();
    } else {
      start(0, { score: 0, coins: 0, bestCombo: 0, weapon: 'basic' });
    }
  });
}
game = makeGame();
updateUI();
draw();
if (!gameLoopStarted) {
  gameLoopStarted = true;
  requestAnimationFrame(loop);
}

// Startup safety: expose a global start function and make the button work
// even if another part of the page changes the event handler.
window.startGame = function () {
  try {
    start(0, { score: 0, coins: 0, bestCombo: 0, weapon: 'basic' });
  } catch (err) {
    console.error(err);
    const overlay = document.getElementById('overlay');
    const title = document.getElementById('overlayTitle');
    const text = document.getElementById('overlayText');
    if (title) title.textContent = 'Unable to Start';
    if (text) text.textContent = 'Game startup error: ' + (err.message || err);
    if (overlay) overlay.classList.remove('hidden');
  }
};
