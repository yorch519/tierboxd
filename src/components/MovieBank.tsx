import { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Clapperboard, Search, X } from 'lucide-react';
import type { Movie } from '../types';
import { MovieCard } from './MovieCard';
import { Select } from './ui/Select';

interface Props {
  movies: Movie[];
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function MovieBank({ movies }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'unassigned',
    data: { type: 'movie-bank' },
  });

  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');

  const years = useMemo(() => {
    const values = new Set<number>();
    for (const movie of movies) {
      if (movie.year > 0) values.add(movie.year);
    }
    return [...values].sort((a, b) => b - a);
  }, [movies]);

  const normalizedQuery = normalize(query);
  const filtered = useMemo(
    () =>
      movies.filter((movie) => {
        if (normalizedQuery && !normalize(movie.title).includes(normalizedQuery)) {
          return false;
        }
        if (year !== '' && String(movie.year) !== year) return false;
        return true;
      }),
    [movies, normalizedQuery, year]
  );

  const hasFilters = normalizedQuery !== '' || year !== '';

  const clearFilters = () => {
    setQuery('');
    setYear('');
  };

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
            {hasFilters ? `${filtered.length} / ${movies.length}` : movies.length}
          </span>
        </div>
        <span className="label-caps hidden sm:inline">Drag into a tier</span>
      </div>

      <div className="space-y-3 p-4">
        {movies.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                strokeWidth={2.2}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the bank..."
                aria-label="Search the bank"
                className="input pl-9 pr-9"
              />
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  title="Clear search"
                  className="icon-btn absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                >
                  <X className="h-4 w-4" strokeWidth={2.2} />
                </button>
              )}
            </div>

            <Select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              aria-label="Filter by year"
              className="w-auto"
              wrapperClassName="shrink-0"
            >
              <option value="">Any year</option>
              {years.map((value) => (
                <option key={value} value={String(value)}>
                  {value}
                </option>
              ))}
            </Select>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn btn-ghost px-2.5 py-1.5 text-xs"
              >
                Clear
              </button>
            )}
          </div>
        )}

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
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-sm font-medium text-zinc-400">No films match your filters</p>
            <p className="max-w-xs text-xs text-zinc-600">
              Try a different title or year.
            </p>
            <button type="button" onClick={clearFilters} className="btn btn-ghost text-xs">
              Clear filters
            </button>
          </div>
        ) : (
          <div
            className="grid gap-2.5"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))' }}
          >
            {filtered.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
