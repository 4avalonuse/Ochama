import { createDrawingDocument, cloneDrawings } from './drawing-model.js';
import { createHistory } from './history.js';
import { getDrawingTool } from './drawing-registry.js';

export function createDrawingManager({ symbol, provider, interval, drawings = [] }) {
  let document = createDrawingDocument({ symbol, provider, interval, drawings });
  let history = createHistory(document.drawings);

  function setDrawings(drawings, record = true) {
    const next = cloneDrawings(drawings);
    if (record) history.commit(next);
    document = { ...document, drawings: next };
  }

  return {
    getDocument() {
      return createDrawingDocument(document);
    },
    getDrawings() {
      return cloneDrawings(document.drawings);
    },
    add(drawing) {
      if (!getDrawingTool(drawing?.type)) throw new Error(`Drawing tool desconhecida: ${drawing?.type}`);
      setDrawings([...document.drawings, drawing]);
    },
    remove(id) {
      setDrawings(document.drawings.filter(item => item.id !== id));
    },
    replace(id, drawing, record = true) {
      if (!getDrawingTool(drawing?.type)) throw new Error(`Drawing tool desconhecida: ${drawing?.type}`);
      setDrawings(document.drawings.map(item => item.id === id ? drawing : item), record);
    },
    undo() {
      const state = history.undo();
      if (!state) return false;
      document = { ...document, drawings: state };
      return true;
    },
    redo() {
      const state = history.redo();
      if (!state) return false;
      document = { ...document, drawings: state };
      return true;
    },
    canUndo() { return history.canUndo(); },
    canRedo() { return history.canRedo(); }
  };
}