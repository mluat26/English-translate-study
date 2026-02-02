import React from 'react';
import { VocabularyItem } from '../types';
import { X, Trash2, Volume2 } from 'lucide-react';

interface SavedWordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedWords: VocabularyItem[];
  onRemove: (word: string) => void;
}

export const SavedWordsModal: React.FC<SavedWordsModalProps> = ({ isOpen, onClose, savedWords, onRemove }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
             <div className="bg-yellow-100 p-2 rounded-lg">
                <span className="text-xl font-bold text-yellow-600">📚</span>
             </div>
             <h2 className="text-xl font-bold text-gray-900">Saved Vocabulary ({savedWords.length})</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {savedWords.length === 0 ? (
            <div className="text-center py-20 text-gray-400 italic">
              No saved words yet. Start practicing to collect vocabulary!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedWords.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-lg text-blue-900 flex items-center gap-2">
                            {item.word}
                            {item.cefr && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded text-white font-bold
                                    ${['C1', 'C2'].includes(item.cefr) ? 'bg-red-500' : 'bg-green-500'}
                                `}>
                                    {item.cefr}
                                </span>
                            )}
                        </h3>
                        <div className="text-xs text-cyan-600 font-bold uppercase tracking-wider">{item.type}</div>
                    </div>
                    <button 
                        onClick={() => onRemove(item.word)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2 italic line-clamp-2">{item.definition}</p>
                  <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
                      <span className="font-bold text-gray-800">{item.translation}</span>
                      {item.pronunciation && <span className="text-xs text-gray-400 font-mono">/{item.pronunciation}/</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
