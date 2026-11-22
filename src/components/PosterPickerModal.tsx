import { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
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
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-200 truncate mr-2">Change poster: {movie.title}</h2>
          <button onClick={onClose} className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search TMDB..."
            className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm
                       placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && results.length === 0 && (
            <p className="text-xs text-zinc-500 text-center py-8">Searching...</p>
          )}
          {!loading && results.length === 0 && query.trim() && (
            <p className="text-xs text-zinc-500 text-center py-8">No results found</p>
          )}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))' }}>
            {results.map((r) => (
              <button
                key={r.tmdbId}
                onClick={() => handleSelect(r)}
                disabled={selected !== null}
                className="flex flex-col items-center gap-1 p-1 rounded-lg hover:bg-zinc-800 transition-colors
                           disabled:opacity-50 text-left"
              >
                {r.posterUrl ? (
                  <img src={r.posterUrl} alt={r.title} className="w-full aspect-[2/3] object-cover rounded bg-zinc-800" />
                ) : (
                  <div className="w-full aspect-[2/3] bg-zinc-800 rounded flex items-center justify-center">
                    <span className="text-[10px] text-zinc-600 text-center px-1">{r.title}</span>
                  </div>
                )}
                <span className="text-[9px] text-zinc-400 text-center leading-tight line-clamp-2">{r.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
