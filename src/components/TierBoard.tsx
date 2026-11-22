import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { TierRow } from './TierRow';
import { MovieBank } from './MovieBank';
import { MovieCard } from './MovieCard';
import { StatsPanel } from './StatsPanel';
import type { Movie } from '../types';

interface Props {
  statsVisible: boolean;
  onCloseStats: () => void;
}

export function TierBoard({ statsVisible, onCloseStats }: Props) {
  const movies = useStore((s) => s.movies);
  const tiers = useStore((s) => s.tiers);
  const tierMovies = useStore((s) => s.tierMovies);
  const moveMovie = useStore((s) => s.moveMovie);
  const insertMovie = useStore((s) => s.insertMovie);
  const addTier = useStore((s) => s.addTier);

  const [activeMovie, setActiveMovie] = useState<Movie | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const assignedIds = new Set<string>();
  for (const tms of Object.values(tierMovies)) {
    for (const m of tms) assignedIds.add(m.id);
  }
  const unassigned = movies.filter((m) => !assignedIds.has(m.id));

  const handleDragStart = (event: DragStartEvent) => {
    const movie = event.active.data.current?.movie as Movie | undefined;
    if (movie) setActiveMovie(movie);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveMovie(null);
    const { active, over } = event;
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

      for (const [tid, list] of Object.entries(tierMovies)) {
        if (list.some((m) => m.id === targetMovieId)) {
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div id="tier-list-container" className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/50">
          <div data-export-hide className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Tier List
            </h2>
            <span className="text-[10px] text-zinc-600">
              {tiers.length} tiers
            </span>
          </div>

          <div data-export-only className="hidden py-3 border-b border-zinc-800 bg-zinc-900">
            <h1 className="text-center text-lg font-bold text-zinc-200 tracking-tight">Tierboxd</h1>
          </div>

          <div className="divide-y divide-zinc-800/50">
            {tiers.map((tier) => (
              <TierRow
                key={tier.id}
                tier={tier}
                movies={tierMovies[tier.id] ?? []}
              />
            ))}
          </div>

          <div data-export-hide className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/50">
            <button
              onClick={addTier}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300
                         hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Tier
            </button>
          </div>
        </div>

        {statsVisible && (
          <StatsPanel
            tiers={tiers}
            tierMovies={tierMovies}
            totalMovies={movies.length}
            onClose={onCloseStats}
          />
        )}

        <MovieBank movies={unassigned} />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeMovie ? (
          <div className="w-[100px] opacity-90 scale-110 rotate-2 shadow-2xl">
            <MovieCard movie={activeMovie} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
