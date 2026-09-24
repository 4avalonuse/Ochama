export function createChart(host, candles, viewport) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-label', 'Preço BTC-USD');
  host.replaceChildren(canvas);

  const ctx = canvas.getContext('2d');

  function resize() {
    const rect = host.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    draw();
  }

  function draw() {
    const state = viewport.getState();
    ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
    ctx.clearRect(0, 0, host.clientWidth, host.clientHeight);
    if (!candles.length || state.y.max <= state.y.min) return;

    ctx.beginPath();
    candles.forEach((candle, i) => {
      const x = ((candle.timestamp - state.x.min) / (state.x.max - state.x.min || 1)) * host.clientWidth;
      const y = host.clientHeight - ((candle.close - state.y.min) / (state.y.max - state.y.min)) * host.clientHeight;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  return { canvas, draw, destroy() { observer.disconnect(); canvas.remove(); } };
}
