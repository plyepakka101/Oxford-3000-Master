
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
  // แก้ไข: จะแสดงสถานะ Offline เฉพาะเมื่อ "ไม่มีเน็ต" และ "ไม่มีข้อมูลในเครื่อง" เท่านั้น
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
        setDetails({ word, ...res });
        setShowOfflineWarning(false);
      } else {
        // ถ้าดึงไม่ได้ (เช่น ออฟไลน์และไม่มี cache)
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

  // เมื่อเน็ตกลับมา ให้ลองโหลดข้อมูลใหม่เพื่ออัปเดต cache
  useEffect(() => {
    const handleOnline = () => {
      if (!details) fetchData();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [details]);

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
        {/* Header */}
        <div className={`p-8 text-white relative transition-colors duration-500 ${isMastered ? 'bg-emerald-600' : 'bg-indigo-900'}`}>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/20 text-xs font-bold rounded-full uppercase tracking-widest">{displayLevel}</span>
              {/* แสดงป้าย Offline เฉพาะเมื่อข้อมูลไม่ครบและไม่มีเน็ตจริงๆ เท่านั้น */}
              {showOfflineWarning && !details && (
                <span className="px-2 py-1 bg-amber-500 text-[10px] font-bold rounded-md uppercase shadow-sm">Offline</span>
              )}
              {details && !navigator.onLine && (
                <span className="px-2 py-1 bg-white/10 text-[10px] font-bold rounded-md uppercase border border-white/20">Cached</span>
              )}
            </div>
            <button onClick={() => onToggleFavorite(word)} className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isFavorite ? 'text-red-400' : 'text-white/50'}`}>
              <svg className="w-6 h-6" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
            </button>
          </div>

          <div className="flex justify-between items-end">
            <div className="flex-1">
              <h2 className="text-4xl font-bold tracking-tight">{word}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <p className="text-indigo-200 font-mono text-lg">{details?.phonetic || '...'}</p>
                {details && (
                  <span className="text-white/80 text-[10px] bg-white/10 px-2 py-0.5 rounded border border-white/10 font-prompt">
                    {details.partOfSpeech} • {details.partOfSpeechThai}
                  </span>
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

        {/* Content */}
        <div className="p-8 min-h-[300px] flex flex-col">
          <div className="flex-1 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">คำแปลภาษาไทย</h3>
              <p className="text-2xl font-bold text-gray-800 font-prompt leading-snug">{displayTranslation}</p>
            </div>

            {loading && !details && (
              <div className="flex items-center gap-3 text-slate-400 py-4">
                <div className="w-4 h-4 border-2 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-sm font-prompt">กำลังโหลดข้อมูล...</p>
              </div>
            )}

            {details && (
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">ตัวอย่างประโยค</h3>
                <div>
                  <p className="text-gray-800 font-medium italic">"{details.exampleEnglish}"</p>
                  <p className="text-gray-500 text-sm font-prompt mt-1">"{details.exampleThai}"</p>
                </div>
              </div>
            )}
            
            {!details && !loading && showOfflineWarning && (
              <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                <p className="text-amber-800 text-xs font-prompt">
                  ไม่พบข้อมูลในเครื่องและไม่ได้เชื่อมต่ออินเทอร์เน็ต กรุณาเปิดเน็ตเพื่อโหลดข้อมูลจาก AI ในครั้งแรกครับ
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
