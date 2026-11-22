import { useState, useCallback, useRef } from 'react';
import { Upload, FileArchive, FileText, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import JSZip from 'jszip';
import { useStore, useActiveBoard } from '../store/useStore';
import { extractMovies } from '../lib/csvParser';
import { searchMovie, fetchPoster } from '../lib/tmdb';
import type { ImportMode } from '../types';

const FETCH_CONCURRENCY = 6;

export function DataImport() {
  const createBoard = useStore((s) => s.createBoard);
  const importMovies = useStore((s) => s.importMovies);
  const seedTiersFromRatings = useStore((s) => s.seedTiersFromRatings);
  const setPosterForBoard = useStore((s) => s.setPosterForBoard);
  const setView = useStore((s) => s.setView);
  const tmdbKey = useStore((s) => s.tmdbKey);
  const activeBoard = useActiveBoard();
  const hasActiveBoard = activeBoard !== null;
  const existingCount = activeBoard?.movies.length ?? 0;

  const [status, setStatus] = useState<'idle' | 'parsing' | 'fetching' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [failed, setFailed] = useState(0);
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'new' | 'active'>('new');
  const [mode, setMode] = useState<ImportMode>('merge');
  const [seedFromRatings, setSeedFromRatings] = useState(true);

  const controllerRef = useRef<AbortController | null>(null);

  const handleCancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  const handleFiles = useCallback(async (fileList: FileList | File[]) => {
    const controller = new AbortController();
    controllerRef.current = controller;
    setFailed(0);
    setStatus('parsing');
    setMessage('Reading files...');

    try {
      const files: Record<string, string> = {};

      for (const file of fileList) {
        if (file.name.endsWith('.zip')) {
          const zip = await JSZip.loadAsync(file);
          for (const [name, entry] of Object.entries(zip.files)) {
            if (entry.dir) continue;
            files[name] = await entry.async('string');
          }
        } else if (file.name.endsWith('.csv')) {
          files[file.name] = await file.text();
        }
      }

      if (controller.signal.aborted) {
        setStatus('idle');
        setMessage('Import cancelled.');
        return;
      }

      const movies = extractMovies(files);

      if (movies.length === 0) {
        setStatus('error');
        setMessage('No valid movies found. Make sure you uploaded your Letterboxd data export.');
        return;
      }

      const snapshot = useStore.getState();
      const currentBoard =
        snapshot.boards.find((board) => board.id === snapshot.activeBoardId) ?? null;
      const importIntoNew = target === 'new' || currentBoard === null;

      if (importIntoNew) {
        createBoard(`Letterboxd ${new Date().toLocaleDateString()}`, 'stars', 'letterboxd');
      }

      const effectiveMode: ImportMode = importIntoNew
        ? 'replace'
        : currentBoard.movies.length > 0
          ? mode
          : 'replace';

      importMovies(movies, effectiveMode);
      if (seedFromRatings) {
        seedTiersFromRatings({ onlyUnassigned: effectiveMode === 'merge' });
      }

      const afterImport = useStore.getState();
      const importedBoard =
        afterImport.boards.find((board) => board.id === afterImport.activeBoardId) ?? null;
      const targetBoardId = importedBoard?.id ?? null;
      const toFetch = importedBoard?.movies.filter((m) => !m.posterUrl && m.title) ?? [];
      setMessage(`Found ${movies.length} movies. Fetching posters...`);
      setStatus('fetching');
      setProgress({ current: 0, total: toFetch.length });

      let done = 0;
      let errors = 0;
      let cursor = 0;

      const worker = async () => {
        while (cursor < toFetch.length) {
          if (controller.signal.aborted) return;
          const movie = toFetch[cursor++];
          let resolved = false;

          try {
            if (movie.tmdbId) {
              const posterUrl = await fetchPoster(movie.tmdbId, tmdbKey, controller.signal);
              if (controller.signal.aborted) return;
              if (posterUrl) {
                if (targetBoardId) setPosterForBoard(targetBoardId, movie.id, posterUrl);
                resolved = true;
              }
            } else {
              const result = await searchMovie(movie.title, movie.year, tmdbKey, controller.signal);
              if (controller.signal.aborted) return;
              if (result) {
                if (targetBoardId) setPosterForBoard(targetBoardId, movie.id, result.posterUrl);
                resolved = true;
              }
            }
          } catch {
            if (controller.signal.aborted) return;
          }

          if (!resolved) errors += 1;
          done += 1;

          if (done === toFetch.length || done % 5 === 0) {
            setProgress({ current: done, total: toFetch.length });
            setFailed(errors);
          }
        }
      };

      const workerCount = Math.min(FETCH_CONCURRENCY, toFetch.length);
      await Promise.all(Array.from({ length: workerCount }, worker));

      if (controller.signal.aborted) {
        setStatus('idle');
        setMessage(`Import cancelled (${done}/${toFetch.length} posters processed).`);
        return;
      }

      setFailed(errors);
      setStatus('done');
      setMessage(
        errors > 0
          ? `Import complete. ${errors} poster${errors === 1 ? '' : 's'} not found.`
          : 'Import complete.'
      );
      setTimeout(() => setView('board'), 600);
    } catch (err) {
      if (controller.signal.aborted) {
        setStatus('idle');
        setMessage('Import cancelled.');
        return;
      }
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Failed to process files');
    } finally {
      controllerRef.current = null;
    }
  }, [
    tmdbKey,
    target,
    mode,
    seedFromRatings,
    createBoard,
    importMovies,
    seedTiersFromRatings,
    setPosterForBoard,
    setView,
  ]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
  }, [handleFiles]);

  if (status === 'parsing' || status === 'fetching') {
    const pct = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
        <p className="text-zinc-300 text-sm">{message}</p>

        {status === 'fetching' && (
          <>
            <div className="w-64 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">
              {progress.current} / {progress.total} posters
              {failed > 0 ? ` · ${failed} not found` : ''}
            </p>
          </>
        )}

        <button
          onClick={handleCancel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400
                     border border-zinc-700 rounded-lg hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
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

      <div className="flex flex-col items-center gap-3">
        {hasActiveBoard && (
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="text-zinc-500">Import to:</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="import-target"
                checked={target === 'new'}
                onChange={() => setTarget('new')}
                className="accent-orange-500"
              />
              New list
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="import-target"
                checked={target === 'active'}
                onChange={() => setTarget('active')}
                className="accent-orange-500"
              />
              Current list
            </label>
          </div>
        )}

        {hasActiveBoard && target === 'active' && existingCount > 0 && (
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="text-zinc-500">Into current:</span>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="import-mode"
                checked={mode === 'merge'}
                onChange={() => setMode('merge')}
                className="accent-orange-500"
              />
              Merge
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="import-mode"
                checked={mode === 'replace'}
                onChange={() => setMode('replace')}
                className="accent-orange-500"
              />
              Replace
            </label>
          </div>
        )}

        <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
          <input
            type="checkbox"
            checked={seedFromRatings}
            onChange={(e) => setSeedFromRatings(e.target.checked)}
            className="accent-orange-500"
          />
          Pre-fill tiers from my ratings
        </label>
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
          {message}
        </div>
      )}

      {status === 'idle' && message && (
        <div className="flex items-center gap-2 text-amber-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {message}
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
