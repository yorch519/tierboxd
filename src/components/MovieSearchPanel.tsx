import { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Check, Loader2 } from 'lucide-react';
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

  const movies = board?.movies ?? EMPTY_MOVIES;

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults([]);
      setLoading(false);
      setSearched(false);
      return;
    }

    const controller = new AbortController();
    const yearNumber = Number(year);
    const yearFilter =
      Number.isFinite(yearNumber) && yearNumber >= 1888 && yearNumber <= 2100
        ? yearNumber
        : undefined;

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
  }, [query, year, tmdbKey]);

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

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/50">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Add movies
        </h2>
        <span className="text-[10px] text-zinc-600">Search TMDB</span>
      </div>

      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search TMDB to add a film or show..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm
                         placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Year"
            min={1888}
            max={2100}
            className="w-20 px-2 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm text-center
                       placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Searching...
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <p className="text-xs text-zinc-600">
            No results. Try another title or clear the year.
          </p>
        )}

        {results.length > 0 && (
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))' }}
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
                  className="group relative flex flex-col items-center gap-1 p-1 rounded-lg transition-colors
                             hover:bg-zinc-800 disabled:cursor-default"
                >
                  <div className="relative w-full">
                    {result.posterUrl ? (
                      <img
                        src={result.posterUrl}
                        alt={result.title}
                        className="w-full aspect-[2/3] object-cover rounded bg-zinc-800"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-zinc-800 rounded flex items-center justify-center">
                        <span className="text-[10px] text-zinc-600 text-center px-1 leading-tight">
                          {result.title}
                        </span>
                      </div>
                    )}
                    <div
                      className={`absolute inset-0 rounded flex items-center justify-center transition-all
                        ${added
                          ? 'bg-black/60'
                          : 'bg-black/0 opacity-0 group-hover:opacity-100 group-hover:bg-black/50'
                        }`}
                    >
                      {added ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <Plus className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400 text-center leading-tight line-clamp-2 w-full">
                    {result.title}
                  </span>
                  <span className="text-[9px] text-zinc-600">{result.year || '—'}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
