// core/ — one-shot facts emitted per tick for render/audio/haptics (tech-spec §3).

export type SimEvent =
  | { type: 'tile-dug'; col: number; row: number; tileType: 'dirt' | 'rock' }
  | { type: 'player-moved'; x: number; y: number };
