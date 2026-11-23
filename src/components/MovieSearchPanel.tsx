import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { useStore, useActiveBoard } from '../store/useStore';
import { searchTitles, type TmdbResult } from '../lib/tmdb';
import { getYearOptions } from '../lib/years';
import { Select } from './ui/Select';
import { ResultGrid } from './ResultGrid';
import { BrowsePanel } from './BrowsePanel';
import type { Movie } from '../types';

const EMPTY_MOVIES: Movie[] = [];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

type Mode = 'search' | 'browse';

export function MovieSearchPanel() {
  const board = useActiveBoard();
  const addMovie = useStore((s) => s.addMovieToActiveBoard);
  const tmdbKey = useStore((s) => s.tmdbKey);

  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [results, setResults] = useState<TmdbResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const movies = board?.movies ?? EMPTY_MOVIES;
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => getYearOptions(currentYear + 1), [currentYear]);

  const yearNumber = Number(year);
  const yearFilter =
    year !== '' &&
    Number.isFinite(yearNumber) &&
    yearNumber >= 1888 &&
    yearNumber <= currentYear + 1
      ? yearNumber
      : undefined;

  useEffect(() => {
    if (mode !== 'search') return;

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
  }, [mode, query, yearFilter, tmdbKey]);

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
      <div className="panel-header flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
            <Search className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <h2 className="font-display text-base font-semibold tracking-tight text-zinc-100">
            Add movies
          </h2>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950/40 p-0.5">
          <button
            type="button"
            onClick={() => setMode('search')}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
              mode === 'search'
                ? 'bg-accent-500 text-zinc-950'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => setMode('browse')}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors ${
              mode === 'browse'
                ? 'bg-accent-500 text-zinc-950'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            Browse
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {mode === 'search' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
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
                  aria-label="Search a film or show"
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

              <Select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                aria-label="Filter by year"
                className="w-auto"
                wrapperClassName="shrink-0"
              >
                <option value="">Any year</option>
                {yearOptions.map((value) => (
                  <option key={value} value={String(value)}>
                    {value}
                  </option>
                ))}
              </Select>
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
              <ResultGrid results={results} isAdded={isAdded} onAdd={handleAdd} />
            )}
          </div>
        ) : (
          <BrowsePanel isAdded={isAdded} onAdd={handleAdd} />
        )}
      </div>
    </div>
  );
}
