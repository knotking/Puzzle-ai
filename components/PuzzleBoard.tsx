
import React, { useState } from 'react';
import { PuzzleTile } from '../types';

interface PuzzleBoardProps {
  tiles: PuzzleTile[];
  difficulty: number;
  onSwap: (tileAId: number, tileBId: number) => void;
  isSolved: boolean;
}

export const PuzzleBoard: React.FC<PuzzleBoardProps> = ({ tiles, difficulty, onSwap, isSolved }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleTileClick = (id: number) => {
    if (isSolved) return;
    
    if (selectedId === null) {
      setSelectedId(id);
    } else {
      if (selectedId !== id) {
        onSwap(selectedId, id);
      }
      setSelectedId(null);
    }
  };

  const tileSize = 100 / difficulty;

  return (
    <div 
      className="relative w-full max-w-md aspect-square bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-700"
    >
      {tiles.map((tile) => {
        const row = Math.floor(tile.currentPos / difficulty);
        const col = tile.currentPos % difficulty;
        const isSelected = selectedId === tile.id;

        return (
          <div
            key={tile.id}
            onClick={() => handleTileClick(tile.id)}
            className={`absolute cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] group ${
              isSelected ? 'z-20 scale-105 shadow-2xl' : 'z-10'
            }`}
            style={{
              width: `${tileSize}%`,
              height: `${tileSize}%`,
              left: `${col * tileSize}%`,
              top: `${row * tileSize}%`,
              backgroundImage: `url(${tile.backgroundImage})`,
              backgroundSize: `${difficulty * 100}% ${difficulty * 100}%`,
              backgroundPosition: tile.backgroundPosition,
            }}
          >
            {/* Tile Border/Gap emulation */}
            <div className="absolute inset-[1px] border border-white/5 rounded-sm" />
            
            {!isSolved && (
               <div className={`absolute inset-0 transition-colors duration-300 ${
                 isSelected ? 'bg-indigo-500/20 ring-4 ring-indigo-400 inset-0' : 'bg-black/0 group-hover:bg-white/10'
               }`} />
            )}
            
            {isSolved && (
              <div className="absolute inset-0 border border-indigo-500/10" />
            )}
          </div>
        );
      })}
      
      {isSolved && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-green-500/10 backdrop-blur-[2px] animate-in fade-in zoom-in duration-700">
           <div className="bg-white text-slate-900 px-8 py-4 rounded-full font-bold text-2xl shadow-2xl transform scale-110 flex items-center gap-3">
             <span>PUZZLE SOLVED!</span>
             <span className="animate-bounce">🎉</span>
           </div>
        </div>
      )}
    </div>
  );
};
