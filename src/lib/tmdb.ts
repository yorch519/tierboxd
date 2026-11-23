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

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

const MAX_ATTEMPTS = 3;

async function tmdbFetch(
  path: string,
  params: URLSearchParams,
  apiKey?: string | null,
  signal?: AbortSignal
): Promise<Response> {
  const search = new URLSearchParams(params);
  search.set('path', path);
  const url = `${TMDB_API_BASE}?${search.toString()}`;
  const headers = buildHeaders(apiKey);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const isLast = attempt === MAX_ATTEMPTS - 1;
    try {
      const response = await fetch(url, { headers, signal });
      if ((response.status === 429 || response.status >= 500) && !isLast) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 400 * 2 ** attempt + Math.random() * 200;
        await sleep(delay, signal);
        continue;
      }
      return response;
    } catch (error) {
      if (signal?.aborted || isLast) throw error;
      await sleep(400 * 2 ** attempt + Math.random() * 200, signal);
    }
  }

  throw new Error('TMDB request failed');
}

function toSearchResult(candidate: Scorable): { tmdbId: string; posterUrl: string | null } {
  return {
    tmdbId: String(candidate.id),
    posterUrl: candidate.posterPath ? `${TMDB_POSTER_BASE}${candidate.posterPath}` : null,
  };
}

function scoreCandidate(candidate: Scorable, normalizedQuery: string, year: number): number {
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
  return score;
}

function pickBest(candidates: Scorable[], title: string, year: number): Scorable | null {
  if (candidates.length === 0) return null;

  const normalizedQuery = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  let best = candidates[0];
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const score = scoreCandidate(candidate, normalizedQuery, year);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

function isStrongTitleMatch(candidate: Scorable, title: string, year: number): boolean {
  const normalizedQuery = title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const candidateTitle = candidate.title.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!candidateTitle || !normalizedQuery) return false;

  const titleMatches =
    candidateTitle === normalizedQuery ||
    candidateTitle.includes(normalizedQuery) ||
    normalizedQuery.includes(candidateTitle);
  if (!titleMatches) return false;
  if (!year || !candidate.year) return true;
  return Math.abs(candidate.year - year) <= 2;
}

export async function searchMovie(
  title: string,
  year: number,
  apiKey?: string | null,
  signal?: AbortSignal
): Promise<{ tmdbId: string; posterUrl: string | null } | null> {
  try {
    const movieParams = new URLSearchParams({ query: title });
    if (year) movieParams.set('year', String(year));

    // Try movies first: Letterboxd imports are mostly films, so this halves requests.
    const movieRes = await tmdbFetch('search/movie', movieParams, apiKey, signal);
    const movieData = movieRes.ok ? await movieRes.json() : { results: [] };
    const movieCandidates: Scorable[] = (movieData.results || []).map(
      (m: Record<string, unknown>) => ({
        id: m.id as number,
        title: (m.title as string) || '',
        year: m.release_date ? parseInt(String(m.release_date).slice(0, 4), 10) : 0,
        posterPath: (m.poster_path as string) || null,
        popularity: (m.popularity as number) || 0,
        voteCount: (m.vote_count as number) || 0,
      })
    );

    const movieBest = pickBest(movieCandidates, title, year);
    if (movieBest && isStrongTitleMatch(movieBest, title, year)) {
      return toSearchResult(movieBest);
    }

    // Fall back to TV only when the movie match is weak or missing.
    const tvParams = new URLSearchParams({ query: title });
    if (year) tvParams.set('first_air_date_year', String(year));

    const tvRes = await tmdbFetch('search/tv', tvParams, apiKey, signal);
    const tvData = tvRes.ok ? await tvRes.json() : { results: [] };
    const tvCandidates: Scorable[] = (tvData.results || []).map(
      (t: Record<string, unknown>) => ({
        id: t.id as number,
        title: (t.name as string) || '',
        year: t.first_air_date ? parseInt(String(t.first_air_date).slice(0, 4), 10) : 0,
        posterPath: (t.poster_path as string) || null,
        popularity: (t.popularity as number) || 0,
        voteCount: (t.vote_count as number) || 0,
      })
    );

    const best = pickBest([...movieCandidates, ...tvCandidates], title, year);
    return best ? toSearchResult(best) : null;
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
  apiKey?: string | null,
  signal?: AbortSignal
): Promise<TmdbResult[]> {
  try {
    const params = new URLSearchParams({ query });

    const [movieRes, tvRes] = await Promise.all([
      tmdbFetch('search/movie', params, apiKey, signal),
      tmdbFetch('search/tv', params, apiKey, signal),
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

export async function searchTitles(
  query: string,
  year?: number,
  apiKey?: string | null,
  signal?: AbortSignal
): Promise<TmdbResult[]> {
  const text = query.trim();
  if (!text) return [];

  try {
    const movieParams = new URLSearchParams({ query: text });
    if (year) movieParams.set('year', String(year));
    const tvParams = new URLSearchParams({ query: text });
    if (year) tvParams.set('first_air_date_year', String(year));

    const [movieRes, tvRes] = await Promise.all([
      tmdbFetch('search/movie', movieParams, apiKey, signal),
      tmdbFetch('search/tv', tvParams, apiKey, signal),
    ]);

    const movieData = movieRes.ok ? await movieRes.json() : { results: [] };
    const tvData = tvRes.ok ? await tvRes.json() : { results: [] };

    const seen = new Set<string>();
    const results: TmdbResult[] = [];

    for (const m of movieData.results || []) {
      const key = `movie-${m.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        tmdbId: String(m.id),
        title: (m.title as string) || '',
        year: m.release_date ? parseInt(String(m.release_date).slice(0, 4), 10) : 0,
        posterUrl: m.poster_path ? `${TMDB_POSTER_BASE}${m.poster_path}` : null,
      });
    }

    for (const t of tvData.results || []) {
      const key = `tv-${t.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        tmdbId: String(t.id),
        title: (t.name as string) || '',
        year: t.first_air_date ? parseInt(String(t.first_air_date).slice(0, 4), 10) : 0,
        posterUrl: t.poster_path ? `${TMDB_POSTER_BASE}${t.poster_path}` : null,
      });
    }

    // TMDB's year param is a soft filter, so enforce an exact year match here.
    if (year) {
      return results.filter((result) => result.year === year);
    }

    return results;
  } catch {
    return [];
  }
}

export type DiscoverSort = 'popularity.desc' | 'vote_average.desc' | 'vote_count.desc';

export interface DiscoverOptions {
  year?: number;
  sort?: DiscoverSort;
  page?: number;
  minVotes?: number;
  genreIds?: number[];
}

export interface DiscoverResult {
  results: TmdbResult[];
  page: number;
  totalPages: number;
}

export async function discoverMovies(
  options: DiscoverOptions = {},
  apiKey?: string | null,
  signal?: AbortSignal
): Promise<DiscoverResult> {
  try {
    const sort = options.sort ?? 'popularity.desc';
    const minVotes =
      options.minVotes ??
      (sort === 'vote_average.desc' ? (options.year ? 1000 : 5000) : 50);

    const params = new URLSearchParams();
    params.set('sort_by', sort);
    params.set('page', String(options.page ?? 1));
    params.set('vote_count.gte', String(minVotes));
    if (options.year) params.set('primary_release_year', String(options.year));
    if (options.genreIds?.length) params.set('with_genres', options.genreIds.join(','));

    const res = await tmdbFetch('discover/movie', params, apiKey, signal);
    if (!res.ok) return { results: [], page: 1, totalPages: 0 };

    const data = await res.json();
    const results: TmdbResult[] = (data.results || []).map(
      (m: Record<string, unknown>) => ({
        tmdbId: String(m.id),
        title: (m.title as string) || '',
        year: m.release_date ? parseInt(String(m.release_date).slice(0, 4), 10) : 0,
        posterUrl: m.poster_path ? `${TMDB_POSTER_BASE}${m.poster_path}` : null,
      })
    );

    return {
      results,
      page: typeof data.page === 'number' ? data.page : 1,
      totalPages: Math.min(
        typeof data.total_pages === 'number' ? data.total_pages : 0,
        500
      ),
    };
  } catch {
    return { results: [], page: 1, totalPages: 0 };
  }
}

export async function fetchPoster(
  tmdbId: string,
  apiKey?: string | null,
  signal?: AbortSignal
): Promise<string | null> {
  try {
    const res = await tmdbFetch(`movie/${tmdbId}`, new URLSearchParams(), apiKey, signal);
    if (res.ok) {
      const data = await res.json();
      return data.poster_path ? `${TMDB_POSTER_BASE}${data.poster_path}` : null;
    }
    const tvRes = await tmdbFetch(`tv/${tmdbId}`, new URLSearchParams(), apiKey, signal);
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
