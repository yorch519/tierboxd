import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { discoverMovies, type DiscoverSort, type TmdbResult } from '../lib/tmdb';
import { getYearOptions } from '../lib/years';
import { Select } from './ui/Select';
import { ResultGrid } from './ResultGrid';

interface Props {
  isAdded: (result: TmdbResult) => boolean;
  onAdd: (result: TmdbResult) => void;
}

export function BrowsePanel({ isAdded, onAdd }: Props) {
  const tmdbKey = useStore((s) => s.tmdbKey);
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const [sort, setSort] = useState<DiscoverSort>('vote_count.desc');
  const [results, setResults] = useState<TmdbResult[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const yearNumber = Number(year);
  const yearFilter =
    year !== '' &&
    Number.isFinite(yearNumber) &&
    yearNumber >= 1888 &&
    yearNumber <= currentYear + 1
      ? yearNumber
      : undefined;

  const yearOptions = useMemo(() => getYearOptions(currentYear + 1), [currentYear]);

  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;

    setLoading(true);
    setSearched(false);
    setResults([]);
    setPage(1);

    discoverMovies({ year: yearFilter, sort, page: 1 }, tmdbKey, controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return;
        setResults(data.results);
        setTotalPages(data.totalPages);
        setLoading(false);
        setSearched(true);
      }
    );

    return () => controller.abort();
  }, [yearFilter, sort, tmdbKey]);

  const loadMore = async () => {
    if (loading || page >= totalPages) return;

    const controller = new AbortController();
    controllerRef.current?.abort();
    controllerRef.current = controller;
    setLoading(true);

    const nextPage = page + 1;
    const data = await discoverMovies(
      { year: yearFilter, sort, page: nextPage },
      tmdbKey,
      controller.signal
    );
    if (controller.signal.aborted) return;

    setResults((prev) => {
      const seen = new Set(prev.map((result) => result.tmdbId));
      return [...prev, ...data.results.filter((result) => !seen.has(result.tmdbId))];
    });
    setPage(nextPage);
    setTotalPages(data.totalPages);
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          aria-label="Year"
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

        <Select
          value={sort}
          onChange={(e) => setSort(e.target.value as DiscoverSort)}
          aria-label="Sort by"
          className="w-auto"
          wrapperClassName="shrink-0"
        >
          <option value="vote_count.desc">Most popular</option>
          <option value="vote_average.desc">Highest rated</option>
        </Select>

        <span className="text-xs font-medium text-zinc-500">
          {yearFilter ? `Popular movies from ${yearFilter}` : 'Popular movies from all years'}
        </span>
      </div>

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
          No movies found{yearFilter ? ` for ${yearFilter}` : ''}. Try another selection.
        </p>
      )}

      {results.length > 0 && <ResultGrid results={results} isAdded={isAdded} onAdd={onAdd} />}

      {results.length > 0 && page < totalPages && (
        <button onClick={loadMore} disabled={loading} className="btn btn-surface w-full text-xs">
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.2} />
              Loading…
            </>
          ) : (
            'Load more'
          )}
        </button>
      )}
    </div>
  );
}
