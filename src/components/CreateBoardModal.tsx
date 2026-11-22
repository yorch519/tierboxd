import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { TIER_TEMPLATES, TIER_TEMPLATE_ORDER } from '../lib/tierTemplates';
import type { TierTemplateId } from '../types';

interface Props {
  onClose: () => void;
}

export function CreateBoardModal({ onClose }: Props) {
  const createBoard = useStore((s) => s.createBoard);
  const setView = useStore((s) => s.setView);
  const [name, setName] = useState('');
  const [template, setTemplate] = useState<TierTemplateId>('stars');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createBoard(name || 'Untitled list', template, 'manual');
    setView('board');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-lg mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">New tier list</h2>
            <p className="text-xs text-zinc-500">Pick a name and a tier layout</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">List name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Best of 2026"
              autoFocus
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm
                         placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500
                         transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Tiers</label>
            <div className="grid gap-2">
              {TIER_TEMPLATE_ORDER.map((id) => {
                const templateInfo = TIER_TEMPLATES[id];
                const active = template === id;
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setTemplate(id)}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-colors
                      ${active
                        ? 'border-orange-500 bg-orange-600/10'
                        : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/50'
                      }`}
                  >
                    <div>
                      <div className="text-sm text-zinc-200">{templateInfo.label}</div>
                      <div className="text-[11px] text-zinc-500">{templateInfo.description}</div>
                    </div>
                    <div className="flex gap-0.5">
                      {templateInfo.tiers.slice(0, 6).map((tier) => (
                        <span
                          key={tier.id}
                          className="w-3 h-6 rounded-sm"
                          style={{ backgroundColor: tier.color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg
                       transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                       focus:ring-offset-zinc-900"
          >
            Create list
          </button>
        </form>
      </div>
    </div>
  );
}
