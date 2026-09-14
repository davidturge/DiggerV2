// core/ — tile grid: dirt / hard rock / tunnel, built from an ASCII string array
// (legend per tech-spec §10, restricted here to the tile-only subset this slice needs).

export type TileType = 'dirt' | 'rock' | 'tunnel';

export interface Cell {
  type: TileType;
  /** Hits left before rock clears to tunnel. Meaningless once type !== 'rock'. */
  rockHitsRemaining: number;
}

export interface TileGrid {
  width: number;
  height: number;
  /** Row-major: index = row * width + col. */
  cells: readonly Cell[];
}

export const ROCK_HITS_TO_CLEAR = 2;

const LEGEND: Record<string, TileType> = {
  D: 'dirt',
  R: 'rock',
  ' ': 'tunnel',
  P: 'tunnel', // player start marker; the tile itself is open tunnel
};

export interface ParsedLevel {
  grid: TileGrid;
  playerStart: { x: number; y: number };
}

export function parseLevel(rows: readonly string[]): ParsedLevel {
  const [firstRow] = rows;
  if (firstRow === undefined) {
    throw new Error('parseLevel: level must have at least one row');
  }
  const width = firstRow.length;
  const height = rows.length;
  const cells: Cell[] = new Array(width * height);
  let playerStart = { x: Math.floor(width / 2) + 0.5, y: Math.floor(height / 2) + 0.5 };
  let foundPlayerStart = false;

  rows.forEach((row, rowIndex) => {
    if (row.length !== width) {
      throw new Error(`parseLevel: row ${rowIndex} has length ${row.length}, expected ${width}`);
    }
    for (let col = 0; col < width; col++) {
      const ch = row.charAt(col);
      const type = LEGEND[ch];
      if (!type) {
        throw new Error(`parseLevel: unknown tile "${ch}" at row ${rowIndex}, col ${col}`);
      }
      cells[rowIndex * width + col] = {
        type,
        rockHitsRemaining: type === 'rock' ? ROCK_HITS_TO_CLEAR : 0,
      };
      if (ch === 'P') {
        if (foundPlayerStart) {
          throw new Error(`parseLevel: duplicate "P" start marker at row ${rowIndex}, col ${col}`);
        }
        playerStart = { x: col + 0.5, y: rowIndex + 0.5 };
        foundPlayerStart = true;
      }
    }
  });

  return { grid: { width, height, cells }, playerStart };
}

export function inBounds(grid: TileGrid, col: number, row: number): boolean {
  return col >= 0 && col < grid.width && row >= 0 && row < grid.height;
}

export function getCell(grid: TileGrid, col: number, row: number): Cell | undefined {
  if (!inBounds(grid, col, row)) return undefined;
  return grid.cells[row * grid.width + col];
}

export function setCell(grid: TileGrid, col: number, row: number, cell: Cell): TileGrid {
  const cells = grid.cells.slice();
  cells[row * grid.width + col] = cell;
  return { ...grid, cells };
}

/** Rock still holding hits blocks; dirt/tunnel/cleared-rock never do. */
export function isBlocking(cell: Cell | undefined): boolean {
  if (!cell) return false; // out-of-bounds is handled separately via inBounds
  return cell.type === 'rock' && cell.rockHitsRemaining > 0;
}
