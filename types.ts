
export interface PuzzleTile {
  id: number;
  currentPos: number;
  correctPos: number;
  backgroundImage: string;
  backgroundPosition: string;
}

export type GameStatus = 'idle' | 'generating' | 'playing' | 'solved' | 'editing';

export interface HistoryItem {
  id: string;
  image: string;
  prompt: string;
  difficulty: number;
  time: number;
  moves: number;
  timestamp: number;
}

export interface GameState {
  status: GameStatus;
  image: string | null;
  tiles: PuzzleTile[];
  timer: number;
  difficulty: number; // grid size (e.g. 3 for 3x3)
  moves: number;
  moveHistory: { a: number; b: number }[];
}
