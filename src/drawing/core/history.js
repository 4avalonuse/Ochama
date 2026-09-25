function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createHistory(initialState = []) {
  let past = [];
  let present = clone(initialState);
  let future = [];
  let sequence = 0;

  function commit(nextState) {
    past.push({ sequence: ++sequence, timestamp: Date.now(), state: clone(present) });
    present = clone(nextState);
    future = [];
    return clone(present);
  }

  return {
    getState() { return clone(present); },
    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; },
    commit,
    undo() {
      if (!past.length) return null;
      future.push({ sequence: ++sequence, timestamp: Date.now(), state: clone(present) });
      present = clone(past.pop().state);
      return clone(present);
    },
    redo() {
      if (!future.length) return null;
      past.push({ sequence: ++sequence, timestamp: Date.now(), state: clone(present) });
      present = clone(future.pop().state);
      return clone(present);
    }
  };
}
