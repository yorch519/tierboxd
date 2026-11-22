import { useState } from 'react';
import { Download, AlertCircle, CheckCircle2, Image, BarChart3 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateLetterboxdCSV, downloadCSV } from '../lib/csvExporter';
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
  const movies = useStore((s) => s.movies);
  const tiers = useStore((s) => s.tiers);
  const tierMovieIds = useStore((s) => s.tierMovies);
  const [copied, setCopied] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

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
    <div className="max-w-7xl mx-auto px-4 pb-8">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">Export</h3>
          <span className="text-[10px] text-zinc-500">
            {assignedCount}/{movies.length} assigned
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-zinc-800/50 rounded-lg py-2">
            <div className="text-lg font-bold text-zinc-200">{movies.length}</div>
            <div className="text-[10px] text-zinc-500">Total films</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg py-2">
            <div className="text-lg font-bold text-zinc-200">{assignedCount}</div>
            <div className="text-[10px] text-zinc-500">In tiers</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg py-2">
            <div className="text-lg font-bold text-orange-400">{changedCount}</div>
            <div className="text-[10px] text-zinc-500">Ratings changed</div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSaveImage}
            disabled={savingImage}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700
                       text-zinc-200 text-sm font-medium rounded-lg transition-colors
                       disabled:opacity-50 disabled:cursor-wait"
          >
            {savingImage ? (
              <>
                <span className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Image className="w-4 h-4" />
                Save as Image
              </>
            )}
          </button>

          <button
            onClick={onToggleStats}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-colors
                       ${statsVisible
                         ? 'bg-orange-600/20 text-orange-300 border border-orange-500/30'
                         : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                       }`}
          >
            <BarChart3 className="w-4 h-4" />
            {statsVisible ? 'Hide Stats' : 'Show Stats'}
          </button>
        </div>

        {imageError && (
          <div className="flex items-start gap-2 p-2.5 bg-red-400/10 border border-red-400/20 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[11px] text-red-300">{imageError}</p>
              <p className="text-[10px] text-zinc-500 mt-1">
                Try refreshing the page. TMDB poster images must be cached with CORS enabled.
              </p>
            </div>
          </div>
        )}

        <div className="p-3 bg-zinc-800/50 rounded-lg">
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Downloads a CSV file compatible with{' '}
            <a
              href="https://letterboxd.com/settings/import-data/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:underline"
            >
              Letterboxd's importer
            </a>
            . Only films with an original rating are included. Unassigned rated films keep their original rating.
          </p>
        </div>

        {hasUnassignedRated && (
          <div className="flex items-start gap-2 p-2.5 bg-amber-400/10 border border-amber-400/20 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-amber-300">
              Some rated films are still in the Movie Bank. They will keep their original rating.
            </p>
          </div>
        )}

        <button
          onClick={handleExport}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-orange-600 hover:bg-orange-500
                     text-white text-sm font-medium rounded-lg transition-colors"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Downloaded
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download CSV for Letterboxd
            </>
          )}
        </button>
      </div>
    </div>
  );
}
