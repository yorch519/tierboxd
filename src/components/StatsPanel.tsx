import { BarChart3, X } from 'lucide-react';
import type { Movie, Tier } from '../types';

interface Props {
  tiers: Tier[];
  tierMovieIds: Record<string, string[]>;
  movies: Movie[];
  onClose: () => void;
}

interface RatedFilm {
  movie: Movie;
  original: number;
  tierRating: number;
  delta: number;
}

function formatStar(value: number): string {
  return value.toFixed(1);
}

function formatDelta(delta: number): string {
  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`;
}

function Metric({
  label,
  value,
  tone = 'text-zinc-100',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2.5">
      <div className={`font-display text-xl font-semibold ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
        {label}
      </div>
    </div>
  );
}

function DeltaList({
  title,
  films,
  tone,
}: {
  title: string;
  films: RatedFilm[];
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
      <span className="label-caps mb-2 block">{title}</span>
      {films.length === 0 ? (
        <p className="text-xs text-zinc-600">None yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {films.map(({ movie, original, tierRating, delta }) => (
            <li key={movie.id} className="flex items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-zinc-300" title={movie.title}>
                {movie.title}
              </span>
              <span className="shrink-0 font-mono text-[10px] text-zinc-500">
                {formatStar(original)} → {formatStar(tierRating)}
              </span>
              <span className={`shrink-0 text-[10px] font-semibold ${tone}`}>
                {formatDelta(delta)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StatsPanel({ tiers, tierMovieIds, movies, onClose }: Props) {
  const maxCount = Math.max(
    ...tiers.map((t) => (tierMovieIds[t.id] ?? []).length),
    1
  );
  const assigned = tiers.reduce(
    (sum, tier) => sum + (tierMovieIds[tier.id] ?? []).length,
    0
  );

  const movieById = new Map(movies.map((movie) => [movie.id, movie]));
  const ratedFilms: RatedFilm[] = [];

  for (const tier of tiers) {
    for (const movieId of tierMovieIds[tier.id] ?? []) {
      const movie = movieById.get(movieId);
      if (!movie || movie.originalRating === null) continue;
      ratedFilms.push({
        movie,
        original: movie.originalRating,
        tierRating: tier.starRating,
        delta: tier.starRating - movie.originalRating,
      });
    }
  }

  const ratedCount = ratedFilms.length;
  const avgOriginal =
    ratedCount > 0
      ? ratedFilms.reduce((sum, film) => sum + film.original, 0) / ratedCount
      : null;
  const avgTier =
    ratedCount > 0
      ? ratedFilms.reduce((sum, film) => sum + film.tierRating, 0) / ratedCount
      : null;

  const improved = ratedFilms
    .filter((film) => film.delta > 0.001)
    .sort((a, b) => b.delta - a.delta);
  const demoted = ratedFilms
    .filter((film) => film.delta < -0.001)
    .sort((a, b) => a.delta - b.delta);

  return (
    <div className="card overflow-hidden">
      <div className="panel-header flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
            <BarChart3 className="h-4 w-4" strokeWidth={2.2} />
          </span>
          <h2 className="font-display text-base font-semibold tracking-tight text-zinc-100">
            Stats
          </h2>
        </div>
        <button onClick={onClose} className="icon-btn" aria-label="Close stats">
          <X className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Metric
            label="Avg. original"
            value={avgOriginal !== null ? avgOriginal.toFixed(1) : '—'}
          />
          <Metric
            label="Avg. tier"
            value={avgTier !== null ? avgTier.toFixed(1) : '—'}
            tone="text-accent-300"
          />
          <Metric
            label="Moved up"
            value={String(improved.length)}
            tone="text-emerald-300"
          />
          <Metric
            label="Moved down"
            value={String(demoted.length)}
            tone="text-red-300"
          />
        </div>

        {ratedCount === 0 && (
          <p className="text-xs text-zinc-600">
            Assign rated films to tiers to compare them against their original ratings.
          </p>
        )}

        <div>
          <span className="label-caps mb-2 block">Tier distribution</span>
          <div className="space-y-2.5">
            {tiers.length === 0 ? (
              <p className="text-xs text-zinc-600">No tiers yet.</p>
            ) : (
              tiers.map((tier) => {
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
              })
            )}
          </div>

          <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-zinc-800 pt-3">
            <span className="label-caps">Assigned · {assigned}</span>
            <span className="label-caps">Rated · {ratedCount}</span>
            <span className="label-caps">Total · {movies.length}</span>
          </div>
        </div>

        {ratedCount > 0 &&
          (improved.length === 0 && demoted.length === 0 ? (
            <p className="text-xs text-zinc-600">
              No ratings changed from their original values.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <DeltaList
                title="Top improved"
                films={improved.slice(0, 3)}
                tone="text-emerald-300"
              />
              <DeltaList
                title="Top demoted"
                films={demoted.slice(0, 3)}
                tone="text-red-300"
              />
            </div>
          ))}
      </div>
    </div>
  );
}
