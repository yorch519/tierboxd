import { useState } from 'react';
import { Key, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { isValidTmdbKey } from '../lib/tmdb';

export function TmdbKeyModal() {
  const tmdbKey = useStore((s) => s.tmdbKey);
  const setTmdbKey = useStore((s) => s.setTmdbKey);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  if (tmdbKey) return null;

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
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-orange-600/20 flex items-center justify-center">
            <Key className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">TMDB API Key</h2>
            <p className="text-xs text-zinc-500">Required for movie posters</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">
              Paste your TMDB API key (v3 auth)
            </label>
            <input
              type="password"
              value={input}
              onChange={(e) => { setInput(e.target.value); setError(''); }}
              placeholder="e.g. a1b2c3d4e5f6..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm
                         placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500
                         transition-colors"
              autoFocus
            />
            {error && (
              <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                <X className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg
                       transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                       focus:ring-offset-zinc-900"
          >
            Save Key
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 leading-relaxed">
            Don't have a key?{' '}
            <a
              href="https://www.themoviedb.org/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-400 hover:text-orange-300 underline underline-offset-2"
            >
              Get one free at themoviedb.org
            </a>
            . Your key stays in your browser and is never sent anywhere except to TMDB.
          </p>
        </div>
      </div>
    </div>
  );
}
