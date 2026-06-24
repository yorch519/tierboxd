import { useDroppable } from '@dnd-kit/core';
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
      className={`rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/50 transition-colors ${
        isOver ? 'ring-2 ring-orange-500 border-orange-500/50' : ''
      }`}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Movie Bank
        </h2>
        <span className="text-[10px] text-zinc-600">
          {movies.length} films
        </span>
      </div>

      <div className="p-3">
        {movies.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-xs text-zinc-700 italic">
            No unassigned films — drag from here to a tier
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
