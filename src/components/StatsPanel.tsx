import { X } from 'lucide-react';
import type { Tier } from '../types';

interface Props {
  tiers: Tier[];
  tierMovieIds: Record<string, string[]>;
  totalMovies: number;
  onClose: () => void;
}

export function StatsPanel({ tiers, tierMovieIds, totalMovies, onClose }: Props) {
  const maxCount = Math.max(
    ...tiers.map((t) => (tierMovieIds[t.id] ?? []).length),
    1
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900">
        <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Rating Distribution
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-4 space-y-2">
        {tiers.map((tier) => {
          const count = (tierMovieIds[tier.id] ?? []).length;
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={tier.id} className="flex items-center gap-3">
              <span
                className="w-16 text-right text-xs font-bold flex-shrink-0"
                style={{ color: tier.color }}
              >
                {tier.name}
              </span>
              <div className="flex-1 h-5 bg-zinc-800/50 rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: tier.color,
                    opacity: 0.85,
                  }}
                />
              </div>
              <span className="w-8 text-right text-xs text-zinc-400 flex-shrink-0">
                {count}
              </span>
            </div>
          );
        })}

        <div className="pt-2 mt-2 border-t border-zinc-800 flex justify-between">
          <span className="text-[10px] text-zinc-600">
            Assigned: {tiers.reduce((sum, t) => sum + (tierMovieIds[t.id] ?? []).length, 0)}
          </span>
          <span className="text-[10px] text-zinc-600">
            Total: {totalMovies} films
          </span>
        </div>
      </div>
    </div>
  );
}
