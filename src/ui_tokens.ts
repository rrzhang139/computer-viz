// ui_tokens.ts — single source of truth for colors, durations, easings
// Forbidden to invent new tokens in Phase 4. All level components consume from here.

export const colors = {
  data: '#3DA5FF',
  control: '#FFB23D',
  storage: '#9D6BFF',
  active: '#FF3D6E',
  passive: '#454F5B',
  bg: '#0E1116',
  fg: '#E6EDF3',
  edge: '#5C6873',
  edgeActiveData: '#3DA5FF',
  edgeActiveControl: '#FFB23D',
} as const;

export const durations = {
  zoomIn: 600,
  zoomOut: 500,
  highlightPulse: 800,
  electronDrift: 2000,
  signalPropagate: 400,
  viewToggle: 350,
} as const;

export const easings = {
  zoom: [0.16, 1, 0.3, 1] as const,
  pulse: [0.4, 0, 0.6, 1] as const,
  drift: 'linear' as const,
} as const;

export const strokes = {
  data: 2,
  control: 1.5,
  edge: 1,
  edgeActive: 2.5,
  outline: 1,
} as const;

export const fontSize = {
  label: 12,
  symbol: 14,
  title: 18,
  ruler: 10,
} as const;

export type ColorToken = keyof typeof colors;
export type DurationToken = keyof typeof durations;
