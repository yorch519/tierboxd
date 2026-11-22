import { useDroppable } from '@dnd-kit/core';
import { Settings2, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { Tier, Movie } from '../types';
import { MovieCard } from './MovieCard';
import { useStore } from '../store/useStore';

interface Props {
  tier: Tier;
  movies: Movie[];
  isOverlay?: boolean;
}

export function TierRow({ tier, movies, isOverlay }: Props) {
  const updateTier = useStore((s) => s.updateTier);
  const removeTier = useStore((s) => s.removeTier);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tier.name);
  const [color, setColor] = useState(tier.color);
  const [starRating, setStarRating] = useState(tier.starRating);

  const { setNodeRef, isOver } = useDroppable({
    id: tier.id,
    data: { type: 'tier', tierId: tier.id },
  });

  const handleSave = () => {
    updateTier(tier.id, {
      name: name.trim() || tier.name,
      color,
      starRating: Math.max(0.5, Math.min(5, starRating)),
    });
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[132px] items-stretch transition-colors ${
        isOver && !isOverlay ? 'bg-accent-500/[0.06]' : ''
      }`}
    >
      <div
        className="flex w-[136px] shrink-0 flex-col items-center justify-center gap-1 border-r border-zinc-800/70 p-3"
        style={{ backgroundColor: `${color}14`, boxShadow: `inset 3px 0 0 ${color}` }}
      >
        {editing ? (
          <div className="flex w-full flex-col items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input px-2 py-1 text-center text-sm"
              autoFocus
            />
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-7 w-7 cursor-pointer rounded-md border border-zinc-700 bg-transparent p-0.5"
                title="Tier color"
              />
              <input
                type="number"
                value={starRating}
                onChange={(e) => setStarRating(parseFloat(e.target.value) || 0)}
                step={0.5}
                min={0.5}
                max={5}
                className="input w-16 px-1 py-0.5 text-center text-xs"
                title="Star rating for CSV export"
              />
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleSave} className="btn btn-primary px-2 py-1 text-[11px]">
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="icon-btn h-7 w-7"
                title="Cancel"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.4} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <span
              className="font-display text-2xl font-semibold leading-none"
              style={{ color }}
            >
              {tier.name}
            </span>
            <span className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-500">
              {movies.length} films
            </span>
            <div data-export-hide className="mt-1 flex items-center gap-0.5">
              <button
                onClick={() => {
                  setName(tier.name);
                  setColor(tier.color);
                  setStarRating(tier.starRating);
                  setEditing(true);
                }}
                className="icon-btn h-6 w-6"
                title="Edit tier"
              >
                <Settings2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
              <button
                onClick={() => removeTier(tier.id)}
                className="icon-btn h-6 w-6 hover:text-red-400"
                title="Remove tier"
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-1 flex-wrap items-center gap-2.5 p-3">
        {movies.length === 0 &&
          (isOver ? (
            <p className="animate-pulse whitespace-nowrap px-2 text-xs font-semibold text-accent-300">
              Drop here
            </p>
          ) : (
            <p className="px-2 text-[11px] text-zinc-700">Drop films here</p>
          ))}
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
