import { Check, Plus } from 'lucide-react';
import type { TmdbResult } from '../lib/tmdb';

interface Props {
  results: TmdbResult[];
  isAdded: (result: TmdbResult) => boolean;
  onAdd: (result: TmdbResult) => void;
}

export function ResultGrid({ results, isAdded, onAdd }: Props) {
  return (
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
            onClick={() => onAdd(result)}
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
                  className="aspect-[2/3] w-full bg-zinc-800 object-cover"
                  loading="lazy"
                  draggable={false}
                />
              ) : (
                <div className="flex aspect-[2/3] w-full items-center justify-center bg-zinc-800">
                  <span className="px-1 text-center text-[10px] leading-tight text-zinc-600">
                    {result.title}
                  </span>
                </div>
              )}
              <div
                className={`absolute inset-0 flex items-center justify-center transition-all ${
                  added
                    ? 'bg-black/60'
                    : 'bg-black/0 opacity-0 group-hover:bg-black/50 group-hover:opacity-100'
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
  );
}
