import { getDrawingTool } from '../core/drawing-registry.js';

export function createDrawingRenderer() {
  return {
    render(context, drawings, transform) {
      for (const drawing of drawings || []) {
        const descriptor = getDrawingTool(drawing.type);
        if (!descriptor) continue;
        descriptor.renderer(context, drawing, transform);
      }
    }
  };
}
