import { useRef, useState, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { useStore } from '../store/useStore';

interface Props {
  className?: string;
  label?: string;
  description?: string;
  icon?: ReactNode;
  compact?: boolean;
}

export function ImportBoardButton({
  className = 'btn btn-surface',
  label = 'Import JSON',
  description,
  icon,
  compact = false,
}: Props) {
  const importBoard = useStore((s) => s.importBoard);
  const setView = useStore((s) => s.setView);
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = (message: string) => {
    setError(message);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setError(null), 3500);
  };

  const handleFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const rawBoard =
        parsed && typeof parsed === 'object' && 'board' in parsed ? parsed.board : parsed;
      const ok = importBoard(rawBoard);
      if (ok) {
        setView('board');
      } else {
        showError('That file is not a valid Tierboxd list.');
      }
    } catch {
      showError('Could not read that JSON file.');
    }
  };

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()} className={className}>
        {icon ?? <Upload className="h-4 w-4" strokeWidth={2.2} />}
        {description ? (
          <span className="min-w-0 text-left">
            <span
              className={`block font-semibold ${
                compact ? 'text-xs text-zinc-300' : 'text-sm text-zinc-200'
              }`}
            >
              {label}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-zinc-600">
              {description}
            </span>
          </span>
        ) : (
          label
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {error && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-red-400/30 bg-red-950/95 px-4 py-2 text-xs font-medium text-red-200 shadow-2xl">
          {error}
        </div>
      )}
    </>
  );
}
