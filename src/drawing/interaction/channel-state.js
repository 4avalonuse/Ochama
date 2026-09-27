export const CHANNEL_IDLE = 'idle';
export const CHANNEL_DRAWING_BASE = 'drawing-base';
export const CHANNEL_ADJUSTING = 'adjusting';
export const CHANNEL_COMPLETE = 'complete';

export function createChannelState() {
  return { phase: CHANNEL_IDLE };
}

export function transitionChannel(state, event) {
  const current = state || createChannelState();
  const type = event?.type;

  switch (current.phase) {
    case CHANNEL_IDLE:
      if (type === 'START') return { phase: CHANNEL_DRAWING_BASE };
      return current;

    case CHANNEL_DRAWING_BASE:
      if (type === 'RELEASE') return { phase: CHANNEL_ADJUSTING };
      if (type === 'CANCEL') return createChannelState();
      return current;

    case CHANNEL_ADJUSTING:
      if (type === 'RELEASE') return { phase: CHANNEL_COMPLETE };
      if (type === 'CANCEL') return { phase: CHANNEL_COMPLETE };
      return current;

    case CHANNEL_COMPLETE:
      return current;

    default:
      return createChannelState();
  }
}

export function isChannelState(state, phase) {
  return state?.phase === phase;
}
