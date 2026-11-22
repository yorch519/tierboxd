import { useState } from 'react';
import { Key, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { isValidTmdbKey } from '../lib/tmdb';

export function TmdbKeyModal() {
  const keyModalOpen = useStore((s) => s.keyModalOpen);
  const closeKeyModal = useStore((s) => s.closeKeyModal);
  const setTmdbKey = useStore((s) => s.setTmdbKey);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  if (!keyModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
      setError('Please enter your API key');
      return;
    }
    if (!isValidTmdbKey(input.trim())) {
      setError('Invalid API key format');
      return;
    }
    setTmdbKey(input.trim());
    setInput('');
    closeKeyModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={closeKeyModal}
    >
      <div className="card w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
              <Key className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">
                Use your own TMDB key
              </h2>
              <p className="text-xs text-zinc-500">Optional — not required to use Tierboxd</p>
            </div>
          </div>
          <button onClick={closeKeyModal} className="icon-btn" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label className="label-caps mb-1.5 block">TMDB API key (v3 auth)</label>
            <input
              type="password"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setError('');
              }}
              placeholder="e.g. a1b2c3d4e5f6..."
              autoFocus
              className="input"
            />
            {error && (
              <p className="mt-1.5 flex items-center gap-1 text-xs text-red-400">
                <X className="h-3 w-3" strokeWidth={2.4} />
                {error}
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-primary w-full">
            Save key
          </button>
        </form>

        <div className="border-t border-zinc-800 p-5 pt-4">
          <p className="text-xs leading-relaxed text-zinc-500">
            By default Tierboxd uses a shared proxy, so you don't need a key. Add your own to
            avoid the shared rate limit — it stays in your browser and is only sent to TMDB
            through the proxy.{' '}
            <a
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-400 hover:underline"
            >
              Get one free at themoviedb.org
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
