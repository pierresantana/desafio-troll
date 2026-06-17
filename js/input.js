"use strict";
// =====================================================================
//  ENTRADA: estado do teclado.
//  - keys[code]  -> true enquanto a tecla está pressionada
//  - PRESS[code] -> true só no frame em que a tecla foi apertada
//                   (borda de subida; limpado por clearPress() no game.js)
// =====================================================================

const keys = {};
const PRESS = {};

addEventListener("keydown", e => {
  if (["ArrowLeft","ArrowRight","ArrowUp","Space"].includes(e.code)) e.preventDefault();
  if (!keys[e.code]) PRESS[e.code] = true;   // borda de subida
  keys[e.code] = true;
  if (e.code === "KeyR") restartLevel();
  if (e.code === "KeyM") deathsEl.title = (Sfx.toggleMute() ? "mudo" : "som");
});

addEventListener("keyup", e => { keys[e.code] = false; });

// =====================================================================
//  JOYSTICK / GAMEPAD (Gamepad API).
//  Traduz botões e eixos do controle para os MESMOS códigos de tecla,
//  então todo o resto do jogo (player.js, game.js...) funciona sem
//  mudança. Mantém um registro do que o controle "assume" (padAsserted)
//  para liberar essas teclas ao soltar, sem atropelar o teclado.
// =====================================================================

const padAsserted = new Set();        // códigos atualmente mantidos pelo controle
const padPrev = {};                   // estado anterior de botões "de ação" (R/M/start)
const padLogPrev = {};                // estado anterior p/ logar no console (borda de subida)
const DEADZONE = 0.35;

addEventListener("gamepadconnected",    e => { try { deathsEl.title = "controle conectado"; } catch(_){} });
addEventListener("gamepaddisconnected", e => { padAsserted.clear(); });

function firstGamepad(){
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) if (p && p.connected) return p;
  return null;
}

// Borda de subida de um botão "de ação" (não polido como tecla mantida).
function padPressed(gp, index){
  const cur = !!(gp.buttons[index] && gp.buttons[index].pressed);
  const rose = cur && !padPrev[index];
  padPrev[index] = cur;
  return rose;
}

// Chamado uma vez por frame (em game.js), ANTES dos updates.
function pollGamepad(){
  const gp = firstGamepad();
  if (!gp) { if (padAsserted.size) padAsserted.clear(); return; }

  const ax = gp.axes || [];
  const lx = ax[0] || 0;
  const btn = i => !!(gp.buttons[i] && gp.buttons[i].pressed);

  // log: nome amigável de cada índice de botão (layout standard)
  const PAD_NAMES = ["A","B","X","Y","LB","RB","LT","RT","Select","Start",
                     "L3","R3","D-pad ↑","D-pad ↓","D-pad ←","D-pad →","Home"];
  for (let i = 0; i < gp.buttons.length; i++){
    const cur = btn(i);
    if (cur && !padLogPrev[i]) console.log(`🎮 botão ${i} (${PAD_NAMES[i] || "?"}) pressionado`);
    padLogPrev[i] = cur;
  }

  // Conjunto de códigos que o controle quer manter pressionados neste frame.
  const want = new Set();
  // mover: stick esquerdo + d-pad (14 esq, 15 dir)
  if (lx < -DEADZONE || btn(14)) want.add("ArrowLeft");
  if (lx >  DEADZONE || btn(15)) want.add("ArrowRight");
  // pular: Y (3) ou A (0)
  if (btn(0) || btn(3)) want.add("ArrowUp");
  // atirar: X (2) ou B (1)
  if (btn(1) || btn(2)) want.add("KeyX");
  // correr: RB (5)
  if (btn(5)) want.add("ShiftLeft");

  // aplica: novas teclas geram borda de subida (PRESS), iguais ao teclado
  for (const code of want){
    if (!keys[code]) PRESS[code] = true;
    keys[code] = true;
    padAsserted.add(code);
  }
  // libera teclas que o controle assumia e não quer mais (sem mexer no teclado)
  for (const code of padAsserted){
    if (!want.has(code)) { keys[code] = false; padAsserted.delete(code); }
  }

  // ações de borda única
  const startBtn = padPressed(gp, 9);      // Start
  const aBtn     = padPressed(gp, 0);      // A
  if (typeof state !== "undefined" && state !== "play"){
    if (startBtn || aBtn) startGame();      // iniciar/jogar de novo pela tela inicial
  } else {
    if (startBtn) restartLevel();           // Start -> reiniciar a fase
  }
  if (padPressed(gp, 8)) deathsEl.title = (Sfx.toggleMute() ? "mudo" : "som"); // Select -> som
}

// =====================================================================
//  TOQUE (celular/tablet) + botões de sistema (tela cheia / reiniciar / som).
//  Os botões de toque escrevem nos MESMOS keys/PRESS do teclado.
// =====================================================================

// Liga um botão da tela a um código de tecla (suporta multitoque).
function bindTouchButton(el){
  const code = el.dataset.key;
  const press = e => {
    e.preventDefault();
    if (!keys[code]) PRESS[code] = true;   // borda de subida (igual ao teclado)
    keys[code] = true;
    el.classList.add("active");
    try { el.setPointerCapture(e.pointerId); } catch(_){}
  };
  const release = e => {
    e.preventDefault();
    keys[code] = false;
    el.classList.remove("active");
  };
  el.addEventListener("pointerdown",   press);
  el.addEventListener("pointerup",     release);
  el.addEventListener("pointercancel", release);
}

function toggleFullscreen(){
  const el = document.getElementById("wrap") || document.documentElement;
  const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
  const req  = el.requestFullscreen || el.webkitRequestFullscreen || el.webkitEnterFullscreen;

  // iPhone (Safari) não tem Fullscreen API -> usa pseudo-fullscreen via CSS.
  if (!req){
    el.classList.toggle("fs-fallback");
    return;
  }
  if (!fsEl){
    req.call(el);
  } else {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document);
  }
}

// =====================================================================
//  FORÇA PAISAGEM em aparelhos de toque.
//  Mede a janela direto (à prova de media queries que reportam errado).
//  Se for toque E estiver em retrato -> gira o #wrap 90° via classe CSS.
// =====================================================================
const isTouchDevice =
  ("ontouchstart" in window) ||
  (navigator.maxTouchPoints > 0) ||
  (window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

// Tamanho físico da tela (não muda com a UI do navegador) -> separa celular de tablet.
// Chrome/Safari reportam screen.width/height igual; innerWidth varia com a barra do Chrome.
const sw = (window.screen && window.screen.width)  || window.innerWidth;
const sh = (window.screen && window.screen.height) || window.innerHeight;
const isPhone = Math.min(sw, sh) <= 600;   // iPad menor lado ~744+, celular ~430

function applyOrientation(){
  const wrap = document.getElementById("wrap");
  if (!wrap) return;
  const portrait = window.innerHeight > window.innerWidth;
  wrap.classList.toggle("rotate-landscape", isTouchDevice && isPhone && portrait);
}

addEventListener("resize", applyOrientation);
addEventListener("orientationchange", () => { applyOrientation(); setTimeout(applyOrientation, 250); });
applyOrientation();

function setupControls(){
  document.querySelectorAll(".tcbtn").forEach(bindTouchButton);

  const fsBtn = document.getElementById("fsBtn");
  if (fsBtn) fsBtn.addEventListener("click", toggleFullscreen);

  const restartBtn = document.getElementById("restartBtn");
  if (restartBtn) restartBtn.addEventListener("click", () => {
    if (state === "play") restartLevel(); else startGame();
  });

  const muteBtn = document.getElementById("muteBtn");
  if (muteBtn) muteBtn.addEventListener("click", () => {
    const muted = Sfx.toggleMute();
    deathsEl.title = muted ? "mudo" : "som";
    muteBtn.textContent = muted ? "🔇" : "🔊";
  });
}

setupControls();
