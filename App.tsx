
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { geminiService } from './services/geminiService';
import { GameState, PuzzleTile, HistoryItem } from './types';
import { Button } from './components/Button';
import { PuzzleBoard } from './components/PuzzleBoard';
import { Timer } from './components/Timer';
import { audioService } from './services/audioService';

const STYLES = [
  { id: 'default', label: 'Default', icon: '🎨' },
  { id: 'oil-painting', label: 'Oil Painting', icon: '🖼️' },
  { id: 'cyberpunk', label: 'Cyberpunk', icon: '🌃' },
  { id: 'anime', label: 'Anime', icon: '⛩️' },
  { id: 'steampunk', label: 'Steampunk', icon: '⚙️' },
  { id: 'pixel-art', label: 'Pixel Art', icon: '👾' },
  { id: 'sketch', label: 'Pencil Sketch', icon: '✏️' },
  { id: 'noir', label: 'Film Noir', icon: '🕵️' },
];

const DIFFICULTIES = [
  { 
    label: '3x3', 
    value: 3, 
    desc: 'Easy', 
    activeClass: 'bg-emerald-600 border-emerald-500 shadow-emerald-500/30 ring-emerald-400/50',
    iconClass: 'text-emerald-200'
  },
  { 
    label: '4x4', 
    value: 4, 
    desc: 'Normal', 
    activeClass: 'bg-indigo-600 border-indigo-500 shadow-indigo-500/30 ring-indigo-400/50',
    iconClass: 'text-indigo-200'
  },
  { 
    label: '5x5', 
    value: 5, 
    desc: 'Hard', 
    activeClass: 'bg-rose-600 border-rose-500 shadow-rose-500/30 ring-rose-400/50',
    iconClass: 'text-rose-200'
  }
];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    status: 'idle',
    image: null,
    tiles: [],
    timer: 0,
    difficulty: 3,
    moves: 0,
    moveHistory: [],
  });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [prompt, setPrompt] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState(3);
  const [selectedStyle, setSelectedStyle] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestyling, setIsRestyling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('puzzle_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
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
      const xPercent = dim > 1 ? (col / (dim - 1)) * 100 : 0;
      const yPercent = dim > 1 ? (row / (dim - 1)) * 100 : 0;
      
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
    
    const isAlreadySolved = positions.every((p, idx) => p === idx);
    if (isAlreadySolved && positions.length > 1) {
      [positions[0], positions[1]] = [positions[1], positions[0]];
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
      const styleLabel = STYLES.find(s => s.id === selectedStyle)?.label || '';
      const finalPrompt = selectedStyle === 'default' ? prompt : `${prompt} in ${styleLabel} style`;
      const imageUrl = await geminiService.generatePuzzleImage(finalPrompt);
      const initialTiles = generateTiles(imageUrl, selectedDifficulty);
      
      setGameState({
        status: 'playing',
        image: imageUrl,
        tiles: initialTiles,
        timer: 0,
        difficulty: selectedDifficulty,
        moves: 0,
        moveHistory: [],
      });
    } catch (error) {
      alert("Failed to generate puzzle.");
    } finally {
      setIsLoading(false);
    }
  };

  const transformStyle = async (styleId: string) => {
    if (!gameState.image || isRestyling) return;
    setIsRestyling(true);
    try {
      const styleLabel = STYLES.find(s => s.id === styleId)?.label || '';
      const newImageUrl = await geminiService.editPuzzleImage(`Transform the existing image to have an ${styleLabel} style while keeping the same layout and subject matter.`, gameState.image);
      
      setGameState(prev => ({
        ...prev,
        image: newImageUrl,
        tiles: prev.tiles.map(tile => ({
          ...tile,
          backgroundImage: newImageUrl
        }))
      }));
      setSelectedStyle(styleId);
      audioService.playClick();
    } catch (error) {
      console.error("Restyling error:", error);
    } finally {
      setIsRestyling(false);
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Please upload an image file.");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      const initialTiles = generateTiles(imageUrl, selectedDifficulty);
      
      setGameState({
        status: 'playing',
        image: imageUrl,
        tiles: initialTiles,
        timer: 0,
        difficulty: selectedDifficulty,
        moves: 0,
        moveHistory: [],
      });
      setPrompt('Custom Uploaded Image');
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
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
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          image: prev.image!,
          prompt: prompt,
          difficulty: prev.difficulty,
          time: prev.timer,
          moves: prev.moves + 1,
          timestamp: Date.now(),
        };
        setHistory(h => {
          // Keep only one entry per prompt if you prefer, but here we just store top 20
          return [newItem, ...h.slice(0, 19)];
        });
      }

      return {
        ...prev,
        tiles: newTiles,
        moves: prev.moves + 1,
        moveHistory: [...prev.moveHistory, { a: tileAId, b: tileBId }],
        status: isSolved ? 'solved' : 'playing'
      };
    });
  };

  const handleUndo = () => {
    if (gameState.moveHistory.length === 0 || gameState.status !== 'playing') return;

    const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
    const { a, b } = lastMove;

    setGameState(prev => {
      const tileA = prev.tiles.find(t => t.id === a);
      const tileB = prev.tiles.find(t => t.id === b);
      if (!tileA || !tileB) return prev;

      const posA = tileA.currentPos;
      const posB = tileB.currentPos;

      const newTiles = prev.tiles.map(tile => {
        if (tile.id === a) return { ...tile, currentPos: posB };
        if (tile.id === b) return { ...tile, currentPos: posA };
        return tile;
      });

      return {
        ...prev,
        tiles: newTiles,
        moves: prev.moves - 1,
        moveHistory: prev.moveHistory.slice(0, -1),
      };
    });
    audioService.playSwap();
  };

  const handleReplay = (item: HistoryItem) => {
    audioService.playClick();
    setPrompt(item.prompt);
    const newTiles = generateTiles(item.image, item.difficulty);
    setGameState({
      status: 'playing',
      image: item.image,
      tiles: newTiles,
      timer: 0,
      difficulty: item.difficulty,
      moves: 0,
      moveHistory: [],
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
      difficulty: selectedDifficulty,
      moves: 0,
      moveHistory: [],
    });
    setPrompt('');
    setSelectedStyle('default');
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isSolved = gameState.status === 'solved';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex flex-col items-center">
      <header className="w-full max-w-7xl mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
          </div>
          <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent uppercase">
            PuzzleMe
          </h1>
        </div>
        
        {gameState.status !== 'idle' && (
          <div className="flex gap-4 items-center animate-in slide-in-from-top duration-500">
            <Timer seconds={gameState.timer} />
            <div className="bg-slate-800/80 px-5 py-2 rounded-xl border border-slate-700 shadow-xl backdrop-blur-sm">
               <span className="text-slate-500 text-[10px] font-black uppercase mr-2 tracking-widest">Moves</span>
               <span 
                 key={gameState.moves} 
                 className="text-2xl font-mono text-indigo-300 inline-block animate-counter-pop"
               >
                 {gameState.moves}
               </span>
            </div>
            {gameState.status === 'playing' && gameState.moveHistory.length > 0 && (
              <Button 
                variant="secondary" 
                onClick={handleUndo} 
                className="px-4 py-2 text-xs font-black uppercase tracking-widest border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
              >
                Undo
              </Button>
            )}
            <Button variant="ghost" onClick={resetGame} className="text-slate-400 hover:text-white hover:bg-white/5">
              Exit
            </Button>
          </div>
        )}
      </header>

      <main className="w-full max-w-7xl flex flex-col items-center gap-10">
        {gameState.status === 'idle' ? (
          <div className="w-full flex flex-col xl:flex-row gap-10 items-start">
            {/* Left Panel: Creator */}
            <div className="w-full max-w-xl bg-slate-800/50 p-10 rounded-[2.5rem] border border-slate-700/50 shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-500">
              <h2 className="text-3xl font-black mb-8 text-center tracking-tight">Craft Your Vision</h2>
              
              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Dream with AI</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe an image to scramble..."
                    className="w-full h-24 bg-slate-900/80 border border-slate-700 rounded-2xl p-5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none placeholder:text-slate-600 text-lg"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Choose Style</label>
                  <div className="grid grid-cols-4 gap-2">
                    {STYLES.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStyle(s.id)}
                        className={`flex flex-col items-center py-2 px-1 rounded-xl border transition-all duration-200 ${
                          selectedStyle === s.id
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-xl mb-1">{s.icon}</span>
                        <span className="text-[9px] font-black uppercase tracking-tighter truncate w-full text-center">
                          {s.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative group">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Or Upload Your Own</label>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                  <div 
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full py-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${
                      isDragging 
                      ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]' 
                      : 'border-slate-700 bg-slate-900/40 hover:border-slate-500 hover:bg-slate-900/60'
                    }`}
                  >
                    <p className="text-sm font-bold text-slate-400 group-hover:text-slate-200">
                      {isDragging ? 'Drop Image Here' : 'Click or Drag Image to Upload'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Select Complexity</label>
                  <div className="grid grid-cols-3 gap-4">
                    {DIFFICULTIES.map((d) => {
                      const isSelected = selectedDifficulty === d.value;
                      return (
                        <button
                          key={d.value}
                          onClick={() => {
                            setSelectedDifficulty(d.value);
                            audioService.playClick();
                          }}
                          className={`relative flex flex-col items-center py-5 px-4 rounded-3xl border-2 transition-all duration-500 ${
                            isSelected
                              ? `${d.activeClass} text-white shadow-[0_15px_30px_-5px_rgba(0,0,0,0.4)] ring-4 -translate-y-2`
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:bg-slate-800'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 animate-in zoom-in-0 duration-300">
                              <svg className={`w-5 h-5 ${d.iconClass}`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                          <span className="text-2xl font-black mb-1">{d.label}</span>
                          <span className={`text-[10px] uppercase font-black tracking-widest ${isSelected ? 'opacity-90' : 'text-slate-600'}`}>
                            {d.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button 
                  className="w-full h-16 text-xl rounded-2xl font-black uppercase tracking-widest" 
                  onClick={startGame} 
                  isLoading={isLoading}
                  disabled={!prompt.trim()}
                >
                  Assemble Puzzle
                </Button>
              </div>
            </div>

            {/* Right Panel: Vault */}
            <div className="flex-1 w-full xl:max-w-md">
               <div className="bg-slate-800/30 rounded-[2.5rem] border border-slate-700/50 p-8 h-full min-h-[500px]">
                  <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                    <span className="bg-indigo-500/20 text-indigo-400 p-2 rounded-lg">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </span>
                    Puzzle Vault
                  </h3>
                  
                  {history.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-600 opacity-50 text-center">
                       <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5" />
                       </svg>
                       <p className="text-sm font-bold uppercase tracking-widest">Your collection is empty</p>
                       <p className="text-xs mt-2">Complete a puzzle to save it here</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4 overflow-y-auto max-h-[800px] pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                      {history.map(item => (
                        <div key={item.id} className="group relative bg-slate-900/60 rounded-3xl p-4 border border-slate-700/50 transition-all duration-300 hover:border-indigo-500/50 hover:bg-slate-900 hover:-translate-y-1">
                          <div className="flex gap-4">
                            <div className="relative w-24 h-24 flex-shrink-0">
                               <img src={item.image} className="w-full h-full object-cover rounded-2xl shadow-lg border border-white/5" alt="prev-puzzle" />
                               <div className="absolute top-1 right-1 bg-indigo-600 text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-lg">
                                  {item.difficulty}x{item.difficulty}
                               </div>
                            </div>
                            <div className="flex-1 flex flex-col justify-between py-1">
                               <div>
                                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 truncate max-w-[150px]">
                                   {item.prompt}
                                 </p>
                                 <div className="flex gap-3 text-xs">
                                   <div className="flex flex-col">
                                      <span className="text-[9px] text-slate-600 font-black uppercase">Moves</span>
                                      <span className="font-mono text-indigo-300">{item.moves}</span>
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="text-[9px] text-slate-600 font-black uppercase">Time</span>
                                      <span className="font-mono text-indigo-300">{formatTime(item.time)}</span>
                                   </div>
                                 </div>
                               </div>
                               <Button 
                                 variant="secondary" 
                                 onClick={() => handleReplay(item)}
                                 className="py-1 px-3 text-[10px] font-black uppercase tracking-widest h-8 bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white"
                               >
                                 Replay Puzzle
                               </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex flex-col lg:flex-row gap-16 items-center lg:items-start animate-in fade-in zoom-in-95 duration-700">
            <div className="flex-1 flex flex-col items-center gap-6 w-full">
              <PuzzleBoard 
                tiles={gameState.tiles}
                difficulty={gameState.difficulty}
                onSwap={handleSwap}
                isSolved={isSolved}
              />
              <div className="px-6 py-2 bg-slate-800/40 rounded-full border border-slate-700/30 backdrop-blur-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">
                  {gameState.difficulty}x{gameState.difficulty} &bull; {gameState.difficulty * gameState.difficulty} Pieces
                </p>
              </div>
            </div>
            
            <div className="w-full lg:w-[380px] space-y-8 flex-shrink-0">
              <div className="bg-slate-800/50 p-8 rounded-[2rem] border border-slate-700/50 shadow-2xl backdrop-blur-sm">
                <h4 className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-5">Reference & Styles</h4>
                <div className="relative group overflow-hidden rounded-2xl border-2 border-slate-700/50 shadow-inner mb-6">
                  <img src={gameState.image!} className="w-full aspect-square object-cover transition-all duration-1000 group-hover:scale-110" alt="target" />
                  <div className="absolute inset-0 bg-slate-900/40 group-hover:bg-transparent transition-colors duration-500" />
                  {isRestyling && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                      <div className="flex flex-col items-center">
                        <svg className="animate-spin h-8 w-8 text-indigo-500 mb-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Restyling...</span>
                      </div>
                    </div>
                  )}
                </div>

                {!isSolved && !isRestyling && (
                  <div className="space-y-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2">Transform Visual Style</p>
                    <div className="grid grid-cols-4 gap-2">
                      {STYLES.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => transformStyle(s.id)}
                          className={`p-2 rounded-lg border border-slate-700 hover:border-indigo-500 transition-all duration-200 bg-slate-900/50 text-xl flex items-center justify-center`}
                          title={s.label}
                        >
                          {s.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-6">
                  <p className="text-xs text-slate-300 leading-relaxed font-bold italic opacity-60">"{prompt}"</p>
                </div>
              </div>
              
              {isSolved && (
                <div className="bg-indigo-600 p-8 rounded-[2rem] border border-indigo-400/30 text-center shadow-[0_20px_60px_rgba(79,70,229,0.4)] animate-in slide-in-from-bottom duration-500">
                  <p className="text-white font-black text-3xl mb-3 tracking-tighter">VICTORY!</p>
                  <p className="text-indigo-100 text-sm mb-8 font-bold leading-snug">The vision has been restored in {gameState.moves} surgical moves.</p>
                  <Button variant="secondary" className="w-full bg-white text-indigo-600 hover:bg-indigo-50 border-none h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl" onClick={resetGame}>
                    Start New Quest
                  </Button>
                </div>
              )}

              {!isSolved && (
                <div className="text-center space-y-2 opacity-40">
                  <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">
                    Swap tiles to align pixels
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      
      <footer className="mt-auto py-10 text-slate-700 text-[9px] font-black uppercase tracking-[0.4em] border-t border-slate-800/50 w-full text-center">
        Powered by Gemini 2.5 Flash &bull; Visual Synthesis &bull; PuzzleMe
      </footer>
    </div>
  );
};

export default App;
