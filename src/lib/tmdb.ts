import { TMDB_API_BASE, TMDB_POSTER_BASE } from './constants';

export async function searchMovie(
  title: string,
  year: number,
  apiKey: string
): Promise<{ tmdbId: string; posterUrl: string | null } | null> {
  try {
    const params = new URLSearchParams({ api_key: apiKey, query: title });
    if (year) params.set('year', String(year));
    const res = await fetch(`${TMDB_API_BASE}/search/movie?${params}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      const movie = data.results[0];
      return {
        tmdbId: String(movie.id),
        posterUrl: movie.poster_path ? `${TMDB_POSTER_BASE}${movie.poster_path}` : null,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchPoster(tmdbId: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(`${TMDB_API_BASE}/movie/${tmdbId}?api_key=${apiKey}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.poster_path ? `${TMDB_POSTER_BASE}${data.poster_path}` : null;
  } catch {
    return null;
  }
}

export function isValidTmdbKey(key: string): boolean {
  return /^[a-f0-9]{32,40}$/i.test(key);
}
