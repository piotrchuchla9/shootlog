export const DISCIPLINE_LABELS: Record<string, string> = {
  pistol:  'Pistolet',
  shotgun: 'Strzelba',
  pcc:     'PCC',
  rifle:   'Karabinek',
  air:     'Action Air',
};

export const DISCIPLINE_EMOJI: Record<string, string> = {
  pistol:  '🔫',
  shotgun: '💥',
  pcc:     '🔧',
  rifle:   '🎯',
  air:     '💨',
};

export const DISCIPLINE_OPTIONS = [
  { value: '', label: 'Wszystkie' },
  { value: 'pistol',  label: '🔫 Pistolet' },
  { value: 'shotgun', label: '💥 Strzelba' },
  { value: 'pcc',     label: '🔧 PCC' },
  { value: 'rifle',   label: '🎯 Karabinek' },
  { value: 'air',     label: '💨 Action Air' },
];

export const LEVEL_COLORS: Record<number, string> = {
  1: '#6B7280',
  2: '#2563EB',
  3: '#D97706',
  4: '#7C3AED',
  5: '#DC2626',
};
