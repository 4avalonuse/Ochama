export function panPrice(range, delta, bounds) {
  const next = { min: range.min + delta, max: range.max + delta };
  return clampRange(next, bounds);
}

export function zoomPrice(range, factor, anchor, bounds) {
  if (!(factor > 0) || !(range.max > range.min)) return { ...range };
  return clampRange({
    min: anchor - (anchor - range.min) * factor,
    max: anchor + (range.max - anchor) * factor
  }, bounds);
}

function clampRange(range, bounds) {
  const min = Number(bounds?.min);
  const max = Number(bounds?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return range;
  const span = range.max - range.min;
  if (range.min < min) return { min, max: min + span };
  if (range.max > max) return { min: max - span, max };
  return range;
}
