import { useState } from 'react';
import { Download, AlertCircle, CheckCircle2, Image, BarChart3 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateLetterboxdCSV, downloadCSV } from '../lib/csvExporter';

interface Props {
  onToggleStats: () => void;
  statsVisible: boolean;
}

export function ExportPanel({ onToggleStats, statsVisible }: Props) {
  const movies = useStore((s) => s.movies);
  const tiers = useStore((s) => s.tiers);
  const tierMovies = useStore((s) => s.tierMovies);
  const [copied, setCopied] = useState(false);
  const [savingImage, setSavingImage] = useState(false);

  if (movies.length === 0) return null;

  const assignedCount = Object.values(tierMovies).reduce((sum, ms) => sum + ms.length, 0);
  const changedCount = Object.entries(tierMovies).reduce((sum, [tierId, ms]) => {
    const tier = tiers.find((t) => t.id === tierId);
    if (!tier) return sum;
    return sum + ms.filter((m) => m.originalRating !== null && m.originalRating !== tier.starRating).length;
  }, 0);

  const hasUnassignedRated = movies.some(
    (m) =>
      m.originalRating !== null &&
      !Object.values(tierMovies).some((ms) => ms.some((tm) => tm.id === m.id))
  );

  const handleExport = () => {
    const csv = generateLetterboxdCSV(tierMovies, tiers, movies);
    downloadCSV(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveImage = async () => {
    const el = document.getElementById('tier-list-container');
    if (!el) return;

    setSavingImage(true);

    const { default: html2canvas } = await import('html2canvas');

    const canvas = await html2canvas(el, {
      backgroundColor: '#0a0a0b',
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    const link = document.createElement('a');
    link.download = 'tierboxd.png';
    link.href = canvas.toDataURL('image/png');
    link.click();

    setSavingImage(false);
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
