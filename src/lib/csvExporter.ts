import type { Movie, Tier } from '../types';

export function generateLetterboxdCSV(
  tierMovies: Record<string, Movie[]>,
  tiers: Tier[],
  allMovies: Movie[]
): string {
  const headers = ['Title', 'Year', 'Rating', 'LetterboxdURI', 'tmdbID'];

  const rows: string[][] = [];

  for (const movie of allMovies) {
    if (!movie.originalRating) continue;
    const tierEntry = Object.entries(tierMovies).find(([, movies]) =>
      movies.some((m) => m.id === movie.id)
    );
    const tier = tierEntry ? tiers.find((t) => t.id === tierEntry[0]) : null;
    const newRating = tier ? tier.starRating : movie.originalRating;

    rows.push([
      escapeCSV(movie.title),
      String(movie.year),
      String(newRating),
      '',
      movie.id.includes('|') ? '' : movie.id,
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
