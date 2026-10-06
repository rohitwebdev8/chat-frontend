import { colors } from './colors';
import { spacing, radius } from './spacing';
import { typography } from './typography';
import { borders } from './borders';
import { shadows, getWebShadow } from './shadows';
import { TOUCH_TARGET, CONTENT_MAX_WIDTH, TAB_BAR_HEIGHT } from './layout';

const theme = {
  colors,
  spacing,
  radius,
  typography,
  borders,
  shadows,
  layout: {
    touchTarget: TOUCH_TARGET,
    contentMaxWidth: CONTENT_MAX_WIDTH,
    tabBarHeight: TAB_BAR_HEIGHT,
  },
} as const;

export { getWebShadow };
export type Theme = typeof theme;
export default theme;
