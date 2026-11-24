import { useState } from 'react';
import { Film, Plus, Upload, Copy, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CreateBoardModal } from './CreateBoardModal';
import { ImportBoardButton } from './ImportBoardButton';
import type { Board } from '../types';

function PosterStrip({ board }: { board: Board }) {
  const posters = board.movies
    .map((movie) => movie.posterUrl)
    .filter((url): url is string => Boolean(url))
    .slice(0, 4);

  return (
    <div className="flex h-24 gap-1 overflow-hidden border-b border-zinc-800/70 bg-zinc-950/40">
      {posters.length > 0 ? (
        posters.map((url, index) => (
          <img
            key={index}
            src={url}
            alt=""
            className="h-full flex-1 object-cover opacity-90 transition-opacity group-hover:opacity-100"
            loading="lazy"
            draggable={false}
          />
        ))
      ) : (
        <div className="flex h-full w-full items-center justify-center text-zinc-700">
          <Film className="h-7 w-7" strokeWidth={1.8} />
        </div>
      )}
    </div>
  );
}

export function Home() {
  const boards = useStore((s) => s.boards);
  const setActiveBoard = useStore((s) => s.setActiveBoard);
  const setView = useStore((s) => s.setView);
  const renameBoard = useStore((s) => s.renameBoard);
  const duplicateBoard = useStore((s) => s.duplicateBoard);
  const deleteBoard = useStore((s) => s.deleteBoard);
  const [creating, setCreating] = useState(false);

  const openBoard = (id: string) => {
    setActiveBoard(id);
    setView('board');
  };

  const handleRename = (board: Board) => {
    const name = window.prompt('Rename list', board.name);
    if (name && name.trim()) renameBoard(board.id, name);
  };

  const handleDelete = (board: Board) => {
    if (window.confirm(`Delete "${board.name}"? This cannot be undone.`)) {
      deleteBoard(board.id);
    }
  };

  const handleDuplicate = (id: string) => {
    const newId = duplicateBoard(id);
    if (newId) openBoard(newId);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-10 px-5 py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="label-caps">Library</span>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-zinc-100">
            Your tier lists
          </h1>
          <p className="mt-2 max-w-md text-sm text-zinc-400">
            Build a ranking from scratch or turn your Letterboxd ratings into tiers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCreating(true)} className="btn btn-primary">
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            New list
          </button>
          <button onClick={() => setView('import')} className="btn btn-surface">
            <Upload className="h-4 w-4" strokeWidth={2.2} />
            Import Letterboxd
          </button>
          <ImportBoardButton className="btn btn-ghost" />
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-5 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-accent-400/80">
            <Film className="h-7 w-7" strokeWidth={1.8} />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-zinc-100">No lists yet</h2>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              Create your first tier list or import your Letterboxd ratings to get started.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => setCreating(true)} className="btn btn-primary">
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              New list
            </button>
            <button onClick={() => setView('import')} className="btn btn-surface">
              <Upload className="h-4 w-4" strokeWidth={2.2} />
              Import Letterboxd
            </button>
            <ImportBoardButton className="btn btn-ghost" />
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <div
              key={board.id}
              className="group card overflow-hidden transition-all duration-200 hover:border-accent-500/30 hover:shadow-[0_18px_40px_-24px_rgba(230,165,60,0.45)]"
            >
              <button onClick={() => openBoard(board.id)} className="block w-full text-left">
                <PosterStrip board={board} />
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`badge border ${
                        board.origin === 'letterboxd'
                          ? 'border-accent-500/30 bg-accent-500/10 text-accent-300'
                          : 'border-zinc-700 bg-zinc-800/60 text-zinc-400'
                      }`}
                    >
                      {board.origin === 'letterboxd' ? 'Letterboxd' : 'Manual'}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-600">
                      {new Date(board.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <h3 className="truncate font-display text-lg font-semibold tracking-tight text-zinc-100 transition-colors group-hover:text-accent-300">
                      {board.name}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      {board.movies.length} films · {board.tiers.length} tiers
                    </p>
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-1 border-t border-zinc-800/80 px-2 py-1.5">
                <button
                  onClick={() => handleRename(board)}
                  className="btn btn-ghost px-2 py-1 text-[11px]"
                >
                  <Pencil className="h-3 w-3" strokeWidth={2.2} />
                  Rename
                </button>
                <button
                  onClick={() => handleDuplicate(board.id)}
                  className="btn btn-ghost px-2 py-1 text-[11px]"
                >
                  <Copy className="h-3 w-3" strokeWidth={2.2} />
                  Duplicate
                </button>
                <button
                  onClick={() => handleDelete(board)}
                  className="btn btn-ghost ml-auto px-2 py-1 text-[11px] hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" strokeWidth={2.2} />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <CreateBoardModal onClose={() => setCreating(false)} />}
    </div>
  );
}
