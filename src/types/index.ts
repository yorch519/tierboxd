export interface Movie {
  id: string;
  title: string;
  year: number;
  originalRating: number | null;
  posterUrl: string | null;
  tmdbId: string | null;
}

export interface Tier {
  id: string;
  name: string;
  color: string;
  starRating: number;
}

export type AppView = 'home' | 'import' | 'board';

export type ImportMode = 'merge' | 'replace';

export type TierTemplateId = 'stars' | 'sabcd' | 'numeric';

export interface TierMovies {
  [tierId: string]: string[];
}

export interface Board {
  id: string;
  name: string;
  origin: 'letterboxd' | 'manual';
  movies: Movie[];
  tiers: Tier[];
  tierMovies: TierMovies;
  createdAt: number;
  updatedAt: number;
}

export interface BoardSnapshot {
  movies: Movie[];
  tiers: Tier[];
  tierMovies: TierMovies;
}

export interface BoardHistory {
  past: BoardSnapshot[];
  future: BoardSnapshot[];
}
