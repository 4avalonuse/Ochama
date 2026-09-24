import { normalizeScaleType, SCALE_LOG, toScaleValue, fromScaleValue, valueAtRatio } from './scale.js';

export function panPrice(range, delta, bounds, scaleType = 'linear') {
  const type = normalizeScaleType(scaleType);
  if (type === SCALE_LOG) {
    const min = toScaleValue(range.min, type);
    const max = toScaleValue(range.max, type);
    return clampRange({ min: fromScaleValue(min + delta), max: fromScaleValue(max + delta) }, bounds, type);
  }
  return clampRange({ min: range.min + delta, max: range.max + delta }, bounds, type);
}

export function panPricePixels(range, pixels, plotHeight, bounds, scaleType = 'linear') {
  const type = normalizeScaleType(scaleType);
  const span = toScaleValue(range.max, type) - toScaleValue(range.min, type);
  return panPrice(range, (Number(pixels) / Math.max(1, plotHeight)) * span, bounds, type);
}

export function zoomPrice(range, factor, anchor, bounds, scaleType = 'linear') {
  const type = normalizeScaleType(scaleType);
  if (!(factor > 0)) return { ...range };
  const min = toScaleValue(range.min, type), max = toScaleValue(range.max, type), a = toScaleValue(anchor, type);
  if (![min, max, a].every(Number.isFinite) || !(max > min)) return { ...range };
  return clampRange({
    min: fromScaleValue(a - (a - min) * factor),
    max: fromScaleValue(a + (max - a) * factor)
  }, bounds, type);
}

function clampRange(range, bounds, scaleType = 'linear') {
  const type = normalizeScaleType(scaleType);
  const min = Number(bounds?.min), max = Number(bounds?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return range;
  if (type === SCALE_LOG && (min <= 0 || max <= 0)) return range;
  const bMin = toScaleValue(min, type), bMax = toScaleValue(max, type);
  let rMin = toScaleValue(range.min, type), rMax = toScaleValue(range.max, type);
  if (![bMin, bMax, rMin, rMax].every(Number.isFinite) || !(rMax > rMin)) return range;
  const span = rMax - rMin;
  if (span >= bMax - bMin) return { min, max };
  if (rMin < bMin) { rMin = bMin; rMax = rMin + span; }
  if (rMax > bMax) { rMax = bMax; rMin = rMax - span; }
  return { min: fromScaleValue(rMin, type), max: fromScaleValue(rMax, type) };
}

export function fitPrice(target, bounds, scaleType = 'linear') {
  const type = normalizeScaleType(scaleType);
  const min = Number(target?.min), max = Number(target?.max);
  const bMin = Number(bounds?.min), bMax = Number(bounds?.max);
  if (![min, max, bMin, bMax].every(Number.isFinite) || max <= min) return { min: bMin, max: bMax };
  if (type === SCALE_LOG && (min <= 0 || max <= 0 || bMin <= 0 || bMax <= 0)) return { min: bMin, max: bMax };
  const a = toScaleValue(min, type), b = toScaleValue(max, type);
  const pad = (b - a) * 0.06;
  return clampRange({ min: fromScaleValue(a - pad), max: fromScaleValue(b + pad) }, bounds, type);
}

export function priceAtRatio(range, ratio, scaleType = 'linear') {
  return valueAtRatio(range.min, range.max, ratio, normalizeScaleType(scaleType));
}