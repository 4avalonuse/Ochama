import { createBounds } from './bounds.js';
import { panTime, zoomTime, fitTime, expandTimeBounds } from './time-scale.js';
import { normalizeScaleType } from './scale.js';
import { YViewport } from './y-viewport.js';

function validRange(range) {
  return Number.isFinite(range?.min) && Number.isFinite(range?.max) && range.max > range.min;
}

export function createViewport() {
  const bounds = createBounds();
  let range = { x: { min: null, max: null }, y: { min: null, max: null } };
  const yViewport = new YViewport('linear');

  return {
    setDataBounds(next) {
      bounds.set(next);
      const b = bounds.get();
      range = { x: { ...b.x }, y: { ...b.y } };
      if (yViewport.isLog() && (b.y.min <= 0 || b.y.max <= 0)) yViewport.setType('linear');
    },
    getBounds() { return bounds.get(); },
    getState() { return { x: { ...range.x }, y: { ...range.y }, yScaleType: yViewport.type }; },
    setState(next) {
      const x = { min: Number(next?.x?.min), max: Number(next?.x?.max) };
      const y = { min: Number(next?.y?.min), max: Number(next?.y?.max) };
      if (!validRange(x) || !validRange(y)) return false;
      const nextScale = next?.yScaleType ? normalizeScaleType(next.yScaleType) : yViewport.type;
      const b = bounds.get();
      if (nextScale === 'logarithmic' && (b.y.min <= 0 || b.y.max <= 0)) return false;
      yViewport.setType(nextScale);
      range = { x: panTime(x, 0, expandTimeBounds(b.x)), y: yViewport.constrain(y, b.y) };
      return true;
    },
    getYScaleType() { return yViewport.type; },
    setYScaleType(type) {
      const next = normalizeScaleType(type), b = bounds.get();
      if (next === 'logarithmic' && (b.y.min <= 0 || b.y.max <= 0)) return false;
      yViewport.setType(next);
      range.y = yViewport.constrain(range.y, b.y);
      return true;
    },
    panX(delta) { range.x = panTime(range.x, delta, expandTimeBounds(bounds.get().x)); },
    zoomX(factor, anchor) { range.x = zoomTime(range.x, factor, anchor, bounds.get().x); },
    panY(delta) { range.y = yViewport.constrain(yViewport.pan(range.y, delta), bounds.get().y); },
    panYByPixels(pixels, plotHeight) { range.y = yViewport.constrain(yViewport.panPixels(range.y, pixels, plotHeight), bounds.get().y); },
    zoomY(factor, anchor) { range.y = yViewport.constrain(yViewport.zoom(range.y, factor, anchor), bounds.get().y); },
    fitX(target) { range.x = fitTime(target, bounds.get().x); },
    fitY(target) { range.y = yViewport.constrain(yViewport.fit(target), bounds.get().y); },
    fitAll() { const b = bounds.get(); range = { x: { ...b.x }, y: { ...b.y } }; },
    priceAtYRatio(ratio) { return yViewport.valueAtRatio(range.y, ratio); }
  };
}
