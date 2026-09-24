function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointFromEvent(event, rect) {
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

export function attachPointerInteraction({ canvas, viewport, draw }) {
  const pointers = new Map();
  const state = {
    mode: null,
    last: null,
    pinchDistance: null
  };

  function rect() {
    return canvas.getBoundingClientRect();
  }

  function isPriceScale(point, width) {
    return point.x >= Math.max(0, width - 68);
  }

  function timeAtX(x, width, range) {
    const plotWidth = Math.max(1, width - 68 - 10);
    const ratio = Math.max(0, Math.min(1, (x - 10) / plotWidth));
    return range.x.min + (range.x.max - range.x.min) * ratio;
  }

  function pricePerPixel(height, range) {
    const plotHeight = Math.max(1, height - 18 - 24);
    return (range.y.max - range.y.min) / plotHeight;
  }

  function onPointerDown(event) {
    const r = rect();
    const point = pointFromEvent(event, r);
    pointers.set(event.pointerId, point);
    canvas.setPointerCapture?.(event.pointerId);

    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      state.mode = 'pinch';
      state.pinchDistance = Math.max(1, distance(a, b));
      state.last = null;
      return;
    }

    state.mode = isPriceScale(point, r.width) ? 'price-scale' : null;
    state.last = point;
  }

  function onPointerMove(event) {
    if (!pointers.has(event.pointerId)) return;

    const r = rect();
    const point = pointFromEvent(event, r);
    pointers.set(event.pointerId, point);

    if (pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const nextDistance = Math.max(1, distance(a, b));
      const previousDistance = state.pinchDistance || nextDistance;
      const factor = previousDistance / nextDistance;
      const midpointX = (a.x + b.x) / 2;
      const current = viewport.getState();
      viewport.zoomX(factor, timeAtX(midpointX, r.width, current));
      state.pinchDistance = nextDistance;
      state.mode = 'pinch';
      draw();
      return;
    }

    if (!state.last) {
      state.last = point;
      return;
    }

    const dx = point.x - state.last.x;
    const dy = point.y - state.last.y;

    if (state.mode === 'price-scale') {
      const current = viewport.getState();
      const factor = Math.exp(dy * 0.01);
      const plotTop = 18;
      const plotHeight = Math.max(1, r.height - 18 - 24);
      const ratio = Math.max(0, Math.min(1, (point.y - plotTop) / plotHeight));
      const anchor = current.y.max - ratio * (current.y.max - current.y.min);
      viewport.zoomY(factor, anchor);
    } else if (state.mode === 'pan-x') {
      const current = viewport.getState();
      const plotWidth = Math.max(1, r.width - 68 - 10);
      viewport.panX(-(dx / plotWidth) * (current.x.max - current.x.min));
    } else if (state.mode === 'pan-y') {
      const current = viewport.getState();
      viewport.panY(dy * pricePerPixel(r.height, current));
    } else {
      if (Math.abs(dx) >= 6 || Math.abs(dy) >= 6) {
        state.mode = Math.abs(dx) >= Math.abs(dy) ? 'pan-x' : 'pan-y';
      }
      if (state.mode === 'pan-x') {
        const current = viewport.getState();
        const plotWidth = Math.max(1, r.width - 68 - 10);
        viewport.panX(-(dx / plotWidth) * (current.x.max - current.x.min));
      } else if (state.mode === 'pan-y') {
        const current = viewport.getState();
        viewport.panY(dy * pricePerPixel(r.height, current));
      }
    }

    state.last = point;
    draw();
  }

  function endPointer(event) {
    pointers.delete(event.pointerId);
    try { canvas.releasePointerCapture?.(event.pointerId); } catch {}

    if (pointers.size === 0) {
      state.mode = null;
      state.last = null;
      state.pinchDistance = null;
    } else if (pointers.size === 1) {
      state.mode = null;
      state.last = [...pointers.values()][0];
      state.pinchDistance = null;
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', endPointer);
    canvas.removeEventListener('pointercancel', endPointer);
  };
}
