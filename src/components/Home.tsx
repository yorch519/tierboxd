import { useState } from 'react';
import { Film, Plus, Upload, Copy, Pencil, Trash2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CreateBoardModal } from './CreateBoardModal';
import type { Board } from '../types';

function assignedCount(board: Board): number {
  return Object.values(board.tierMovies).reduce((sum, ids) => sum + ids.length, 0);
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
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Your tier lists</h1>
          <p className="text-sm text-zinc-500">
            Create a list from scratch or import your Letterboxd data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-500
                       text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New list
          </button>
          <button
            onClick={() => setView('import')}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700
                       text-zinc-200 text-sm font-medium rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import Letterboxd
          </button>
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30">
          <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
            <Film className="w-6 h-6 text-zinc-500" />
          </div>
          <p className="text-sm text-zinc-400">No lists yet</p>
          <p className="text-xs text-zinc-600 max-w-sm text-center">
            Create your first tier list or import your Letterboxd ratings to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((board) => (
            <div
              key={board.id}
              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 transition-colors"
            >
              <button onClick={() => openBoard(board.id)} className="w-full text-left">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide ${
                      board.origin === 'letterboxd'
                        ? 'bg-orange-600/20 text-orange-300'
                        : 'bg-zinc-700/50 text-zinc-400'
                    }`}
                  >
                    {board.origin}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {new Date(board.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-zinc-100 truncate">
                  {board.name}
                </h3>
                <p className="text-xs text-zinc-500">
                  {board.movies.length} films · {assignedCount(board)} in tiers · {board.tiers.length} tiers
                </p>
              </button>

              <div className="mt-3 flex items-center gap-1 border-t border-zinc-800 pt-2">
                <button
                  onClick={() => handleRename(board)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Rename
                </button>
                <button
                  onClick={() => handleDuplicate(board.id)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  Duplicate
                </button>
                <button
                  onClick={() => handleDelete(board)}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
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
