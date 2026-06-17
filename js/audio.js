"use strict";
// =====================================================================
//  ÁUDIO: todos os sons são sintetizados na hora (Web Audio API),
//  sem arquivos externos. Cada evento/monstro tem seu timbre.
//  Use Sfx.<nome>() para tocar. Sfx.toggleMute() liga/desliga.
// =====================================================================

const Sfx = (() => {
  let ac = null, master = null, muted = false;

  function init(){
    if (!ac){
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = 1.0; master.connect(ac.destination);
      } catch(e){ ac = null; }
    }
    if (ac && ac.state === "suspended") ac.resume();
    return ac;
  }

  // Oscilador com envelope (tom que pode deslizar de freq -> to)
  function tone({freq=440, to=null, type="sine", dur=0.2, vol=0.2, atk=0.005, when=0}){
    const a = init(); if (!a || muted) return;
    const t0 = a.currentTime + when;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (to != null) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  // Ruído filtrado (impactos, sopros, chocalhos)
  function noise({dur=0.2, vol=0.2, type="highpass", freq=1000, q=1, when=0}){
    const a = init(); if (!a || muted) return;
    const t0 = a.currentTime + when;
    const buf = a.createBuffer(1, Math.max(1, a.sampleRate*dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2 - 1;
    const n = a.createBufferSource(); n.buffer = buf;
    const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = a.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    n.connect(f).connect(g).connect(master);
    n.start(t0); n.stop(t0 + dur + 0.03);
  }

  // Nota de "pad" longa, com ataque e release lentos (para a música ambiente)
  function padNote(freq, dur, vol, type="triangle"){
    const a = init(); if (!a || muted) return;
    const t0 = a.currentTime;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.6);          // ataque lento
    g.gain.linearRampToValueAtTime(vol*0.8, t0 + dur*0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);  // release
    o.connect(g).connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  // Música sombria de fundo: progressão grave em tom menor + melodia esparsa.
  let musicTimer = null, mstep = 0;
  const ROOTS = [110.00, 87.31, 73.42, 82.41];            // Lá, Fá, Ré, Mi (graves)
  const SCALE = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00]; // escala menor de Lá
  function musicTick(){
    const r = ROOTS[mstep % ROOTS.length];
    padNote(r, 3.2, 0.05, "triangle");                     // base grave
    padNote(r * 1.5, 3.2, 0.022, "sine");                  // quinta
    if (mstep % 2 === 0){                                   // melodia melancólica esparsa
      const m = SCALE[(mstep * 3) % SCALE.length];
      padNote(m, 2.0, 0.028, "sine");
    }
    mstep++;
  }

  return {
    resume: init,
    toggleMute(){ muted = !muted; return muted; },
    isMuted(){ return muted; },
    startMusic(){ if (musicTimer) return; init(); mstep = 0; musicTick(); musicTimer = setInterval(musicTick, 2400); },
    stopMusic(){ if (musicTimer){ clearInterval(musicTimer); musicTimer = null; } },

    // --- eventos do jogador ---
    jump(){ tone({freq:300, to:640, type:"square", dur:0.16, vol:0.12}); },
    shoot(){ noise({dur:0.07, vol:0.16, type:"highpass", freq:1400, q:0.6});
             tone({freq:200, to:60, type:"square", dur:0.08, vol:0.08}); },
    die(){ tone({freq:420, to:70, type:"sawtooth", dur:0.6, vol:0.2});
           noise({dur:0.3, vol:0.12, type:"lowpass", freq:600, when:0.02}); },
    hurt(){ tone({freq:160, to:90, type:"square", dur:0.18, vol:0.14}); },     // bala acerta sem matar
    kill(){ noise({dur:0.18, vol:0.22, type:"bandpass", freq:420, q:0.4});
            tone({freq:130, to:50, type:"sawtooth", dur:0.22, vol:0.14}); },
    win(){ [523,659,784,1047].forEach((f,i)=> tone({freq:f, type:"square", dur:0.16, vol:0.12, when:i*0.11})); },

    // --- objetos que mudam de lugar (trolladas) ---
    teleport(){ tone({freq:700, to:1500, type:"sine", dur:0.18, vol:0.12});
                tone({freq:1000, to:1900, type:"triangle", dur:0.14, vol:0.05, when:0.02}); },
    swoosh(){ noise({dur:0.22, vol:0.11, type:"bandpass", freq:800, q:0.8});
              tone({freq:520, to:200, type:"sine", dur:0.2, vol:0.06}); },
    rumble(){ noise({dur:0.4, vol:0.17, type:"lowpass", freq:320, q:0.5});
              tone({freq:85, to:40, type:"sawtooth", dur:0.35, vol:0.12}); },
    creak(){ tone({freq:210, to:110, type:"sawtooth", dur:0.26, vol:0.09});
             noise({dur:0.18, vol:0.06, type:"highpass", freq:2200, when:0.02}); },

    // --- vozes dos monstros (cada tipo, um timbre) ---
    zombie(){ tone({freq:95, to:62, type:"sawtooth", dur:0.5, vol:0.12});
              tone({freq:110, to:80, type:"square", dur:0.45, vol:0.05, when:0.03}); },
    skeleton(){ for (let i=0;i<4;i++) noise({dur:0.04, vol:0.10, type:"highpass", freq:3200, q:1.2, when:i*0.06}); },
    mummy(){ tone({freq:130, to:190, type:"sine", dur:0.7, vol:0.11});
             noise({dur:0.5, vol:0.05, type:"lowpass", freq:500, when:0.05}); },
    ghost(){ tone({freq:520, to:300, type:"sine", dur:0.6, vol:0.10});
             tone({freq:780, to:480, type:"sine", dur:0.5, vol:0.05, when:0.06}); },
    bat(){ for (let i=0;i<3;i++) tone({freq:1800+i*220, type:"square", dur:0.03, vol:0.06, when:i*0.05}); },
    spider(){ for (let i=0;i<5;i++) noise({dur:0.02, vol:0.05, type:"highpass", freq:5200, q:2, when:i*0.03}); },
    slime(){ tone({freq:200, to:420, type:"sine", dur:0.1, vol:0.10});
             tone({freq:420, to:150, type:"sine", dur:0.12, vol:0.08, when:0.08}); },
  };
})();
