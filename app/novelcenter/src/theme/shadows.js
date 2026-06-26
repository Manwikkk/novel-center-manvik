import { Platform } from 'react-native';

// Cross-platform shadow recipes. Android uses elevation; iOS uses shadow*.
function shadow(elevation, opacity = 0.08, radius = 6, offsetY = 3) {
  return Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
    },
    android: { elevation },
    default: {},
  });
}

export const shadows = {
  none: shadow(0, 0, 0, 0),
  card: shadow(2, 0.06, 6, 3),
  book: shadow(4, 0.10, 12, 6),
  modal: shadow(10, 0.16, 20, 10),
  bar: shadow(6, 0.10, 12, -4),
};
