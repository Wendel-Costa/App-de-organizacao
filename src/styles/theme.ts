export const colors = {
  primary:       '#F5C518',
  primaryLight:  '#FFF3B0',
  primaryDark:   '#C49A00',

  peach:         '#FFCBA4',
  rose:          '#F9B8C4',
  mint:          '#B8E8C8',
  sky:           '#B8D8F8',

  background:    '#FAFAF5',
  surface:       '#FFFFFF',
  surfaceAlt:    '#F5F0E8',
  border:        '#EDE8DC',
  divider:       '#F0EBE0',

  textPrimary:   '#2A2318',
  textSecondary: '#7A6E5F',
  textDisabled:  '#BFB8AB',
  textOnPrimary: '#2A2318',

  priorityHigh:  '#FF6B6B',
  priorityMed:   '#FFB347',
  priorityLow:   '#82C8A0',

  success:       '#5DB88A',
  warning:       '#F5A623',
  error:         '#E05252',
  info:          '#5B9BD5',
};

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
};

export const radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 999,
};

export const typography = {
  h1:    { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  h2:    { fontSize: 22, fontWeight: '700' as const, lineHeight: 30 },
  h3:    { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  body:  { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  sm:    { fontSize: 13, fontWeight: '400' as const, lineHeight: 19 },
  xs:    { fontSize: 11, fontWeight: '400' as const, lineHeight: 16 },
  label: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
};

export const shadow = {
  sm: {
    shadowColor: '#2A2318',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#2A2318',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#2A2318',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
  },
};