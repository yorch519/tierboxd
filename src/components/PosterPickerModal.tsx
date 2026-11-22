import { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, Loader2, Search, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { searchMovieCustom, fetchPoster, type TmdbResult } from '../lib/tmdb';
import type { Movie } from '../types';

interface Props {
  movie: Movie;
  onClose: () => void;
}

export function PosterPickerModal({ movie, onClose }: Props) {
  const tmdbKey = useStore((s) => s.tmdbKey);
  const setMovieTmdbId = useStore((s) => s.setMovieTmdbId);
  const setPosterForMovie = useStore((s) => s.setPosterForMovie);

  const [query, setQuery] = useState(movie.title);
  const [results, setResults] = useState<TmdbResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!query.trim()) return;
    setLoading(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const r = await searchMovieCustom(query.trim(), tmdbKey);
      setResults(r);
      setLoading(false);
    }, 400);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, tmdbKey]);

  const handleSelect = async (result: TmdbResult) => {
    if (selected) return;
    setSelected(result.tmdbId);
    const posterUrl = await fetchPoster(result.tmdbId, tmdbKey);
    setMovieTmdbId(movie.id, result.tmdbId);
    setPosterForMovie(movie.id, posterUrl);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card flex max-h-[80vh] w-full max-w-lg flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-header shrink-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
              <ImageIcon className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">
                Change poster
              </h2>
              <p className="truncate text-xs text-zinc-500">{movie.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <div className="p-5 pb-0">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
              strokeWidth={2.2}
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search TMDB..."
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
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && results.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          )}

          {!loading && results.length === 0 && query.trim() && (
            <p className="py-10 text-center text-sm text-zinc-500">No results found.</p>
          )}

          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}
          >
            {results.map((result) => {
              const isSelected = selected === result.tmdbId;
              return (
                <button
                  key={result.tmdbId}
                  onClick={() => handleSelect(result)}
                  disabled={selected !== null}
                  className="group relative flex flex-col gap-1.5 rounded-xl p-1 text-left transition-colors
                             hover:bg-zinc-800/70 disabled:cursor-default"
                >
                  <div className="relative overflow-hidden rounded-lg border border-zinc-800/80">
                    {result.posterUrl ? (
                      <img
                        src={result.posterUrl}
                        alt={result.title}
                        className="aspect-[2/3] w-full bg-zinc-800 object-cover"
                        loading="lazy"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex aspect-[2/3] w-full items-center justify-center bg-zinc-800">
                        <span className="px-1 text-center text-[10px] text-zinc-600">
                          {result.title}
                        </span>
                      </div>
                    )}
                    <div
                      className={`absolute inset-0 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-black/60'
                          : 'bg-black/0 opacity-0 group-hover:bg-black/50 group-hover:opacity-100'
                      }`}
                    >
                      {isSelected ? (
                        <Loader2 className="h-5 w-5 animate-spin text-accent-300" />
                      ) : (
                        <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-semibold text-zinc-950">
                          Use
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="line-clamp-2 px-0.5 text-[11px] font-medium leading-snug text-zinc-300">
                    {result.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
