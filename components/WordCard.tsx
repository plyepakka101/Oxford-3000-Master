
import { getWordDetails, fetchWordAudioBuffer } from '../services/geminiService';
import { WordCustomization, WordDetail } from '../types';
import React, { useEffect, useRef, useState } from 'react';

interface WordCardProps {
  word: string;
  level: string;
  isFavorite: boolean;
  onToggleFavorite: (word: string) => void;
  isMastered: boolean;
  onToggleMastered: (word: string) => void;
  onClose: () => void;
}

const WordCard: React.FC<WordCardProps> = ({ word, level, isFavorite, onToggleFavorite, isMastered, onToggleMastered, onClose }) => {
  const [details, setDetails] = useState<WordDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState<WordCustomization>({});
  
  const [audioLoading, setAudioLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const res = await getWordDetails(word);
      if (res) {
        setDetails({ word, ...res });
        setEditForm({
          thaiTranslation: res.thaiTranslation,
          exampleEnglish: res.exampleEnglish,
          exampleThai: res.exampleThai,
          phonetic: res.phonetic
        });
      }
      setLoading(false);
    };
    fetch();
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
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className={`p-8 text-white relative transition-colors duration-500 ${isMastered ? 'bg-emerald-600' : 'bg-indigo-900'}`}>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          
          <div className="flex items-center justify-between mb-4">
            <span className="px-3 py-1 bg-white/20 text-xs font-bold rounded-full uppercase tracking-widest">{details?.level || level}</span>
            <div className="flex gap-2">
              <button onClick={() => onToggleFavorite(word)} className={`p-2 rounded-full hover:bg-white/10 transition-colors ${isFavorite ? 'text-red-400' : 'text-white/50'}`}>
                <svg className="w-6 h-6" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              </button>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div className="flex-1">
              <h2 className="text-4xl font-bold tracking-tight">{word}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <p className="text-indigo-200 font-mono text-lg">{details?.phonetic}</p>
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
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-indigo-900 shadow-lg hover:scale-105 active:scale-95 transition-all flex-shrink-0"
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

        <div className="p-8 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center py-10 space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-gray-400 font-prompt">กำลังค้นหาข้อมูลภาษาไทย...</p>
            </div>
          ) : details && (
            <>
              <div>
                <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">คำแปลภาษาไทย</h3>
                <p className="text-2xl font-bold text-gray-800 font-prompt leading-snug">{details.thaiTranslation}</p>
              </div>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">ตัวอย่างประโยค</h3>
                <div>
                  <p className="text-gray-800 font-medium italic">"{details.exampleEnglish}"</p>
                  <p className="text-gray-500 text-sm font-prompt mt-1">"{details.exampleThai}"</p>
                </div>
              </div>
              <button 
                onClick={() => onToggleMastered(word)} 
                className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${isMastered ? 'bg-slate-100 text-slate-500' : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-[0.98]'}`}
              >
                {isMastered ? (
                  <>จำได้แล้ว <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg></>
                ) : 'คลิกหากจำคำนี้ได้แล้ว'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WordCard;
