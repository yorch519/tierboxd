import { Check, X } from 'lucide-react';
import { useActiveBoard, useStore } from '../store/useStore';
import { useEscapeKey } from '../hooks/useEscapeKey';
import type { Movie } from '../types';

interface Props {
  movie: Movie;
  onClose: () => void;
}

export function MoveToMenu({ movie, onClose }: Props) {
  const board = useActiveBoard();
  const moveMovie = useStore((s) => s.moveMovie);

  useEscapeKey(onClose);

  const tiers = board?.tiers ?? [];
  const currentTierId =
    board != null
      ? Object.entries(board.tierMovies).find(([, ids]) => ids.includes(movie.id))?.[0]
      : undefined;
  const firstAvailableId = tiers.find((tier) => tier.id !== currentTierId)?.id;

  const handleMove = (tierId: string | null) => {
    moveMovie(movie.id, tierId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Move ${movie.title} to`}
    >
      <div
        className="card w-full max-w-xs overflow-hidden shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel-header px-3 py-2">
          <div className="min-w-0">
            <p className="label-caps">Move to…</p>
            <p className="truncate text-sm font-semibold text-zinc-100">{movie.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn h-7 w-7"
            aria-label="Close move menu"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {tiers.map((tier) => {
            const isCurrent = tier.id === currentTierId;
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => handleMove(tier.id)}
                disabled={isCurrent}
                autoFocus={tier.id === firstAvailableId}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-200
                           transition-colors hover:bg-zinc-800/70 disabled:pointer-events-none disabled:opacity-50"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: tier.color }}
                />
                <span className="min-w-0 flex-1 truncate">{tier.name}</span>
                {isCurrent && <Check className="h-3.5 w-3.5 text-accent-400" strokeWidth={2.6} />}
              </button>
            );
          })}

          <div className="my-1.5 border-t border-zinc-800" />

          <button
            type="button"
            onClick={() => handleMove(null)}
            disabled={!currentTierId}
            autoFocus={!firstAvailableId && !currentTierId}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-zinc-200
                       transition-colors hover:bg-zinc-800/70 disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-zinc-600" />
            <span className="min-w-0 flex-1 truncate">Movie Bank</span>
            {!currentTierId && (
              <Check className="h-3.5 w-3.5 text-accent-400" strokeWidth={2.6} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
