import { useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { ArrowRightLeft, Check, Pencil, Trash2 } from 'lucide-react';
import type { Movie } from '../types';
import { useStore } from '../store/useStore';
import { PosterPickerModal } from './PosterPickerModal';
import { MoveToMenu } from './MoveToMenu';

interface Props {
  movie: Movie;
  onRemove?: () => void;
}

export function MovieCard({ movie, onRemove }: Props) {
  const [showPicker, setShowPicker] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const selected = useStore((s) => s.selectedMovieIds.includes(movie.id));
  const toggleMovieSelection = useStore((s) => s.toggleMovieSelection);

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

  const {
    onMouseDown: dragMouseDown,
    onPointerDown: dragPointerDown,
    ...dragListeners
  } = listeners ?? {};

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      toggleMovieSelection(movie.id);
      return;
    }

    dragMouseDown?.(event);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    if (event.ctrlKey || event.metaKey) {
      if (!dragPointerDown) return;
      event.preventDefault();
      event.stopPropagation();
      toggleMovieSelection(movie.id);
      return;
    }

    dragPointerDown?.(event);
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      title={movie.title}
      {...dragListeners}
      {...attributes}
      onMouseDown={handleMouseDown}
      onPointerDown={handlePointerDown}
      className={`group relative flex w-[104px] shrink-0 cursor-grab flex-col overflow-hidden rounded-xl
                  border border-zinc-800/80 bg-zinc-900 shadow-sm transition-all duration-150
                  active:cursor-grabbing
                  ${isDragging ? 'scale-95 opacity-40' : ''}
                  ${selected
                    ? ''
                    : isOver
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

      <div
        data-export-hide
        className="absolute right-1.5 top-1.5 z-10 flex flex-col gap-1"
      >
        <button
          type="button"
          data-export-hide
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setShowMove(true);
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-black/60
                     text-zinc-300 opacity-100 backdrop-blur-sm transition-all hover:bg-black/80
                     hover:text-accent-300 focus-visible:opacity-100
                     [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
          title="Move to…"
          aria-label={`Move ${movie.title} to a tier`}
        >
          <ArrowRightLeft className="h-3 w-3" strokeWidth={2.4} />
        </button>

        <button
          type="button"
          data-export-hide
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setShowPicker(true);
          }}
          className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-black/60
                     text-zinc-300 opacity-100 backdrop-blur-sm transition-all hover:bg-black/80
                     hover:text-accent-300 focus-visible:opacity-100
                     [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
          title="Change poster"
          aria-label={`Change poster for ${movie.title}`}
        >
          <Pencil className="h-3 w-3" strokeWidth={2.4} />
        </button>

        {onRemove && (
          <button
            type="button"
            data-export-hide
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-black/60
                       text-zinc-300 opacity-100 backdrop-blur-sm transition-all hover:bg-black/80
                       hover:text-red-400 focus-visible:opacity-100
                       [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
            title="Remove from list"
            aria-label={`Remove ${movie.title} from this list`}
          >
            <Trash2 className="h-3 w-3" strokeWidth={2.4} />
          </button>
        )}
      </div>

      {selected && (
        <>
          <div
            data-export-hide
            className="pointer-events-none absolute inset-0 z-10 rounded-xl ring-2 ring-accent-400"
          />
          <div
            data-export-hide
            className="pointer-events-none absolute left-1.5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-accent-500 text-zinc-950 shadow-lg ring-2 ring-zinc-950/60"
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </div>
        </>
      )}

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

      {showMove && createPortal(
        <MoveToMenu movie={movie} onClose={() => setShowMove(false)} />,
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
