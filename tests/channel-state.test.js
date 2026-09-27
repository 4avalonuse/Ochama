import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHANNEL_IDLE,
  CHANNEL_DRAWING_BASE,
  CHANNEL_ADJUSTING,
  CHANNEL_COMPLETE,
  createChannelState,
  transitionChannel
} from '../src/drawing/interaction/channel-state.js';

test('channel: base -> adjusting -> complete', () => {
  let state = createChannelState();
  state = transitionChannel(state, { type: 'START' });
  assert.equal(state.phase, CHANNEL_DRAWING_BASE);
  state = transitionChannel(state, { type: 'RELEASE' });
  assert.equal(state.phase, CHANNEL_ADJUSTING);
  state = transitionChannel(state, { type: 'RELEASE' });
  assert.equal(state.phase, CHANNEL_COMPLETE);
});

test('channel: cancel during base returns to idle', () => {
  let state = transitionChannel(createChannelState(), { type: 'START' });
  state = transitionChannel(state, { type: 'CANCEL' });
  assert.equal(state.phase, CHANNEL_IDLE);
});

test('channel: cancel during adjustment preserves completed base phase', () => {
  let state = createChannelState();
  state = transitionChannel(state, { type: 'START' });
  state = transitionChannel(state, { type: 'RELEASE' });
  state = transitionChannel(state, { type: 'CANCEL' });
  assert.equal(state.phase, CHANNEL_COMPLETE);
});

test('channel: unknown events do not change state', () => {
  const state = transitionChannel({ phase: CHANNEL_ADJUSTING }, { type: 'UNKNOWN' });
  assert.equal(state.phase, CHANNEL_ADJUSTING);
});
