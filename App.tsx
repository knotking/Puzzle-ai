
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { geminiService } from './services/geminiService';
import { GameState, PuzzleTile, GameStatus, HistoryItem } from './types';
import { Button } from './components/Button';
import { PuzzleBoard } from './components/PuzzleBoard';
import { Timer } from './components/Timer';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'idle',
    image: null,
    tiles: [],
    timer: 0,
    difficulty: 3,
    moves: 0,
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [prompt, setPrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('puzzle_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history");
      }
    }
  }, []);

  // Save history when it changes
  useEffect(() => {
    localStorage.setItem('puzzle_history', JSON.stringify(history));
  }, [history]);

  const generateTiles = useCallback((imageUrl: string, dim: number): PuzzleTile[] => {
    const tiles: PuzzleTile[] = [];
    for (let i = 0; i < dim * dim; i++) {
      const row = Math.floor(i / dim);
      const col = i % dim;
      const xPercent = (col / (dim - 1)) * 100;
      const yPercent = (row / (dim - 1)) * 100;
      
      tiles.push({
        id: i,
        correctPos: i,
        currentPos: i,
        backgroundImage: imageUrl,
        backgroundPosition: `${xPercent}% ${yPercent}%`,
      });
    }

    const positions = Array.from({ length: dim * dim }, (_, i) => i);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    return tiles.map((tile, idx) => ({
      ...tile,
      currentPos: positions[idx]
    }));
  }, []);

  const startGame = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    try {
      const imageUrl = await geminiService.generatePuzzleImage(prompt);
      const initialTiles = generateTiles(imageUrl, gameState.difficulty);
      
      setGameState(prev => ({
        ...prev,
        status: 'playing',
        image: imageUrl,
        tiles: initialTiles,
        timer: 0,
        moves: 0
      }));
    } catch (error) {
      alert("Failed to generate puzzle. Please try another prompt.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      const initialTiles = generateTiles(imageUrl, gameState.difficulty);
      
      setPrompt('Uploaded Image');
      setGameState(prev => ({
        ...prev,
        status: 'playing',
        image: imageUrl,
        tiles: initialTiles,
        timer: 0,
        moves: 0
      }));
    };
    reader.readAsDataURL(file);
  };

  const replayPuzzle = (item: HistoryItem) => {
    const newTiles = generateTiles(item.image, item.difficulty);
    setGameState({
      status: 'playing',
      image: item.image,
      tiles: newTiles,
      timer: 0,
      difficulty: item.difficulty,
      moves: 0
    });
    setPrompt(item.prompt);
  };

  const editGameImage = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || editPrompt;
    if (!finalPrompt.trim() || !gameState.image) return;
    setIsLoading(true);
    try {
      const editedUrl = await geminiService.editPuzzleImage(finalPrompt, gameState.image);
      const newTiles = generateTiles(editedUrl, gameState.difficulty);
      
      setGameState(prev => ({
        ...prev,
        status: 'playing',
        image: editedUrl,
        tiles: newTiles,
        timer: 0,
        moves: 0
      }));
      setEditPrompt('');
    } catch (error) {
      alert("Failed to edit image. Try a different request.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwap = (tileAId: number, tileBId: number) => {
    setGameState(prev => {
      const tileA = prev.tiles.find(t => t.id === tileAId);
      const tileB = prev.tiles.find(t => t.id === tileBId);
      
      if (!tileA || !tileB) return prev;

      const posA = tileA.currentPos;
      const posB = tileB.currentPos;

      const newTiles = prev.tiles.map(tile => {
        if (tile.id === tileAId) return { ...tile, currentPos: posB };
        if (tile.id === tileBId) return { ...tile, currentPos: posA };
        return tile;
      });

      const isSolved = newTiles.every(tile => tile.id === tile.currentPos);
      
      if (isSolved) {
        // Push to history
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          image: prev.image!,
          prompt: prompt || 'Custom Image',
          difficulty: prev.difficulty,
          time: prev.timer,
          moves: prev.moves + 1,
          timestamp: Date.now(),
        };
        setHistory(h => [newItem, ...h.slice(0, 19)]); // Keep last 20
      }

      return {
        ...prev,
        tiles: newTiles,
        moves: prev.moves + 1,
        status: isSolved ? 'solved' : 'playing'
      };
    });
  };

  useEffect(() => {
    if (gameState.status === 'playing') {
      timerRef.current = window.setInterval(() => {
        setGameState(prev => ({ ...prev, timer: prev.timer + 1 }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.status]);

  const resetGame = () => {
    setGameState({
      status: 'idle',
      image: null,
      tiles: [],
      timer: 0,
      difficulty: 3,
      moves: 0,
    });
    setPrompt('');
  };

  const stylePresets = [
    { name: 'Sepia', prompt: 'Apply a sepia tone filter to give it a vintage classic feel' },
    { name: 'Noir', prompt: 'Convert to high-contrast black and white noir style' },
    { name: 'Oil Painting', prompt: 'Transform into a textured oil painting' },
    { name: 'Cyberpunk', prompt: 'Add neon glows and cyberpunk aesthetic' },
  ];

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-4xl mb-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/40">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            PuzzleMe
          </h1>
        </div>
        
        {gameState.status !== 'idle' && (
          <div className="flex items-center gap-4">
            <Timer seconds={gameState.timer} />
            <div className="bg-slate-800/50 backdrop-blur px-4 py-2 rounded-lg border border-slate-700/50">
               <span className="text-slate-400 text-sm uppercase font-bold mr-2">Moves</span>
               <span className="text-xl font-mono text-cyan-400">{gameState.moves}</span>
            </div>
            <Button variant="ghost" onClick={resetGame}>Reset</Button>
          </div>
        )}
      </header>

      <main className="w-full max-w-4xl flex flex-col items-center gap-10">
        {gameState.status === 'idle' ? (
          <div className="w-full space-y-12">
            <div className="max-w-xl mx-auto bg-slate-800/50 p-10 rounded-3xl border border-slate-700/50 shadow-2xl animate-in zoom-in duration-500">
              <h2 className="text-2xl font-semibold mb-6 text-center">What should we puzzle today?</h2>
              
              <div className="space-y-6">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe an image... (e.g., 'A majestic phoenix rising from sapphire flames')"
                  className="w-full h-32 bg-slate-900/80 border border-slate-700 rounded-2xl p-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-lg resize-none placeholder:text-slate-600"
                />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="block text-sm font-bold text-slate-500 mb-2 uppercase">Difficulty</label>
                    <select 
                      value={gameState.difficulty}
                      onChange={(e) => setGameState(prev => ({ ...prev, difficulty: Number(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none h-12"
                    >
                      <option value={3}>3x3 (Easy)</option>
                      <option value={4}>4x4 (Normal)</option>
                      <option value={5}>5x5 (Hard)</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col justify-end">
                    <Button 
                      className="w-full h-12"
                      onClick={startGame}
                      isLoading={isLoading}
                      disabled={!prompt.trim()}
                    >
                      Create AI Puzzle
                    </Button>
                  </div>
                </div>

                <div className="relative py-4 flex items-center gap-4">
                  <div className="flex-grow border-t border-slate-700/50"></div>
                  <span className="text-slate-500 font-bold text-xs uppercase tracking-widest">Or</span>
                  <div className="flex-grow border-t border-slate-700/50"></div>
                </div>

                <div className="flex flex-col items-center">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <Button 
                    variant="secondary" 
                    className="w-full group py-4 border-dashed border-2 border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Upload Your Own Image</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-normal">Click to select or drag and drop</span>
                    </div>
                  </Button>
                </div>
              </div>
            </div>

            {/* History Section / Vault */}
            {history.length > 0 && (
              <section className="animate-in slide-in-from-bottom duration-700">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-xl font-bold text-slate-400 flex items-center gap-2">
                     <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                     </svg>
                     Puzzle Vault
                   </h3>
                   <button 
                    onClick={() => { if(confirm("Clear history?")) setHistory([]) }}
                    className="text-slate-600 hover:text-rose-400 text-sm transition-colors"
                   >
                     Clear All
                   </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {history.map((item) => (
                    <div 
                      key={item.id}
                      onClick={() => replayPuzzle(item)}
                      className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 cursor-pointer transition-all hover:scale-105 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/20"
                    >
                      <img src={item.image} alt={item.prompt} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                         <p className="text-[10px] text-white/60 font-medium truncate mb-1">{item.prompt}</p>
                         <div className="flex justify-between items-center text-[10px] text-indigo-300 font-bold uppercase">
                            <span>{item.difficulty}x{item.difficulty}</span>
                            <span>{formatTime(item.time)}</span>
                         </div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600/20 backdrop-blur-[1px]">
                         <span className="bg-white text-slate-900 px-3 py-1 rounded-full text-xs font-black shadow-xl">REPLAY</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col lg:flex-row gap-10 items-start">
            {/* Left: The Board */}
            <div className="flex-1 flex flex-col items-center gap-6">
              <PuzzleBoard 
                tiles={gameState.tiles}
                difficulty={gameState.difficulty}
                onSwap={handleSwap}
                isSolved={gameState.status === 'solved'}
              />
              <p className="text-slate-500 text-sm text-center italic">
                {gameState.status === 'solved' 
                  ? "Great job! You reconstructed the AI's masterpiece."
                  : "Click two pieces to swap them. Put the image back together!"}
              </p>
            </div>

            {/* Right: AI Tools */}
            <div className="w-full lg:w-80 space-y-6">
              <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 shadow-xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit with AI
                </h3>
                
                {/* Style Presets */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {stylePresets.map((style) => (
                    <button
                      key={style.name}
                      onClick={() => editGameImage(style.prompt)}
                      disabled={isLoading || gameState.status === 'solved'}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-indigo-500/50 rounded-lg text-xs font-medium text-slate-400 hover:text-indigo-300 transition-all disabled:opacity-50"
                    >
                      {style.name}
                    </button>
                  ))}
                </div>

                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Or describe a custom change..."
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none mb-4 placeholder:text-slate-600"
                />
                <Button 
                  variant="secondary" 
                  className="w-full text-sm"
                  onClick={() => editGameImage()}
                  isLoading={isLoading}
                  disabled={!editPrompt.trim() || gameState.status === 'solved'}
                >
                  Apply Custom Magic
                </Button>
              </div>

              {gameState.status === 'solved' && (
                <div className="bg-green-500/10 p-6 rounded-2xl border border-green-500/20 animate-in slide-in-from-bottom duration-500">
                  <h4 className="text-green-400 font-bold mb-2">Challenge Complete!</h4>
                  <p className="text-sm text-green-300/80 mb-4">
                    Time: {formatTime(gameState.timer)}<br/>
                    Moves: {gameState.moves}
                  </p>
                  <Button variant="primary" className="w-full" onClick={resetGame}>
                    Play Again
                  </Button>
                </div>
              )}

              <div className="bg-indigo-500/5 p-6 rounded-2xl border border-indigo-500/10">
                 <h4 className="text-indigo-300 font-bold mb-2">Hint</h4>
                 <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-slate-700 opacity-60 hover:opacity-100 transition-opacity">
                    <img src={gameState.image!} alt="Target" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent flex items-end p-2">
                       <span className="text-[10px] text-slate-300 font-bold uppercase">Original Image</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-auto py-10 text-slate-600 text-xs text-center">
         Powered by Gemini 2.5 Flash Image &bull; Made for Puzzle Lovers
      </footer>
    </div>
  );
};

export default App;
