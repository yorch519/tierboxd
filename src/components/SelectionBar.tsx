import { useEffect, useState } from 'react';
import { ArrowRight, Trash2, X } from 'lucide-react';
import { useActiveBoard, useStore } from '../store/useStore';
import { Select } from './ui/Select';

const BANK_VALUE = '__bank__';

export function SelectionBar() {
  const board = useActiveBoard();
  const selectedMovieIds = useStore((s) => s.selectedMovieIds);
  const moveMovies = useStore((s) => s.moveMovies);
  const removeMovies = useStore((s) => s.removeMovies);
  const clearMovieSelection = useStore((s) => s.clearMovieSelection);
  const [target, setTarget] = useState('');

  const tiers = board?.tiers ?? [];
  const validSelectedIds = board
    ? selectedMovieIds.filter((id) => board.movies.some((movie) => movie.id === id))
    : selectedMovieIds;
  const count = validSelectedIds.length;

  useEffect(() => {
    setTarget('');
  }, [board?.id]);

  useEffect(() => {
    if (count === 0) setTarget('');
  }, [count]);

  if (count === 0) return null;

  const handleMove = () => {
    if (!target) return;
    moveMovies(validSelectedIds, target === BANK_VALUE ? null : target);
    setTarget('');
  };

  const handleRemove = () => {
    const label = count === 1 ? 'this film' : `these ${count} films`;
    if (!window.confirm(`Remove ${label} from this list?`)) return;
    removeMovies(validSelectedIds);
    setTarget('');
  };

  return (
    <div
      data-export-hide
      className="fixed inset-x-4 bottom-5 z-40 mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-xl
                 border border-accent-500/30 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur"
    >
      <span className="badge border border-accent-500/30 bg-accent-500/10 text-accent-300">
        {count} selected
      </span>

      <Select
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        aria-label="Move selected films to"
        className="w-auto"
        wrapperClassName="min-w-[150px] flex-1"
      >
        <option value="">Move to…</option>
        {tiers.map((tier) => (
          <option key={tier.id} value={tier.id}>
            {tier.name}
          </option>
        ))}
        <option value={BANK_VALUE}>Movie Bank</option>
      </Select>

      <button
        type="button"
        onClick={handleMove}
        disabled={!target}
        className="btn btn-primary px-3 py-1.5 text-xs disabled:pointer-events-none disabled:opacity-40"
      >
        <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
        Move
      </button>

      <button
        type="button"
        onClick={handleRemove}
        className="btn btn-ghost px-3 py-1.5 text-xs hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
        Remove
      </button>

      <button
        type="button"
        onClick={clearMovieSelection}
        className="icon-btn ml-auto"
        title="Clear selection (Esc)"
        aria-label="Clear selection"
      >
        <X className="h-4 w-4" strokeWidth={2.2} />
      </button>
    </div>
  );
}
