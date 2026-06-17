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
    kill(){ if(!L.player.dead){ L.player.dead = true; shakeT = 18; Sfx.die(); } },
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
  mission: "Fase 3 — Atravesse pelas plataformas até a bandeira.",
  hint: "Pise com confiança.",
  theme: "forest",
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
];
