export const SCALE_LINEAR = 'linear';
export const SCALE_LOG = 'logarithmic';

export function normalizeScaleType(type) {
  return type === SCALE_LOG ? SCALE_LOG : SCALE_LINEAR;
}

export function toScaleValue(value, type) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  if (type === SCALE_LOG) return n > 0 ? Math.log(n) : NaN;
  return n;
}

export function fromScaleValue(value, type) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return type === SCALE_LOG ? Math.exp(n) : n;
}

export function valueAtRatio(min, max, ratio, type) {
  const a = toScaleValue(min, type);
  const b = toScaleValue(max, type);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return min;
  return fromScaleValue(a + (b - a) * Math.max(0, Math.min(1, ratio)), type);
}

export function ratioForValue(value, min, max, type) {
  const a = toScaleValue(min, type);
  const b = toScaleValue(max, type);
  const v = toScaleValue(value, type);
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(v) || b <= a) return NaN;
  return (v - a) / (b - a);
}