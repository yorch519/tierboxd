import { useState } from 'react';
import { useStore, useActiveBoard } from './store/useStore';
import { Header } from './components/Header';
import { TmdbKeyModal } from './components/TmdbKeyModal';
import { Home } from './components/Home';
import { DataImport } from './components/DataImport';
import { TierBoard } from './components/TierBoard';
import { StatsPanel } from './components/StatsPanel';
import { ExportPanel } from './components/ExportPanel';
import { Footer } from './components/Footer';

export default function App() {
  const view = useStore((s) => s.view);
  const board = useActiveBoard();
  const [statsVisible, setStatsVisible] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <TmdbKeyModal />
      <Header />

      <main className="flex-1">
        {view === 'home' && <Home />}

        {view === 'import' && <DataImport />}

        {view === 'board' && (
          <>
            <TierBoard />
            {statsVisible && board && (
              <div className="mx-auto max-w-7xl px-3 pb-4 sm:px-5 sm:pb-5">
                <StatsPanel
                  tiers={board.tiers}
                  tierMovieIds={board.tierMovies}
                  movies={board.movies}
                  onClose={() => setStatsVisible(false)}
                />
              </div>
            )}
            <ExportPanel
              statsVisible={statsVisible}
              onToggleStats={() => setStatsVisible((visible) => !visible)}
            />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
