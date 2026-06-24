import { Film, Key, LogOut } from 'lucide-react';
import { useStore } from '../store/useStore';

export function Header() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const movies = useStore((s) => s.movies);
  const reset = useStore((s) => s.reset);
  const tmdbKey = useStore((s) => s.tmdbKey);
  const clearTmdbKey = useStore((s) => s.clearTmdbKey);

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-zinc-950">
      <button
        onClick={() => setView('import')}
        className="flex items-center gap-2 text-zinc-100 hover:text-orange-400 transition-colors"
      >
        <Film className="w-6 h-6" />
        <span className="font-bold text-lg tracking-tight">Tierboxd</span>
      </button>

      <div className="flex items-center gap-3">
        {tmdbKey ? (
          <>
            <span
              className="text-[10px] text-zinc-500 font-mono cursor-pointer hover:text-zinc-300 transition-colors"
              onClick={() => clearTmdbKey()}
              title="Click to change TMDB key"
            >
              <Key className="w-3 h-3 inline mr-1" />
              {tmdbKey.slice(0, 4)}...{tmdbKey.slice(-4)}
            </span>
            <button
              onClick={() => clearTmdbKey()}
              className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
              title="Change TMDB key"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <span className="text-[10px] text-zinc-600">No TMDB key</span>
        )}

        {tmdbKey && (
          <button
            onClick={() => setView('board')}
            className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
              view === 'board'
                ? 'bg-orange-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            Tier Board
          </button>
        )}
        {movies.length > 0 && (
          <span className="text-xs text-zinc-600">{movies.length} films</span>
        )}
        <button
          onClick={() => { if (confirm('Reset all movies and tiers?')) reset(); }}
          className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
        >
          Reset
        </button>
      </div>
    </header>
  );
}
