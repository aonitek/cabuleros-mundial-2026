/* ============================================================
   CABULEROS — lane defense mundialista de Aonitek
   Un solo archivo. Sin dependencias. Mobile-first.
   ============================================================ */
'use strict';

/* ================= CONFIG GENERAL ================= */
const AONITEK_URL = 'https://aonitek.com';           // CTA diagnóstico (editable)
const GAME_URL = "https://app.aonitek.com/p/zaZu5x"; // URL real de la página publicada
const PROMO_URL = "https://app.aonitek.com/p/UD87r5j5"; // página de promo del juego (para shares del carnet/campeón)
const AONITEK_SERVICES = 'https://aonitek.com/servicios/';
const utmUrl = (base, content) => base + '?utm_source=cabuleros&utm_medium=game&utm_campaign=mundial2026&utm_content=' + content;

const COLS = 5, ROWS = 8;
const GOAL_Y = ROWS - 0.18;        // línea de gol (abajo)
const PROJ_SPEED = 6.2;            // filas por segundo, hacia arriba
const EAT_DPS = 30;
const PASSIVE_ALIENTO = 15, PASSIVE_EVERY = 4;
const START_ALIENTO = 150;
const MAX_GOLES = 3;

/* ================= CARTAS (FIGURITAS) ================= */
const CARDS = [
  { id:'hinchada',  name:'Hinchada',  cost:50,  cd:6,  hp:110, unlock:1,
    gen:{ every:7, amount:25 } },
  { id:'delantero', name:'Delantero', cost:100, cd:5,  hp:120, unlock:1,
    shoot:{ rate:1.4, dmg:22, shots:1 } },
  { id:'defensor',  name:'El Muro',   cost:75,  cd:9,  hp:520, unlock:1 },
  { id:'enganche',  name:'El 10',     cost:175, cd:8,  hp:120, unlock:2,
    shoot:{ rate:1.5, dmg:22, shots:2 } },
  { id:'aonitek',   name:'Módulo IA', cost:150, cd:14, hp:150, unlock:1,
    module:{ rateBoost:1.45, income:8, every:5 } },
];
const cardById = id => CARDS.find(c => c.id === id);

/* ================= ENEMIGOS ================= */
const ENEMIES = {
  hincha:  { hp:100, spd:0.145, w:0.72, score:1, color:'#B23A4E' },
  bengala: { hp:75,  spd:0.265, w:0.66, score:1, color:'#D4513F' },
  capo:    { hp:330, spd:0.100, w:0.86, score:2, color:'#8E2B3C' },
  crack:   { hp:950, spd:0.118, w:0.95, score:5, color:'#6E1F46', boss:true },
};

/* ================= NIVELES ================= */
const LEVELS = [
  {
    n:1, label:'Fase de grupos', title:'FASE DE GRUPOS', duration:110,
    pool:[ ['hincha',1] ],
    tip:'Arranca el grupo. El rival manda hinchas sueltos: plantá Hinchadas atrás para juntar Aliento y un Delantero por carril. El Muro aguanta cuando se complica.',
    brand:'Dato del DT: mientras vos jugás, un agente de Aonitek podría estar contestando a tus clientes. Solo decimos.',
    unlocks:'Cábalas listas: dibujá la ✕ para anular la mufa.',
  },
  {
    n:2, label:'Semifinal', title:'SEMIFINAL', duration:140,
    pool:[ ['hincha',0.65], ['bengala',0.35] ],
    tip:'Semifinal. Ojo con las bengalas: corren el doble y no perdonan. El Muro las frena, El 10 las define con doble pelotazo.',
    brand:'Probá el Módulo IA: automatiza un carril entero. Igual que Aonitek con tu negocio, pero en versión cancha.',
    unlocks:'Se desbloquea: EL 10 (doble disparo).',
  },
  {
    n:3, label:'La Final', title:'LA FINAL', duration:170,
    pool:[ ['hincha',0.5], ['bengala',0.3], ['capo',0.2] ],
    tip:'La Final. Vienen los capos de la barra y, sobre el final, el Crack rival. Guardate las cábalas para los últimos minutos y no toques nada.',
    brand:'Aonitek no hace cábalas. Hace agentes. Pero hoy, por las dudas, frotá el amuleto.',
    unlocks:'Aparecen: EL CAPO (tanque) y EL CRACK RIVAL (jefe).',
  },
];

/* ================= TEXTOS ================= */
const LED_MSGS = [
  'AUTOMATIZÁ TU NEGOCIO · AONITEK',
  '¿CANSADO DE DEFENDER A MANO?',
  'AGENTES DE IA QUE ATIENDEN 24/7',
  'AONITEK NO HACE CÁBALAS · HACE AGENTES',
  'TU NEGOCIO ATIENDE SOLO · AONITEK.COM',
];
const DT_RANDOM_TIPS = [
  'No regales el medio: una Hinchada atrás vale más que dos delanteros sin Aliento.',
  'El Muro adelante, los que patean atrás. Básico, pero el 90% lo hace al revés.',
  'El Módulo IA rinde más en el carril donde más sufrís. Automatizá el problema, no el lujo.',
  'Si viene avalancha, no entres en pánico: dibujá la ✕ y respirá.',
  'Las bengalas se frenan con paciencia y un Muro bien plantado.',
];

/* ================= ESTADO GLOBAL ================= */
const S = {
  screen:'menu',          // menu | dt | play | gesture | pause | result | champ | fig
  levelIdx:0,
  running:false, paused:false,
  timeScale:1,
  matchT:0,
  aliento:0, goles:0,
  grid:[], enemies:[], projs:[], parts:[], floats:[],
  schedule:[], schedIdx:0,
  cardCd:{}, selCard:null,
  cabalaCd:{ mufa:-999, amuleto:-999 },
  frenzyT:0, shakeT:0, flashT:0,
  spawnDone:false, ended:false,
  shareBonus:false,       // +20% aliento por compartir
  socioBonus:0,           // bono del chat (una vez)
  muted:false,
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  now:0,
};

/* ================= UTILS ================= */
const $ = sel => document.querySelector(sel);
const clamp = (v,a,b) => v < a ? a : v > b ? b : v;
const lerp = (a,b,t) => a + (b-a)*t;
const rnd = (a=1,b) => b === undefined ? Math.random()*a : a + Math.random()*(b-a);
const rndi = (a,b) => Math.floor(rnd(a, b+1));
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
function weightedPick(pool){
  let t = 0; for (const [,w] of pool) t += w;
  let r = Math.random()*t;
  for (const [k,w] of pool){ r -= w; if (r <= 0) return k; }
  return pool[pool.length-1][0];
}

/* ================= AUDIO (WebAudio synth) ================= */
let AC = null;
function audioInit(){
  if (AC) return;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){ AC = null; }
}
function tone(freq, dur, type='sine', vol=0.16, slideTo=null, when=0){
  if (!AC || S.muted) return;
  if (AC.state === 'suspended') AC.resume();
  const t0 = AC.currentTime + when;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(slideTo,1), t0+dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  o.connect(g).connect(AC.destination);
  o.start(t0); o.stop(t0+dur+0.02);
}
const SFX = {
  place: () => { tone(150, .1, 'triangle', .22, 90); },
  shoot: () => { tone(620, .06, 'square', .05, 880); },
  hit:   () => { tone(210, .05, 'square', .08, 140); },
  gen:   () => { tone(880, .09, 'sine', .08, 1320); },
  bad:   () => { tone(330, .3, 'sawtooth', .14, 110); },
  golRival: () => { tone(440,.18,'sawtooth',.16,220); tone(220,.35,'sawtooth',.14,90,.16); },
  whistle:  () => { tone(2200,.13,'square',.07); tone(2200,.3,'square',.07,null,.18); },
  cabala: () => { tone(523,.12,'triangle',.14); tone(659,.12,'triangle',.14,null,.1); tone(784,.2,'triangle',.16,null,.2); },
  win:    () => { [523,659,784,1046].forEach((f,i)=>tone(f,.22,'triangle',.15,null,i*.13)); },
  click:  () => { tone(700,.05,'sine',.07); },
};

/* ================= CANVAS / GEOMETRÍA ================= */
const cv = $('#cv');
let ctx = cv.getContext('2d');
const mainCtx = ctx;
function setCtx(c){ ctx = c || mainCtx; }
let W = 0, H = 0, DPR = 1;
let railW = 0, fieldX = 0, fieldW = 0, cellW = 0, rowH = 0;

function resize(){
  const r = cv.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2.5);
  W = Math.max(1, Math.round(r.width));
  H = Math.max(1, Math.round(r.height));
  cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  railW = clamp(W*0.085, 24, 42);
  fieldX = railW; fieldW = W - railW*2;
  cellW = fieldW/COLS; rowH = H/ROWS;
}
new ResizeObserver(resize).observe(cv);

const laneX = c => fieldX + (c+0.5)*cellW;   // centro x del carril
const rowY  = r => (r+0.5)*rowH;             // centro y de la fila (r en unidades de fila)
const yOf   = ry => ry*rowH;                 // fila continua -> px

function cellFromPoint(px, py){
  if (px < fieldX || px > fieldX+fieldW) return null;
  const c = Math.floor((px-fieldX)/cellW);
  const r = Math.floor(py/rowH);
  if (c<0||c>=COLS||r<0||r>=ROWS) return null;
  return {c, r};
}

/* ================= SCHEDULE (oleadas) ================= */
function buildSchedule(level){
  const ev = [];
  const dur = level.duration;
  let t = 7;
  while (t < dur - 14){
    const prog = t/dur;
    let count = 1;
    if (prog > 0.45 && Math.random() < 0.45) count++;
    if (level.n >= 2 && prog > 0.6 && Math.random() < 0.4) count++;
    for (let i=0;i<count;i++){
      ev.push({ t: t + rnd(0.9), spawn: weightedPick(level.pool), lane: rndi(0,COLS-1) });
    }
    const base = lerp(7.5, 2.7, prog);
    t += base / (1 + (level.n-1)*0.18);
  }
  // oleadas marcadas
  const wave = (wt, n, msg) => {
    ev.push({ t:wt-0.1, banner:msg, sfx:'bad' });
    for (let i=0;i<n;i++) ev.push({ t: wt + rnd(2.6), spawn: weightedPick(level.pool), lane: rndi(0,COLS-1) });
  };
  wave(dur*0.45, 4+level.n, '¡SE VIENE LA OLEADA!');
  wave(dur*0.78, 5+level.n, '¡OTRA OLEADA!');
  if (level.n === 3){
    ev.push({ t: dur*0.62 - 0.1, banner:'¡ENTRÓ EL CRACK RIVAL!', sfx:'bad' });
    ev.push({ t: dur*0.62, spawn:'crack', lane: rndi(1,COLS-2) });
  }
  // avalancha final
  ev.push({ t: dur-12.1, banner:'¡AVALANCHA FINAL!', sfx:'bad' });
  for (let i=0;i<6+level.n*2;i++){
    ev.push({ t: dur-12 + rnd(5.5), spawn: weightedPick(level.pool), lane: rndi(0,COLS-1) });
  }
  ev.sort((a,b)=>a.t-b.t);
  return ev;
}

/* ================= CICLO DE VIDA ================= */
function startLevel(idx){
  const lv = LEVELS[idx];
  S.levelIdx = idx;
  resetLevelBucket(lv.n);
  S.matchT = 0;
  S.aliento = START_ALIENTO + S.socioBonus;
  S.socioBonus = 0;
  S.goles = 0;
  S.grid = Array.from({length:ROWS}, ()=>Array(COLS).fill(null));
  S.enemies = []; S.projs = []; S.parts = []; S.floats = [];
  S.schedule = buildSchedule(lv); S.schedIdx = 0;
  S.cardCd = {}; S.selCard = null;
  S.cabalaCd = { mufa:-999, amuleto:-999 };
  S.frenzyT = 0; S.shakeT = 0; S.flashT = 0;
  S.spawnDone = false; S.ended = false;
  S.timeScale = 1;
  S._passT = 0;
  buildCardsUI(lv.n);
  renderGoles();
  $('#lvl-label').textContent = lv.label;
  $('#hud').classList.add('on');
  $('#tray').classList.add('on');
  $('#chat-fab').classList.remove('on');
  setScreen('play');
  S.running = true; S.paused = false;
  showHint('Tocá una figurita y después tocá el campo para plantarla');
  SFX.whistle();
}

function endLevel(won){
  if (S.ended) return;
  S.ended = true; S.running = false;
  S.selCard = null;
  recLevelEnd(won);
  setTimeout(()=>{
    $('#hud').classList.remove('on');
    $('#tray').classList.remove('on');
    if (won && S.levelIdx === LEVELS.length-1){
      showChampion();
    } else {
      showResult(won);
    }
  }, won ? 900 : 1200);
  if (won) SFX.win(); else SFX.bad();
}

function quitToMenu(){
  S.running = false; S.paused = false; S.ended = true;
  $('#hud').classList.remove('on');
  $('#tray').classList.remove('on');
  $('#chat-fab').classList.add('on');
  setScreen('menu');
}
/* ================= UPDATE ================= */
function update(dt){
  const lv = LEVELS[S.levelIdx];
  S.matchT += dt;

  // spawns programados
  while (S.schedIdx < S.schedule.length && S.schedule[S.schedIdx].t <= S.matchT){
    const e = S.schedule[S.schedIdx++];
    if (e.banner){ showBanner(e.banner, 'bad'); if (e.sfx) SFX[e.sfx](); }
    if (e.spawn) spawnEnemy(e.spawn, e.lane);
  }
  if (S.schedIdx >= S.schedule.length) S.spawnDone = true;

  // aliento pasivo
  S._passT = (S._passT||0) + dt;
  const passEvery = PASSIVE_EVERY;
  if (S._passT >= passEvery){
    S._passT -= passEvery;
    addAliento(passiveAmount(), null);
  }

  // unidades
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++){
    const u = S.grid[r][c];
    if (!u) continue;
    if (u.hp <= 0){ killUnit(r,c); continue; }
    u.t += dt;
    if (u.gen){
      const gBoost = laneHasModule(c) ? cardById('aonitek').module.rateBoost : 1;
      u.genT += dt * gBoost;
      if (u.genT >= u.gen.every){
        u.genT -= u.gen.every;
        addAliento(u.gen.amount, {x:laneX(c), y:rowY(r)});
        SFX.gen();
      }
    }
    if (u.module){
      u.genT += dt;
      if (u.genT >= u.module.every){
        u.genT -= u.module.every;
        addAliento(u.module.income, {x:laneX(c), y:rowY(r)});
      }
    }
    if (u.shoot){
      const boost = laneHasModule(c) ? cardById('aonitek').module.rateBoost : 1;
      const frz = S.frenzyT > 0 ? 2 : 1;
      u.shootT += dt * boost * frz;
      const hasTarget = S.enemies.some(e => e.lane === c && e.y <= r + 0.6 && e.y > -1.4);
      if (hasTarget && u.shootT >= u.shoot.rate){
        u.shootT = 0;
        for (let s=0;s<u.shoot.shots;s++){
          S.projs.push({ lane:c, y:r+0.35 - s*0.22, dmg:u.shoot.dmg });
        }
        u.kick = 0.16;
        SFX.shoot();
      }
      if (u.kick) u.kick = Math.max(0, u.kick - dt);
    }
  }

  // proyectiles
  for (let i=S.projs.length-1;i>=0;i--){
    const p = S.projs[i];
    p.y -= PROJ_SPEED*dt;
    if (p.y < -1){ S.projs.splice(i,1); continue; }
    for (const e of S.enemies){
      if (e.lane === p.lane && Math.abs(e.y - p.y) < 0.42 && e.hp > 0){
        e.hp -= p.dmg; e.hurt = 0.12;
        spawnHitParts(laneX(p.lane), yOf(p.y));
        SFX.hit();
        S.projs.splice(i,1);
        break;
      }
    }
  }

  // enemigos
  for (let i=S.enemies.length-1;i>=0;i--){
    const e = S.enemies[i];
    if (e.hurt) e.hurt = Math.max(0, e.hurt - dt);
    if (e.hp <= 0){ killEnemy(i); continue; }
    if (e.stun > 0){ e.stun -= dt; continue; }
    let spd = e.spd;
    if (e.boss && e.hp < e.maxHp*0.4){ spd *= 1.55; e.rage = true; }
    // ¿está comiendo una unidad?
    const tr = Math.floor(e.y + 0.55);
    const unit = (tr >= 0 && tr < ROWS) ? S.grid[tr][e.lane] : null;
    if (unit){
      unit.hp -= EAT_DPS*dt;
      e.eating = true;
      e.chew = (e.chew||0) + dt;
    } else {
      e.eating = false;
      e.y += spd*dt;
    }
    if (e.y >= GOAL_Y){
      golRival(i);
    }
  }

  // frenzy / shake / flash
  if (S.frenzyT > 0) S.frenzyT -= dt;
  if (S.shakeT > 0) S.shakeT -= dt;
  if (S.flashT > 0) S.flashT -= dt;

  // partículas / floaters
  for (let i=S.parts.length-1;i>=0;i--){
    const p = S.parts[i];
    p.t += dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 340*dt;
    if (p.t > p.life) S.parts.splice(i,1);
  }
  for (let i=S.floats.length-1;i>=0;i--){
    const f = S.floats[i];
    f.t += dt; f.y -= 34*dt;
    if (f.t > 1.1) S.floats.splice(i,1);
  }

  // ¿victoria?
  if (!S.ended && S.spawnDone && S.matchT >= lv.duration && S.enemies.length === 0){
    showBanner('¡FINAL DEL PARTIDO!', 'gold');
    SFX.whistle();
    endLevel(true);
  }
}

function passiveAmount(){
  let a = PASSIVE_ALIENTO;
  if (S.shareBonus) a *= 1.2;
  if (S.frenzyT > 0) a *= 2;
  return Math.round(a);
}

function laneHasModule(c){
  for (let r=0;r<ROWS;r++){
    const u = S.grid[r][c];
    if (u && u.module && u.hp > 0) return true;
  }
  return false;
}

function spawnEnemy(type, lane){
  const def = ENEMIES[type];
  S.enemies.push({
    type, lane,
    y:-0.8, hp:def.hp, maxHp:def.hp, score:def.score||1,
    spd:def.spd*(0.93+rnd(0.14)), w:def.w,
    color:def.color, boss:!!def.boss,
    stun:0, hurt:0, wob:rnd(Math.PI*2),
  });
}

function killEnemy(i){
  const e = S.enemies[i];
  recKill(e);
  spawnDeathParts(laneX(e.lane), yOf(e.y), e.color);
  S.enemies.splice(i,1);
}

function killUnit(r,c){
  const u = S.grid[r][c];
  if (!u) return;
  spawnDeathParts(laneX(c), rowY(r), '#cfd8e6');
  S.grid[r][c] = null;
}

function golRival(i){
  S.enemies.splice(i,1);
  S.goles++;
  renderGoles();
  S.shakeT = S.reducedMotion ? 0 : 0.5;
  showBanner('¡GOL DEL RIVAL!', 'bad');
  SFX.golRival();
  if (S.goles >= MAX_GOLES && !S.ended){
    endLevel(false);
  }
}

function addAliento(n, from){
  S.aliento += n;
  if (from){
    S.floats.push({ x:from.x, y:from.y-rowH*0.3, t:0, txt:'+'+n });
  }
}

/* partículas */
function spawnHitParts(x,y){
  if (S.reducedMotion) return;
  for (let i=0;i<4;i++){
    S.parts.push({ x, y, vx:rnd(-90,90), vy:rnd(-130,-20), t:0, life:rnd(.25,.45), r:rnd(1.5,3), col:'#FFFFFF' });
  }
}
function spawnDeathParts(x,y,col){
  if (S.reducedMotion) return;
  for (let i=0;i<10;i++){
    S.parts.push({ x, y, vx:rnd(-130,130), vy:rnd(-200,-30), t:0, life:rnd(.3,.6), r:rnd(2,4), col });
  }
}

/* ================= RENDER ================= */
let ledOffset = 0;
function render(dt){
  ctx.clearRect(0,0,W,H);

  // shake
  ctx.save();
  if (S.shakeT > 0){
    const k = S.shakeT*10;
    ctx.translate(rnd(-k,k), rnd(-k,k));
  }

  drawField();
  drawRails(dt);

  // unidades
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++){
    const u = S.grid[r][c];
    if (u) drawUnit(u, laneX(c), rowY(r));
  }
  // ghost de colocación
  if (S.selCard && S.running && !S.paused){
    drawGhostHints();
  }
  // proyectiles
  for (const p of S.projs) drawBall(laneX(p.lane), yOf(p.y));
  // enemigos
  for (const e of S.enemies) drawEnemy(e);
  // partículas
  for (const p of S.parts){
    ctx.globalAlpha = 1 - p.t/p.life;
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // floaters (+aliento)
  ctx.font = '900 13px Archivo, sans-serif';
  ctx.textAlign = 'center';
  for (const f of S.floats){
    ctx.globalAlpha = clamp(1.4 - f.t, 0, 1);
    ctx.fillStyle = '#FFC845';
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 3;
    ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // flash de cábala
  if (S.flashT > 0){
    ctx.fillStyle = 'rgba(255,225,140,'+ (S.flashT*0.55).toFixed(3) +')';
    ctx.fillRect(0,0,W,H);
  }
  // tinte frenzy
  if (S.frenzyT > 0){
    const a = 0.05 + 0.03*Math.sin(S.now*8);
    ctx.fillStyle = 'rgba(255,200,69,'+a.toFixed(3)+')';
    ctx.fillRect(0,0,W,H);
  }
}

function drawField(){
  // césped por filas alternadas
  for (let r=0;r<ROWS;r++){
    ctx.fillStyle = r%2 ? '#185F31' : '#1C6E38';
    ctx.fillRect(fieldX, r*rowH, fieldW, rowH+1);
  }
  // tribuna rival arriba (degradé oscuro)
  const trib = ctx.createLinearGradient(0,0,0,rowH*0.95);
  trib.addColorStop(0,'rgba(11,22,38,.92)');
  trib.addColorStop(1,'rgba(11,22,38,0)');
  ctx.fillStyle = trib;
  ctx.fillRect(fieldX,0,fieldW,rowH*0.95);
  // puntitos de la tribuna rival
  ctx.fillStyle = 'rgba(178,58,78,.55)';
  const step = 14;
  for (let x=fieldX+8; x<fieldX+fieldW-4; x+=step){
    for (let y=6; y<rowH*0.55; y+=12){
      ctx.fillRect(x + ((y/12)%2)*5, y, 3.4, 3.4);
    }
  }
  // líneas de carril
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1;
  for (let c=1;c<COLS;c++){
    ctx.beginPath();
    ctx.moveTo(fieldX+c*cellW, rowH*0.6);
    ctx.lineTo(fieldX+c*cellW, H);
    ctx.stroke();
  }
  // círculo central + línea
  ctx.strokeStyle = 'rgba(255,255,255,.2)';
  ctx.lineWidth = 1.6;
  const midY = H*0.46;
  ctx.beginPath(); ctx.moveTo(fieldX, midY); ctx.lineTo(fieldX+fieldW, midY); ctx.stroke();
  ctx.beginPath(); ctx.arc(fieldX+fieldW/2, midY, Math.min(cellW*0.85, 46), 0, 7); ctx.stroke();
  // área y arco propio (abajo)
  const ga = H - rowH*0.66;
  ctx.strokeRect(fieldX+fieldW*0.18, ga, fieldW*0.64, rowH*0.66);
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.fillRect(fieldX+fieldW*0.30, H-5, fieldW*0.40, 5);
  // red
  ctx.strokeStyle = 'rgba(255,255,255,.28)';
  ctx.lineWidth = 1;
  for (let i=0;i<=8;i++){
    const x = fieldX+fieldW*0.30 + i*(fieldW*0.40/8);
    ctx.beginPath(); ctx.moveTo(x, H-5); ctx.lineTo(x, H-rowH*0.34); ctx.stroke();
  }
}

function drawRails(dt){
  if (S.running && !S.paused) ledOffset += dt*26;
  const msg = LED_MSGS.join('  ···  ') + '  ···  ';
  ctx.fillStyle = '#0A1322';
  ctx.fillRect(0,0,railW,H);
  ctx.fillRect(W-railW,0,railW,H);
  ctx.strokeStyle = 'rgba(138,108,255,.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5,0.5,railW-1,H-1);
  ctx.strokeRect(W-railW+0.5,0.5,railW-1,H-1);

  ctx.fillStyle = '#8A6CFF';
  ctx.font = '800 '+ Math.round(railW*0.42) +'px Archivo, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const tw = ctx.measureText(msg).width;
  const off = ledOffset % tw;
  // riel izquierdo: texto que sube
  ctx.save();
  ctx.translate(railW/2, H);
  ctx.rotate(-Math.PI/2);
  ctx.fillText(msg, -off, 0);
  ctx.fillText(msg, -off+tw, 0);
  ctx.restore();
  // riel derecho: baja
  ctx.save();
  ctx.translate(W-railW/2, 0);
  ctx.rotate(Math.PI/2);
  ctx.fillText(msg, -off, 0);
  ctx.fillText(msg, -off+tw, 0);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

/* --- figuritas (chips) --- */
function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function drawChipBase(x,y,s,fill,border){
  ctx.save();
  ctx.translate(x,y);
  ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
  ctx.fillStyle = border;
  roundRect(-s/2,-s/2,s,s,s*0.22); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = fill;
  roundRect(-s/2+s*0.07,-s/2+s*0.07,s*0.86,s*0.86,s*0.16); ctx.fill();
  ctx.restore();
}

function drawUnit(u, x, y){
  const s = Math.min(cellW, rowH)*0.84;
  const kick = u.kick ? Math.sin(u.kick/0.16*Math.PI)*s*0.06 : 0;
  const def = cardById(u.id);
  const isAon = u.id === 'aonitek';
  drawChipBase(x, y - kick, s, isAon ? '#1A1340' : '#103258', '#F2F5FA');

  ctx.save();
  ctx.translate(x, y - kick);
  if (isAon){
    // chip Aonitek: A con pulso de circuito
    const pulse = 0.5 + 0.5*Math.sin(S.now*3 + x);
    ctx.strokeStyle = 'rgba(138,108,255,'+(0.35+0.4*pulse).toFixed(2)+')';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-s*0.3, s*0.26); ctx.lineTo(-s*0.3, 0); ctx.lineTo(-s*0.14, 0);
    ctx.moveTo(s*0.3, -s*0.26); ctx.lineTo(s*0.3, 0); ctx.lineTo(s*0.14, 0);
    ctx.stroke();
    ctx.fillStyle = '#8A6CFF';
    ctx.beginPath(); ctx.arc(-s*0.3, s*0.26, 2.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(s*0.3, -s*0.26, 2.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 '+Math.round(s*0.5)+'px Archivo, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('A', 0, s*0.04);
  } else {
    // camiseta a rayas celestes
    ctx.fillStyle = '#EAF4FB';
    roundRect(-s*0.36,-s*0.36,s*0.72,s*0.72,s*0.12); ctx.fill();
    ctx.save();
    roundRect(-s*0.36,-s*0.36,s*0.72,s*0.72,s*0.12); ctx.clip();
    ctx.fillStyle = '#7CC4EF';
    for (let i=-3;i<=3;i+=2) ctx.fillRect(i*s*0.12 - s*0.06, -s*0.36, s*0.12, s*0.72);
    ctx.restore();
    drawRoleIcon(u.id, s);
  }
  ctx.restore();

  // barra de vida si está lastimado
  if (u.hp < u.maxHp){
    const w = s*0.8, hpw = clamp(u.hp/u.maxHp,0,1)*w;
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(x-w/2, y - kick - s/2 - 7, w, 4);
    ctx.fillStyle = u.hp/u.maxHp > 0.35 ? '#46D38B' : '#FF5D5D';
    ctx.fillRect(x-w/2, y - kick - s/2 - 7, hpw, 4);
  }
}

function drawRoleIcon(id, s){
  ctx.strokeStyle = '#0E2A47'; ctx.fillStyle = '#0E2A47';
  ctx.lineWidth = Math.max(1.6, s*0.05);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (id === 'hinchada'){
    // banderín
    ctx.beginPath();
    ctx.moveTo(-s*0.12,-s*0.24); ctx.lineTo(-s*0.12,s*0.26); ctx.stroke();
    ctx.fillStyle = '#FFC845';
    ctx.beginPath();
    ctx.moveTo(-s*0.12,-s*0.24); ctx.lineTo(s*0.24,-s*0.12); ctx.lineTo(-s*0.12,0);
    ctx.closePath(); ctx.fill();
  } else if (id === 'delantero'){
    drawBallIcon(0, s*0.02, s*0.2);
  } else if (id === 'defensor'){
    ctx.fillStyle = '#0E2A47';
    ctx.beginPath();
    ctx.moveTo(0,-s*0.26);
    ctx.lineTo(s*0.22,-s*0.16); ctx.lineTo(s*0.22,s*0.06);
    ctx.quadraticCurveTo(s*0.22,s*0.24,0,s*0.3);
    ctx.quadraticCurveTo(-s*0.22,s*0.24,-s*0.22,s*0.06);
    ctx.lineTo(-s*0.22,-s*0.16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#EAF4FB';
    ctx.font = '900 '+Math.round(s*0.26)+'px Archivo, sans-serif';
    ctx.fillText('M', 0, s*0.02);
  } else if (id === 'enganche'){
    ctx.fillStyle = '#E0A21E';
    ctx.font = '900 '+Math.round(s*0.42)+'px Archivo, sans-serif';
    ctx.fillText('10', 0, s*0.02);
  }
}

function drawBallIcon(x,y,r){
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fill();
  ctx.strokeStyle = '#16263C'; ctx.lineWidth = Math.max(1, r*0.14);
  ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.stroke();
  ctx.fillStyle = '#16263C';
  ctx.beginPath();
  for (let i=0;i<5;i++){
    const a = -Math.PI/2 + i*Math.PI*2/5;
    const px = x+Math.cos(a)*r*0.42, py = y+Math.sin(a)*r*0.42;
    i ? ctx.lineTo(px,py) : ctx.moveTo(px,py);
  }
  ctx.closePath(); ctx.fill();
}

function drawBall(x,y){
  drawBallIcon(x, y, Math.min(cellW,rowH)*0.11);
}

function drawEnemy(e){
  const s = Math.min(cellW,rowH)*0.84*e.w;
  const x = laneX(e.lane);
  const wob = e.eating ? Math.sin((e.chew||0)*16)*s*0.05 : Math.sin(e.wob + S.now*5)*s*0.025;
  const y = yOf(e.y);
  ctx.save();
  if (e.hurt > 0) ctx.globalAlpha = 0.6;
  drawChipBase(x + wob, y, s, e.rage ? '#3D0F22' : '#2A0E16', e.boss ? '#FFC845' : '#E8D5D9');
  ctx.translate(x + wob, y);
  // camiseta rival
  ctx.fillStyle = e.color;
  roundRect(-s*0.36,-s*0.36,s*0.72,s*0.72,s*0.12); ctx.fill();
  // cara enojada simple
  ctx.fillStyle = '#FFE9E0';
  ctx.beginPath(); ctx.arc(-s*0.13,-s*0.07,s*0.07,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(s*0.13,-s*0.07,s*0.07,0,7); ctx.fill();
  ctx.fillStyle = '#20060B';
  ctx.beginPath(); ctx.arc(-s*0.13,-s*0.06,s*0.032,0,7); ctx.fill();
  ctx.beginPath(); ctx.arc(s*0.13,-s*0.06,s*0.032,0,7); ctx.fill();
  ctx.strokeStyle = '#FFE9E0'; ctx.lineWidth = Math.max(1.6, s*0.045);
  ctx.beginPath(); ctx.arc(0, s*0.26, s*0.13, Math.PI*1.15, Math.PI*1.85); ctx.stroke();
  // cejas
  ctx.beginPath();
  ctx.moveTo(-s*0.21,-s*0.2); ctx.lineTo(-s*0.06,-s*0.14);
  ctx.moveTo(s*0.21,-s*0.2); ctx.lineTo(s*0.06,-s*0.14);
  ctx.stroke();
  // distintivos
  if (e.type === 'bengala'){
    ctx.fillStyle = '#FF8A3D';
    ctx.beginPath();
    ctx.moveTo(s*0.3,-s*0.34); ctx.quadraticCurveTo(s*0.42,-s*0.16,s*0.3,-s*0.02);
    ctx.quadraticCurveTo(s*0.24,-s*0.16,s*0.3,-s*0.34);
    ctx.fill();
  } else if (e.type === 'capo'){
    ctx.fillStyle = '#1B0A0F';
    roundRect(-s*0.3,-s*0.5,s*0.6,s*0.14,s*0.05); ctx.fill();
  } else if (e.type === 'crack'){
    ctx.fillStyle = '#FFC845';
    ctx.font = '900 '+Math.round(s*0.3)+'px Archivo, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('9', 0, s*0.05);
  }
  if (e.stun > 0){
    ctx.fillStyle = '#FFC845';
    ctx.font = '900 '+Math.round(s*0.3)+'px Archivo, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✱', 0, -s*0.55);
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // barra de vida
  if (e.hp < e.maxHp){
    const w = s*0.8, hpw = clamp(e.hp/e.maxHp,0,1)*w;
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.fillRect(x-w/2, y - s/2 - 7, w, 4);
    ctx.fillStyle = '#FF5D5D';
    ctx.fillRect(x-w/2, y - s/2 - 7, hpw, 4);
  }
}

function drawGhostHints(){
  ctx.fillStyle = 'rgba(255,255,255,.07)';
  ctx.strokeStyle = 'rgba(255,200,69,.45)';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([5,5]);
  for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++){
    if (!S.grid[r][c]){
      roundRect(fieldX+c*cellW+3, r*rowH+3, cellW-6, rowH-6, 8);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
}
/* ================= UI: PANTALLAS ================= */
const SCREENS = ['menu','fig','dt','gesture','result','champ','pause','carnet'];
function setScreen(name){
  S.screen = name;
  for (const s of SCREENS){
    const el = $('#ovl-'+s);
    if (el) el.classList.toggle('on', s === name);
  }
  if (name === 'play'){
    for (const s of SCREENS){ const el = $('#ovl-'+s); if (el) el.classList.remove('on'); }
  }
}

let bannerTimer = null;
function showBanner(text, kind){
  const b = $('#banner');
  b.querySelector('.b-main').textContent = text;
  b.className = '';
  if (kind === 'bad') b.classList.add('bad');
  if (kind === 'tech') b.classList.add('tech');
  void b.offsetWidth; // reinicia animación
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(()=>b.classList.remove('show'), 2000);
}

let hintTimer = null;
function showHint(text, dur=4200){
  const h = $('#hint');
  h.textContent = text;
  h.classList.remove('off');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(()=>h.classList.add('off'), dur);
}

function renderGoles(){
  const g = $('#goles');
  g.innerHTML = '';
  for (let i=0;i<MAX_GOLES;i++){
    const d = document.createElement('div');
    d.className = 'gol-slot' + (i < S.goles ? ' lost' : '');
    g.appendChild(d);
  }
}

/* ================= UI: CARTAS ================= */
let cardEls = [];
function buildCardsUI(levelN){
  const wrap = $('#cards');
  wrap.innerHTML = '';
  cardEls = [];
  for (const def of CARDS){
    if (def.unlock > levelN) continue;
    const b = document.createElement('button');
    b.className = 'card' + (def.id === 'aonitek' ? ' aon' : '');
    const mini = document.createElement('canvas');
    mini.width = 92; mini.height = 92;
    b.appendChild(mini);
    const cost = document.createElement('div');
    cost.className = 'c-cost'; cost.textContent = def.cost;
    const nm = document.createElement('div');
    nm.className = 'c-name'; nm.textContent = def.name;
    const cd = document.createElement('div');
    cd.className = 'c-cd';
    b.appendChild(cost); b.appendChild(nm); b.appendChild(cd);
    drawCardMini(mini, def.id);
    b.addEventListener('pointerdown', ev => {
      ev.preventDefault();
      audioInit();
      if (!S.running || S.paused) return;
      if (cardCooldownLeft(def.id) > 0 || S.aliento < def.cost){
        b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
        SFX.click();
        return;
      }
      S.selCard = (S.selCard === def.id) ? null : def.id;
      refreshCardSel();
      SFX.click();
      if (S.selCard) showHint('Tocá una celda libre del campo', 2600);
    });
    wrap.appendChild(b);
    cardEls.push({ el:b, cdEl:cd, def });
  }
  refreshCardSel();
}

function drawCardMini(mini, id){
  const mc = mini.getContext('2d');
  const s = 78;
  mc.clearRect(0,0,92,92);
  setCtx(mc);   // las primitivas (roundRect, drawChipBase, drawRoleIcon) usan `ctx`
  try {
    drawChipBase(46, 48, s, id === 'aonitek' ? '#1A1340' : '#103258', '#F2F5FA');
    ctx.save(); ctx.translate(46,48);
    if (id === 'aonitek'){
      ctx.fillStyle = '#8A6CFF';
      ctx.beginPath(); ctx.arc(-s*0.3, s*0.26, 2.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(s*0.3, -s*0.26, 2.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 '+Math.round(s*0.5)+'px Archivo, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('A', 0, s*0.04);
    } else {
      ctx.fillStyle = '#EAF4FB';
      roundRect(-s*0.36,-s*0.36,s*0.72,s*0.72,s*0.12); ctx.fill();
      ctx.save();
      roundRect(-s*0.36,-s*0.36,s*0.72,s*0.72,s*0.12); ctx.clip();
      ctx.fillStyle = '#7CC4EF';
      for (let i=-3;i<=3;i+=2) ctx.fillRect(i*s*0.12 - s*0.06, -s*0.36, s*0.12, s*0.72);
      ctx.restore();
      drawRoleIcon(id, s);
    }
    ctx.restore();
  } finally {
    setCtx(null); // vuelve al canvas principal
  }
}

function cardCooldownLeft(id){
  const def = cardById(id);
  const last = S.cardCd[id];
  if (last === undefined) return 0;
  return Math.max(0, def.cd - (S.matchT - last));
}

function refreshCardSel(){
  for (const c of cardEls){
    c.el.classList.toggle('sel', S.selCard === c.def.id);
  }
}

function refreshCardsFrame(){
  for (const c of cardEls){
    const left = cardCooldownLeft(c.def.id);
    c.cdEl.style.height = left > 0 ? (left / c.def.cd * 100).toFixed(1) + '%' : '0%';
    c.el.classList.toggle('poor', S.aliento < c.def.cost);
  }
  $('#aliento').textContent = Math.floor(S.aliento);
  // reloj de partido (0' -> 90' -> 90'+)
  const lv = LEVELS[S.levelIdx];
  const min = Math.floor(clamp(S.matchT/lv.duration, 0, 1)*90);
  $('#clock').textContent = (S.matchT > lv.duration ? '90+\u2032' : min + '\u2032');
  // cábalas
  refreshCabalaBtn('mufa', CABALA_CFG.mufa.cd);
  refreshCabalaBtn('amuleto', CABALA_CFG.amuleto.cd);
}
function refreshCabalaBtn(key, cd){
  const btn = $(key === 'mufa' ? '#cb-mufa' : '#cb-amuleto');
  const left = Math.max(0, cd - (S.matchT - S.cabalaCd[key]));
  btn.classList.toggle('cooling', left > 0);
  btn.querySelector('.cb-cd').textContent = left > 0 ? Math.ceil(left) : '';
}

/* ================= COLOCACIÓN ================= */
cv.addEventListener('pointerdown', ev => {
  ev.preventDefault();
  audioInit();
  if (!S.running || S.paused || !S.selCard) return;
  const rect = cv.getBoundingClientRect();
  const cell = cellFromPoint(ev.clientX - rect.left, ev.clientY - rect.top);
  if (!cell) return;
  placeUnit(S.selCard, cell.r, cell.c);
}, { passive:false });

function placeUnit(id, r, c){
  const def = cardById(id);
  if (S.grid[r][c]){ showHint('Esa celda ya está ocupada', 1800); return; }
  if (S.aliento < def.cost){ showHint('Te falta Aliento de la hinchada', 1800); return; }
  if (cardCooldownLeft(id) > 0) return;
  if (id === 'aonitek' && laneHasModule(c)){
    showHint('Ya hay un Módulo IA en ese carril (máx. 1)', 2200);
    return;
  }
  S.aliento -= def.cost;
  S.cardCd[id] = S.matchT;
  S.grid[r][c] = {
    id, hp:def.hp, maxHp:def.hp, t:0,
    genT:0, shootT: def.shoot ? def.shoot.rate*0.7 : 0,
    gen:def.gen || null, shoot:def.shoot || null, module:def.module || null,
    kick:0,
  };
  recPlace(id);
  if (id === 'aonitek') showBanner('CARRIL AUTOMATIZADO', 'tech');
  S.selCard = null;
  refreshCardSel();
  SFX.place();
}

/* ================= CÁBALAS (gestos) ================= */
const CABALA_CFG = {
  mufa:    { cd:45, window:6 },
  amuleto: { cd:60, window:6 },
};
const gcv = $('#gcv');
const gctx = gcv.getContext('2d');
let G = null; // estado del gesto activo

function gestureCanvasSize(){
  const r = gcv.getBoundingClientRect();
  gcv.width = Math.round(r.width*DPR); gcv.height = Math.round(r.height*DPR);
  gctx.setTransform(DPR,0,0,DPR,0,0);
}

function startCabala(key){
  if (!S.running || S.paused || S.screen === 'gesture') return;
  const cfg = CABALA_CFG[key];
  if (S.matchT - S.cabalaCd[key] < cfg.cd) return;
  audioInit();
  S.timeScale = 0.12;
  G = {
    key, t:0, window:cfg.window,
    strokes:[], cur:null,
    rubDist:0, rubTarget: Math.max(900, Math.min(window.innerWidth, 520)*2.6),
    done:false,
  };
  $('#g-instr').textContent = key === 'mufa' ? 'DIBUJÁ LA ✕' : 'FROTÁ EL AMULETO';
  $('#g-sub').textContent = key === 'mufa'
    ? 'Dos trazos en cruz sobre la pantalla'
    : 'Deslizá el dedo rápido, sin soltar fuerte la fe';
  $('#amuleto-wrap').classList.toggle('on', key === 'amuleto');
  updateAmuletoRing(0);
  setScreen('gesture');
  requestAnimationFrame(gestureCanvasSize);
}

function endCabala(success){
  if (!G || G.done) return;
  G.done = true;
  const key = G.key;
  S.timeScale = 1;
  setScreen('play');
  gctx.clearRect(0,0,gcv.width,gcv.height);
  if (success){
    recCabala(true);
    S.cabalaCd[key] = S.matchT;
    S.flashT = S.reducedMotion ? 0 : 0.5;
    SFX.cabala();
    if (key === 'mufa'){
      for (const e of S.enemies){ e.hp -= 130; e.stun = Math.max(e.stun, 1.6); e.hurt = 0.2; }
      showBanner('¡MUFA ANULADA!', 'gold');
    } else {
      S.frenzyT = 10;
      showBanner('¡AMULETO ACTIVADO!', 'gold');
      showHint('Frenesí: disparo y Aliento al doble por 10 segundos', 3200);
    }
  } else {
    recCabala(false);
    // fallo amable: deja solo 8s de cooldown
    S.cabalaCd[key] = S.matchT - (CABALA_CFG[key].cd - 8);
    showBanner('SE CORTÓ LA CÁBALA…', 'bad');
  }
  G = null;
}

function gesturePos(ev){
  const r = gcv.getBoundingClientRect();
  return { x: ev.clientX - r.left, y: ev.clientY - r.top };
}

gcv.addEventListener('pointerdown', ev => {
  if (!G) return;
  ev.preventDefault();
  gcv.setPointerCapture(ev.pointerId);
  const p = gesturePos(ev);
  G.cur = [p];
}, { passive:false });

gcv.addEventListener('pointermove', ev => {
  if (!G || !G.cur) return;
  ev.preventDefault();
  const p = gesturePos(ev);
  const last = G.cur[G.cur.length-1];
  const d = Math.hypot(p.x-last.x, p.y-last.y);
  if (d < 2) return;
  G.cur.push(p);
  if (G.key === 'amuleto'){
    G.rubDist += d;
    updateAmuletoRing(G.rubDist / G.rubTarget);
    if (G.rubDist >= G.rubTarget) endCabala(true);
  }
}, { passive:false });

function finishStroke(){
  if (!G || !G.cur) return;
  const st = G.cur; G.cur = null;
  if (G.key !== 'mufa') return;
  if (st.length < 2) return;
  const a = st[0], b = st[st.length-1];
  const dx = b.x-a.x, dy = b.y-a.y;
  const len = Math.hypot(dx,dy);
  if (len < 60) return;
  G.strokes.push({ slope: Math.sign(dx*dy) || 1, len });
  // éxito: dos trazos con pendientes opuestas, o tres trazos largos (criterio generoso)
  if (G.strokes.length >= 2){
    const s1 = G.strokes[G.strokes.length-2], s2 = G.strokes[G.strokes.length-1];
    if (s1.slope !== s2.slope || G.strokes.length >= 3) endCabala(true);
  }
}
gcv.addEventListener('pointerup', ev => { ev.preventDefault(); finishStroke(); }, { passive:false });
gcv.addEventListener('pointercancel', () => { finishStroke(); });

function updateAmuletoRing(p){
  const ring = $('#amuleto-ring');
  const C = 364.4;
  ring.style.strokeDashoffset = (C*(1-clamp(p,0,1))).toFixed(1);
}

function gestureFrame(dt){
  if (!G) return;
  G.t += dt;
  $('#g-timer').textContent = Math.max(0, G.window - G.t).toFixed(1) + ' s';
  if (G.t >= G.window){ endCabala(false); return; }
  // dibuja trazo actual
  gctx.clearRect(0,0,gcv.width/DPR,gcv.height/DPR);
  if (G.key === 'mufa' && G.cur && G.cur.length > 1){
    gctx.strokeStyle = '#FFC845';
    gctx.lineWidth = 7; gctx.lineCap = 'round'; gctx.lineJoin = 'round';
    gctx.shadowColor = 'rgba(255,200,69,.7)'; gctx.shadowBlur = 14;
    gctx.beginPath();
    gctx.moveTo(G.cur[0].x, G.cur[0].y);
    for (const p of G.cur) gctx.lineTo(p.x, p.y);
    gctx.stroke();
    gctx.shadowBlur = 0;
  }
}

$('#cb-mufa').addEventListener('click', () => startCabala('mufa'));
$('#cb-amuleto').addEventListener('click', () => startCabala('amuleto'));

/* ================= PANTALLAS: MENÚ / DT / RESULTADO ================= */
$('#menu-led-txt').textContent = (LED_MSGS.join('  ·  ') + '  ·  ').repeat(2);

$('#btn-play').addEventListener('click', () => {
  resetRunStats();
  audioInit(); SFX.click();
  openDT(0);
});

function openDT(idx){
  const lv = LEVELS[idx];
  S.levelIdx = idx;
  $('#dt-eyebrow').textContent = 'Charla técnica · Partido ' + lv.n + ' de ' + LEVELS.length;
  $('#dt-title').textContent = lv.title;
  $('#dt-tip').textContent = lv.tip;
  $('#dt-brand').textContent = lv.brand;
  $('#dt-new').textContent = lv.unlocks;
  $('#chat-fab').classList.remove('on');
  closeChat();
  setScreen('dt');
}
$('#btn-kickoff').addEventListener('click', () => {
  audioInit(); SFX.click();
  startLevel(S.levelIdx);
});

function showResult(won){
  const lv = LEVELS[S.levelIdx];
  $('#res-eyebrow').textContent = 'Mundial 2026 · ' + lv.label;
  if (won){
    $('#res-title').textContent = lv.n === 1 ? '¡PASASTE DE FASE!' : '¡A LA FINAL!';
    $('#res-title').style.color = 'var(--gold)';
    $('#res-score').textContent = 'Aguantaste los 90 con ' + (MAX_GOLES - S.goles) + ' de aguante de sobra';
    $('#res-sub').textContent = lv.n === 1
      ? 'La cábala viene funcionando. No toques nada y pasá a la semi.'
      : 'Una más y la copa es tuya. Ni se te ocurra cambiar de medias.';
  } else {
    $('#res-title').textContent = 'TE EMPATARON EN EL 93\u2032';
    $('#res-title').style.color = 'var(--danger)';
    $('#res-score').textContent = 'El rival metió ' + S.goles + ' goles';
    $('#res-sub').textContent = 'Tocaste algo, seguro. Revancha: más Hinchadas temprano y guardá las cábalas para las oleadas.';
  }
  const acts = $('#res-actions');
  acts.innerHTML = '';
  const mk = (txt, cls, fn) => {
    const b = document.createElement('button');
    b.className = 'btn ' + cls; b.textContent = txt;
    b.addEventListener('click', () => { SFX.click(); fn(); });
    acts.appendChild(b);
  };
  if (won){
    mk('Siguiente partido', 'btn-gold', () => openDT(S.levelIdx+1));
  } else {
    mk('Revancha', 'btn-gold', () => openDT(S.levelIdx));
    mk('Mi carnet de Cabulero 🪪', 'btn-ghost', () => openCarnet('result'));
    const oc = outcomeInfo();
    const a = document.createElement('a');
    a.className = 'btn btn-aon'; a.textContent = oc.ctaText;
    a.href = oc.ctaUrl; a.target = '_blank'; a.rel = 'noopener';
    acts.appendChild(a);
  }
  mk('Salir al menú', 'btn-ghost', quitToMenu);
  setScreen('result');
}

function showChampion(){
  $('#btn-cta').href = utmUrl(AONITEK_SERVICES, 'campeon');
  const brag = '🏆 Salí CAMPEÓN DEL MUNDO en "Cabuleros" con ' + fmtPts(statsTotals().pts)
    + ' puntos. ¿Me superás? A ver si aguantás la final sin tocar nada: ' + utmUrl(PROMO_URL, 'campeon_brag');
  $('#btn-brag').href = 'https://wa.me/?text=' + encodeURIComponent(brag);
  setScreen('champ');
}
$('#btn-champ-menu').addEventListener('click', quitToMenu);

/* ================= PAUSA ================= */
function pauseGame(){
  if (!S.running || S.paused || S.screen === 'gesture') return;
  S.paused = true;
  setScreen('pause');
}
$('#btn-pause').addEventListener('click', () => { audioInit(); SFX.click(); pauseGame(); });
$('#btn-resume').addEventListener('click', () => {
  SFX.click(); S.paused = false; setScreen('play');
});
$('#btn-restart').addEventListener('click', () => { SFX.click(); startLevel(S.levelIdx); });
$('#btn-quit').addEventListener('click', () => { SFX.click(); quitToMenu(); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden){
    if (S.screen === 'gesture') endCabala(false);
    pauseGame();
  }
});

/* mute */
$('#btn-mute').addEventListener('click', () => {
  audioInit();
  S.muted = !S.muted;
  $('#ico-snd').style.opacity = S.muted ? 0.35 : 1;
  if (!S.muted) SFX.click();
});

/* ================= FIGURITA / COMPARTIR ================= */
const figCv = $('#fig-cv');
function drawFigurita(){
  const fc = figCv.getContext('2d');
  fc.clearRect(0,0,176,176);
  setCtx(fc);
  try {
    drawChipBase(88, 92, 150, '#103258', '#FFE08A');
    ctx.save(); ctx.translate(88,92);
    const s = 150;
    ctx.fillStyle = '#EAF4FB';
    roundRect(-s*0.36,-s*0.36,s*0.72,s*0.72,s*0.12); ctx.fill();
    ctx.save();
    roundRect(-s*0.36,-s*0.36,s*0.72,s*0.72,s*0.12); ctx.clip();
    ctx.fillStyle = '#7CC4EF';
    for (let i=-3;i<=3;i+=2) ctx.fillRect(i*s*0.12 - s*0.06, -s*0.36, s*0.12, s*0.72);
    ctx.restore();
    // amuleto al pecho
    ctx.fillStyle = '#FFC845';
    ctx.beginPath(); ctx.arc(0, 0, s*0.16, 0, 7); ctx.fill();
    ctx.fillStyle = '#103258';
    ctx.beginPath(); ctx.arc(0, 0, s*0.09, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(0, 0, s*0.04, 0, 7); ctx.fill();
    ctx.restore();
  } finally {
    setCtx(null);
  }
}

function defaultCabalaText(){ return 'Uso las medias al revés'; }
function currentCabalaText(){
  const v = $('#cabala-input').value.trim();
  return v || defaultCabalaText();
}
function refreshFig(){
  $('#fig-text').textContent = '"' + currentCabalaText() + '"';
  const msg = '🧿 Mi cábala para el Mundial 2026: "' + currentCabalaText()
    + '". La sellé en mi figurita de "Cabuleros", el juego de Aonitek. Conseguí la tuya: ' + GAME_URL;
  $('#btn-wsp').href = 'https://wa.me/?text=' + encodeURIComponent(msg);
}
$('#cabala-input').addEventListener('input', refreshFig);

$('#btn-fig').addEventListener('click', () => {
  audioInit(); SFX.click();
  drawFigurita(); refreshFig();
  setScreen('fig');
});
$('#btn-fig-back').addEventListener('click', () => { SFX.click(); setScreen('menu'); });

function grantShareBonus(){
  if (S.shareBonus) return;
  S.shareBonus = true;
  $('#bono-note').textContent = '¡Bono activado! +20% de Aliento en todos tus partidos 🧿';
  SFX.cabala();
}
$('#btn-wsp').addEventListener('click', grantShareBonus);

/* ================= STATS DE PARTIDA + CARNET DE CABULERO ================= */
function resetRunStats(){
  S.stats = { byLevel:{}, levelReached:1, champion:false };
}
function ensureStats(){
  if (!S.stats) resetRunStats();
  return S.stats;
}
function resetLevelBucket(n){
  ensureStats().byLevel[n] = { pts:0, kills:0, placed:{}, cabOk:0, cabFail:0, bonus:0 };
  if (n > S.stats.levelReached) S.stats.levelReached = n;
}
function curBucket(){
  const n = LEVELS[S.levelIdx].n;
  const st = ensureStats();
  if (!st.byLevel[n]) resetLevelBucket(n);
  return st.byLevel[n];
}
function recKill(e){
  const b = curBucket();
  b.kills++;
  b.pts += (e.score || 1) * 100;
}
function recPlace(id){
  const b = curBucket();
  b.placed[id] = (b.placed[id] || 0) + 1;
}
function recCabala(ok){
  const b = curBucket();
  if (ok){ b.cabOk++; b.pts += 150; } else { b.cabFail++; }
}
function recLevelEnd(won){
  const lv = LEVELS[S.levelIdx];
  const b = curBucket();
  if (won){
    b.bonus += (MAX_GOLES - S.goles) * 200 + lv.n * 500;
    if (S.levelIdx === LEVELS.length - 1) ensureStats().champion = true;
  }
}
function statsTotals(){
  const st = ensureStats();
  const t = { pts:0, kills:0, cabOk:0, cabFail:0, placed:{} };
  for (const n in st.byLevel){
    const b = st.byLevel[n];
    t.pts += b.pts + b.bonus;
    t.kills += b.kills;
    t.cabOk += b.cabOk;
    t.cabFail += b.cabFail;
    for (const id in b.placed) t.placed[id] = (t.placed[id] || 0) + b.placed[id];
  }
  return t;
}
const fmtPts = n => Math.round(n).toLocaleString('es-AR');

function computeEstilo(t){
  const p = t.placed;
  const h = p.hinchada || 0, atk = (p.delantero || 0) + (p.enganche || 0);
  const mur = p.defensor || 0, aon = p.aonitek || 0;
  const total = h + atk + mur + aon;
  if (total === 0) return ['DEBUTANTE', 'Entró a la cancha y la rompió igual'];
  if (aon >= 3) return ['EL AUTOMATIZADOR', 'Planta IA y deja que el equipo gane solo'];
  if (t.cabOk >= 4) return ['CABULERO SERIAL', 'No deja ritual sin hacer. Y le funciona.'];
  if (mur >= atk && mur >= h) return ['CATENACCIO PURO', 'Primero el cero, después la gloria'];
  if (atk >= h) return ['OFENSIVA TOTAL', 'La mejor defensa es un pelotazo'];
  return ['ESTRATEGA DEL ALIENTO', 'Hace cantar a la tribuna y gana después'];
}

function outcomeInfo(){
  const st = ensureStats();
  if (st.champion) return {
    key:'campeon', label:'CAMPEÓN DEL MUNDO', color:'#FFC845',
    ctaUrl: utmUrl(AONITEK_SERVICES, 'campeon'),
    ctaText:'Quiero mi diagnóstico de IA gratis',
  };
  if (st.levelReached >= 3) return {
    key:'finalista', label:'FINALISTA', color:'#FFC845',
    ctaUrl: utmUrl(AONITEK_SERVICES, 'finalista'),
    ctaText:'Quiero mi diagnóstico de IA gratis',
  };
  if (st.levelReached === 2) return {
    key:'semifinal', label:'SEMIFINALISTA', color:'#EAF4FB',
    ctaUrl: utmUrl(AONITEK_SERVICES, 'semifinal'),
    ctaText:'Tus rivales ya usan IA. Conocé Aonitek',
  };
  return {
    key:'grupos', label:'FASE DE GRUPOS', color:'#EAF4FB',
    ctaUrl: utmUrl(AONITEK_URL + '/', 'grupos'),
    ctaText:'Aonitek te da revancha: IA real, sin cábalas',
  };
}

/* ---------- Carnet: render ---------- */
const carnetCv = $('#carnet-cv');
let carnetApodo = '';
function carnetData(){
  const t = statsTotals();
  const est = computeEstilo(t);
  const cab = ($('#cabala-input').value || '').trim();
  return {
    apodo: (carnetApodo || 'EL CABULERO').toUpperCase(),
    outcome: outcomeInfo(),
    pts: t.pts, kills: t.kills, cabOk: t.cabOk,
    estilo: est[0], estiloSub: est[1],
    cabala: cab,
  };
}
function drawCarnet(){
  if (!carnetCv) return;
  const d = carnetData();
  const cc = carnetCv.getContext('2d');
  const W2 = carnetCv.width, H2 = carnetCv.height;
  setCtx(cc);
  try {
    /* fondo */
    ctx.clearRect(0,0,W2,H2);
    ctx.fillStyle = '#0A1626';
    ctx.fillRect(0,0,W2,H2);
    /* franjas celestes de fondo, sutiles */
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#7CC4EF';
    for (let x = -100; x < W2 + 100; x += 220) {
      ctx.save(); ctx.translate(x, 0); ctx.rotate(-0.12);
      ctx.fillRect(0, -200, 90, H2 + 400); ctx.restore();
    }
    ctx.restore();
    /* marco credencial */
    ctx.strokeStyle = '#FFC845'; ctx.lineWidth = 10;
    roundRect(24, 24, W2-48, H2-48, 42); ctx.stroke();
    /* banda superior dorada */
    ctx.save();
    roundRect(24, 24, W2-48, H2-48, 42); ctx.clip();
    const grad = ctx.createLinearGradient(0, 24, 0, 188);
    grad.addColorStop(0, '#FFC845'); grad.addColorStop(1, '#E0A21E');
    ctx.fillStyle = grad;
    ctx.fillRect(24, 24, W2-48, 164);
    ctx.restore();
    /* título: dos líneas para evitar la superposición con "MUNDIAL 2026" */
    ctx.fillStyle = '#231903';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = '900 50px Archivo, sans-serif';
    ctx.fillText('CARNET DE CABULERO', 72, 100);
    ctx.font = '800 32px Archivo, sans-serif';
    ctx.globalAlpha = 0.7;
    ctx.fillText('MUNDIAL 2026', 72, 150);
    ctx.globalAlpha = 1;
    /* chip avatar */
    const chipX = 230, chipY = 420, chipS = 290;
    drawChipBase(chipX, chipY, chipS, '#103258', '#F2F5FA');
    ctx.save(); ctx.translate(chipX, chipY);
    const s = chipS;
    ctx.fillStyle = '#EAF4FB';
    roundRect(-s*0.36,-s*0.36,s*0.72,s*0.72,s*0.12); ctx.fill();
    ctx.save();
    roundRect(-s*0.36,-s*0.36,s*0.72,s*0.72,s*0.12); ctx.clip();
    ctx.fillStyle = '#7CC4EF';
    for (let i=-3;i<=3;i+=2) ctx.fillRect(i*s*0.12 - s*0.06, -s*0.36, s*0.12, s*0.72);
    ctx.restore();
    ctx.fillStyle = '#FFC845';
    ctx.beginPath(); ctx.arc(0, 0, s*0.16, 0, 7); ctx.fill();
    ctx.fillStyle = '#103258';
    ctx.beginPath(); ctx.arc(0, 0, s*0.09, 0, 7); ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.beginPath(); ctx.arc(0, 0, s*0.04, 0, 7); ctx.fill();
    ctx.restore();
    /* apodo + estilo */
    const txX = 430;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#9FB0C6';
    ctx.font = '800 28px Archivo, sans-serif';
    ctx.fillText('JUGADOR/A', txX, 330);
    ctx.fillStyle = '#FFC845';
    let apFont = 76;
    ctx.font = '900 ' + apFont + 'px Archivo, sans-serif';
    while (ctx.measureText(d.apodo).width > W2 - txX - 80 && apFont > 40){
      apFont -= 4; ctx.font = '900 ' + apFont + 'px Archivo, sans-serif';
    }
    ctx.fillText(d.apodo, txX, 415);
    ctx.fillStyle = '#EAF4FB';
    ctx.font = '900 40px Archivo, sans-serif';
    ctx.fillText(d.estilo, txX, 490);
    ctx.fillStyle = '#9FB0C6';
    ctx.font = '600 30px Archivo, sans-serif';
    ctx.fillText(d.estiloSub, txX, 538);
    /* resultado */
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9FB0C6';
    ctx.font = '800 28px Archivo, sans-serif';
    ctx.fillText('— RESULTADO DE LA COPA —', W2/2, 660);
    ctx.fillStyle = d.outcome.color;
    let ocFont = 84;
    ctx.font = '900 ' + ocFont + 'px Archivo, sans-serif';
    while (ctx.measureText(d.outcome.label).width > W2 - 140 && ocFont > 48){
      ocFont -= 4; ctx.font = '900 ' + ocFont + 'px Archivo, sans-serif';
    }
    ctx.fillText(d.outcome.label, W2/2, 760);
    /* stats: 3 cajas */
    const boxes = [
      [fmtPts(d.pts), 'PUNTOS'],
      [String(d.kills), 'RIVALES FRENADOS'],
      [String(d.cabOk), 'CÁBALAS USADAS'],
    ];
    const bw = 296, bh = 170, gap = 26;
    const x0 = (W2 - (bw*3 + gap*2)) / 2;
    boxes.forEach((bx, i) => {
      const x = x0 + i*(bw+gap), y = 830;
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      roundRect(x, y, bw, bh, 26); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2.5;
      roundRect(x, y, bw, bh, 26); ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 58px Archivo, sans-serif';
      ctx.fillText(bx[0], x + bw/2, y + 86);
      ctx.fillStyle = '#9FB0C6';
      ctx.font = '800 22px Archivo, sans-serif';
      ctx.fillText(bx[1], x + bw/2, y + 134);
    });
    /* cábala sellada */
    if (d.cabala){
      ctx.fillStyle = '#FFC845';
      ctx.font = 'italic 600 34px Archivo, sans-serif';
      let cab = '\u201C' + d.cabala + '\u201D';
      while (ctx.measureText(cab).width > W2 - 160 && cab.length > 8){
        cab = cab.slice(0, -2) + '\u2026\u201D';
      }
      ctx.fillText(cab, W2/2, 1085);
      ctx.fillStyle = '#9FB0C6';
      ctx.font = '700 24px Archivo, sans-serif';
      ctx.fillText('CÁBALA SELLADA', W2/2, 1128);
    }
    /* footer: línea divisoria */
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(24, 1170, W2-48, 2);

    /* desafío: ¿ME SUPERÁS? + puntaje, para que el reto quede en la propia imagen */
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#FFC845';
    let chalFont = 54;
    const chalTxt = '¿ME SUPERÁS? · ' + fmtPts(d.pts) + ' PTS';
    ctx.font = '900 ' + chalFont + 'px Archivo, sans-serif';
    while (ctx.measureText(chalTxt).width > W2 - 100 && chalFont > 32){
      chalFont -= 4; ctx.font = '900 ' + chalFont + 'px Archivo, sans-serif';
    }
    ctx.fillText(chalTxt, W2/2, 1248);

    /* mensaje de negocio, personalizado según el resultado */
    const footerMsg = d.outcome.key === 'campeon'
      ? '¿Tu negocio también puede salir campeón? → IA real, sin humo'
      : 'A tu negocio no le pasaría esto con Aonitek 🧿';
    ctx.fillStyle = '#9FB0C6';
    ctx.font = '700 32px Archivo, sans-serif';
    const msgWords = footerMsg.split(' ');
    const msgLines = [];
    let msgCur = '';
    for (const w of msgWords){
      const test = msgCur ? msgCur + ' ' + w : w;
      if (ctx.measureText(test).width > W2 - 160 && msgCur){
        msgLines.push(msgCur); msgCur = w;
      } else { msgCur = test; }
    }
    if (msgCur) msgLines.push(msgCur);
    let msgY = 1310;
    for (const line of msgLines){
      ctx.fillText(line, W2/2, msgY);
      msgY += 42;
    }

    /* botón / pill de marca */
    const pillTxt = 'Hecho por Aonitek.com';
    ctx.font = '900 38px Archivo, sans-serif';
    const pillPad = 48;
    const pillW = Math.min(W2 - 96, ctx.measureText(pillTxt).width + pillPad*2);
    const pillH = 76;
    const pillX = (W2 - pillW)/2;
    const pillY = msgY + 24;
    ctx.fillStyle = '#8A6CFF';
    roundRect(pillX, pillY, pillW, pillH, pillH/2); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(pillTxt, W2/2, pillY + pillH/2 + 2);
    ctx.textBaseline = 'alphabetic';
  } finally {
    setCtx(null);
  }
}

/* ---------- Carnet: navegación ---------- */
let carnetBack = 'menu';
let carnetRAF = 0;
function openCarnet(from){
  audioInit(); SFX.click();
  carnetBack = from || 'menu';
  drawCarnet();
  setScreen('carnet');
}
$('#carnet-apodo').addEventListener('input', ev => {
  carnetApodo = ev.target.value.trim().replace(/\s+/g, ' ').slice(0, 16);
  cancelAnimationFrame(carnetRAF);
  carnetRAF = requestAnimationFrame(drawCarnet);
});
$('#btn-carnet-back').addEventListener('click', () => { SFX.click(); setScreen(carnetBack); });
$('#btn-champ-carnet').addEventListener('click', () => openCarnet('champ'));

/* ---------- Carnet: compartir / guardar ---------- */
function buildCarnetText(){
  const d = carnetData();
  return '🪪⚽ Mi carnet de Cabulero: ' + d.apodo + ' · ' + d.outcome.label
    + ' · ' + fmtPts(d.pts) + ' puntos. ¿Me superás? Jugá: ' + utmUrl(PROMO_URL, 'carnet');
}
$('#btn-carnet-share').addEventListener('click', async () => {
  audioInit(); SFX.click();
  drawCarnet();
  const text = buildCarnetText();
  let file = null;
  try {
    const blob = await new Promise(res => carnetCv.toBlob(res, 'image/png'));
    if (blob) file = new File([blob], 'carnet-cabulero.png', { type:'image/png' });
  } catch(e){ /* canvas bloqueado: seguimos con texto */ }
  if (file && navigator.canShare && navigator.canShare({ files:[file] })){
    try {
      await navigator.share({ files:[file], text });
      grantShareBonus();
      return;
    } catch(e){
      if (e && e.name === 'AbortError') return;
    }
  }
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  grantShareBonus();
});
$('#btn-carnet-save').addEventListener('click', () => {
  audioInit(); SFX.click();
  drawCarnet();
  let url = '';
  try { url = carnetCv.toDataURL('image/png'); } catch(e){ return; }
  const canDownload = ('download' in document.createElement('a'))
    && !/iP(hone|ad|od)/.test(navigator.userAgent);
  if (canDownload){
    const a = document.createElement('a');
    a.href = url; a.download = 'carnet-cabulero.png';
    document.body.appendChild(a); a.click(); a.remove();
    const btn = $('#btn-carnet-save');
    const prev = btn.textContent;
    btn.textContent = 'Guardado ✓';
    setTimeout(() => { btn.textContent = prev; }, 2000);
  } else {
    $('#carnet-img').src = url;
    $('#carnet-saver').classList.add('on');
  }
});
$('#btn-saver-close').addEventListener('click', () => {
  $('#carnet-saver').classList.remove('on');
});
/* ================= CHAT "ATENCIÓN AL SOCIO" ================= */
let socioClaimed = false;
const chatPanel = $('#chat-panel');
function pushMsg(txt, who){
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  d.textContent = txt;
  $('#chat-msgs').appendChild(d);
  $('#chat-msgs').scrollTop = 1e6;
}
function setReplies(list){
  const w = $('#chat-replies');
  w.innerHTML = '';
  for (const [label, fn] of list){
    const b = document.createElement('button');
    b.className = 'qr'; b.textContent = label;
    b.addEventListener('click', () => { pushMsg(label, 'me'); setTimeout(fn, 380); });
    w.appendChild(b);
  }
}
function chatHome(){
  setReplies([
    ['¿Qué es Aonitek?', () => {
      pushMsg('Aonitek es una plataforma para crear agentes de IA que atienden, agendan turnos y venden por vos, 24/7. Este chat es una mini demo: imaginate esto mismo respondiéndole a TUS clientes mientras dormís.', 'bot');
      chatHome();
    }],
    ['Dame un consejo táctico', () => {
      pushMsg(pick(DT_RANDOM_TIPS), 'bot');
      chatHome();
    }],
    ['Reclamar regalo 🎁', () => {
      if (socioClaimed){
        pushMsg('El regalo ya fue, socio. Pero la cábala no se discute: andá a ganar.', 'bot');
      } else {
        socioClaimed = true;
        S.socioBonus = 75;
        pushMsg('Listo: +75 de Aliento inicial para tu próximo partido. Acreditado al instante, como un buen agente automatizado. 🧿', 'bot');
      }
      chatHome();
    }],
  ]);
}
function openChat(){
  audioInit(); SFX.click();
  chatPanel.classList.add('on');
  if (!$('#chat-msgs').children.length){
    pushMsg('¡Hola, socio! Soy el agente de Aonitek: atención al socio 24/7, sin vacaciones ni feriados. ¿En qué te doy una mano?', 'bot');
    chatHome();
  }
}
function closeChat(){ chatPanel.classList.remove('on'); }
$('#chat-fab').addEventListener('click', openChat);
$('#chat-close').addEventListener('click', closeChat);

/* ================= LOOP PRINCIPAL ================= */
let lastT = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  let dt = (now - lastT)/1000;
  lastT = now;
  if (dt > 0.1) dt = 0.1;           // tab vuelta del fondo: sin saltos
  S.now = now/1000;

  if (S.screen === 'gesture') gestureFrame(dt);

  if (S.running && !S.paused && S.screen !== 'gesture'){
    update(dt * S.timeScale);
  } else if (S.running && S.screen === 'gesture'){
    update(dt * S.timeScale);       // cámara lenta durante la cábala
  }

  if (S.running || S.screen === 'pause'){
    render(dt);
    refreshCardsFrame();
  }
}
requestAnimationFrame(frame);
resize();