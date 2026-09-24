import { createBounds } from './bounds.js';
import { panTime, zoomTime, fitTime } from './time-scale.js';
import { normalizeScaleType } from './scale.js';
import { YViewport } from './y-viewport.js';

function clampY(range, bounds, yViewport) {
  const min = Number(bounds?.min), max = Number(bounds?.max);
  if (!yViewport.validRange(min, max)) return range;
  const a = yViewport.type === 'logarithmic' ? Math.log(min) : min;
  const b = yViewport.type === 'logarithmic' ? Math.log(max) : max;
  let rMin = yViewport.type === 'logarithmic' ? Math.log(range.min) : range.min;
  let rMax = yViewport.type === 'logarithmic' ? Math.log(range.max) : range.max;
  if (![a,b,rMin,rMax].every(Number.isFinite) || !(rMax > rMin)) return {min,max};
  const span = rMax-rMin;
  if (span >= b-a) return {min,max};
  if (rMin < a) { rMin=a; rMax=a+span; }
  if (rMax > b) { rMax=b; rMin=b-span; }
  return yViewport.type === 'logarithmic'
    ? {min:Math.exp(rMin),max:Math.exp(rMax)}
    : {min:rMin,max:rMax};
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
      range = { x: { min: Number(next.x.min), max: Number(next.x.max) }, y: { min: Number(next.y.min), max: Number(next.y.max) } };
      if (next.yScaleType) this.setYScaleType(next.yScaleType);
    },
    getYScaleType() { return yViewport.type; },
    setYScaleType(type) {
      const next = normalizeScaleType(type), b = bounds.get();
      if (next === 'logarithmic' && (b.y.min <= 0 || b.y.max <= 0)) return false;
      yViewport.setType(next);
      return true;
    },
    panX(delta) { range.x = panTime(range.x, delta, bounds.get().x); },
    zoomX(factor, anchor) { range.x = zoomTime(range.x, factor, anchor, bounds.get().x); },
    panY(delta) { range.y = yViewport.pan(range.y, delta); range.y = clampY(range.y, bounds.get().y, yViewport); },
    panYByPixels(pixels, plotHeight) { range.y = yViewport.panPixels(range.y, pixels, plotHeight); range.y = clampY(range.y, bounds.get().y, yViewport); },
    zoomY(factor, anchor) { range.y = yViewport.zoom(range.y, factor, anchor); range.y = clampY(range.y, bounds.get().y, yViewport); },
    fitX(target) { range.x = fitTime(target, bounds.get().x); },
    fitY(target) { range.y = yViewport.fit(target); range.y = clampY(range.y, bounds.get().y, yViewport); },
    fitAll() { const b = bounds.get(); range = { x: { ...b.x }, y: { ...b.y } }; },
    priceAtYRatio(ratio) { return yViewport.valueAtRatio(range.y, ratio); }
  };
}