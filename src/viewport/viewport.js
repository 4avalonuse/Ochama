import { createBounds } from './bounds.js';
import { panTime, zoomTime } from './time-scale.js';
import { panPrice, zoomPrice } from './price-scale.js';

export function createViewport() {
  const bounds = createBounds();
  let range = { x: { min: null, max: null }, y: { min: null, max: null } };

  return {
    setDataBounds(next) {
      bounds.set(next);
      const b = bounds.get();
      range = { x: { ...b.x }, y: { ...b.y } };
    },
    getBounds() {
      return bounds.get();
    },
    getState() {
      return {
        x: { ...range.x },
        y: { ...range.y }
      };
    },
    setState(next) {
      range = {
        x: { min: Number(next.x.min), max: Number(next.x.max) },
        y: { min: Number(next.y.min), max: Number(next.y.max) }
      };
    },
    panX(delta) {
      range.x = panTime(range.x, delta, bounds.get().x);
    },
    zoomX(factor, anchor) {
      range.x = zoomTime(range.x, factor, anchor, bounds.get().x);
    },
    panY(delta) {
      range.y = panPrice(range.y, delta, bounds.get().y);
    },
    zoomY(factor, anchor) {
      range.y = zoomPrice(range.y, factor, anchor, bounds.get().y);
    }
  };
}
