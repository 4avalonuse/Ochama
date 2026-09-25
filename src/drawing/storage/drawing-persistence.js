import { DRAWING_DOCUMENT_VERSION, createDrawingDocument } from '../core/drawing-model.js';
import { hasDrawingTool } from '../core/drawing-registry.js';

const STORAGE_KEY = 'ochama:drawing-documents:v1';

function keyFor({ symbol, provider, interval }) {
  return `${provider}:${symbol}:${interval}`;
}

function migrate(value) {
  if (!value || typeof value !== 'object') return null;
  if (value.version !== DRAWING_DOCUMENT_VERSION) return null;
  return value;
}

export function createDrawingPersistence(storage = localStorage) {
  function readAll() {
    try { return JSON.parse(storage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }

  function writeAll(value) {
    storage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  return {
    save(document) {
      const all = readAll();
      all[keyFor(document)] = document;
      writeAll(all);
    },
    load({ symbol, provider, interval }) {
      const all = readAll();
      const value = migrate(all[keyFor({ symbol, provider, interval })]);
      if (!value) return createDrawingDocument({ symbol, provider, interval });
      const drawings = value.drawings.filter(drawing => {
        if (hasDrawingTool(drawing?.type)) return true;
        console.warn('[Ochama drawing] Ignorando tipo desconhecido:', drawing?.type);
        return false;
      });
      return createDrawingDocument({ symbol, provider, interval, drawings });
    }
  };
}
