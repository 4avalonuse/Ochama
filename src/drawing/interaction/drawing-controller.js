import { createDrawingTransform } from '../render/transform.js?v=20260927-30';
import { createPlotGeometry } from '../../chart/plot-geometry.js';
import { getDrawingTool } from '../core/drawing-registry.js';
import { createChannelInteraction } from './channel-interaction.js';
import { createDrawingSelection } from './drawing-selection.js';

function pointFromEvent(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function createTransform(viewport, canvas, getPlot = null) {
  const plot = getPlot?.() || createPlotGeometry(canvas.clientWidth, canvas.clientHeight);
  return createDrawingTransform({ viewport, plot });
}

export function createDrawingInteraction({
  canvas,
  viewport,
  drawingManager,
  draw,
  drawPreview = null,
  onChanged = null,
  onComplete = null,
  drawSelection = null,
  getPlot = null
}) {
  let activeTool = 'line';
  let draftStart = null;
    let drawingColor = '#60a5fa';
  let fibonacciMode = 'retracement';
  let draftPoints = [];
  let requestText = null;
  let selectedId = null;

  const channelInteraction = createChannelInteraction({
    getDescriptor: () => getDrawingTool('channel'),
    getScaleType: () => viewport.getYScaleType(),
    getColor: () => drawingColor,
    getFibonacciMode: () => fibonacciMode,
    getDocument: () => drawingManager.getDocument(),
    createPreview: preview => drawPreview?.(preview),
    clearPreview: () => drawPreview?.(null),
    commitDrawing: drawing => {
      drawingManager.add(drawing);
      selection.setSelectedId(drawing.id);
      draw();
      onChanged?.();
      onComplete?.();
    }
  });

  const selection = createDrawingSelection({
    canvas,
    viewport,
    drawingManager,
    draw,
    drawSelection,
    getTextEditor: () => requestText,
    onChanged,
    getPlot
  });

  function setTool(type) {
    if (!getDrawingTool(type)) return false;
    activeTool = type;
    draftStart = null;
    draftPoints = [];
    channelInteraction.reset();
    selection.setSelectedId(null);
    drawPreview?.(null);
    return true;
  }

  function drawingDown(event) {
    const point = pointFromEvent(event, canvas);
    const transform = createTransform(viewport, canvas, getPlot);
    const market = transform.screenToMarket(point);
    if (!market) return;

    const descriptor = getDrawingTool(activeTool);
    const document = drawingManager.getDocument();
    const baseOptions = {
      mode: fibonacciMode,
      context: { symbol: document.symbol, provider: document.provider, interval: document.interval }
    };

    if (descriptor?.singlePoint) {
      if (activeTool === 'text') {
        Promise.resolve(requestText?.('')).then(value => {
          if (!value) return;
          const drawing = descriptor.tool?.().create?.(
            market, null, viewport.getYScaleType(), drawingColor, { ...baseOptions, text: value }
          );
          if (!drawing) return;
          drawingManager.add(drawing);
          selectedId = drawing.id;
          selection.setSelectedId(selectedId);
          draw();
          onChanged?.();
          onComplete?.();
        });
        return;
      }
      const drawing = descriptor.tool?.().create?.(
        market, null, viewport.getYScaleType(), drawingColor, baseOptions
      );
      if (!drawing) return;
      drawingManager.add(drawing);
      selection.setSelectedId(drawing.id);
      draw();
      onChanged?.();
      onComplete?.();
      return;
    }

    const pointCount = Math.max(2, Number(descriptor?.pointCount) || 2);

    // Canal: fluxo próprio em duas fases, isolado no módulo de interação.
    if (activeTool === 'channel') {
      channelInteraction.start(market);
      return;
    }

    // Ferramentas de dois pontos usam o mesmo gesto da linha: pressionar,
    // arrastar com preview vivo e soltar para criar.
    if (pointCount === 2) {
      draftStart = market;
      draftPoints = [];
      drawPreview?.(null);
      return;
    }

    // Ferramentas multi-ponto continuam no fluxo legado.
    draftPoints.push(market);
    draftStart = null;

    if (draftPoints.length >= pointCount) {
      const startPoint = draftPoints[0];
      const endPoint = draftPoints[1];
      const options = { ...baseOptions, thirdPoint: draftPoints[2] };
      const drawing = descriptor?.tool?.().create?.(
        startPoint, endPoint, viewport.getYScaleType(), drawingColor, options
      );
      draftPoints = [];
      drawPreview?.(null);
      if (!drawing) return;
      drawingManager.add(drawing);
      selection.setSelectedId(drawing.id);
      draw();
      onChanged?.();
      onComplete?.();
    }
  }

  function drawingMove(event) {
    const point = pointFromEvent(event, canvas);
    const transform = createTransform(viewport, canvas, getPlot);
    const market = transform.screenToMarket(point);
    if (!market) return;

    const descriptor = getDrawingTool(activeTool);
    const pointCount = Math.max(2, Number(descriptor?.pointCount) || 2);
    const document = drawingManager.getDocument();
    const options = {
      mode: fibonacciMode,
      context: { symbol: document.symbol, provider: document.provider, interval: document.interval }
    };

    if (activeTool === 'channel' && channelInteraction.move(market)) {
      return;
    }

    if (pointCount === 2 && draftStart) {
      const preview = descriptor?.tool?.().create?.(
        draftStart, market, viewport.getYScaleType(), drawingColor, options
      );
      if (preview) drawPreview?.(preview);
      return;
    }

    if (pointCount < 3 || !draftPoints.length) return;

    const startPoint = draftPoints[0];
    const endPoint = draftPoints[1] || market;
    if (draftPoints.length >= 2) options.thirdPoint = market;

    const preview = descriptor?.tool?.().create?.(
      startPoint, endPoint, viewport.getYScaleType(), drawingColor, options
    );
    if (preview) drawPreview?.(preview);
  }



  function drawingUp(event) {
    const descriptor = getDrawingTool(activeTool);
    const pointCount = Math.max(2, Number(descriptor?.pointCount) || 2);

    const point = pointFromEvent(event, canvas);
    const transform = createTransform(viewport, canvas, getPlot);
    const end = transform.screenToMarket(point);

    if (activeTool === 'channel' && channelInteraction.end(end)) {
      return;
    }

    // Multi-point tools finish on the final tap, not on pointer release.
    if (pointCount >= 3) return;
    if (!draftStart) return;

    const start = draftStart;
    draftStart = null;
    drawPreview?.(null);
    if (!end) return;

    const document = drawingManager.getDocument();
    const drawing = descriptor?.tool?.().create?.(
      start, end, viewport.getYScaleType(), drawingColor,
      {
        mode: fibonacciMode,
        context: { symbol: document.symbol, provider: document.provider, interval: document.interval }
      }
    );
    if (!drawing) return;

    drawingManager.add(drawing);
    selectedId = drawing.id;
    selection.setSelectedId(selectedId);
    draw();
    onChanged?.();
    onComplete?.();
  }

  return {
    setTool,
    cancelDrawing() {
      draftStart = null;
      draftPoints = [];
      channelInteraction.reset();
      return true;
    },
    setTextEditor(editor) { requestText = editor; },
    getTool: () => activeTool,
    getColor: () => drawingColor,
    getFibonacciMode: () => fibonacciMode,
    setFibonacciMode(mode) {
      fibonacciMode = mode === 'extension' ? 'extension' : 'retracement';
      return fibonacciMode;
    },
    setColor(color) {
      if (typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color)) return false;
      drawingColor = color;
      const selectedId = selection.getSelectedId();
      if (selectedId) {
        const drawing = drawingManager.getDrawings().find(item => item.id === selectedId);
        if (drawing) {
          drawingManager.replace(selectedId, { ...drawing, color }, true);
          draw();
          onChanged?.();
        }
      }
      return true;
    },
    getSelectedId: () => selection.getSelectedId(),
    deleteSelected() {
      return selection.deleteSelected();
    },
    clearAll() {
      return selection.clearAll();
    },
    handlers: {
      onDrawingDown: drawingDown,
      onDrawingMove: drawingMove,
      onDrawingUp: drawingUp,
      onSelectionDown: selection.onDown,
      onSelectionMove: selection.onMove,
      onSelectionUp: selection.onUp
    }
  };
}
