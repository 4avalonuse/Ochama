const TOUCH_LONG_PRESS_MS = 420;
const TOUCH_MOVE_TOLERANCE = 8;

function finite(value) {
  return Number.isFinite(value);
}

function formatPrice(value) {
  if (!finite(value)) return '—';
  const abs = Math.abs(value);
  const maximumFractionDigits = abs >= 1000 ? 0 : abs >= 1 ? 2 : 6;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits
  });
}

function formatVolume(value) {
  if (!finite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e9) return (value / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (value / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  if (!finite(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function findNearestCandle(candles, timestamp) {
  if (!candles.length) return null;
  let lo = 0;
  let hi = candles.length - 1;

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (candles[mid].timestamp < timestamp) lo = mid + 1;
    else hi = mid;
  }

  const right = candles[lo];
  const left = candles[Math.max(0, lo - 1)];
  if (!left) return right;
  return Math.abs(left.timestamp - timestamp) <= Math.abs(right.timestamp - timestamp) ? left : right;
}

function createRow(label, value, extraClass = '') {
  const row = document.createElement('div');
  row.className = 'candle-tooltip-row';

  const key = document.createElement('span');
  key.className = 'candle-tooltip-key';
  key.textContent = label;

  const val = document.createElement('strong');
  val.className = 'candle-tooltip-value' + (extraClass ? ' ' + extraClass : '');
  val.textContent = value;

  row.append(key, val);
  return row;
}

export function createCandleTooltip({ host, canvas, candles, viewport, getPlot }) {
  if (!host || !canvas || !Array.isArray(candles) || !candles.length) return () => {};

  const tooltip = document.createElement('div');
  tooltip.className = 'candle-tooltip';
  tooltip.setAttribute('role', 'status');
  tooltip.setAttribute('aria-live', 'polite');
  tooltip.hidden = true;

  const crosshairX = document.createElement('div');
  crosshairX.className = 'chart-crosshair chart-crosshair-x';
  crosshairX.hidden = true;

  const crosshairY = document.createElement('div');
  crosshairY.className = 'chart-crosshair chart-crosshair-y';
  crosshairY.hidden = true;

  host.append(crosshairX, crosshairY, tooltip);

  let visible = false;
  let tracking = false;
  let touchPointerId = null;
  let touchStart = null;
  let longPressTimer = null;

  function clearLongPress() {
    if (longPressTimer !== null) {
      window.clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  }

  function hide() {
    clearLongPress();
    visible = false;
    tracking = false;
    touchPointerId = null;
    tooltip.hidden = true;
    crosshairX.hidden = true;
    crosshairY.hidden = true;
  }

  function positionTooltip(x, y) {
    const width = host.clientWidth;
    const height = host.clientHeight;
    const tooltipWidth = Math.min(248, Math.max(180, tooltip.offsetWidth || 220));
    const tooltipHeight = tooltip.offsetHeight || 112;
    const gap = 12;

    let left = x + gap;
    let top = y + gap;

    if (left + tooltipWidth > width - 8) left = x - tooltipWidth - gap;
    if (top + tooltipHeight > height - 8) top = y - tooltipHeight - gap;

    left = Math.max(8, Math.min(left, width - tooltipWidth - 8));
    top = Math.max(8, Math.min(top, height - tooltipHeight - 8));

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  function render(candle, x, y) {
    if (!candle) {
      hide();
      return;
    }

    const change = candle.close - candle.open;
    const changePct = candle.open ? (change / candle.open) * 100 : NaN;
    const rising = change >= 0;

    tooltip.replaceChildren();

    const head = document.createElement('div');
    head.className = 'candle-tooltip-head';

    const date = document.createElement('strong');
    date.textContent = formatDate(candle.timestamp);

    const state = document.createElement('span');
    state.className = 'candle-tooltip-state ' + (rising ? 'is-up' : 'is-down');
    state.textContent = rising ? 'ALTA' : 'BAIXA';

    head.append(date, state);
    tooltip.append(head);

    const grid = document.createElement('div');
    grid.className = 'candle-tooltip-grid';
    grid.append(
      createRow('Open', formatPrice(candle.open)),
      createRow('High', formatPrice(candle.high)),
      createRow('Low', formatPrice(candle.low)),
      createRow('Close', formatPrice(candle.close))
    );
    tooltip.append(grid);

    const footer = document.createElement('div');
    footer.className = 'candle-tooltip-footer';
    footer.append(
      createRow('Variação', (rising ? '+' : '') + formatPrice(change)),
      createRow('%', (rising ? '+' : '') + (finite(changePct) ? changePct.toFixed(2) : '—') + '%'),
      createRow('Volume', formatVolume(candle.volume))
    );
    tooltip.append(footer);

    const plot = getPlot();
    const clampedX = Math.max(plot.left, Math.min(plot.left + plot.width, x));
    const clampedY = Math.max(plot.top, Math.min(plot.top + plot.height, y));

    crosshairX.style.left = clampedX + 'px';
    crosshairX.style.top = plot.top + 'px';
    crosshairX.style.height = plot.height + 'px';

    crosshairY.style.left = plot.left + 'px';
    crosshairY.style.top = clampedY + 'px';
    crosshairY.style.width = plot.width + 'px';

    tooltip.hidden = false;
    crosshairX.hidden = false;
    crosshairY.hidden = false;
    positionTooltip(clampedX, clampedY);
    visible = true;
  }

  function update(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const plot = getPlot();

    if (
      x < plot.left || x > plot.left + plot.width ||
      y < plot.top || y > plot.top + plot.height
    ) {
      if (!tracking) hide();
      return;
    }

    const state = viewport.getState();
    const span = state.x.max - state.x.min;
    if (!(span > 0)) return;

    const timestamp = state.x.min + ((x - plot.left) / plot.width) * span;
    const candle = findNearestCandle(candles, timestamp);
    render(candle, x, y);
  }

  function onPointerMove(event) {
    if (event.pointerType === 'touch') {
      if (touchPointerId !== event.pointerId) return;

      if (!tracking) {
        const dx = event.clientX - touchStart.x;
        const dy = event.clientY - touchStart.y;
        if (Math.hypot(dx, dy) > TOUCH_MOVE_TOLERANCE) clearLongPress();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      update(event);
      return;
    }

    if (event.pointerType === 'mouse' && event.buttons === 0) update(event);
  }

  function onPointerDown(event) {
    if (event.pointerType !== 'touch') return;

    touchPointerId = event.pointerId;
    touchStart = { x: event.clientX, y: event.clientY };
    clearLongPress();

    longPressTimer = window.setTimeout(() => {
      longPressTimer = null;
      tracking = true;
      try { canvas.setPointerCapture(event.pointerId); } catch {}
      update(event);
    }, TOUCH_LONG_PRESS_MS);
  }

  function onPointerUp(event) {
    if (event.pointerType !== 'touch' || event.pointerId !== touchPointerId) return;

    clearLongPress();

    if (tracking) {
      event.preventDefault();
      event.stopImmediatePropagation();
      hide();
      return;
    }

    touchPointerId = null;
    touchStart = null;
  }

  function onPointerCancel(event) {
    if (event.pointerType !== 'touch' || event.pointerId !== touchPointerId) return;
    hide();
  }

  function onPointerLeave(event) {
    if (event.pointerType === 'mouse') hide();
  }

  canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
  canvas.addEventListener('pointermove', onPointerMove, { passive: false });
  canvas.addEventListener('pointerup', onPointerUp, { passive: false });
  canvas.addEventListener('pointercancel', onPointerCancel, { passive: false });
  canvas.addEventListener('pointerleave', onPointerLeave, { passive: true });

  return () => {
    hide();
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
    canvas.removeEventListener('pointercancel', onPointerCancel);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    crosshairX.remove();
    crosshairY.remove();
    tooltip.remove();
  };
}
