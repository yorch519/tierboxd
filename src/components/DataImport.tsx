import { useState, useCallback, useRef } from 'react';
import { Upload, FileArchive, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';
import { useStore } from '../store/useStore';
import { extractMovies } from '../lib/csvParser';
import { searchMovie, fetchPoster } from '../lib/tmdb';

export function DataImport() {
  const setMovies = useStore((s) => s.setMovies);
  const setLoadingPosters = useStore((s) => s.setLoadingPosters);
  const setPosterForMovie = useStore((s) => s.setPosterForMovie);
  const setView = useStore((s) => s.setView);
  const tmdbKey = useStore((s) => s.tmdbKey);

  const [status, setStatus] = useState<'idle' | 'parsing' | 'fetching' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [message, setMessage] = useState('');
  const abortRef = useRef(false);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    abortRef.current = false;
    setStatus('parsing');
    setMessage('Reading files...');

    try {
      const files: Record<string, string> = {};

      for (const file of fileList) {
        if (file.name.endsWith('.zip')) {
          const zip = await JSZip.loadAsync(file);
          for (const [name, entry] of Object.entries(zip.files)) {
            if (entry.dir) continue;
            const content = await entry.async('string');
            files[name] = content;
          }
        } else if (file.name.endsWith('.csv')) {
          files[file.name] = await file.text();
        }
      }

      const movies = extractMovies(files);

      if (movies.length === 0) {
        setStatus('error');
        setMessage('No valid movies found. Make sure you uploaded your Letterboxd data export.');
        return;
      }

      setMovies(movies);
      setMessage(`Found ${movies.length} movies. Fetching posters...`);

      setStatus('fetching');
      setLoadingPosters(true);

      const toFetch = movies.filter((m) => !m.posterUrl && m.title);
      setProgress({ current: 0, total: toFetch.length });

      const batchSize = 5;
      for (let i = 0; i < toFetch.length; i += batchSize) {
        if (abortRef.current) break;
        const batch = toFetch.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (movie) => {
            try {
              if (movie.tmdbId) {
                const posterUrl = await fetchPoster(movie.tmdbId, tmdbKey);
                if (posterUrl) setPosterForMovie(movie.id, posterUrl);
              } else {
                const result = await searchMovie(movie.title, movie.year, tmdbKey);
                if (result) {
                  setPosterForMovie(movie.id, result.posterUrl);
                }
              }
            } catch { /* skip */ }
          })
        );
        setProgress({ current: Math.min(i + batchSize, toFetch.length), total: toFetch.length });
      }

      setLoadingPosters(false);
      setStatus('done');
      setTimeout(() => setView('board'), 600);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to process files');
    }
  }, [tmdbKey, setMovies, setPosterForMovie, setLoadingPosters, setView]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  }, [handleFiles]);

  if (status === 'fetching') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
        <p className="text-zinc-300 text-sm">{message}</p>
        <div className="w-64 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-orange-500 rounded-full transition-all duration-300"
            style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
          />
        </div>
        <p className="text-xs text-zinc-500">
          {progress.current} / {progress.total} posters
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-zinc-100">Import your Letterboxd data</h2>
        <p className="text-sm text-zinc-500 max-w-md">
          Export your data from Letterboxd (Settings &gt; Data &gt; Export) and drop the ZIP file here,
          or upload individual CSV files.
        </p>
      </div>

      <label
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex flex-col items-center gap-3 w-full max-w-md p-10 border-2 border-dashed
                   border-zinc-700 rounded-xl bg-zinc-900/50 hover:border-orange-500/50
                   hover:bg-zinc-900 transition-all cursor-pointer group"
      >
        <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center
                        group-hover:bg-orange-600/20 transition-colors">
          <Upload className="w-6 h-6 text-zinc-500 group-hover:text-orange-400 transition-colors" />
        </div>
        <p className="text-sm text-zinc-400">
          <span className="text-orange-400 font-medium">Click to upload</span> or drag and drop
        </p>
        <div className="flex gap-2 text-xs text-zinc-600">
          <span className="flex items-center gap-1"><FileArchive className="w-3 h-3" /> .zip</span>
          <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> .csv</span>
        </div>
        <input
          type="file"
          accept=".zip,.csv"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />
      </label>

      {status === 'done' && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          Import complete
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {message}
        </div>
      )}

      <div className="mt-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg max-w-md">
        <p className="text-xs text-zinc-500 leading-relaxed">
          <strong className="text-zinc-400">How to export from Letterboxd:</strong><br />
          1. Go to{' '}
          <a href="https://letterboxd.com/settings/data/" target="_blank" rel="noopener noreferrer"
             className="text-orange-400 hover:underline">Settings &gt; Data</a>
          <br />
          2. Click <strong>Export Your Data</strong><br />
          3. Drop the downloaded ZIP file here
        </p>
      </div>
    </div>
  );
}
