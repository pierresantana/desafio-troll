"use strict";
// =====================================================================
//  INIMIGOS: atualização (IA + física) e desenho.
//
//  Tipos: zombie, skeleton, mummy, ghost, bat, spider, slime.
//  Crie inimigos pela fase com L.addEnemy(type, x, y, opts). Opções úteis:
//    chase:true        -> persegue o jogador
//    minX, maxX        -> limites de patrulha
//    speed, hp, dir    -> velocidade, vida, direção inicial (-1 esq, 1 dir)
//    fly:true          -> ignora gravidade (homing se chase; senão zigue-zague)
//    amp               -> amplitude do zigue-zague dos voadores
//    hop:true          -> saltador (pula periodicamente, sofre gravidade)
//  Todo inimigo mata o jogador no contato e morre a tiros (hp).
// =====================================================================

// Pousa um inimigo (com gravidade) sobre as plataformas sólidas
function landOnPlatforms(e, L){
  for (const pl of L.platforms){
    if (pl.invisible) continue;
    if (!hit(e, pl)) continue;
    if (pl.solidTop){
      if (e.vy > 0 && (e.y + e.h) - e.vy <= pl.y + 8){ e.y = pl.y - e.h; e.vy = 0; e.onGround = true; }
    } else if (e.vy > 0){ e.y = pl.y - e.h; e.vy = 0; e.onGround = true; }
  }
}

let ambientCd = 0; // trava global p/ não tocar muitas vozes ao mesmo tempo

function updateEnemies(L){
  const p = L.player;
  if (ambientCd > 0) ambientCd--;
  for (const e of L.enemies){
    if (e.flash > 0) e.flash--;
    if (!e.alive){ e.deadT++; e.vy = (e.vy||0) + GRAV; e.y += e.vy; continue; }
    e.anim += 0.12;

    // voz do monstro (cada tipo tem seu timbre), espaçada no tempo
    if (--e.sndT <= 0){
      e.sndT = 150 + Math.floor(Math.random()*150);
      if (ambientCd <= 0 && Sfx[e.type]){ Sfx[e.type](); ambientCd = 14; }
    }

    // movimento por modo: voador / saltador / andarilho
    if (e.fly){
      if (e.chase){                                   // fantasma/morcego que caça: homing
        const dx = (p.x+p.w/2) - (e.x+e.w/2), dy = (p.y+p.h/2) - (e.y+e.h/2);
        const d = Math.hypot(dx, dy) || 1;
        e.x += dx/d * e.speed; e.y += dy/d * e.speed;
        e.dir = dx < 0 ? -1 : 1;
      } else {                                         // voa em zigue-zague (seno)
        if (e.minX != null && e.x <= e.minX) e.dir = 1;
        if (e.maxX != null && e.x + e.w >= e.maxX) e.dir = -1;
        e.x += e.dir * e.speed;
        if (e.baseY == null) e.baseY = e.y;
        e.y = e.baseY + Math.sin(e.anim * 1.6) * (e.amp || 22);
      }
    } else if (e.hop){                                 // saltador (gosma)
      if (e.chase) e.dir = Math.sign((p.x+p.w/2) - (e.x+e.w/2)) || e.dir;
      else { if (e.minX!=null && e.x<=e.minX) e.dir=1; if (e.maxX!=null && e.x+e.w>=e.maxX) e.dir=-1; }
      if (e.onGround){ e.hopCd = (e.hopCd||0) - 1; if (e.hopCd <= 0){ e.vy = -9; e.hopCd = 35 + Math.floor(Math.random()*30); } }
      e.x += e.dir * e.speed * (e.onGround ? 1 : 0.9);
      e.vy += GRAV; e.y += e.vy; e.onGround = false;
      landOnPlatforms(e, L);
    } else {                                           // andarilho (padrão)
      if (e.chase) e.dir = Math.sign((p.x+p.w/2) - (e.x+e.w/2)) || e.dir;
      if (e.minX != null && e.x <= e.minX) e.dir = 1;
      if (e.maxX != null && e.x + e.w >= e.maxX) e.dir = -1;
      e.x += e.dir * e.speed;
      e.vy += GRAV; e.y += e.vy; e.onGround = false;
      landOnPlatforms(e, L);
    }
    if (e.x < 0){ e.x = 0; e.dir = 1; }
    if (e.x + e.w > W){ e.x = W - e.w; e.dir = -1; }
    if (!e.fly && e.y > H + 120){ e.alive = false; }

    // encosta no jogador -> mata
    if (!p.dead && hit(e, p)) L.kill();
  }

  // balas atingem inimigos
  for (const b of bullets){
    if (b.life <= 0) continue;
    const bb = { x: b.x - 4, y: b.y - 2, w: 8, h: 5 };
    for (const e of L.enemies){
      if (!e.alive || !hit(bb, e)) continue;
      e.hp -= 1; e.flash = 6; b.life = 0;
      if (e.hp <= 0){ e.alive = false; e.vy = -4; e.dir = Math.sign(b.vx); Sfx.kill(); }
      else Sfx.hurt();
      break;
    }
  }
}

function drawEnemies(L){ for (const e of L.enemies) drawEnemy(e); }

function drawEnemy(e){
  ctx.save();
  ctx.translate(e.x + e.w/2, e.y + e.h/2);
  if (!e.alive){ ctx.rotate(Math.PI/2 * Math.min(1, e.deadT/12)); ctx.globalAlpha = Math.max(0.2, 1 - e.deadT/120); }
  ctx.scale(e.dir < 0 ? -1 : 1, 1);
  const w = e.w, h = e.h;
  const sway = e.alive ? Math.sin(e.anim) * 2 : 0;
  if (e.flash > 0){ ctx.globalAlpha = (ctx.globalAlpha||1) * (e.flash % 2 ? 0.4 : 1); }

  if (e.type === "zombie"){
    ctx.fillStyle = "#6a7b3a";                        // pele esverdeada
    roundRect(-w/2, -h/2 + 8 + sway, w, h*0.58, 4); ctx.fill();
    ctx.fillStyle = "#46532a"; ctx.fillRect(-w/2, -2 + sway, w, 4); // camisa rasgada
    ctx.fillStyle = "#7e9145";                        // braços esticados pra frente
    ctx.fillRect(2, -h/2 + 12 + sway, w/2 + 4, 6);
    ctx.fillStyle = "#1d1d1d"; ctx.fillRect(-7, h*0.12 + sway, 6, 12); // pernas
    ctx.fillRect(2, h*0.12 + sway, 6, 12);
    ctx.fillStyle = "#7e9145"; ctx.beginPath(); ctx.arc(0, -h/2 + 2 + sway, 9, 0, Math.PI*2); ctx.fill();
    if (e.alive){ ctx.fillStyle = "#c0392b"; ctx.beginPath(); ctx.arc(4, -h/2 + sway, 2, 0, Math.PI*2); ctx.fill(); }
    else { ctx.fillStyle = "#222"; ctx.font = "bold 10px sans-serif"; ctx.fillText("x", 1, -h/2 + 3 + sway); }
  }
  else if (e.type === "skeleton"){
    ctx.strokeStyle = "#e9e9e0"; ctx.lineWidth = 2;
    ctx.fillStyle = "#e9e9e0";
    ctx.fillRect(-1, -h/2 + 10 + sway, 2, h*0.4);                      // coluna
    for (let i=0;i<3;i++){ ctx.fillRect(-7, -h/2 + 12 + i*6 + sway, 14, 2); } // costelas
    ctx.fillRect(-6, h*0.12 + sway, 3, 12); ctx.fillRect(3, h*0.12 + sway, 3, 12); // pernas
    ctx.fillRect(4, -h/2 + 14 + sway, 9, 2);                          // braço
    ctx.beginPath(); ctx.arc(0, -h/2 + 2 + sway, 9, 0, Math.PI*2); ctx.fill(); // crânio
    ctx.fillStyle = "#333";
    ctx.beginPath(); ctx.arc(-2, -h/2 + sway, 2, 0, Math.PI*2);
    ctx.arc(5, -h/2 + sway, 2, 0, Math.PI*2); ctx.fill();             // olhos vazados
    ctx.fillRect(-3, -h/2 + 5 + sway, 8, 2);                          // dentes
  }
  else if (e.type === "mummy"){
    ctx.fillStyle = "#cdbf99";
    roundRect(-w/2, -h/2 + 6 + sway, w, h*0.6, 4); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -h/2 + 2 + sway, 9, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#a8966c"; ctx.lineWidth = 2;                   // faixas
    for (let i=0;i<5;i++){ const yy = -h/2 + 8 + i*7 + sway;
      ctx.beginPath(); ctx.moveTo(-w/2, yy); ctx.lineTo(w/2, yy - 3); ctx.stroke(); }
    ctx.fillStyle = "#cdbf99"; ctx.fillRect(2, -h/2 + 12 + sway, w/2 + 3, 6);
    ctx.fillStyle = "#8c7c52"; ctx.fillRect(-7, h*0.12 + sway, 6, 12); ctx.fillRect(2, h*0.12 + sway, 6, 12);
    if (e.alive){ ctx.fillStyle = "#ffd34d"; ctx.beginPath(); ctx.arc(4, -h/2 + sway, 1.8, 0, Math.PI*2); ctx.fill(); }
  }
  else if (e.type === "ghost"){
    ctx.globalAlpha = (ctx.globalAlpha||1) * 0.8;
    ctx.fillStyle = "#dfe9f5";                         // corpo flutuante
    ctx.beginPath(); ctx.arc(0, -4 + sway, 11, Math.PI, 0);
    ctx.lineTo(11, h*0.32 + sway);
    for (let i=0;i<3;i++){ const bx = 11 - i*7.3; ctx.lineTo(bx-3.6, h*0.32-5 + sway); ctx.lineTo(bx-7.3, h*0.32 + sway); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#3a4a66";
    ctx.beginPath(); ctx.arc(-3, -5 + sway, 2, 0, Math.PI*2); ctx.arc(5, -5 + sway, 2, 0, Math.PI*2); ctx.fill();
  }
  else if (e.type === "bat"){
    const flap = Math.sin(e.anim*3) * 6;
    ctx.fillStyle = "#3a2b3f";
    ctx.beginPath(); ctx.arc(0, sway, 6, 0, Math.PI*2); ctx.fill();   // corpo
    ctx.beginPath();                                   // asas batendo
    ctx.moveTo(0, sway); ctx.lineTo(-15, sway - flap); ctx.lineTo(-8, sway + 4); ctx.closePath();
    ctx.moveTo(0, sway); ctx.lineTo(15, sway - flap);  ctx.lineTo(8, sway + 4);  ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff5a5a"; ctx.fillRect(-3, sway-2, 2, 2); ctx.fillRect(2, sway-2, 2, 2); // olhos
  }
  else if (e.type === "spider"){
    const lp = Math.sin(e.anim*2) * 3;
    ctx.strokeStyle = "#15100f"; ctx.lineWidth = 2;    // patas
    for (let i=0;i<3;i++){ const yy = 2 + i*4;
      ctx.beginPath(); ctx.moveTo(-3, yy); ctx.lineTo(-13, yy - 4 + lp); ctx.moveTo(3, yy); ctx.lineTo(13, yy - 4 - lp); ctx.stroke(); }
    ctx.fillStyle = "#241a18"; ctx.beginPath(); ctx.arc(0, 4, 9, 0, Math.PI*2); ctx.fill(); // abdômen
    ctx.beginPath(); ctx.arc(0, -3, 5, 0, Math.PI*2); ctx.fill();                            // cabeça
    ctx.fillStyle = "#e23b3b"; ctx.fillRect(-3, -4, 2, 2); ctx.fillRect(1, -4, 2, 2);        // olhos
  }
  else if (e.type === "slime"){
    const squash = e.onGround ? 1 : 0.7;
    ctx.fillStyle = "#46c08a";
    ctx.beginPath();
    ctx.ellipse(0, h*0.18, 12, 11*squash + 4, 0, Math.PI, 0);          // domo
    ctx.lineTo(12, h*0.28); ctx.lineTo(-12, h*0.28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.arc(-4, h*0.10, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#143b2b"; ctx.beginPath(); ctx.arc(-3, h*0.16, 1.8, 0, Math.PI*2); ctx.arc(5, h*0.16, 1.8, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}
