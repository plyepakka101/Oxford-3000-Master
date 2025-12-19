
import { getWordDetails, fetchWordAudioBuffer } from '../services/geminiService';
import { WordDetail, OxfordWord } from '../types';
import React, { useEffect, useRef, useState } from 'react';

interface WordCardProps {
  wordData: OxfordWord;
  isFavorite: boolean;
  onToggleFavorite: (word: string) => void;
  isMastered: boolean;
  onToggleMastered: (word: string) => void;
  onClose: () => void;
}

const WordCard: React.FC<WordCardProps> = ({ wordData, isFavorite, onToggleFavorite, isMastered, onToggleMastered, onClose }) => {
  const { word, level, translation: staticTranslation } = wordData;
  const [details, setDetails] = useState<WordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);
  
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

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
    return () => stopAudio();
  }, [word]);

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const playAudio = async () => {
    if (!audioCtxRef.current) {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      audioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
    }
    
    if (!audioBufferRef.current) {
      setAudioLoading(true);
      const buffer = await fetchWordAudioBuffer(word, audioCtxRef.current);
      setAudioLoading(false);
      if (!buffer) return;
      audioBufferRef.current = buffer;
    }
    stopAudio();
    const source = audioCtxRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    source.connect(audioCtxRef.current.destination);
    source.onended = () => setIsPlaying(false);
    sourceNodeRef.current = source;
    source.start();
    setIsPlaying(true);
  };

  const displayTranslation = details?.thaiTranslation || staticTranslation || "กำลังโหลด...";
  const displayLevel = details?.level || level;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header Section */}
        <div className={`p-8 text-white relative transition-colors duration-500 ${isMastered ? 'bg-emerald-600' : 'bg-indigo-900'}`}>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/20 text-xs font-bold rounded-full uppercase tracking-widest">{displayLevel}</span>
              {showOfflineWarning && !details && (
                <span className="px-2 py-1 bg-amber-500 text-[10px] font-bold rounded-md uppercase shadow-sm">Offline</span>
              )}
            </div>
            <button onClick={() => onToggleFavorite(word)} className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isFavorite ? 'text-red-400' : 'text-white/50'}`}>
              <svg className="w-6 h-6" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            </button>
          </div>

          <div className="flex justify-between items-end">
            <div className="flex-1">
              <h2 className="text-4xl font-bold tracking-tight">{word}</h2>
              {/* รายละเอียดคำอ่านและประเภทคำใต้ชื่อคำศัพท์ */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <p className="text-indigo-200 font-mono text-lg">{details?.phonetic || '/.../'}</p>
                {details && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/90 text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold uppercase">
                      {details.partOfSpeech}
                    </span>
                    <span className="text-white/70 text-[10px] font-prompt">
                      ({details.partOfSpeechThai})
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={playAudio} 
              disabled={audioLoading} 
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-indigo-900 shadow-xl hover:scale-105 active:scale-95 transition-all flex-shrink-0 disabled:opacity-50"
            >
              {audioLoading ? (
                <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              ) : isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
              ) : (
                <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              )}
            </button>
          </div>
        </div>

        {/* Details Section */}
        <div className="p-8 min-h-[350px] flex flex-col">
          <div className="flex-1 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">คำแปลภาษาไทย</h3>
              <p className="text-2xl font-bold text-gray-800 font-prompt leading-snug">{displayTranslation}</p>
            </div>

            {loading && !details && (
              <div className="flex items-center gap-3 text-slate-400 py-4 animate-pulse">
                <div className="w-4 h-4 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-sm font-prompt">กำลังค้นหาตัวอย่างจาก Google Search...</p>
              </div>
            )}

            {details && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex justify-between items-center">
                    ตัวอย่างจากอินเทอร์เน็ต
                    <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">Google Grounded</span>
                  </h3>
                  <div>
                    <p className="text-gray-800 font-medium italic">"{details.exampleEnglish}"</p>
                    <p className="text-gray-500 text-sm font-prompt mt-1">"{details.exampleThai}"</p>
                  </div>
                </div>

                {/* แหล่งที่มาอ้างอิง */}
                {details.sources && details.sources.length > 0 && (
                  <div className="px-1">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-2">อ้างอิงแหล่งที่มา:</h4>
                    <div className="flex flex-wrap gap-2">
                      {details.sources.map((source, idx) => (
                        <a 
                          key={idx} 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-[10px] text-indigo-500 hover:text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 transition-colors truncate max-w-[150px]"
                        >
                          {source.title || "ลิงก์อ้างอิง"}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {!details && !loading && showOfflineWarning && (
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                <p className="text-amber-800 text-xs font-prompt">
                  ออฟไลน์: ไม่สามารถค้นหาประโยคตัวอย่างใหม่จาก Google ได้ในขณะนี้
                </p>
              </div>
            )}
            
            <button 
              onClick={() => onToggleMastered(word)} 
              className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 mt-auto ${isMastered ? 'bg-slate-100 text-slate-500' : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]'}`}
            >
              {isMastered ? 'จำได้แล้ว' : 'คลิกหากจำคำนี้ได้แล้ว'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WordCard;
