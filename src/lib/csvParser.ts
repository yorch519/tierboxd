import Papa from 'papaparse';
import type { Movie } from '../types';

interface RawMovie {
  title: string;
  year: number;
  rating: number | null;
}

export function parseCSVContent(content: string): Record<string, string>[] {
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return result.data as Record<string, string>[];
}

export function extractMovies(
  files: Record<string, string>
): Movie[] {
  const movieMap = new Map<string, RawMovie>();

  const normalize = (s: string) => s.trim().replace(/\s+/g, ' ');

  for (const [filename, content] of Object.entries(files)) {
    const lower = filename.toLowerCase();
    if (!lower.endsWith('.csv')) continue;
    if (lower.includes('watchlist') || lower.includes('following')
      || lower.includes('followers') || lower.includes('likes')
      || lower.includes('lists') || lower.includes('reviews')) continue;

    const rows = parseCSVContent(content);

    for (const row of rows) {
      const title = normalize(row['Name'] ?? row['Film'] ?? row['Title'] ?? '');
      const yearStr = (row['Year'] ?? row['Release Year'] ?? '0').trim();
      const year = parseInt(yearStr, 10);
      const ratingStr = (row['Rating'] ?? '').trim();
      const rating = ratingStr ? parseFloat(ratingStr) : null;

      if (!title || !year || isNaN(year) || year < 1888 || year > 2100) continue;

      const key = `${title}|${year}`;

      const existing = movieMap.get(key);
      if (existing) {
        if (rating !== null && existing.rating === null) {
          existing.rating = rating;
        }
      } else {
        movieMap.set(key, { title, year, rating });
      }
    }
  }

  const movies: Movie[] = [];
  for (const [key, raw] of movieMap) {
    movies.push({
      id: key,
      title: raw.title,
      year: raw.year,
      originalRating: raw.rating,
      posterUrl: null,
      tmdbId: null,
    });
  }

  movies.sort((a, b) => a.title.localeCompare(b.title));
  return movies;
}
