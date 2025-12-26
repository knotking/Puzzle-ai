
import React, { useState } from 'react';
import { QuizQuestion } from '../types';
import { Button } from './Button';
import { audioService } from '../services/audioService';

interface QuizProps {
  questions: QuizQuestion[];
  onComplete: (score: number) => void;
}

export const Quiz: React.FC<QuizProps> = ({ questions, onComplete }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const currentQuestion = questions[currentIdx];

  const handleOptionClick = (idx: number) => {
    if (selectedIdx !== null) return;
    setSelectedIdx(idx);
    const isCorrect = idx === currentQuestion.correctIndex;
    if (isCorrect) {
      setScore(s => s + 1);
      audioService.playWin();
    } else {
      audioService.playClick();
    }
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(c => c + 1);
      setSelectedIdx(null);
      setShowExplanation(false);
    } else {
      onComplete(score);
    }
  };

  return (
    <div className="w-full max-w-2xl bg-slate-800/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-slate-700 shadow-2xl animate-in zoom-in-95 duration-500">
      <div className="flex justify-between items-center mb-8">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">
          Knowledge Quest &bull; Question {currentIdx + 1}/{questions.length}
        </span>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className={`w-8 h-1.5 rounded-full transition-all duration-500 ${i === currentIdx ? 'bg-indigo-500 w-12' : i < currentIdx ? 'bg-indigo-900' : 'bg-slate-700'}`} />
          ))}
        </div>
      </div>

      <h3 className="text-2xl font-black mb-8 leading-tight text-white">
        {currentQuestion.question}
      </h3>

      <div className="space-y-3 mb-8">
        {currentQuestion.options.map((opt, idx) => {
          const isSelected = selectedIdx === idx;
          const isCorrect = idx === currentQuestion.correctIndex;
          const showCorrect = showExplanation && isCorrect;
          const showWrong = isSelected && !isCorrect;

          return (
            <button
              key={idx}
              disabled={selectedIdx !== null}
              onClick={() => handleOptionClick(idx)}
              className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 flex justify-between items-center group ${
                isSelected ? 'ring-2 ring-indigo-500/50' : ''
              } ${
                showCorrect ? 'bg-emerald-500/20 border-emerald-500 text-emerald-100' :
                showWrong ? 'bg-rose-500/20 border-rose-500 text-rose-100' :
                'bg-slate-900/40 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-900/60'
              }`}
            >
              <span className="font-bold">{opt}</span>
              {showCorrect && <span className="text-emerald-400">✓</span>}
              {showWrong && <span className="text-rose-400">✗</span>}
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className="mb-8 p-6 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 animate-in slide-in-from-bottom-4 duration-300">
          <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2">Did you know?</p>
          <p className="text-slate-300 text-sm leading-relaxed italic">
            {currentQuestion.explanation}
          </p>
        </div>
      )}

      {selectedIdx !== null && (
        <Button 
          className="w-full h-14 rounded-xl font-black uppercase tracking-widest"
          onClick={handleNext}
        >
          {currentIdx === questions.length - 1 ? 'Finish Quest' : 'Next Insight'}
        </Button>
      )}
    </div>
  );
};
