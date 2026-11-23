import { create } from 'zustand';
import type {
  Movie,
  Tier,
  Board,
  BoardSnapshot,
  BoardHistory,
  AppView,
  ImportMode,
  TierTemplateId,
  TierMovies,
} from '../types';
import { DEFAULT_TIERS, LS_KEYS } from '../lib/constants';
import { createTiers } from '../lib/tierTemplates';

const STATE_VERSION = 3;
const PERSIST_DELAY = 400;
const HISTORY_LIMIT = 50;

interface AppState {
  boards: Board[];
  activeBoardId: string | null;
  history: Record<string, BoardHistory>;
  tmdbKey: string | null;
  view: AppView;
  keyModalOpen: boolean;
  selectedMovieIds: string[];

  setTmdbKey: (key: string) => void;
  clearTmdbKey: () => void;
  openKeyModal: () => void;
  closeKeyModal: () => void;

  createBoard: (name: string, templateId: TierTemplateId, origin?: Board['origin']) => string;
  setActiveBoard: (id: string) => void;
  renameBoard: (id: string, name: string) => void;
  duplicateBoard: (id: string) => string | null;
  deleteBoard: (id: string) => void;
  importBoard: (raw: unknown) => boolean;

  importMovies: (incoming: Movie[], mode: ImportMode) => void;
  seedTiersFromRatings: (options?: {
    onlyUnassigned?: boolean;
    recordHistory?: boolean;
  }) => void;
  addMovieToActiveBoard: (movie: Movie) => boolean;
  removeMovieFromActiveBoard: (id: string) => void;

  setPosterForMovie: (id: string, posterUrl: string | null) => void;
  setPosterForBoard: (boardId: string, movieId: string, posterUrl: string | null) => void;
  setMovieTmdbId: (id: string, tmdbId: string) => void;
  moveMovie: (movieId: string, toTierId: string | null) => void;
  moveMovies: (movieIds: string[], toTierId: string | null) => void;
  insertMovie: (movieId: string, tierId: string, beforeMovieId?: string) => void;
  removeMovies: (movieIds: string[]) => void;
  toggleMovieSelection: (movieId: string) => void;
  clearMovieSelection: () => void;
  updateTier: (tierId: string, updates: Partial<Tier>) => void;
  addTier: () => void;
  removeTier: (tierId: string) => void;
  setView: (view: AppView) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

interface PersistedState {
  version?: number;
  boards?: unknown;
  activeBoardId?: unknown;
  movies?: unknown;
  tiers?: unknown;
  tierMovies?: unknown;
  view?: unknown;
}

interface PersistedSlices {
  boards: Board[];
  activeBoardId: string | null;
  view: AppView;
}

function cloneDefaultTiers(): Tier[] {
  return DEFAULT_TIERS.map((tier) => ({ ...tier }));
}

function snapshotBoard(board: Board): BoardSnapshot {
  return {
    movies: board.movies,
    tiers: board.tiers,
    tierMovies: board.tierMovies,
  };
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

function normalizeBoard(value: unknown): Board | null {
  if (!value || typeof value !== 'object') return null;
  const board = value as Record<string, unknown>;
  if (typeof board.id !== 'string' || typeof board.name !== 'string') return null;

  const movies = Array.isArray(board.movies)
    ? board.movies.map(normalizeMovie).filter((m): m is Movie => m !== null)
    : [];
  const tiers = Array.isArray(board.tiers)
    ? board.tiers.map(normalizeTier).filter((t): t is Tier => t !== null)
    : [];
  const now = Date.now();

  return {
    id: board.id,
    name: board.name,
    origin: board.origin === 'letterboxd' ? 'letterboxd' : 'manual',
    movies,
    tiers: tiers.length > 0 ? tiers : cloneDefaultTiers(),
    tierMovies: normalizeTierMovies(board.tierMovies),
    createdAt: typeof board.createdAt === 'number' ? board.createdAt : now,
    updatedAt: typeof board.updatedAt === 'number' ? board.updatedAt : now,
  };
}

function loadState(): PersistedSlices {
  const fallback: PersistedSlices = { boards: [], activeBoardId: null, view: 'home' };

  try {
    const raw = localStorage.getItem(LS_KEYS.STATE);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as PersistedState;

    if (Array.isArray(parsed.boards)) {
      const boards = parsed.boards.map(normalizeBoard).filter((b): b is Board => b !== null);
      let activeBoardId = typeof parsed.activeBoardId === 'string' ? parsed.activeBoardId : null;
      if (!activeBoardId || !boards.some((b) => b.id === activeBoardId)) {
        activeBoardId = boards[0]?.id ?? null;
      }
      const view: AppView =
        parsed.view === 'board' || parsed.view === 'import' || parsed.view === 'home'
          ? parsed.view
          : 'home';
      return {
        boards,
        activeBoardId,
        view: view === 'board' && !activeBoardId ? 'home' : view,
      };
    }

    // Legacy single-board state (v1/v2).
    const legacyMovies = Array.isArray(parsed.movies)
      ? parsed.movies.map(normalizeMovie).filter((m): m is Movie => m !== null)
      : [];
    const legacyTiers = Array.isArray(parsed.tiers)
      ? parsed.tiers.map(normalizeTier).filter((t): t is Tier => t !== null)
      : [];
    const legacyTierMovies = normalizeTierMovies(parsed.tierMovies);

    const isEmpty =
      legacyMovies.length === 0 &&
      Object.keys(legacyTierMovies).length === 0 &&
      legacyTiers.length === 0;
    if (isEmpty) return fallback;

    const now = Date.now();
    const board: Board = {
      id: 'board-migrated',
      name: 'My Tier List',
      origin: 'letterboxd',
      movies: legacyMovies,
      tiers: legacyTiers.length > 0 ? legacyTiers : cloneDefaultTiers(),
      tierMovies: legacyTierMovies,
      createdAt: now,
      updatedAt: now,
    };

    return {
      boards: [board],
      activeBoardId: board.id,
      view: parsed.view === 'import' ? 'import' : 'board',
    };
  } catch {
    return fallback;
  }
}

const initial = loadState();

export const useStore = create<AppState>((set, get) => {
  const patchBoard = (
    updater: (board: Board) => Board,
    options?: { recordHistory?: boolean }
  ): Board | null => {
    const { boards, activeBoardId, history } = get();
    const index = boards.findIndex((board) => board.id === activeBoardId);
    if (index < 0) return null;

    const current = boards[index];
    let nextHistory = history;

    if (options?.recordHistory !== false) {
      const entry = history[current.id] ?? { past: [], future: [] };
      nextHistory = {
        ...history,
        [current.id]: {
          past: [...entry.past, snapshotBoard(current)].slice(-HISTORY_LIMIT),
          future: [],
        },
      };
    }

    const updated = { ...updater(current), updatedAt: Date.now() };
    const next = [...boards];
    next[index] = updated;
    set({ boards: next, history: nextHistory });
    return updated;
  };

  return {
    boards: initial.boards,
    activeBoardId: initial.activeBoardId,
    history: {},
    tmdbKey: localStorage.getItem(LS_KEYS.TMDB_KEY) ?? null,
    view: initial.view,
    keyModalOpen: false,
    selectedMovieIds: [],

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

    createBoard: (name, templateId, origin = 'manual') => {
      const now = Date.now();
      const board: Board = {
        id: `board-${now}-${Math.random().toString(36).slice(2, 8)}`,
        name: name.trim() || 'Untitled list',
        origin,
        movies: [],
        tiers: createTiers(templateId),
        tierMovies: {},
        createdAt: now,
        updatedAt: now,
      };
      set((state) => ({
        boards: [...state.boards, board],
        activeBoardId: board.id,
        selectedMovieIds: [],
      }));
      return board.id;
    },

    setActiveBoard: (id) => set({ activeBoardId: id, selectedMovieIds: [] }),

    renameBoard: (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      set((state) => ({
        boards: state.boards.map((board) =>
          board.id === id ? { ...board, name: trimmed, updatedAt: Date.now() } : board
        ),
      }));
    },

    duplicateBoard: (id) => {
      const { boards } = get();
      const source = boards.find((board) => board.id === id);
      if (!source) return null;

      const now = Date.now();
      const copy: Board = {
        ...source,
        id: `board-${now}-${Math.random().toString(36).slice(2, 8)}`,
        name: `${source.name} (copy)`,
        movies: source.movies.map((movie) => ({ ...movie })),
        tiers: source.tiers.map((tier) => ({ ...tier })),
        tierMovies: Object.fromEntries(
          Object.entries(source.tierMovies).map(([tierId, ids]) => [tierId, [...ids]])
        ),
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({
        boards: [...state.boards, copy],
        activeBoardId: copy.id,
        selectedMovieIds: [],
      }));
      return copy.id;
    },

    deleteBoard: (id) => {
      set((state) => {
        const boards = state.boards.filter((board) => board.id !== id);
        const history = { ...state.history };
        delete history[id];
        const activeBoardId =
          state.activeBoardId === id ? boards[0]?.id ?? null : state.activeBoardId;
        return {
          boards,
          activeBoardId,
          history,
          view: boards.length === 0 ? 'home' : state.view,
          selectedMovieIds: [],
        };
      });
    },

    importBoard: (raw) => {
      const record =
        raw && typeof raw === 'object' ? { ...(raw as Record<string, unknown>) } : null;
      if (!record) return false;

      if (typeof record.id !== 'string') {
        record.id = `imported-${Date.now()}`;
      }

      const board = normalizeBoard(record);
      if (!board) return false;

      const now = Date.now();
      const imported: Board = {
        ...board,
        id: `board-${now}-${Math.random().toString(36).slice(2, 8)}`,
        name: board.name.trim() || 'Imported list',
        updatedAt: now,
      };

      set((state) => ({
        boards: [...state.boards, imported],
        activeBoardId: imported.id,
        selectedMovieIds: [],
      }));
      return true;
    },

    importMovies: (incoming, mode) => {
      patchBoard((board) => {
        if (mode === 'replace' || board.movies.length === 0) {
          return { ...board, movies: incoming, tierMovies: {} };
        }

        const byId = new Map(board.movies.map((movie) => [movie.id, movie]));
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

        return { ...board, movies: [...byId.values()] };
      });
      set({ selectedMovieIds: [] });
    },

    seedTiersFromRatings: (options) => {
      const onlyUnassigned = options?.onlyUnassigned ?? false;
      patchBoard((board) => {
        const ratingToTier = new Map<number, string>();
        for (const tier of board.tiers) {
          if (!ratingToTier.has(tier.starRating)) {
            ratingToTier.set(tier.starRating, tier.id);
          }
        }

        const next: TierMovies = {};
        for (const tier of board.tiers) next[tier.id] = [];

        const assigned = new Set<string>();
        if (onlyUnassigned) {
          for (const [tierId, ids] of Object.entries(board.tierMovies)) {
            next[tierId] = next[tierId] ?? [];
            next[tierId].push(...ids);
            for (const id of ids) assigned.add(id);
          }
        }

        for (const movie of board.movies) {
          if (assigned.has(movie.id) || movie.originalRating === null) continue;
          const tierId = ratingToTier.get(movie.originalRating);
          if (!tierId) continue;
          next[tierId].push(movie.id);
          assigned.add(movie.id);
        }

        return { ...board, tierMovies: next };
      }, { recordHistory: options?.recordHistory });
    },

    addMovieToActiveBoard: (movie) => {
      const { boards, activeBoardId } = get();
      const board = boards.find((item) => item.id === activeBoardId);
      if (!board) return false;

      const exists = board.movies.some(
        (existing) =>
          (movie.tmdbId !== null && existing.tmdbId === movie.tmdbId) ||
          existing.id === movie.id ||
          (existing.title.trim().toLowerCase() === movie.title.trim().toLowerCase() &&
            existing.year === movie.year)
      );
      if (exists) return false;

      patchBoard((current) => ({ ...current, movies: [...current.movies, movie] }));
      return true;
    },

    removeMovieFromActiveBoard: (id) => {
      patchBoard((board) => {
        const tierMovies: TierMovies = {};
        for (const [tierId, ids] of Object.entries(board.tierMovies)) {
          tierMovies[tierId] = ids.filter((movieId) => movieId !== id);
        }
        return {
          ...board,
          movies: board.movies.filter((movie) => movie.id !== id),
          tierMovies,
        };
      });
    },

    setPosterForMovie: (id, posterUrl) => {
      patchBoard((board) => ({
        ...board,
        movies: board.movies.map((movie) =>
          movie.id === id ? { ...movie, posterUrl } : movie
        ),
      }), { recordHistory: false });
    },

    setPosterForBoard: (boardId, movieId, posterUrl) => {
      set((state) => ({
        boards: state.boards.map((board) =>
          board.id === boardId
            ? {
                ...board,
                movies: board.movies.map((movie) =>
                  movie.id === movieId ? { ...movie, posterUrl } : movie
                ),
                updatedAt: Date.now(),
              }
            : board
        ),
      }));
    },

    setMovieTmdbId: (id, tmdbId) => {
      patchBoard((board) => ({
        ...board,
        movies: board.movies.map((movie) =>
          movie.id === id ? { ...movie, tmdbId } : movie
        ),
      }), { recordHistory: false });
    },

    moveMovie: (movieId, toTierId) => {
      patchBoard((board) => {
        const next: TierMovies = {};
        for (const [tierId, ids] of Object.entries(board.tierMovies)) {
          next[tierId] = ids.filter((id) => id !== movieId);
        }
        if (toTierId) {
          next[toTierId] = [...(next[toTierId] ?? []), movieId];
        }
        return { ...board, tierMovies: next };
      });
    },

    moveMovies: (movieIds, toTierId) => {
      const selected = new Set(movieIds);
      if (selected.size === 0) return;

      patchBoard((board) => {
        const orderedIds = board.movies
          .filter((movie) => selected.has(movie.id))
          .map((movie) => movie.id);
        if (orderedIds.length === 0) return board;

        const next: TierMovies = {};
        for (const [tierId, ids] of Object.entries(board.tierMovies)) {
          next[tierId] = ids.filter((id) => !selected.has(id));
        }
        if (toTierId) {
          next[toTierId] = [...(next[toTierId] ?? []), ...orderedIds];
        }
        return { ...board, tierMovies: next };
      });
      set({ selectedMovieIds: [] });
    },

    removeMovies: (movieIds) => {
      const selected = new Set(movieIds);
      if (selected.size === 0) return;

      patchBoard((board) => {
        const tierMovies: TierMovies = {};
        for (const [tierId, ids] of Object.entries(board.tierMovies)) {
          tierMovies[tierId] = ids.filter((id) => !selected.has(id));
        }
        return {
          ...board,
          movies: board.movies.filter((movie) => !selected.has(movie.id)),
          tierMovies,
        };
      });
      set({ selectedMovieIds: [] });
    },

    toggleMovieSelection: (movieId) => {
      set((state) => ({
        selectedMovieIds: state.selectedMovieIds.includes(movieId)
          ? state.selectedMovieIds.filter((id) => id !== movieId)
          : [...state.selectedMovieIds, movieId],
      }));
    },

    clearMovieSelection: () => set({ selectedMovieIds: [] }),

    insertMovie: (movieId, tierId, beforeMovieId) => {
      patchBoard((board) => {
        const next: TierMovies = {};
        for (const [tid, ids] of Object.entries(board.tierMovies)) {
          next[tid] = ids.filter((id) => id !== movieId);
        }
        if (!next[tierId]) next[tierId] = [];

        if (beforeMovieId) {
          const index = next[tierId].indexOf(beforeMovieId);
          if (index >= 0) {
            next[tierId] = [
              ...next[tierId].slice(0, index),
              movieId,
              ...next[tierId].slice(index),
            ];
          } else {
            next[tierId] = [...next[tierId], movieId];
          }
        } else {
          next[tierId] = [...next[tierId], movieId];
        }

        return { ...board, tierMovies: next };
      });
    },

    updateTier: (tierId, updates) => {
      patchBoard((board) => ({
        ...board,
        tiers: board.tiers.map((tier) =>
          tier.id === tierId ? { ...tier, ...updates } : tier
        ),
      }));
    },

    addTier: () => {
      patchBoard((board) => ({
        ...board,
        tiers: [
          ...board.tiers,
          {
            id: `custom-${Date.now()}`,
            name: 'New',
            color: '#888888',
            starRating: 2.5,
          },
        ],
      }));
    },

    removeTier: (tierId) => {
      patchBoard((board) => {
        const tierMovies = { ...board.tierMovies };
        delete tierMovies[tierId];
        return {
          ...board,
          tiers: board.tiers.filter((tier) => tier.id !== tierId),
          tierMovies,
        };
      });
    },

    setView: (view) => set({ view, selectedMovieIds: [] }),

    undo: () => {
      const { boards, activeBoardId, history } = get();
      if (!activeBoardId) return;

      const index = boards.findIndex((board) => board.id === activeBoardId);
      if (index < 0) return;

      const entry = history[activeBoardId];
      if (!entry || entry.past.length === 0) return;

      const current = boards[index];
      const previous = entry.past[entry.past.length - 1];
      const nextBoards = [...boards];
      nextBoards[index] = {
        ...current,
        movies: previous.movies,
        tiers: previous.tiers,
        tierMovies: previous.tierMovies,
        updatedAt: Date.now(),
      };

      set({
        boards: nextBoards,
        history: {
          ...history,
          [activeBoardId]: {
            past: entry.past.slice(0, -1),
            future: [snapshotBoard(current), ...entry.future].slice(0, HISTORY_LIMIT),
          },
        },
      });
    },

    redo: () => {
      const { boards, activeBoardId, history } = get();
      if (!activeBoardId) return;

      const index = boards.findIndex((board) => board.id === activeBoardId);
      if (index < 0) return;

      const entry = history[activeBoardId];
      if (!entry || entry.future.length === 0) return;

      const current = boards[index];
      const next = entry.future[0];
      const nextBoards = [...boards];
      nextBoards[index] = {
        ...current,
        movies: next.movies,
        tiers: next.tiers,
        tierMovies: next.tierMovies,
        updatedAt: Date.now(),
      };

      set({
        boards: nextBoards,
        history: {
          ...history,
          [activeBoardId]: {
            past: [...entry.past, snapshotBoard(current)].slice(-HISTORY_LIMIT),
            future: entry.future.slice(1),
          },
        },
      });
    },

    reset: () => {
      localStorage.removeItem(LS_KEYS.STATE);
      set({ boards: [], activeBoardId: null, view: 'home', history: {}, selectedMovieIds: [] });
    },
  };
});

export function useActiveBoard(): Board | null {
  return useStore((state) => state.boards.find((board) => board.id === state.activeBoardId) ?? null);
}

function persistNow() {
  if (typeof window === 'undefined') return;
  const { boards, activeBoardId, view } = useStore.getState();
  try {
    localStorage.setItem(
      LS_KEYS.STATE,
      JSON.stringify({ version: STATE_VERSION, boards, activeBoardId, view })
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
    state.boards !== prev.boards ||
    state.activeBoardId !== prev.activeBoardId ||
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
