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
        seedTiersFromRatings({
          onlyUnassigned: effectiveMode === 'merge',
          recordHistory: false,
        });
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
      <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-6 px-5 py-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-accent-400">
          <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2.2} />
        </div>
        <p className="text-sm font-medium text-zinc-300">{message}</p>

        {status === 'fetching' && (
          <>
            <div className="h-1.5 w-64 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-accent-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">
              {progress.current} / {progress.total} posters
              {failed > 0 ? ` · ${failed} not found` : ''}
            </p>
          </>
        )}

        <button onClick={handleCancel} className="btn btn-surface text-xs">
          <X className="h-3.5 w-3.5" strokeWidth={2.4} />
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-7 px-5 py-10">
      <div className="text-center">
        <span className="label-caps">Import</span>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-zinc-100">
          Import your Letterboxd data
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
          Export your data from Letterboxd (Settings → Data → Export) and drop the ZIP here, or
          upload individual CSV files.
        </p>
      </div>

      <div className="card w-full max-w-md p-4">
        <span className="label-caps mb-3 block">Options</span>
        <div className="space-y-3">
          {hasActiveBoard && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span className="text-zinc-500">Import to</span>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="import-target"
                  checked={target === 'new'}
                  onChange={() => setTarget('new')}
                  className="accent-accent-500"
                />
                New list
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="import-target"
                  checked={target === 'active'}
                  onChange={() => setTarget('active')}
                  className="accent-accent-500"
                />
                Current list
              </label>
            </div>
          )}

          {hasActiveBoard && target === 'active' && existingCount > 0 && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
              <span className="text-zinc-500">Mode</span>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === 'merge'}
                  onChange={() => setMode('merge')}
                  className="accent-accent-500"
                />
                Merge
              </label>
              <label className="flex cursor-pointer items-center gap-1.5">
                <input
                  type="radio"
                  name="import-mode"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  className="accent-accent-500"
                />
                Replace
              </label>
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={seedFromRatings}
              onChange={(e) => setSeedFromRatings(e.target.checked)}
              className="accent-accent-500"
            />
            Pre-fill tiers from my ratings
          </label>
        </div>
      </div>

      <label
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="group flex w-full max-w-md cursor-pointer flex-col items-center gap-3 rounded-2xl
                   border-2 border-dashed border-zinc-700 bg-zinc-900/40 p-10 transition-colors
                   hover:border-accent-500/50 hover:bg-zinc-900"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-500 transition-colors group-hover:bg-accent-500/15 group-hover:text-accent-400">
          <Upload className="h-6 w-6" strokeWidth={2} />
        </span>
        <p className="text-sm text-zinc-300">
          <span className="font-semibold text-accent-400">Click to upload</span> or drag and drop
        </p>
        <div className="flex gap-2">
          <span className="badge border border-zinc-700 bg-zinc-800/60 text-zinc-500">
            <FileArchive className="h-3 w-3" /> ZIP
          </span>
          <span className="badge border border-zinc-700 bg-zinc-800/60 text-zinc-500">
            <FileText className="h-3 w-3" /> CSV
          </span>
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
        <div className="flex items-center gap-2 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} />
          {message}
        </div>
      )}

      {status === 'idle' && message && (
        <div className="flex items-center gap-2 text-sm text-accent-300">
          <AlertCircle className="h-4 w-4" strokeWidth={2.2} />
          {message}
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" strokeWidth={2.2} />
          {message}
        </div>
      )}

      <div className="card w-full max-w-md p-4">
        <span className="label-caps mb-2 block">How to export from Letterboxd</span>
        <ol className="space-y-1 text-xs leading-relaxed text-zinc-500">
          <li>
            1. Go to{' '}
            <a
              href="https://letterboxd.com/settings/data/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-400 hover:underline"
            >
              Settings → Data
            </a>
          </li>
          <li>
            2. Click <strong className="font-semibold text-zinc-300">Export Your Data</strong>
          </li>
          <li>3. Drop the downloaded ZIP here</li>
        </ol>
      </div>
    </div>
  );
}
