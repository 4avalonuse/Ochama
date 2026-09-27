import { registerStudy, STUDY_PLACEMENTS } from './study-registry.js';

export function registerPaneStudy(descriptor) {
  return registerStudy({
    ...descriptor,
    placement: STUDY_PLACEMENTS.PANE
  });
}
