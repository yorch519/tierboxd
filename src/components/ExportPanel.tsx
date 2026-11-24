import { useState, type ReactNode } from 'react';
import {
  Download,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Image,
  Loader2,
  FileJson,
  Upload,
} from 'lucide-react';
import { useActiveBoard } from '../store/useStore';
import { generateLetterboxdCSV, downloadCSV } from '../lib/csvExporter';
import { downloadBoardJson } from '../lib/boardJson';
import { ImportBoardButton } from './ImportBoardButton';
import { Select } from './ui/Select';
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

type ImageLayout = 'auto' | 'single' | 'two';

const EXPORT_COLUMN_GAP = 24;

function getBalancedSplit(heights: number[]): number {
  if (heights.length < 2) return 0;

  const total = heights.reduce((sum, height) => sum + height, 0);
  let leftHeight = 0;
  let bestIndex = 1;
  let bestDifference = Infinity;

  for (let index = 1; index < heights.length; index += 1) {
    leftHeight += heights[index - 1];
    const difference = Math.abs(leftHeight - (total - leftHeight));
    if (difference < bestDifference) {
      bestDifference = difference;
      bestIndex = index;
    }
  }

  return bestIndex;
}

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

const PRIMARY_ACTION_CLASS =
  'group flex items-center gap-3 rounded-xl border border-accent-500/30 bg-accent-500/[0.06] p-3.5 text-left transition-colors hover:border-accent-500/50 hover:bg-accent-500/[0.09] disabled:pointer-events-none disabled:opacity-50';
const PRIMARY_ICON_CLASS =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-500/15 text-accent-300 transition-colors group-hover:bg-accent-500/20 group-hover:text-accent-200';
const SECONDARY_ACTION_CLASS =
  'group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950/40 p-2.5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-900/60 disabled:pointer-events-none disabled:opacity-50';
const SECONDARY_ICON_CLASS =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-500 transition-colors group-hover:text-zinc-300';

interface ExportActionProps {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

function ExportAction({
  icon,
  title,
  description,
  onClick,
  disabled,
  variant = 'secondary',
}: ExportActionProps) {
  const primary = variant === 'primary';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={primary ? PRIMARY_ACTION_CLASS : SECONDARY_ACTION_CLASS}
    >
      <span className={primary ? PRIMARY_ICON_CLASS : SECONDARY_ICON_CLASS}>{icon}</span>
      <span className="min-w-0">
        <span
          className={`block font-semibold ${
            primary ? 'text-sm text-zinc-100' : 'text-xs text-zinc-300'
          }`}
        >
          {title}
        </span>
        <span
          className={`mt-0.5 block leading-snug ${
            primary ? 'text-xs text-zinc-500' : 'text-[11px] text-zinc-600'
          }`}
        >
          {description}
        </span>
      </span>
    </button>
  );
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
  const [imageLayout, setImageLayout] = useState<ImageLayout>('auto');

  const movies = board?.movies ?? [];
  const tiers = board?.tiers ?? [];
  const tierMovieIds = board?.tierMovies ?? {};

  if (movies.length === 0) return null;

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

      const sourceRows = Array.from(
        el.querySelectorAll<HTMLElement>('[data-tier-rows] > div')
      );
      const rowHeights = sourceRows.map((row) => row.getBoundingClientRect().height);
      const useTwoColumns =
        sourceRows.length > 1 &&
        (imageLayout === 'two' ||
          (imageLayout === 'auto' && el.offsetHeight > el.offsetWidth * 1.6));
      const splitIndex = useTwoColumns
        ? Math.min(Math.max(getBalancedSplit(rowHeights), 1), sourceRows.length - 1)
        : sourceRows.length;
      const outputWidth = useTwoColumns
        ? el.offsetWidth * 2 + EXPORT_COLUMN_GAP
        : el.offsetWidth;

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
      iframe.style.width = outputWidth + 'px';
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

      if (useTwoColumns) {
        const rowsContainer = clone.querySelector<HTMLElement>('[data-tier-rows]');
        const rows = rowsContainer
          ? (Array.from(rowsContainer.children) as HTMLElement[])
          : [];

        if (rowsContainer && rows.length > 1) {
          const doc = clone.ownerDocument;
          const wrapper = doc.createElement('div');
          wrapper.style.cssText = `display: flex; align-items: flex-start; gap: ${EXPORT_COLUMN_GAP}px;`;
          const columns = [doc.createElement('div'), doc.createElement('div')];

          for (const column of columns) {
            column.style.cssText =
              'display: flex; flex: 1 1 0; flex-direction: column; min-width: 0;';
          }

          const safeSplit = Math.min(Math.max(splitIndex, 1), rows.length - 1);
          rows.forEach((row, index) => {
            columns[index < safeSplit ? 0 : 1].appendChild(row);
          });

          for (const column of columns) {
            const firstRow = column.firstElementChild as HTMLElement | null;
            if (firstRow) firstRow.style.borderTop = 'none';
          }

          wrapper.append(...columns);
          rowsContainer.replaceWith(wrapper);
          clone.style.width = `${outputWidth}px`;
          clone.style.maxWidth = 'none';
          clone.style.height = 'auto';
        }
      }

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
        link.download = useTwoColumns ? 'tierboxd-2col.png' : 'tierboxd.png';
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
    <div className="mx-auto max-w-7xl px-3 pb-8 sm:px-5 sm:pb-10">
      <div className="card overflow-hidden">
        <div className="panel-header flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-500/15 text-accent-400">
              <Download className="h-4 w-4" strokeWidth={2.2} />
            </span>
            <h3 className="font-display text-base font-semibold tracking-tight text-zinc-100">
              Export
            </h3>
          </div>
          <button
            type="button"
            onClick={onToggleStats}
            className={`btn px-2.5 py-1.5 text-xs ${
              statsVisible
                ? 'border border-accent-500/40 bg-accent-500/10 text-accent-300'
                : 'btn-ghost'
            }`}
            aria-pressed={statsVisible}
          >
            <BarChart3 className="h-3.5 w-3.5" strokeWidth={2.2} />
            {statsVisible ? 'Hide stats' : 'Show stats'}
          </button>
        </div>

        <div className="space-y-5 p-4 sm:p-5">
          <div>
            <span className="label-caps mb-2 block">Download & share</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <ExportAction
                variant="primary"
                icon={
                  savingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} />
                  ) : (
                    <Image className="h-4 w-4" strokeWidth={2.2} />
                  )
                }
                title={savingImage ? 'Saving…' : 'Save as image'}
                description="PNG at 2× for sharing"
                onClick={handleSaveImage}
                disabled={savingImage}
              />
              <ExportAction
                variant="primary"
                icon={
                  copied ? (
                    <CheckCircle2 className="h-4 w-4" strokeWidth={2.4} />
                  ) : (
                    <Download className="h-4 w-4" strokeWidth={2.2} />
                  )
                }
                title={copied ? 'Downloaded' : 'Letterboxd CSV'}
                description={
                  copied ? 'CSV ready to import' : 'Rated films and tier assignments'
                }
                onClick={handleExport}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="label-caps">Image layout</span>
              <Select
                value={imageLayout}
                onChange={(event) => setImageLayout(event.target.value as ImageLayout)}
                aria-label="Image layout"
                className="w-auto py-1 text-xs"
                wrapperClassName="w-[150px]"
              >
                <option value="auto">Auto</option>
                <option value="single">Single column</option>
                <option value="two">Two columns</option>
              </Select>
              <span className="text-xs text-zinc-600">
                {imageLayout === 'auto'
                  ? 'Two columns for tall lists.'
                  : imageLayout === 'two'
                    ? 'Wider image, shorter height.'
                    : 'Classic vertical layout.'}
              </span>
            </div>
            <p className="mt-2 text-xs text-zinc-600">
              CSV compatible with{' '}
              <a
                href="https://letterboxd.com/import/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-400 hover:text-accent-300 hover:underline"
              >
                Letterboxd's importer
              </a>
              .
            </p>
          </div>

          <div>
            <span className="label-caps mb-2 block">Backup</span>
            <div className="grid gap-2 sm:grid-cols-2">
              <ExportAction
                icon={<FileJson className="h-3.5 w-3.5" strokeWidth={2.2} />}
                title="Export JSON"
                description="Backup or share this list"
                onClick={handleExportJson}
              />
              <ImportBoardButton
                className={SECONDARY_ACTION_CLASS}
                icon={
                  <span className={SECONDARY_ICON_CLASS}>
                    <Upload className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </span>
                }
                label="Import JSON"
                description="Restore a list from a backup"
                compact
              />
            </div>
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

          {hasUnassignedRated && (
            <div className="flex items-start gap-2 rounded-xl border border-accent-500/20 bg-accent-500/10 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" strokeWidth={2.2} />
              <p className="text-xs text-accent-300">
                Some rated films are still in the Movie Bank. They will keep their original rating.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
