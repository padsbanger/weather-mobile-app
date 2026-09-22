import { frameKey, type RadarFrame } from '../../providers/rainviewer.ts';

export type RadarSlot = { frame: RadarFrame; id: string; ready: boolean };
export type Playback = {
  displayed: RadarSlot | null; staged: RadarSlot | null; sequence: number;
  playing: boolean; wanted: boolean; error: boolean;
};
export const INITIAL_PLAYBACK: Playback = { displayed: null, staged: null, sequence: 0, playing: false, wanted: false, error: false };
export type PlaybackAction =
  | { type: 'select' | 'preload'; frame: RadarFrame }
  | { type: 'loaded' | 'failed'; id: string }
  | { type: 'play' | 'pause' | 'advance' | 'cancel' };

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
      return state.wanted
        ? { ...state, displayed: { ...state.staged, ready: true }, staged: null, wanted: false }
        : { ...state, staged: { ...state.staged, ready: true } };
    case 'failed':
      if (state.staged?.id !== action.id) return state;
      return { ...state, staged: null, playing: false, wanted: false, error: true };
    case 'play': return { ...state, playing: true, error: false };
    case 'pause': return { ...state, playing: false };
    case 'advance':
      if (!state.staged) return state;
      return state.staged.ready
        ? { ...state, displayed: state.staged, staged: null, wanted: false }
        : { ...state, wanted: true };
    case 'cancel': return { ...state, staged: null, wanted: false };
  }
}
