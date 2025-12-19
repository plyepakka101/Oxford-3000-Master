
import { getWordDetails, fetchWordAudioBuffer } from '../services/geminiService';
import { WordDetail, OxfordWord } from '../types';
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
  const { word, level, translation: staticTranslation } = wordData;
  const [details, setDetails] = useState<WordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);
  
  // Word Audio State
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Example Audio State
  const [exampleAudioLoading, setExampleAudioLoading] = useState(false);
  const [isExamplePlaying, setIsExamplePlaying] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const exampleAudioBufferRef = useRef<AudioBuffer | null>(null);
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

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getWordDetails(word);
      if (res) {
        setDetails(res);
        setShowOfflineWarning(false);
      } else {
        setShowOfflineWarning(!navigator.onLine);
      }
    } catch (e: any) {
      setShowOfflineWarning(!navigator.onLine);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    return () => {
      stopAudio();
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, [word]);

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
    setIsExamplePlaying(false);
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

  const playExampleAudio = async () => {
    if (!details?.exampleEnglish) return;
    const ctx = await initAudioCtx();

    if (!exampleAudioBufferRef.current) {
      setExampleAudioLoading(true);
      const buffer = await fetchWordAudioBuffer(details.exampleEnglish, ctx);
      setExampleAudioLoading(false);
      if (!buffer) return;
      exampleAudioBufferRef.current = buffer;
    }

    stopAudio();
    const source = ctx.createBufferSource();
    source.buffer = exampleAudioBufferRef.current;
    source.connect(ctx.destination);
    source.onended = () => setIsExamplePlaying(false);
    sourceNodeRef.current = source;
    source.start();
    setIsExamplePlaying(true);
  };

  const displayTranslation = details?.thaiTranslation || staticTranslation || "Loading...";
  const displayLevel = details?.level || level;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
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
                {displayLevel}
              </span>
              {showOfflineWarning && !details && (
                <span className="px-2 py-1 bg-amber-500 text-[10px] font-bold rounded text-white animate-pulse">Offline Mode</span>
              )}
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
              <h2 id="word-title" className="text-4xl sm:text-5xl font-black text-white tracking-tight break-words">{word}</h2>
              <div className="flex items-baseline gap-3 mt-3 overflow-hidden">
                <span className="text-indigo-200 font-mono text-xl sm:text-2xl whitespace-nowrap">{details?.phonetic || '/.../'}</span>
                <div className="flex flex-wrap gap-2">
                  {details?.partOfSpeech && (
                    <span className="text-white/70 text-xs font-bold uppercase bg-white/10 px-2 py-0.5 rounded border border-white/10 truncate">
                      {details.partOfSpeech}
                    </span>
                  )}
                  {details?.partOfSpeechThai && (
                    <span className="text-white/70 text-xs font-bold font-prompt bg-white/10 px-2 py-0.5 rounded border border-white/10 truncate">
                      {details.partOfSpeechThai}
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
          <div className="max-w-xl mx-auto space-y-8">
            <section aria-labelledby="heading-translation">
              <h3 id="heading-translation" className="text-[10px] font-black text-indigo-600/60 uppercase tracking-widest mb-3">Thai Translation</h3>
              <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100/50">
                <p className="text-3xl font-bold text-slate-800 font-prompt leading-tight">{displayTranslation}</p>
              </div>
            </section>

            <section aria-labelledby="heading-examples">
              <div className="flex items-center justify-between mb-3">
                <h3 id="heading-examples" className="text-[10px] font-black text-indigo-600/60 uppercase tracking-widest">Usage Example</h3>
                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase border border-emerald-200/50">AI Powered</span>
              </div>
              
              {loading && !details ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-slate-100 rounded w-full" />
                  <div className="h-4 bg-slate-100 rounded w-5/6" />
                  <div className="h-3 bg-slate-50 rounded w-1/2" />
                </div>
              ) : details ? (
                <div className="space-y-4">
                  <div className="group relative bg-slate-50/50 rounded-2xl p-4 sm:p-5 border border-slate-100 transition-colors hover:border-indigo-100">
                    <div className="absolute -left-1 top-4 bottom-4 w-1 bg-indigo-200 rounded-full" />
                    <div className="flex items-start gap-3">
                      <p className="flex-1 text-lg sm:text-xl text-slate-700 font-medium leading-relaxed italic">
                        "{details.exampleEnglish}"
                      </p>
                      <button 
                        onClick={playExampleAudio}
                        disabled={exampleAudioLoading}
                        aria-label="Play example sentence audio"
                        className={`p-2 rounded-xl transition-all flex-shrink-0 ${isExamplePlaying ? 'bg-indigo-100 text-indigo-600 shadow-inner' : 'bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 shadow-sm'}`}
                      >
                        {exampleAudioLoading ? (
                          <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        ) : isExamplePlaying ? (
                          <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    <p className="text-slate-500 font-prompt mt-4 leading-relaxed border-t border-slate-200/50 pt-3">
                      {details.exampleThai}
                    </p>
                  </div>

                  {details.sources && details.sources.length > 0 && (
                    <div className="pt-4 mt-6 border-t border-slate-100">
                      <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-3">Verified Sources</h4>
                      <div className="flex flex-wrap gap-2">
                        {details.sources.slice(0, 2).map((source, idx) => (
                          <a 
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-slate-600 transition-all truncate max-w-[200px]"
                          >
                            <svg className="w-3 h-3 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            {source.title || "Reference source"}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm font-prompt">Could not load example sentences.</p>
                </div>
              )}
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
