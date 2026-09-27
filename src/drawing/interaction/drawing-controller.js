import { createDrawingTransform } from '../render/transform.js';
import { createPlotGeometry } from '../../chart/plot-geometry.js';
import { getDrawingTool } from '../core/drawing-registry.js';
import { createChannelState, transitionChannel, isChannelState, CHANNEL_DRAWING_BASE, CHANNEL_ADJUSTING } from './channel-state.js';

function pointFromEvent(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function createTransform(viewport, canvas) {
  return createDrawingTransform({
    viewport,
    plot: createPlotGeometry(canvas.clientWidth, canvas.clientHeight)
  });
}

export function createDrawingInteraction({
  canvas,
  viewport,
  drawingManager,
  draw,
  drawPreview = null,
  onChanged = null,
  onComplete = null,
  drawSelection = null
}) {
  let activeTool = 'line';
  let draftStart = null;
  let selectedId = null;
  let moving = null;
  let movementRecorded = false;
  let drawingColor = '#60a5fa';
  let fibonacciMode = 'retracement';
  let draftPoints = [];
  let requestText = null;
  let channelState = createChannelState();
  let channelAdjustingGesture = false;
  let channelDraft = null;
  let lastTextTap = { time: 0, x: 0, y: 0 };

  function syncSelection() {
    drawSelection?.(selectedId);
  }

  function setTool(type) {
    if (!getDrawingTool(type)) return false;
    activeTool = type;
    draftStart = null;
    draftPoints = [];
    channelState = createChannelState();
    channelAdjustingGesture = false;
    channelDraft = null;
    moving = null;
    movementRecorded = false;
    selectedId = null;
    syncSelection();
    drawPreview?.(null);
    return true;
  }

  function selectAt(point) {
    const transform = createTransform(viewport, canvas);
    const drawings = drawingManager.getDrawings();
    for (let i = drawings.length - 1; i >= 0; i -= 1) {
      const drawing = drawings[i];
      const descriptor = getDrawingTool(drawing.type);
      const part = descriptor?.hitTestPart?.(point, drawing, transform);
      if (part) return { drawing, part };
      if (descriptor?.hitTest?.(point, drawing, transform)) return { drawing, part: 'body' };
    }
    return null;
  }

  function drawingDown(event) {
    const point = pointFromEvent(event, canvas);
    const transform = createTransform(viewport, canvas);
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
          syncSelection();
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
      selectedId = drawing.id;
      syncSelection();
      draw();
      onChanged?.();
      onComplete?.();
      return;
    }

    const pointCount = Math.max(2, Number(descriptor?.pointCount) || 2);

    // Canal: fluxo próprio em duas fases.
    // Fase 1 = A→B. Fase 2 = segundo toque/gesto define a largura.
    if (activeTool === 'channel') {
      if (isChannelState(channelState, CHANNEL_ADJUSTING) && channelDraft) {
        channelAdjustingGesture = true;
        channelDraft = { ...channelDraft, third: market };
        const preview = descriptor?.tool?.().create?.(
          channelDraft.start,
          channelDraft.end,
          viewport.getYScaleType(),
          drawingColor,
          { ...baseOptions, thirdPoint: market }
        );
        if (preview) drawPreview?.(preview);
        return;
      }

      channelState = transitionChannel(channelState, { type: 'START', point: market });
      draftStart = market;
      drawPreview?.(null);
      return;
    }

    // Outras ferramentas multi-ponto continuam no fluxo legado.
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
      selectedId = drawing.id;
      syncSelection();
      draw();
      onChanged?.();
      onComplete?.();
    }
  }

  function drawingMove(event) {
    const point = pointFromEvent(event, canvas);
    const transform = createTransform(viewport, canvas);
    const market = transform.screenToMarket(point);
    if (!market) return;

    const descriptor = getDrawingTool(activeTool);
    const pointCount = Math.max(2, Number(descriptor?.pointCount) || 2);
    const document = drawingManager.getDocument();
    const options = {
      mode: fibonacciMode,
      context: { symbol: document.symbol, provider: document.provider, interval: document.interval }
    };

    if (activeTool === 'channel' && isChannelState(channelState, CHANNEL_ADJUSTING) && channelDraft) {
      channelDraft.third = market;
      const preview = descriptor?.tool?.().create?.(
        channelDraft.start,
        channelDraft.end,
        viewport.getYScaleType(),
        drawingColor,
        { ...options, thirdPoint: market }
      );
      if (preview) drawPreview?.(preview);
      return;
    }

    if (activeTool === 'channel' && isChannelState(channelState, CHANNEL_DRAWING_BASE) && draftStart) {
      const preview = descriptor?.tool?.().create?.(
        draftStart,
        market,
        viewport.getYScaleType(),
        drawingColor,
        options
      );
      if (preview) drawPreview?.(preview);
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
    const transform = createTransform(viewport, canvas);
    const end = transform.screenToMarket(point);

    if (activeTool === 'channel' && isChannelState(channelState, CHANNEL_ADJUSTING)) {
      if (!channelAdjustingGesture) return;
      const draft = channelDraft;
      if (!draft || !end) return;

      const document = drawingManager.getDocument();
      const drawing = descriptor?.tool?.().create?.(
        draft.start,
        draft.end,
        viewport.getYScaleType(),
        drawingColor,
        {
          mode: fibonacciMode,
          context: { symbol: document.symbol, provider: document.provider, interval: document.interval },
          thirdPoint: end
        }
      );
      if (!drawing) return;

      channelState = transitionChannel(channelState, { type: 'RELEASE', point: end });
      channelAdjustingGesture = false;
      channelDraft = null;
      drawPreview?.(null);
      drawingManager.add(drawing);
      selectedId = drawing.id;
      syncSelection();
      draw();
      onChanged?.();
      onComplete?.();
      return;
    }

    // Canal: o primeiro release encerra A→B e entra no ajuste da largura.
    if (activeTool === 'channel' && isChannelState(channelState, CHANNEL_DRAWING_BASE)) {
      if (!draftStart || !end) {
        draftStart = null;
        drawPreview?.(null);
        return;
      }
      const start = draftStart;
      draftStart = null;
      channelState = transitionChannel(channelState, { type: 'RELEASE', point: end });
      channelAdjustingGesture = false;
      channelDraft = { start, end, third: end };
      const document = drawingManager.getDocument();
      const preview = descriptor?.tool?.().create?.(
        start,
        end,
        viewport.getYScaleType(),
        drawingColor,
        {
          mode: fibonacciMode,
          context: { symbol: document.symbol, provider: document.provider, interval: document.interval },
          thirdPoint: end
        }
      );
      if (preview) drawPreview?.(preview);
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
    syncSelection();
    draw();
    onChanged?.();
    onComplete?.();
  }

  function selectionDown(event) {
    const point = pointFromEvent(event, canvas);
    const hit = selectAt(point);
    const now = performance.now();
    const isDoubleTextTap = Boolean(
      hit?.drawing?.type === 'text' &&
      now - lastTextTap.time < 380 &&
      Math.hypot(point.x - lastTextTap.x, point.y - lastTextTap.y) < 18
    );

    lastTextTap = { time: now, x: point.x, y: point.y };
    selectedId = hit?.drawing?.id || null;
    syncSelection();

    if (isDoubleTextTap) {
      const textDrawing = hit.drawing;
      Promise.resolve(requestText?.(textDrawing.text || '')).then(value => {
        if (value == null || !drawingManager.getDrawings().some(item => item.id === textDrawing.id)) return;
        drawingManager.replace(textDrawing.id, { ...textDrawing, text: value }, true);
        selectedId = textDrawing.id;
        syncSelection();
        draw();
        onChanged?.();
      });
      return;
    }
    if (!hit?.drawing) {
      moving = null;
      draw();
      return;
    }

    const descriptor = getDrawingTool(hit.drawing.type);
    if (!descriptor?.move) return;

    moving = {
      id: hit.drawing.id,
      type: hit.drawing.type,
      part: hit.part || 'body',
      last: point
    };
    movementRecorded = false;
    draw();
  }

  function selectionMove(event) {
    if (!moving) return;
    const point = pointFromEvent(event, canvas);
    const dx = point.x - moving.last.x;
    const dy = point.y - moving.last.y;
    if (!dx && !dy) return;

    const drawing = drawingManager.getDrawings().find(item => item.id === moving.id);
    const descriptor = drawing ? getDrawingTool(drawing.type) : null;
    const transform = createTransform(viewport, canvas);

    if (drawing && descriptor?.move) {
      const next = descriptor.move(drawing, { dx, dy }, transform, moving.part);
      if (next) {
        drawingManager.replace(drawing.id, next, !movementRecorded);
        movementRecorded = true;
        moving.last = point;
        draw();
      }
    }
  }

  function selectionUp() {
    if (moving) onChanged?.();
    moving = null;
    movementRecorded = false;
  }

  return {
    setTool,
    cancelDrawing() {
      draftStart = null;
      draftPoints = [];
      channelState = createChannelState();
      channelAdjustingGesture = false;
      channelDraft = null;
      drawPreview?.(null);
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
    getSelectedId: () => selectedId,
    deleteSelected() {
      if (!selectedId) return false;
      drawingManager.remove(selectedId);
      selectedId = null;
      syncSelection();
      draw();
      onChanged?.();
      return true;
    },
    clearAll() {
      const cleared = drawingManager.clear();
      if (!cleared) return false;
      selectedId = null;
      syncSelection();
      moving = null;
      movementRecorded = false;
      draw();
      onChanged?.();
      return true;
    },
    handlers: {
      onDrawingDown: drawingDown,
      onDrawingMove: drawingMove,
      onDrawingUp: drawingUp,
      onSelectionDown: selectionDown,
      onSelectionMove: selectionMove,
      onSelectionUp: selectionUp
    }
  };
}
