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

    // Cursor is mostly to the left of the robot, so horizontal tracking is stronger.
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

    // On touch devices and when the mouse leaves, the robot keeps a barely visible idle scan.
    if (!state.hasPointer && idleFor > 800) {
      state.targetX = Math.sin(time * 0.00042) * 0.20;
      state.targetY = Math.sin(time * 0.00031 + 1.2) * 0.12;
    }

    const ease = 0.075;
    state.x += (state.targetX - state.x) * ease;
    state.y += (state.targetY - state.y) * ease;

    // Negative Y rotation makes the face turn toward a cursor on the left side.
    const rotY = state.x * -11;
    const rotX = state.y * 7;
    const tx = state.x * -7;
    const ty = state.y * 5;
    const glowX = state.x * -13;
    const glowY = state.y * 9;

    hero.style.setProperty('--head-ry', `${rotY.toFixed(3)}deg`);
    hero.style.setProperty('--head-rx', `${rotX.toFixed(3)}deg`);
    hero.style.setProperty('--head-tx', `${tx.toFixed(2)}px`);
    hero.style.setProperty('--head-ty', `${ty.toFixed(2)}px`);
    hero.style.setProperty('--glow-x', `${glowX.toFixed(2)}px`);
    hero.style.setProperty('--glow-y', `${glowY.toFixed(2)}px`);

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
})();
