import type { Board } from '../types';

export function serializeBoard(board: Board): string {
  return JSON.stringify(
    {
      format: 'tierboxd.board',
      version: 1,
      exportedAt: new Date().toISOString(),
      board,
    },
    null,
    2
  );
}

export function downloadBoardJson(board: Board) {
  const blob = new Blob([serializeBoard(board)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(board.name)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'tierboxd-list'
  );
}
