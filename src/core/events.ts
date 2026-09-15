// core/ — one-shot facts emitted per tick for render/audio/haptics (tech-spec §3).

export type SimEvent =
  | { type: 'tile-dug'; col: number; row: number; tileType: 'dirt' | 'rock' }
  | { type: 'player-moved'; x: number; y: number }
  | { type: 'sack-wobble-started'; col: number; row: number }
  | { type: 'sack-pushed'; fromCol: number; fromRow: number; toCol: number; toRow: number }
  | { type: 'sack-landed'; col: number; row: number; tilesFallen: number; brokeApart: boolean }
  | { type: 'player-crushed'; col: number; row: number };
