
import React, { useState, useEffect } from 'react';
import { PuzzleTile } from '../types';
import { audioService } from '../services/audioService';

interface PuzzleBoardProps {
  tiles: PuzzleTile[];
  difficulty: number;
  onSwap: (tileAId: number, tileBId: number) => void;
  isSolved: boolean;
}

export const PuzzleBoard: React.FC<PuzzleBoardProps> = ({ tiles, difficulty, onSwap, isSolved }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [swappedIds, setSwappedIds] = useState<number[]>([]);

  const handleTileClick = (id: number) => {
    if (isSolved) return;
    
    if (selectedId === null) {
      setSelectedId(id);
      audioService.playClick();
    } else {
      if (selectedId !== id) {
        onSwap(selectedId, id);
        // Trigger swap feedback
        setSwappedIds([selectedId, id]);
        audioService.playSwap();
      }
      setSelectedId(null);
    }
  };

  // Play win sound when puzzle is solved
  useEffect(() => {
    if (isSolved) {
      audioService.playWin();
    }
  }, [isSolved]);

  // Clear swapped highlight after animation duration
  useEffect(() => {
    if (swappedIds.length > 0) {
      const timer = setTimeout(() => {
        setSwappedIds([]);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [swappedIds]);

  const tileSize = 100 / difficulty;

  return (
    <div 
      className="relative w-full max-w-md aspect-square bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-700/50 p-1"
    >
      {tiles.map((tile) => {
        const row = Math.floor(tile.currentPos / difficulty);
        const col = tile.currentPos % difficulty;
        const isSelected = selectedId === tile.id;
        const isRecentlySwapped = swappedIds.includes(tile.id);

        return (
          <div
            key={tile.id}
            onClick={() => handleTileClick(tile.id)}
            className={`absolute cursor-pointer transition-all duration-700 select-none group ${
              isSelected ? 'z-30 scale-[1.08] shadow-[0_20px_50px_rgba(79,70,229,0.5)]' : 
              isRecentlySwapped ? 'z-20' : 'z-10'
            }`}
            style={{
              width: `${tileSize}%`,
              height: `${tileSize}%`,
              left: `${col * tileSize}%`,
              top: `${row * tileSize}%`,
              backgroundImage: `url(${tile.backgroundImage})`,
              backgroundSize: `${difficulty * 100}% ${difficulty * 100}%`,
              backgroundPosition: tile.backgroundPosition,
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* Tile Surface Shine & Border */}
            <div className={`absolute inset-[1px] rounded-lg transition-all duration-300 border ${
              isSelected ? 'border-indigo-400 shadow-inner bg-indigo-500/10' : 
              isRecentlySwapped ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] bg-cyan-400/10' :
              'border-white/10 group-hover:border-white/30'
            }`} />
            
            {/* Overlay for selection and hover states */}
            {!isSolved && (
               <div className={`absolute inset-0 transition-all duration-500 rounded-lg ${
                 isSelected 
                  ? 'bg-gradient-to-br from-indigo-500/20 to-transparent' 
                  : isRecentlySwapped 
                    ? 'bg-cyan-500/5'
                    : 'bg-transparent group-hover:bg-white/5 active:scale-95'
               }`} />
            )}
            
            {/* Corner highlights for a "physical" piece look */}
            <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-white/20 rounded-tl-sm opacity-50" />
            
            {isSolved && (
              <div className="absolute inset-0 border border-indigo-500/20 rounded-lg animate-pulse" />
            )}
            
            {/* Swap Flash Effect */}
            {isRecentlySwapped && (
              <div className="absolute inset-0 bg-white/20 animate-out fade-out duration-500 rounded-lg" />
            )}
          </div>
        );
      })}
      
      {isSolved && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-indigo-950/20 backdrop-blur-[3px] animate-in fade-in zoom-in duration-1000">
           <div className="bg-white/95 text-slate-900 px-10 py-5 rounded-3xl font-black text-3xl shadow-[0_0_60px_rgba(255,255,255,0.4)] transform scale-110 flex flex-col items-center gap-2 border-4 border-indigo-200">
             <span className="tracking-tighter">PUZZLE COMPLETED</span>
             <div className="flex gap-2">
                <span className="animate-bounce delay-75">✨</span>
                <span className="animate-bounce delay-150">🎉</span>
                <span className="animate-bounce delay-300">✨</span>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};
