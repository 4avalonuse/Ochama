import { createBounds } from './bounds.js';
import { panTime, zoomTime } from './time-scale.js';
import { panPrice, panPricePixels, zoomPrice, priceAtRatio } from './price-scale.js';
import { normalizeScaleType } from './scale.js';

export function createViewport() {
  const bounds = createBounds();
  let range = { x: { min: null, max: null }, y: { min: null, max: null } };
  let yScaleType = 'linear';

  return {
    setDataBounds(next) {
      bounds.set(next);
      const b = bounds.get();
      range = { x: { ...b.x }, y: { ...b.y } };
      if (yScaleType === 'logarithmic' && (b.y.min <= 0 || b.y.max <= 0)) {
        yScaleType = 'linear';
      }
    },
    getBounds() {
      return bounds.get();
    },
    getState() {
      return {
        x: { ...range.x },
        y: { ...range.y },
        yScaleType
      };
    },
    setState(next) {
      range = {
        x: { min: Number(next.x.min), max: Number(next.x.max) },
        y: { min: Number(next.y.min), max: Number(next.y.max) }
      };
      if (next.yScaleType) this.setYScaleType(next.yScaleType);
    },
    getYScaleType() {
      return yScaleType;
    },
    setYScaleType(type) {
      const next = normalizeScaleType(type);
      const b = bounds.get();
      if (next === 'logarithmic' && (b.y.min <= 0 || b.y.max <= 0)) return false;
      yScaleType = next;
      return true;
    },
    panX(delta) {
      range.x = panTime(range.x, delta, bounds.get().x);
    },
    zoomX(factor, anchor) {
      range.x = zoomTime(range.x, factor, anchor, bounds.get().x);
    },
    panY(delta) {
      range.y = panPrice(range.y, delta, bounds.get().y, yScaleType);
    },
    panYByPixels(pixels, plotHeight) {
      range.y = panPricePixels(range.y, pixels, plotHeight, bounds.get().y, yScaleType);
    },
    zoomY(factor, anchor) {
      range.y = zoomPrice(range.y, factor, anchor, bounds.get().y, yScaleType);
    },
    priceAtYRatio(ratio) {
      return priceAtRatio(range.y, ratio, yScaleType);
    }
  };
}