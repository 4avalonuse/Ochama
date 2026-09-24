import { normalizeScaleType, toScaleValue, fromScaleValue, valueAtRatio } from './scale.js';

export class YViewport {
  constructor(type = 'linear') {
    this.type = normalizeScaleType(type);
  }

  setType(type) {
    this.type = normalizeScaleType(type);
    return this;
  }

  isLog() {
    return this.type === 'logarithmic';
  }

  validRange(min, max) {
    min = Number(min);
    max = Number(max);
    return Number.isFinite(min) && Number.isFinite(max) && max > min &&
      (!this.isLog() || (min > 0 && max > 0));
  }

  pan(range, delta) {
    const min = toScaleValue(range.min, this.type);
    const max = toScaleValue(range.max, this.type);
    if (![min, max].every(Number.isFinite) || !(max > min)) return { ...range };

    const d = Number(delta);
    if (!Number.isFinite(d)) return { ...range };

    return {
      min: fromScaleValue(min + d, this.type),
      max: fromScaleValue(max + d, this.type)
    };
  }

  panPixels(range, pixels, plotHeight) {
    const min = toScaleValue(range.min, this.type);
    const max = toScaleValue(range.max, this.type);
    const height = Math.max(1, Number(plotHeight) || 1);
    if (![min, max].every(Number.isFinite) || !(max > min)) return { ...range };

    return this.pan(range, (Number(pixels) / height) * (max - min));
  }

  zoom(range, factor, anchor) {
    const min = toScaleValue(range.min, this.type);
    const max = toScaleValue(range.max, this.type);
    const a = toScaleValue(anchor, this.type);

    if (!(Number(factor) > 0) || ![min, max, a].every(Number.isFinite) || !(max > min)) {
      return { ...range };
    }

    return {
      min: fromScaleValue(a - (a - min) * factor, this.type),
      max: fromScaleValue(a + (max - a) * factor, this.type)
    };
  }

  fit(target) {
    const min = Number(target?.min);
    const max = Number(target?.max);
    if (!this.validRange(min, max)) return { min, max };

    const a = toScaleValue(min, this.type);
    const b = toScaleValue(max, this.type);
    const pad = (b - a) * 0.06;

    return {
      min: fromScaleValue(a - pad, this.type),
      max: fromScaleValue(b + pad, this.type)
    };
  }

  valueAtRatio(range, ratio) {
    return valueAtRatio(range.min, range.max, ratio, this.type);
  }
}
