export function attachScaleToggle({ button, viewport, draw }) {
  function sync() {
    const log = viewport.getYScaleType() === 'logarithmic';
    button.textContent = log ? 'LOG' : 'NORMAL';
    button.setAttribute('aria-pressed', String(log));
    button.title = log ? 'Escala logarítmica' : 'Escala normal';
  }

  button.addEventListener('click', () => {
    const next = viewport.getYScaleType() === 'logarithmic' ? 'linear' : 'logarithmic';
    if (viewport.setYScaleType(next)) {
      sync();
      draw();
    }
  });

  sync();
}