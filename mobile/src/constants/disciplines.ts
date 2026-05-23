export const DISCIPLINE_LABELS: Record<string, string> = {
  pistol:    'Pistolet',
  shotgun:   'Strzelba',
  pcc:       'PCC',
  rifle:     'Karabinek',
  air:       'Action Air',
  longrange: 'Long Range',
};

export const DISCIPLINE_EMOJI: Record<string, string> = {
  pistol:    '🔫',
  shotgun:   '💥',
  pcc:       '🔧',
  rifle:     '🎯',
  air:       '💨',
  longrange: '🔭',
};

export const DISCIPLINE_OPTIONS = [
  { value: '',          label: 'Wszystkie' },
  { value: 'pistol',    label: 'Pistolet' },
  { value: 'shotgun',   label: 'Strzelba' },
  { value: 'pcc',       label: 'PCC' },
  { value: 'rifle',     label: 'Karabinek' },
  { value: 'air',       label: 'Action Air' },
  { value: 'longrange', label: 'Long Range' },
];

// Tactical Sport palette — approximate oklch(0.68 0.16 hue) per discipline
export const DISCIPLINE_COLORS: Record<string, string> = {
  pistol:    '#2EA96B',  // hue 145 — green
  shotgun:   '#C98B35',  // hue 35  — amber
  pcc:       '#3E8ED5',  // hue 215 — blue
  rifle:     '#D95F4B',  // hue 4   — coral red
  air:       '#7B5ED0',  // hue 260 — violet
  longrange: '#8B7355',  // hue 28  — tan/brown (precision rifle)
};

export const DISCIPLINE_SHORTS: Record<string, string> = {
  pistol:    'PST',
  shotgun:   'STR',
  pcc:       'PCC',
  rifle:     'KAR',
  air:       'AAR',
  longrange: 'LR',
};

export const LEVEL_COLORS: Record<number, string> = {
  1: '#6B7280',
  2: '#2563EB',
  3: '#D97706',
  4: '#7C3AED',
  5: '#DC2626',
};
