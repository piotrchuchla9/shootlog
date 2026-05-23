import { Platform } from 'react-native';

export const D2 = {
  bg:         '#0c0b0a',
  surface:    '#181613',
  surfaceHi:  '#221f1b',
  stroke:     'rgba(255,255,255,0.06)',
  strokeHi:   'rgba(255,255,255,0.13)',
  text:       '#f5efe6',
  textSub:    'rgba(245,239,230,0.62)',
  textMute:   'rgba(245,239,230,0.38)',
  textFaint:  'rgba(245,239,230,0.18)',
  accent:     '#F97316',
  red:        '#FF4444',
} as const;

export const MONO = Platform.select({
  ios:     'Menlo',
  android: 'monospace',
  default: 'monospace',
}) as string;
