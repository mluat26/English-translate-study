import React, { useState, useEffect } from 'react';
import { SetupView } from './components/SetupView';
import { PracticeView } from './components/PracticeView';
import { VocabularyView } from './components/VocabularyView';
import { AppMode, PracticeSession, VocabularyItem, TokenUsage } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.SETUP);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [history, setHistory] = useState<PracticeSession[]>([]);
  const [savedWords, setSavedWords] = useState<VocabularyItem[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    const storedHistory = localStorage.getItem('lf_history');
    if (storedHistory) setHistory(JSON.parse(storedHistory));
    
    const storedWords = localStorage.getItem('lf_saved_words');
    if (storedWords) setSavedWords(JSON.parse(storedWords));
  }, []);

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('lf_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('lf_saved_words', JSON.stringify(savedWords));
  }, [savedWords]);


  const startSession = (title: string, text: string, vocabulary: VocabularyItem[], usage: TokenUsage) => {
    setSession({
      id: Date.now().toString(),
      title,
      text,
      vocabulary,
      date: Date.now(),
      initialUsage: usage,
      lookupUsage: { promptTokens: 0, responseTokens: 0, totalTokens: 0 }
    });
    setMode(AppMode.PRACTICE);
  };

  const handleFinishSession = (finishedSession: PracticeSession) => {
      setHistory(prev => [finishedSession, ...prev]);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (window.confirm("Are you sure you want to delete this session?")) {
      setHistory(prev => prev.filter(s => s.id !== sessionId));
    }
  };

  const handleReviewSession = (pastSession: PracticeSession) => {
      setSession(pastSession);
      setMode(AppMode.REVIEW);
  };

  const handleToggleSaveWord = (word: VocabularyItem) => {
    setSavedWords(prev => {
      const exists = prev.some(w => w.word === word.word);
      if (exists) {
        return prev.filter(w => w.word !== word.word);
      }
      return [...prev, word];
    });
  };

  const handleAddManualWord = (word: VocabularyItem) => {
    setSavedWords(prev => [word, ...prev]);
  };
  
  const handleRemoveSavedWord = (wordStr: string) => {
      setSavedWords(prev => prev.filter(w => w.word !== wordStr));
  };

  const handleExitPractice = () => {
    setMode(AppMode.SETUP);
    setSession(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {mode === AppMode.SETUP && (
        <SetupView 
            onStart={startSession} 
            history={history}
            onReview={handleReviewSession}
            onDeleteSession={handleDeleteSession}
            savedWordsCount={savedWords.length}
            onOpenVocabulary={() => setMode(AppMode.VOCABULARY)}
        />
      )}

      {(mode === AppMode.PRACTICE || mode === AppMode.REVIEW) && session && (
        <PracticeView 
          session={session} 
          savedWords={savedWords}
          onToggleSave={handleToggleSaveWord}
          onExit={handleExitPractice}
          onFinishSession={handleFinishSession}
          readOnly={mode === AppMode.REVIEW}
        />
      )}

      {mode === AppMode.VOCABULARY && (
        <VocabularyView 
            savedWords={savedWords}
            onRemove={handleRemoveSavedWord}
            onAdd={handleAddManualWord}
            onExit={() => setMode(AppMode.SETUP)}
        />
      )}
    </div>
  );
};

export default App;