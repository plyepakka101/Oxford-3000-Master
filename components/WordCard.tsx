
import { fetchWordAudioBuffer } from '../services/geminiService';
import { OxfordWord } from '../types';
import React, { useEffect, useRef, useState, useCallback } from 'react';

interface WordCardProps {
  wordData: OxfordWord;
  isFavorite: boolean;
  onToggleFavorite: (word: string) => void;
  isMastered: boolean;
  onToggleMastered: (word: string) => void;
  onClose: () => void;
}

const WordCard: React.FC<WordCardProps> = ({ 
  wordData, 
  isFavorite, 
  onToggleFavorite, 
  isMastered, 
  onToggleMastered, 
  onClose 
}) => {
  const { word, level, translation, phonetic, posEn, posTh } = wordData;
  
  // Word Audio State
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key to close
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    const focusableElements = modalRef.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const initAudioCtx = async () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      audioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playAudio = async () => {
    const ctx = await initAudioCtx();
    
    if (!audioBufferRef.current) {
      setAudioLoading(true);
      const buffer = await fetchWordAudioBuffer(word, ctx);
      setAudioLoading(false);
      if (!buffer) return;
      audioBufferRef.current = buffer;
    }

    stopAudio();
    const source = ctx.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(ctx.destination);
    source.onended = () => setIsPlaying(false);
    sourceNodeRef.current = source;
    source.start();
    setIsPlaying(true);
  };

  const openGoogleSearch = () => {
    window.open(`https://www.google.com/search?q=ตัวอย่างประโยค+${word}`, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-title"
    >
      <div 
        ref={modalRef}
        className="bg-white w-full max-w-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-in slide-in-from-bottom sm:zoom-in duration-300 origin-bottom sm:origin-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-1 bg-inherit">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full opacity-50" />
        </div>

        <div className={`relative px-6 pb-8 pt-4 sm:pt-8 transition-colors duration-700 ${isMastered ? 'bg-emerald-600' : 'bg-indigo-900'}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="px-3 py-1 bg-white/20 text-[10px] font-bold rounded-full uppercase tracking-widest text-white shadow-sm">
                {level}
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onToggleFavorite(word)}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                className={`p-2.5 rounded-full transition-all active:scale-90 ${isFavorite ? 'bg-white/20 text-rose-300' : 'text-white/40 hover:text-white/60'}`}
              >
                <svg className="w-6 h-6" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
              <button 
                onClick={onClose} 
                aria-label="Close details"
                className="p-2.5 rounded-full text-white/40 hover:text-white/80 transition-all active:scale-90"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center gap-4">
            <div className="flex-1 min-w-0">
              <h2 id="word-title" className="text-4xl sm:text-6xl font-black text-white tracking-tight break-words drop-shadow-sm">{word}</h2>
              <div className="flex items-baseline gap-3 mt-4 overflow-hidden">
                <span className="text-indigo-200 font-inter text-xl sm:text-2xl whitespace-nowrap tracking-wide">{phonetic || '/.../'}</span>
                <div className="flex flex-wrap gap-2">
                  {posEn && (
                    <span className="text-white/80 text-[10px] font-bold uppercase bg-white/10 px-2 py-0.5 rounded border border-white/20 truncate">
                      {posEn}
                    </span>
                  )}
                  {posTh && (
                    <span className="text-white/80 text-[10px] font-bold font-prompt bg-white/10 px-2 py-0.5 rounded border border-white/20 truncate">
                      {posTh}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button 
              onClick={playAudio} 
              disabled={audioLoading} 
              aria-label="Pronounce word"
              className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl flex items-center justify-center text-indigo-900 shadow-2xl hover:scale-105 active:scale-95 transition-all flex-shrink-0 disabled:opacity-50 ring-4 ring-black/5"
            >
              {audioLoading ? (
                <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
              ) : isPlaying ? (
                <svg className="w-10 h-10 animate-pulse text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 ml-1 text-indigo-900" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white px-6 py-8">
          <div className="max-w-xl mx-auto space-y-10">
            <section aria-labelledby="heading-translation">
              <h3 id="heading-translation" className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest mb-4">Thai Translation</h3>
              <div className="bg-indigo-50/50 rounded-3xl p-6 sm:p-8 border border-indigo-100/50 text-center">
                <p className="text-4xl sm:text-5xl font-bold text-slate-800 font-prompt leading-tight">{translation}</p>
              </div>
            </section>

            <section aria-labelledby="heading-examples">
              <div className="flex items-center justify-between mb-4">
                <h3 id="heading-examples" className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest">Usage Example</h3>
                <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase border border-indigo-100">Direct Search</span>
              </div>
              
              <button 
                onClick={openGoogleSearch}
                className="w-full group bg-slate-50 border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all rounded-3xl p-8 flex flex-col items-center gap-4 group"
              >
                <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M21.35,11.1H12.18V13.83H18.69C18.36,17.64 15.19,19.27 12.19,19.27C9.03,19.27 6.48,16.68 6.48,13.5C6.48,10.31 9.03,7.74 12.19,7.74C13.9,7.74 15.6,8.36 16.67,9.35L18.73,7.3C17.03,5.66 14.68,4.73 12.19,4.73C7.35,4.73 3.41,8.67 3.41,13.5C3.41,18.33 7.35,22.27 12.19,22.27C16.88,22.27 21.65,18.95 21.65,13.5C21.65,12.7 21.48,11.76 21.35,11.1V11.1Z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-slate-700 font-bold text-lg mb-1">ค้นหาตัวอย่างประโยค</p>
                  <p className="text-slate-400 text-sm font-prompt">ดูตัวอย่างการใช้คำว่า "{word}" บน Google</p>
                </div>
              </button>
            </section>
          </div>
        </div>

        <div className="px-6 py-6 sm:py-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button 
            onClick={() => onToggleMastered(word)} 
            className={`flex-1 py-4 px-6 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] ${
              isMastered 
                ? 'bg-white text-emerald-600 border-2 border-emerald-100 hover:bg-emerald-50' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {isMastered ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Mastered
              </>
            ) : (
              'Mark as Mastered'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WordCard;
