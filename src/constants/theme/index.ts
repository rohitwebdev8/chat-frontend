import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { borders } from './borders';
import { shadows } from './shadows';

const theme = {
  colors,
  spacing,
  typography,
  borders,
  shadows,
} as const;

export type Theme = typeof theme;
export default theme;
