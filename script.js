(() => {
  const hero = document.getElementById('hero');
  const head = document.getElementById('robotHead');
  const layers = head ? [...head.querySelectorAll('.robot-head-frame')] : [];

  if (!hero || !head || layers.length < 4) return;

  const YAW_STOPS = [-20, -10, 0, 10, 20];
  const PITCH_STOPS = [-8, 0, 8];
  const MAX_YAW = 20;
  const MAX_PITCH = 8;
  const SPRITE_CHUNKS = [
    'assets/sprite-v2/robot-head.00.b64',
    'assets/sprite-v2/robot-head.01.b64',
    'assets/sprite-v2/robot-head.02.b64',
    'assets/sprite-v2/robot-head.03.b64',
    'assets/sprite-v2/robot-head.04.b64',
    'assets/sprite-v2/robot-head.05.b64',
    'assets/sprite-v2/robot-head.06.b64',
    'assets/sprite-v2/robot-head.07.b64',
    'assets/sprite-v2/robot-head.08.b64',
    'assets/sprite-v2/robot-head.09.b64',
    'assets/sprite-v2/robot-head.10.b64',
    'assets/sprite-v2/robot-head.11.b64',
    'assets/sprite-v2/robot-head.12.b64',
  ];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const state = {
    targetYaw: 0,
    targetPitch: 0,
    yaw: 0,
    pitch: 0,
    lastTime: performance.now(),
    lastInteraction: performance.now(),
    hasPointer: false,
    spriteUrl: '',
  };

  const loadSprite = async () => {
    const parts = await Promise.all(SPRITE_CHUNKS.map(async (url) => {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Sprite chunk ${response.status}: ${url}`);
      return response.text();
    }));

    const base64 = parts.join('').replace(/\s+/g, '');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

    state.spriteUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));

    const image = new Image();
    image.decoding = 'async';
    image.src = state.spriteUrl;
    await image.decode().catch(() => {});

    layers.forEach((layer) => {
      layer.style.backgroundImage = `url("${state.spriteUrl}")`;
    });
    head.classList.add('is-ready');
  };

  const findInterval = (value, stops) => {
    if (value <= stops[0]) return [0, 0, 0];
    if (value >= stops[stops.length - 1]) {
      const last = stops.length - 1;
      return [last, last, 0];
    }
    for (let i = 0; i < stops.length - 1; i += 1) {
      if (value >= stops[i] && value <= stops[i + 1]) {
        return [i, i + 1, (value - stops[i]) / (stops[i + 1] - stops[i])];
      }
    }
    return [2, 2, 0];
  };

  const frameWeights = (yaw, pitch) => {
    const [x0, x1, tx] = findInterval(yaw, YAW_STOPS);
    const [y0, y1, ty] = findInterval(pitch, PITCH_STOPS);
    const candidates = [
      [x0, y0, (1 - tx) * (1 - ty)],
      [x1, y0, tx * (1 - ty)],
      [x0, y1, (1 - tx) * ty],
      [x1, y1, tx * ty],
    ];
    const merged = new Map();

    for (const [col, pitchIndex, weight] of candidates) {
      if (weight <= 0.0005) continue;
      // Sprite rows: +8, 0, -8. Logical pitch stops: -8, 0, +8.
      const row = 2 - pitchIndex;
      const key = `${col}:${row}`;
      merged.set(key, { col, row, weight: (merged.get(key)?.weight || 0) + weight });
    }

    return [...merged.values()].sort((a, b) => b.weight - a.weight).slice(0, 4);
  };

  const applyFrame = (layer, frame) => {
    if (!frame) {
      layer.style.opacity = '0';
      return;
    }
    layer.style.backgroundPosition = `${frame.col * 25}% ${frame.row * 50}%`;
    layer.style.opacity = frame.weight.toFixed(4);
  };

  const render = () => {
    const frames = frameWeights(state.yaw, state.pitch);
    layers.forEach((layer, index) => applyFrame(layer, frames[index]));

    const nx = state.yaw / MAX_YAW;
    const ny = state.pitch / MAX_PITCH;
    hero.style.setProperty('--head-x', `${(nx * 5.5).toFixed(2)}px`);
    hero.style.setProperty('--head-y', `${(-ny * 3.5).toFixed(2)}px`);
    hero.style.setProperty('--glow-x', `${(nx * 16).toFixed(2)}px`);
    hero.style.setProperty('--glow-y', `${(-ny * 10).toFixed(2)}px`);
    hero.style.setProperty('--neck-shadow-x', `${(nx * -7).toFixed(2)}px`);
    hero.style.setProperty('--neck-shadow-y', `${(ny * 4).toFixed(2)}px`);
    hero.style.setProperty('--neck-shadow-opacity', `${(0.30 + Math.abs(nx) * 0.08 + Math.max(0, -ny) * 0.08).toFixed(3)}`);
  };

  const setTargetFromPoint = (clientX, clientY) => {
    const rect = hero.getBoundingClientRect();
    const nx = clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    const ny = clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
    state.targetYaw = nx * MAX_YAW;
    state.targetPitch = -ny * MAX_PITCH;
    state.lastInteraction = performance.now();
    state.hasPointer = true;
  };

  hero.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      setTargetFromPoint(event.clientX, event.clientY);
    }
  }, { passive: true });

  hero.addEventListener('pointerdown', (event) => {
    setTargetFromPoint(event.clientX, event.clientY);
    if (event.pointerType === 'touch') {
      window.setTimeout(() => { state.hasPointer = false; }, 850);
    }
  }, { passive: true });

  hero.addEventListener('pointerleave', () => {
    state.hasPointer = false;
    state.lastInteraction = performance.now();
  });

  window.addEventListener('pagehide', () => {
    if (state.spriteUrl) URL.revokeObjectURL(state.spriteUrl);
  }, { once: true });

  const start = async () => {
    try {
      await loadSprite();
    } catch (error) {
      console.error('Robot sprite failed to load', error);
      return;
    }

    if (reduceMotion.matches) {
      state.yaw = 0;
      state.pitch = 0;
      render();
      return;
    }

    const tick = (time) => {
      const dt = clamp((time - state.lastTime) / 1000, 0, .05);
      state.lastTime = time;
      const idleFor = time - state.lastInteraction;

      if (!state.hasPointer && idleFor > 1000) {
        const ampYaw = coarsePointer.matches ? 4.5 : 3.2;
        const ampPitch = coarsePointer.matches ? 1.8 : 1.2;
        state.targetYaw = Math.sin(time * 0.00034) * ampYaw;
        state.targetPitch = Math.sin(time * 0.00027 + 1.05) * ampPitch;
      }

      const damping = 1 - Math.exp(-dt * 7.8);
      state.yaw += (state.targetYaw - state.yaw) * damping;
      state.pitch += (state.targetPitch - state.pitch) * damping;
      render();
      requestAnimationFrame(tick);
    };

    render();
    requestAnimationFrame(tick);
  };

  start();
})();
