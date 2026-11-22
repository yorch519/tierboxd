import { BarChart3, X } from 'lucide-react';
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
  const assigned = tiers.reduce(
    (sum, tier) => sum + (tierMovieIds[tier.id] ?? []).length,
    0
  );

  return (
    <div className="card overflow-hidden">
      <div className="panel-header">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
            <BarChart3 className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <h2 className="font-display text-base font-semibold tracking-tight text-zinc-100">
            Rating distribution
          </h2>
        </div>
        <button onClick={onClose} className="icon-btn" aria-label="Close stats">
          <X className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>

      <div className="space-y-2.5 p-5">
        {tiers.map((tier) => {
          const count = (tierMovieIds[tier.id] ?? []).length;
          const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <div key={tier.id} className="flex items-center gap-3">
              <span
                className="w-20 shrink-0 truncate text-right font-display text-sm font-semibold"
                style={{ color: tier.color }}
                title={tier.name}
              >
                {tier.name}
              </span>
              <div className="h-5 flex-1 overflow-hidden rounded-md bg-zinc-800/50">
                <div
                  className="h-full rounded-md transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: tier.color,
                    opacity: 0.9,
                  }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-xs font-semibold text-zinc-400">
                {count}
              </span>
            </div>
          );
        })}

        <div className="mt-2 flex justify-between border-t border-zinc-800 pt-3">
          <span className="label-caps">Assigned · {assigned}</span>
          <span className="label-caps">Total · {totalMovies}</span>
        </div>
      </div>
    </div>
  );
}
