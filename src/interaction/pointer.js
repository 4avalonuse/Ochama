import { InteractionManager } from './manager.js';

export function attachPointerInteraction(options) {
  const manager = new InteractionManager(options);
  manager.attach();
  return manager;
}
