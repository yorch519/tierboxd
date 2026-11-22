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
      {...listeners}
      {...attributes}
      className={`group relative flex-shrink-0 w-[100px] cursor-grab active:cursor-grabbing
                  rounded-lg overflow-hidden transition-all duration-150
                  ${isDragging ? 'opacity-40 scale-95 shadow-xl' : ''}
                  ${isOver ? 'ring-2 ring-orange-400 scale-105' : 'hover:ring-1 hover:ring-orange-500/50 hover:scale-105'}`}
    >
      {movie.posterUrl ? (
        <img
          src={movie.posterUrl}
          alt={movie.title}
          className="w-full aspect-[2/3] object-cover bg-zinc-800"
          loading="lazy"
          draggable={false}
        />
      ) : (
        <div data-export-hide className="w-full aspect-[2/3] bg-zinc-800 flex flex-col items-center justify-center p-2">
          <span className="text-xs text-zinc-500 text-center leading-tight line-clamp-4">
            {movie.title}
          </span>
          <span className="text-[10px] text-zinc-600 mt-1">{movie.year}</span>
        </div>
      )}

      <button
        data-export-hide
        onClick={(e) => { e.stopPropagation(); setShowPicker(true); }}
        className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center rounded
                   bg-black/60 text-zinc-500 hover:text-orange-400 hover:bg-black/80
                   opacity-0 group-hover:opacity-100 transition-opacity z-10"
        title="Change poster"
      >
        <Pencil className="w-2.5 h-2.5" />
      </button>

      {isOver && (
        <div className="absolute inset-0 flex items-center pointer-events-none z-20">
          <div className="w-1 h-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
          <div className="flex-1 h-full bg-orange-500/10" />
        </div>
      )}

      <div data-export-hide className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
        <p className="text-[10px] text-white font-medium leading-tight truncate">
          {movie.title}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">{movie.year}</span>
          {movie.originalRating !== null && (
            <span className="text-[10px] text-orange-300 font-medium">
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
