(() => {
  const hero = document.getElementById('hero');
  const head = document.getElementById('robotHead');
  const layers = head ? [...head.querySelectorAll('.robot-head-frame')] : [];

  if (!hero || !head || layers.length < 2) return;

  const YAW_STOPS = [-20, -10, 0, 10, 20];
  const PITCH_STOPS = [-8, 0, 8];
  const MAX_YAW = 20;
  const MAX_PITCH = 8;
  const CROSSFADE_MS = 90;
  const SWITCH_HYSTERESIS = 0.16;
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
  const nearestStopIndex = (value, stops) => {
    let bestIndex = 0;
    let bestDistance = Infinity;
    stops.forEach((stop, index) => {
      const distance = Math.abs(value - stop);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    });
    return bestIndex;
  };

  const state = {
    targetYaw: 0,
    targetPitch: 0,
    yaw: 0,
    pitch: 0,
    lastTime: performance.now(),
    lastInteraction: performance.now(),
    hasPointer: false,
    spriteUrl: '',
    activeLayer: 0,
    frame: null,
  };

  const spriteFrame = (yawIndex, pitchIndex) => ({
    yawIndex,
    pitchIndex,
    yaw: YAW_STOPS[yawIndex],
    pitch: PITCH_STOPS[pitchIndex],
    col: yawIndex,
    // Sprite rows are +8, 0, -8 while logical pitch is -8, 0, +8.
    row: 2 - pitchIndex,
    key: `${yawIndex}:${pitchIndex}`,
  });

  const frameDistance = (yaw, pitch, frame) => {
    const dx = (yaw - frame.yaw) / 10;
    const dy = (pitch - frame.pitch) / 8;
    return Math.hypot(dx, dy);
  };

  const selectFrame = (yaw, pitch) => {
    const candidate = spriteFrame(
      nearestStopIndex(yaw, YAW_STOPS),
      nearestStopIndex(pitch, PITCH_STOPS),
    );

    if (!state.frame || candidate.key === state.frame.key) return candidate;

    const currentDistance = frameDistance(yaw, pitch, state.frame);
    const candidateDistance = frameDistance(yaw, pitch, candidate);

    // Keep the active frame slightly beyond the exact midpoint. This avoids
    // rapid toggling around grid boundaries without leaving two heads visible.
    return currentDistance - candidateDistance > SWITCH_HYSTERESIS
      ? candidate
      : state.frame;
  };

  const setFramePosition = (layer, frame) => {
    layer.style.backgroundPosition = `${frame.col * 25}% ${frame.row * 50}%`;
  };

  const showFrame = (frame, immediate = false) => {
    if (!frame || frame.key === state.frame?.key) return;

    if (!state.frame || immediate) {
      layers.forEach((layer, index) => {
        layer.style.transition = 'none';
        layer.style.opacity = index === 0 ? '1' : '0';
      });
      setFramePosition(layers[0], frame);
      state.activeLayer = 0;
      state.frame = frame;
      requestAnimationFrame(() => {
        layers.forEach((layer) => {
          layer.style.transition = `opacity ${CROSSFADE_MS}ms linear`;
        });
      });
      return;
    }

    const previousLayer = layers[state.activeLayer];
    const nextLayerIndex = state.activeLayer === 0 ? 1 : 0;
    const nextLayer = layers[nextLayerIndex];

    setFramePosition(nextLayer, frame);
    nextLayer.style.opacity = '0';
    nextLayer.getBoundingClientRect();
    previousLayer.style.opacity = '0';
    nextLayer.style.opacity = '1';

    state.activeLayer = nextLayerIndex;
    state.frame = frame;
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
      layer.style.transition = `opacity ${CROSSFADE_MS}ms linear`;
      layer.style.opacity = '0';
    });

    head.classList.add('is-ready');
    showFrame(spriteFrame(2, 1), true);
  };

  const render = () => {
    const frame = selectFrame(state.yaw, state.pitch);
    showFrame(frame);

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
