
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
      const data = await getWordExamples(word);
      if (data) setDetails(data);
      setLoadingExamples(false);
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
    
    // หากเปลี่ยนข้อความที่เล่นในตำแหน่งเดิม ให้เคลียร์บัฟเฟอร์
    if (isExample && details?.exampleEnglish !== textToPlay) {
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
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
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

          <div className="flex justify-between items-center gap-4">
            <div className="flex-1 min-w-0">
              <h2 id="word-title" className="text-4xl sm:text-6xl font-black text-white tracking-tight break-words drop-shadow-sm">{word}</h2>
              <div className="flex items-baseline gap-3 mt-4 overflow-hidden">
                <span className="text-indigo-200 font-inter text-xl sm:text-2xl whitespace-nowrap tracking-wide">
                  {details?.phonetic || staticPhonetic || '/.../'}
                </span>
                <div className="flex flex-wrap gap-2">
                  <span className="text-white/80 text-[10px] font-bold uppercase bg-white/10 px-2 py-0.5 rounded border border-white/20">
                    {details?.partOfSpeech || staticPosEn || 'pos'}
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
              className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-2xl flex items-center justify-center text-indigo-900 shadow-2xl hover:scale-105 active:scale-95 transition-all flex-shrink-0 disabled:opacity-50 ring-4 ring-black/5"
            >
              {audioLoading ? <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" /> : 
               isPlaying ? <svg className="w-10 h-10 animate-pulse text-indigo-600" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : 
               <svg className="w-10 h-10 ml-1 text-indigo-900" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white px-6 py-8">
          <div className="max-w-xl mx-auto space-y-10">
            <section>
              <h3 className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest mb-4">Thai Translation</h3>
              <div className="bg-indigo-50/50 rounded-3xl p-6 sm:p-8 border border-indigo-100/50 text-center">
                <p className="text-4xl sm:text-5xl font-bold text-slate-800 font-prompt leading-tight">{translation}</p>
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-indigo-600/50 uppercase tracking-widest">Usage Example</h3>
                {loadingExamples && <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />}
              </div>
              
              {details?.exampleEnglish ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 flex flex-col gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <p className="text-xl font-semibold text-slate-800 leading-relaxed italic">"{details.exampleEnglish}"</p>
                      </div>
                      <button 
                        onClick={() => playAudio(details.exampleEnglish, true)}
                        disabled={exampleAudioLoading}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors flex-shrink-0"
                      >
                        {exampleAudioLoading ? <div className="w-5 h-5 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" /> : 
                         isExamplePlaying ? <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : 
                         <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" /></svg>}
                      </button>
                    </div>
                    <div className="pt-4 border-t border-slate-200/60">
                      <p className="text-slate-600 font-prompt leading-relaxed">{details.exampleThai}</p>
                    </div>
                  </div>
                  
                  {details.sources && details.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      <span className="text-[10px] text-slate-400 font-bold uppercase w-full mb-1">Sources from Google Search:</span>
                      {details.sources.map((s, i) => (
                        <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-500 hover:underline bg-indigo-50 px-2 py-1 rounded">
                          {s.title}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ) : !loadingExamples && (
                <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-3xl">
                  <p className="text-slate-400 text-sm font-prompt">
                    {!navigator.onLine ? "คุณกำลังออฟไลน์ และยังไม่มีข้อมูลคำนี้เก็บไว้" : "กำลังดึงข้อมูลตัวอย่างประโยค..."}
                  </p>
                </div>
              )}
            </section>
          </div>
        </div>

        <div className="px-6 py-6 sm:py-8 bg-slate-50 border-t border-slate-100 flex gap-4">
          <button 
            onClick={() => onToggleMastered(word)} 
            className={`flex-1 py-4 px-6 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-3 active:scale-[0.98] ${
              isMastered ? 'bg-white text-emerald-600 border-2 border-emerald-100' : 'bg-indigo-600 text-white'
            }`}
          >
            {isMastered ? (
              <><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>Mastered</>
            ) : 'Mark as Mastered'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WordCard;
