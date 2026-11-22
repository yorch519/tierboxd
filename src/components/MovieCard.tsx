import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Pencil } from 'lucide-react';
import type { Movie } from '../types';
import { PosterPickerModal } from './PosterPickerModal';

interface Props {
  movie: Movie;
}

export function MovieCard({ movie }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: movie.id,
    data: { type: 'movie', movie },
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `movie-target-${movie.id}`,
    data: { type: 'movie-target', movieId: movie.id },
  });

  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef]
  );

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      title={movie.title}
      {...listeners}
      {...attributes}
      className={`group relative flex w-[104px] shrink-0 cursor-grab flex-col overflow-hidden rounded-xl
                  border border-zinc-800/80 bg-zinc-900 shadow-sm transition-all duration-150
                  active:cursor-grabbing
                  ${isDragging ? 'scale-95 opacity-40' : ''}
                  ${isOver
                    ? 'ring-2 ring-accent-400'
                    : 'hover:-translate-y-0.5 hover:border-accent-500/40 hover:ring-1 hover:ring-accent-500/30'
                  }`}
    >
      {movie.posterUrl ? (
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="aspect-[2/3] w-full bg-zinc-800 object-cover"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div
          data-export-hide
          className="flex aspect-[2/3] w-full flex-col items-center justify-center gap-1 bg-zinc-800 p-2"
        >
          <span className="line-clamp-4 text-center text-[11px] font-medium leading-tight text-zinc-400">
            {movie.title}
          </span>
          <span className="text-[10px] text-zinc-600">{movie.year}</span>
        </div>
      )}

      <button
        data-export-hide
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker(true);
        }}
        className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-md
                   border border-white/10 bg-black/60 text-zinc-300 opacity-0 backdrop-blur-sm
                   transition-all hover:bg-black/80 hover:text-accent-300 group-hover:opacity-100"
        title="Change poster"
      >
        <Pencil className="h-3 w-3" strokeWidth={2.4} />
      </button>

      {isOver && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center">
          <div className="h-full w-1 bg-accent-400 shadow-[0_0_10px_rgba(230,165,60,0.7)]" />
          <div className="h-full flex-1 bg-accent-500/10" />
        </div>
      )}

      <div
        data-export-hide
        className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-2"
      >
        <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-white">
          {movie.title}
        </p>
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[10px] font-medium text-zinc-300">{movie.year}</span>
          {movie.originalRating !== null && (
            <span className="text-[10px] font-semibold text-accent-300">
              {renderStars(movie.originalRating)}
            </span>
          )}
        </div>
      </div>

      {showPicker && createPortal(
        <PosterPickerModal movie={movie} onClose={() => setShowPicker(false)} />,
        document.body
      )}
    </div>
  );
}

function renderStars(rating: number): string {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let result = '\u2605'.repeat(full);
  if (half) result += '\u00BD';
  return result || String(rating);
}
