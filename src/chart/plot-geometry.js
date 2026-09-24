export const PLOT_GEOMETRY = Object.freeze({
  left: 10,
  right: 68,
  top: 18,
  bottom: 24
});

export function createPlotGeometry(width, height) {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);

  return {
    ...PLOT_GEOMETRY,
    width: Math.max(1, w - PLOT_GEOMETRY.left - PLOT_GEOMETRY.right),
    height: Math.max(1, h - PLOT_GEOMETRY.top - PLOT_GEOMETRY.bottom)
  };
}
