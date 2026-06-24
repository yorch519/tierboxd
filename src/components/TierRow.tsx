import { useDroppable } from '@dnd-kit/core';
import { Settings2, Trash2 } from 'lucide-react';
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
      className={`flex items-stretch gap-0 min-h-[140px] border-b border-zinc-800 transition-colors
                  ${isOver && !isOverlay ? 'bg-orange-600/10 border-orange-500/30' : ''}`}
    >
      <div
        className="w-[120px] flex-shrink-0 flex flex-col items-center justify-center p-3 gap-1 border-r border-zinc-800"
        style={{ backgroundColor: `${color}40` }}
      >
        {editing ? (
          <div className="flex flex-col items-center gap-2 w-full">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-center bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100"
              autoFocus
            />
            <div className="flex gap-1">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
              />
              <input
                type="number"
                value={starRating}
                onChange={(e) => setStarRating(parseFloat(e.target.value) || 0)}
                step={0.5}
                min={0.5}
                max={5}
                className="w-14 text-center bg-zinc-800 border border-zinc-700 rounded px-1 py-0.5 text-xs text-zinc-100"
              />
            </div>
            <button
              onClick={handleSave}
              className="text-[10px] px-2 py-0.5 bg-orange-600 text-white rounded hover:bg-orange-500"
            >
              Save
            </button>
          </div>
        ) : (
          <>
            <span className="text-xl font-bold" style={{ color }}>
              {tier.name}
            </span>
            <span className="text-[10px] text-zinc-600">{movies.length} films</span>
            <div className="flex gap-0.5 mt-1">
              <button
                onClick={() => {
                  setName(tier.name);
                  setColor(tier.color);
                  setStarRating(tier.starRating);
                  setEditing(true);
                }}
                className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
                title="Edit tier"
              >
                <Settings2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => removeTier(tier.id)}
                className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                title="Remove tier"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-wrap items-center p-3 gap-2">
        {movies.length === 0 && isOver && (
          <p className="text-xs text-orange-400 italic px-4 whitespace-nowrap animate-pulse">
            Drop here
          </p>
        )}
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
