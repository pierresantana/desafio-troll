"use strict";
// =====================================================================
//  FASES.
//
//  Cada fase é um objeto com:
//    mission, hint  -> textos do HUD
//    theme          -> cenário (ver THEME em scenery.js)
//    spawn {x,y}    -> onde o jogador nasce
//    build(L)       -> monta o cenário (plataformas, perigos, inimigos, goal)
//    update(L,dt)   -> a lógica da "trollada" da fase, todo frame
//    draw(L)        -> desenho extra da fase (itens, espinhos, rachaduras...)
//
//  O objeto L (criado por createLevel) oferece:
//    L.addPlatform(x,y,w,h,extra)  extra: {solidTop, invisible, color, grass}
//    L.addHazard(x,y,w,h)          mata ao tocar
//    L.addEnemy(type,x,y,opts)     ver js/enemies.js
//    L.goal = {x,y,w,h, [locked], [hidden]}   bandeira; locked/hidden travam a vitória
//    L.data = {}                   espaço livre para o estado da fase
//    L.kill()                      mata o jogador
// =====================================================================

function createLevel(def){
  const L = {
    def,
    player: makePlayer(def.spawn.x, def.spawn.y),
    platforms: [],
    hazards: [],
    enemies: [],
    goal: null,
    items: [],
    t: 0,
    won: false,
    data: {},
    addPlatform(x,y,w,h,extra={}){ const p={x,y,w,h,...extra}; L.platforms.push(p); return p; },
    addHazard(x,y,w,h){ const z={x,y,w,h}; L.hazards.push(z); return z; },
    addEnemy(type,x,y,opts={}){
      const e = { type, x, y, w:24, h:34, vx:0, vy:0, dir:-1, speed:1.1,
                  hp:2, alive:true, anim:0, flash:0, onGround:false, deadT:0,
                  sndT: 30 + Math.floor(Math.random()*150), ...opts };
      L.enemies.push(e); return e;
    },
    kill(){ if(!L.player.dead){ L.player.dead = true; shakeT = 18; Sfx.die(); Sfx.explosion(); } },
  };
  def.build(L);
  return L;
}

// helper de "plataforma que cede" (usado por várias fases)
function crumbleStep(L, grace){
  const p = L.player;
  for (const pl of L.data.floaters){
    const standing = p.onGround && p.x+p.w > pl.x && p.x < pl.x+pl.w
                     && Math.abs((p.y+p.h) - pl.y) < 6;
    if (standing && !pl.triggered){ pl.triggered = true; pl.grace = grace; pl.vy = 0; Sfx.creak(); }
  }
  for (const pl of L.data.floaters){
    if (!pl.triggered) continue;
    if (pl.grace > 0) pl.grace--;
    else { pl.vy += 0.7; pl.y += pl.vy; pl.solidTop = pl.y < 480; }
  }
}
function crumbleCracks(L){
  for (const pl of L.data.floaters){
    if (pl.triggered && pl.grace > 0){
      const sx = (Math.random()-.5)*3;
      ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pl.x+24+sx, pl.y); ctx.lineTo(pl.x+34+sx, pl.y+pl.h);
      ctx.moveTo(pl.x+62+sx, pl.y); ctx.lineTo(pl.x+54+sx, pl.y+pl.h);
      ctx.stroke();
    }
  }
}

const LEVELS = [

// --- Fase 1: o buraco que cresce ----------------------------------
{
  mission: "Fase 1 — Pule sobre o buraco e chegue na bandeira.",
  hint: "É só um pulinho. Tranquilo.",
  theme: "wasteland",
  spawn: { x: 40, y: 300 },
  build(L){
    const ground = 360;
    L.addPlatform(0, ground, 320, 90);
    const right = L.addPlatform(480, ground, 320, 90); // buraco ~160
    L.data.right = right;
    L.data.grown = false;
    L.goal = { x: 730, y: ground - 40, w: 24, h: 40 };
  },
  update(L){
    const p = L.player;
    // TROLL: ao pular sobre o buraco, o chão da direita recua e o buraco cresce.
    if (!L.data.grown && p.vy < 0 && p.x > 250 && p.x < 330) {
      L.data.grown = true;
      const r = L.data.right;
      r.x += 70; r.w -= 70;
      L.addPlatform(395, 360, 80, 18, { solidTop:true, invisible:true }); // chão invisível salvador
      shakeT = 14; Sfx.rumble();
    }
  },
  draw(L){}
},

// --- Fase 2: a chave fujona ---------------------------------------
{
  mission: "Fase 2 — Pegue a chave dourada, depois alcance a bandeira.",
  hint: "Encoste na chave. Difícil não é.",
  theme: "factory",
  spawn: { x: 40, y: 300 },
  build(L){
    const ground = 360;
    L.addPlatform(0, ground, W, 90);
    L.data.ground = ground;
    L.data.key = { x: 360, y: ground - 60, w: 22, h: 22, taken: false, flees: 0, settled: false };
    L.data.trail = [];
    L.data.hasKey = false;
    L.goal = { x: 740, y: ground - 40, w: 24, h: 40, locked: true };
  },
  update(L){
    const p = L.player, k = L.data.key;
    const SETTLE_AT = 10;
    for (const g of L.data.trail) g.life -= 0.04;
    L.data.trail = L.data.trail.filter(g => g.life > 0);
    if (!k.taken) {
      if (!k.settled) {
        const dist = Math.abs((k.x + k.w/2) - (p.x + p.w/2));
        if (dist < 45) {
          k.flees += 1;
          const ox = k.x, oy = k.y;
          if (k.flees >= SETTLE_AT) {
            k.settled = true;
            k.x = L.goal.x - 48;
            k.y = L.data.ground - k.h;
          } else {
            let nx, ny, tries = 0;
            do {
              nx = 60 + Math.random() * (W - 150);
              ny = 230 + Math.random() * 108;
              tries++;
            } while (Math.abs((nx + k.w/2) - (p.x + p.w/2)) < 150 && tries < 12);
            k.x = nx; k.y = ny;
          }
          const cox = ox + k.w/2, coy = oy + k.h/2;
          const cnx = k.x + k.w/2, cny = k.y + k.h/2;
          for (let i = 0; i <= 8; i++) {
            const t = i / 8;
            L.data.trail.push({
              x: cox + (cnx - cox) * t + (Math.random()-.5)*6,
              y: coy + (cny - coy) * t + (Math.random()-.5)*6,
              life: 1 - t * 0.35,
            });
          }
          shakeT = 6; Sfx.teleport();
        }
      }
      if (k.settled && hit(p, k)) { k.taken = true; L.data.hasKey = true; }
    }
    L.goal.locked = !L.data.hasKey;
  },
  draw(L){
    const k = L.data.key;
    for (const g of L.data.trail) {
      ctx.globalAlpha = Math.max(0, g.life) * 0.8;
      ctx.fillStyle = "#fff3b0";
      ctx.beginPath(); ctx.arc(g.x, g.y, 2 + g.life * 4, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!k.taken) {
      ctx.fillStyle = "#ffcc33";
      ctx.beginPath(); ctx.arc(k.x+6, k.y+8, 7, 0, Math.PI*2); ctx.fill();
      ctx.fillRect(k.x+5, k.y+8, 4, 16);
      ctx.fillRect(k.x+5, k.y+18, 8, 3);
    }
    if (L.goal.locked) {
      ctx.fillStyle = "#caa"; ctx.font = "16px sans-serif";
      ctx.fillText("🔒", L.goal.x+2, L.goal.y - 6);
    }
  }
},

// --- Fase 3: a plataforma traidora --------------------------------
{
  mission: "Fase 3 — Atravesse a base militar destruída até a bandeira.",
  hint: "Pise com confiança.",
  theme: "base",
  spawn: { x: 30, y: 250 },
  build(L){
    L.addPlatform(0, 360, 140, 90);
    L.data.floaters = [];
    for (const x of [200, 330, 460, 590]) {
      const pl = L.addPlatform(x, 300, 90, 18, { solidTop:true });
      pl.triggered = false; pl.grace = 0; pl.vy = 0; pl.trap = (x === 330 || x === 590);
      L.data.floaters.push(pl);
    }
    L.addPlatform(680, 360, 120, 90);
    L.goal = { x: 730, y: 320, w: 24, h: 40 };
  },
  update(L){
    // só as plataformas marcadas como trap (2ª e 4ª) caem
    const p = L.player;
    for (const pl of L.data.floaters){
      if (!pl.trap) continue;
      const standing = p.onGround && p.x+p.w > pl.x && p.x < pl.x+pl.w && Math.abs((p.y+p.h) - pl.y) < 6;
      if (standing && !pl.triggered){ pl.triggered = true; pl.grace = 12; pl.vy = 0; Sfx.creak(); }
    }
    for (const pl of L.data.floaters){
      if (!pl.triggered) continue;
      if (pl.grace > 0) pl.grace--;
      else { pl.vy += 0.7; pl.y += pl.vy; pl.solidTop = pl.y < 480; }
    }
  },
  draw(L){ crumbleCracks(L); }
},

// --- Fase 4: a bandeira covarde -----------------------------------
{
  mission: "Fase 4 — Toque a bandeira covarde. Ela foge de um lado pro outro.",
  hint: "Pule os espinhos quantas vezes for preciso.",
  theme: "city",
  spawn: { x: 40, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 700, y: 318, w: 24, h: 40 };
    L.data.side = "right"; L.data.dodges = 0; L.data.maxDodges = 4; L.data.cool = 0;
    L.data.spikes = L.addHazard(360, 338, 80, 22);
  },
  update(L){
    const p = L.player, g = L.goal, d = L.data;
    if (d.cool > 0) d.cool--;
    const target = d.side === "right" ? 700 : 96;
    if (g.x < target) g.x = Math.min(target, g.x + 7);
    else if (g.x > target) g.x = Math.max(target, g.x - 7);
    const dist = Math.abs(g.x - (p.x + p.w/2));
    if (d.dodges < d.maxDodges && dist < 70 && d.cool === 0) {
      d.side = d.side === "right" ? "left" : "right";
      d.dodges++; d.cool = 20; shakeT = 10; Sfx.swoosh();
    }
  },
  draw(L){ drawSpikes(L.data.spikes); }
},

// --- Fase 5: o cemitério dos zumbis -------------------------------
{
  mission: "Fase 5 — Atravesse o cemitério até a bandeira.",
  hint: "Os mortos dormem aqui. Não acorde todos.",
  theme: "graveyard",
  spawn: { x: 30, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 745, y: 320, w: 22, h: 40 };
    L.addEnemy("zombie", 300, 320, { dir:-1, speed:1.0, hp:2, chase:true });
    L.addEnemy("zombie", 520, 320, { dir:-1, speed:1.0, hp:2, chase:true });
    L.data.next = 90;
  },
  update(L){
    L.data.next--;
    if (L.data.next <= 0 && L.enemies.filter(e=>e.alive).length < 7){
      L.data.next = 110;
      const sx = L.player.x + (Math.random() < 0.5 ? 230 : -170);
      L.addEnemy("zombie", Math.max(20, Math.min(W-40, sx)), 320,
                 { dir:-1, speed:1.0 + Math.random()*0.5, hp:2, chase:true });
    }
  },
  draw(L){}
},

// --- Fase 6: a cripta dos esqueletos ------------------------------
{
  mission: "Fase 6 — Cruze a cripta. Nem todo chão é o que parece.",
  hint: "Há uma ponte onde parece não haver nada.",
  theme: "crypt",
  spawn: { x: 20, y: 250 },
  build(L){
    L.addPlatform(0, 360, 250, 90);
    L.addPlatform(250, 360, 300, 90, { invisible:true }); // ponte invisível
    L.addPlatform(550, 360, 250, 90);
    L.goal = { x: 745, y: 320, w: 22, h: 40 };
    L.addEnemy("skeleton", 140, 320, { dir:1,  speed:1.3, hp:1, minX:20,  maxX:240 });
    L.addEnemy("skeleton", 400, 320, { dir:1,  speed:1.2, hp:1, minX:260, maxX:540 });
    L.addEnemy("skeleton", 640, 320, { dir:-1, speed:1.3, hp:1, minX:560, maxX:780 });
  },
  update(L){},
  draw(L){}
},

// --- Fase 7: a tumba das múmias -----------------------------------
{
  mission: "Fase 7 — Encontre a saída da tumba.",
  hint: "As múmias são lentas. A saída, covarde.",
  theme: "tomb",
  spawn: { x: 30, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 700, y: 320, w: 22, h: 40 };
    L.data.dodge = 0;
    L.addEnemy("mummy", 360, 320, { dir:-1, speed:0.7, hp:3, chase:true });
    L.addEnemy("mummy", 560, 320, { dir:-1, speed:0.7, hp:3, chase:true });
  },
  update(L){
    const p = L.player, g = L.goal;
    const dx = g.x - (p.x + p.w);
    if (dx > -10 && dx < 70 && L.data.dodge < 3){
      g.x = Math.min(W - 30, g.x + 95); L.data.dodge++; shakeT = 8; Sfx.swoosh();
    }
  },
  draw(L){}
},

// --- Fase 8: a horda na rua ---------------------------------------
{
  mission: "Fase 8 — A saída ficou pra trás. Vire-se e volte.",
  hint: "Eles vêm dos dois lados. Abra caminho.",
  theme: "city",
  spawn: { x: 600, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 40, y: 320, w: 22, h: 40 };
    L.player.face = -1;
    L.addEnemy("zombie", 230, 320, { dir:1,  speed:1.1, hp:2, chase:true });
    L.addEnemy("zombie", 760, 320, { dir:-1, speed:1.1, hp:2, chase:true });
    L.data.next = 80;
  },
  update(L){
    L.data.next--;
    if (L.data.next <= 0 && L.enemies.filter(e=>e.alive).length < 8){
      L.data.next = 95;
      const fromLeft = Math.random() < 0.5;
      L.addEnemy("zombie", fromLeft ? 10 : W-34, 320,
                 { dir: fromLeft?1:-1, speed:1.0 + Math.random()*0.6, hp:2, chase:true });
    }
  },
  draw(L){}
},

// --- Fase 9: as plataformas assombradas ---------------------------
{
  mission: "Fase 9 — Salte pela ruína. O chão não confia em você.",
  hint: "As plataformas pálidas cedem. Não pare em cima.",
  theme: "crypt",
  spawn: { x: 20, y: 250 },
  build(L){
    L.addPlatform(0, 360, 120, 90);
    L.data.floaters = [];
    for (const x of [180, 320, 460, 600]){
      const pl = L.addPlatform(x, 300, 90, 18, { solidTop:true });
      pl.triggered = false; pl.grace = 0; pl.vy = 0;
      L.data.floaters.push(pl);
    }
    L.addPlatform(700, 360, 100, 90);
    L.goal = { x: 745, y: 320, w: 22, h: 40 };
    L.addEnemy("skeleton", 740, 320, { dir:-1, speed:1.2, hp:1, minX:700, maxX:790 });
  },
  update(L){ crumbleStep(L, 50); },
  draw(L){ crumbleCracks(L); }
},

// --- Fase 10: o último troll (da primeira leva) -------------------
{
  mission: "Fase 10 — Tudo de uma vez. Zumbi, esqueleto e múmia.",
  hint: "Bandeira covarde, espinhos e os mortos. Sobreviva.",
  theme: "tomb",
  spawn: { x: 30, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 700, y: 318, w: 22, h: 40 };
    L.data.side = "right"; L.data.dodges = 0; L.data.maxDodges = 3; L.data.cool = 0;
    L.data.spikes = L.addHazard(370, 338, 70, 22);
    L.addEnemy("zombie",   300, 320, { dir:-1, speed:1.0, hp:2, chase:true });
    L.addEnemy("skeleton", 520, 320, { dir:-1, speed:1.3, hp:1, chase:true });
    L.addEnemy("mummy",    640, 320, { dir:-1, speed:0.7, hp:3, chase:true });
  },
  update(L){
    const p = L.player, g = L.goal, d = L.data;
    if (d.cool > 0) d.cool--;
    const target = d.side === "right" ? 700 : 96;
    if (g.x < target) g.x = Math.min(target, g.x + 7);
    else if (g.x > target) g.x = Math.max(target, g.x - 7);
    const dist = Math.abs(g.x - (p.x + p.w/2));
    if (d.dodges < d.maxDodges && dist < 70 && d.cool === 0){
      d.side = d.side === "right" ? "left" : "right";
      d.dodges++; d.cool = 20; shakeT = 10; Sfx.swoosh();
    }
  },
  draw(L){ drawSpikes(L.data.spikes); }
},

// --- Fase 11: a caverna dos morcegos ------------------------------
{
  mission: "Fase 11 — Atravesse a caverna. Cuidado com o que voa.",
  hint: "Morcegos mergulham em você. Atire ou desvie.",
  theme: "cave",
  spawn: { x: 30, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 745, y: 320, w: 22, h: 40 };
    L.addEnemy("bat", 300, 120, { fly:true, chase:true, speed:1.5, hp:1 });
    L.addEnemy("bat", 600, 140, { fly:true, chase:true, speed:1.7, hp:1 });
    L.addEnemy("bat", 450, 90,  { fly:true, speed:1.6, hp:1, amp:40, minX:120, maxX:700, dir:1 });
  },
  update(L){},
  draw(L){}
},

// --- Fase 12: o ninho de aranhas ----------------------------------
{
  mission: "Fase 12 — Fuja do ninho. As aranhas caem do teto.",
  hint: "Rápidas no chão. Atire antes que cheguem.",
  theme: "cave",
  spawn: { x: 30, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 745, y: 320, w: 22, h: 40 };
    L.addEnemy("spider", 400, 320, { dir:-1, speed:2.2, hp:1, chase:true });
    L.data.next = 70;
  },
  update(L){
    // TROLL: aranhas despencam do teto perto de você.
    L.data.next--;
    if (L.data.next <= 0 && L.enemies.filter(e=>e.alive).length < 8){
      L.data.next = 85;
      const sx = L.player.x + (Math.random() < 0.5 ? 180 : -150);
      L.addEnemy("spider", Math.max(20, Math.min(W-40, sx)), -30,
                 { dir:-1, speed:2.0 + Math.random()*0.8, hp:1, chase:true });
    }
  },
  draw(L){}
},

// --- Fase 13: o esgoto das gosmas ---------------------------------
{
  mission: "Fase 13 — Atravesse o esgoto sem cair na gosma.",
  hint: "As gosmas saltam. O líquido tóxico mata.",
  theme: "sewer",
  spawn: { x: 20, y: 300 },
  build(L){
    L.addPlatform(0, 360, 200, 90);
    L.addPlatform(280, 360, 180, 90);
    L.addPlatform(540, 360, 260, 90);
    L.addHazard(200, 400, 80, 60);   // poça tóxica no vão 1
    L.addHazard(460, 400, 80, 60);   // poça tóxica no vão 2
    L.goal = { x: 745, y: 320, w: 22, h: 40 };
    L.addEnemy("slime", 350, 320, { hop:true, dir:-1, speed:1.2, hp:2, chase:true });
    L.addEnemy("slime", 620, 320, { hop:true, dir:-1, speed:1.2, hp:2, chase:true });
  },
  update(L){},
  draw(L){
    // líquido tóxico preenchendo os vãos
    for (const z of L.hazards){
      ctx.fillStyle = "#4ea84a"; ctx.fillRect(z.x, 360, z.w, H-360);
      ctx.fillStyle = "rgba(150,240,140,.5)"; ctx.fillRect(z.x, 360, z.w, 5);
      ctx.fillStyle = "rgba(200,255,190,.5)";
      for (let i=0;i<3;i++){ const bx = z.x + 14 + i*26 + (Math.sin(L.t*0.1+i)*4);
        ctx.beginPath(); ctx.arc(bx, 372, 2.5, 0, Math.PI*2); ctx.fill(); }
    }
  }
},

// --- Fase 14: a bandeira falsa ------------------------------------
{
  mission: "Fase 14 — Vá até a bandeira. Ou era essa?",
  hint: "Nem toda bandeira é a verdadeira.",
  theme: "graveyard",
  spawn: { x: 30, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 745, y: 320, w: 22, h: 40, locked: true, hidden: true }; // real (revela depois)
    L.data.decoy = { x: 420, y: 320, w: 22, h: 40, gone: false };
    L.addEnemy("ghost", 250, 240, { fly:true, chase:true, speed:1.3, hp:2 });
    L.addEnemy("ghost", 600, 200, { fly:true, chase:true, speed:1.2, hp:2 });
  },
  update(L){
    const p = L.player, dc = L.data.decoy;
    // TROLL: a bandeira óbvia some ao ser tocada — a real surge no fim.
    if (!dc.gone && hit(p, dc)){
      dc.gone = true;
      L.goal.locked = false; L.goal.hidden = false;
      shakeT = 12; Sfx.swoosh();
    }
  },
  draw(L){
    const dc = L.data.decoy;
    if (!dc.gone) drawFlag(dc, "#9b59b6"); // isca (roxa)
  }
},

// --- Fase 15: a mansão assombrada ---------------------------------
{
  mission: "Fase 15 — Suba pela mansão. Os fantasmas atravessam tudo.",
  hint: "Você não pode tocá-los. Eles podem.",
  theme: "graveyard",
  spawn: { x: 20, y: 250 },
  build(L){
    L.addPlatform(0, 360, 160, 90);
    L.data.floaters = [];
    for (const [x,y] of [[220,310],[360,260],[500,300],[630,250]]){
      const pl = L.addPlatform(x, y, 90, 18, { solidTop:true });
      pl.triggered=false; pl.grace=0; pl.vy=0; L.data.floaters.push(pl);
    }
    L.addPlatform(720, 230, 80, 18, { solidTop:true });
    L.goal = { x: 745, y: 190, w: 22, h: 40 };
    L.addEnemy("ghost", 300, 180, { fly:true, chase:true, speed:1.1, hp:2 });
    L.addEnemy("ghost", 550, 150, { fly:true, chase:true, speed:1.0, hp:2 });
  },
  update(L){ crumbleStep(L, 55); },
  draw(L){ crumbleCracks(L); }
},

// --- Fase 16: a horda mista ---------------------------------------
{
  mission: "Fase 16 — A rua tomada. Abra caminho até a bandeira.",
  hint: "De tudo um pouco. Não pare de atirar.",
  theme: "city",
  spawn: { x: 30, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 745, y: 320, w: 22, h: 40 };
    L.addEnemy("zombie", 300, 320, { dir:-1, speed:1.1, hp:2, chase:true });
    L.addEnemy("spider", 520, 320, { dir:-1, speed:2.0, hp:1, chase:true });
    L.addEnemy("bat", 400, 130, { fly:true, chase:true, speed:1.5, hp:1 });
    L.data.next = 100;
  },
  update(L){
    L.data.next--;
    if (L.data.next <= 0 && L.enemies.filter(e=>e.alive).length < 9){
      L.data.next = 100;
      const types = ["zombie","spider","bat"];
      const tp = types[Math.floor(Math.random()*types.length)];
      const fromLeft = Math.random() < 0.5;
      const opts = { dir: fromLeft?1:-1, hp: tp==="zombie"?2:1, chase:true,
                     speed: tp==="spider"?2.0 : (tp==="bat"?1.5:1.1) };
      if (tp === "bat") opts.fly = true;
      L.addEnemy(tp, fromLeft?10:W-34, tp==="bat"?120:320, opts);
    }
  },
  draw(L){}
},

// --- Fase 17: a travessia voadora ---------------------------------
{
  mission: "Fase 17 — Cruze o abismo. Os morcegos querem te derrubar.",
  hint: "Pule no tempo certo, com asas no seu encalço.",
  theme: "crypt",
  spawn: { x: 20, y: 250 },
  build(L){
    L.addPlatform(0, 360, 120, 90);
    L.data.floaters = [];
    for (const x of [180, 320, 460, 600]){
      const pl = L.addPlatform(x, 300, 90, 18, { solidTop:true });
      pl.triggered=false; pl.grace=0; pl.vy=0; L.data.floaters.push(pl);
    }
    L.addPlatform(700, 360, 100, 90);
    L.goal = { x: 745, y: 320, w: 22, h: 40 };
    L.addEnemy("bat", 300, 180, { fly:true, chase:true, speed:1.3, hp:1 });
    L.addEnemy("bat", 520, 160, { fly:true, chase:true, speed:1.4, hp:1 });
  },
  update(L){ crumbleStep(L, 52); },
  draw(L){ crumbleCracks(L); }
},

// --- Fase 18: os espinhos do teto ---------------------------------
{
  mission: "Fase 18 — A tumba desaba. Corra entre as quedas.",
  hint: "Os espinhos caem do teto quando você passa. Não pare embaixo.",
  theme: "tomb",
  spawn: { x: 20, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 745, y: 320, w: 22, h: 40 };
    L.data.drops = [];
    for (const x of [240, 380, 520, 640]){
      const s = L.addHazard(x, 0, 40, 26); // espinho no teto
      s.vy = 0; s.armed = true; L.data.drops.push(s);
    }
    L.addEnemy("mummy", 430, 320, { dir:-1, speed:0.7, hp:3, chase:true });
  },
  update(L){
    const p = L.player;
    for (const s of L.data.drops){
      if (s.armed && Math.abs((p.x+p.w/2) - (s.x+s.w/2)) < 40){ s.armed = false; Sfx.rumble(); }
      if (!s.armed && s.y < 334){ s.vy += 0.8; s.y += s.vy; if (s.y > 334) s.y = 334; }
    }
  },
  draw(L){
    ctx.fillStyle = "#9aa2ab";
    for (const s of L.data.drops){
      const n = Math.max(1, Math.floor(s.w/12));
      for (let i=0;i<n;i++){ const sx = s.x + i*(s.w/n);  // espinhos apontando pra BAIXO
        ctx.beginPath(); ctx.moveTo(sx, s.y); ctx.lineTo(sx+(s.w/n)/2, s.y+s.h); ctx.lineTo(sx+(s.w/n), s.y); ctx.fill(); }
    }
  }
},

// --- Fase 19: o poço sem fundo ------------------------------------
{
  mission: "Fase 19 — O poço sem fundo. Só asas e abismo.",
  hint: "Plataformas curtas, o céu cheio de inimigos.",
  theme: "cave",
  spawn: { x: 20, y: 250 },
  build(L){
    L.addPlatform(0, 360, 120, 90);
    L.addPlatform(220, 320, 80, 16, { solidTop:true });
    L.addPlatform(380, 300, 80, 16, { solidTop:true });
    L.addPlatform(540, 320, 80, 16, { solidTop:true });
    L.addPlatform(700, 360, 100, 90);
    L.goal = { x: 745, y: 320, w: 22, h: 40 };
    L.addEnemy("bat",   300, 150, { fly:true, chase:true, speed:1.4, hp:1 });
    L.addEnemy("ghost", 480, 180, { fly:true, chase:true, speed:1.1, hp:2 });
    L.addEnemy("bat",   600, 130, { fly:true, chase:true, speed:1.5, hp:1 });
  },
  update(L){},
  draw(L){}
},

// --- Fase 20: o último troll de verdade ---------------------------
{
  mission: "Fase 20 — O fim. Tudo que esse jogo tem contra você.",
  hint: "Bandeira fujona, espinhos e a legião inteira.",
  theme: "tomb",
  spawn: { x: 30, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 700, y: 318, w: 22, h: 40 };
    L.data.side = "right"; L.data.dodges = 0; L.data.maxDodges = 4; L.data.cool = 0;
    L.data.spikes = L.addHazard(370, 338, 70, 22);
    L.addEnemy("zombie",   280, 320, { dir:-1, speed:1.0, hp:2, chase:true });
    L.addEnemy("skeleton", 480, 320, { dir:-1, speed:1.3, hp:1, chase:true });
    L.addEnemy("mummy",    600, 320, { dir:-1, speed:0.7, hp:3, chase:true });
    L.addEnemy("bat",      400, 130, { fly:true, chase:true, speed:1.4, hp:1 });
    L.addEnemy("ghost",    650, 170, { fly:true, chase:true, speed:1.0, hp:2 });
    L.data.next = 150;
  },
  update(L){
    const p = L.player, g = L.goal, d = L.data;
    if (d.cool > 0) d.cool--;
    const target = d.side === "right" ? 700 : 96;
    if (g.x < target) g.x = Math.min(target, g.x + 7);
    else if (g.x > target) g.x = Math.max(target, g.x - 7);
    const dist = Math.abs(g.x - (p.x + p.w/2));
    if (d.dodges < d.maxDodges && dist < 70 && d.cool === 0){
      d.side = d.side === "right" ? "left" : "right";
      d.dodges++; d.cool = 20; shakeT = 10; Sfx.swoosh();
    }
    // reforços infinitos (aranhas/morcegos/gosmas)
    L.data.next--;
    if (L.data.next <= 0 && L.enemies.filter(e=>e.alive).length < 9){
      L.data.next = 150;
      const spawnTypes = ["spider","bat","slime"];
      const tp = spawnTypes[Math.floor(Math.random()*3)];
      const fromLeft = Math.random() < 0.5;
      const opts = { dir: fromLeft?1:-1, hp:1, chase:true, speed: tp==="spider"?2:1.4 };
      if (tp === "bat") opts.fly = true;
      if (tp === "slime"){ opts.hop = true; opts.hp = 2; opts.speed = 1.2; }
      L.addEnemy(tp, fromLeft?10:W-34, tp==="bat"?120:320, opts);
    }
  },
  draw(L){ drawSpikes(L.data.spikes); }
},

// --- Fase 21: a casa abandonada -----------------------------------
{
  mission: "Fase 21 — Atravesse a casa abandonada até a porta dos fundos.",
  hint: "O assoalho está podre. Se o teto desabar, CORRA — quem hesita não passa.",
  theme: "house",
  spawn: { x: 20, y: 300 },
  build(L){
    L.addPlatform(0, 360, 180, 90);
    // assoalho de tábuas podres que cedem sobre o porão (largas, com folga)
    L.data.floaters = [];
    for (const x of [180, 320, 460]){
      const pl = L.addPlatform(x, 360, 130, 16, { solidTop:true });
      pl.triggered = false; pl.grace = 0; pl.vy = 0;
      L.data.floaters.push(pl);
    }
    L.addPlatform(600, 360, 200, 90);
    L.addHazard(180, 416, 420, 60);          // porão escuro sob as tábuas
    L.goal = { x: 752, y: 320, w: 22, h: 40 };
    L.addEnemy("ghost", 520, 200, { fly:true, chase:true, speed:0.8, hp:1 });

    // TROLL: botão invisível no assoalho. Ao pisar, um tanque de guerra
    // destruído despenca do teto À FRENTE. A queda é calibrada para que,
    // CORRENDO (Shift), o jogador atravesse a sombra a tempo; andando ou
    // parando, o tanque cai em cima e esmaga.
    L.data.btn = { x: 230, w: 70, pressed: false };
    L.data.tank = { x: 350, y: -160, w: 120, h: 84, vy: 0, falling: false, landed: false };
    L.data.tankFloor = null;
  },
  update(L){
    crumbleStep(L, 80);                       // mais tempo em cima antes da tábua ceder
    const p = L.player, b = L.data.btn, tk = L.data.tank;
    // gatilho invisível: pisar (no chão) sobre a zona do botão
    if (!b.pressed && p.onGround &&
        p.x + p.w/2 > b.x && p.x + p.w/2 < b.x + b.w){
      b.pressed = true; tk.falling = true; shakeT = 16; Sfx.rumble();
    }
    if (tk.falling){
      tk.vy += 0.6; tk.y += tk.vy;          // queda mais lenta = janela pra correr
      const landY = 360 - tk.h;
      if (tk.y >= landY){
        tk.y = landY; tk.falling = false; tk.landed = true;
        shakeT = 22; Sfx.rumble();
        // o destroço vira obstáculo sólido (precisa pular por cima)
        L.data.tankFloor = L.addPlatform(tk.x, tk.y + tk.h*0.3, tk.w, tk.h*0.7,
                                         { solidTop:true, invisible:true });
      }
      // só esmaga se o jogador NÃO estiver correndo; correndo (Shift), ele passa.
      const running = keys.ShiftLeft || keys.ShiftRight;
      if (hit(p, tk) && !running) L.kill();
    }
  },
  draw(L){
    crumbleCracks(L);
    // porão escuro escancarado sob as tábuas
    for (const z of L.hazards){
      let g = ctx.createLinearGradient(0, z.y - 8, 0, H);
      g.addColorStop(0, "#0c0906"); g.addColorStop(1, "#000");
      ctx.fillStyle = g; ctx.fillRect(z.x, z.y - 8, z.w, H - (z.y - 8));
    }
    const tk = L.data.tank;
    if (tk.falling){
      // sombra no chão avisando onde o tanque vai cair (quanto mais perto, mais escura)
      const prog = Math.max(0, Math.min(1, (tk.y + 160) / 436));
      ctx.fillStyle = `rgba(0,0,0,${0.15 + prog*0.4})`;
      ctx.beginPath();
      ctx.ellipse(tk.x + tk.w/2, 358, tk.w/2 * (0.55 + prog*0.45), 8, 0, 0, Math.PI*2);
      ctx.fill();
    }
    if (tk.falling || tk.landed) drawWreckedTank(tk);
  }
},

// --- Fase 22: o hospital abandonado -------------------------------
{
  mission: "Fase 22 — O hospital abandonado. Alcance a saída.",
  hint: "O corredor parece vazio. Não acorde o que dorme no fim dele.",
  theme: "hospital",
  spawn: { x: 20, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90, { invisible:true }); // chão invisível
    L.goal = { x: 752, y: 320, w: 22, h: 40 };
    // ARMADILHA: um esqueleto GIGANTE adormecido no fim do corredor.
    const sc = 2.6;
    L.data.boss = L.addEnemy("skeleton", 700, 360 - 34*sc,
                             { dir:-1, speed:0, hp:7, chase:false, scale:sc });
    L.data.bossWoke = false;
    // TRÊS ASSASSINOS ágeis rondando o corredor (faca = morte ao toque)
    for (const kx of [300, 470, 620])
      L.addEnemy("killer", kx, 360 - 34, { dir:-1, speed:2.0, hp:2, chase:true });
  },
  update(L){
    // mantém os inimigos terrestres sobre o chão invisível (senão caem por ele)
    for (const e of L.enemies){
      if (e.alive && !e.fly){ e.y = 360 - e.h; e.vy = 0; e.onGround = true; }
    }
    // o gigante desperta e passa a perseguir ao avançar no corredor
    const b = L.data.boss;
    if (b && b.alive && !L.data.bossWoke && L.player.x > 360){
      L.data.bossWoke = true; b.chase = true; b.speed = 1.6;
      shakeT = 22; Sfx.skeleton(); Sfx.rumble();
    }
  },
  draw(L){}
},

// --- Fase 23: a emboscada dos assassinos --------------------------
{
  mission: "Fase 23 — A emboscada. Dez assassinos na rua. Abra caminho até a bandeira.",
  hint: "Eles vêm de todos os lados. Não pare de atirar — nem de correr.",
  theme: "city",
  spawn: { x: 40, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 745, y: 320, w: 22, h: 40 };
    // dez assassinos espalhados, todos perseguindo (faca = morte ao toque)
    const spots = [ [180,-1],[280,-1],[380, 1],[470,-1],[560, 1],
                    [640,-1],[720,-1],[150, 1],[330, 1],[700,-1] ];
    for (const [x, dir] of spots)
      L.addEnemy("killer", x, 360 - 34,
                 { dir, speed: 1.6 + Math.random()*0.6, hp: 1, chase: true });
  },
  update(L){},
  draw(L){}
},

// --- Fase 24: o zumbi gigante -------------------------------------
{
  mission: "Fase 24 — O apocalipse. Um zumbi GIGANTE bloqueia a saída.",
  hint: "O braço dele varre na altura da sua cabeça. ABAIXE (↓) e passe por baixo.",
  theme: "apocalypse",
  spawn: { x: 30, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 760, y: 320, w: 22, h: 40 };

    // ZUMBI GIGANTE: avança devagar com o braço estendido. O CORPO não mata
    // (noTouch) — você atravessa por baixo dele; quem mata é a GARRA.
    const sc = 3.0;
    const gh = 34 * sc;
    // maxX trava o avanço dele no miolo do mapa: a garra nunca alcança a bandeira.
    L.data.giant = L.addEnemy("zombie", 600, 360 - gh,
                              { dir:-1, speed:1.1, hp:999, chase:true, scale:sc, noTouch:true, maxX:520 });

    // garra/braço: hazard na altura do tronco -> só passa ABAIXADO.
    // hitbox y 314..332: pega quem está em pé (topo 326), livra quem agacha (topo 338).
    L.data.claw = L.addHazard(-9999, 314, 96, 18);

    // ARMADILHAS INVISÍVEIS (5, espalhadas pela fase): pisar num botão escondido
    // dispara uma pedra gigante que despenca na coluna de quem pisou. Tanto o
    // jogador quanto os inimigos (inclusive o gigante) podem acionar e ser esmagados.
    L.data.traps = [];
    for (const cx of [150, 300, 430, 560, 680]){
      L.data.traps.push({
        btn:  { x: cx - 34, w: 68, pressed: false },
        rock: { x: cx, y: -60, r: 22, vy: 0, falling: false, landed: false, hits: null },
      });
    }
  },
  update(L){
    const p = L.player, g = L.data.giant, claw = L.data.claw;

    // --- braço do gigante: sempre estendido à frente, na direção do jogador ---
    if (g && g.alive){
      const reach = 104;
      claw.y = 314; claw.w = reach;
      claw.x = (g.dir < 0) ? (g.x - reach + 8) : (g.x + g.w - 8);
    } else {
      claw.x = -9999;
    }

    // --- armadilhas: 5 botões invisíveis (jogador OU inimigo aciona) ---
    const onBtn = (ent, b) => ent.onGround && (ent.x + ent.w/2) > b.x && (ent.x + ent.w/2) < b.x + b.w;
    for (const tr of L.data.traps){
      const b = tr.btn, rk = tr.rock;
      if (!b.pressed){
        let trg = null;
        if (onBtn(p, b)) trg = p;
        else for (const e of L.enemies){ if (e.alive && onBtn(e, b)){ trg = e; break; } }
        if (trg){
          b.pressed = true; rk.falling = true; rk.hits = new Set();
          rk.x = trg.x + trg.w/2; rk.y = -rk.r; rk.vy = 0;   // cai na coluna de quem pisou
          shakeT = 12; Sfx.rumble();
        }
      }
      if (rk.falling){
        rk.vy += 0.6; rk.y += rk.vy;
        const box = { x: rk.x - rk.r, y: rk.y - rk.r, w: rk.r*2, h: rk.r*2 };
        if (!p.dead && hit(box, p)) L.kill();                // esmaga o jogador
        for (const e of L.enemies){                          // esmaga/fere inimigos (uma vez por pedra)
          if (!e.alive || rk.hits.has(e) || !hit(box, e)) continue;
          rk.hits.add(e); e.hp -= 3; e.flash = 6;
          if (e.hp <= 0){ e.alive = false; e.vy = -3; Sfx.kill(); } else Sfx.hurt();
        }
        if (rk.y >= 360 - rk.r){                             // pousou no chão
          rk.y = 360 - rk.r; rk.falling = false; rk.landed = true;
          shakeT = 20; Sfx.explosion();
        }
      }
    }
  },
  draw(L){
    for (const tr of L.data.traps){
      const rk = tr.rock;
      if (rk.falling){                                       // sombra de aviso no chão
        const prog = Math.max(0, Math.min(1, (rk.y + rk.r) / 360));
        ctx.fillStyle = `rgba(0,0,0,${0.15 + prog*0.4})`;
        ctx.beginPath(); ctx.ellipse(rk.x, 358, rk.r*(0.6 + prog*0.5), 7, 0, 0, Math.PI*2); ctx.fill();
      }
      if (rk.falling || rk.landed) drawRock(rk);
    }
    drawGiantArm(L.data.giant, L.data.claw);
  }
},

// --- Fase 25: o depósito de explosivos ----------------------------
{
  mission: "Fase 25 — O depósito de explosivos. Use a bazuca a seu favor.",
  hint: "Os barris estouram em cadeia. Detone-os perto dos zumbis — longe de você.",
  theme: "factory",
  spawn: { x: 30, y: 300 },
  build(L){
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 760, y: 320, w: 22, h: 40 };

    // zumbis avançando pela rua
    L.addEnemy("zombie", 350, 320, { dir:-1, speed:1.0, hp:2, chase:true });
    L.addEnemy("zombie", 520, 320, { dir:-1, speed:1.1, hp:2, chase:true });
    L.addEnemy("zombie", 660, 320, { dir:-1, speed:1.0, hp:2, chase:true });

    // barris explosivos: detonam com o foguete (ou a explosão de outro barril).
    // pares próximos (240/270, 580/610) estouram em CADEIA.
    L.data.barrels = [];
    for (const x of [240, 270, 430, 580, 610, 690])
      L.data.barrels.push({ x, y: 334, w: 18, h: 26, exploded: false });

    // ARMADILHA: 4 poças de lava no chão -> matam ao toque, pule por cima.
    L.data.lava = [];
    for (const x of [200, 360, 500, 640])
      L.data.lava.push(L.addHazard(x, 350, 46, 14));

    // MALVADEZA: cada poça jorra um gêiser de lava de tempos em tempos.
    // O jato é um hazard vertical (mortal) que sobe acima da poça.
    L.data.jets = L.data.lava.map((z, i) => ({
      hz: L.addHazard(z.x + 13, -9999, 20, 0),
      bx: z.x, phase: "idle", t: 0, cd: 70 + i*28 + Math.floor(Math.random()*90),
    }));

    // CHUVA DE ESCOMBROS: detritos despencam do céu o tempo todo.
    L.data.debris = [];
    L.data.debrisCD = 30;

    // HORDA DO CÉU: zumbis também despencam do alto e passam a perseguir.
    L.data.zRainCD = 90;
  },
  update(L){
    // bolinha acerta um barril -> detona
    for (const b of bullets){
      if (b.life <= 0) continue;
      const bb = { x: b.x - 4, y: b.y - 3, w: 9, h: 6 };
      for (const br of L.data.barrels){
        if (!br.exploded && hit(bb, br)){ b.life = 0; explodeBarrel(L, br); break; }
      }
    }
    // reação em cadeia: qualquer explosão ativa detona barris no seu raio
    for (const br of L.data.barrels){
      if (br.exploded) continue;
      const cx = br.x + br.w/2, cy = br.y + br.h/2;
      for (const bl of blasts){
        const dx = bl.x - cx, dy = bl.y - cy;
        if (dx*dx + dy*dy <= (bl.r + 6)*(bl.r + 6)){ explodeBarrel(L, br); break; }
      }
    }
    // gêiseres de lava: idle -> warn (borbulha de aviso) -> erupt (jato mortal)
    for (const j of L.data.jets){
      j.t++;
      if (j.phase === "idle"){
        j.hz.y = -9999; j.hz.h = 0;
        if (--j.cd <= 0){ j.phase = "warn"; j.t = 0; }
      } else if (j.phase === "warn"){
        if (j.t > 26){ j.phase = "erupt"; j.t = 0; shakeT = Math.max(shakeT, 7); }
      } else { // erupt: coluna de lava sobe acima da poça
        const h = 130;
        j.hz.x = j.bx + 13; j.hz.w = 20; j.hz.y = 360 - h; j.hz.h = h;
        if (j.t > 20){ j.phase = "idle"; j.cd = 120 + Math.floor(Math.random()*120); j.hz.y = -9999; j.hz.h = 0; }
      }
    }
    // inimigos terrestres que tocam a lava (poça ou jato ativo) queimam
    for (const e of L.enemies){
      if (!e.alive || e.fly) continue;
      let burned = false;
      for (const z of L.data.lava){ if (hit(e, z)){ burned = true; break; } }
      if (!burned) for (const j of L.data.jets){ if (j.phase === "erupt" && hit(e, j.hz)){ burned = true; break; } }
      if (burned){ e.alive = false; e.vy = -4; Sfx.kill(); }
    }

    // CHUVA DE ESCOMBROS: cai do céu sem parar, em colunas aleatórias.
    if (--L.data.debrisCD <= 0){
      L.data.debrisCD = 32 + Math.floor(Math.random() * 36);
      L.data.debris.push({
        x: 30 + Math.random() * (W - 60), y: -20,
        w: 14 + Math.random() * 12, h: 12 + Math.random() * 10,
        vy: 2 + Math.random() * 2, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
        landed: false, life: 0,
      });
    }
    const pl = L.player;
    for (const d of L.data.debris){
      if (d.landed){ d.life--; continue; }
      d.vy += 0.35; d.y += d.vy; d.rot += d.vr;
      const box = { x: d.x - d.w/2, y: d.y - d.h/2, w: d.w, h: d.h };
      if (!pl.dead && hit(box, pl)) L.kill();                       // esmaga o jogador
      for (const e of L.enemies){                                   // e os monstros terrestres
        if (e.alive && !e.fly && hit(box, e)){ e.alive = false; e.vy = -4; Sfx.kill(); }
      }
      if (d.y + d.h/2 >= 360){ d.landed = true; d.life = 40; d.y = 360 - d.h/2; shakeT = Math.max(shakeT, 4); }
    }
    L.data.debris = L.data.debris.filter(d => !d.landed || d.life > 0);

    // HORDA DO CÉU: zumbis despencam do alto (caem por gravidade e pousam no chão).
    if (--L.data.zRainCD <= 0 && L.enemies.filter(e => e.alive).length < 8){
      L.data.zRainCD = 140 + Math.floor(Math.random() * 120);
      const sx = 60 + Math.random() * (W - 120);
      L.addEnemy("zombie", sx, -40, { dir:-1, speed: 1.0 + Math.random()*0.4, hp: 2, chase: true });
    }
  },
  draw(L){
    for (const z of L.data.lava) drawLava(z, L.t);
    for (const j of L.data.jets) drawJet(j, L.t);
    for (const br of L.data.barrels) if (!br.exploded) drawBarrel(br);
    for (const d of L.data.debris){
      if (!d.landed){                                  // sombra de aviso no chão
        const prog = Math.max(0, Math.min(1, d.y / 360));
        ctx.fillStyle = `rgba(0,0,0,${0.12 + prog*0.3})`;
        ctx.beginPath(); ctx.ellipse(d.x, 358, d.w*0.5*(0.6 + prog*0.5), 5, 0, 0, Math.PI*2); ctx.fill();
      }
      drawDebris(d);
    }
  }
},
];

// Escombro caindo do céu (bloco de concreto com vergalhão)
function drawDebris(d){
  ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
  ctx.fillStyle = "#6b6660"; ctx.fillRect(-d.w/2, -d.h/2, d.w, d.h);
  ctx.fillStyle = "#807a72"; ctx.fillRect(-d.w/2, -d.h/2, d.w, 3);          // topo claro
  ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(-d.w/2, d.h/2 - 3, d.w, 3); // base escura
  ctx.strokeStyle = "#3a3733"; ctx.lineWidth = 2;                           // vergalhão saindo
  ctx.beginPath(); ctx.moveTo(d.w/2, -2); ctx.lineTo(d.w/2 + 5, -6); ctx.stroke();
  ctx.restore();
}

// Gêiser de lava: borbulha de aviso (warn) e jato vertical mortal (erupt)
function drawJet(j, t){
  if (j.phase === "warn"){
    ctx.fillStyle = "rgba(255,150,40,.75)";              // esguichos curtos avisando
    for (let i=0;i<3;i++){ const jx = j.bx + 10 + i*12; const hh = 5 + Math.abs(Math.sin(t*0.5 + i))*12;
      ctx.fillRect(jx, 350 - hh, 3, hh); }
    return;
  }
  if (j.phase !== "erupt") return;
  const hz = j.hz;
  const g = ctx.createLinearGradient(0, hz.y, 0, hz.y + hz.h);
  g.addColorStop(0, "#ffe066"); g.addColorStop(.45, "#ff7a1a"); g.addColorStop(1, "#e2521b");
  ctx.fillStyle = g; ctx.fillRect(hz.x, hz.y, hz.w, hz.h);
  ctx.fillStyle = "#ffe066";                              // topo arredondado
  ctx.beginPath(); ctx.arc(hz.x + hz.w/2, hz.y, hz.w/2 + 1, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(255,190,70,.6)";                  // respingos
  for (let i=0;i<4;i++){ const rx = Math.sin(t*0.4 + i*1.7)*9;
    ctx.beginPath(); ctx.arc(hz.x + hz.w/2 + rx, hz.y - 5 - i*5, 2.4, 0, Math.PI*2); ctx.fill(); }
}

// Poça de lava borbulhante (perigo no chão)
function drawLava(z, t){
  ctx.fillStyle = "rgba(255,120,40,.16)"; ctx.fillRect(z.x - 3, z.y - 9, z.w + 6, 9);   // halo de calor
  ctx.fillStyle = "#e2521b"; ctx.fillRect(z.x, z.y, z.w, z.h);                            // magma
  const glow = 0.45 + Math.sin(t * 0.1) * 0.2;
  ctx.fillStyle = `rgba(255,215,90,${glow})`; ctx.fillRect(z.x, z.y, z.w, 4);             // crosta incandescente
  ctx.fillStyle = "#ffd24a";                                                              // bolhas subindo
  for (let i = 0; i < 3; i++){
    const bx = z.x + 8 + i * (z.w / 3) + Math.sin(t * 0.12 + i * 2) * 3;
    const by = z.y + 7 + Math.sin(t * 0.2 + i) * 2;
    ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, Math.PI * 2); ctx.fill();
  }
}

// Detona um barril explosivo: efeito + dano em raio aos inimigos E ao jogador.
function explodeBarrel(L, br){
  if (br.exploded) return;
  br.exploded = true;
  const cx = br.x + br.w/2, cy = br.y + br.h/2;
  blasts.push({ x: cx, y: cy, r: 10, max: 66, life: 22 });
  shakeT = Math.max(shakeT, 16);
  Sfx.explosion();
  const R = 64;
  for (const e of L.enemies){
    if (!e.alive) continue;
    const dx = (e.x + e.w/2) - cx, dy = (e.y + e.h/2) - cy;
    if (dx*dx + dy*dy <= R*R){
      e.hp -= 4; e.flash = 6;
      if (e.hp <= 0){ e.alive = false; e.vy = -5; e.dir = dx < 0 ? -1 : 1; Sfx.kill(); }
    }
  }
  const p = L.player;
  if (!p.dead){
    const dx = (p.x + p.w/2) - cx, dy = (p.y + p.h/2) - cy;
    if (dx*dx + dy*dy <= R*R) L.kill();        // a explosão também mata quem disparou se estiver perto
  }
}

// Barril explosivo (vermelho, com símbolo de perigo)
function drawBarrel(br){
  const { x, y, w, h } = br;
  ctx.fillStyle = "#b03a2e"; roundRect(x, y, w, h, 3); ctx.fill();          // corpo
  ctx.fillStyle = "#7d2820"; ctx.fillRect(x, y + h*0.30, w, 3); ctx.fillRect(x, y + h*0.62, w, 3); // aros
  ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(x + 3, y + 3, 3, h - 6); // brilho
  ctx.fillStyle = "#e6c63f";                                                // triângulo de perigo
  ctx.beginPath(); ctx.moveTo(x + w/2, y + 6); ctx.lineTo(x + w - 3, y + 17); ctx.lineTo(x + 3, y + 17); ctx.fill();
  ctx.fillStyle = "#111"; ctx.fillRect(x + w/2 - 1, y + 10, 2, 4); ctx.fillRect(x + w/2 - 1, y + 15, 2, 2); // "!"
}

// Pedra/bola gigante da armadilha (cai do alto e esmaga)
function drawRock(rk){
  const x = rk.x, y = rk.y, r = rk.r;
  ctx.fillStyle = "#57534b"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#454139";                                // sombreado (lado inferior)
  ctx.beginPath(); ctx.arc(x + r*0.28, y + r*0.28, r*0.72, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "#6f6b63";                                // realce (lado superior)
  ctx.beginPath(); ctx.arc(x - r*0.3, y - r*0.32, r*0.42, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,.28)";                        // crateras
  for (const [dx,dy,rr] of [[-0.32,0.12,0.16],[0.28,-0.18,0.13],[0.06,0.42,0.11]])
    { ctx.beginPath(); ctx.arc(x + dx*r, y + dy*r, rr*r, 0, Math.PI*2); ctx.fill(); }
}

// Braço esticado do zumbi gigante + garra (perigo na altura da cabeça).
// Liga o ombro do gigante à garra mortal (o hazard L.data.claw).
function drawGiantArm(g, claw){
  if (!g || !g.alive) return;
  const dir = g.dir < 0 ? -1 : 1;
  const armY = claw.y + claw.h/2;                 // centro vertical da faixa mortal
  const shoulderX = g.x + g.w/2;                  // ombro ~ centro do gigante
  const handX = dir < 0 ? claw.x : claw.x + claw.w;

  // antebraço grosso, pele esverdeada apodrecida
  ctx.strokeStyle = "#6a7b3a"; ctx.lineWidth = 16; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(shoulderX, armY - 2); ctx.lineTo(handX, armY); ctx.stroke();
  // faixas de carne escura
  ctx.strokeStyle = "#46532a"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(shoulderX, armY - 4); ctx.lineTo(handX, armY - 2); ctx.stroke();

  // mão + garras na ponta
  ctx.fillStyle = "#7e9145";
  ctx.beginPath(); ctx.arc(handX, armY, 11, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "#d8d2c0"; ctx.lineWidth = 3;
  for (const dy of [-7, 0, 7]){
    ctx.beginPath(); ctx.moveTo(handX, armY + dy);
    ctx.lineTo(handX + dir*16, armY + dy*1.3); ctx.stroke();
  }
}

// Tanque de guerra destruído (blindado abandonado, canhão torto)
function drawWreckedTank(t){
  const x = t.x, y = t.y, w = t.w, h = t.h;
  const olive = "#3f4632", oliveLit = "#4a5238", dark = "#262b1d";
  // esteira (lagarta) inferior
  ctx.fillStyle = "#1a1a1a";
  roundRect(x, y + h*0.62, w, h*0.34, 10); ctx.fill();
  ctx.fillStyle = "#2c2c2c";                                   // rodas da esteira
  for (let i=0;i<6;i++){ const wx = x + w*0.1 + i*(w*0.8/5);
    ctx.beginPath(); ctx.arc(wx, y + h*0.80, h*0.10, 0, Math.PI*2); ctx.fill(); }
  ctx.strokeStyle = "#111"; ctx.lineWidth = 3;                 // elos da esteira
  ctx.strokeRect(x+2, y + h*0.64, w-4, h*0.30);
  // casco (chassi)
  ctx.fillStyle = olive; roundRect(x + w*0.04, y + h*0.42, w*0.92, h*0.26, 5); ctx.fill();
  // torre amassada
  ctx.fillStyle = oliveLit;
  ctx.beginPath();
  ctx.moveTo(x + w*0.30, y + h*0.42);
  ctx.lineTo(x + w*0.36, y + h*0.16);
  ctx.lineTo(x + w*0.62, y + h*0.14);
  ctx.lineTo(x + w*0.70, y + h*0.42);
  ctx.fill();
  // escotilha estourada
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.ellipse(x + w*0.49, y + h*0.18, w*0.06, h*0.05, 0, 0, Math.PI*2); ctx.fill();
  // canhão torto pra cima
  ctx.save(); ctx.translate(x + w*0.62, y + h*0.26); ctx.rotate(-0.35);
  ctx.fillStyle = "#2f3526"; ctx.fillRect(0, -5, w*0.42, 10);
  ctx.fillStyle = dark; ctx.fillRect(w*0.40, -6, 6, 12); ctx.restore();
  // buraco de impacto + ferrugem
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.arc(x + w*0.40, y + h*0.52, h*0.07, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = "rgba(120,70,30,.5)"; ctx.lineWidth = 2;
  for (const fx of [0.2, 0.5, 0.85]){ ctx.beginPath();
    ctx.moveTo(x + w*fx, y + h*0.44); ctx.lineTo(x + w*fx + 5, y + h*0.6); ctx.stroke(); }
  // fumaça subindo do destroço
  ctx.fillStyle = "rgba(40,40,40,.35)";
  for (const sx of [0.45, 0.6]) { ctx.beginPath(); ctx.arc(x + w*sx, y - 6, 8, 0, Math.PI*2); ctx.fill(); }
}
