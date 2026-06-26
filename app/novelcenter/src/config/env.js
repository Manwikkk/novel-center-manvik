import { Platform } from 'react-native';

const FALLBACK = Platform.select({
  android: 'http://10.0.2.2:4000',
  ios: 'http://localhost:4000',
  default: 'http://localhost:4000',
});

// Override at runtime by setting NC_API_URL via Metro's --env flags or by
// editing this file. Devices on physical hardware should use the LAN IP of
// the dev machine (e.g. http://192.168.1.42:4000).
// export const API_BASE_URL = process?.env?.NC_API_URL || FALLBACK;

export const API_BASE_URL = 'https://unexaggerated-angelina-sustenanceless.ngrok-free.dev';

export const API_URL = `${API_BASE_URL.replace(/\/$/, '')}/api/v1`;
