import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'System',
  android: 'Roboto',
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  default: 'System',
});

export const typography = {
  // ─── Display / Hero Numbers ─────────────────────────────
  hero: { fontSize: 36, fontWeight: '800' as const, letterSpacing: -0.5, fontFamily },
  stat: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5, fontFamily },

  // ─── Headings ───────────────────────────────────────────
  heading1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3, fontFamily },
  heading2: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.2, fontFamily },
  heading3: { fontSize: 17, fontWeight: '600' as const, fontFamily },

  // ─── Body ───────────────────────────────────────────────
  title: { fontSize: 17, fontWeight: '600' as const, fontFamily },
  subtitle: { fontSize: 15, fontWeight: '500' as const, lineHeight: 20, fontFamily },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22, fontFamily },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18, fontFamily },

  // ─── Captions & Labels ─────────────────────────────────
  caption: { fontSize: 12, fontWeight: '500' as const, fontFamily },
  captionSmall: { fontSize: 11, fontWeight: '500' as const, fontFamily },
  overline: { fontSize: 10, fontWeight: '700' as const, letterSpacing: 1, textTransform: 'uppercase' as const, fontFamily },

  // ─── Buttons & Actions ─────────────────────────────────
  button: { fontSize: 15, fontWeight: '600' as const, letterSpacing: 0.2, fontFamily },
  buttonSmall: { fontSize: 13, fontWeight: '600' as const, fontFamily },

  // ─── Tab Bar ────────────────────────────────────────────
  tabLabel: { fontSize: 10, fontWeight: '600' as const, fontFamily },
};
