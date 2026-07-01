import { Platform } from 'react-native';

// Must match `PORT` in server/.env (example default is 4000).
const API_PORT = 3008;

const HOST = Platform.select({
  android: '10.0.2.2',
  ios: 'localhost',
  default: 'localhost',
});

const FALLBACK = `http://${HOST}:${API_PORT}`;

// Physical device or custom tunnel: set your machine's LAN IP or ngrok base URL.
// Examples: 'http://192.168.1.42:4000'  |  'https://abc123.ngrok-free.dev'
export const DEV_API_OVERRIDE = null;

export const API_BASE_URL = (DEV_API_OVERRIDE || FALLBACK).replace(/\/$/, '');
export const API_URL = `${API_BASE_URL}/api/v1`;
