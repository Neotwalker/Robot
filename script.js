(() => {
  const hero = document.getElementById('hero');
  const head = document.getElementById('robotHead');

  if (!hero || !head) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceMotion.matches) return;

  const state = {
    targetX: 0,
    targetY: 0,
    x: 0,
    y: 0,
    lastInteraction: performance.now(),
    hasPointer: false,
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const setTargetFromPoint = (clientX, clientY) => {
    const rect = hero.getBoundingClientRect();
    const nx = clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
    const ny = clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1);

    state.targetX = nx;
    state.targetY = ny;
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
  }, { passive: true });

  hero.addEventListener('pointerleave', () => {
    state.hasPointer = false;
    state.lastInteraction = performance.now();
  });

  const tick = (time) => {
    const idleFor = time - state.lastInteraction;

    if (!state.hasPointer && idleFor > 1000) {
      state.targetX = Math.sin(time * 0.00038) * 0.12;
      state.targetY = Math.sin(time * 0.00029 + 1.1) * 0.08;
    }

    const ease = 0.065;
    state.x += (state.targetX - state.x) * ease;
    state.y += (state.targetY - state.y) * ease;

    // The head is a flat rendered layer, so only subtle 2D motion is used.
    // This keeps the image intact while still giving a clear tracking effect.
    const headX = state.x * 11;
    const headY = state.y * 7;
    const headR = state.x * 1.05 + state.y * 0.18;
    const glowX = state.x * 14;
    const glowY = state.y * 10;

    hero.style.setProperty('--head-x', `${headX.toFixed(2)}px`);
    hero.style.setProperty('--head-y', `${headY.toFixed(2)}px`);
    hero.style.setProperty('--head-r', `${headR.toFixed(3)}deg`);
    hero.style.setProperty('--glow-x', `${glowX.toFixed(2)}px`);
    hero.style.setProperty('--glow-y', `${glowY.toFixed(2)}px`);

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
})();
