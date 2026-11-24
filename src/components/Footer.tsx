import { Star } from 'lucide-react';

export function Footer() {
  const year = new Date().getFullYear();
  const repoUrl = 'https://github.com/yorch519/tierboxd';
  const profileUrl = 'https://github.com/yorch519';

  return (
    <footer className="border-t border-zinc-800/80 px-5 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <div className="space-y-1.5">
          <p className="text-sm font-medium leading-relaxed text-zinc-500">
            This product uses the{' '}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 hover:text-accent-300 hover:underline"
            >
              TMDB API
            </a>{' '}
            but is not endorsed or certified by TMDB. Not affiliated with Letterboxd.
          </p>
          <p className="text-xs font-medium text-zinc-600">
            © {year} Tierboxd · Built by{' '}
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-accent-300 hover:underline"
            >
              yorch519
            </a>
          </p>
        </div>

        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-surface group"
        >
          <Star
            className="h-4 w-4 transition-colors group-hover:fill-yellow-400 group-hover:text-yellow-400"
            strokeWidth={2.2}
          />
          Check out the repo
        </a>
      </div>
    </footer>
  );
}
