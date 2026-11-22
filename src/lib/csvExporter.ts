import type { Movie, Tier } from '../types';

export function generateLetterboxdCSV(
  tierMovieIds: Record<string, string[]>,
  tiers: Tier[],
  allMovies: Movie[]
): string {
  const headers = ['Title', 'Year', 'Rating', 'LetterboxdURI', 'tmdbID'];

  const tierByMovieId = new Map<string, Tier>();
  for (const [tierId, ids] of Object.entries(tierMovieIds)) {
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier) continue;
    for (const id of ids) {
      if (!tierByMovieId.has(id)) tierByMovieId.set(id, tier);
    }
  }

  const rows: string[][] = [];

  for (const movie of allMovies) {
    const tier = tierByMovieId.get(movie.id);
    const newRating = tier ? tier.starRating : movie.originalRating;
    if (newRating === null) continue;

    rows.push([
      escapeCSV(movie.title),
      String(movie.year),
      String(newRating),
      '',
      movie.tmdbId ?? '',
    ]);
  }

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCSV(csv: string, filename: string = 'letterboxd-import.csv') {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
