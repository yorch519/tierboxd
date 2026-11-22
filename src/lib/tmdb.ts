import { TMDB_API_BASE, TMDB_KEY_HEADER, TMDB_POSTER_BASE } from './constants';

interface Scorable {
  id: number;
  title: string;
  year: number;
  posterPath: string | null;
  popularity: number;
  voteCount: number;
}

function buildHeaders(apiKey?: string | null): Record<string, string> {
  return apiKey ? { [TMDB_KEY_HEADER]: apiKey } : {};
}

function tmdbFetch(
  path: string,
  params: URLSearchParams,
  apiKey?: string | null
): Promise<Response> {
  const query = params.toString();
  const url = `${TMDB_API_BASE}/${path}${query ? `?${query}` : ''}`;
  return fetch(url, { headers: buildHeaders(apiKey) });
}

export async function searchMovie(
  title: string,
  year: number,
  apiKey?: string | null
): Promise<{ tmdbId: string; posterUrl: string | null } | null> {
  try {
    const params = new URLSearchParams({ query: title });
    if (year) params.set('year', String(year));

    const [movieRes, tvRes] = await Promise.all([
      tmdbFetch('search/movie', params, apiKey),
      tmdbFetch('search/tv', params, apiKey),
    ]);

    const movieData = movieRes.ok ? await movieRes.json() : { results: [] };
    const tvData = tvRes.ok ? await tvRes.json() : { results: [] };

    const candidates: Scorable[] = [
      ...(movieData.results || []).map((m: Record<string, unknown>) => ({
        id: m.id as number,
        title: (m.title as string) || '',
        year: m.release_date ? parseInt(String(m.release_date).slice(0, 4), 10) : 0,
        posterPath: (m.poster_path as string) || null,
        popularity: (m.popularity as number) || 0,
        voteCount: (m.vote_count as number) || 0,
      })),
      ...(tvData.results || []).map((t: Record<string, unknown>) => ({
        id: t.id as number,
        title: (t.name as string) || '',
        year: t.first_air_date ? parseInt(String(t.first_air_date).slice(0, 4), 10) : 0,
        posterPath: (t.poster_path as string) || null,
        popularity: (t.popularity as number) || 0,
        voteCount: (t.vote_count as number) || 0,
      })),
    ];

    if (candidates.length === 0) return null;

    const normalizedQuery = title.toLowerCase().replace(/[^a-z0-9]/g, '');

    let best = candidates[0];
    let bestScore = -Infinity;

    for (const candidate of candidates) {
      let score = 0;
      const candidateTitle = candidate.title.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (candidateTitle === normalizedQuery) score += 50;
      else if (candidateTitle.includes(normalizedQuery) || normalizedQuery.includes(candidateTitle)) score += 20;

      if (year && candidate.year) {
        const diff = Math.abs(candidate.year - year);
        if (diff === 0) score += 30;
        else if (diff === 1) score += 10;
        else if (diff === 2) score += 5;
        else if (diff > 3) score -= 25;
      }

      score += Math.min(candidate.popularity, 10);
      score += Math.min((candidate.voteCount || 0) / 1000, 5);

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    return {
      tmdbId: String(best.id),
      posterUrl: best.posterPath ? `${TMDB_POSTER_BASE}${best.posterPath}` : null,
    };
  } catch {
    return null;
  }
}

export interface TmdbResult {
  tmdbId: string;
  title: string;
  year: number;
  posterUrl: string | null;
}

export async function searchMovieCustom(
  query: string,
  apiKey?: string | null
): Promise<TmdbResult[]> {
  try {
    const params = new URLSearchParams({ query });

    const [movieRes, tvRes] = await Promise.all([
      tmdbFetch('search/movie', params, apiKey),
      tmdbFetch('search/tv', params, apiKey),
    ]);

    const movieData = movieRes.ok ? await movieRes.json() : { results: [] };
    const tvData = tvRes.ok ? await tvRes.json() : { results: [] };

    const seen = new Set<number>();
    const results: TmdbResult[] = [];

    for (const m of movieData.results || []) {
      if (seen.has(m.id as number)) continue;
      seen.add(m.id as number);
      results.push({
        tmdbId: String(m.id),
        title: `${m.title} (${m.release_date ? String(m.release_date).slice(0, 4) : '?'})`,
        year: m.release_date ? parseInt(String(m.release_date).slice(0, 4), 10) : 0,
        posterUrl: m.poster_path ? `${TMDB_POSTER_BASE}${m.poster_path}` : null,
      });
    }

    for (const t of tvData.results || []) {
      if (seen.has(t.id as number)) continue;
      seen.add(t.id as number);
      results.push({
        tmdbId: String(t.id),
        title: `${t.name} (${t.first_air_date ? String(t.first_air_date).slice(0, 4) : '?'})`,
        year: t.first_air_date ? parseInt(String(t.first_air_date).slice(0, 4), 10) : 0,
        posterUrl: t.poster_path ? `${TMDB_POSTER_BASE}${t.poster_path}` : null,
      });
    }

    return results;
  } catch {
    return [];
  }
}

export async function fetchPoster(
  tmdbId: string,
  apiKey?: string | null
): Promise<string | null> {
  try {
    const res = await tmdbFetch(`movie/${tmdbId}`, new URLSearchParams(), apiKey);
    if (res.ok) {
      const data = await res.json();
      return data.poster_path ? `${TMDB_POSTER_BASE}${data.poster_path}` : null;
    }
    const tvRes = await tmdbFetch(`tv/${tmdbId}`, new URLSearchParams(), apiKey);
    if (tvRes.ok) {
      const data = await tvRes.json();
      return data.poster_path ? `${TMDB_POSTER_BASE}${data.poster_path}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function isValidTmdbKey(key: string): boolean {
  return /^[a-f0-9]{32,40}$/i.test(key);
}
