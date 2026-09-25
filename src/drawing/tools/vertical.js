import { registerDrawingTool } from '../core/drawing-registry.js';

export function verticalTool() {
  return {
    type: 'vertical',
    defaults: {},
    create(point) {
      return {
        id: crypto.randomUUID(),
        type: 'vertical',
        point: { ...point }
      };
    }
  };
}

export function verticalRenderer() {}
export function verticalHitTest() { return false; }

registerDrawingTool({
  type: 'vertical',
  name: 'Vertical',
  tool: verticalTool,
  renderer: verticalRenderer,
  hitTest: verticalHitTest,
  defaults: {}
});
