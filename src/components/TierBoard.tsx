import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { LayoutGrid, Plus, Redo2, Undo2 } from 'lucide-react';
import { useStore, useActiveBoard } from '../store/useStore';
import { useUndoShortcuts } from '../hooks/useUndoShortcuts';
import { useSelectionShortcuts } from '../hooks/useSelectionShortcuts';
import { TierRow } from './TierRow';
import { MovieBank } from './MovieBank';
import { MovieSearchPanel } from './MovieSearchPanel';
import { MovieCard } from './MovieCard';
import { StatsPanel } from './StatsPanel';
import { SelectionBar } from './SelectionBar';
import type { Movie, Tier, TierMovies } from '../types';

const EMPTY_MOVIES: Movie[] = [];
const EMPTY_TIERS: Tier[] = [];
const EMPTY_TIER_MOVIES: TierMovies = {};

interface Props {
  statsVisible: boolean;
  onCloseStats: () => void;
}

export function TierBoard({ statsVisible, onCloseStats }: Props) {
  const board = useActiveBoard();
  const moveMovie = useStore((s) => s.moveMovie);
  const insertMovie = useStore((s) => s.insertMovie);
  const addTier = useStore((s) => s.addTier);
  const reorderTiers = useStore((s) => s.reorderTiers);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const clearMovieSelection = useStore((s) => s.clearMovieSelection);
  const history = useStore((s) => s.history);
  const activeBoardId = useStore((s) => s.activeBoardId);

  const canUndo = activeBoardId
    ? (history[activeBoardId]?.past.length ?? 0) > 0
    : false;
  const canRedo = activeBoardId
    ? (history[activeBoardId]?.future.length ?? 0) > 0
    : false;

  useUndoShortcuts(undo, redo);
  useSelectionShortcuts(clearMovieSelection);

  const movies = board?.movies ?? EMPTY_MOVIES;
  const tiers = board?.tiers ?? EMPTY_TIERS;
  const tierMovieIds = board?.tierMovies ?? EMPTY_TIER_MOVIES;

  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);
  const [activeTier, setActiveTier] = useState<Pick<Tier, 'name' | 'color'> | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 6 },
    })
  );

  const movieById = useMemo(
    () => new Map(movies.map((movie) => [movie.id, movie])),
    [movies]
  );

  const resolveTier = (ids: string[]): Movie[] =>
    ids
      .map((id) => movieById.get(id))
      .filter((movie): movie is Movie => Boolean(movie));

  const unassigned = useMemo(() => {
    const assigned = new Set<string>();
    for (const ids of Object.values(tierMovieIds)) {
      for (const id of ids) assigned.add(id);
    }
    return movies.filter((movie) => !assigned.has(movie.id));
  }, [movies, tierMovieIds]);

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === 'tier-item') {
      const tier = data.tier as Tier;
      setActiveTier({ name: tier.name, color: tier.color });
      return;
    }

    const movie = data?.movie as Movie | undefined;
    if (movie) setActiveMovie(movie);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveMovie(null);
    setActiveTier(null);

    const { active, over } = event;
    const activeData = active.data.current;

    if (activeData?.type === 'tier-item') {
      const fromTierId = activeData.tierId as string;
      let toTierId: string | null = null;

      if (over) {
        const overData = over.data.current;
        if (overData?.type === 'tier') {
          toTierId = overData.tierId as string;
        } else if (overData?.type === 'movie-target') {
          const targetMovieId = overData.movieId as string;
          const entry = Object.entries(tierMovieIds).find(([, ids]) =>
            ids.includes(targetMovieId)
          );
          if (entry) toTierId = entry[0];
        }
      }

      if (toTierId) reorderTiers(fromTierId, toTierId);
      return;
    }

    if (!over) {
      moveMovie(String(active.id), null);
      return;
    }

    const overData = over.data.current;

    if (overData?.type === 'movie-bank') {
      moveMovie(String(active.id), null);
      return;
    }

    if (overData?.type === 'movie-target') {
      const targetMovieId = overData.movieId as string;

      for (const [tid, ids] of Object.entries(tierMovieIds)) {
        if (ids.includes(targetMovieId)) {
          insertMovie(String(active.id), tid, targetMovieId);
          return;
        }
      }

      moveMovie(String(active.id), null);
      return;
    }

    if (overData?.type === 'tier') {
      insertMovie(String(active.id), overData.tierId as string);
      return;
    }

    moveMovie(String(active.id), null);
  };

  const handleDragCancel = () => {
    setActiveMovie(null);
    setActiveTier(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="mx-auto max-w-7xl space-y-4 px-3 py-6 sm:space-y-5 sm:px-5 sm:py-8">
        <MovieSearchPanel />

        <div id="tier-list-container" className="card overflow-hidden">
          <div data-export-hide className="panel-header flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
                <LayoutGrid className="h-4 w-4" strokeWidth={2.2} />
              </span>
              <h2 className="font-display text-base font-semibold tracking-tight text-zinc-100">
                Tier List
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="icon-btn disabled:pointer-events-none disabled:opacity-40"
                  title="Undo (Ctrl/Cmd+Z)"
                  aria-label="Undo"
                >
                  <Undo2 className="h-4 w-4" strokeWidth={2.2} />
                </button>
                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="icon-btn disabled:pointer-events-none disabled:opacity-40"
                  title="Redo (Shift+Ctrl/Cmd+Z)"
                  aria-label="Redo"
                >
                  <Redo2 className="h-4 w-4" strokeWidth={2.2} />
                </button>
              </div>
              <span className="badge border border-zinc-700 bg-zinc-800/60 text-zinc-400">
                {tiers.length} tiers
              </span>
              <span className="hidden text-xs font-medium text-zinc-600 sm:inline">
                {movies.length} films
              </span>
            </div>
          </div>

          <div data-export-only className="hidden border-b border-zinc-800/70 bg-zinc-900/80 py-3">
            <h1 className="text-center font-display text-xl font-semibold tracking-tight text-zinc-100">
              Tierboxd
            </h1>
          </div>

          <div className="divide-y divide-zinc-800/60">
            {tiers.map((tier) => (
              <TierRow
                key={tier.id}
                tier={tier}
                movies={resolveTier(tierMovieIds[tier.id] ?? [])}
              />
            ))}
          </div>

          <div data-export-hide className="border-t border-zinc-800/70 bg-zinc-900/50 px-3 py-2">
            <button onClick={addTier} className="btn btn-ghost px-2.5 py-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.4} />
              Add tier
            </button>
          </div>
        </div>

        {statsVisible && (
          <StatsPanel
            tiers={tiers}
            tierMovieIds={tierMovieIds}
            movies={movies}
            onClose={onCloseStats}
          />
        )}

        <MovieBank movies={unassigned} />
      </div>

      <SelectionBar />

      <DragOverlay dropAnimation={null}>
        {activeMovie ? (
          <div className="w-[104px] opacity-90 scale-110 rotate-2 shadow-2xl">
            <MovieCard movie={activeMovie} />
          </div>
        ) : activeTier ? (
          <div
            className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/95 px-4 py-2 shadow-2xl"
            style={{ borderLeft: `4px solid ${activeTier.color}` }}
          >
            <span
              className="font-display text-xl font-semibold"
              style={{ color: activeTier.color }}
            >
              {activeTier.name}
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
