export const DRAWING_DOCUMENT_VERSION = 1;

export function createDrawingDocument({ symbol, provider, interval, drawings = [] }) {
  return {
    version: DRAWING_DOCUMENT_VERSION,
    symbol,
    provider,
    interval,
    drawings: Array.isArray(drawings) ? drawings.map(cloneDrawing) : []
  };
}

export function cloneDrawing(drawing) {
  return JSON.parse(JSON.stringify(drawing));
}

export function cloneDrawings(drawings) {
  return Array.isArray(drawings) ? drawings.map(cloneDrawing) : [];
}

export function isDrawingDocument(value) {
  return Boolean(
    value &&
    value.version === DRAWING_DOCUMENT_VERSION &&
    typeof value.symbol === 'string' &&
    typeof value.provider === 'string' &&
    typeof value.interval === 'string' &&
    Array.isArray(value.drawings)
  );
}
