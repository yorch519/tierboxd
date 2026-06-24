import { create } from 'zustand';
import type { Movie, Tier, AppView, TierMovies } from '../types';
import { DEFAULT_TIERS, LS_KEYS } from '../lib/constants';

interface AppState {
  movies: Movie[];
  tiers: Tier[];
  tierMovies: TierMovies;
  tmdbKey: string | null;
  view: AppView;
  isLoadingPosters: boolean;

  setTmdbKey: (key: string) => void;
  clearTmdbKey: () => void;
  setMovies: (movies: Movie[]) => void;
  setPosterForMovie: (id: string, posterUrl: string | null) => void;
  setLoadingPosters: (loading: boolean) => void;
  moveMovie: (movieId: string, toTierId: string | null) => void;
  insertMovie: (movieId: string, tierId: string, beforeMovieId?: string) => void;
  updateTier: (tierId: string, updates: Partial<Tier>) => void;
  addTier: () => void;
  removeTier: (tierId: string) => void;
  setView: (view: AppView) => void;
  reset: () => void;
}

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEYS.STATE);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveState(state: Partial<AppState>) {
  try {
    const saved = {
      movies: state.movies,
      tiers: state.tiers,
      tierMovies: state.tierMovies,
      view: state.view,
    };
    localStorage.setItem(LS_KEYS.STATE, JSON.stringify(saved));
  } catch { /* ignore */ }
}

const saved = loadState();

export const useStore = create<AppState>((set, get) => ({
  movies: saved?.movies ?? [],
  tiers: saved?.tiers ?? DEFAULT_TIERS,
  tierMovies: saved?.tierMovies ?? {},
  tmdbKey: localStorage.getItem(LS_KEYS.TMDB_KEY) ?? null,
  view: (saved?.view as AppView) ?? 'import',
  isLoadingPosters: false,

  setTmdbKey: (key) => {
    localStorage.setItem(LS_KEYS.TMDB_KEY, key);
    set({ tmdbKey: key });
  },

  clearTmdbKey: () => {
    localStorage.removeItem(LS_KEYS.TMDB_KEY);
    set({ tmdbKey: null });
  },

  setMovies: (movies) => {
    set({ movies });
    saveState({ ...get(), movies });
  },

  setPosterForMovie: (id, posterUrl) => {
    const { movies } = get();
    const updated = movies.map((m) => (m.id === id ? { ...m, posterUrl } : m));
    set({ movies: updated });
    saveState({ ...get(), movies: updated });
  },

  setLoadingPosters: (isLoadingPosters) => set({ isLoadingPosters }),

  moveMovie: (movieId, toTierId) => {
    const { movies, tierMovies } = get();
    const movie = movies.find((m) => m.id === movieId);
    if (!movie) return;

    const newTierMovies = { ...tierMovies };

    for (const tid of Object.keys(newTierMovies)) {
      newTierMovies[tid] = newTierMovies[tid].filter((m) => m.id !== movieId);
    }

    if (toTierId) {
      if (!newTierMovies[toTierId]) {
        newTierMovies[toTierId] = [];
      }
      newTierMovies[toTierId] = [...newTierMovies[toTierId], movie];
    }

    set({ tierMovies: newTierMovies });
    saveState({ ...get(), tierMovies: newTierMovies });
  },

  insertMovie: (movieId, tierId, beforeMovieId) => {
    const { movies, tierMovies } = get();
    const movie = movies.find((m) => m.id === movieId);
    if (!movie) return;

    const newTierMovies = { ...tierMovies };

    for (const tid of Object.keys(newTierMovies)) {
      newTierMovies[tid] = newTierMovies[tid].filter((m) => m.id !== movieId);
    }

    if (!newTierMovies[tierId]) {
      newTierMovies[tierId] = [];
    }

    if (beforeMovieId) {
      const idx = newTierMovies[tierId].findIndex((m) => m.id === beforeMovieId);
      if (idx >= 0) {
        newTierMovies[tierId] = [
          ...newTierMovies[tierId].slice(0, idx),
          movie,
          ...newTierMovies[tierId].slice(idx),
        ];
      } else {
        newTierMovies[tierId] = [...newTierMovies[tierId], movie];
      }
    } else {
      newTierMovies[tierId] = [...newTierMovies[tierId], movie];
    }

    set({ tierMovies: newTierMovies });
    saveState({ ...get(), tierMovies: newTierMovies });
  },

  updateTier: (tierId, updates) => {
    const { tiers } = get();
    const updated = tiers.map((t) => (t.id === tierId ? { ...t, ...updates } : t));
    set({ tiers: updated });
    saveState({ ...get(), tiers: updated });
  },

  addTier: () => {
    const { tiers } = get();
    const newId = `custom-${Date.now()}`;
    const newTier: Tier = {
      id: newId,
      name: 'New',
      color: '#888888',
      starRating: 2.5,
    };
    const updated = [...tiers, newTier];
    set({ tiers: updated });
    saveState({ ...get(), tiers: updated });
  },

  removeTier: (tierId) => {
    const { tiers, tierMovies } = get();
    const updated = tiers.filter((t) => t.id !== tierId);
    const newTierMovies = { ...tierMovies };
    delete newTierMovies[tierId];
    set({ tiers: updated, tierMovies: newTierMovies });
    saveState({ ...get(), tiers: updated, tierMovies: newTierMovies });
  },

  setView: (view) => {
    set({ view });
    saveState({ ...get(), view });
  },

  reset: () => {
    localStorage.removeItem(LS_KEYS.STATE);
    set({
      movies: [],
      tiers: DEFAULT_TIERS,
      tierMovies: {},
      view: 'import',
    });
  },
}));
