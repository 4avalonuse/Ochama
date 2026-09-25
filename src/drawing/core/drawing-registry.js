const registry = new Map();

export function registerDrawingTool(descriptor) {
  if (!descriptor?.type || typeof descriptor.type !== 'string') {
    throw new Error('Drawing tool inválida: type obrigatório');
  }
  if (typeof descriptor.tool !== 'function') {
    throw new Error(`Drawing tool inválida: ${descriptor.type}`);
  }
  if (typeof descriptor.renderer !== 'function') {
    throw new Error(`Drawing renderer inválido: ${descriptor.type}`);
  }
  if (typeof descriptor.hitTest !== 'function') {
    throw new Error(`Drawing hitTest inválido: ${descriptor.type}`);
  }
  registry.set(descriptor.type, Object.freeze({ ...descriptor }));
  return descriptor;
}

export function getDrawingTool(type) {
  return registry.get(type) || null;
}

export function hasDrawingTool(type) {
  return registry.has(type);
}

export function listDrawingTools() {
  return [...registry.values()];
}
