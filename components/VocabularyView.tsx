import React, { useState, useMemo, useEffect } from 'react';
import { VocabularyItem } from '../types';
import { ArrowLeft, Brain, CheckCircle2, Trash2, Search, RotateCcw, Eye, EyeOff, Layers, Zap, Plus } from 'lucide-react';

interface VocabularyViewProps {
  savedWords: VocabularyItem[];
  onRemove: (word: string) => void;
  onAdd: (word: VocabularyItem) => void;
  onExit: () => void;
}

type FilterType = 'ALL' | 'BASIC' | 'INTER' | 'ADV';

export const VocabularyView: React.FC<VocabularyViewProps> = ({ savedWords, onRemove, onAdd, onExit }) => {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [mode, setMode] = useState<'LIST' | 'LEARN'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New Card State
  const [newCard, setNewCard] = useState<Partial<VocabularyItem>>({
      word: '',
      translation: '',
      definition: '',
      type: 'Noun',
      cefr: 'B1',
      context: '',
      pronunciation: ''
  });
  
  // Learning Mode State (Anki-style Queue)
  const [studyQueue, setStudyQueue] = useState<VocabularyItem[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, hard: 0 });
  const [showHint, setShowHint] = useState(false);

  const stats = useMemo(() => {
    return {
      total: savedWords.length,
      basic: savedWords.filter(w => ['A1', 'A2'].includes(w.cefr || '')).length,
      inter: savedWords.filter(w => ['B1', 'B2'].includes(w.cefr || '')).length,
      adv: savedWords.filter(w => ['C1', 'C2'].includes(w.cefr || '')).length,
    };
  }, [savedWords]);

  const filteredWords = useMemo(() => {
    let result = savedWords;
    if (filter === 'BASIC') result = result.filter(w => ['A1', 'A2'].includes(w.cefr || ''));
    if (filter === 'INTER') result = result.filter(w => ['B1', 'B2'].includes(w.cefr || ''));
    if (filter === 'ADV') result = result.filter(w => ['C1', 'C2'].includes(w.cefr || ''));
    
    if (searchTerm) {
        result = result.filter(w => w.word.toLowerCase().includes(searchTerm.toLowerCase()) || w.translation.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return result;
  }, [savedWords, filter, searchTerm]);

  // Reset state on card change
  useEffect(() => {
    setIsFlipped(false);
    setShowHint(false); // Default hidden translation
  }, [currentCardIndex]);

  const handleAddSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newCard.word && newCard.translation) {
          onAdd(newCard as VocabularyItem);
          setShowAddModal(false);
          setNewCard({
            word: '',
            translation: '',
            definition: '',
            type: 'Noun',
            cefr: 'B1',
            context: '',
            pronunciation: ''
          });
      }
  };

  const startLearning = () => {
    if (filteredWords.length === 0) return;
    // Shuffle words for the session
    const shuffled = [...filteredWords].sort(() => Math.random() - 0.5);
    setStudyQueue(shuffled);
    setCurrentCardIndex(0);
    setSessionStats({ reviewed: 0, hard: 0 });
    setMode('LEARN');
  };

  const handleGrade = (difficulty: 'HARD' | 'GOOD' | 'EASY') => {
    const currentCard = studyQueue[currentCardIndex];
    
    setSessionStats(prev => ({ ...prev, reviewed: prev.reviewed + 1 }));

    if (difficulty === 'HARD') {
        // Re-queue at the end
        setStudyQueue(prev => [...prev, currentCard]);
        setSessionStats(prev => ({ ...prev, hard: prev.hard + 1 }));
        // Move to next card immediately (which is just index + 1)
        setCurrentCardIndex(prev => prev + 1);
    } else {
        // Good or Easy: Just move to next card
        setCurrentCardIndex(prev => prev + 1);
    }
  };

  const isFinished = currentCardIndex >= studyQueue.length;

  // Progress Bar Helper
  const progressPercent = useMemo(() => {
      if (studyQueue.length === 0) return 0;
      return (currentCardIndex / studyQueue.length) * 100;
  }, [currentCardIndex, studyQueue.length]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onExit} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-gray-900 text-xl flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" /> 
            {mode === 'LIST' ? 'Vocabulary Deck' : 'Flashcards'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
             {mode === 'LIST' && (
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="p-2 hover:bg-gray-100 text-gray-600 rounded-full border border-gray-200"
                    title="Add Manual Card"
                >
                    <Plus className="w-5 h-5" />
                </button>
            )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 pb-24">
        
        {mode === 'LIST' ? (
            <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <button 
                        onClick={() => setFilter('ALL')}
                        className={`p-4 rounded-2xl border transition-all text-left group
                            ${filter === 'ALL' ? 'bg-blue-600 text-white border-blue-600 shadow-xl' : 'bg-white border-gray-100 hover:border-blue-200'}
                        `}
                    >
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${filter === 'ALL' ? 'text-blue-200' : 'text-gray-400'}`}>Total</span>
                        <div className="text-3xl font-black mt-1">{stats.total}</div>
                    </button>

                    <button 
                        onClick={() => setFilter('BASIC')}
                        className={`p-4 rounded-2xl border transition-all text-left
                             ${filter === 'BASIC' ? 'bg-green-500 text-white border-green-500 shadow-xl' : 'bg-white border-gray-100 hover:border-green-200'}
                        `}
                    >
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${filter === 'BASIC' ? 'text-green-100' : 'text-gray-400'}`}>Basic (A1-A2)</span>
                        <div className="text-3xl font-black mt-1">{stats.basic}</div>
                    </button>

                    <button 
                         onClick={() => setFilter('INTER')}
                        className={`p-4 rounded-2xl border transition-all text-left
                            ${filter === 'INTER' ? 'bg-yellow-500 text-white border-yellow-500 shadow-xl' : 'bg-white border-gray-100 hover:border-yellow-200'}
                        `}
                    >
                         <span className={`text-[10px] font-bold uppercase tracking-wider ${filter === 'INTER' ? 'text-yellow-100' : 'text-gray-400'}`}>Inter (B1-B2)</span>
                        <div className="text-3xl font-black mt-1">{stats.inter}</div>
                    </button>

                    <button 
                         onClick={() => setFilter('ADV')}
                        className={`p-4 rounded-2xl border transition-all text-left
                            ${filter === 'ADV' ? 'bg-red-500 text-white border-red-500 shadow-xl' : 'bg-white border-gray-100 hover:border-red-200'}
                        `}
                    >
                         <span className={`text-[10px] font-bold uppercase tracking-wider ${filter === 'ADV' ? 'text-red-100' : 'text-gray-400'}`}>Advanced</span>
                        <div className="text-3xl font-black mt-1">{stats.adv}</div>
                    </button>
                </div>

                {/* List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredWords.map((item, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-slate-800">{item.word}</h3>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onRemove(item.word); }}
                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{item.type}</span>
                                {item.cefr && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white
                                        ${['C1', 'C2'].includes(item.cefr) ? 'bg-red-400' : 'bg-green-400'}
                                    `}>
                                        {item.cefr}
                                    </span>
                                )}
                            </div>

                            <p className="text-blue-600 font-medium">{item.translation}</p>
                            <p className="text-gray-400 text-xs mt-1 truncate">{item.definition}</p>
                        </div>
                    ))}
                    {filteredWords.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 italic">
                            No cards in this deck.
                        </div>
                    )}
                </div>
            </>
        ) : (
            // Flashcard Mode (Anki Style)
            <div className="max-w-xl mx-auto h-[calc(100vh-140px)] flex flex-col justify-center pb-10">
                {isFinished ? (
                    <div className="text-center bg-white p-10 rounded-3xl shadow-xl animate-in zoom-in">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-black text-gray-900 mb-2">Session Complete!</h2>
                        <p className="text-gray-500 mb-8">You reviewed {sessionStats.reviewed} cards.</p>
                        <button 
                            onClick={() => setMode('LIST')}
                            className="bg-slate-900 text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-black transition-all"
                        >
                            Back to Deck
                        </button>
                    </div>
                ) : (
                    <>
                         {/* Progress Bar (Above Card) */}
                         <div className="mb-4">
                            <div className="flex justify-between items-end mb-2 px-1">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Progress</span>
                                <div className="text-xs font-medium text-gray-500">
                                    <span className="text-slate-900 font-bold">{studyQueue.length - currentCardIndex}</span> remaining
                                    {sessionStats.hard > 0 && <span className="text-red-500 ml-2">({sessionStats.hard} re-queued)</span>}
                                </div>
                            </div>
                            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500 transition-all duration-300 ease-out" 
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>

                        <div className="perspective-1000 flex-1 w-full relative group">
                            <div 
                                className={`w-full h-full relative transition-all duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
                            >
                                {/* Front (Question/Context) */}
                                <div 
                                    className="absolute inset-0 backface-hidden bg-white rounded-3xl shadow-xl border border-gray-100 p-8 flex flex-col items-center text-center cursor-pointer"
                                    onClick={() => setIsFlipped(true)}
                                >
                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-6 bg-blue-50 px-3 py-1 rounded-full">Challenge</span>
                                    
                                    {/* Instructions */}
                                    <div className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-8 bg-gray-50 px-4 py-2 rounded-lg">
                                        <Zap className="w-4 h-4 text-yellow-500" />
                                        Speak aloud or form a sentence
                                    </div>

                                    {/* Contextual Question (VISIBLE) */}
                                    <div className="mb-6 relative w-full flex-1 flex flex-col items-center justify-center">
                                        
                                        {/* Definition Box (Primary Hint) */}
                                        <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-100 w-full shadow-sm mb-6">
                                             <p className="text-xl text-yellow-900 font-serif italic leading-relaxed">
                                                "{studyQueue[currentCardIndex].definition}"
                                             </p>
                                        </div>
                                        
                                        {/* Translation Toggle */}
                                        <div className="flex flex-col items-center justify-center gap-4 w-full">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setShowHint(!showHint); }}
                                                className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-wider"
                                            >
                                                {showHint ? (
                                                    <><EyeOff className="w-4 h-4" /> Hide Meaning</>
                                                ) : (
                                                    <><Eye className="w-4 h-4" /> Show Meaning</>
                                                )}
                                            </button>
                                            
                                            <div className={`transition-all duration-300 overflow-hidden w-full ${showHint ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
                                                <p className="text-lg text-slate-800 font-medium italic">
                                                    "{studyQueue[currentCardIndex].translation}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto text-xs text-gray-300 font-bold uppercase tracking-widest">
                                        Tap card to flip
                                    </div>
                                </div>

                                {/* Back (Answer) */}
                                <div 
                                    className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-900 rounded-3xl shadow-xl p-8 flex flex-col items-center justify-center text-center text-white cursor-pointer"
                                    onClick={() => setIsFlipped(false)} // Clicking back flips to front
                                >
                                    <div className="w-full flex justify-between items-start absolute top-8 px-8">
                                         <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Answer</span>
                                         <RotateCcw className="w-4 h-4 text-slate-600" />
                                    </div>
                                    
                                    <div className="flex flex-col items-center gap-2 mb-2 mt-8">
                                        <h2 className="text-4xl font-black tracking-tight">{studyQueue[currentCardIndex].word}</h2>
                                        {/* Word Type Badge */}
                                        <span className="bg-slate-700 text-cyan-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider border border-slate-600 mt-2">
                                            {studyQueue[currentCardIndex].type}
                                        </span>
                                    </div>

                                    <div className="text-slate-400 font-mono mb-8">/{studyQueue[currentCardIndex].pronunciation}/</div>
                                    
                                    <div className="space-y-4 mb-8 max-w-xs">
                                        <p className="text-2xl font-bold text-yellow-400">{studyQueue[currentCardIndex].translation}</p>
                                        <p className="text-sm text-slate-300 opacity-80 border-t border-slate-700 pt-3 mt-2">{studyQueue[currentCardIndex].context}</p>
                                    </div>
                                    
                                    {/* Grading Buttons - Stop Propagation so they don't flip the card */}
                                    <div 
                                        className="mt-auto w-full grid grid-cols-3 gap-3"
                                        onClick={(e) => e.stopPropagation()} 
                                    >
                                        <button 
                                            onClick={() => handleGrade('HARD')}
                                            className="bg-red-500/20 hover:bg-red-500 hover:text-white text-red-400 border border-red-500/50 py-3 rounded-xl font-bold text-sm transition-all"
                                        >
                                            Hard
                                            <span className="block text-[10px] opacity-60 font-normal">Review soon</span>
                                        </button>
                                        <button 
                                            onClick={() => handleGrade('GOOD')}
                                            className="bg-green-500/20 hover:bg-green-500 hover:text-white text-green-400 border border-green-500/50 py-3 rounded-xl font-bold text-sm transition-all"
                                        >
                                            Good
                                            <span className="block text-[10px] opacity-60 font-normal">Got it</span>
                                        </button>
                                        <button 
                                            onClick={() => handleGrade('EASY')}
                                            className="bg-blue-500/20 hover:bg-blue-500 hover:text-white text-blue-400 border border-blue-500/50 py-3 rounded-xl font-bold text-sm transition-all"
                                        >
                                            Easy
                                            <span className="block text-[10px] opacity-60 font-normal">Mastered</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Cancel button */}
                        <div className="text-center mt-6">
                            <button onClick={() => setMode('LIST')} className="text-gray-400 text-sm font-medium hover:text-gray-600">End Session</button>
                        </div>
                    </>
                )}
            </div>
        )}

        {/* Add Manual Card Modal */}
        {showAddModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
                <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-900">Add New Card</h3>
                        <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-gray-200 rounded-full"><Trash2 className="w-5 h-5 text-gray-400" /></button>
                    </div>
                    <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Word *</label>
                                <input 
                                    required
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newCard.word}
                                    onChange={e => setNewCard({...newCard, word: e.target.value})}
                                    placeholder="e.g. Ephemeral"
                                />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Translation *</label>
                                <input 
                                    required
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={newCard.translation}
                                    onChange={e => setNewCard({...newCard, translation: e.target.value})}
                                    placeholder="e.g. Phù du"
                                />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                <select 
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                                    value={newCard.type}
                                    onChange={e => setNewCard({...newCard, type: e.target.value})}
                                >
                                    <option value="Noun">Noun</option>
                                    <option value="Verb">Verb</option>
                                    <option value="Adjective">Adjective</option>
                                    <option value="Adverb">Adverb</option>
                                    <option value="Phrase">Phrase</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Level</label>
                                <select 
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                                    value={newCard.cefr}
                                    onChange={e => setNewCard({...newCard, cefr: e.target.value})}
                                >
                                    <option value="A1">A1</option>
                                    <option value="A2">A2</option>
                                    <option value="B1">B1</option>
                                    <option value="B2">B2</option>
                                    <option value="C1">C1</option>
                                    <option value="C2">C2</option>
                                </select>
                            </div>
                        </div>

                         <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Definition (Optional)</label>
                            <input 
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={newCard.definition}
                                onChange={e => setNewCard({...newCard, definition: e.target.value})}
                                placeholder="Short explanation in Vietnamese..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Example Sentence (Context)</label>
                            <textarea 
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                                value={newCard.context}
                                onChange={e => setNewCard({...newCard, context: e.target.value})}
                                placeholder="A sentence using this word..."
                            />
                        </div>

                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg mt-2">
                            Add to Deck
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Floating Start Session Button (Mobile Optimized) */}
        {mode === 'LIST' && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm">
                <button 
                    onClick={startLearning}
                    disabled={filteredWords.length === 0}
                    className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 text-white py-4 rounded-2xl font-bold shadow-2xl flex items-center justify-center gap-2 hover:scale-105 transition-all"
                >
                    <Brain className="w-6 h-6" /> 
                    <span>Start Practice Session</span>
                </button>
            </div>
        )}
      </div>
    </div>
  );
};