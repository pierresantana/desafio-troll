"use strict";
// =====================================================================
//  JOGADOR: o soldado (movimento, física, desenho) e o tiro (balas).
// =====================================================================

function makePlayer(x, y){
  return { x, y, w: 26, h: 34, vx: 0, vy: 0, onGround: false, face: 1, dead: false, animT: 0, muzzle: 0, jumpBuf: 0 };
}

// ---------- Tiro ----------
let bullets = [];
let fireCD = 0;

function handleShooting(L){
  const p = L.player;
  if (fireCD > 0) fireCD--;
  if (p.muzzle > 0) p.muzzle--;
  const firing = keys.KeyX || keys.KeyZ || keys.KeyF;
  if (firing && fireCD === 0 && !p.dead){
    fireCD = 9; // cadência de tiro (frames)
    bullets.push({ x: p.x + p.w/2 + p.face*20, y: p.y + 16, vx: p.face*11, life: 70 });
    p.muzzle = 4;            // clarão
    p.vx -= p.face * 0.7;    // recuo
    shakeT = Math.max(shakeT, 3);
    Sfx.shoot();
  }
}

function updateBullets(){
  for (const b of bullets){ b.x += b.vx; b.life--; }
  bullets = bullets.filter(b => b.life > 0 && b.x > -20 && b.x < W + 20);
}

function drawBullets(){
  for (const b of bullets){
    ctx.fillStyle = "rgba(255,170,50,.45)";          // rastro
    ctx.fillRect(b.x - Math.sign(b.vx)*12, b.y, 12, 2);
    ctx.fillStyle = "#ffd23f";                        // traçante
    ctx.fillRect(b.x - 4, b.y, 8, 2);
  }
}

// ---------- Física do jogador contra plataformas ----------
function movePlayer(L){
  const p = L.player;
  if (p.dead) return;

  const running = keys.ShiftLeft || keys.ShiftRight;
  const mv = running ? MOVE * RUN_MULT : MOVE;
  const maxvx = running ? MAXVX * RUN_MULT : MAXVX;
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

  // fuzil à frente (x positivo)
  if (!dead) {
    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(2, -p.h/2 + 16 + bob, 18, 3);      // cano
    ctx.fillRect(4, -p.h/2 + 19 + bob, 5, 5);       // corpo da arma
    ctx.fillStyle = "#5b3a1e";
    ctx.fillRect(1, -p.h/2 + 19 + bob, 3, 6);       // coronha
    if (p.muzzle > 0) {                             // clarão do disparo
      ctx.fillStyle = "#fff0a0";
      ctx.beginPath(); ctx.arc(22, -p.h/2 + 17 + bob, 5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(255,180,60,.7)";
      ctx.beginPath(); ctx.arc(26, -p.h/2 + 17 + bob, 3, 0, Math.PI*2); ctx.fill();
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
