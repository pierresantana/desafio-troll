"use strict";
// =====================================================================
//  NÚCLEO: canvas, constantes, estado global e utilidades compartilhadas.
//  Todos os arquivos js/*.js são <script> clássicos e dividem o mesmo
//  escopo global, então o que é declarado aqui fica visível nos demais.
//  Este arquivo precisa ser o PRIMEIRO a carregar.
// =====================================================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;

// Física (compartilhada por jogador e inimigos)
const GRAV = 0.7, MOVE = 0.9, FRICTION = 0.78, MAXVX = 4.6, JUMP = 13.5;
const RUN_MULT = 1.8;   // multiplicador de velocidade ao correr
const JUMP_BUFFER = 7;  // frames que um aperto de pulo fica "guardado"
const PLAYER_H = 34;    // altura do soldado em pé
const CROUCH_H = 22;    // altura agachado (os pés ficam no mesmo lugar)

// Estado global do jogo
let deaths = 0;
let levelIndex = 0;
let state = "menu";   // menu | play | win
let level = null;     // instância da fase atual (criada por createLevel)
let shakeT = 0;       // intensidade do tremor de tela (decai a cada frame)

// Referências do HUD / overlay
const mtext  = document.getElementById("mtext");
const mhint  = document.getElementById("mhint");
const deathsEl = document.getElementById("deaths");
const overlay  = document.getElementById("overlay");

// Colisão AABB entre dois retângulos {x,y,w,h}
function hit(a, b){
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Retângulo de cantos arredondados (usado por vários desenhos)
function roundRect(x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
