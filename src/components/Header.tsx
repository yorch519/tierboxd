import { Film, Key, LogOut, RotateCcw } from 'lucide-react';
import { useStore, useActiveBoard } from '../store/useStore';

export function Header() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const reset = useStore((s) => s.reset);
  const tmdbKey = useStore((s) => s.tmdbKey);
  const clearTmdbKey = useStore((s) => s.clearTmdbKey);
  const openKeyModal = useStore((s) => s.openKeyModal);
  const activeBoard = useActiveBoard();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3 sm:px-5">
        <button onClick={() => setView('home')} className="group flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent-500/30 bg-gradient-to-br from-accent-500/25 to-accent-600/5 text-accent-400 shadow-[0_0_24px_-8px_rgba(230,165,60,0.65)]">
            <Film className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl font-semibold tracking-tight text-zinc-100 transition-colors group-hover:text-accent-300">
              Tierboxd
            </span>
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
              Movie tier lists
            </span>
          </span>
        </button>

        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {activeBoard && (
            <button
              onClick={() => setView('board')}
              title={activeBoard.name}
              className={`flex min-w-0 max-w-[140px] items-center gap-2 rounded-xl border px-2.5 py-2 text-sm font-medium transition-colors sm:max-w-[220px] sm:px-3 ${
                view === 'board'
                  ? 'border-accent-500/40 bg-accent-500/10 text-accent-300'
                  : 'border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
              <span className="min-w-0 truncate">{activeBoard.name}</span>
            </button>
          )}

          {activeBoard && (
            <span className="hidden text-xs font-medium text-zinc-600 sm:inline">
              {activeBoard.movies.length} films
            </span>
          )}

          <div className="mx-1 hidden h-5 w-px bg-zinc-800 sm:block" />

          {tmdbKey ? (
            <div className="flex items-center gap-1">
              <button
                onClick={openKeyModal}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
                title="Using your own key — click to change"
              >
                <Key className="h-3.5 w-3.5" strokeWidth={2.2} />
                <span className="hidden font-mono sm:inline">
                  Own key · {tmdbKey.slice(0, 4)}…{tmdbKey.slice(-4)}
                </span>
              </button>
              <button
                onClick={clearTmdbKey}
                className="icon-btn"
                title="Remove your key (use the shared proxy)"
                aria-label="Remove your TMDB key"
              >
                <LogOut className="h-4 w-4" strokeWidth={2.2} />
              </button>
            </div>
          ) : (
              <button
                onClick={openKeyModal}
                className="btn btn-ghost px-2.5 py-1.5 text-xs"
                title="Use your own TMDB key (optional)"
                aria-label="Use your own TMDB key"
              >
              <Key className="h-4 w-4" strokeWidth={2.2} />
              <span className="hidden sm:inline">Own key</span>
            </button>
          )}

          <button
            onClick={() => {
              if (confirm('Delete all tier lists? This cannot be undone.')) reset();
            }}
            className="btn btn-ghost px-2.5 py-1.5 text-xs hover:text-red-400"
            title="Delete all lists"
            aria-label="Delete all lists"
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.2} />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>
    </header>
  );
}
