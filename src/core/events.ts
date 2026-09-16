// core/ — one-shot facts emitted per tick for render/audio/haptics (tech-spec §3).

export type SimEvent =
  | { type: 'tile-dug'; col: number; row: number; tileType: 'dirt' | 'rock' }
  | { type: 'player-moved'; x: number; y: number }
  | { type: 'diamond-picked-up'; id: number; x: number; y: number }
  | { type: 'diamonds-deposited'; count: number; bankedTotal: number }
  // Deposit level-up trigger — the card draw itself is issue #11's concern.
  | { type: 'level-up' }
  | { type: 'level-complete'; elapsedTicks: number }
  | { type: 'player-died'; x: number; y: number; spilledCount: number }
  | { type: 'player-respawned'; x: number; y: number }
  | { type: 'sack-wobble-started'; col: number; row: number }
  | { type: 'sack-pushed'; fromCol: number; fromRow: number; toCol: number; toRow: number }
  | { type: 'sack-landed'; col: number; row: number; tilesFallen: number; brokeApart: boolean }
  | { type: 'player-crushed'; col: number; row: number };
