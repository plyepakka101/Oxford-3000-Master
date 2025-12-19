
import { fetchWordAudioBuffer, getWordExamples } from '../services/geminiService';
import { OxfordWord, WordDetail } from '../types';
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
  const { word, level, translation, phonetic: staticPhonetic, posEn: staticPosEn, posTh: staticPosTh } = wordData;
  
  const [details, setDetails] = useState<WordDetail | null>(null);
  const [loadingExamples, setLoadingExamples] = useState(false);

  // Audio States
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exampleAudioLoading, setExampleAudioLoading] = useState(false);
  const [isExamplePlaying, setIsExamplePlaying] = useState(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const exampleBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const loadData = async () => {
      setLoadingExamples(true);
      try {
        const data = await getWordExamples(word);
        if (data) setDetails(data);
      } catch (err) {
        console.error("Failed to load details", err);
      } finally {
        setLoadingExamples(false);
      }
    };
    loadData();

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

  const playAudio = async (textToPlay: string, isExample: boolean = false) => {
    const ctx = await initAudioCtx();
    const bufferRef = isExample ? exampleBufferRef : audioBufferRef;
    const setLoading = isExample ? setExampleAudioLoading : setAudioLoading;
    const setIsPlayingState = isExample ? setIsExamplePlaying : setIsPlaying;
    
    if (isExample && exampleBufferRef.current && details?.exampleEnglish !== textToPlay) {
      exampleBufferRef.current = null;
    }

    if (!bufferRef.current) {
      setLoading(true);
      const buffer = await fetchWordAudioBuffer(textToPlay, ctx);
      setLoading(false);
      if (!buffer) return;
      bufferRef.current = buffer;
    }

    stopAudio();
    const source = ctx.createBufferSource();
    source.buffer = bufferRef.current;
    source.connect(ctx.destination);
    source.onended = () => setIsPlayingState(false);
    sourceNodeRef.current = source;
    source.start();
    setIsPlayingState(true);
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        ref={modalRef}
        className="bg-white w-full max-w-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in slide-in-from-bottom sm:zoom-in duration-300 origin-bottom sm:origin-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Section */}
        <div className={`relative px-6 pb-10 pt-8 sm:pt-12 transition-all duration-700 ${isMastered ? 'bg-emerald-600' : 'bg-indigo-900'}`}>
          <div className="flex items-start justify-between mb-4">
            <span className="px-3 py-1 bg-white/20 text-[10px] font-bold rounded-full uppercase tracking-widest text-white shadow-sm">
              {level}
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onToggleFavorite(word)}
                className={`p-2.5 rounded-full transition-all ${isFavorite ? 'bg-white/20 text-rose-300' : 'text-white/40 hover:text-white/60'}`}
              >
                <svg className="w-6 h-6" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </button>
              <button onClick={onClose} className="p-2.5 rounded-full text-white/40 hover:text-white/80 transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          </div>

          <div className="flex justify-between items-end gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-5xl sm:text-7xl font-black text-white tracking-tight break-words drop-shadow-lg">{word}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <span className="text-indigo-100 font-mono text-xl sm:text-2xl tracking-widest">
                  {details?.phonetic || staticPhonetic || '/.../'}
                </span>
                <div className="flex gap-2">
                  <span className="text-white/80 text-[10px] font-bold uppercase bg-white/10 px-2 py-0.5 rounded border border-white/20">
                    {details?.partOfSpeech || staticPosEn || '...'}
                  </span>
                  <span className="text-white/80 text-[10px] font-bold font-prompt bg-white/10 px-2 py-0.5 rounded border border-white/20">
                    {details?.partOfSpeechThai || staticPosTh || 'ประเภทคำ'}
                  </span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => playAudio(word)} 
              disabled={audioLoading} 
              className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-3xl flex items-center justify-center text-indigo-900 shadow-2xl hover:scale-105 active:scale-95 transition-all flex-shrink-0 disabled:opacity-50 ring-8 ring-black/5"
            >
              {audioLoading ? <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" /> : 
               isPlaying ? <svg className="w-12 h-12 animate-pulse text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : 
               <svg className="w-12 h-12 ml-1 text-indigo-900" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-8">
          <div className="max-w-xl mx-auto space-y-8">
            <section>
              <h3 className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest mb-3 px-1">Thai Translation</h3>
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center">
                <p className="text-4xl sm:text-5xl font-bold text-slate-800 font-prompt leading-tight">{translation}</p>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest">Usage Example</h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full border border-emerald-100 uppercase tracking-tighter">AI Powered</span>
              </div>
              
              <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                {loadingExamples ? (
                  <div className="p-12 flex flex-col items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-xs text-slate-400 font-prompt animate-pulse">กำลังดึงข้อมูลจาก Google Search...</p>
                  </div>
                ) : details?.exampleEnglish ? (
                  <div className="divide-y divide-slate-50">
                    <div className="p-6 sm:p-8 flex items-start gap-4">
                      <div className="flex-1">
                        <p className="text-xl sm:text-2xl font-medium text-slate-800 leading-relaxed italic">"{details.exampleEnglish}"</p>
                      </div>
                      <button 
                        onClick={() => playAudio(details.exampleEnglish, true)}
                        disabled={exampleAudioLoading}
                        className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 hover:bg-indigo-100 transition-colors flex-shrink-0"
                      >
                        {exampleAudioLoading ? <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /> : 
                         isExamplePlaying ? <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : 
                         <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>}
                      </button>
                    </div>
                    <div className="p-6 sm:p-8 bg-slate-50/50">
                      <p className="text-slate-600 font-prompt text-lg leading-relaxed">{details.exampleThai}</p>
                    </div>
                    
                    {details.sources && details.sources.length > 0 && (
                      <div className="p-4 bg-white">
                        <p className="text-[9px] text-slate-400 font-bold uppercase mb-2 px-1">Sources:</p>
                        <div className="flex flex-wrap gap-2">
                          {details.sources.map((s, i) => (
                            <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 hover:text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded-lg border border-indigo-100/50 truncate max-w-[150px]">
                              {s.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-12 text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <p className="text-slate-400 text-sm font-prompt">
                      {!navigator.onLine ? "คุณกำลังออฟไลน์ ข้อมูลนี้ยังไม่ได้ถูกโหลดเก็บไว้" : "ไม่สามารถโหลดตัวอย่างประโยคได้ในขณะนี้"}
                    </p>
                    <button onClick={() => window.location.reload()} className="text-xs text-indigo-600 font-bold hover:underline mt-2">ลองอีกครั้ง</button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-8 bg-white border-t border-slate-100 flex gap-4">
          <button 
            onClick={() => onToggleMastered(word)} 
            className={`flex-1 py-5 px-6 rounded-3xl font-black transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 ${
              isMastered ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isMastered ? (
              <><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Mastered!</>
            ) : 'Mark as Mastered'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WordCard;
