import React, { useState, useMemo, useEffect, useRef } from 'react';
import { VocabularyItem, TokenUsage } from '../types';
import { lookupWordContext } from '../services/aiService';
import { X, Bookmark, BookmarkCheck, Loader2, Sparkles } from 'lucide-react';

interface InteractiveTextProps {
  text: string;
  vocabulary: VocabularyItem[];
  savedWords: VocabularyItem[];
  onToggleSave: (word: VocabularyItem) => void;
  onTokenUsage?: (usage: TokenUsage) => void;
  viewMode?: 'PARAGRAPH' | 'SENTENCE';
}

export const InteractiveText: React.FC<InteractiveTextProps> = ({ 
  text, 
  vocabulary, 
  savedWords,
  onToggleSave,
  onTokenUsage,
  viewMode = 'PARAGRAPH'
}) => {
  const [selectedWord, setSelectedWord] = useState<VocabularyItem | null>(null);
  const [loadingWord, setLoadingWord] = useState<string | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number, y: number } | null>(null);
  
  // Selection State
  const [selection, setSelection] = useState<{ text: string; x: number; y: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize vocabulary for easier lookup
  const vocabMap = useMemo(() => {
    const map = new Map<string, VocabularyItem>();
    vocabulary.forEach(item => {
      map.set(item.word.toLowerCase(), item);
    });
    return map;
  }, [vocabulary]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('.vocab-popover') || target.closest('.selection-popup')) return;

      if (containerRef.current && !containerRef.current.contains(target)) {
        setSelectedWord(null);
        setSelection(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Text Selection
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim()) {
        return;
      }

      const range = sel.getRangeAt(0);
      if (containerRef.current && containerRef.current.contains(range.commonAncestorContainer)) {
         const rect = range.getBoundingClientRect();
         setSelection({
           text: sel.toString().trim(),
           x: rect.left + rect.width / 2,
           y: rect.top - 10 + window.scrollY
         });
         setSelectedWord(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    const handleMouseUp = (e: MouseEvent) => {
       const sel = window.getSelection();
       if((!sel || sel.isCollapsed) && !(e.target as HTMLElement).closest('.selection-popup')) {
           setSelection(null);
       }
    };
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
        document.removeEventListener('mouseup', handleMouseUp);
    }
  }, []);


  const handleManualTranslate = async () => {
    if (!selection) return;
    const textToTranslate = selection.text;
    setSelection(null); // Hide button
    
    // Simulate a click event structure
    handleWordClick(textToTranslate, { 
        stopPropagation: () => {}, 
        target: { getBoundingClientRect: () => ({ left: selection.x, width: 0, bottom: selection.y, height: 0 }) } 
    } as any, true);
  };

  // Helper to find the sentence containing the word index
  const findSentence = (fullText: string, targetWord: string): string => {
      // Simple sentence splitter
      const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
      for (const sentence of sentences) {
          if (sentence.toLowerCase().includes(targetWord.toLowerCase())) {
              return sentence.trim();
          }
      }
      return "";
  };

  const handleWordClick = async (clickedText: string, event: React.MouseEvent, isManual = false) => {
    if(!isManual) event.stopPropagation();
    
    // Position logic
    let rect;
    if (isManual) {
        rect = { left: selection?.x || 0, width: 0, bottom: selection?.y || 0 };
    } else {
        rect = (event.target as HTMLElement).getBoundingClientRect();
    }

    setPopoverPosition({
      x: rect.left + rect.width / 2,
      y: (isManual ? rect.bottom : rect.bottom + window.scrollY) + 10
    });

    const cleanText = clickedText.trim().replace(/[.,!?;:"()]+/g, '').toLowerCase();
    
    // Extract context sentence
    const currentContext = findSentence(text, clickedText);

    // 1. Check pre-fetched vocabulary
    if (vocabMap.has(cleanText)) {
      const cached = vocabMap.get(cleanText)!;
      // Inject context if missing
      setSelectedWord({ ...cached, context: cached.context || currentContext });
      return;
    }

    // 2. Fetch
    setLoadingWord(clickedText);
    setSelectedWord(null);
    try {
      const result = await lookupWordContext(clickedText, text);
      // Inject context
      const resultWithContext = { ...result, context: currentContext };
      setSelectedWord(resultWithContext);
      
      if (onTokenUsage && result.usage) {
          onTokenUsage(result.usage);
      }
    } catch (err) {
      console.error("Lookup failed", err);
      setSelectedWord({
        word: clickedText,
        definition: "Unable to translate. Check connection.",
        translation: "Lỗi",
        type: "Unknown",
        context: currentContext
      });
    } finally {
      setLoadingWord(null);
    }
  };

  const isSaved = (item: VocabularyItem) => {
    return savedWords.some(w => w.word === item.word);
  };

  const renderTextSegment = (segment: string, idx: number) => {
    const tokens = segment.split(/([a-zA-ZÀ-ÿ0-9'-]+)/g);
    const elements: React.ReactNode[] = [];
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!token.trim()) {
        elements.push(<span key={i}>{token}</span>); 
        continue;
      }
      
      if (!/[a-zA-Z0-9]/.test(token)) {
        elements.push(<span key={i} className="text-gray-600">{token}</span>);
        continue;
      }

      // Phrase Detection
      let matchFound = false;
      for (let len = 4; len >= 2; len--) {
        let phraseParts = [token];
        let nextTokenIdx = i + 1;
        
        while (phraseParts.length < len && nextTokenIdx < tokens.length) {
          const nextTok = tokens[nextTokenIdx];
          if (/[a-zA-Z0-9]/.test(nextTok)) {
            phraseParts.push(nextTok);
          }
          nextTokenIdx++;
        }

        const phraseStr = phraseParts.join(" ").toLowerCase(); 

        if (vocabMap.has(phraseStr)) {
          let displayStr = "";
          let tempIdx = i;
          let wordsFound = 0;
          while (wordsFound < len && tempIdx < tokens.length) {
             displayStr += tokens[tempIdx];
             if (/[a-zA-Z0-9]/.test(tokens[tempIdx])) {
               wordsFound++;
             }
             tempIdx++;
          }

          elements.push(
            <span
              key={`phrase-${i}`}
              onClick={(e) => handleWordClick(phraseStr, e)}
              className="cursor-pointer bg-blue-50 text-blue-700 border-b border-blue-300 hover:bg-blue-100 rounded px-1 mx-0.5 transition-all"
            >
              {displayStr}
            </span>
          );
          
          i = tempIdx - 1; 
          matchFound = true;
          break;
        }
      }

      if (matchFound) continue;

      const cleanToken = token.toLowerCase();
      const isVocab = vocabMap.has(cleanToken);

      elements.push(
        <span
          key={i}
          onClick={(e) => handleWordClick(token, e)}
          className={`cursor-pointer transition-colors duration-150 rounded px-0.5 mx-0.5
            ${isVocab 
              ? 'border-b border-dashed border-blue-400 text-blue-900 font-medium hover:bg-blue-100' 
              : 'hover:bg-gray-200 text-gray-800'
            }
            ${selectedWord?.word.toLowerCase() === cleanToken ? 'bg-yellow-200 !border-yellow-600' : ''}
          `}
        >
          {token}
        </span>
      );
    }
    return elements;
  };

  // Determine text segments based on mode
  const segments = useMemo(() => {
      if (viewMode === 'SENTENCE') {
           // Split by sentence delimiters but keep them. 
           // Simple regex approx: Split by .!? followed by space or end of string.
           return text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [text];
      } else {
          // Split by paragraphs
          return text.split('\n');
      }
  }, [text, viewMode]);

  // Estimate tokens for selection: roughly words + prompt overhead
  const estimateSelectionCost = selection ? Math.ceil(selection.text.split(' ').length * 1.5 + 200) : 0;

  return (
    <div className="relative" ref={containerRef}>
      {/* Floating Translate Button for Selection */}
      {selection && (
          <button
            className="selection-popup fixed z-[60] bg-gray-900 text-white shadow-xl flex items-stretch rounded-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 hover:scale-105 transition-transform"
            style={{ 
                left: selection.x, 
                top: selection.y - 60,
                transform: 'translateX(-50%)'
            }}
            onMouseDown={(e) => { e.preventDefault(); handleManualTranslate(); }} 
          >
            <div className="px-3 py-2 flex items-center gap-2 font-bold text-sm">
                <Sparkles className="w-4 h-4 text-yellow-300" />
                Translate
            </div>
            <div className="bg-gray-800 px-3 py-2 flex items-center text-xs text-gray-400 border-l border-gray-700">
                ~{estimateSelectionCost} tokens
            </div>
          </button>
      )}

      {/* Text Rendering Loop */}
      <div className="space-y-4">
        {segments.map((segment, idx) => {
            if (!segment.trim()) return null;
            return (
                <div key={idx} className={`${viewMode === 'SENTENCE' ? 'bg-slate-50 p-4 rounded-xl border border-gray-100' : 'mb-6'}`}>
                    {viewMode === 'SENTENCE' && (
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 select-none">Sentence {idx + 1}</div>
                    )}
                    <p className="text-lg md:text-xl leading-9 book-text text-gray-800 text-justify">
                        {renderTextSegment(segment, idx)}
                    </p>
                </div>
            );
        })}
      </div>

      {/* Popover */}
      {(selectedWord || loadingWord) && popoverPosition && (
        <div 
          className="vocab-popover fixed z-50 w-full max-w-xs md:max-w-sm bg-white rounded-xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
          style={{ 
            left: Math.min(Math.max(10, popoverPosition.x - 160), window.innerWidth - 330),
            top: popoverPosition.y 
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {loadingWord ? (
            <div className="p-6 flex items-center justify-center gap-3 text-blue-600 bg-white rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">Searching "{loadingWord}"...</span>
            </div>
          ) : selectedWord && (
            <div className="flex flex-col overflow-hidden rounded-xl">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 text-white flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold capitalize flex items-center gap-2">
                    {selectedWord.word}
                    {selectedWord.cefr && (
                         <span className={`text-xs font-bold px-2 py-0.5 rounded text-slate-900
                            ${['C1','C2'].includes(selectedWord.cefr) ? 'bg-red-400' : 'bg-green-400'}
                         `}>
                            {selectedWord.cefr}
                         </span>
                    )}
                  </h3>
                   {selectedWord.pronunciation && (
                      <div className="text-sm font-normal opacity-80 font-sans mt-1">
                        /{selectedWord.pronunciation}/
                      </div>
                   )}
                  <span className="inline-block text-cyan-300 text-xs font-bold uppercase tracking-wider mt-2">
                    {selectedWord.type}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => onToggleSave(selectedWord)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    {isSaved(selectedWord) ? (
                      <BookmarkCheck className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    ) : (
                      <Bookmark className="w-5 h-5 text-gray-300" />
                    )}
                  </button>
                  <button onClick={() => setSelectedWord(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-300" />
                  </button>
                </div>
              </div>
              
              <div className="p-5 bg-white">
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Định nghĩa</p>
                  <p className="text-gray-800 font-serif leading-relaxed">{selectedWord.definition}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Dịch</p>
                  <p className="text-lg text-blue-700 font-bold">{selectedWord.translation}</p>
                </div>
              </div>
            </div>
          )}
          
          <div 
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-800 rotate-45 border-t border-l border-slate-700"
            style={{ zIndex: -1 }}
          />
        </div>
      )}
    </div>
  );
};