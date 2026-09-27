import {
  createChannelState,
  transitionChannel,
  isChannelState,
  CHANNEL_DRAWING_BASE,
  CHANNEL_ADJUSTING
} from './channel-state.js';

function buildOptions(fibonacciMode, document) {
  return {
    mode: fibonacciMode,
    context: {
      symbol: document.symbol,
      provider: document.provider,
      interval: document.interval
    }
  };
}

export function createChannelInteraction({
  getDescriptor,
  getScaleType,
  getColor,
  getFibonacciMode,
  getDocument,
  createPreview,
  commitDrawing,
  clearPreview
}) {
  let state = createChannelState();
  let draftStart = null;
  let channelDraft = null;
  let adjustingGesture = false;

  function reset() {
    state = createChannelState();
    draftStart = null;
    channelDraft = null;
    adjustingGesture = false;
    clearPreview?.();
  }

  function start(market) {
    const descriptor = getDescriptor?.();
    if (!descriptor) return false;

    if (isChannelState(state, CHANNEL_ADJUSTING) && channelDraft) {
      adjustingGesture = true;
      channelDraft = { ...channelDraft, third: market };
      const preview = descriptor.tool?.().create?.(
        channelDraft.start,
        channelDraft.end,
        getScaleType(),
        getColor(),
        {
          ...buildOptions(getFibonacciMode(), getDocument()),
          thirdPoint: market
        }
      );
      if (preview) createPreview?.(preview);
      return true;
    }

    state = transitionChannel(state, { type: 'START', point: market });
    draftStart = market;
    clearPreview?.();
    return true;
  }

  function move(market) {
    const descriptor = getDescriptor?.();
    if (!descriptor) return false;

    if (isChannelState(state, CHANNEL_ADJUSTING) && channelDraft) {
      channelDraft.third = market;
      const preview = descriptor.tool?.().create?.(
        channelDraft.start,
        channelDraft.end,
        getScaleType(),
        getColor(),
        {
          ...buildOptions(getFibonacciMode(), getDocument()),
          thirdPoint: market
        }
      );
      if (preview) createPreview?.(preview);
      return true;
    }

    if (isChannelState(state, CHANNEL_DRAWING_BASE) && draftStart) {
      const preview = descriptor.tool?.().create?.(
        draftStart,
        market,
        getScaleType(),
        getColor(),
        buildOptions(getFibonacciMode(), getDocument())
      );
      if (preview) createPreview?.(preview);
      return true;
    }

    return false;
  }

  function end(market) {
    const descriptor = getDescriptor?.();
    if (!descriptor) return false;

    if (isChannelState(state, CHANNEL_ADJUSTING)) {
      if (!adjustingGesture || !market) return true;

      const draft = channelDraft;
      if (!draft) return true;

      const drawing = descriptor.tool?.().create?.(
        draft.start,
        draft.end,
        getScaleType(),
        getColor(),
        {
          ...buildOptions(getFibonacciMode(), getDocument()),
          thirdPoint: market
        }
      );
      if (!drawing) return true;

      state = transitionChannel(state, { type: 'RELEASE', point: market });
      adjustingGesture = false;
      channelDraft = null;
      clearPreview?.();
      commitDrawing?.(drawing);
      return true;
    }

    if (isChannelState(state, CHANNEL_DRAWING_BASE)) {
      if (!draftStart || !market) {
        draftStart = null;
        clearPreview?.();
        return true;
      }

      const startPoint = draftStart;
      draftStart = null;
      state = transitionChannel(state, { type: 'RELEASE', point: market });
      adjustingGesture = false;
      channelDraft = {
        start: startPoint,
        end: market,
        third: market
      };

      const preview = descriptor.tool?.().create?.(
        startPoint,
        market,
        getScaleType(),
        getColor(),
        {
          ...buildOptions(getFibonacciMode(), getDocument()),
          thirdPoint: market
        }
      );
      if (preview) createPreview?.(preview);
      return true;
    }

    return false;
  }

  return {
    start,
    move,
    end,
    reset,
    getState: () => state
  };
}
