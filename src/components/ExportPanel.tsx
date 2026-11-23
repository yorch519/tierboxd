import { useState } from 'react';
import { Download, AlertCircle, CheckCircle2, Image, BarChart3, Loader2, FileJson } from 'lucide-react';
import { useActiveBoard } from '../store/useStore';
import { generateLetterboxdCSV, downloadCSV } from '../lib/csvExporter';
import { downloadBoardJson } from '../lib/boardJson';
import { ImportBoardButton } from './ImportBoardButton';
import { TMDB_IMAGE_ORIGIN, TMDB_IMAGE_PROXY } from '../lib/constants';

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const posterDataCache = new Map<string, string>();

function toProxyUrl(url: string): string {
  const relativePath = url.replace(TMDB_IMAGE_ORIGIN, '').replace(/^\/+/, '');
  return `${TMDB_IMAGE_PROXY}?path=${encodeURIComponent(relativePath)}`;
}

async function fetchPosterData(
  urls: string[],
  concurrency: number
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const pending = urls.filter((url) => {
    const cached = posterDataCache.get(url);
    if (cached) result.set(url, cached);
    return !cached;
  });

  let cursor = 0;
  const worker = async () => {
    while (cursor < pending.length) {
      const url = pending[cursor++];
      const dataUrl = await urlToDataUrl(toProxyUrl(url));
      if (dataUrl) {
        posterDataCache.set(url, dataUrl);
        result.set(url, dataUrl);
      }
    }
  };

  const workerCount = Math.min(concurrency, pending.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return result;
}

interface Props {
  onToggleStats: () => void;
  statsVisible: boolean;
}

export function ExportPanel({ onToggleStats, statsVisible }: Props) {
  const board = useActiveBoard();
  const [copied, setCopied] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const movies = board?.movies ?? [];
  const tiers = board?.tiers ?? [];
  const tierMovieIds = board?.tierMovies ?? {};

  if (movies.length === 0) return null;

  const movieById = new Map(movies.map((m) => [m.id, m]));
  const assignedCount = Object.values(tierMovieIds).reduce((sum, ids) => sum + ids.length, 0);
  const changedCount = Object.entries(tierMovieIds).reduce((sum, [tierId, ids]) => {
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier) return sum;
    return sum + ids.filter((id) => {
      const movie = movieById.get(id);
      return movie != null && movie.originalRating !== null && movie.originalRating !== tier.starRating;
    }).length;
  }, 0);

  const assignedIds = new Set(Object.values(tierMovieIds).flat());
  const hasUnassignedRated = movies.some(
    (m) => m.originalRating !== null && !assignedIds.has(m.id)
  );

  const handleExport = () => {
    const csv = generateLetterboxdCSV(tierMovieIds, tiers, movies);
    downloadCSV(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportJson = () => {
    if (board) downloadBoardJson(board);
  };

  const handleSaveImage = async () => {
    const el = document.getElementById('tier-list-container');
    if (!el) return;

    setSavingImage(true);
    setImageError(null);

    try {
      const { default: html2canvas } = await import('html2canvas');

      const imageUrls = [...new Set(
        Array.from(el.querySelectorAll('img'))
          .map((img) => img.getAttribute('src'))
          .filter((src): src is string => Boolean(src))
      )];
      const posterMap = await fetchPosterData(imageUrls, 10);

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.left = '-9999px';
      iframe.style.top = '0';
      iframe.style.width = el.offsetWidth + 'px';
      iframe.style.height = el.offsetHeight + 'px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error('Could not access iframe document');
      }

      const walk = (source: Element, target: Element) => {
        const srcHtml = source as HTMLElement;
        const tgtHtml = target as HTMLElement;

        if (srcHtml.style && tgtHtml.style) {
          const computed = window.getComputedStyle(srcHtml);
          const parts: string[] = [];
          for (let i = 0; i < computed.length; i++) {
            const key = computed[i];
            if (key.startsWith('--')) continue;
            let val = computed.getPropertyValue(key);
            if (val.includes('oklch') || val.includes('oklab')) {
              val = val.replace(/oklch|oklab/gi, 'srgb');
            }
            parts.push(`${key}: ${val}`);
          }
          tgtHtml.style.cssText = parts.join('; ');
        }

        if (tgtHtml.hasAttribute('data-export-hide')) {
          tgtHtml.style.display = 'none';
        }

        if (tgtHtml.hasAttribute('data-export-only')) {
          tgtHtml.removeAttribute('data-export-only');
          if (tgtHtml.style.display === 'none') {
            tgtHtml.style.display = 'block';
          }
        }

        if (tgtHtml.tagName === 'IMG') {
          const src = tgtHtml.getAttribute('src');
          if (src && posterMap.has(src)) {
            tgtHtml.setAttribute('src', posterMap.get(src)!);
          } else {
            tgtHtml.style.display = 'none';
          }
        }
        const srcChildren = source.children;
        const tgtChildren = target.children;
        for (let i = 0; i < srcChildren.length && i < tgtChildren.length; i++) {
          walk(srcChildren[i], tgtChildren[i]);
        }
      };

      const clone = el.cloneNode(true) as HTMLElement;
      walk(el, clone);
      iframeDoc.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        backgroundColor: '#0a0a0b',
        scale: 2,
        imageTimeout: 0,
      });

      document.body.removeChild(iframe);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );

      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = 'tierboxd.png';
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to capture image');
    } finally {
      setSavingImage(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pb-10">
      <div className="card overflow-hidden">
        <div className="panel-header">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
              <Download className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <h3 className="font-display text-base font-semibold tracking-tight text-zinc-100">
              Export
            </h3>
          </div>
          <span className="badge border border-zinc-700 bg-zinc-800/60 text-zinc-400">
            {assignedCount}/{movies.length} assigned
          </span>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3">
              <div className="font-display text-2xl font-semibold text-zinc-100">
                {movies.length}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                Total films
              </div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3">
              <div className="font-display text-2xl font-semibold text-zinc-100">
                {assignedCount}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                In tiers
              </div>
            </div>
            <div className="rounded-xl border border-accent-500/25 bg-accent-500/[0.06] px-3 py-3">
              <div className="font-display text-2xl font-semibold text-accent-300">
                {changedCount}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-600">
                Ratings changed
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveImage}
              disabled={savingImage}
              className="btn btn-surface flex-1"
            >
              {savingImage ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
                  Saving…
                </>
              ) : (
                <>
                  <Image className="h-4 w-4" strokeWidth={2.2} />
                  Save as image
                </>
              )}
            </button>

            <button
              onClick={onToggleStats}
              className={`btn flex-1 ${
                statsVisible
                  ? 'border border-accent-500/40 bg-accent-500/10 text-accent-300'
                  : 'btn-surface'
              }`}
            >
              <BarChart3 className="h-4 w-4" strokeWidth={2.2} />
              {statsVisible ? 'Hide stats' : 'Show stats'}
            </button>
          </div>

          {imageError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" strokeWidth={2.2} />
              <div>
                <p className="text-xs font-medium text-red-300">{imageError}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Try refreshing the page. TMDB poster images must be cached with CORS enabled.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <p className="text-xs leading-relaxed text-zinc-500">
              Downloads a CSV file compatible with{' '}
              <a
                href="https://letterboxd.com/settings/import-data/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-400 hover:underline"
              >
                Letterboxd's importer
              </a>
              . Includes rated films and films placed in a tier. Unassigned rated films keep
              their original rating.
            </p>
          </div>

          {hasUnassignedRated && (
            <div className="flex items-start gap-2 rounded-xl border border-accent-500/20 bg-accent-500/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" strokeWidth={2.2} />
              <p className="text-xs text-accent-300">
                Some rated films are still in the Movie Bank. They will keep their original rating.
              </p>
            </div>
          )}

          <button onClick={handleExport} className="btn btn-primary w-full py-2.5">
            {copied ? (
              <>
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
                Downloaded
              </>
            ) : (
              <>
                <Download className="h-4 w-4" strokeWidth={2.2} />
                Download CSV for Letterboxd
              </>
            )}
          </button>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3">
            <div>
              <p className="text-xs font-semibold text-zinc-300">Backup & share</p>
              <p className="text-[11px] text-zinc-600">
                Download this list as JSON, or import one.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportJson}
                className="btn btn-ghost px-2.5 py-1.5 text-xs"
              >
                <FileJson className="h-3.5 w-3.5" strokeWidth={2.2} />
                Export JSON
              </button>
              <ImportBoardButton className="btn btn-ghost px-2.5 py-1.5 text-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
