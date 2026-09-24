import { frameKey, type RadarFrame } from '../../providers/rainviewer.ts';

export type RadarSlot = { frame: RadarFrame; id: string; ready: boolean };
export type Playback = {
  displayed: RadarSlot | null; staged: RadarSlot | null; cached: RadarSlot[]; sequence: number;
  playing: boolean; wanted: boolean; error: boolean;
};
export const INITIAL_PLAYBACK: Playback = { displayed: null, staged: null, cached: [], sequence: 0, playing: false, wanted: false, error: false };
export type PlaybackAction =
  | { type: 'select' | 'preload'; frame: RadarFrame }
  | { type: 'loaded' | 'failed'; id: string }
  | { type: 'show'; frame: RadarFrame }
  | { type: 'prune'; frames: RadarFrame[] }
  | { type: 'play' | 'pause' | 'advance' | 'cancel' | 'invalidate' | 'cacheDisplayed' | 'clearError' };

export function nextFrame(frames: RadarFrame[], displayed: RadarFrame | undefined): RadarFrame | undefined {
  if (!frames.length) return undefined;
  const index = displayed ? frames.findIndex((frame) => frameKey(frame) === frameKey(displayed)) : -1;
  return frames[(index + 1) % frames.length];
}
export function playbackReducer(state: Playback, action: PlaybackAction): Playback {
  switch (action.type) {
    case 'select':
    case 'preload': {
      const wanted = action.type === 'select';
      if (state.displayed && frameKey(state.displayed.frame) === frameKey(action.frame)) {
        return wanted ? { ...state, playing: false, staged: null, wanted: false, error: false } : state;
      }
      const cached = state.cached.find(slot => frameKey(slot.frame) === frameKey(action.frame));
      if (cached) return wanted ? { ...state, displayed: cached, staged: null, playing: false, wanted: false, error: false } : state;
      if (state.staged && frameKey(state.staged.frame) === frameKey(action.frame)) {
        if (!wanted) return state;
        return state.staged.ready
          ? { ...state, displayed: state.staged, staged: null, playing: false, wanted: false, error: false }
          : { ...state, wanted: true, playing: false };
      }
      const sequence = state.sequence + 1;
      return { ...state, sequence, staged: { frame: action.frame, id: `radar-${sequence}`, ready: false },
        wanted, playing: wanted ? false : state.playing, error: false };
    }
    case 'loaded':
      if (state.staged?.id !== action.id || state.staged.ready) return state; // Late/duplicate native events.
      return {
        ...state, displayed: state.wanted ? { ...state.staged, ready: true } : state.displayed,
        cached: [...state.cached, { ...state.staged, ready: true }], staged: null, wanted: false,
      };
    case 'failed':
      if (state.staged?.id !== action.id) return state;
      return { ...state, staged: null, playing: false, wanted: false, error: true };
    case 'play': return { ...state, playing: true, error: false };
    case 'pause': return { ...state, playing: false };
    case 'clearError': return state.error ? { ...state, error: false } : state;
    case 'show': {
      const slot = state.cached.find(item => frameKey(item.frame) === frameKey(action.frame));
      return slot ? { ...state, displayed: slot } : state;
    }
    case 'cacheDisplayed': {
      const slot = state.displayed;
      return slot && !state.cached.some(item => item.id === slot.id)
        ? { ...state, cached: [...state.cached, slot] } : state;
    }
    case 'prune': {
      const valid = new Set(action.frames.map(frameKey));
      const cached = state.cached.filter(slot => valid.has(frameKey(slot.frame)));
      const staged = state.staged && valid.has(frameKey(state.staged.frame)) ? state.staged : null;
      return cached.length === state.cached.length && staged === state.staged ? state : { ...state, cached, staged, wanted: staged ? state.wanted : false };
    }
    case 'invalidate': return { ...state, cached: [], staged: null, wanted: false };
    case 'advance':
      if (!state.staged) return state;
      return state.staged.ready
        ? { ...state, displayed: state.staged, staged: null, wanted: false }
        : { ...state, wanted: true };
    case 'cancel': return { ...state, staged: null, wanted: false };
  }
}
