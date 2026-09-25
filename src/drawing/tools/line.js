import { registerDrawingTool } from '../core/drawing-registry.js';

export function lineTool() {
  return {
    type: 'line',
    defaults: {},
    create(start, end) {
      return {
        id: crypto.randomUUID(),
        type: 'line',
        start: { ...start },
        end: { ...end }
      };
    }
  };
}

export function lineRenderer() {}
export function lineHitTest() { return false; }

registerDrawingTool({
  type: 'line',
  name: 'Linha',
  tool: lineTool,
  renderer: lineRenderer,
  hitTest: lineHitTest,
  defaults: {}
});
