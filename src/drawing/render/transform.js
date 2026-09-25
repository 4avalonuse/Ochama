import { toScaleValue, fromScaleValue, normalizeScaleType } from '../../viewport/scale.js';

function validRange(min, max) {
  return Number.isFinite(min) && Number.isFinite(max) && max > min;
}

export function createDrawingTransform({ viewport, plot }) {
  return {
    marketToScreen(point) {
      const state = viewport.getState();
      const xSpan = state.x.max - state.x.min;
      if (!Number.isFinite(point?.timestamp) || !Number.isFinite(point?.price) || !(xSpan > 0)) return null;

      const scaleType = normalizeScaleType(state.yScaleType);
      const min = toScaleValue(state.y.min, scaleType);
      const max = toScaleValue(state.y.max, scaleType);
      const price = toScaleValue(point.price, scaleType);
      if (!validRange(min, max) || !Number.isFinite(price)) return null;

      return {
        x: plot.left + ((point.timestamp - state.x.min) / xSpan) * plot.width,
        y: plot.top + (1 - (price - min) / (max - min)) * plot.height
      };
    },

    screenToMarket(point) {
      const state = viewport.getState();
      const scaleType = normalizeScaleType(state.yScaleType);
      const min = toScaleValue(state.y.min, scaleType);
      const max = toScaleValue(state.y.max, scaleType);
      if (!validRange(min, max) || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;

      const xRatio = (point.x - plot.left) / plot.width;
      const yRatio = 1 - ((point.y - plot.top) / plot.height);
      const scaledPrice = min + (max - min) * yRatio;

      return {
        timestamp: state.x.min + xRatio * (state.x.max - state.x.min),
        price: fromScaleValue(scaledPrice, scaleType)
      };
    }
  };
}
