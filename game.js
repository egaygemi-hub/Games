diff --git a/game.js b/game.js
index ff963e4d027bf07dd8ebe3f39dac622fc77b6839..0a956d417725d7769405f9f9874abdf429781f67 100644
--- a/game.js
+++ b/game.js
@@ -367,26 +367,284 @@ function updateEnemies() {
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
-        life:180, damage:e.type === 
+        life:180, damage:e.type === 'boss' ? 24 : 12
+      });
+      e.shootCooldown = e.type === 'boss' ? 55 : 105;
+    }
+
+    if (rects(p, e)) {
+      if (p.vy > 2 || p.power === 'star' || p.dash > 0) {
+        killEnemy(e, e.type === 'boss' ? 2500 : 300);
+        p.vy = e.type === 'boss' ? -12 : -9;
+      } else {
+        hurt(e.type === 'boss' ? 30 : 18);
+      }
+    }
+  }
+}
+
+function killEnemy(e, baseScore = 300) {
+  if (e.dead) return;
+  e.dead = true;
+  game.combo = Math.min(10, game.combo + 1);
+  game.comboTimer = 120;
+  const multiplier = 1 + Math.max(0, game.combo - 1) * 0.5;
+  const gained = Math.round(baseScore * multiplier);
+  game.score += gained;
+  game.bestCombo = Math.max(game.bestCombo, game.combo);
+  game.shake = Math.min(10, game.shake + 2);
+  pop(e.x + e.w / 2, e.y + e.h / 2, '#fff');
+  pop(e.x + e.w / 2, e.y + e.h / 2, '#ffcf5a');
+  beep(220 + game.combo * 45, .07, 'square');
+}
+
+function updateBullets() {
+  for (const b of game.bullets) {
+    b.x += b.vx; b.y += b.vy || 0;
+    if (b.gravity) b.vy += b.gravity;
+    b.life--;
+    if (b.type === 'bomb' && b.life < 25) {
+      b.w = b.h = 18;
+    }
+    if (Math.random() < .45) game.particles.push({
+      x:b.x, y:b.y + b.h/2, color:b.type === 'laser' ? '#b9f6ff' : '#fff1a0',
+      life:12, vx:-b.vx*.08, vy:0
+    });
+  }
+
+  for (const b of game.bullets) for (const e of game.enemies) {
+    if (!e.dead && rects(b, e)) {
+      const damage = b.damage || 1;
+      e.hp = (e.hp ?? 1) - damage;
+      b.dead = true;
+      if (e.hp <= 0) {
+        killEnemy(e, e.type === 'boss' ? 2500 : 200);
+      } else {
+        game.score += 40;
+        pop(e.x + e.w/2, e.y + e.h/2, '#ffe47a');
+      }
+
+      if (b.type === 'bomb') {
+        game.shake = 7;
+        for (const other of game.enemies) {
+          if (!other.dead && Math.hypot(other.x-e.x, other.y-e.y) < 90) {
+            other.hp = (other.hp ?? 1) - 2;
+            if (other.hp <= 0) killEnemy(other, 250);
+          }
+        }
+      }
+    }
+  }
+
+  for (const b of game.enemyBullets) {
+    b.x += b.vx; b.y += b.vy; b.life--;
+    if (rects(game.player, b)) {
+      b.dead = true; hurt(b.damage || 12);
+      pop(game.player.x, game.player.y, '#ff6a7b');
+    }
+  }
+
+  game.bullets = game.bullets.filter(b => !b.dead && b.life > 0 &&
+    b.x > game.camera - 100 && b.x < game.camera + W + 100);
+  game.enemyBullets = game.enemyBullets.filter(b => !b.dead && b.life > 0 &&
+    b.x > game.camera - 120 && b.x < game.camera + W + 120);
+  game.particles = game.particles.filter(pt => --pt.life > 0);
+}
+
+function hurt(amount) {
+  const p = game.player; if (p.inv > 0 || p.power === 'star') return;
+  if (p.shield > 0) {
+    p.shield = Math.max(0, p.shield - 90);
+    p.inv = 35; game.shake = 4; pop(p.x + p.w/2, p.y + p.h/2, '#7cecff'); beep(900, .06, 'sine');
+    return;
+  }
+  p.health -= amount; p.inv = 65; p.vx = -p.facing * 5; p.vy = -7; game.shake = 5;
+  if (p.health <= 0) { game.state = 'gameover'; show('Game Over', `You reached ${game.data.name} with ${game.coins} coins and ${game.score} points.`); }
+}
+function fallRespawn() {
+  const p = game.player;
+  hurt(28);
+  if (game.state !== 'playing') return;
+  p.x = p.respawnX; p.y = p.respawnY; p.vx = 0; p.vy = 0; p.inv = 90;
+}
+function nextLevel() {
+  game.score += 1000;
+  if (game.level + 1 >= LEVELS.length) { game.state = 'won'; show('You Won!', `Final score: ${game.score}. Coins collected: ${game.coins}.`, 'Restart'); }
+  else start(game.level + 1, { score: game.score, coins: game.coins, weapon: game.weapon, bestCombo: game.bestCombo });
+}
+function pop(x, y, color) { for (let i = 0; i < 10; i++) game.particles.push({ x, y, color, life: 30 + Math.random() * 20, vx: Math.random() * 5 - 2.5, vy: Math.random() * -4 - 1 }); }
+
+function draw() {
+  if (!game) return;
+  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, game.data.sky[0]); g.addColorStop(1, game.data.sky[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
+  const cam = game.camera;
+  ctx.save();
+  if (game.shake > .5) ctx.translate((Math.random() - .5) * game.shake, (Math.random() - .5) * game.shake);
+  ctx.translate(-cam, 0);
+  drawBackground(cam); drawPlatforms(); drawFlag(); drawItems(); drawSprings(); drawCheckpoints(); drawEnemies(); drawBullets(); drawEnemyBullets(); drawPlayer(); drawParticles();
+  ctx.restore();
+}
+function drawBackground(cam) {
+  // Parallax hills.
+  ctx.fillStyle = 'rgba(35,110,145,.20)';
+  for (let x = -500; x < game.data.width + 800; x += 520) {
+    ctx.beginPath(); ctx.arc(x - cam * .18, 470, 190, Math.PI, 0); ctx.fill();
+  }
+  ctx.fillStyle = 'rgba(255,255,255,.58)';
+  for (let x = -200; x < game.data.width + 400; x += 360) {
+    ctx.beginPath();
+    ctx.ellipse(x + 80, 90 + (x % 3) * 16, 58, 22, 0, 0, Math.PI * 2);
+    ctx.ellipse(x + 130, 86, 48, 20, 0, 0, Math.PI * 2); ctx.fill();
+  }
+  ctx.fillStyle = '#4fa647';
+  for (let x = -100; x < game.data.width; x += 260) ctx.fillRect(x, 455, 100, 45);
+}
+function drawPlatforms() { for (const [x, y, w, h] of game.data.platforms) { ctx.fillStyle = '#7a4a2a'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#36b24a'; ctx.fillRect(x, y, w, 12); ctx.fillStyle = 'rgba(255,255,255,.13)'; ctx.fillRect(x, y + 14, w, 5); } }
+function drawFlag() { const f = game.data.flag; ctx.fillStyle = '#f8f8ff'; ctx.fillRect(f.x, f.y, 8, 190); ctx.fillStyle = '#ff4e64'; ctx.beginPath(); ctx.moveTo(f.x + 8, f.y + 8); ctx.lineTo(f.x + 92, f.y + 38); ctx.lineTo(f.x + 8, f.y + 68); ctx.fill(); }
+function drawItems() {
+  for (const c of game.coinsList) if (!c.got) {
+    ctx.fillStyle = '#ffd75a'; ctx.beginPath(); ctx.ellipse(c.x + 11, c.y + 11, 10, 13, 0, 0, Math.PI * 2); ctx.fill();
+    ctx.fillStyle = '#fff3a7'; ctx.fillRect(c.x + 9, c.y + 3, 4, 16);
+  }
+  for (const gem of game.gems) if (!gem.got) {
+    ctx.fillStyle = '#72f7ff'; ctx.beginPath(); ctx.moveTo(gem.x + 12, gem.y); ctx.lineTo(gem.x + 24, gem.y + 10); ctx.lineTo(gem.x + 12, gem.y + 24); ctx.lineTo(gem.x, gem.y + 10); ctx.closePath(); ctx.fill();
+  }
+  for (const item of game.powerups) if (!item.got) {
+    const colors = {heart:'#ff5c74',star:'#abff5d',fire:'#ff8d3d',shield:'#58d9ff',speed:'#ffe45c',
+      rapid:'#c678ff',spread:'#8cff5c',laser:'#b9f6ff',bomb:'#ff704d'};
+    ctx.fillStyle = colors[item.type] || '#fff';
+    ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle;
+    ctx.fillRect(item.x, item.y, item.w, item.h); ctx.shadowBlur = 0;
+    ctx.fillStyle = '#17131b'; ctx.font = 'bold 16px system-ui';
+    const icon = {heart:'♥',star:'★',fire:'F',shield:'S',speed:'»',rapid:'R',spread:'W',laser:'L',bomb:'B'}[item.type] || '?';
+    ctx.fillText(icon, item.x + 7, item.y + 20);
+  }
+}
+function drawSprings() { for (const s of game.springs) { ctx.fillStyle = '#ff78d2'; ctx.fillRect(s.x, s.y + 10, s.w, 10); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x + 5, s.y + 12); ctx.lineTo(s.x + 12, s.y + 2); ctx.lineTo(s.x + 20, s.y + 12); ctx.lineTo(s.x + 28, s.y + 2); ctx.stroke(); } }
+function drawCheckpoints() { for (const cp of game.checkpoints) { ctx.fillStyle = '#f8f8ff'; ctx.fillRect(cp.x, cp.y, 5, cp.h); ctx.fillStyle = cp.active ? '#7cff9e' : '#ffe45c'; ctx.beginPath(); ctx.moveTo(cp.x + 5, cp.y + 5); ctx.lineTo(cp.x + 54, cp.y + 21); ctx.lineTo(cp.x + 5, cp.y + 38); ctx.fill(); } }
+function drawEnemies() {
+  for (const e of game.enemies) if (!e.dead) {
+    const x = e.x, y = e.y, w = e.w, h = e.h;
+    if (e.type === 'boss') {
+      ctx.fillStyle = '#5e173f'; ctx.fillRect(x,y,w,h);
+      ctx.fillStyle = '#d83270'; ctx.fillRect(x+9,y+10,w-18,15);
+      ctx.fillStyle = '#ffd447'; ctx.fillRect(x+15,y+34,12,12); ctx.fillRect(x+w-27,y+34,12,12);
+      ctx.fillStyle = '#fff'; ctx.fillRect(x+18,y+20,8,8); ctx.fillRect(x+w-26,y+20,8,8);
+      ctx.fillStyle = '#ff4e64'; ctx.fillRect(x+15,y-10,w-30,5);
+      ctx.fillStyle = '#63ff86'; ctx.fillRect(x+15,y-10,(w-30)*Math.max(0,e.hp ?? 10)/10,5);
+      continue;
+    }
+    if (e.type === 'flyer') {
+      ctx.fillStyle = '#21a7b8'; ctx.beginPath();
+      ctx.moveTo(x+w/2,y); ctx.lineTo(x+w,y+h/2); ctx.lineTo(x+w/2,y+h); ctx.lineTo(x,y+h/2); ctx.closePath(); ctx.fill();
+    } else if (e.type === 'shooter') {
+      ctx.fillStyle = '#a43e7a'; ctx.fillRect(x,y,w,h);
+      ctx.fillStyle = '#ffcf5a'; ctx.fillRect(x+w/2-5,y+h-5,10,10);
+      ctx.fillStyle = '#fff'; ctx.fillRect(x+7,y+9,6,6); ctx.fillRect(x+23,y+9,6,6);
+    } else {
+      ctx.fillStyle = '#7030a0'; ctx.fillRect(x,y,w,h);
+      ctx.fillStyle = '#1c082d'; ctx.fillRect(x+7,y+9,6,6); ctx.fillRect(x+23,y+9,6,6);
+    }
+  }
+}
+
+function drawBullets() {
+  for (const b of game.bullets) {
+    ctx.fillStyle = b.type === 'laser' ? '#b9f6ff' :
+      b.type === 'bomb' ? '#ff704d' :
+      b.type === 'spread' ? '#c9ff65' : '#ffe45c';
+    ctx.shadowBlur = b.type === 'laser' ? 14 : 5;
+    ctx.shadowColor = ctx.fillStyle;
+    ctx.fillRect(b.x, b.y, b.w, b.h);
+    ctx.shadowBlur = 0;
+  }
+}
+function drawEnemyBullets() {
+  for (const b of game.enemyBullets) {
+    ctx.fillStyle = '#ff5570';
+    ctx.beginPath(); ctx.arc(b.x+b.w/2,b.y+b.h/2,b.w/2,0,Math.PI*2); ctx.fill();
+  }
+}
+function drawPlayer() {
+  const p = game.player;
+  if (p.inv % 10 > 5) return;
+
+  if (p.shield > 0) {
+    ctx.globalAlpha = .22 + Math.sin(game.elapsed * .18) * .08;
+    ctx.strokeStyle = '#72eaff'; ctx.lineWidth = 4;
+    ctx.beginPath(); ctx.arc(p.x+p.w/2,p.y+p.h/2,29,0,Math.PI*2); ctx.stroke();
+    ctx.globalAlpha = 1;
+  }
+  if (p.power === 'star') {
+    ctx.globalAlpha = .25 + Math.sin(game.elapsed * .25) * .1;
+    ctx.fillStyle = '#fff06b'; ctx.beginPath();
+    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 31, 0, Math.PI * 2); ctx.fill();
+    ctx.globalAlpha = 1;
+  }
+  if (p.dash > 0) {
+    ctx.globalAlpha = .3;
+    ctx.fillStyle = '#8cf6ff';
+    ctx.fillRect(p.x - p.facing * 25, p.y + 10, 28, 26);
+    ctx.globalAlpha = 1;
+  }
+  ctx.fillStyle = p.power === 'star' ? '#fff06b' : p.power === 'fire' ? '#ff713b' : '#e83d49';
+  ctx.fillRect(p.x + 3, p.y, 28, 18);
+  ctx.fillStyle = '#3266d8'; ctx.fillRect(p.x, p.y + 18, p.w, 30);
+  ctx.fillStyle = '#ffd1a3'; ctx.fillRect(p.x + 8, p.y + 5, 18, 16);
+  ctx.fillStyle = '#20120e'; ctx.fillRect(p.x + (p.facing > 0 ? 22 : 8), p.y + 10, 4, 4);
+}
+function drawParticles() { for (const pt of game.particles) { pt.x += pt.vx; pt.y += pt.vy; pt.vy += .2; ctx.fillStyle = pt.color; ctx.globalAlpha = Math.max(0, pt.life / 40); ctx.fillRect(pt.x, pt.y, 5, 5); ctx.globalAlpha = 1; } }
+function updateUI() { const p = game.player; ui.health.style.width = `${Math.max(0, p.health)}%`; ui.level.textContent = `${game.level + 1}/${LEVELS.length}`; ui.score.textContent = game.score; ui.coins.textContent = game.coins; const weaponName = game.weapon === 'basic' ? 'Basic' : game.weapon[0].toUpperCase() + game.weapon.slice(1);
+  const buffs = [
+    p.power ? (p.power === 'star' ? `Star ${Math.ceil(p.powerTime / 60)}s` : p.power.toUpperCase()) : '',
+    `Weapon: ${weaponName}`,
+    p.shield > 0 ? `Shield ${Math.ceil(p.shield/60)}s` : '',
+    p.speedBoost > 0 ? `Speed ${Math.ceil(p.speedBoost/60)}s` : '',
+    `Combo x${game.combo || 0}`,
+    `Dash ${p.dashCooldown <= 0 ? 'READY' : Math.ceil(p.dashCooldown / 60) + 's'}`
+  ].filter(Boolean);
+  ui.power.textContent = buffs.join(' | '); }
+function loop() { update(); draw(); requestAnimationFrame(loop); }
+
+const keyMap = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
+  ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', j: 'fire', J: 'fire', f: 'fire', F: 'fire',
+  Shift: 'dash', x: 'dash', X: 'dash' };
+addEventListener('keydown', e => { if (keyMap[e.key]) { keys[keyMap[e.key]] = true; e.preventDefault(); } if (e.key === 'p' || e.key === 'P') { game.state = game.state === 'playing' ? 'paused' : 'playing'; if (game.state === 'paused') show('Paused', 'Press P or Start to resume.', 'Resume'); else ui.overlay.classList.add('hidden'); } if (e.key === 'r' || e.key === 'R') start();
+  if (e.key === 'q' || e.key === 'Q') {
+    const weapons = ['basic','spread','laser','bomb'];
+    const i = weapons.indexOf(game.weapon);
+    game.weapon = weapons[(i + 1) % weapons.length];
+    game.weaponTime = 9999;
+    beep(700, .05);
+  } });
+addEventListener('keyup', e => { if (keyMap[e.key]) keys[keyMap[e.key]] = false; });
+document.querySelectorAll('[data-key]').forEach(btn => { const k = btn.dataset.key; const on = e => { e.preventDefault(); keys[k] = true; btn.classList.add('active'); }; const off = e => { e.preventDefault(); keys[k] = false; btn.classList.remove('active'); }; btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointercancel', off); btn.addEventListener('pointerleave', off); });
+ui.start.addEventListener('click', () => {
+  beep(440, .05);
+  game?.state === 'paused'
+    ? (game.state = 'playing', ui.overlay.classList.add('hidden'))
+    : start();
+});
+game = makeGame(); updateUI(); draw(); loop();
  
