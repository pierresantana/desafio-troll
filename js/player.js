"use strict";
// =====================================================================
//  JOGADOR: o soldado (movimento, física, desenho) e o tiro (balas).
// =====================================================================

function makePlayer(x, y){
  return { x, y, w: 26, h: PLAYER_H, vx: 0, vy: 0, onGround: false, face: 1, dead: false, animT: 0, muzzle: 0, jumpBuf: 0, crouch: false };
}

// ---------- Tiro (BAZUCA: dispara foguetes que explodem em área) ----------
let bullets = [];
let blasts = [];      // explosões dos foguetes
let fireCD = 0;

function handleShooting(L){
  const p = L.player;
  if (fireCD > 0) fireCD--;
  if (p.muzzle > 0) p.muzzle--;
  const firing = keys.KeyX || keys.KeyZ || keys.KeyF;
  if (firing && fireCD === 0 && !p.dead){
    fireCD = 8; // arminha de brinquedo: cadência rápida
    const hue = Math.floor(Math.random() * 6) * 60;   // bolinha de cor aleatória
    bullets.push({ x: p.x + p.w/2 + p.face*18, y: p.y + 16, vx: p.face*9, life: 70, hue });
    p.muzzle = 3;           // pop colorido
    p.vx -= p.face * 0.3;   // recuo fraquinho
    shakeT = Math.max(shakeT, 1);
    Sfx.shoot();
  }
}

function updateBullets(){
  for (const b of bullets){ b.x += b.vx; b.life--; }
  bullets = bullets.filter(b => b.life > 0 && b.x > -20 && b.x < W + 20);
}

// Explosão do foguete: efeito + dano em área aos inimigos próximos.
function explodeAt(x, y, L){
  blasts.push({ x, y, r: 8, max: 52, life: 20 });
  shakeT = Math.max(shakeT, 12);
  Sfx.explosion();
  const R = 52;
  for (const e of L.enemies){
    if (!e.alive) continue;
    const dx = (e.x + e.w/2) - x, dy = (e.y + e.h/2) - y;
    if (dx*dx + dy*dy <= R*R){
      e.hp -= 3; e.flash = 6;
      if (e.hp <= 0){ e.alive = false; e.vy = -5; e.dir = dx < 0 ? -1 : 1; Sfx.kill(); }
      else Sfx.hurt();
    }
  }
}

function updateBlasts(){
  for (const x of blasts){ x.r += (x.max - x.r) * 0.3; x.life--; }
  blasts = blasts.filter(x => x.life > 0);
}

function drawBlasts(){
  for (const e of blasts){
    const a = e.life / 20;
    ctx.fillStyle = `rgba(255,170,60,${0.45*a})`;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgba(255,90,30,${0.7*a})`;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r*0.6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgba(255,245,190,${a})`;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r*0.3, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = `rgba(255,200,120,${0.6*a})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.stroke();
  }
}

function drawBullets(){
  for (const b of bullets){
    const dir = Math.sign(b.vx) || 1;
    const hue = b.hue || 40;
    // rastrinho colorido
    ctx.fillStyle = `hsla(${hue}, 90%, 60%, .25)`;
    ctx.beginPath(); ctx.arc(b.x - dir*7, b.y, 3, 0, Math.PI*2); ctx.fill();
    // bolinha de brinquedo
    ctx.fillStyle = `hsl(${hue}, 90%, 58%)`;
    ctx.beginPath(); ctx.arc(b.x, b.y, 4.5, 0, Math.PI*2); ctx.fill();
    // brilho
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.beginPath(); ctx.arc(b.x - 1.5, b.y - 1.5, 1.4, 0, Math.PI*2); ctx.fill();
  }
}

// ---------- Granada (arma secundária: tecla P / botão 💣) ----------
let grenades = [];
let grenadeCD = 0;

function handleGrenade(L){
  const p = L.player;
  if (grenadeCD > 0) grenadeCD--;
  if (PRESS.KeyP && grenadeCD === 0 && !p.dead){
    grenadeCD = 45;   // intervalo entre arremessos
    grenades.push({ x: p.x + p.w/2 + p.face*10, y: p.y + 6, vx: p.face*7, vy: -8, fuse: 75, r: 6 });
    Sfx.swoosh();
  }
}

function updateGrenades(L){
  for (const g of grenades){
    g.vy += GRAV; if (g.vy > 16) g.vy = 16;
    g.x += g.vx; g.y += g.vy;
    const box = { x: g.x - g.r, y: g.y - g.r, w: g.r*2, h: g.r*2 };
    for (const pl of L.platforms){
      if (!hit(box, pl)) continue;
      if (g.vy > 0 && g.y < pl.y + 8){           // pousa/quica no topo
        g.y = pl.y - g.r; g.vy *= -0.4; g.vx *= 0.7;
        if (Math.abs(g.vy) < 1.5) g.vy = 0;
      } else { g.vx *= -0.4; }                    // bate de lado
    }
    if (g.x < g.r){ g.x = g.r; g.vx *= -0.4; }
    if (g.x > W - g.r){ g.x = W - g.r; g.vx *= -0.4; }
    g.fuse--;
  }
  for (const g of grenades) if (g.fuse <= 0) explodeAt(g.x, g.y, L);   // estoura no tempo
  grenades = grenades.filter(g => g.fuse > 0);
}

function drawGrenades(){
  for (const g of grenades){
    const dir = Math.sign(g.vx) || 1;
    ctx.save(); ctx.translate(g.x, g.y); ctx.scale(dir, 1);
    // corpo do patinho de borracha
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath(); ctx.ellipse(-1, 1, g.r + 1, g.r - 1, 0, 0, Math.PI*2); ctx.fill();
    // cabeça
    ctx.beginPath(); ctx.arc(g.r - 2, -g.r + 1, g.r - 2, 0, Math.PI*2); ctx.fill();
    // asinha
    ctx.fillStyle = "#f0b400";
    ctx.beginPath(); ctx.ellipse(-2, 1, 2.5, 3.5, 0, 0, Math.PI*2); ctx.fill();
    // bico
    ctx.fillStyle = "#ff8c1a";
    ctx.beginPath(); ctx.moveTo(g.r, -g.r + 1); ctx.lineTo(g.r + 5, -g.r + 2); ctx.lineTo(g.r, -g.r + 4); ctx.fill();
    // olho
    ctx.fillStyle = "#222"; ctx.beginPath(); ctx.arc(g.r - 1, -g.r, 1, 0, Math.PI*2); ctx.fill();
    // pavio aceso piscando perto de explodir
    if (g.fuse < 26 && g.fuse % 8 < 4){
      ctx.fillStyle = "#ff3c2e"; ctx.beginPath(); ctx.arc(0, -g.r - 2, 2, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
}

// ---------- Física do jogador contra plataformas ----------
function movePlayer(L){
  const p = L.player;
  if (p.dead) return;

  // agachar: só no chão; encolhe a hitbox mantendo os pés no lugar.
  const wantCrouch = keys.ArrowDown && p.onGround;
  if (wantCrouch && !p.crouch) {
    p.crouch = true;
    p.y += (PLAYER_H - CROUCH_H);
    p.h = CROUCH_H;
  } else if (!wantCrouch && p.crouch) {
    // só levanta se houver espaço acima (não atravessa teto)
    const stand = { x: p.x, y: p.y - (PLAYER_H - CROUCH_H), w: p.w, h: PLAYER_H };
    let blocked = false;
    for (const pl of L.platforms) {
      if (pl.solidTop) continue;
      if (hit(stand, pl)) { blocked = true; break; }
    }
    if (!blocked) { p.y -= (PLAYER_H - CROUCH_H); p.h = PLAYER_H; p.crouch = false; }
  }

  const running = (keys.ShiftLeft || keys.ShiftRight) && !p.crouch;
  const mv = (running ? MOVE * RUN_MULT : MOVE) * (p.crouch ? 0.35 : 1);
  const maxvx = (running ? MAXVX * RUN_MULT : MAXVX) * (p.crouch ? 0.4 : 1);
  if (keys.ArrowLeft)  { p.vx -= mv; p.face = -1; }
  if (keys.ArrowRight) { p.vx += mv; p.face = 1; }
  p.vx *= FRICTION;
  p.vx = Math.max(-maxvx, Math.min(maxvx, p.vx));
  if (Math.abs(p.vx) < 0.05) p.vx = 0;

  // guarda o aperto de pulo num buffer curto; o pulo em si é disparado depois
  // de resolver a colisão vertical (quando sabemos se está mesmo no chão).
  if (PRESS.ArrowUp || PRESS.Space) p.jumpBuf = JUMP_BUFFER;
  else if (p.jumpBuf > 0) p.jumpBuf--;

  p.vy += GRAV;
  if (p.vy > 18) p.vy = 18;

  // eixo X
  p.x += p.vx;
  for (const pl of L.platforms) {
    if (pl.solidTop) continue;
    if (hit(p, pl)) {
      if (p.vx > 0) p.x = pl.x - p.w;
      else if (p.vx < 0) p.x = pl.x + pl.w;
      p.vx = 0;
    }
  }

  // eixo Y
  p.onGround = false;
  p.y += p.vy;
  for (const pl of L.platforms) {
    if (!hit(p, pl)) continue;
    if (pl.solidTop) {
      // plataforma que só colide vindo de cima
      if (p.vy > 0 && (p.y + p.h) - p.vy <= pl.y + 8) {
        p.y = pl.y - p.h; p.vy = 0; p.onGround = true;
      }
    } else {
      if (p.vy > 0) { p.y = pl.y - p.h; p.vy = 0; p.onGround = true; }
      else if (p.vy < 0) { p.y = pl.y + pl.h; p.vy = 0; }
    }
  }

  // pulo: com onGround já atualizado, o buffer tolera apertos um pouco
  // antes de tocar o chão (martelar o botão passa a funcionar).
  if (p.jumpBuf > 0 && p.onGround) { p.vy = -JUMP; p.onGround = false; p.jumpBuf = 0; Sfx.jump(); }

  if (Math.abs(p.vx) > 0.3 && p.onGround) p.animT += 0.25;

  // limites e queda no vazio
  if (p.x < 0) { p.x = 0; p.vx = 0; }
  if (p.x + p.w > W) { p.x = W - p.w; p.vx = 0; }
  if (p.y > H + 80) L.kill();

  // perigos
  for (const z of L.hazards) if (hit(p, z)) { L.kill(); break; }

  // chegou no objetivo (bandeira trancada não conta)
  if (L.goal && !L.goal.locked && !L.won && hit(p, L.goal)) {
    L.won = true;
    Sfx.win();
    nextLevel();
  }
}

// ---------- Desenho do soldado ----------
function drawPlayer(p){
  ctx.save();
  ctx.translate(p.x + p.w/2, p.y + p.h/2);
  ctx.scale(p.face, 1);
  const bob = p.onGround ? Math.sin(p.animT)*1.5 : 0;
  const dead = p.dead;
  const step = p.onGround ? Math.sin(p.animT)*4 : 3;

  // mochila/rádio nas costas (x negativo = atrás)
  ctx.fillStyle = dead ? "#5a5a5a" : "#3e4a30";
  roundRect(-p.w/2 - 5, -p.h*0.16 + bob, 8, p.h*0.46, 2); ctx.fill();
  ctx.fillStyle = "#2c3322";
  ctx.fillRect(-p.w/2 - 3, -p.h*0.30 + bob, 2, 9); // antena do rádio

  // pernas (calça camuflada) + coturnos
  ctx.fillStyle = dead ? "#888" : "#4a5538";
  ctx.fillRect(-7, p.h*0.08 + bob, 6, 11 + step);
  ctx.fillRect( 2, p.h*0.08 + bob, 6, 11 - step);
  ctx.fillStyle = "#1d1d1d"; // coturnos
  ctx.fillRect(-8, p.h*0.08 + 11 + step + bob, 8, 4);
  ctx.fillRect( 1, p.h*0.08 + 11 - step + bob, 8, 4);

  // farda / colete
  ctx.fillStyle = dead ? "#8a8a8a" : "#5a6642";
  roundRect(-p.w/2, -p.h/2 + 6 + bob, p.w, p.h*0.6, 5); ctx.fill();
  // manchas de camuflagem
  if (!dead) {
    ctx.fillStyle = "#46512f";
    ctx.fillRect(-p.w/2+3, -p.h/2+10+bob, 6, 5);
    ctx.fillRect(2, -p.h/2+18+bob, 7, 6);
    ctx.fillRect(-8, p.h*0.0+bob, 5, 5);
  }
  ctx.fillStyle = dead ? "#777" : "#3a3326";       // cinto
  ctx.fillRect(-p.w/2, p.h*0.04 + bob, p.w, 3);

  // arminha de brinquedo (x positivo = frente)
  if (!dead) {
    const gy = -p.h/2 + 16 + bob;
    ctx.fillStyle = "#ff7a1a"; roundRect(0, gy, 17, 6, 2); ctx.fill();   // corpo laranja
    ctx.fillStyle = "#ffd23f"; ctx.fillRect(16, gy+1, 5, 4);            // bico amarelo (ponta de brinquedo)
    ctx.fillStyle = "#33aaff"; roundRect(0, gy+5, 6, 7, 2); ctx.fill(); // cabo azul
    ctx.fillStyle = "#2a7fbf"; ctx.fillRect(6, gy+6, 2, 4);             // gatilho
    if (p.muzzle > 0) {                                                 // pop colorido na boca
      ctx.fillStyle = "rgba(255,225,90,.9)";
      ctx.beginPath(); ctx.arc(23, gy+3, 3.5, 0, Math.PI*2); ctx.fill();
    }
  }

  // cabeça
  const hy = -p.h/2 - 4 + bob;
  ctx.fillStyle = "#e0b48a";                         // rosto
  ctx.beginPath(); ctx.arc(1, hy + 1, 8, 0, Math.PI*2); ctx.fill();
  // capacete militar
  ctx.fillStyle = dead ? "#777" : "#4b552f";
  ctx.beginPath(); ctx.arc(0, hy - 1, 10, Math.PI, 0); ctx.fill();   // cúpula
  ctx.fillRect(-10, hy - 1, 20, 3);                                   // aba
  if (!dead) { ctx.fillStyle = "#3c4526"; ctx.fillRect(5, hy-9, 3, 6); } // detalhe lateral

  // olhos
  ctx.fillStyle = "#222";
  if (dead) {
    ctx.font = "bold 11px sans-serif"; ctx.fillText("x", -2, hy + 4);
  } else {
    ctx.beginPath(); ctx.arc(5, hy + 1, 1.6, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}
