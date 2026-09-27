const registry = new Map();

export const STUDY_PLACEMENTS = Object.freeze({
  OVERLAY: 'overlay',
  PANE: 'pane'
});

export function registerStudy(descriptor) {
  if (!descriptor?.id || typeof descriptor.id !== 'string') {
    throw new Error('Study inválido: id obrigatório');
  }
  if (typeof descriptor.render !== 'function') {
    throw new Error(`Study inválido: render obrigatório — ${descriptor.id}`);
  }

  const placement = descriptor.placement === STUDY_PLACEMENTS.PANE
    ? STUDY_PLACEMENTS.PANE
    : STUDY_PLACEMENTS.OVERLAY;

  registry.set(descriptor.id, Object.freeze({ ...descriptor, placement }));
  return descriptor;
}

export function getStudy(id) {
  return registry.get(id) || null;
}

export function listStudies() {
  return [...registry.values()];
}
