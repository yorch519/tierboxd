import type { Tier } from '../types';

export const DEFAULT_TIERS: Tier[] = [
  { id: '5.0', name: '\u2605\u2605\u2605\u2605\u2605', color: '#CC0000', starRating: 5.0 },
  { id: '4.5', name: '\u2605\u2605\u2605\u2605\u00BD', color: '#E63900', starRating: 4.5 },
  { id: '4.0', name: '\u2605\u2605\u2605\u2605', color: '#FF6A00', starRating: 4.0 },
  { id: '3.5', name: '\u2605\u2605\u2605\u00BD', color: '#FF9E00', starRating: 3.5 },
  { id: '3.0', name: '\u2605\u2605\u2605', color: '#FFCC00', starRating: 3.0 },
  { id: '2.5', name: '\u2605\u2605\u00BD', color: '#A0D000', starRating: 2.5 },
  { id: '2.0', name: '\u2605\u2605', color: '#40C020', starRating: 2.0 },
  { id: '1.5', name: '\u2605\u00BD', color: '#00C040', starRating: 1.5 },
  { id: '1.0', name: '\u2605', color: '#0098FF', starRating: 1.0 },
  { id: '0.5', name: '\u00BD', color: '#7030FF', starRating: 0.5 },
];

export const LS_KEYS = {
  TMDB_KEY: 'tierboxd_tmdb_key',
  STATE: 'tierboxd_state',
} as const;

export const TMDB_POSTER_BASE = 'https://image.tmdb.org/t/p/w342';
export const TMDB_IMAGE_ORIGIN = 'https://image.tmdb.org';
export const TMDB_IMAGE_PROXY = '/api/image';
export const TMDB_API_BASE = '/api/tmdb';
export const TMDB_KEY_HEADER = 'x-tmdb-key';
