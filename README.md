# Desafio Troll

Um platformer 2D de "troll": um soldado cumpre missões simples enquanto o jogo
trapaceia (o buraco cresce, a chave foge, a bandeira escapa, o chão some...).
São **20 fases**, **7 tipos de inimigo** e som sintetizado na hora.

## Como rodar

Abra o `index.html` no navegador (duplo-clique funciona — não precisa de
servidor nem build). Clique em **Começar**.

### Controles
- `←` `→` — mover
- `Shift` — correr
- `↑` / `Espaço` — pular
- `X` (ou `Z` / `F`) — atirar
- `R` — reiniciar a fase
- `M` — liga/desliga o som

#### Joystick / controle (Gamepad API)
Basta conectar um controle e apertar um botão. Mapeamento:
- Stick esquerdo / d-pad — mover
- `RB` — correr
- `Y` / `A` — pular
- `X` / `B` — atirar
- `Start` — reiniciar a fase (`Start` / `A` inicia o jogo na tela inicial)
- `Select` — liga/desliga o som

#### Celular / tablet (iPhone, iPad, Android)
Em telas de toque, controles na tela aparecem automaticamente (◀ ▶ mover,
⏩ correr, 🔫 atirar, ⤒ pular) — eles só são exibidos em dispositivos móveis
(`@media (hover: none) and (pointer: coarse)`). No canto superior direito há
botões de **tela cheia** (`⛶`), **reiniciar** (`↻`) e **som** (`🔊`).

> A API de tela cheia funciona em iPad e Android; no iPhone o Safari não permite
> tela cheia fora de vídeo, então o botão pode não ter efeito nesse aparelho.

## Estrutura do projeto

```
index.html        marcação + carrega CSS e os scripts na ordem certa
css/style.css     estilos
js/core.js        canvas, constantes de física, estado global, hit(), roundRect()
js/audio.js       Sfx — todos os efeitos sonoros (Web Audio, sem arquivos)
js/input.js       teclado + joystick/gamepad (keys / PRESS)
js/scenery.js     THEME (paletas), fundos, plataformas, bandeira, espinhos
js/player.js      o soldado (movimento, física, desenho) e o tiro
js/enemies.js     IA + física + desenho dos 7 inimigos
js/levels.js      createLevel() + as 20 fases
js/game.js        loop principal, fluxo de fases, render, bootstrap (carrega por último)
```

> Os arquivos `js/*.js` são `<script>` clássicos e **compartilham o mesmo escopo
> global**. Por isso a ordem em `index.html` importa: `core.js` primeiro,
> `game.js` por último. Não use `import`/`export` (quebraria o duplo-clique via
> `file://`).

## Receitas de manutenção

### Adicionar uma fase
Acrescente um objeto ao array `LEVELS` em `js/levels.js`:

```js
{
  mission: "Fase N — ...",      // texto do HUD
  hint: "...",                  // dica do HUD
  theme: "cave",                // cenário (ver THEME em scenery.js)
  spawn: { x: 30, y: 300 },     // onde o soldado nasce
  build(L){                     // monta o cenário (roda 1x)
    L.addPlatform(0, 360, W, 90);
    L.goal = { x: 745, y: 320, w: 22, h: 40 };
    L.addEnemy("bat", 300, 120, { fly:true, chase:true, hp:1 });
  },
  update(L){ /* a "trollada", roda todo frame */ },
  draw(L){ /* desenho extra da fase */ },
}
```

Ferramentas do objeto `L`: `addPlatform`, `addHazard`, `addEnemy`, `goal`,
`data` (estado livre da fase) e `kill()`. Veja o cabeçalho de `js/levels.js`.

### Adicionar um inimigo
1. Em `js/enemies.js`, adicione um bloco `else if (e.type === "novo")` em
   `drawEnemy()`.
2. Em `js/audio.js`, adicione `novo(){ ... }` em `Sfx` (vira a "voz" do bicho).
3. Use na fase: `L.addEnemy("novo", x, y, opts)`.

Opções de `addEnemy`: `chase`, `minX`/`maxX`, `speed`, `hp`, `dir`,
`fly` (voa), `amp` (zigue-zague), `hop` (salta). Todo inimigo mata no contato e
morre a tiros.

### Adicionar um cenário
1. Em `js/scenery.js`, adicione a paleta de chão em `THEME`.
2. Adicione um bloco `if (theme === "novo")` em `drawBackground()`.
3. Use `theme: "novo"` na fase.

### Adicionar um som
Acrescente um método em `Sfx` (`js/audio.js`) usando os helpers `tone()` e
`noise()`. Chame com `Sfx.meuSom()` no evento desejado.
