import { useState } from 'react';
import { useStore } from './store/useStore';
import { Header } from './components/Header';
import { TmdbKeyModal } from './components/TmdbKeyModal';
import { Home } from './components/Home';
import { DataImport } from './components/DataImport';
import { TierBoard } from './components/TierBoard';
import { ExportPanel } from './components/ExportPanel';
import { Footer } from './components/Footer';

export default function App() {
  const view = useStore((s) => s.view);
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
            <TierBoard
              statsVisible={statsVisible}
              onCloseStats={() => setStatsVisible(false)}
            />
            <ExportPanel
              statsVisible={statsVisible}
              onToggleStats={() => setStatsVisible((v) => !v)}
            />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
