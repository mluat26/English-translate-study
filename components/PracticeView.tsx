import React, { useState, useEffect } from 'react';
import { PracticeSession, VocabularyItem, EvaluationResult, TokenUsage } from '../types';
import { InteractiveText } from './InteractiveText';
import { evaluateFullTranslation } from '../services/aiService';
import { ArrowLeft, CheckCircle, Star, BookOpen, RefreshCw, Trophy, Target, ArrowRight, Download, Eye, BookmarkPlus, BookmarkCheck, Database, X, ChevronUp } from 'lucide-react';

interface PracticeViewProps {
  session: PracticeSession;
  savedWords: VocabularyItem[];
  onToggleSave: (word: VocabularyItem) => void;
  onExit: () => void;
  onFinishSession: (session: PracticeSession) => void;
  readOnly?: boolean;
}

const DiffView: React.FC<{ user: string; corrected: string }> = ({ user, corrected }) => {
  return (
    <div className="flex flex-col gap-4 text-base leading-relaxed">
      <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
        <span className="block text-xs font-black text-red-500 uppercase mb-2">Your Translation</span>
        <p className="text-gray-800 font-serif">{user}</p>
      </div>
      <div className="flex justify-center -my-3 z-10 print:hidden opacity-50">
        <ArrowRight className="w-5 h-5 rotate-90 text-gray-400" />
      </div>
      <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
         <span className="block text-xs font-black text-green-600 uppercase mb-2">Suggestion</span>
         <p className="text-gray-900 font-serif font-medium">{corrected}</p>
      </div>
    </div>
  );
};

export const PracticeView: React.FC<PracticeViewProps> = ({ 
  session, 
  savedWords, 
  onToggleSave, 
  onExit,
  onFinishSession,
  readOnly = false
}) => {
  const [translation, setTranslation] = useState(session.userTranslation || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(session.evaluation || null);
  const [lookupUsage, setLookupUsage] = useState<TokenUsage>(session.lookupUsage);
  
  // Mobile Result Sheet State
  const [showResultSheet, setShowResultSheet] = useState(false);

  const isSaved = (word: VocabularyItem) => {
    return savedWords.some(w => w.word === word.word);
  };

  useEffect(() => {
    if (readOnly && session.evaluation) {
      setResult(session.evaluation);
    }
  }, [readOnly, session]);

  const handleTokenUpdate = (newUsage: TokenUsage) => {
    setLookupUsage(prev => ({
        promptTokens: prev.promptTokens + newUsage.promptTokens,
        responseTokens: prev.responseTokens + newUsage.responseTokens,
        totalTokens: prev.totalTokens + newUsage.totalTokens
    }));
  };

  const handleSubmit = async () => {
    if (!translation.trim()) return;
    setIsSubmitting(true);
    try {
      const evaluation = await evaluateFullTranslation(session.text, translation);
      setResult({ ...evaluation, difficultWords: evaluation.difficultWords || [] });
      setShowResultSheet(true); // Open sheet on success
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Evaluation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    if (result) {
        onFinishSession({
            ...session,
            userTranslation: translation,
            evaluation: result,
            lookupUsage: lookupUsage,
            evaluationUsage: result.usage
        });
    }
    onExit();
  };

  const calculateTotalSessionTokens = () => {
    const init = session.initialUsage.totalTokens;
    const lookup = lookupUsage.totalTokens;
    const evalTokens = result?.usage?.totalTokens || 0;
    return init + lookup + evalTokens;
  };

  // Result Content (Shared between Desktop Panel and Mobile Sheet)
  const renderResultDetails = () => (
    <div className="space-y-6 pb-10">
      {/* 1. Score Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center flex flex-col items-center">
          <span className="text-[10px] font-black tracking-[0.2em] text-gray-400 uppercase mb-4">Assessment Result</span>
          
          <Trophy className={`w-12 h-12 mb-2 ${result!.score >= 80 ? 'text-yellow-500' : 'text-gray-300'}`} />
          
          <div className="text-7xl font-black text-slate-900 tracking-tighter mb-2">
              {result!.score}<span className="text-2xl text-gray-300 ml-1">/100</span>
          </div>

          <p className="text-lg font-medium text-slate-700 max-w-lg leading-relaxed">{result!.feedback}</p>
          
          <div className="mt-6 pt-4 border-t border-gray-50 flex gap-4 text-xs text-gray-400 font-mono">
              <span className="flex items-center gap-1"><Database className="w-3 h-3" /> Total Tokens: {calculateTotalSessionTokens()}</span>
          </div>
      </div>

      {/* 2. Improvements */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="bg-red-100 text-red-600 w-6 h-6 flex items-center justify-center rounded text-xs">!</span>
              Key Improvements
          </h3>
          <ul className="space-y-3">
              {result!.keyImprovements.map((imp, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed font-medium">
                      <span className="text-gray-300 font-bold">{i+1}.</span>
                      {imp}
                  </li>
              ))}
          </ul>
      </div>

      {/* 3. Advanced Vocab List */}
      {result!.difficultWords && result!.difficultWords.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-8 py-4 bg-purple-50 border-b border-purple-100 flex justify-between items-center">
                  <h3 className="font-bold text-purple-900 flex items-center gap-2">
                      <Star className="w-4 h-4" /> Advanced Vocabulary
                  </h3>
              </div>
              <div className="divide-y divide-gray-50">
                  {result!.difficultWords.map((word, idx) => (
                      <div key={idx} className="px-8 py-4 flex items-center justify-between group hover:bg-gray-50 transition-colors">
                          <div>
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-slate-900 text-lg">{word.word}</span>
                                  <span className="text-[10px] font-bold bg-slate-900 text-white px-1.5 rounded">{word.cefr || 'ADV'}</span>
                              </div>
                              <div className="text-sm text-gray-500">
                                  <span className="font-medium text-purple-700">{word.translation}</span> • {word.definition}
                              </div>
                          </div>
                          <button onClick={() => onToggleSave(word)} className="text-gray-300 hover:text-yellow-500 transition-colors">
                              {isSaved(word) ? <BookmarkCheck className="w-5 h-5 text-yellow-500" /> : <BookmarkPlus className="w-5 h-5" />}
                          </button>
                      </div>
                  ))}
              </div>
          </div>
      )}
      
      {/* Actions */}
      {!readOnly && (
          <div className="flex gap-3 pt-4 print:hidden">
                <button onClick={() => { setResult(null); setShowResultSheet(false); }} className="flex-1 py-4 font-bold text-gray-600 hover:bg-white hover:shadow rounded-xl transition-all border border-gray-200">
                    Retry
                </button>
                <button onClick={handleFinish} className="flex-1 py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-lg transition-all">
                    Finish & Save
                </button>
          </div>
      )}
        {readOnly && (
            <div className="flex gap-3 pt-4 print:hidden">
            <button onClick={onExit} className="flex-1 py-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-800 rounded-xl font-bold shadow-sm transition-all">
                Back to Home
            </button>
            </div>
        )}
    </div>
  );

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-white print:bg-white print:h-auto print:overflow-visible font-sans text-slate-900">
      
      {/* Header */}
      <header className="print:hidden bg-white border-b border-gray-100 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between shrink-0 h-16 z-20">
        <div className="flex items-center gap-4">
          <button onClick={onExit} className="p-2 hover:bg-gray-50 rounded-full text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-gray-800 text-lg truncate max-w-xs md:max-w-md">{session.title}</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {result && (
              <button onClick={() => window.print()} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors hidden md:block" title="Save PDF">
                <Download className="w-5 h-5" />
              </button>
          )}
          <div className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full text-xs font-bold border border-yellow-100 flex items-center gap-2 uppercase tracking-wide">
            <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
            <span className="hidden md:inline">{savedWords.length} Saved</span>
            <span className="md:hidden">{savedWords.length}</span>
          </div>
        </div>
      </header>

      {/* Main Layout - Split Screen on Mobile, Side-by-Side on Desktop */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative print:block print:overflow-visible">
        
        {/* TOP PANEL (Mobile) / LEFT PANEL (Desktop) - Source Text */}
        <div className={`
             bg-white border-b md:border-b-0 md:border-r border-gray-200 custom-scrollbar print:border-none print:overflow-visible overflow-y-auto
             ${(!result && !readOnly) ? 'h-[40%] md:h-full md:flex-1' : 'h-full flex-1'}
        `}>
          <div className="p-4 md:p-10 max-w-3xl mx-auto pb-10">
            <div className="mb-4 flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 w-fit px-3 py-1 rounded print:hidden sticky top-0 z-10">
              <BookOpen className="w-3 h-3" />
              Source Text
            </div>
            
            <InteractiveText 
              text={session.text} 
              vocabulary={session.vocabulary}
              savedWords={savedWords}
              onToggleSave={onToggleSave}
              onTokenUsage={readOnly ? undefined : handleTokenUpdate}
            />

            {/* In Mobile Result Mode, Show Diff Comparison here inside the main scroll view */}
            {result && (
                <div className="mt-8 border-t border-gray-100 pt-8 block md:hidden pb-20">
                    <div className="mb-6 flex items-center gap-2 text-xs font-black text-green-600 uppercase tracking-widest bg-green-50 w-fit px-3 py-1 rounded">
                        <Target className="w-3 h-3" />
                        Comparison
                    </div>
                    <DiffView user={translation} corrected={result.correctedTranslation} />
                </div>
            )}
          </div>
        </div>

        {/* BOTTOM PANEL (Mobile) / RIGHT PANEL (Desktop) - Input or Desktop Results */}
        <div className={`
            bg-slate-50/50 custom-scrollbar print:bg-white print:overflow-visible overflow-y-auto
            ${(!result && !readOnly) ? 'h-[60%] md:h-full md:flex-1' : 'hidden md:block md:flex-1'}
        `}>
          <div className="p-4 md:p-10 max-w-3xl mx-auto h-full flex flex-col print:block print:h-auto">
            
            {/* 1. Writing Mode */}
            {(!result && !readOnly) && (
              <div className="flex flex-col h-full animate-in fade-in duration-500">
                <div className="mb-2 flex items-center gap-2 text-xs font-black text-green-600 uppercase tracking-widest bg-green-50 w-fit px-3 py-1 rounded">
                  <Target className="w-3 h-3" />
                  Your Translation
                </div>
                
                <div className="flex-1 relative mb-4">
                  <textarea
                    value={translation}
                    onChange={(e) => setTranslation(e.target.value)}
                    placeholder="Type your translation here..."
                    className="w-full h-full p-4 rounded-xl border border-gray-200 shadow-sm focus:ring-4 focus:ring-green-100 focus:border-green-400 outline-none resize-none text-base md:text-lg leading-relaxed bg-white text-gray-800 placeholder:text-gray-300 transition-all font-serif"
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!translation.trim() || isSubmitting}
                  className="w-full bg-slate-900 hover:bg-black disabled:opacity-50 text-white py-3 md:py-4 rounded-xl font-bold shadow-xl transition-all flex items-center justify-center gap-3 shrink-0"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" /> Evaluating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" /> Submit & Check
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 2. Desktop Result Mode */}
            {result && (
                <>
                    {/* Desktop: Show full details here */}
                    <div className="hidden md:block animate-in slide-in-from-bottom-4 duration-500">
                         {/* Desktop Diff View inside panel */}
                         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-6">
                            <DiffView user={translation} corrected={result.correctedTranslation} />
                         </div>
                         {renderResultDetails()}
                    </div>
                </>
            )}
          </div>
        </div>

        {/* Mobile Result Bottom Bar (Trigger for Sheet) */}
        {result && (
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-10 w-[90%] max-w-sm">
                <button 
                    onClick={() => setShowResultSheet(true)}
                    className="w-full bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between hover:scale-105 transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-yellow-400" />
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Score</span>
                            <span className="font-black text-2xl leading-none">{result.score}/100</span>
                        </div>
                    </div>
                    <span className="font-bold text-sm bg-white/10 px-3 py-1 rounded-lg flex items-center gap-1">Details <ChevronUp className="w-4 h-4" /></span>
                </button>
            </div>
        )}

        {/* Mobile Result Bottom Sheet */}
        {showResultSheet && result && (
            <>
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden animate-in fade-in" onClick={() => setShowResultSheet(false)} />
                <div className="fixed bottom-0 left-0 right-0 bg-gray-50 rounded-t-3xl z-50 h-[85vh] md:hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
                     <div className="p-4 bg-white border-b border-gray-100 rounded-t-3xl flex items-center justify-between sticky top-0 shrink-0">
                         <div className="w-12 h-1 bg-gray-200 rounded-full absolute left-1/2 -translate-x-1/2 top-2" />
                         <span className="font-bold text-gray-900 mt-2 ml-2">Analysis Result</span>
                         <button onClick={() => setShowResultSheet(false)} className="p-2 bg-gray-100 rounded-full mt-2">
                             <X className="w-5 h-5" />
                         </button>
                     </div>
                     <div className="flex-1 overflow-y-auto p-6">
                        {renderResultDetails()}
                     </div>
                </div>
            </>
        )}

      </div>
    </div>
  );
};
