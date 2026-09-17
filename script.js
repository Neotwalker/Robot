(() => {
  const hero = document.getElementById('hero');
  const shell = document.getElementById('robotShell');
  const frameStack = document.getElementById('robotFrames');
  const loader = document.getElementById('robotLoader');
  const layers = frameStack ? [...frameStack.querySelectorAll('.robot-frame')] : [];

  if (!hero || !shell || !frameStack || layers.length < 2) return;

  const COLS = 3;
  const ROWS = 3;
  const CROSSFADE_MS = 105;
  const CHUNKS = Array.from(
    { length: 6 },
    (_, index) => `assets/video-frames/robot-frames.${String(index).padStart(2, '0')}.b64`,
  );
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const state = {
    targetX: 0,
    targetY: 0,
    x: 0,
    y: 0,
    frameKey: '',
    activeLayer: 0,
    hasPointer: false,
    lastInteraction: performance.now(),
    lastTime: performance.now(),
    spriteUrl: '',
  };

  const frameFor = (x, y) => {
    const col = clamp(Math.round(((x + 1) / 2) * (COLS - 1)), 0, COLS - 1);
    const row = clamp(Math.round(((y + 1) / 2) * (ROWS - 1)), 0, ROWS - 1);
    return { col, row, key: `${col}:${row}` };
  };

  const positionLayer = (layer, frame) => {
    layer.style.backgroundPosition = `${frame.col * 50}% ${frame.row * 50}%`;
  };

  const showFrame = (frame, immediate = false) => {
    if (!frame || frame.key === state.frameKey) return;

    if (!state.frameKey || immediate) {
      positionLayer(layers[0], frame);
      layers[0].style.opacity = '1';
      layers[1].style.opacity = '0';
      state.activeLayer = 0;
      state.frameKey = frame.key;
      return;
    }

    const previous = layers[state.activeLayer];
    const nextIndex = state.activeLayer === 0 ? 1 : 0;
    const next = layers[nextIndex];

    positionLayer(next, frame);
    next.style.transition = 'none';
    next.style.opacity = '0';
    next.getBoundingClientRect();
    next.style.transition = `opacity ${CROSSFADE_MS}ms linear`;
    previous.style.transition = `opacity ${CROSSFADE_MS}ms linear`;
    previous.style.opacity = '0';
    next.style.opacity = '1';

    state.activeLayer = nextIndex;
    state.frameKey = frame.key;
  };

  const loadSprite = async () => {
    const parts = await Promise.all(CHUNKS.map(async (url) => {
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`Frame atlas chunk failed: ${response.status} ${url}`);
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
      layer.style.transition = `opacity ${CROSSFADE_MS}ms linear`;
    });

    frameStack.classList.add('is-ready');
    loader?.classList.add('is-hidden');
    showFrame(frameFor(0, 0), true);
  };

  const setTarget = (clientX, clientY) => {
    const rect = shell.getBoundingClientRect();
    const centerX = rect.left + rect.width * .50;
    const centerY = rect.top + rect.height * .48;
    const rangeX = Math.max(window.innerWidth * .46, rect.width * .72);
    const rangeY = Math.max(window.innerHeight * .46, rect.height * .92);

    state.targetX = clamp((clientX - centerX) / rangeX, -1, 1);
    state.targetY = clamp((clientY - centerY) / rangeY, -1, 1);
    state.hasPointer = true;
    state.lastInteraction = performance.now();
  };

  const render = () => {
    showFrame(frameFor(state.x, state.y));
    hero.style.setProperty('--frame-x', `${(state.x * 5.5).toFixed(2)}px`);
    hero.style.setProperty('--frame-y', `${(state.y * 3.2).toFixed(2)}px`);
    hero.style.setProperty('--tilt-x', `${(-state.y * 1.05).toFixed(2)}deg`);
    hero.style.setProperty('--tilt-y', `${(state.x * 1.35).toFixed(2)}deg`);
  };

  hero.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
      setTarget(event.clientX, event.clientY);
    }
  }, { passive: true });

  hero.addEventListener('pointerdown', (event) => {
    setTarget(event.clientX, event.clientY);
    if (event.pointerType === 'touch') {
      window.setTimeout(() => { state.hasPointer = false; }, 900);
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
      console.error('New video frame atlas failed to load', error);
      loader?.classList.add('is-error');
      return;
    }

    if (reduceMotion.matches) {
      state.x = 0;
      state.y = 0;
      render();
      return;
    }

    const tick = (time) => {
      const dt = clamp((time - state.lastTime) / 1000, 0, .05);
      state.lastTime = time;

      if (!state.hasPointer && time - state.lastInteraction > 1200) {
        const ampX = coarsePointer.matches ? .34 : .12;
        const ampY = coarsePointer.matches ? .28 : .08;
        state.targetX = Math.sin(time * .00036) * ampX;
        state.targetY = Math.sin(time * .00029 + .8) * ampY;
      }

      const damping = 1 - Math.exp(-dt * 10.5);
      state.x += (state.targetX - state.x) * damping;
      state.y += (state.targetY - state.y) * damping;
      render();
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  start();
})();
