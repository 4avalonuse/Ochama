export function attachScaleToggle({ button, viewport, draw, onScaleChanged = null }) {
  function sync() {
    const log = viewport.getYScaleType() === 'logarithmic';
    button.textContent = log ? 'LOG' : 'NORMAL';
    button.setAttribute('aria-pressed', String(log));
    button.title = log ? 'Escala logarítmica' : 'Escala normal';
  }

  const onClick = () => {
    const next = viewport.getYScaleType() === 'logarithmic' ? 'linear' : 'logarithmic';
    if (!viewport.setYScaleType(next)) return;
    if (typeof onScaleChanged === 'function') onScaleChanged();
    sync();
    draw();
  };

  button.addEventListener('click', onClick);
  sync();

  return () => button.removeEventListener('click', onClick);
}
