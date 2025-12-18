
import React, { useState, useMemo, useEffect } from 'react';
import { INITIAL_WORDS } from './constants';
import WordCard from './components/WordCard';
import { OxfordWord } from './types';

const App: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedWord, setSelectedWord] = useState<OxfordWord | null>(null);
  const [activeLevel, setActiveLevel] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'favorites' | 'mastered' | 'unlearned'>('all');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('oxford3000_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const [mastered, setMastered] = useState<string[]>(() => {
    const saved = localStorage.getItem('oxford3000_mastered');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('oxford3000_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('oxford3000_mastered', JSON.stringify(mastered));
  }, [mastered]);

  const toggleFavorite = (word: string) => {
    setFavorites(prev => prev.includes(word) ? prev.filter(w => w !== word) : [...prev, word]);
  };

  const toggleMastered = (word: string) => {
    setMastered(prev => prev.includes(word) ? prev.filter(w => w !== word) : [...prev, word]);
  };

  const filteredWords = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    return INITIAL_WORDS.filter(w => {
      const matchesLevel = activeLevel ? w.level === activeLevel : true;
      let matchesFilter = true;
      if (filterMode === 'favorites') matchesFilter = favorites.includes(w.word);
      else if (filterMode === 'mastered') matchesFilter = mastered.includes(w.word);
      else if (filterMode === 'unlearned') matchesFilter = !mastered.includes(w.word);
      
      const matchesSearch = w.word.toLowerCase().includes(searchTerm) || 
                          (w.translation && w.translation.includes(searchTerm));
      
      return matchesLevel && matchesFilter && matchesSearch;
    }).sort((a, b) => a.word.localeCompare(b.word));
  }, [search, activeLevel, filterMode, favorites, mastered]);

  const progressPercentage = Math.round((mastered.length / 3000) * 100);

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <header className="bg-indigo-900 text-white sticky top-0 z-40 shadow-xl">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <span className="bg-white text-indigo-900 px-2 py-0.5 rounded">Oxford</span> 3000 Master
              </h1>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 w-32 bg-indigo-950 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${Math.min(progressPercentage, 100)}%` }}></div>
                </div>
                <span className="text-xs font-medium text-indigo-200">{mastered.length}/3000 words mastered ({progressPercentage}%)</span>
              </div>
            </div>
            
            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder="ค้นหาคำศัพท์..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-12 pr-4 focus:bg-white focus:text-gray-900 outline-none transition-all"
              />
              <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/10 bg-indigo-950/50 overflow-x-auto">
          <div className="max-w-5xl mx-auto px-6 py-3 flex gap-2">
            <button onClick={() => setFilterMode('all')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filterMode === 'all' ? 'bg-white text-indigo-900' : 'bg-white/10'}`}>ทั้งหมด</button>
            <button onClick={() => setFilterMode('unlearned')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filterMode === 'unlearned' ? 'bg-orange-500' : 'bg-white/10'}`}>ยังไม่จำ</button>
            <button onClick={() => setFilterMode('mastered')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filterMode === 'mastered' ? 'bg-emerald-500' : 'bg-white/10'}`}>จำได้แล้ว</button>
            <button onClick={() => setFilterMode('favorites')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${filterMode === 'favorites' ? 'bg-red-500' : 'bg-white/10'}`}>ติดดาว</button>
            <div className="w-px bg-white/10 mx-2"></div>
            {['A1', 'A2', 'B1', 'B2'].map(lvl => (
              <button key={lvl} onClick={() => setActiveLevel(activeLevel === lvl ? null : lvl)} className={`px-4 py-1.5 rounded-full text-xs font-bold ${activeLevel === lvl ? 'bg-indigo-400 text-white' : 'bg-white/10'}`}>{lvl}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredWords.map((item) => (
            <button 
              key={item.word} 
              onClick={() => setSelectedWord(item)} 
              className={`p-5 rounded-2xl shadow-sm border transition-all text-left relative group ${mastered.includes(item.word) ? 'bg-emerald-50 border-emerald-100 opacity-75' : 'bg-white border-gray-100 hover:shadow-md'}`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${item.level === 'A1' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>{item.level}</span>
                {mastered.includes(item.word) && <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mt-2">{item.word}</h3>
              <p className="text-gray-500 text-sm truncate mt-1 font-prompt">{item.translation}</p>
            </button>
          ))}
        </div>

        {filteredWords.length === 0 && (
          <div className="py-20 text-center">
            <div className="bg-white p-10 rounded-3xl shadow-sm inline-block border-2 border-dashed border-gray-200">
              <h3 className="text-xl font-bold text-gray-700 mb-2 font-prompt">ไม่พบคำศัพท์ที่ค้นหา</h3>
              {search && (
                <button 
                  onClick={() => setSelectedWord({ word: search.toLowerCase(), level: 'A1' })}
                  className="mt-4 bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-3 mx-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                  ค้นหา "{search}" ด้วย AI (Oxford 3000)
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {selectedWord && (
        <WordCard 
          word={selectedWord.word} 
          level={selectedWord.level}
          isFavorite={favorites.includes(selectedWord.word)}
          onToggleFavorite={toggleFavorite}
          isMastered={mastered.includes(selectedWord.word)}
          onToggleMastered={toggleMastered}
          onClose={() => setSelectedWord(null)} 
        />
      )}
    </div>
  );
};

export default App;
