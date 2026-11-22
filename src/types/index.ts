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

export type AppView = 'import' | 'board';

export interface TierMovies {
  [tierId: string]: Movie[];
}
