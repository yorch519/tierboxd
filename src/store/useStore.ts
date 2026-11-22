import { create } from 'zustand';
import type { Movie, Tier, AppView, ImportMode, TierMovies } from '../types';
import { DEFAULT_TIERS, LS_KEYS } from '../lib/constants';

const STATE_VERSION = 2;
const PERSIST_DELAY = 400;

interface AppState {
  movies: Movie[];
  tiers: Tier[];
  tierMovies: TierMovies;
  tmdbKey: string | null;
  view: AppView;
  isLoadingPosters: boolean;
  keyModalOpen: boolean;

  setTmdbKey: (key: string) => void;
  clearTmdbKey: () => void;
  openKeyModal: () => void;
  closeKeyModal: () => void;
  importMovies: (incoming: Movie[], mode: ImportMode) => void;
  seedTiersFromRatings: (options?: { onlyUnassigned?: boolean }) => void;
  setPosterForMovie: (id: string, posterUrl: string | null) => void;
  setMovieTmdbId: (id: string, tmdbId: string) => void;
  setLoadingPosters: (loading: boolean) => void;
  moveMovie: (movieId: string, toTierId: string | null) => void;
  insertMovie: (movieId: string, tierId: string, beforeMovieId?: string) => void;
  updateTier: (tierId: string, updates: Partial<Tier>) => void;
  addTier: () => void;
  removeTier: (tierId: string) => void;
  setView: (view: AppView) => void;
  reset: () => void;
}

interface PersistedState {
  version?: number;
  movies?: unknown;
  tiers?: unknown;
  tierMovies?: unknown;
  view?: unknown;
}

type PersistedSlices = Pick<AppState, 'movies' | 'tiers' | 'tierMovies' | 'view'>;

function cloneDefaultTiers(): Tier[] {
  return DEFAULT_TIERS.map((tier) => ({ ...tier }));
}

function normalizeMovie(value: unknown): Movie | null {
  if (!value || typeof value !== 'object') return null;
  const movie = value as Record<string, unknown>;
  if (typeof movie.id !== 'string' || typeof movie.title !== 'string') return null;
  const year = typeof movie.year === 'number' ? movie.year : Number(movie.year);
  return {
    id: movie.id,
    title: movie.title,
    year: Number.isFinite(year) ? year : 0,
    originalRating: typeof movie.originalRating === 'number' ? movie.originalRating : null,
    posterUrl: typeof movie.posterUrl === 'string' ? movie.posterUrl : null,
    tmdbId: typeof movie.tmdbId === 'string' ? movie.tmdbId : null,
  };
}

function normalizeTier(value: unknown): Tier | null {
  if (!value || typeof value !== 'object') return null;
  const tier = value as Record<string, unknown>;
  if (typeof tier.id !== 'string' || typeof tier.name !== 'string') return null;
  return {
    id: tier.id,
    name: tier.name,
    color: typeof tier.color === 'string' ? tier.color : '#888888',
    starRating: typeof tier.starRating === 'number' ? tier.starRating : 2.5,
  };
}

function normalizeTierMovies(value: unknown): TierMovies {
  const result: TierMovies = {};
  if (!value || typeof value !== 'object') return result;

  for (const [tierId, entries] of Object.entries(value as Record<string, unknown>)) {
    if (!Array.isArray(entries)) continue;
    const ids: string[] = [];
    for (const entry of entries) {
      if (typeof entry === 'string') {
        ids.push(entry);
      } else if (entry && typeof entry === 'object') {
        const id = (entry as { id?: unknown }).id;
        if (typeof id === 'string') ids.push(id);
      }
    }
    result[tierId] = [...new Set(ids)];
  }

  return result;
}

function loadState(): PersistedSlices {
  const fallback: PersistedSlices = {
    movies: [],
    tiers: cloneDefaultTiers(),
    tierMovies: {},
    view: 'import',
  };

  try {
    const raw = localStorage.getItem(LS_KEYS.STATE);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as PersistedState;
    const movies = Array.isArray(parsed.movies)
      ? parsed.movies.map(normalizeMovie).filter((m): m is Movie => m !== null)
      : [];
    const tiers = Array.isArray(parsed.tiers)
      ? parsed.tiers.map(normalizeTier).filter((t): t is Tier => t !== null)
      : [];

    return {
      movies,
      tiers: tiers.length > 0 ? tiers : cloneDefaultTiers(),
      tierMovies: normalizeTierMovies(parsed.tierMovies),
      view: parsed.view === 'board' ? 'board' : 'import',
    };
  } catch {
    return fallback;
  }
}

const initial = loadState();

export const useStore = create<AppState>((set, get) => ({
  movies: initial.movies,
  tiers: initial.tiers,
  tierMovies: initial.tierMovies,
  tmdbKey: localStorage.getItem(LS_KEYS.TMDB_KEY) ?? null,
  view: initial.view,
  isLoadingPosters: false,
  keyModalOpen: false,

  setTmdbKey: (key) => {
    localStorage.setItem(LS_KEYS.TMDB_KEY, key);
    set({ tmdbKey: key });
  },

  clearTmdbKey: () => {
    localStorage.removeItem(LS_KEYS.TMDB_KEY);
    set({ tmdbKey: null });
  },

  openKeyModal: () => set({ keyModalOpen: true }),
  closeKeyModal: () => set({ keyModalOpen: false }),

  importMovies: (incoming, mode) => {
    const { movies } = get();

    if (mode === 'replace' || movies.length === 0) {
      set({ movies: incoming, tierMovies: {} });
      return;
    }

    const byId = new Map(movies.map((movie) => [movie.id, movie]));
    for (const movie of incoming) {
      const prev = byId.get(movie.id);
      if (prev) {
        byId.set(movie.id, {
          ...prev,
          originalRating: movie.originalRating ?? prev.originalRating,
          posterUrl: prev.posterUrl ?? movie.posterUrl,
          tmdbId: prev.tmdbId ?? movie.tmdbId,
        });
      } else {
        byId.set(movie.id, movie);
      }
    }

    set({ movies: [...byId.values()] });
  },

  seedTiersFromRatings: (options) => {
    const onlyUnassigned = options?.onlyUnassigned ?? false;
    const { movies, tiers, tierMovies } = get();

    const ratingToTier = new Map<number, string>();
    for (const tier of tiers) {
      if (!ratingToTier.has(tier.starRating)) {
        ratingToTier.set(tier.starRating, tier.id);
      }
    }

    const next: TierMovies = {};
    for (const tier of tiers) next[tier.id] = [];

    const assigned = new Set<string>();
    if (onlyUnassigned) {
      for (const [tierId, ids] of Object.entries(tierMovies)) {
        next[tierId] = next[tierId] ?? [];
        next[tierId].push(...ids);
        for (const id of ids) assigned.add(id);
      }
    }

    for (const movie of movies) {
      if (assigned.has(movie.id) || movie.originalRating === null) continue;
      const tierId = ratingToTier.get(movie.originalRating);
      if (!tierId) continue;
      next[tierId].push(movie.id);
      assigned.add(movie.id);
    }

    set({ tierMovies: next });
  },

  setPosterForMovie: (id, posterUrl) => {
    const { movies } = get();
    set({ movies: movies.map((m) => (m.id === id ? { ...m, posterUrl } : m)) });
  },

  setMovieTmdbId: (id, tmdbId) => {
    const { movies } = get();
    set({ movies: movies.map((m) => (m.id === id ? { ...m, tmdbId } : m)) });
  },

  setLoadingPosters: (isLoadingPosters) => set({ isLoadingPosters }),

  moveMovie: (movieId, toTierId) => {
    const { tierMovies } = get();
    const next: TierMovies = {};

    for (const [tierId, ids] of Object.entries(tierMovies)) {
      next[tierId] = ids.filter((id) => id !== movieId);
    }

    if (toTierId) {
      next[toTierId] = [...(next[toTierId] ?? []), movieId];
    }

    set({ tierMovies: next });
  },

  insertMovie: (movieId, tierId, beforeMovieId) => {
    const { tierMovies } = get();
    const next: TierMovies = {};

    for (const [tid, ids] of Object.entries(tierMovies)) {
      next[tid] = ids.filter((id) => id !== movieId);
    }

    if (!next[tierId]) next[tierId] = [];

    if (beforeMovieId) {
      const idx = next[tierId].indexOf(beforeMovieId);
      if (idx >= 0) {
        next[tierId] = [
          ...next[tierId].slice(0, idx),
          movieId,
          ...next[tierId].slice(idx),
        ];
      } else {
        next[tierId] = [...next[tierId], movieId];
      }
    } else {
      next[tierId] = [...next[tierId], movieId];
    }

    set({ tierMovies: next });
  },

  updateTier: (tierId, updates) => {
    const { tiers } = get();
    set({ tiers: tiers.map((t) => (t.id === tierId ? { ...t, ...updates } : t)) });
  },

  addTier: () => {
    const { tiers } = get();
    const newTier: Tier = {
      id: `custom-${Date.now()}`,
      name: 'New',
      color: '#888888',
      starRating: 2.5,
    };
    set({ tiers: [...tiers, newTier] });
  },

  removeTier: (tierId) => {
    const { tiers, tierMovies } = get();
    const nextTierMovies = { ...tierMovies };
    delete nextTierMovies[tierId];
    set({
      tiers: tiers.filter((t) => t.id !== tierId),
      tierMovies: nextTierMovies,
    });
  },

  setView: (view) => set({ view }),

  reset: () => {
    localStorage.removeItem(LS_KEYS.STATE);
    set({
      movies: [],
      tiers: cloneDefaultTiers(),
      tierMovies: {},
      view: 'import',
    });
  },
}));

function persistNow() {
  if (typeof window === 'undefined') return;
  const { movies, tiers, tierMovies, view } = useStore.getState();
  try {
    localStorage.setItem(
      LS_KEYS.STATE,
      JSON.stringify({ version: STATE_VERSION, movies, tiers, tierMovies, view })
    );
  } catch {
    /* ignore quota errors */
  }
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistNow();
  }, PERSIST_DELAY);
}

export function flushPersist() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  persistNow();
}

useStore.subscribe((state, prev) => {
  if (
    state.movies !== prev.movies ||
    state.tiers !== prev.tiers ||
    state.tierMovies !== prev.tierMovies ||
    state.view !== prev.view
  ) {
    schedulePersist();
  }
});

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPersist);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPersist();
  });
}
