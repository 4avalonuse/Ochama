const registry = new Map();

export function registerStudy(descriptor) {
  if (!descriptor?.id || typeof descriptor.id !== 'string') {
    throw new Error('Study inválido: id obrigatório');
  }
  if (typeof descriptor.render !== 'function') {
    throw new Error(`Study inválido: render obrigatório — ${descriptor.id}`);
  }
  registry.set(descriptor.id, Object.freeze({ ...descriptor }));
  return descriptor;
}

export function getStudy(id) {
  return registry.get(id) || null;
}

export function listStudies() {
  return [...registry.values()];
}
