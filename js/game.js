"use strict";
// =====================================================================
//  JOGO: fluxo de fases, loop principal, render e bootstrap.
//  Este arquivo precisa ser o ÚLTIMO a carregar (usa tudo dos outros).
// =====================================================================

function loadLevel(i){
  levelIndex = i;
  level = createLevel(LEVELS[i]);
  bullets = []; fireCD = 0;
  mtext.textContent = LEVELS[i].mission;
  mhint.textContent = LEVELS[i].hint;
}

function restartLevel(){
  if (state !== "play") return;
  loadLevel(levelIndex);
}

function nextLevel(){
  if (levelIndex + 1 < LEVELS.length) {
    setTimeout(() => loadLevel(levelIndex + 1), 250);
  } else {
    state = "win";
    showOverlay(
      "Você venceu! 🏆",
      `Contra tudo o que esse jogo tentou, você chegou ao fim das ${LEVELS.length} fases.<br><b>Mortes: ${deaths}</b>`,
      "Jogar de novo"
    );
  }
}

function showOverlay(title, html, btn){
  overlay.classList.remove("hidden");
  overlay.innerHTML =
    `<h1>${title}</h1><p>${html}</p><button id="startBtn">${btn}</button>`;
  document.getElementById("startBtn").onclick = startGame;
}

function startGame(){
  Sfx.resume();          // libera o áudio no clique (exigência dos navegadores)
  Sfx.startMusic();      // música sombria de fundo em loop
  deaths = 0;
  overlay.classList.add("hidden");
  state = "play";
  loadLevel(0);
}

// ---------- Loop principal ----------
let last = 0;
function frame(ts){
  const dt = Math.min(32, ts - last) / 16.67;
  last = ts;

  pollGamepad();   // joystick: traduz controle -> keys/PRESS antes dos updates

  if (state === "play" && level){
    level.t += dt;
    LEVELS[levelIndex].update(level, dt);
    movePlayer(level);
    handleShooting(level);
    updateBullets();
    updateEnemies(level);

    if (level.player.dead){
      if (!level._counted){ level._counted = true; deaths++; deathsEl.textContent = "Mortes: " + deaths;
        setTimeout(restartLevel, 650);
      }
    }
  }

  render();
  clearPress();
  requestAnimationFrame(frame);
}

function render(){
  ctx.clearRect(0,0,W,H);

  // fundo do cenário (estável, não treme)
  const themeName = level ? LEVELS[levelIndex].theme : null;
  drawBackground(themeName, level ? level.t : 0);

  ctx.save();
  if (shakeT > 0){ ctx.translate((Math.random()-.5)*shakeT, (Math.random()-.5)*shakeT); shakeT -= 1; }

  if (level){
    const th = THEME[themeName];
    for (const pl of level.platforms) if (!pl.invisible) drawPlatform(pl, th);
    LEVELS[levelIndex].draw(level);
    if (level.goal && !level.goal.hidden)
      drawFlag(level.goal, level.goal.locked ? "#c0392b" : "#22aa55");
    drawEnemies(level);
    drawBullets();
    drawPlayer(level.player);
  }
  ctx.restore();
}

// limpa PRESS (bordas de subida) no fim do frame, após os updates
function clearPress(){ for (const k in PRESS) delete PRESS[k]; }

// ---------- Bootstrap ----------
document.getElementById("startBtn").onclick = startGame;
requestAnimationFrame(frame);
