// InteractionManager — único dono dos eventos físicos do gráfico.
// Reconhece o gesto; matemática permanece no viewport.
// Modos: auto | navigation | drawing | selection | none.

import { PLOT_GEOMETRY } from '../chart/plot-geometry.js';

export class InteractionManager {
  constructor({ canvas, viewport, draw, handlers = {} }) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.draw = draw;
    this.handlers = handlers;
    this.pointers = new Map();
    this.owner = null;
    this.mode = 'auto';
    this.gesture = { type: null, last: null, pinchDistance: null };
    this.plot = PLOT_GEOMETRY;
    this.bound = false;
  }

  setMode(mode = 'auto') {
    const allowed = new Set(['auto', 'navigation', 'drawing', 'selection', 'none']);
    this.mode = allowed.has(mode) ? mode : 'auto';
    if (!this.pointers.size) this.owner = null;
    return this.mode;
  }

  getMode() { return this.mode; }
  enableNavigation() { return this.setMode('navigation'); }
  disableNavigation() { return this.setMode('none'); }

  attach() {
    if (!this.canvas || this.bound) return () => {};
    this.onDown = e => this._down(e);
    this.onMove = e => this._move(e);
    this.onUp = e => this._end(e);
    this.onCancel = e => this._end(e);
    this.canvas.addEventListener('pointerdown', this.onDown, { passive: false });
    this.canvas.addEventListener('pointermove', this.onMove, { passive: false });
    this.canvas.addEventListener('pointerup', this.onUp, { passive: false });
    this.canvas.addEventListener('pointercancel', this.onCancel, { passive: false });
    this.canvas.style.touchAction = 'none';
    this.bound = true;
    return () => this.detach();
  }

  detach() {
    if (!this.canvas || !this.bound) return;
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    this.canvas.style.touchAction = '';
    this.pointers.clear();
    this.owner = null;
    this.gesture = { type: null, last: null, pinchDistance: null };
    this.bound = false;
  }

  _down(event) {
    if (this.mode === 'none') return;
    event.preventDefault();

    const point = this._point(event);
    this.pointers.set(event.pointerId, point);
    try { this.canvas.setPointerCapture(event.pointerId); } catch {}

    if (this.pointers.size === 1) {
      this.owner = this._resolveOwner(event);
      this.gesture = {
        type: this._priceScale(point) ? 'price-scale' : null,
        last: point,
        pinchDistance: null
      };

      if (this.owner === 'drawing') this.handlers.onDrawingDown?.(event);
      else if (this.owner === 'selection') this.handlers.onSelectionDown?.(event);
    } else if (this.owner === 'chart') {
      const [a,b] = [...this.pointers.values()];
      this.gesture.type = 'pinch';
      this.gesture.pinchDistance = Math.max(1, Math.hypot(b.x-a.x,b.y-a.y));
      this.gesture.last = null;
    }
  }

  _move(event) {
    if (!this.pointers.has(event.pointerId)) return;
    event.preventDefault();

    const point = this._point(event);
    this.pointers.set(event.pointerId, point);

    if (this.owner === 'drawing') {
      this.handlers.onDrawingMove?.(event);
      return;
    }
    if (this.owner === 'selection') {
      this.handlers.onSelectionMove?.(event);
      return;
    }
    if (this.owner !== 'chart') return;

    const rect = this.canvas.getBoundingClientRect();
    if (this.pointers.size >= 2) {
      const [a,b] = [...this.pointers.values()];
      const nextDistance = Math.max(1, Math.hypot(b.x-a.x,b.y-a.y));
      const previousDistance = this.gesture.pinchDistance || nextDistance;
      // Mantém o comportamento comprovado do OChart: pinch atua no X,
      // ancorado no ponto médio dos dedos.
      const factor = Math.pow(previousDistance / nextDistance, 0.5);
      const midpointX = (a.x+b.x)/2;
      const current = this.viewport.getState();
      const ratio = Math.max(0, Math.min(1,
        (midpointX-this.plot.left) / Math.max(1, rect.width-this.plot.left-this.plot.right)
      ));
      const anchor = current.x.min + (current.x.max-current.x.min)*ratio;
      this.viewport.zoomX(factor, anchor);
      this.gesture.pinchDistance = nextDistance;
      this.gesture.type = 'pinch';
      this.draw();
      return;
    }

    const last = this.gesture.last;
    if (!last) { this.gesture.last = point; return; }

    const dx = point.x-last.x;
    const dy = point.y-last.y;

    if (this.gesture.type === 'price-scale') {
      const current = this.viewport.getState();
      const plotHeight = Math.max(1, rect.height-this.plot.top-this.plot.bottom);
      const ratio = Math.max(0, Math.min(1,
        (point.y-this.plot.top)/plotHeight
      ));
      const anchor = this.viewport.priceAtYRatio(ratio);
      // Mesma sensação do gesto vertical histórico, mas o viewport
      // decide como isso se comporta em linear ou log.
      this.viewport.zoomY(Math.exp(-dy / 220), anchor);
    } else if (!this.gesture.type && (Math.abs(dx)>=6 || Math.abs(dy)>=6)) {
      this.gesture.type = Math.abs(dx)>=Math.abs(dy) ? 'pan-x' : 'pan-y';
    }

    if (this.gesture.type === 'pan-x') {
      const current = this.viewport.getState();
      const plotWidth = Math.max(1, rect.width-this.plot.left-this.plot.right);
      this.viewport.panX(-(dx/plotWidth)*(current.x.max-current.x.min));
    } else if (this.gesture.type === 'pan-y') {
      const plotHeight = Math.max(1, rect.height-this.plot.top-this.plot.bottom);
      this.viewport.panYByPixels(dy, plotHeight);
    }

    this.gesture.last = point;
    this.draw();
  }

  _end(event) {
    if (!this.pointers.has(event.pointerId)) return;
    const wasOwner = this.owner;
    this.pointers.delete(event.pointerId);

    if (wasOwner === 'drawing') this.handlers.onDrawingUp?.(event);
    if (wasOwner === 'selection') this.handlers.onSelectionUp?.(event);

    try { this.canvas.releasePointerCapture(event.pointerId); } catch {}

    if (!this.pointers.size) {
      this.owner = null;
      this.gesture = { type:null, last:null, pinchDistance:null };
    } else if (this.pointers.size === 1 && this.owner === 'chart') {
      this.gesture.type = null;
      this.gesture.last = [...this.pointers.values()][0];
      this.gesture.pinchDistance = null;
    }
  }

  _resolveOwner(event) {
    if (this.mode === 'none') return null;
    if (this.mode === 'navigation') return 'chart';
    if (this.mode === 'drawing') return 'drawing';
    if (this.mode === 'selection') return 'selection';
    return this.handlers.resolveOwner?.(event) || 'chart';
  }

  _point(event) {
    const r = this.canvas.getBoundingClientRect();
    return { x:event.clientX-r.left, y:event.clientY-r.top };
  }

  _priceScale(point) {
    const width = this.canvas.clientWidth || this.canvas.getBoundingClientRect().width;
    return point.x >= Math.max(0, width-this.plot.right);
  }
}
