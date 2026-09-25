export function attachFitToggle({ button, viewport, candles, draw, onViewportChanged = null, longPressMs = 550 }) {
  let timer = null;
  let longPressed = false;

  function fitVisible() {
    const state = viewport.getState();
    const shown = candles.filter(c => c.timestamp >= state.x.min && c.timestamp <= state.x.max);
    if (!shown.length) return;

    viewport.fitY({
      min: Math.min(...shown.map(c => c.low)),
      max: Math.max(...shown.map(c => c.high))
    });
    draw();
    onViewportChanged?.();
  }

  function fitAll() {
    viewport.fitAll();
    draw();
    onViewportChanged?.();
  }

  function cancelTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function onPointerDown() {
    cancelTimer();
    longPressed = false;
    timer = setTimeout(() => {
      timer = null;
      longPressed = true;
      fitAll();
    }, longPressMs);
  }

  function onPointerUp() {
    cancelTimer();
    if (!longPressed) fitVisible();
    longPressed = false;
  }

  function onPointerCancel() {
    cancelTimer();
    longPressed = false;
  }

  button.addEventListener('pointerdown', onPointerDown);
  button.addEventListener('pointerup', onPointerUp);
  button.addEventListener('pointercancel', onPointerCancel);

  return () => {
    cancelTimer();
    button.removeEventListener('pointerdown', onPointerDown);
    button.removeEventListener('pointerup', onPointerUp);
    button.removeEventListener('pointercancel', onPointerCancel);
  };
}
