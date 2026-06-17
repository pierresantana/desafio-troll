"use strict";
// =====================================================================
//  CENÁRIO: paletas de chão por tema, fundos, plataformas, bandeira e
//  espinhos. Para criar um cenário novo: adicione a paleta em THEME e
//  um bloco `if (theme === "...")` em drawBackground().
// =====================================================================

// Paleta de chão por cenário (usada como cor padrão das plataformas)
const THEME = {
  wasteland: { ground:"#6e5436", grass:"#8a6a3b" },   // terra rachada
  factory:   { ground:"#3a3f47", grass:"#565d68" },   // metal/concreto
  forest:    { ground:"#4a3520", grass:"#3f8a2f" },   // tronco e musgo
  city:      { ground:"#2e2e34", grass:"#46464e" },   // asfalto
  graveyard: { ground:"#2a2f24", grass:"#3f4a30" },   // terra de cemitério
  crypt:     { ground:"#2c2935", grass:"#46414f" },   // pedra de cripta
  tomb:      { ground:"#8c6a35", grass:"#b08a45" },   // arenito
  cave:      { ground:"#3a3230", grass:"#4a4038" },   // rocha
  sewer:     { ground:"#2f3a33", grass:"#46574b" },   // concreto úmido
};

function drawPlatform(pl, th){
  ctx.fillStyle = pl.color || (th ? th.ground : "#6b4a2b");
  ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.fillStyle = pl.grass || (th ? th.grass : "#54a838");
  ctx.fillRect(pl.x, pl.y, pl.w, Math.min(7, pl.h));
}

// ---------- Cenários de fundo (preenchem o canvas inteiro) ----------
function drawBackground(theme, t){
  if (theme === "wasteland") {
    let g = ctx.createLinearGradient(0,0,0,360);
    g.addColorStop(0,"#b98c4f"); g.addColorStop(1,"#e7cd97");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,360);
    ctx.fillStyle = "rgba(255,243,214,.55)";          // sol velado
    ctx.beginPath(); ctx.arc(640,95,46,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "#8a6c44";                         // ruínas no horizonte
    const ru = [[60,300,40,60],[120,280,30,80],[300,310,50,50],[470,290,35,70],[700,300,60,60]];
    for (const [x,y,w,h] of ru) ctx.fillRect(x,y,w,h);
    // abismo escuro abaixo do horizonte (faz o buraco "aparecer")
    let ab = ctx.createLinearGradient(0,360,0,H);
    ab.addColorStop(0,"#2a2018"); ab.addColorStop(1,"#100c08");
    ctx.fillStyle = ab; ctx.fillRect(0,360,W,H-360);
    return;
  }
  if (theme === "factory") {
    let g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#23282e"); g.addColorStop(1,"#14181c");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    for (let i=0;i<7;i++){                              // janelas quebradas
      const x = 30 + i*112, y = 55, ww = 82, hh = 92;
      ctx.fillStyle = "#3a4450"; ctx.fillRect(x-3,y-3,ww+6,hh+6);
      for (let r=0;r<2;r++) for (let c=0;c<2;c++){
        const broken = ((i*7 + r*2 + c) % 3) === 0;
        const flick = !broken && Math.random() < 0.04;
        ctx.fillStyle = broken ? "#10141a" : (flick ? "#7a8794" : "#4b5864");
        ctx.fillRect(x + c*(ww/2)+2, y + r*(hh/2)+2, ww/2-4, hh/2-4);
      }
    }
    ctx.fillStyle = "#2c3138";                          // canos verticais
    for (const px of [180, 540]) { ctx.fillRect(px,0,12,H);
      ctx.fillStyle="#3a414a"; ctx.fillRect(px,0,4,H); ctx.fillStyle="#2c3138"; }
    return;
  }
  if (theme === "forest") {
    let g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#9fb98f"); g.addColorStop(.55,"#c7d6b0"); g.addColorStop(.551,"#5f7a4a");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    const tri = (x,base,w,h,col)=>{ ctx.fillStyle=col; ctx.beginPath();
      ctx.moveTo(x,base); ctx.lineTo(x+w/2,base-h); ctx.lineTo(x+w,base); ctx.fill(); };
    for (let x=-20;x<W;x+=120) tri(x,330,140,150,"#7d9a6d");  // pinheiros ao fundo
    for (let x=-40;x<W;x+=150) tri(x,370,180,210,"#4a6638");  // pinheiros à frente
    ctx.fillStyle = "rgba(225,235,215,.28)"; ctx.fillRect(0,300,W,90); // névoa
    return;
  }
  if (theme === "city") {
    let g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#3b3a52"); g.addColorStop(.6,"#6b5a6e"); g.addColorStop(.601,"#2c2a33");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    const blds = [[0,160],[70,90],[150,210],[250,130],[330,250],[430,120],[520,190],[610,100],[690,230]];
    for (const [x,h] of blds) {
      const w = 78;
      ctx.fillStyle = "#2a2838"; ctx.fillRect(x, 360-h, w, h);
      for (let wy=360-h+12; wy<355; wy+=22)               // janelas
        for (let wx=x+8; wx<x+w-8; wx+=18){
          const lit = Math.random() < 0.12;
          ctx.fillStyle = lit ? "#caa84f" : "#1d1b28";
          ctx.fillRect(wx, wy, 8, 11);
        }
    }
    ctx.fillStyle = "#26262c"; ctx.fillRect(0,360,W,H-360); // asfalto
    ctx.fillStyle = "#5a5a44";                              // faixa da rua
    for (let x=20;x<W;x+=70) ctx.fillRect(x,402,34,5);
    return;
  }
  if (theme === "graveyard") {
    let g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#10131b"); g.addColorStop(.6,"#1d2330"); g.addColorStop(.601,"#2a2f24");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = "#e8eed8"; ctx.beginPath(); ctx.arc(120,80,34,0,Math.PI*2); ctx.fill(); // lua
    ctx.fillStyle = "#1d2330"; ctx.beginPath(); ctx.arc(135,72,30,0,Math.PI*2); ctx.fill(); // crescente
    ctx.strokeStyle = "#0d0f14"; ctx.lineWidth = 4;                                          // árvores mortas
    for (const tx of [430, 660]) { ctx.beginPath(); ctx.moveTo(tx,360); ctx.lineTo(tx,250);
      ctx.moveTo(tx,290); ctx.lineTo(tx-18,270); ctx.moveTo(tx,275); ctx.lineTo(tx+20,255); ctx.stroke(); }
    ctx.fillStyle = "#3a4150";                                                               // lápides
    for (const [x,h] of [[60,46],[180,38],[300,50],[520,40],[600,52],[730,44]]){
      roundRect(x,360-h,30,h,8); ctx.fill(); }
    return;
  }
  if (theme === "crypt") {
    let g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#23202b"); g.addColorStop(1,"#15131b");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = "rgba(255,255,255,.045)"; ctx.lineWidth = 2;                           // tijolos
    for (let y=20;y<360;y+=40){ const off=(Math.floor(y/40)%2)*40;
      for (let x=-40;x<W;x+=80) ctx.strokeRect(x+off, y, 80, 40); }
    ctx.fillStyle = "#1b1822";                                                               // colunas
    for (const cx of [150,400,650]) ctx.fillRect(cx-12,40,24,320);
    for (const tx of [80,330,580]){                                                          // tochas
      ctx.fillStyle = "#3a2a18"; ctx.fillRect(tx-2,150,4,16);
      ctx.fillStyle = "#ff9b3d"; ctx.beginPath(); ctx.arc(tx,148,6+Math.random()*3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(255,180,90,.12)"; ctx.beginPath(); ctx.arc(tx,150,40,0,Math.PI*2); ctx.fill(); }
    return;
  }
  if (theme === "tomb") {
    let g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#caa45e"); g.addColorStop(1,"#8c6a35");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    for (const cx of [90,300,510,720]){                                                      // colunas com glifos
      ctx.fillStyle = "#b08a45"; ctx.fillRect(cx-22,40,44,320);
      ctx.fillStyle = "#7d5e2c";
      for (let hy=70; hy<340; hy+=40){ ctx.fillRect(cx-12,hy,24,3); ctx.fillRect(cx-6,hy+8,12,12); }
    }
    ctx.fillStyle = "rgba(255,200,120,.12)"; ctx.beginPath(); ctx.arc(400,120,130,0,Math.PI*2); ctx.fill();
    return;
  }
  if (theme === "cave") {
    let g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#1a1512"); g.addColorStop(1,"#0c0908");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = "#241d19";
    for (let x=10;x<W;x+=70){ const hh = 24 + (x*7 % 40);                                    // estalactites
      ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x+14,0); ctx.lineTo(x+7,hh); ctx.fill(); }
    for (let x=40;x<W;x+=90){ const hh = 30 + (x*5 % 36);                                    // estalagmites
      ctx.beginPath(); ctx.moveTo(x,360); ctx.lineTo(x+22,360); ctx.lineTo(x+11,360-hh); ctx.fill(); }
    for (const [cx,cy] of [[180,210],[470,180],[660,240]]){                                  // cristais
      ctx.fillStyle = "rgba(120,200,255,.5)"; ctx.beginPath(); ctx.arc(cx,cy,8,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = "rgba(120,200,255,.12)"; ctx.beginPath(); ctx.arc(cx,cy,22,0,Math.PI*2); ctx.fill(); }
    return;
  }
  if (theme === "sewer") {
    let g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#1d241f"); g.addColorStop(1,"#0f140f");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = "#2c3a30"; ctx.lineWidth = 10;                                         // arcos do túnel
    ctx.beginPath(); ctx.arc(W/2, 400, 330, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(W/2, 400, 250, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = "#3a4a40";                                                               // canos horizontais
    for (const py of [120, 210]) ctx.fillRect(0, py, W, 9);
    ctx.fillStyle = "rgba(90,150,110,.18)";                                                  // goteiras
    for (const dx of [120, 300, 520, 700]){ ctx.beginPath(); ctx.arc(dx, 130, 6, 0, Math.PI*2); ctx.fill(); }
    return;
  }
  // padrão: céu + grama
  let g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#5fb0e8"); g.addColorStop(.6,"#bfe6ff"); g.addColorStop(.6,"#7ec850");
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
}

// Bandeira (objetivo)
function drawFlag(g, color="#22aa55"){
  ctx.fillStyle = "#444"; ctx.fillRect(g.x + g.w/2 - 2, g.y - 4, 4, g.h + 4);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(g.x + g.w/2 + 2, g.y);
  ctx.lineTo(g.x + g.w/2 + 28, g.y + 9);
  ctx.lineTo(g.x + g.w/2 + 2, g.y + 18);
  ctx.fill();
}

// Espinhos (apontando pra cima) a partir de um hazard {x,y,w,h}
function drawSpikes(s){
  if (!s || s.w <= 0) return;
  ctx.fillStyle = "#cdd2d8";
  const n = Math.max(1, Math.floor(s.w/12));
  for (let i=0;i<n;i++){
    const sx = s.x + i*(s.w/n);
    ctx.beginPath();
    ctx.moveTo(sx, s.y+s.h);
    ctx.lineTo(sx + (s.w/n)/2, s.y);
    ctx.lineTo(sx + (s.w/n), s.y+s.h);
    ctx.fill();
  }
}
