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
  house:     { ground:"#3b2c22", grass:"#5a4632" },   // assoalho de madeira podre
  hospital:  { ground:"#48525a", grass:"#5d6770" },   // linóleo encardido
  base:       { ground:"#4a463a", grass:"#5e5942" },   // terra batida/concreto militar
  apocalypse: { ground:"#26242a", grass:"#3a3640" },   // cidade arruinada (apocalipse zumbi)
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
  if (theme === "house") {
    // parede interna mofada
    let g = ctx.createLinearGradient(0,0,0,360);
    g.addColorStop(0,"#4a4036"); g.addColorStop(1,"#2e2820");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,360);
    // papel de parede listrado descascando
    ctx.fillStyle = "rgba(120,98,70,.25)";
    for (let x=0;x<W;x+=40) ctx.fillRect(x,0,18,360);
    ctx.fillStyle = "#241d16";                                   // remendos onde o papel caiu
    for (const [x,y,w,h] of [[90,60,70,120],[360,30,60,90],[560,90,90,140]])
      ctx.fillRect(x,y,w,h);
    // rodapé escuro acima do assoalho
    ctx.fillStyle = "#1e1812"; ctx.fillRect(0,348,W,12);
    // janela tapada com tábuas cruzadas
    ctx.fillStyle = "#15110c"; ctx.fillRect(220,70,120,150);
    ctx.fillStyle = "#5a4632";
    for (const ty of [88,128,168]) ctx.fillRect(214,ty,132,14);  // tábuas horizontais
    ctx.save(); ctx.translate(280,145); ctx.rotate(0.5);
    ctx.fillRect(-72,-7,144,14); ctx.restore();                  // tábua diagonal
    // quadro torto na parede
    ctx.save(); ctx.translate(640,120); ctx.rotate(-0.12);
    ctx.fillStyle = "#6b5436"; ctx.fillRect(-34,-44,68,88);
    ctx.fillStyle = "#241d16"; ctx.fillRect(-26,-36,52,72); ctx.restore();
    // teias de aranha nos cantos
    ctx.strokeStyle = "rgba(220,220,220,.10)"; ctx.lineWidth = 1;
    for (const [cx,cy,sgn] of [[0,0,1],[W,0,-1]]){
      for (let r=20;r<=80;r+=20){ ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI/2*1); ctx.stroke(); }
      for (let a=0;a<=Math.PI/2;a+=Math.PI/8){
        ctx.beginPath(); ctx.moveTo(cx,cy);
        ctx.lineTo(cx+sgn*Math.cos(a)*84, cy+Math.sin(a)*84); ctx.stroke(); }
    }
    // chão de tábuas
    ctx.fillStyle = "#2a2018"; ctx.fillRect(0,360,W,H-360);
    return;
  }
  if (theme === "base") {
    // céu de zona de guerra: cinza esfumaçado com clarão alaranjado
    let g = ctx.createLinearGradient(0,0,0,360);
    g.addColorStop(0,"#6a6256"); g.addColorStop(.6,"#8a7a63"); g.addColorStop(1,"#9c8a6e");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,360);
    ctx.fillStyle = "rgba(255,150,70,.12)";                       // clarão de incêndio no horizonte
    ctx.beginPath(); ctx.arc(560,300,160,0,Math.PI*2); ctx.fill();
    // bunker/hangar destruído ao fundo
    ctx.fillStyle = "#3c4036";
    ctx.fillRect(40,250,180,110);                                 // parede
    ctx.fillStyle = "#2c2f28";
    ctx.beginPath(); ctx.moveTo(40,250); ctx.lineTo(130,210); ctx.lineTo(220,250); ctx.fill(); // teto desabado
    ctx.fillStyle = "#1f221c"; ctx.fillRect(95,300,46,60);        // entrada escura
    for (const [x,y,w,h] of [[55,270,18,16],[170,275,16,14]]){    // janelas quebradas
      ctx.fillStyle = "#15171280"; ctx.fillRect(x,y,w,h); }
    // torre de vigia tombada
    ctx.strokeStyle = "#3a3b30"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(640,360); ctx.lineTo(700,250);
    ctx.moveTo(660,360); ctx.lineTo(720,255); ctx.stroke();
    ctx.fillStyle = "#454636"; ctx.save(); ctx.translate(710,250); ctx.rotate(0.2);
    ctx.fillRect(-26,-22,52,30); ctx.restore();                  // cabine inclinada
    // colunas de fumaça subindo
    ctx.fillStyle = "rgba(40,38,34,.30)";
    for (const [sx,sb] of [[150,250],[470,240],[700,250]])
      for (let i=0;i<4;i++){ const yy = sb - i*44 - (t*0.3 % 44);
        ctx.beginPath(); ctx.arc(sx + Math.sin(i+t*0.02)*10, yy, 14 + i*5, 0, Math.PI*2); ctx.fill(); }
    // arame farpado no horizonte
    ctx.strokeStyle = "#2b2c24"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0,344); ctx.lineTo(W,344); ctx.stroke();
    for (let x=10;x<W;x+=26){ ctx.beginPath(); ctx.arc(x,344,4,0,Math.PI*2); ctx.stroke(); }
    // sacos de areia empilhados (barricada)
    ctx.fillStyle = "#7a6f4e";
    for (let r=0;r<2;r++) for (let i=0;i<5;i++){
      const bx = 250 + i*26 + (r?13:0), by = 332 - r*16;
      roundRect(bx, by, 24, 15, 7); ctx.fill();
    }
    // escombros/crateras espalhados no chão
    ctx.fillStyle = "#3a382e";
    for (const [x,w] of [[120,40],[420,55],[600,45]]){
      ctx.beginPath(); ctx.ellipse(x, 360, w, 9, 0, Math.PI, 0); ctx.fill(); }
    return;
  }
  if (theme === "apocalypse") {
    // céu doentio de fim de mundo: cinza-esverdeado com clarão vermelho de incêndio
    let g = ctx.createLinearGradient(0,0,0,360);
    g.addColorStop(0,"#1a1f1c"); g.addColorStop(.5,"#2f322a"); g.addColorStop(1,"#4a2f24");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,360);
    // lua sangrenta velada pela poeira
    ctx.fillStyle = "rgba(190,120,90,.5)";
    ctx.beginPath(); ctx.arc(130,78,30,0,Math.PI*2); ctx.fill();
    // brasas de incêndio pulsando no horizonte
    const glow = 0.16 + Math.sin(t*0.05)*0.05;
    ctx.fillStyle = `rgba(255,90,30,${glow})`;
    ctx.beginPath(); ctx.arc(520,340,190,0,Math.PI*2); ctx.fill();

    // skyline de cidade arruinada (prédios quebrados, alturas irregulares)
    const blds = [[0,150,70],[78,210,64],[150,110,80],[238,250,72],[320,140,60],
                  [388,200,84],[480,120,70],[558,230,66],[632,160,78],[720,110,80]];
    for (const [x,h,w] of blds){
      ctx.fillStyle = "#191c1f"; ctx.fillRect(x, 360-h, w, h);
      // topo destruído (dente de serra)
      ctx.beginPath(); ctx.moveTo(x, 360-h);
      for (let i=0;i<=4;i++){ const bx=x+i*(w/4); ctx.lineTo(bx, 360-h - ((i%2)?0:9)); }
      ctx.lineTo(x+w,360-h); ctx.fill();
      // janelas: a maioria apagada, algumas com fogo
      for (let wy=360-h+14; wy<350; wy+=20)
        for (let wx=x+8; wx<x+w-8; wx+=16){
          const fire = ((wx*7 + wy*3) % 23) === 0;
          ctx.fillStyle = fire ? `rgba(255,140,40,${0.5+Math.sin(t*0.1+wx)*0.2})` : "#0e1013";
          ctx.fillRect(wx, wy, 8, 11);
        }
    }
    // colunas de fumaça subindo da cidade
    ctx.fillStyle = "rgba(28,26,24,.32)";
    for (const [sx,sb] of [[238,150],[480,200],[660,180]])
      for (let i=0;i<5;i++){ const yy = sb - i*42 - (t*0.35 % 42);
        ctx.beginPath(); ctx.arc(sx + Math.sin(i+t*0.02)*12, yy, 13 + i*6, 0, Math.PI*2); ctx.fill(); }

    // HORDA: silhuetas de zumbis cambaleando ao longe (em direção ao jogador)
    ctx.fillStyle = "#101310";
    for (let i=0;i<11;i++){
      const zx = ((i*73 + t*0.25) % (W+40)) - 20;     // arrastam-se lentamente pra direita
      const sway = Math.sin(t*0.08 + i)*1.5;           // gingado de zumbi
      const zy = 344, zh = 18 + (i%3)*3;
      ctx.save(); ctx.translate(zx + sway, zy);
      ctx.fillRect(-3, -zh, 6, zh);                    // tronco curvado
      ctx.beginPath(); ctx.arc(0, -zh-3, 3.5, 0, Math.PI*2); ctx.fill();   // cabeça pendida
      ctx.fillRect(-7, -zh+4, 5, 2);                   // braço esticado pra frente
      ctx.restore();
    }

    // carro queimado capotado em primeiro plano
    ctx.save(); ctx.translate(360,346); ctx.rotate(0.14);
    ctx.fillStyle = "#23211e"; roundRect(-46,-24,92,24,6); ctx.fill();    // carroceria torrada
    ctx.fillStyle = "#1a1815"; roundRect(-28,-38,50,16,5); ctx.fill();    // teto amassado
    ctx.fillStyle = "#0c0b0a";
    ctx.beginPath(); ctx.arc(-30,2,11,0,Math.PI*2); ctx.fill();           // rodas pra cima (derretidas)
    ctx.beginPath(); ctx.arc(30,2,11,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = "rgba(255,110,40,.25)";                              // brasas ainda acesas sob o carro
    ctx.beginPath(); ctx.ellipse(0,4,40,8,0,0,Math.PI*2); ctx.fill();
    ctx.restore();

    // poste de luz tombado
    ctx.strokeStyle = "#1c1e21"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(600,360); ctx.lineTo(660,300); ctx.lineTo(700,308); ctx.stroke();

    // entulho e manchas escuras no asfalto
    ctx.fillStyle = "#1c1a20";
    for (const [x,w] of [[120,44],[300,40],[560,50]]){
      ctx.beginPath(); ctx.ellipse(x, 360, w, 8, 0, Math.PI, 0); ctx.fill(); }
    // carcaça de manchas de sangue secas
    ctx.fillStyle = "rgba(90,20,18,.45)";
    for (const [x,w] of [[200,30],[470,26],[680,34]])
      ctx.fillRect(x, 356, w, 4);
    return;
  }
  if (theme === "hospital") {
    // parede de azulejos verde-clínico encardido
    let g = ctx.createLinearGradient(0,0,0,360);
    g.addColorStop(0,"#7e9088"); g.addColorStop(1,"#9fb0a6");
    ctx.fillStyle = g; ctx.fillRect(0,0,W,360);
    // azulejos com rejunte
    ctx.strokeStyle = "rgba(40,55,50,.18)"; ctx.lineWidth = 1;
    for (let y=20;y<348;y+=28) for (let x=0;x<W;x+=36) ctx.strokeRect(x,y,36,28);
    // faixa de barra de proteção na parede
    ctx.fillStyle = "#6a7d74"; ctx.fillRect(0,210,W,8);
    // manchas de mofo/umidade
    ctx.fillStyle = "rgba(50,60,45,.22)";
    for (const [x,y,r] of [[120,90,34],[470,60,46],[640,150,30],[300,180,26]]){
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); }
    // luminária fluorescente pendurada, piscando
    const flick = Math.random() < 0.12 ? 0.25 : 1;
    for (const lx of [200, 560]){
      ctx.strokeStyle = "#3a4640"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(lx,0); ctx.lineTo(lx,26); ctx.moveTo(lx+60,0); ctx.lineTo(lx+60,26); ctx.stroke();
      ctx.fillStyle = "#cfd8d2"; ctx.fillRect(lx-6,26,72,10);
      ctx.fillStyle = `rgba(220,240,235,${0.5*flick})`; ctx.fillRect(lx-6,36,72,4);
      ctx.fillStyle = `rgba(220,240,235,${0.10*flick})`;
      ctx.beginPath(); ctx.moveTo(lx-6,36); ctx.lineTo(lx+90,150); ctx.lineTo(lx-30,150); ctx.fill();
    }
    // placa com cruz médica
    ctx.fillStyle = "#e8efe9"; roundRect(372,70,56,40,4); ctx.fill();
    ctx.fillStyle = "#c0392b"; ctx.fillRect(394,78,12,24); ctx.fillRect(386,86,28,8);
    // maca abandonada encostada no fundo
    ctx.fillStyle = "#7c8a82"; ctx.fillRect(80,300,140,8);          // colchão
    ctx.fillStyle = "#aab4ad"; ctx.fillRect(84,292,132,10);
    ctx.fillStyle = "#5a6760"; ctx.fillRect(86,308,5,40); ctx.fillRect(210,308,5,40); // pernas
    ctx.strokeStyle = "#5a6760"; ctx.lineWidth = 3;
    ctx.strokeRect(78,278,18,22);                                   // grade da cabeceira
    // cortina rasgada
    ctx.fillStyle = "rgba(180,195,188,.55)";
    ctx.beginPath(); ctx.moveTo(640,40);
    for (let i=0;i<=6;i++){ const yy=40+i*45; ctx.lineTo(640 + (i%2?14:0), yy); }
    ctx.lineTo(720,310); ctx.lineTo(720,40); ctx.fill();
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
