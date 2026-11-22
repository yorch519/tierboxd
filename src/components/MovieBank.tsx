import { useDroppable } from '@dnd-kit/core';
import { Clapperboard } from 'lucide-react';
import type { Movie } from '../types';
import { MovieCard } from './MovieCard';

interface Props {
  movies: Movie[];
}

export function MovieBank({ movies }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned',
    data: { type: 'movie-bank' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`card overflow-hidden transition-all ${
        isOver ? 'border-accent-500/40 ring-2 ring-accent-500/50' : ''
      }`}
    >
      <div className="panel-header">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400">
            <Clapperboard className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <h2 className="font-display text-base font-semibold tracking-tight text-zinc-100">
            Movie Bank
          </h2>
          <span className="badge border border-zinc-700 bg-zinc-800/60 text-zinc-400">
            {movies.length}
          </span>
        </div>
        <span className="label-caps hidden sm:inline">Drag into a tier</span>
      </div>

      <div className="p-4">
        {movies.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-700">
              <Clapperboard className="h-5 w-5" strokeWidth={1.8} />
            </span>
            <p className="text-sm font-medium text-zinc-400">No films in the bank</p>
            <p className="max-w-xs text-xs text-zinc-600">
              Add movies above, or drag films back here to unassign them.
            </p>
          </div>
        ) : (
          <div
            className="grid gap-2.5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))' }}
          >
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
