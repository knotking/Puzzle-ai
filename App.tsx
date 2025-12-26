
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { geminiService } from './services/geminiService';
import { GameState, PuzzleTile, HistoryItem, QuizQuestion } from './types';
import { Button } from './components/Button';
import { PuzzleBoard } from './components/PuzzleBoard';
import { Timer } from './components/Timer';
import { Quiz } from './components/Quiz';
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
  { label: '3x3', value: 3, desc: 'Easy', activeClass: 'bg-emerald-600 border-emerald-500 shadow-emerald-500/30 ring-emerald-400/50', iconClass: 'text-emerald-200' },
  { label: '4x4', value: 4, desc: 'Normal', activeClass: 'bg-indigo-600 border-indigo-500 shadow-indigo-500/30 ring-indigo-400/50', iconClass: 'text-indigo-200' },
  { label: '5x5', value: 5, desc: 'Hard', activeClass: 'bg-rose-600 border-rose-500 shadow-rose-500/30 ring-rose-400/50', iconClass: 'text-rose-200' }
];

// Define AIStudio interface separately to avoid merge conflicts and satisfy type requirements
interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

declare global {
  interface Window {
    // aistudio property must match the platform's AIStudio type and modifiers
    aistudio: AIStudio;
  }
}

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
  const [hasApiKey, setHasApiKey] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      // Safely check if aistudio is available and use it
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
    
    const savedHistory = localStorage.getItem('puzzle_history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
    }
  }, []);

  const handleOpenKeySelector = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true); // Assume success as per instructions
    }
  };

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
      tiles.push({ id: i, correctPos: i, currentPos: i, backgroundImage: imageUrl, backgroundPosition: `${xPercent}% ${yPercent}%` });
    }
    const positions = Array.from({ length: dim * dim }, (_, i) => i);
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    if (positions.every((p, idx) => p === idx) && positions.length > 1) {
      [positions[0], positions[1]] = [positions[1], positions[0]];
    }
    return tiles.map((tile, idx) => ({ ...tile, currentPos: positions[idx] }));
  }, []);

  const startGame = async () => {
    if (!hasApiKey) {
      handleOpenKeySelector();
      return;
    }
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
      setQuizScore(null);
    } catch (error: any) {
      if (error.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        alert("API Key error. Please select a valid paid project key.");
      } else {
        alert("Failed to generate. Ensure you have selected a valid API key.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startQuiz = async () => {
    setIsLoading(true);
    try {
      const questions = await geminiService.generateQuiz(prompt);
      setGameState(prev => ({ ...prev, status: 'quiz', quiz: questions }));
    } catch (e) {
      alert("Failed to generate quiz.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuizComplete = (score: number) => {
    setQuizScore(score);
    setGameState(prev => ({ ...prev, status: 'solved' }));
  };

  const transformStyle = async (styleId: string) => {
    if (!gameState.image || isRestyling) return;
    setIsRestyling(true);
    try {
      const styleLabel = STYLES.find(s => s.id === styleId)?.label || '';
      const newImageUrl = await geminiService.editPuzzleImage(`Style change: ${styleLabel}`, gameState.image);
      setGameState(prev => ({
        ...prev,
        image: newImageUrl,
        tiles: prev.tiles.map(tile => ({ ...tile, backgroundImage: newImageUrl }))
      }));
      setSelectedStyle(styleId);
      audioService.playClick();
    } catch (error) {
      console.error(error);
    } finally {
      setIsRestyling(false);
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
        const newItem: HistoryItem = {
          id: Date.now().toString(), image: prev.image!, prompt: prompt, difficulty: prev.difficulty, time: prev.timer, moves: prev.moves + 1, timestamp: Date.now(),
        };
        setHistory(h => [newItem, ...h.slice(0, 19)]);
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

  useEffect(() => {
    if (gameState.status === 'playing') {
      timerRef.current = window.setInterval(() => {
        setGameState(prev => ({ ...prev, timer: prev.timer + 1 }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState.status]);

  const resetGame = () => {
    setGameState({ status: 'idle', image: null, tiles: [], timer: 0, difficulty: selectedDifficulty, moves: 0, moveHistory: [] });
    setPrompt('');
    setSelectedStyle('default');
    setQuizScore(null);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex flex-col items-center">
      <header className="w-full max-w-7xl mb-12 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-black tracking-tighter bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent uppercase">
              PuzzleMe
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Enhanced by Gemini 3 Pro</p>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <button 
            onClick={handleOpenKeySelector}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${hasApiKey ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500 text-white animate-pulse'}`}
          >
            {hasApiKey ? '✓ API Pro Key Active' : '⚠ Connect API Key'}
          </button>
          
          {gameState.status !== 'idle' && (
            <div className="flex gap-4 items-center animate-in slide-in-from-top duration-500">
              <Timer seconds={gameState.timer} />
              <div className="bg-slate-800/80 px-5 py-2 rounded-xl border border-slate-700 shadow-xl backdrop-blur-sm">
                <span className="text-slate-500 text-[10px] font-black uppercase mr-2 tracking-widest">Moves</span>
                <span key={gameState.moves} className="text-2xl font-mono text-indigo-300 inline-block animate-counter-pop">{gameState.moves}</span>
              </div>
              <Button variant="ghost" onClick={resetGame} className="text-slate-400 hover:text-white hover:bg-white/5">Exit</Button>
            </div>
          )}
        </div>
      </header>

      <main className="w-full max-w-7xl">
        {gameState.status === 'idle' ? (
          <div className="w-full flex flex-col xl:flex-row gap-10 items-start">
            <div className="w-full max-w-xl bg-slate-800/50 p-10 rounded-[2.5rem] border border-slate-700/50 shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-500">
              <h2 className="text-3xl font-black mb-8 text-center tracking-tight">Craft Your Vision</h2>
              <div className="space-y-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Dream with Gemini 3</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe a breathtaking scene..."
                    className="w-full h-24 bg-slate-900/80 border border-slate-700 rounded-2xl p-5 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none placeholder:text-slate-600 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Choose Style</label>
                  <div className="grid grid-cols-4 gap-2">
                    {STYLES.map((s) => (
                      <button key={s.id} onClick={() => setSelectedStyle(s.id)} className={`flex flex-col items-center py-2 px-1 rounded-xl border transition-all duration-200 ${selectedStyle === s.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                        <span className="text-xl mb-1">{s.icon}</span>
                        <span className="text-[9px] font-black uppercase tracking-tighter truncate w-full text-center">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Complexity</label>
                  <div className="grid grid-cols-3 gap-4">
                    {DIFFICULTIES.map((d) => (
                      <button key={d.value} onClick={() => setSelectedDifficulty(d.value)} className={`flex flex-col items-center py-5 px-4 rounded-3xl border-2 transition-all ${selectedDifficulty === d.value ? `${d.activeClass} text-white ring-4` : 'bg-slate-900 border-slate-700 text-slate-400'}`}>
                        <span className="text-2xl font-black mb-1">{d.label}</span>
                        <span className="text-[10px] uppercase font-black tracking-widest">{d.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="w-full h-16 text-xl rounded-2xl font-black uppercase tracking-widest" onClick={startGame} isLoading={isLoading} disabled={!prompt.trim() || !hasApiKey}>Assemble Puzzle</Button>
              </div>
            </div>

            <div className="flex-1 w-full xl:max-w-md">
              <div className="bg-slate-800/30 rounded-[2.5rem] border border-slate-700/50 p-8 h-full">
                <h3 className="text-xl font-black mb-6">Puzzle Vault</h3>
                <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[600px] pr-2">
                  {history.map(item => (
                    <div key={item.id} className="group relative bg-slate-900/60 rounded-3xl p-4 border border-slate-700/50">
                      <div className="flex gap-4">
                        <img src={item.image} className="w-24 h-24 object-cover rounded-2xl" alt="prev" />
                        <div className="flex-1 py-1">
                          <p className="text-[10px] font-black text-slate-500 uppercase truncate mb-2">{item.prompt}</p>
                          <div className="flex gap-4 text-xs font-mono text-indigo-300 mb-4">
                            <span>{item.moves} moves</span>
                            <span>{formatTime(item.time)}</span>
                          </div>
                          <Button variant="secondary" className="py-1 px-3 text-[10px] font-black uppercase h-8" onClick={() => setPrompt(item.prompt)}>Use Prompt</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : gameState.status === 'quiz' ? (
          <div className="flex justify-center py-10">
            <Quiz questions={gameState.quiz || []} onComplete={handleQuizComplete} />
          </div>
        ) : (
          <div className="w-full flex flex-col lg:flex-row gap-16 items-center lg:items-start animate-in fade-in zoom-in-95 duration-700">
            <div className="flex-1 flex flex-col items-center gap-6 w-full">
              <PuzzleBoard tiles={gameState.tiles} difficulty={gameState.difficulty} onSwap={handleSwap} isSolved={gameState.status === 'solved'} />
            </div>
            
            <div className="w-full lg:w-[380px] space-y-8 flex-shrink-0">
              <div className="bg-slate-800/50 p-8 rounded-[2rem] border border-slate-700/50 shadow-2xl backdrop-blur-sm">
                <h4 className="text-slate-500 font-black text-[10px] uppercase tracking-[0.2em] mb-5">Reference</h4>
                <div className="relative group overflow-hidden rounded-2xl border-2 border-slate-700/50 mb-6">
                  <img src={gameState.image!} className="w-full aspect-square object-cover" alt="target" />
                  {isRestyling && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Restyling...</span>
                    </div>
                  )}
                </div>

                {gameState.status === 'playing' && (
                  <div className="grid grid-cols-4 gap-2">
                    {STYLES.map((s) => (
                      <button key={s.id} onClick={() => transformStyle(s.id)} className="p-2 rounded-lg border border-slate-700 hover:border-indigo-500 transition-all bg-slate-900/50 text-xl flex items-center justify-center">{s.icon}</button>
                    ))}
                  </div>
                )}
                <p className="mt-6 text-xs text-slate-400 italic">"{prompt}"</p>
              </div>
              
              {gameState.status === 'solved' && (
                <div className="space-y-4">
                  <div className="bg-indigo-600 p-8 rounded-[2rem] border border-indigo-400 text-center shadow-2xl animate-in slide-in-from-bottom duration-500">
                    <p className="text-white font-black text-3xl mb-1">VICTORY!</p>
                    <p className="text-indigo-100 text-sm mb-6">Puzzle Restored in {gameState.moves} moves.</p>
                    
                    {quizScore === null ? (
                      <Button 
                        variant="secondary" 
                        isLoading={isLoading}
                        className="w-full bg-white text-indigo-600 hover:bg-indigo-50 h-14 rounded-2xl font-black uppercase" 
                        onClick={startQuiz}
                      >
                        Start Knowledge Quest
                      </Button>
                    ) : (
                      <div className="bg-indigo-900/50 p-4 rounded-xl border border-indigo-400/30 mb-6">
                         <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">Quest Mastery</p>
                         <p className="text-2xl font-black text-white">{quizScore}/3 Correct</p>
                      </div>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      className="w-full mt-4 text-white/60 hover:text-white" 
                      onClick={resetGame}
                    >
                      Start New Quest
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      
      <footer className="mt-auto py-10 text-slate-700 text-[9px] font-black uppercase tracking-[0.4em] border-t border-slate-800/50 w-full text-center">
        Powered by Gemini 3 Pro &bull; Neural Synthesis &bull; PuzzleMe
      </footer>
    </div>
  );
};

export default App;
