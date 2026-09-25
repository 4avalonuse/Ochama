import { registerDrawingTool } from '../core/drawing-registry.js';

export function horizontalTool() {
  return {
    type: 'horizontal',
    defaults: {},
    create(point) {
      return {
        id: crypto.randomUUID(),
        type: 'horizontal',
        point: { ...point }
      };
    }
  };
}

export function horizontalRenderer() {}
export function horizontalHitTest() { return false; }

registerDrawingTool({
  type: 'horizontal',
  name: 'Horizontal',
  tool: horizontalTool,
  renderer: horizontalRenderer,
  hitTest: horizontalHitTest,
  defaults: {}
});
