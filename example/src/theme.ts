import type { TextStyle } from 'react-native';

export const BRAND_COLORS = {
  accent: '#4fbeff',
  background: '#F4F4F5',
  surface: '#FFFFFF',
  foreground: '#111111',
  muted: '#666A73',
  border: '#D9D9DE',
  destructive: '#FF3B30',
};

export const BRAND_FONT_FAMILY = 'Sora';
export const BRAND_HEADING_WEIGHT: TextStyle['fontWeight'] =
  process.env.EXPO_OS === 'android' ? '400' : '800';
export const BRAND_TAB_LABEL_WEIGHT: TextStyle['fontWeight'] =
  process.env.EXPO_OS === 'android' ? '400' : '600';
export const BRAND_TAB_LABEL_SELECTED_WEIGHT: TextStyle['fontWeight'] =
  process.env.EXPO_OS === 'android' ? '400' : '700';

export const BRAND_FONTS = {
  [BRAND_FONT_FAMILY]: require('../assets/fonts/Sora.ttf'),
};

export const brandText: TextStyle = {
  fontFamily: BRAND_FONT_FAMILY,
};

export const brandHeadingText: TextStyle = {
  fontFamily: BRAND_FONT_FAMILY,
  fontWeight: BRAND_HEADING_WEIGHT,
};
