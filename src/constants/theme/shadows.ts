import { Platform } from 'react-native';

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  soft: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  elevated: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  fab: {
    shadowColor: '#0066FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  small: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

/**
 * Returns a web-compatible box shadow string or native shadow styles.
 */
export function getWebShadow(level: keyof typeof shadows): Record<string, unknown> {
  if (Platform.OS === 'web') {
    switch (level) {
      case 'none':
        return { boxShadow: 'none' };
      case 'soft':
        return { boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)' };
      case 'card':
        return { boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)' };
      case 'medium':
        return { boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)' };
      case 'elevated':
        return { boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)' };
      case 'fab':
        return { boxShadow: '0 4px 8px rgba(0, 102, 255, 0.3)' };
      default:
        return {};
    }
  }
  return shadows[level] || {};
}
