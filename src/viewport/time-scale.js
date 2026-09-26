const OVERSCROLL_FACTOR = 1;

export function expandTimeBounds(bounds, factor = OVERSCROLL_FACTOR) {
  const min = Number(bounds?.min), max = Number(bounds?.max);
  if (![min, max].every(Number.isFinite) || !(max > min)) return { min, max };
  const margin = (max - min) * Math.max(0, Number(factor) || 0);
  return { min: min - margin, max: max + margin };
}

export function panTime(range, delta, bounds) {
  const span = range.max - range.min;
  const next = { min: range.min + delta, max: range.max + delta };
  if (bounds?.min != null) {
    const min = Number(bounds.min);
    if (next.min < min) { next.min = min; next.max = min + span; }
  }
  if (bounds?.max != null) {
    const max = Number(bounds.max);
    if (next.max > max) { next.max = max; next.min = max - span; }
  }
  return next;
}

export function zoomTime(range, factor, anchor, bounds) {
  if (!(factor > 0) || !(range.max > range.min)) return { ...range };
  const next = {
    min: anchor - (anchor - range.min) * factor,
    max: anchor + (range.max - anchor) * factor
  };
  const limits = expandTimeBounds(bounds);
  const span = next.max - next.min;
  if (Number.isFinite(limits.min) && Number.isFinite(limits.max) && span > limits.max - limits.min) {
    return { min: limits.min, max: limits.max };
  }
  return panTime(next, 0, limits);
}

export function fitTime(target, bounds) {
  const min = Number(target?.min), max = Number(target?.max);
  const bMin = Number(bounds?.min), bMax = Number(bounds?.max);
  if (![min, max, bMin, bMax].every(Number.isFinite) || max <= min) return { min: bMin, max: bMax };
  const span = Math.min(max - min, bMax - bMin);
  const center = Math.max(bMin + span / 2, Math.min(bMax - span / 2, (min + max) / 2));
  return { min: center - span / 2, max: center + span / 2 };
}