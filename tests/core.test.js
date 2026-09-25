import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SCALE_LINEAR,
  SCALE_LOG,
  toScaleValue,
  fromScaleValue,
  valueAtRatio,
  ratioForValue
} from '../src/viewport/scale.js';
import { YViewport } from '../src/viewport/y-viewport.js';
import { panTime, zoomTime, fitTime } from '../src/viewport/time-scale.js';
import { normalizeCandles } from '../src/data/normalize.js';

test('scale converts linear values without distortion', () => {
  assert.equal(toScaleValue(42, SCALE_LINEAR), 42);
  assert.equal(fromScaleValue(42, SCALE_LINEAR), 42);
  assert.equal(valueAtRatio(10, 20, 0.5, SCALE_LINEAR), 15);
  assert.equal(ratioForValue(15, 10, 20, SCALE_LINEAR), 0.5);
});

test('scale converts logarithmic values in log space', () => {
  assert.equal(toScaleValue(100, SCALE_LOG), Math.log(100));
  assert.equal(fromScaleValue(Math.log(100), SCALE_LOG), 100);
  assert.equal(valueAtRatio(10, 1000, 0.5, SCALE_LOG), 100);
  assert.equal(ratioForValue(100, 10, 1000, SCALE_LOG), 0.5);
});

test('Y viewport keeps logarithmic ranges positive', () => {
  const viewport = new YViewport(SCALE_LOG);
  const fit = viewport.fit({ min: 10, max: 100 });
  assert.ok(fit.min > 0);
  assert.ok(fit.max > fit.min);
  const zoomed = viewport.zoom({ min: 10, max: 100 }, 0.5, 50);
  assert.ok(zoomed.min > 0);
  assert.ok(zoomed.max > zoomed.min);
});

test('time viewport respects bounds', () => {
  const bounds = { min: 0, max: 100 };
  assert.deepEqual(panTime({ min: 20, max: 40 }, -50, bounds), { min: 0, max: 20 });
  assert.deepEqual(zoomTime({ min: 20, max: 40 }, 2, 30, bounds), { min: 10, max: 50 });
  assert.deepEqual(fitTime({ min: 10, max: 30 }, bounds), { min: 10, max: 30 });
});

test('normalizer rejects empty, malformed and duplicate data', () => {
  assert.throws(() => normalizeCandles([]), /Nenhum candle/);
  assert.throws(() => normalizeCandles([{ timestamp: 1, open: 1, high: 0.5, low: 1, close: 1 }]), /Candle inválido/);
  const candle = { timestamp: 1, open: 1, high: 2, low: 1, close: 1, volume: 0 };
  assert.throws(() => normalizeCandles([candle, candle]), /Candle duplicado/);
});

test('normalizer sorts candles into the internal time order', () => {
  const rows = [
    { timestamp: 2, open: 2, high: 3, low: 1, close: 2, volume: 0 },
    { timestamp: 1, open: 1, high: 2, low: 0.5, close: 1.5, volume: 0 }
  ];
  const candles = normalizeCandles(rows);
  assert.deepEqual(candles.map(c => c.timestamp), [1000, 2000]);
});
