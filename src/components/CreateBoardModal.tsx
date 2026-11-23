import { useState } from 'react';
import { LayoutTemplate, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useEscapeKey } from '../hooks/useEscapeKey';
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

  useEscapeKey(onClose);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createBoard(name || 'Untitled list', template, 'manual');
    setView('board');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="New tier list"
    >
      <div className="card w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
              <LayoutTemplate className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight text-zinc-100">
                New tier list
              </h2>
              <p className="text-xs text-zinc-500">Pick a name and a tier layout</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Close">
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-5 p-5">
          <div>
            <label className="label-caps mb-1.5 block">List name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Best of 2026"
              autoFocus
              className="input"
            />
          </div>

          <div>
            <span className="label-caps mb-2 block">Tiers</span>
            <div className="grid gap-2">
              {TIER_TEMPLATE_ORDER.map((id) => {
                const templateInfo = TIER_TEMPLATES[id];
                const active = template === id;
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => setTemplate(id)}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? 'border-accent-500/60 bg-accent-500/10'
                        : 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50'
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-zinc-100">
                        {templateInfo.label}
                      </div>
                      <div className="text-[11px] text-zinc-500">{templateInfo.description}</div>
                    </div>
                    <div className="flex gap-0.5">
                      {templateInfo.tiers.slice(0, 6).map((tier) => (
                        <span
                          key={tier.id}
                          className="h-6 w-3 rounded-sm"
                          style={{ backgroundColor: tier.color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <button type="submit" className="btn btn-primary w-full">
            Create list
          </button>
        </form>
      </div>
    </div>
  );
}
