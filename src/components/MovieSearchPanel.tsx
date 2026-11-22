import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Check, Loader2, X } from 'lucide-react';
import { useStore, useActiveBoard } from '../store/useStore';
import { searchTitles, type TmdbResult } from '../lib/tmdb';
import type { Movie } from '../types';

const EMPTY_MOVIES: Movie[] = [];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function MovieSearchPanel() {
  const board = useActiveBoard();
  const addMovie = useStore((s) => s.addMovieToActiveBoard);
  const tmdbKey = useStore((s) => s.tmdbKey);

  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [results, setResults] = useState<TmdbResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const movies = board?.movies ?? EMPTY_MOVIES;

  const yearNumber = Number(year);
  const yearFilter =
    Number.isFinite(yearNumber) && yearNumber >= 1888 && yearNumber <= 2100
      ? yearNumber
      : undefined;

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      const found = await searchTitles(text, yearFilter, tmdbKey, controller.signal);
      if (controller.signal.aborted) return;
      setResults(found);
      setLoading(false);
      setSearched(true);
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, yearFilter, tmdbKey]);

  const existing = useMemo(() => {
    const ids = new Set<string>();
    const tmdbIds = new Set<string>();
    const titleYears = new Set<string>();
    for (const movie of movies) {
      ids.add(movie.id);
      if (movie.tmdbId) tmdbIds.add(movie.tmdbId);
      titleYears.add(`${normalize(movie.title)}|${movie.year}`);
    }
    return { ids, tmdbIds, titleYears };
  }, [movies]);

  const isAdded = (result: TmdbResult): boolean =>
    existing.ids.has(`tmdb-${result.tmdbId}`) ||
    existing.tmdbIds.has(result.tmdbId) ||
    existing.titleYears.has(`${normalize(result.title)}|${result.year}`);

  const handleAdd = (result: TmdbResult) => {
    if (!board || isAdded(result)) return;
    const movie: Movie = {
      id: `tmdb-${result.tmdbId}`,
      title: result.title,
      year: result.year,
      originalRating: null,
      posterUrl: result.posterUrl,
      tmdbId: result.tmdbId,
    };
    addMovie(movie);
  };

  const clearQuery = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="card overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
            <Search className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <h2 className="font-display text-base font-semibold tracking-tight text-zinc-100">
            Add movies
          </h2>
        </div>
        <span className="label-caps">Search TMDB</span>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              strokeWidth={2.2}
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') clearQuery();
              }}
              placeholder="Search a film or show..."
              className="input pl-9 pr-9"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={clearQuery}
                aria-label="Clear search"
                title="Clear search"
                className="icon-btn absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              >
                <X className="h-4 w-4" strokeWidth={2.2} />
              </button>
            )}
          </div>

          <div className="relative">
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="Year"
              min={1888}
              max={2100}
              aria-label="Filter by year"
              className="input w-24 pr-7 text-center"
            />
            {year.length > 0 && (
              <button
                type="button"
                onClick={() => setYear('')}
                aria-label="Clear year"
                title="Clear year"
                className="icon-btn absolute right-0.5 top-1/2 h-6 w-6 -translate-y-1/2"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.4} />
              </button>
            )}
          </div>
        </div>

        {yearFilter && (
          <span className="badge border border-accent-500/30 bg-accent-500/10 text-accent-300">
            Year {yearFilter}
          </span>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching…
          </div>
        )}

        {loading && results.length === 0 && (
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-1.5">
                <div className="aspect-[2/3] animate-pulse rounded-lg bg-zinc-800/80" />
                <div className="h-2 w-3/4 animate-pulse rounded bg-zinc-800/80" />
              </div>
            ))}
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <p className="text-sm text-zinc-500">
            No results{yearFilter ? ` for ${yearFilter}` : ''}. Try another title
            {yearFilter ? ' or clear the year' : ''}.
          </p>
        )}

        {results.length > 0 && (
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}
          >
            {results.map((result, index) => {
              const added = isAdded(result);
              return (
                <button
                  key={`${result.tmdbId}-${index}`}
                  type="button"
                  onClick={() => handleAdd(result)}
                  disabled={added}
                  title={added ? 'Already in this list' : `Add ${result.title}`}
                  className="group relative flex flex-col gap-1.5 rounded-xl p-1 text-left transition-colors
                             hover:bg-zinc-800/70 disabled:cursor-default"
                >
                  <div className="relative overflow-hidden rounded-lg border border-zinc-800/80">
                    {result.posterUrl ? (
                      <img
                        src={result.posterUrl}
                        alt={result.title}
                        className="w-full aspect-[2/3] object-cover bg-zinc-800"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-zinc-800 flex items-center justify-center">
                        <span className="text-[10px] text-zinc-600 text-center px-1 leading-tight">
                          {result.title}
                        </span>
                      </div>
                    )}
                    <div
                      className={`absolute inset-0 flex items-center justify-center transition-all
                        ${added
                          ? 'bg-black/60'
                          : 'bg-black/0 opacity-0 group-hover:opacity-100 group-hover:bg-black/50'
                        }`}
                    >
                      {added ? (
                        <Check className="h-5 w-5 text-emerald-400" strokeWidth={2.4} />
                      ) : (
                        <Plus className="h-5 w-5 text-white" strokeWidth={2.4} />
                      )}
                    </div>
                  </div>
                  <span className="line-clamp-2 px-0.5 text-[11px] font-medium leading-snug text-zinc-300">
                    {result.title}
                  </span>
                  <span className="px-0.5 text-[10px] font-medium text-zinc-600">
                    {result.year || '—'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
