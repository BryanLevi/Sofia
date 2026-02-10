// La granja de contar (Vanilla JS)
// Pantallas: menú, gallina, caballo, vaca
(() => {
  const $ = (sel) => document.querySelector(sel);

  // Screens
  const screens = {
    menu: $("#screenMenu"),
    gallina: $("#screenGallina"),
    caballo: $("#screenCaballo"),
    vaca: $("#screenVaca"),
  };

  // Topbar
  const btnHome = $("#btnHome");
  const btnRepeat = $("#btnRepeat");
  const btnSound = $("#btnSound");
  const btnSettings = null; // Ajustes eliminados
  const topTitle = $("#topTitle");

  // (Se eliminó el modal de configuración)

  // Toast
  const toastEl = $("#toast");

  // Ambient background FX
  const bgfxEl = $("#bgfx");

  // VFX canvas 
  const vfxCanvas = $("#vfxCanvas");
  let vfxCtx = null;
  let vfxDpr = 1;
  let vfxParticles = [];
  let vfxRaf = null;

  // Buttons menu
  const goGallina = $("#goGallina");
  const goCaballo = $("#goCaballo");
  const goVaca = $("#goVaca");

  // Full-screen feedback
  const feedbackOverlay = $("#feedbackOverlay");
  const feedbackCard = $("#feedbackCard");
  const feedbackText = $("#feedbackText");
  let feedbackTimer = null;

  // Background Music
  const bgMusic = $("#bgMusic");
  let musicStarted = false;

  

  function tryStartMusic() {
    if (!bgMusic || !soundOn) return;
    bgMusic.volume = 0.22;
    try {
      const p = bgMusic.play();
      if (p && typeof p.then === "function") {
        p.then(() => { musicStarted = true; }).catch((e) => {
          // Si el navegador bloquea autoplay, dejamos musicStarted=false para reintentar con un toque.
          console.log("Music play prevented:", e);
        });
      } else {
        // Navegadores que no devuelven Promise
        musicStarted = true;
      }
    } catch (e) {
      console.log("Music play error:", e);
    }
  }
// Animal FX (animaciones)
  function fxPulse(el, cls, ms = 900) {
    if (!el) return;
    el.classList.remove("fx-ask", "fx-celebrate", "fx-sad");
    // reflow para reiniciar animación
    void el.offsetWidth;
    el.classList.add(cls);
    window.setTimeout(() => el.classList.remove(cls), ms);
  }

  function fxAsk(el) { fxPulse(el, "fx-ask", 900); }
  function fxCelebrate(el) { fxPulse(el, "fx-celebrate", 1100); }
  function fxSad(el) { fxPulse(el, "fx-sad", 700); }

  // refs a animalitos
  const gallinaGif = document.querySelector("#screenGallina .pet__gif");
  const vacaGif = document.querySelector("#screenVaca .pet__gif");
  const caballoGif = $("#horseGif");


  // Sound
  let soundOn = true;
  let audioReady = false;
  let audioCtx = null;

  // SFX 
  let mooSfx = null;
  let gallinaSfx = null;
  let caballoSfx = null;

  // Global config 
  // Nota: por requisito del juego, el conteo máximo es 5.
  const cfg = {
    maxN: 5,
    gallinaOptions: 3,
    caballoCircles: 5
  };

  
  function showFeedback(kind) {
    // kind: "ok" | "bad"
    if (!feedbackOverlay || !feedbackCard || !feedbackText) return;

    const isOk = (kind === "ok");

    feedbackText.textContent = isOk ? "¡Correcto!" : "Incorrecto";
    feedbackCard.classList.remove("is-good", "is-bad");
    feedbackCard.classList.add(isOk ? "is-good" : "is-bad");
    feedbackOverlay.classList.add("is-on");
    feedbackOverlay.setAttribute("aria-hidden", "false");

    

    // SFX de error (aplica a todos los juegos)
    if (!isOk) { try { playWrongSfx(); } catch(e){} }
    // Voz solo para el juego del caballo cuando es incorrecto
    if (!isOk && currentScreen === "caballo") { try { speak("Incorrecto, vuelve a intentar"); } catch(e){} }
if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => {
      feedbackOverlay.classList.remove("is-on");
      feedbackOverlay.setAttribute("aria-hidden", "true");
    }, isOk ? 1600 : 1200);
  }


 
  function createConfetti(x, y) {
    if (!document.body) return; // Safety check
    
    const colors = ['#ff4fa3', '#13a44a', '#ffd700', '#00bfff', '#ff6b6b'];
    const particleCount = 15;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.style.position = 'fixed';
      particle.style.left = x + 'px';
      particle.style.top = y + 'px';
      particle.style.width = '8px';
      particle.style.height = '8px';
      particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      particle.style.borderRadius = '50%';
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '9999';
      
      document.body.appendChild(particle);
      
      const angle = (Math.random() * Math.PI * 2);
      const velocity = 50 + Math.random() * 100;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity;
      
      let posX = x;
      let posY = y;
      let velocityY = vy;
      const gravity = 500;
      const startTime = Date.now();
      
      function animate() {
        const elapsed = (Date.now() - startTime) / 1000;
        posX += vx * 0.016;
        velocityY += gravity * 0.016;
        posY += velocityY * 0.016;
        
        particle.style.left = posX + 'px';
        particle.style.top = posY + 'px';
        particle.style.opacity = Math.max(0, 1 - elapsed / 1);
        
        if (elapsed < 1) {
          requestAnimationFrame(animate);
        } else {
          // Safe removal
          try {
            if (particle && particle.parentNode) {
              document.body.removeChild(particle);
            }
          } catch (e) {
            console.log('Confetti cleanup error:', e);
          }
        }
      }
      
      requestAnimationFrame(animate);
    }
  }

  function showToast(text, ms = 900) {
    toastEl.textContent = text;
    toastEl.classList.add("is-on");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toastEl.classList.remove("is-on"), ms);
  }

  function setSoundIcon() {
    btnSound.textContent = soundOn ? "🔊" : "🔇";
  }

  // --- Canvas sparkles (lighter than DOM confetti) ---
  function vfxInit() {
    if (!vfxCanvas) return;
    try {
      vfxCtx = vfxCanvas.getContext('2d');
      vfxDpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      vfxResize();
      window.addEventListener('resize', vfxResize);
      vfxTick();
    } catch (e) {
      vfxCtx = null;
    }
  }

  function vfxResize() {
    if (!vfxCanvas || !vfxCtx) return;
    const w = Math.floor(window.innerWidth * vfxDpr);
    const h = Math.floor(window.innerHeight * vfxDpr);
    if (vfxCanvas.width !== w) vfxCanvas.width = w;
    if (vfxCanvas.height !== h) vfxCanvas.height = h;
  }

  function sparkBurst(x, y, count = 18) {
    if (!vfxCtx) return;
    const cx = x * vfxDpr;
    const cy = y * vfxDpr;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 240 + Math.random() * 340;
      vfxParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 520 + Math.random() * 380,
        born: performance.now(),
        r: 2 + Math.random() * 4,
      });
    }
  }

  function vfxTick() {
    if (!vfxCtx) return;
    const now = performance.now();
    const w = vfxCanvas.width, h = vfxCanvas.height;
    vfxCtx.clearRect(0, 0, w, h);

    if (vfxParticles.length) {
      vfxParticles = vfxParticles.filter(p => (now - p.born) < p.life);

      for (const p of vfxParticles) {
        const t = (now - p.born) / 1000;
        const k = 1 - ((now - p.born) / p.life);
        const g = 600;
        const x = p.x + p.vx * t;
        const y = p.y + p.vy * t + (g * t * t * 0.5);
        const alpha = Math.max(0, k);

        vfxCtx.globalAlpha = alpha;
        // glow
        vfxCtx.beginPath();
        vfxCtx.arc(x, y, p.r * 2.2, 0, Math.PI * 2);
        vfxCtx.fillStyle = 'rgba(255,255,255,0.35)';
        vfxCtx.fill();

        // core
        vfxCtx.beginPath();
        vfxCtx.arc(x, y, p.r, 0, Math.PI * 2);
        vfxCtx.fillStyle = 'rgba(255,79,163,0.55)';
        vfxCtx.fill();
      }
      vfxCtx.globalAlpha = 1;
    }

    vfxRaf = requestAnimationFrame(vfxTick);
  }

  function burstFromElement(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    createConfetti(x, y);
    sparkBurst(x, y, 20);
  }

  // Ripple micro interaction for all buttons
  function addRipple(e) {
    const el = e.currentTarget;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const r = document.createElement('span');
    r.className = 'ripple';
    r.style.width = r.style.height = size + 'px';
    const x = (e.clientX ?? (rect.left + rect.width/2)) - rect.left - size / 2;
    const y = (e.clientY ?? (rect.top + rect.height/2)) - rect.top - size / 2;
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    el.appendChild(r);
    setTimeout(() => r.remove(), 700);
  }

  function setupCardTilt(el) {
    if (!el) return;
    el.addEventListener('pointerenter', () => {
      el.classList.add('is-tilt');
    });
    el.addEventListener('pointermove', (e) => {
      if (!el.classList.contains('is-tilt')) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const ry = (px - 0.5) * 16;
      const rx = -(py - 0.5) * 12;
      el.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      el.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('is-tilt');
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
    });
  }

  // Parallax background (menu only)
  function updateParallax(clientX, clientY) {
    if (!bgfxEl) return;
    const nx = (clientX / window.innerWidth) - 0.5;
    const ny = (clientY / window.innerHeight) - 0.5;
    const mx = Math.max(-1, Math.min(1, nx)) * 22;
    const my = Math.max(-1, Math.min(1, ny)) * 18;
    bgfxEl.style.setProperty('--mx', mx.toFixed(1) + 'px');
    bgfxEl.style.setProperty('--my', my.toFixed(1) + 'px');
  }

  function ensureAudio() {
    if (audioReady) return true;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      // Some browsers start suspended until gesture; attempt resume.
      if (audioCtx.state === "suspended") audioCtx.resume();
      audioReady = true;
      // Preload del sonido real de la vaca (muu.mp3)
      if (!mooSfx) {
        mooSfx = new Audio("assets/sfx/muu.mp3");
        mooSfx.preload = "auto";
        mooSfx.volume = 1.0;
      }

      // Preload del sonido real de la gallina (gallina.mp3)
      if (!gallinaSfx) {
        gallinaSfx = new Audio("assets/sfx/gallina.mp3");
        gallinaSfx.preload = "auto";
        gallinaSfx.volume = 1.0;
      }
      // Preload del sonido real del caballo (caballo.mp3)
      if (!caballoSfx) {
        caballoSfx = new Audio("assets/sfx/caballo.mp3");
        caballoSfx.preload = "auto";
        caballoSfx.volume = 1.0;
      }
      return true;
    } catch (e) {
      audioReady = false;
      return false;
    }
  }

  function beep(freq = 660, dur = 0.08) {
    if (!soundOn) return;
    if (!ensureAudio()) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = freq;
    o.type = "sine";
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
  }


  function playWrongSfx() {
    if (!soundOn) return;
    if (!ensureAudio()) return;
    const now = audioCtx.currentTime;

    // Buzzer corto: tono descendente
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    o.type = "square";
    o.frequency.setValueAtTime(260, now);
    o.frequency.exponentialRampToValueAtTime(140, now + 0.22);

    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

    o.connect(g);
    g.connect(audioCtx.destination);

    o.start(now);
    o.stop(now + 0.28);
  }


  function playSuccessMelody() {
    if (!soundOn) return;
    if (!ensureAudio()) return;
    // Melodía alegre: Do-Mi-Sol
    const notes = [
      { freq: 523.25, time: 0, duration: 0.15 },    // Do
      { freq: 659.25, time: 0.15, duration: 0.15 }, // Mi
      { freq: 783.99, time: 0.3, duration: 0.25 }   // Sol
    ];
    
    notes.forEach(note => {
      setTimeout(() => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.frequency.value = note.freq;
        o.type = "sine";
        g.gain.setValueAtTime(0.08, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + note.duration);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start();
        o.stop(audioCtx.currentTime + note.duration);
      }, note.time * 1000);
    });
  }

  function playHorseSound() {
    if (!soundOn) return;
    if (!ensureAudio()) return;
    
    // Simular relincho de caballo con frecuencias variables
    const duration = 0.4;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    
    // Onda cuadrada para sonido más "animal"
    o.type = "sawtooth";
    
    // Frecuencia que varía (simula el relincho)
    o.frequency.setValueAtTime(400, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
    o.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.2);
    o.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.3);
    o.frequency.exponentialRampToValueAtTime(500, audioCtx.currentTime + duration);
    
    // Envolvente del volumen
    g.gain.setValueAtTime(0.15, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + 0.1);
    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + duration);
  }

  function playCowSound() {
    if (!soundOn) return;
    // Asegura contexto de audio (y pre-carga mooSfx)
    ensureAudio();

    // Preferir el sonido real del ZIP
    if (mooSfx) {
      try {
        mooSfx.pause();
        mooSfx.currentTime = 0;
        const p = mooSfx.play();
        if (p && typeof p.catch === 'function') {
          p.catch(() => playCowSoundSynth());
        }
        return;
      } catch (e) {
        // fallback abajo
      }
    }

    // Fallback: sintetizado
    playCowSoundSynth();
  }

  function playCowSoundSynth() {
    if (!ensureAudio()) return;

    // Simular "Muuu" de la vaca con frecuencias graves
    const duration = 0.6;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();

    // Onda cuadrada para sonido más profundo
    o.type = "square";

    // Frecuencia grave que simula "Muuu"
    o.frequency.setValueAtTime(150, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.2);
    o.frequency.exponentialRampToValueAtTime(160, audioCtx.currentTime + 0.4);
    o.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + duration);

    // Envolvente del volumen para "Muuu"
    g.gain.setValueAtTime(0.2, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.25, audioCtx.currentTime + 0.1);
    g.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.4);
    g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + duration);
  }



  // --- Voz (estilo "niño") con SpeechSynthesis ---
  // Algunos navegadores cargan las voces de forma asíncrona; por eso cacheamos.
  let CACHED_VOICES = [];
  if ("speechSynthesis" in window) {
    const updateVoices = () => { try { CACHED_VOICES = window.speechSynthesis.getVoices() || []; } catch (e) { CACHED_VOICES = []; } };
    updateVoices();
    // @ts-ignore
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }

  const ES_NUM = {
    0: "cero",
    1: "uno",
    2: "dos",
    3: "tres",
    4: "cuatro",
    5: "cinco",
    6: "seis",
    7: "siete",
    8: "ocho",
    9: "nueve",
    10:"diez"
  };

  function playGallinaSound() {
    if (!soundOn) return;
    // Asegura contexto y precarga
    ensureAudio();

    if (gallinaSfx) {
      try {
        gallinaSfx.pause();
        gallinaSfx.currentTime = 0;
        const p = gallinaSfx.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
        return;
      } catch (e) {}
    }
    // fallback suave
    beep(880, 0.08);
  }

  function playCaballoWinSound() {
    if (!soundOn) return;
    ensureAudio();

    if (caballoSfx) {
      try {
        caballoSfx.pause();
        caballoSfx.currentTime = 0;
        const p = caballoSfx.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
        return;
      } catch (e) {}
    }
    // fallback suave
    beep(520, 0.10);
  }


  function speak(text) {
    if (!soundOn) return;

    // SpeechSynthesis es opcional; si no está, fallback a beep.
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);

        const voices = (CACHED_VOICES && CACHED_VOICES.length)
          ? CACHED_VOICES
          : (window.speechSynthesis.getVoices() || []);

        const spanish = voices.filter(v => (v.lang || '').toLowerCase().startsWith('es'));

        const preferredLangOrder = ["es-mx", "es-us", "es-es", "es"];

        // Heurísticas para elegir una voz más "niño":
        // 1) Español (preferencia por MX)
        // 2) Masculina (si existe) y NO femenina
        // 3) Si no hay, cualquiera en español
        const femaleHints = [
          "sabina", "dalia", "helena", "laura", "monica", "mónica", "lucia", "lucía",
          "camila", "valentina", "maria", "maría", "carmen", "paulina", "ximena",
          "sofia", "sofía", "female", "woman", "mujer"
        ];
        const maleHints = [
          "male", "man", "hombre", "diego", "jorge", "carlos", "juan", "andres", "andrés",
          "pablo", "pedro", "miguel", "raul", "raúl", "jorge", "sergio", "alberto"
        ];
        const boyHints = ["boy", "kid", "child", "niño", "nino", "infant"];

        const scoreVoice = (v) => {
          let s = 0;
          const name = (v.name || '').toLowerCase();
          const lang = (v.lang || '').toLowerCase();

          const li = preferredLangOrder.indexOf(lang);
          if (li >= 0) s += (60 - li * 10);
          else if (lang.startsWith('es')) s += 30;

          // Preferir femenina
          femaleHints.forEach(h => { if (name.includes(h)) s += 25; });

          // Bonus si trae pistas de "niño"
          boyHints.forEach(h => { if (name.includes(h)) s += 20; });

          // Evitar masculina
          maleHints.forEach(h => { if (name.includes(h)) s -= 35; });

          // preferir voces "natural/online" si no contradicen lo anterior
          if (name.includes('natural') || name.includes('online')) s += 6;

          return s;
        };

        let selected = null;
        const pool = spanish.length ? spanish : voices;

        if (pool.length) {
          selected = pool.slice().sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
        }

        if (selected) {
          u.voice = selected;
          u.lang = selected.lang || 'es-MX';
        } else {
          u.lang = 'es-MX';
        }

        // Ajustes tipo "mujer dulce": ritmo calmado y tono cálido
        u.rate = 0.9;
        u.pitch = 1.15;
        u.volume = 1.0;

        window.speechSynthesis.speak(u);
        return;
      } catch (e) {
        // fallback abajo
      }
    }

    // fallback simple
    beep(660, 0.1);
  }

  function speakNumber(n) {
    const w = ES_NUM[n] || String(n);
    speak(w);
  }

  
  function pluralize(n, one, many) {
    return (Number(n) === 1) ? one : many;
  }

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // --- Generador de número objetivo SIN repeticiones seguidas ---
  // Usa un "bolsillo" (bag) 1..maxN mezclado: evita repetir el mismo número
  // en intentos consecutivos y reduce repeticiones "muy seguido".
  let _targetBag = [];
  let _targetBagIdx = 0;
  let _lastTarget = null;

  function _refillTargetBag() {
    const max = Math.max(1, Number(cfg.maxN) || 5);
    _targetBag = [];
    for (let i = 1; i <= max; i++) _targetBag.push(i);
    shuffle(_targetBag);

    // Evitar que el primer número del nuevo ciclo sea igual al último del ciclo anterior
    if (_lastTarget != null && _targetBag.length > 1 && _targetBag[0] === _lastTarget) {
      const swapIdx = 1 + randInt(0, _targetBag.length - 2);
      [_targetBag[0], _targetBag[swapIdx]] = [_targetBag[swapIdx], _targetBag[0]];
    }

    _targetBagIdx = 0;
  }

  function nextTargetNumber() {
    const max = Math.max(1, Number(cfg.maxN) || 5);
    if (_targetBag.length !== max || _targetBagIdx >= _targetBag.length) {
      _refillTargetBag();
    }
    const n = _targetBag[_targetBagIdx++];
    _lastTarget = n;
    return n;
  }

  function setActiveScreen(key) {
    // Tema (colores armoniosos por animal)
    // - Gallina: dorado
    // - Caballo: café
    // - Vaca: verde
    document.body.classList.remove("theme-gallina", "theme-caballo", "theme-vaca");
    if (key === "gallina") document.body.classList.add("theme-gallina");
    if (key === "caballo") document.body.classList.add("theme-caballo");
    if (key === "vaca") document.body.classList.add("theme-vaca");

    Object.values(screens).forEach(s => s.classList.remove("is-active", "animate-in"));
    screens[key].classList.add("is-active", "animate-in");
    const animMs = (key === "menu") ? 900 : 480;
    window.setTimeout(() => screens[key].classList.remove("animate-in"), animMs);
    currentScreen = key;

    // Control de música de fondo (en TODO el juego)
    if (bgMusic) {
      if (soundOn) {
        // Intentar iniciar (o reanudar) música.
        // Si el navegador bloquea autoplay, se reintentará con el primer toque.
        tryStartMusic();
      } else {
        bgMusic.pause();
      }
    }
// Top title
    // En el MENÚ ya existe el título grande "LA GRANJA", así evitamos que se encime.
    const titles = {
      menu: "",
      gallina: "Gallina",
      caballo: "Caballo",
      vaca: "Vaca"
    };
    topTitle.textContent = titles[key] ?? "";

    // Home button enabled only outside menu
    btnHome.disabled = (key === "menu");
  }

  // ---------- GALLINA ----------
  const gallinaPrompt = $("#gallinaPrompt");
  const gallinaTargetNum = $("#gallinaTargetNum");
  const gallinaDots = $("#gallinaDots");
  const gallinaBaskets = $("#gallinaBaskets");
  const gallinaSignNum = $("#gallinaSignNum");
  const gallinaNext = $("#gallinaNext");

  let gallinaN = 1;
  let gallinaSolved = false;

  function renderDots(container, n) {
    container.innerHTML = "";
    for (let i = 1; i <= n; i++) {
      const d = document.createElement("div");
      d.className = "dot is-on";
      container.appendChild(d);
    }
  }

  function apples(n) {
    const wrap = document.createElement("div");
    wrap.className = "apples";
    for (let i = 0; i < n; i++) {
      const img = document.createElement("img");
      img.className = "apple";
      img.src = "assets/img/huevo.png";
      img.alt = "Huevo";
      img.draggable = false;
      wrap.appendChild(img);
    }
    return wrap;
  }

  function gallinaGenerateOptions(n, k) {
    // Create k options containing n and other close numbers, unique and within 1..cfg.maxN
    const options = new Set([n]);
    while (options.size < k) {
      const delta = [ -2,-1,1,2,3,-3 ][randInt(0,5)];
      let v = n + delta;
      if (v < 1) v = 1;
      if (v > cfg.maxN) v = cfg.maxN;
      options.add(v);
    }
    return shuffle(Array.from(options));
  }

  function gallinaStart() {
    gallinaSolved = false;
    gallinaNext.disabled = true;

    // Número objetivo sin repeticiones seguidas
    gallinaN = nextTargetNumber();
    if (gallinaTargetNum) gallinaTargetNum.textContent = String(gallinaN);
    if (gallinaDots) renderDots(gallinaDots, gallinaN);

    if (gallinaSignNum) gallinaSignNum.textContent = String(gallinaN);
    gallinaPrompt.innerHTML = `¿En qué canasta hay <b>${gallinaN}</b> ${pluralize(gallinaN, "huevo", "huevos")}?`;
    fxAsk(gallinaGif);
    speak(`¿En qué canasta hay ${ES_NUM[gallinaN] || gallinaN} ${pluralize(gallinaN, "huevo", "huevos")}?`);

    const k = cfg.gallinaOptions;
    // Adjust grid columns when k=2
    gallinaBaskets.style.gridTemplateColumns = (k === 2) ? "repeat(2, 1fr)" : "repeat(3, 1fr)";

    const opts = gallinaGenerateOptions(gallinaN, k);
    gallinaBaskets.innerHTML = "";
    opts.forEach(v => {
      const btn = document.createElement("button");
      btn.className = "basket";
      btn.setAttribute("aria-label", `Canasta con ${v} ${pluralize(v, "huevo", "huevos")}`);
      btn.appendChild(apples(v));
      const label = document.createElement("div");
      label.className = "basket__label";
      label.textContent = "🧺";
      btn.appendChild(label);
      btn.addEventListener("click", () => {
        if (gallinaSolved) return;
        // lock after correct; if wrong, show hint but allow retry
        if (v === gallinaN) {
          gallinaSolved = true;
          btn.classList.add("is-correct");
          showFeedback("ok");
          playGallinaSound();
          fxCelebrate(gallinaGif);
          try {
            const r = gallinaGif?.getBoundingClientRect?.();
            if (r) createConfetti(r.left + r.width/2, r.top + r.height/2);
          } catch(e) {}
          playSuccessMelody();
          speak(`¡Correcto! ${ES_NUM[gallinaN] || gallinaN}`);
          gallinaNext.disabled = false;
          
          // Confetti effect
          const rect = btn.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          createConfetti(centerX, centerY);
          
          // lock all
          Array.from(gallinaBaskets.children).forEach(b => b.classList.add("is-locked"));
        } else {
          btn.classList.add("is-wrong");
          // (Sin letrero de incorrecto: solo voz)
          beep(220, 0.08);
          showFeedback("bad");
          fxSad(gallinaGif);
          speak("Incorrecto vuelve a intentar");
          // highlight correct briefly
          const correctBtn = Array.from(gallinaBaskets.children).find(b => {
            return b.getAttribute("aria-label") === `Canasta con ${gallinaN} ${pluralize(gallinaN, "huevo", "huevos")}`;
          });
          if (correctBtn) correctBtn.classList.add("is-correct");
          window.setTimeout(() => {
            btn.classList.remove("is-wrong");
            if (correctBtn && !gallinaSolved) correctBtn.classList.remove("is-correct");
          }, 650);
        }
      });
      gallinaBaskets.appendChild(btn);
    });
  }

  gallinaNext.addEventListener("click", () => gallinaStart());

  // ---------- CABALLO ----------
  const caballoPrompt = $("#caballoPrompt");
  const caballoTargetNum = $("#caballoTargetNum");
  const fencesEl = $("#fences");
  const horseEl = $("#horseGif");
  const caballoProgress = $("#caballoProgress");
  const caballoCircles = $("#caballoCircles");
  const btnSaltar = $("#btnSaltar");
  const btnComprobar = $("#btnComprobar");
  const caballoNext = $("#caballoNext");

  let caballoN = 0;
  let caballoSelected = false;
  let jumps = 0;
  let animLock = false;
  let circlesAnim = null; // animación del track (se mueve todo el grupo)

  function stopCirclesAnim() {
    if (!circlesAnim) return;
    try { circlesAnim.cancel(); } catch (e) {}
    circlesAnim = null;
  }

  function startCirclesAnim(track) {
    stopCirclesAnim();
    if (!track || !caballoCircles) return;

    // Esperar a que el DOM pinte para medir bien anchos
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const cRect = caballoCircles.getBoundingClientRect();
        const tRect = track.getBoundingClientRect();
        const cw = cRect.width || caballoCircles.clientWidth || 0;
        const tw = tRect.width || track.scrollWidth || 0;
        const off = (cw / 2) + (tw / 2) + 48; // margen extra para salir completo

        // Iniciar fuera a la derecha y cruzar hasta salir por la izquierda.
        track.style.transform = `translateX(${off}px)`;
        circlesAnim = track.animate(
          [
            { transform: `translateX(${off}px)` },
            { transform: `translateX(${-off}px)` }
          ],
          {
            duration: 9000,
            iterations: Infinity,
            easing: 'linear'
          }
        );

        // Pausa al pasar el mouse (opcional) para facilitar el clic
        track.addEventListener('pointerenter', () => { try { circlesAnim && circlesAnim.pause(); } catch(e){} });
        track.addEventListener('pointerleave', () => { try { circlesAnim && !caballoSelected && circlesAnim.play(); } catch(e){} });
      });
    });
  }

  function buildFences() {
    fencesEl.innerHTML = "";
    const maxFences = 10;
    for (let i = 0; i < maxFences; i++) {
      const f = document.createElement("img");
      f.className = "fence";
      f.src = "assets/img/vaya.png";
      f.alt = "Valla";
      f.draggable = false;
      fencesEl.appendChild(f);
    }
  }

  let horsePositions = null;
      let horseStartLeft = 10;
  try { horseStartLeft = parseFloat(getComputedStyle(horseEl).left) || 10; } catch(e) {}

  function computeHorsePositions() {
    horsePositions = null;
    const lane = horseEl && horseEl.parentElement;
    if (!lane) return;

    const laneRect = lane.getBoundingClientRect();
    const horseRect = horseEl.getBoundingClientRect();
    const horseW = horseRect.width || 56;

    const baseLeft = (horseStartLeft != null ? horseStartLeft : 10);
    const positions = [baseLeft];

    const fenceEls = Array.from(fencesEl.querySelectorAll('.fence'));
    if (fenceEls.length === 0) {
      horsePositions = positions;
      return;
    }

    // Medir el gap real entre vallas (fallback si no se puede medir)
    let gapPx = 65;
    if (fenceEls.length >= 2) {
      const r0 = fenceEls[0].getBoundingClientRect();
      const r1 = fenceEls[1].getBoundingClientRect();
      const g = r1.left - r0.right;
      if (isFinite(g) && g > 0) gapPx = g;
    }
    gapPx = Math.max(30, gapPx);

    // Posición: centro del hueco justo después de cada valla
    fenceEls.forEach((f) => {
      const r = f.getBoundingClientRect();
      const afterFence = (r.right - laneRect.left) + gapPx / 2 - horseW / 2;
      positions.push(Math.max(0, afterFence));
    });

    horsePositions = positions;
  }

  function setHorsePos(step) {
    if (!horsePositions) computeHorsePositions();
    const maxIdx = horsePositions ? horsePositions.length - 1 : step;
    const idx = Math.min(step, maxIdx);
    const x = (horsePositions && horsePositions[idx] != null) ? horsePositions[idx] : 10;
    horseEl.style.left = `${x}px`;
  }


  
  function clearTargetFence() {
    try {
      Array.from(fencesEl.querySelectorAll('.fence')).forEach(f => f.classList.remove('is-target'));
    } catch(e) {}
    if (finishFlagEl) finishFlagEl.classList.remove('is-on');
  }

  function showFinishFlag(targetSteps) {
        if (!finishFlagEl || !fencesEl) return;
    if (!targetSteps || targetSteps < 1) return;

    const fences = Array.from(fencesEl.querySelectorAll('.fence'));
    const targetFence = fences[targetSteps - 1];
    if (!targetFence) return;

    targetFence.classList.add('is-target');

    requestAnimationFrame(() => {
      const lane = targetFence.closest('.track__lane') || (horseEl && horseEl.parentElement);
      if (!lane) return;
      const laneRect = lane.getBoundingClientRect();
      const fr = targetFence.getBoundingClientRect();
      const x = (fr.left - laneRect.left) + (fr.width / 2);
      finishFlagEl.style.left = `${x}px`;
      finishFlagEl.classList.add('is-on');
    });
  }

function caballoStart() {
    buildFences();
    caballoSelected = false;
    animLock = false;
    stopCirclesAnim();
    caballoN = 0;
    jumps = 0;
    btnSaltar.disabled = true;
    if (btnComprobar) btnComprobar.disabled = true;
        caballoNext.disabled = true;
    caballoTargetNum.textContent = "?";
    caballoPrompt.textContent = "Toca un círculo";
    caballoProgress.textContent = "0 / 0";
    horsePositions = null;

    // Reset inmediato al inicio (sin animación de regreso)
    horseEl.classList.remove("is-jumping");
    try {
      const prev = horseEl.style.transition;
      horseEl.style.transition = 'none';
      horseEl.style.left = `${horseStartLeft}px`;
      // Forzar reflow para aplicar el cambio sin transición
      void horseEl.offsetWidth;
      horseEl.style.transition = prev || '';
    } catch (e) {
      horseEl.style.left = `${horseStartLeft}px`;
    }

    requestAnimationFrame(() => setHorsePos(0));

    const cCount = cfg.caballoCircles;
    // En caballo, el número "random" ahora también evita repeticiones seguidas:
    // todos los círculos traen el mismo número oculto para que, sin importar cuál toque,
    // el intento use el mismo objetivo.
    const hiddenN = nextTargetNumber();
    const nums = Array.from({ length: cCount }, () => hiddenN);

    caballoCircles.innerHTML = "";
    
    // Crear un contenedor para el track de círculos
    const track = document.createElement("div");
    track.className = "circles-track";
    
    // Función para crear un círculo
    const createCircle = (n, idx) => {
      const b = document.createElement("button");
      b.className = "circle";
      b.textContent = "●"; // hidden
      b.setAttribute("aria-label", "Círculo con número oculto");
      b.addEventListener("click", () => {
        if (caballoSelected) return;
        caballoSelected = true;
        caballoN = n;
        caballoTargetNum.textContent = String(caballoN);
        caballoPrompt.innerHTML = `Ahora salta <b>${caballoN}</b> ${pluralize(caballoN, "valla", "vallas")}`;
        fxAsk(caballoGif);
    speak(`Ahora salta ${ES_NUM[caballoN] || caballoN} ${pluralize(caballoN, "valla", "vallas")}`);

        // reveal and lock - detener la animación (pausa el grupo completo)
        try { circlesAnim && circlesAnim.pause(); } catch (e) {}
        b.textContent = String(n);
        b.classList.add("is-selected");
        Array.from(track.children).forEach((x) => x.classList.add("is-locked"));
        b.classList.remove("is-locked");
        btnSaltar.disabled = false;
        if (btnComprobar) btnComprobar.disabled = false;
                caballoNext.disabled = true;
        caballoProgress.textContent = `0 / ${caballoN}`;
              });
      return b;
    };
    
    // Crear círculos (una sola vez). La animación mueve el grupo completo.
    nums.forEach((n, idx) => track.appendChild(createCircle(n, idx)));
    caballoCircles.appendChild(track);

    // Arrancar animación del grupo (todos salen juntos y vuelven a entrar juntos)
    startCirclesAnim(track);
  }

  btnSaltar.addEventListener("click", () => {
    if (!caballoSelected || animLock) return;

    const maxJumps = Array.from(fencesEl.querySelectorAll(".fence")).length;
    if (jumps >= maxJumps) return;

    animLock = true;
    jumps += 1;

    // Jump animation 
    horseEl.classList.remove("is-jumping");
    void horseEl.offsetWidth;
    horseEl.classList.add("is-jumping");

    setHorsePos(jumps);
    playHorseSound();
    speakNumber(jumps);

    caballoProgress.textContent = `${jumps} / ${caballoN}`;

    window.setTimeout(() => {
      horseEl.classList.remove("is-jumping");
      animLock = false;

      // Si ya no hay más vallas, solo queda comprobar
      if (jumps >= maxJumps) {
        btnSaltar.disabled = true;
        showToast("Ya no hay más vallas. ¡Comprueba!");
        try { speak("Ya no hay más vallas. Comprueba."); } catch(e) {}
      }
    }, 340);
  });


        


  if (btnComprobar) {
    btnComprobar.addEventListener("click", () => {
      if (!caballoSelected || animLock) return;

      if (jumps === caballoN) {
        // ✅ Correcto: saltó exactamente la cantidad indicada
        playCaballoWinSound();
        playSuccessMelody();
        showFeedback("ok");
        fxCelebrate(caballoGif);
        speak("¡Muy bien!");

        try {
          const r = horseEl.getBoundingClientRect();
          const x = r.left + r.width/2;
          const y = r.top + r.height/2;
          createConfetti(x, y);
          sparkBurst(x, y, 26);
        } catch(e) {}

        btnSaltar.disabled = true;
        btnComprobar.disabled = true;
        caballoNext.disabled = false;
        return;
      }

      // ❌ Incorrecto (el SFX lo maneja showFeedback)
      showFeedback("bad");
      fxSad(caballoGif);

      if (jumps < caballoN) {
        // Sin pistas: solo mostrar "Incorrecto" y dejar seguir saltando
        btnSaltar.disabled = false;
        return;
      }

      // Se pasó: reiniciar intento con el MISMO número
      jumps = 0;
      caballoProgress.textContent = `0 / ${caballoN}`;

      // Volver al inicio sin animación
      horseEl.classList.remove("is-jumping");
      try {
        const prev = horseEl.style.transition;
        horseEl.style.transition = 'none';
        horseEl.style.left = `${horseStartLeft}px`;
        void horseEl.offsetWidth;
        horseEl.style.transition = prev || '';
      } catch (e) {
        horseEl.style.left = `${horseStartLeft}px`;
      }
      requestAnimationFrame(() => setHorsePos(0));
      btnSaltar.disabled = false;
    });
  }

caballoNext.addEventListener("click", () => caballoStart());

  // ---------- VACA ----------
  const vacaPrompt = $("#vacaPrompt");
  const vacaTargetNum = $("#vacaTargetNum");
  const vacaDots = $("#vacaDots");
  const vacaField = $("#vacaField");
  const vacaProgressDots = $("#vacaProgressDots");
  const vacaNext = $("#vacaNext");

  let vacaN = 1;
  let eaten = 0;
  let vacaLock = false;

  function renderProgressDots(container, total, current) {
    container.innerHTML = "";
    for (let i = 1; i <= total; i++) {
      const d = document.createElement("div");
      d.className = "pdot" + (i <= current ? " is-on" : "");
      container.appendChild(d);
    }
  }

  function vacaStart() {
    vacaLock = false;
    eaten = 0;
    vacaNext.disabled = true;

    // Número objetivo sin repeticiones seguidas
    vacaN = nextTargetNumber();
    vacaTargetNum.textContent = String(vacaN);
    renderDots(vacaDots, vacaN);
    renderProgressDots(vacaProgressDots, vacaN, eaten);

    vacaPrompt.innerHTML = `Dame <b>${vacaN}</b> pastitos`;
    fxAsk(vacaGif);
    speak(`Dame ${ES_NUM[vacaN] || vacaN} pastitos`);

    // build field
    const grassCount = 10;
    vacaField.innerHTML = "";
    
    for (let i = 0; i < grassCount; i++) {
      const g = document.createElement("div");
      g.className = "grass";
      g.setAttribute("aria-label", "Pastito");

      let dragging = false;
      let moved = false;
      let pid = null;
      let offsetX = 0;
      let offsetY = 0;
      let startX = 0;
      let startY = 0;

      const reset = () => {
        g.classList.remove("is-dragging");
        g.style.position = '';
        g.style.left = '';
        g.style.top = '';
        g.style.zIndex = '';
        g.style.width = '';
        g.style.height = '';
        g.style.margin = '';
        dragging = false;
        moved = false;
        pid = null;
      };

      const isOverCow = () => {
        const cow = document.querySelector('#screenVaca .pet__gif');
        if (!cow) return false;
        const cowRect = cow.getBoundingClientRect();
        const gRect = g.getBoundingClientRect();
        return !(gRect.right < cowRect.left ||
                 gRect.left > cowRect.right ||
                 gRect.bottom < cowRect.top ||
                 gRect.top > cowRect.bottom);
      };

      g.addEventListener('pointerdown', (e) => {
        if (vacaLock) return;
        if (g.classList.contains('is-eaten')) return;

        ensureAudio();
        dragging = true;
        moved = false;
        pid = e.pointerId;

        try { g.setPointerCapture(pid); } catch (err) {}

        const rect = g.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        g.classList.add('is-dragging');
        g.style.position = 'fixed';
        g.style.left = rect.left + 'px';
        g.style.top = rect.top + 'px';
        g.style.width = rect.width + 'px';
        g.style.height = rect.height + 'px';
        g.style.margin = '0';
        g.style.zIndex = '9999';

        e.preventDefault();
        e.stopPropagation();
      });

      g.addEventListener('pointermove', (e) => {
        if (!dragging || e.pointerId !== pid) return;
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        if (dx > 6 || dy > 6) moved = true;

        g.style.left = (e.clientX - offsetX) + 'px';
        g.style.top = (e.clientY - offsetY) + 'px';

        e.preventDefault();
        e.stopPropagation();
      });

      g.addEventListener('pointerup', (e) => {
        if (!dragging || e.pointerId !== pid) return;

        try { g.releasePointerCapture(pid); } catch (err) {}

        
        if (!moved) {
          reset();
          feedCow(g);
          return;
        }

        if (isOverCow()) {
          feedCow(g);
        }

        reset();

        e.preventDefault();
        e.stopPropagation();
      });

      g.addEventListener('pointercancel', () => reset());

      vacaField.appendChild(g);
    }
  }
  
  function feedCow(grassElement) {
    if (vacaLock) return;
    if (grassElement.classList.contains("is-eaten")) return;
    
    grassElement.classList.add("is-eaten");
    grassElement.style.transform = '';
    eaten += 1;
    
    playCowSound(); // Muuu!
    speakNumber(eaten);
    renderProgressDots(vacaProgressDots, vacaN, eaten);

    if (eaten >= vacaN) {
      vacaLock = true;
      playSuccessMelody();
      showFeedback("ok");
      fxCelebrate(vacaGif);
      try {
        const r = vacaGif?.getBoundingClientRect?.();
        if (r) sparkBurst(r.left + r.width/2, r.top + r.height/2, 22);
      } catch(e) {}
      speak("¡Muy bien!");
      // VFX
      try {
        const cow = document.querySelector("#screenVaca .pet__gif");
        const r = (cow ? cow.getBoundingClientRect() : vacaField.getBoundingClientRect());
        const x = r.left + r.width/2;
        const y = r.top + r.height/2;
        createConfetti(x, y);
        sparkBurst(x, y, 26);
      } catch(e) {}
      vacaNext.disabled = false;
      // lock remaining
      Array.from(vacaField.children).forEach(btn => btn.classList.add("is-eaten"));
    }
  }

  vacaNext.addEventListener("click", () => vacaStart());

  // ---------- Navigation & Repeat ----------
  let currentScreen = "menu";
const repeatHandlers = {
    menu: () => speak("Elige un juego"),
    gallina: () => speak(`¿En qué canasta hay ${ES_NUM[gallinaN] || gallinaN} ${pluralize(gallinaN, "huevo", "huevos")}?`),
    caballo: () => {
      if (!caballoSelected) speak("Toca un círculo");
      else speak(`Salta ${ES_NUM[caballoN] || caballoN} ${pluralize(caballoN, "valla", "vallas")} y luego presiona comprobar`);
    },
    vaca: () => speak(`Dame ${ES_NUM[vacaN] || vacaN} pastitos`),
  };

  function startGame(key) {
    // ensure audio on first tap (web requirement)
    ensureAudio();
    setActiveScreen(key);
    if (key === "gallina") gallinaStart();
    if (key === "caballo") caballoStart();
    if (key === "vaca") vacaStart();
  }

  goGallina.addEventListener("click", () => { burstFromElement(goGallina); window.setTimeout(() => startGame("gallina"), 160); });
  goCaballo.addEventListener("click", () => { burstFromElement(goCaballo); window.setTimeout(() => startGame("caballo"), 160); });
  goVaca.addEventListener("click", () => { burstFromElement(goVaca); window.setTimeout(() => startGame("vaca"), 160); });

  btnHome.addEventListener("click", () => {
    setActiveScreen("menu");
  tryStartMusic();
  // Voz al entrar (si está disponible). Si el navegador lo bloquea, se reintentará con el primer toque.
  const ensureIntroVoice = () => {
    try {
      if (!soundOn) return;
      if (!("speechSynthesis" in window)) return;
      const ss = window.speechSynthesis;
      if (ss.speaking || ss.pending) return;
      speak("Elige un juego");
    } catch(e) {}
  };
  setTimeout(ensureIntroVoice, 180);

    speak("Elige un juego");
  });

  btnRepeat.addEventListener("click", () => {
    ensureAudio();
    (repeatHandlers[currentScreen] || repeatHandlers.menu)();
  });

  btnSound.addEventListener("click", () => {
    soundOn = !soundOn;
    setSoundIcon();
    showToast(soundOn ? "Sonido activado" : "Sonido apagado");
    if (soundOn) {
      ensureAudio();
      // Reactivar música (menú y juegos)
      if (bgMusic) {
        bgMusic.volume = 0.22;
        bgMusic.play().catch(e => console.log('Music play prevented:', e));
      }
    } else {
      // Pausar música si se desactiva el sonido
      if (bgMusic) {
        bgMusic.pause();
      }
    }
  });


  // First load
  vfxInit();

  // Ripple for all buttons
  document.querySelectorAll("button").forEach(b => {
    b.addEventListener("pointerdown", addRipple, { passive: true });
  });

  // Menu: 3D tilt
  [goGallina, goCaballo, goVaca].forEach(setupCardTilt);

  // Parallax (solo menú)
  updateParallax(window.innerWidth / 2, window.innerHeight / 2);
  document.addEventListener('pointermove', (e) => {
    if (currentScreen === 'menu') updateParallax(e.clientX, e.clientY);
  }, { passive: true });

  setSoundIcon();
  setActiveScreen("menu");
  tryStartMusic();
  // Voz al entrar (si está disponible). Si el navegador lo bloquea, se reintentará con el primer toque.
  const ensureIntroVoice = () => {
    try {
      if (!soundOn) return;
      if (!("speechSynthesis" in window)) return;
      const ss = window.speechSynthesis;
      if (ss.speaking || ss.pending) return;
      speak("Elige un juego");
    } catch(e) {}
  };
  setTimeout(ensureIntroVoice, 180);

  
  // Load voices for speech synthesis - MEJORADO
  if ('speechSynthesis' in window) {
    let voicesLoaded = false;
    
    const loadVoices = () => {
      if (voicesLoaded) return;
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        voicesLoaded = true;
        console.log('✓ Voces cargadas:', voices.length);
        voices.forEach((voice, i) => {
          if (voice.lang.includes('es') || voice.lang.includes('ES') || voice.lang.includes('MX')) {
            console.log(`  ${i}: ${voice.name} (${voice.lang})`);
          }
        });
      }
    };
    
    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Try to load voices immediately
    loadVoices();
    
    // Fallback: try again after a delay
    setTimeout(loadVoices, 100);
    setTimeout(loadVoices, 500);
  }

  // (Se quitó el toast inicial de 'Toca para empezar')

  // Any first interaction should prepare audio (helps iOS/Chrome policies)
  document.addEventListener("pointerdown", () => {
    if (!audioReady) ensureAudio();
    // Reintentar música y voz en el primer toque (políticas de autoplay)
    if (!musicStarted) tryStartMusic();
    try {
      if ("speechSynthesis" in window) {
        const ss = window.speechSynthesis;
        if (!ss.speaking && !ss.pending && currentScreen === "menu") {
          speak("Elige un juego");
        }
      }
    } catch(e) {}
  }, { passive: true });

})();