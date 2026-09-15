// core/ — tile grid: dirt / hard rock / tunnel, built from an ASCII string array
// (full legend per tech-spec §10 / tracker/tickets/007: D dirt, R rock, space
// tunnel, * diamond, G sack, B bank, s spawner, P player start). The entity
// markers (*, G, B, s) sit on open tunnel tiles — level.ts extracts their
// placements; this module only cares about walkability.

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

/** Single source of truth for the entity-marker characters — core/level.ts extracts entity placements using these same keys, so the two never drift apart. */
export const ENTITY_MARKERS = {
  diamond: '*',
  sack: 'G',
  bank: 'B',
  spawner: 's',
} as const;

const LEGEND: Record<string, TileType> = {
  D: 'dirt',
  R: 'rock',
  ' ': 'tunnel',
  P: 'tunnel', // player start marker; the tile itself is open tunnel
  [ENTITY_MARKERS.diamond]: 'tunnel', // entity placement lives on an open tile
  [ENTITY_MARKERS.sack]: 'tunnel',
  [ENTITY_MARKERS.bank]: 'tunnel',
  [ENTITY_MARKERS.spawner]: 'tunnel',
};

export interface ParsedLevel {
  grid: TileGrid;
  playerStart: { x: number; y: number };
}

/** Row-length/legend/duplicate-start-marker checks shared with core/level.ts's schema validation. */
export function validateGridRows(rows: readonly string[]): { width: number; height: number } {
  const [firstRow] = rows;
  if (firstRow === undefined) {
    throw new Error('parseLevel: level must have at least one row');
  }
  const width = firstRow.length;
  let foundPlayerStart = false;

  rows.forEach((row, rowIndex) => {
    if (row.length !== width) {
      throw new Error(`parseLevel: row ${rowIndex} has length ${row.length}, expected ${width}`);
    }
    for (let col = 0; col < width; col++) {
      const ch = row.charAt(col);
      if (!(ch in LEGEND)) {
        throw new Error(`parseLevel: unknown tile "${ch}" at row ${rowIndex}, col ${col}`);
      }
      if (ch === 'P') {
        if (foundPlayerStart) {
          throw new Error(`parseLevel: duplicate "P" start marker at row ${rowIndex}, col ${col}`);
        }
        foundPlayerStart = true;
      }
    }
  });

  return { width, height: rows.length };
}

export function parseLevel(rows: readonly string[], rockHitsToClear: number): ParsedLevel {
  const { width, height } = validateGridRows(rows);
  const cells: Cell[] = new Array(width * height);
  let playerStart = { x: Math.floor(width / 2) + 0.5, y: Math.floor(height / 2) + 0.5 };

  rows.forEach((row, rowIndex) => {
    for (let col = 0; col < width; col++) {
      const ch = row.charAt(col);
      const type = LEGEND[ch] as TileType;
      cells[rowIndex * width + col] = {
        type,
        rockHitsRemaining: type === 'rock' ? rockHitsToClear : 0,
      };
      if (ch === 'P') {
        playerStart = { x: col + 0.5, y: rowIndex + 0.5 };
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
