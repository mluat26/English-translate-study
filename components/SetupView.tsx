import React, { useState, useMemo, useEffect } from 'react';
import { ContentSource, AIContentConfig, VocabularyItem, PracticeSession, TokenUsage } from '../types';
import { generatePracticeContent, analyzeCustomText } from '../services/aiService';
import { BookOpen, Sparkles, Wand2, ArrowRight, Loader2, Clock, ChevronRight, X, Coins, LayoutGrid, Settings, BookMarked, ArrowDown, ArrowUp, Database, Sigma, Dices, Trash2 } from 'lucide-react';
import { SettingsModal } from './SettingsModal';

interface SetupViewProps {
  onStart: (title: string, text: string, vocabulary: VocabularyItem[], usage: TokenUsage) => void;
  history: PracticeSession[];
  onReview: (session: PracticeSession) => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenVocabulary: () => void;
  savedWordsCount: number;
}

export const SetupView: React.FC<SetupViewProps> = ({ onStart, history, onReview, onDeleteSession, onOpenVocabulary, savedWordsCount }) => {
  const [activeTab, setActiveTab] = useState<ContentSource>(ContentSource.AI_GENERATED);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const [aiConfig, setAiConfig] = useState<AIContentConfig>({
    topic: '',
    difficulty: 'Intermediate',
    length: 'Medium'
  });

  const [customText, setCustomText] = useState('');
  const [storageSize, setStorageSize] = useState<string>('0 B');

  // Calculate detailed token stats
  const tokenStats = useMemo(() => {
    let prompt = 0;
    let response = 0;
    
    history.forEach(session => {
        // Initial Generation/Analysis
        prompt += session.initialUsage?.promptTokens || 0;
        response += session.initialUsage?.responseTokens || 0;
        
        // Lookups
        prompt += session.lookupUsage?.promptTokens || 0;
        response += session.lookupUsage?.responseTokens || 0;
        
        // Evaluation
        prompt += session.evaluationUsage?.promptTokens || 0;
        response += session.evaluationUsage?.responseTokens || 0;
    });

    return {
        prompt,
        response,
        total: prompt + response
    };
  }, [history]);

  // Calculate Storage Size
  useEffect(() => {
    const calculateStorage = () => {
        let totalBytes = 0;
        const appKeys = ['lf_history', 'lf_saved_words', 'ds_api_key', 'ds_prompts'];
        
        appKeys.forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                // Approximate byte size (UTF-16 = 2 bytes per char)
                totalBytes += item.length * 2;
            }
        });

        if (totalBytes === 0) {
            setStorageSize('0 B');
            return;
        }

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(totalBytes) / Math.log(k));
        setStorageSize(parseFloat((totalBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]);
    };
    calculateStorage();
  }, [history, savedWordsCount]);

  const handleAiGenerate = async () => {
    if (!aiConfig.topic.trim()) return;
    setIsLoading(true);
    setLoadingStep('AI is writing your story...');
    try {
      const result = await generatePracticeContent(aiConfig);
      onStart(result.title, result.text, result.vocabulary, result.usage);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to generate. Check API Key in Settings.");
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleCustomStart = async () => {
    if (!customText.trim()) return;
    setIsLoading(true);
    setLoadingStep('Analyzing text...');
    try {
      const result = await analyzeCustomText(customText);
      onStart(result.title, result.text, result.vocabulary, result.usage);
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to analyze. Check API Key in Settings.");
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleRandomTopic = () => {
    const topics = [
      "The impact of AI on education",
      "A memorable childhood vacation",
      "How to cook a traditional Vietnamese dish",
      "The benefits of reading books daily",
      "My dream job and why I want it",
      "Environmental challenges in modern cities",
      "The history of coffee culture",
      "A funny misunderstanding",
      "Tips for staying healthy while working remotely",
      "The most interesting place I've visited",
      "Future of space exploration",
      "Benefits of learning a second language",
      "Traditional festivals in my country",
      "Social media: Blessing or Curse?",
      "My favorite movie and why"
    ];
    const random = topics[Math.floor(Math.random() * topics.length)];
    setAiConfig({ ...aiConfig, topic: random });
  };

  const getEstimatedGenTokens = () => {
    const base = 200; 
    const lengthMap = { 'Short': 100, 'Medium': 250, 'Long': 400 };
    return base + lengthMap[aiConfig.length];
  };

  const formatNumber = (num: number) => {
      if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
      return num.toString();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      
      {/* Top Bar with Center Stats */}
      <div className="w-full max-w-4xl px-4 pt-6 flex justify-between items-start md:items-center">
          {/* Left: Settings */}
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-700 hover:shadow-md transition-all border border-gray-100 mt-1 md:mt-0"
            title="Settings"
          >
              <Settings className="w-5 h-5" />
          </button>
          
          {/* Center: Usage Stats (Small & Grouped) */}
          <div className="flex flex-col items-center justify-center mx-2 md:mx-4">
              <div className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-xl px-3 py-1.5 shadow-sm flex flex-col gap-1 w-full max-w-[200px] md:max-w-none">
                  {/* Row 1: Tokens Breakdown */}
                  <div className="flex items-center justify-between gap-3 text-[10px] font-medium leading-none border-b border-gray-100 pb-1 mb-0.5">
                      <div className="flex items-center gap-1 text-blue-600" title="Total Input Tokens">
                          <ArrowDown className="w-3 h-3" />
                          <span>{formatNumber(tokenStats.prompt)}</span>
                      </div>
                      <div className="w-px h-2 bg-gray-200"></div>
                      <div className="flex items-center gap-1 text-green-600" title="Total Output Tokens">
                          <ArrowUp className="w-3 h-3" />
                          <span>{formatNumber(tokenStats.response)}</span>
                      </div>
                  </div>
                  
                  {/* Row 2: Totals & Storage */}
                  <div className="flex items-center justify-between gap-3 text-[10px] font-bold text-gray-600 leading-none">
                       <div className="flex items-center gap-1" title="Total Tokens Used">
                          <Sigma className="w-3 h-3 text-gray-400" />
                          <span>{formatNumber(tokenStats.total)}</span>
                      </div>
                      <div className="w-px h-2 bg-gray-200"></div>
                      <div className="flex items-center gap-1 text-purple-600" title="Storage Usage (IndexedDB/Local)">
                          <Database className="w-3 h-3" />
                          <span>{storageSize}</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* Right: Vocab */}
          <button 
            onClick={onOpenVocabulary}
            className="flex items-center gap-2 px-3 py-2 bg-white rounded-full shadow-sm border border-gray-100 text-gray-600 hover:text-blue-600 hover:shadow-md transition-all font-bold text-xs mt-1 md:mt-0"
          >
              <BookMarked className="w-4 h-4 text-yellow-500" />
              <span className="hidden md:inline">Vocab</span>
              <span>({savedWordsCount})</span>
          </button>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-4xl px-4 py-8 flex-1">
            <div className="text-center mb-8 md:mb-12">
                <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center justify-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    LinguaFlow
                </h1>
                <p className="text-gray-500 text-lg">AI-Powered Translation Tutor</p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-white overflow-hidden relative">
            
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-800 font-medium text-lg">{loadingStep}</p>
                </div>
            )}

            {/* Tabs */}
            <div className="flex p-2 bg-gray-50/80 m-2 rounded-2xl">
                <button
                onClick={() => setActiveTab(ContentSource.AI_GENERATED)}
                className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all
                    ${activeTab === ContentSource.AI_GENERATED ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                `}
                >
                <Sparkles className="w-4 h-4" /> AI Generator
                </button>
                <button
                onClick={() => setActiveTab(ContentSource.CUSTOM_TEXT)}
                className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all
                    ${activeTab === ContentSource.CUSTOM_TEXT ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                `}
                >
                <BookOpen className="w-4 h-4" /> Custom Text
                </button>
            </div>

            <div className="p-6 md:p-10">
                {activeTab === ContentSource.AI_GENERATED ? (
                <div className="space-y-6">
                    <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Topic</label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="e.g., Technology trends in 2025..."
                            value={aiConfig.topic}
                            onChange={(e) => setAiConfig({ ...aiConfig, topic: e.target.value })}
                            className="w-full pl-5 pr-14 py-4 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                        />
                        <button 
                            onClick={handleRandomTopic}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors group"
                            title="Random Topic"
                        >
                            <Dices className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                        </button>
                    </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Level</label>
                        <select
                        value={aiConfig.difficulty}
                        onChange={(e) => setAiConfig({ ...aiConfig, difficulty: e.target.value as any })}
                        className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Length</label>
                        <select
                        value={aiConfig.length}
                        onChange={(e) => setAiConfig({ ...aiConfig, length: e.target.value as any })}
                        className="w-full px-5 py-4 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                        <option value="Short">Short</option>
                        <option value="Medium">Medium</option>
                        <option value="Long">Long</option>
                        </select>
                    </div>
                    </div>

                    <div className="pt-2">
                        <button
                        onClick={handleAiGenerate}
                        disabled={!aiConfig.topic || isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 text-lg"
                        >
                        Generate Content <Wand2 className="w-5 h-5" />
                        </button>
                        <div className="text-center mt-3 text-xs font-medium text-gray-400 flex items-center justify-center gap-1">
                            <Coins className="w-3 h-3" />
                            Est. Input Tokens: ~{getEstimatedGenTokens()}
                        </div>
                    </div>
                </div>
                ) : (
                <div className="space-y-6">
                    <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Paste Text</label>
                    <textarea
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="Paste an English article or story here..."
                        className="w-full h-48 px-5 py-4 rounded-xl bg-gray-50 border border-gray-100 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-base"
                    />
                    </div>

                    <div className="pt-2">
                        <button
                        onClick={handleCustomStart}
                        disabled={!customText.trim() || isLoading}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-green-500/30 transition-all flex items-center justify-center gap-2 text-lg"
                        >
                        Analyze & Start <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                )}
            </div>
            </div>

            {/* Recent History Grid */}
            <div className="mt-8 mb-20">
                 <div className="flex justify-between items-end mb-6">
                     <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-400" /> Recent Sessions
                     </h3>
                     {history.length > 4 && (
                        <button 
                            onClick={() => setShowHistoryModal(true)}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                            View All <ChevronRight className="w-4 h-4" />
                        </button>
                     )}
                 </div>

                 {history.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <LayoutGrid className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-gray-500">No history yet.</p>
                    </div>
                 ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {history.slice(0, 4).map(session => (
                            <div key={session.id} className="group relative h-full">
                                <button 
                                    onClick={() => onReview(session)}
                                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all text-left flex flex-col h-full w-full"
                                >
                                    <h4 className="font-bold text-gray-800 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors pr-6">{session.title}</h4>
                                    <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-50 w-full">
                                        <span className="text-xs text-gray-400">{new Date(session.date).toLocaleDateString()}</span>
                                        {session.evaluation && (
                                            <span className={`text-xs font-bold px-2 py-1 rounded-md
                                                ${session.evaluation.score >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
                                            `}>
                                                {session.evaluation.score}
                                            </span>
                                        )}
                                    </div>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                                    className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                    title="Delete Session"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                     </div>
                 )}
            </div>
      </div>

      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        totalTokensUsed={tokenStats.total}
      />
      
      {/* History Slider / Modal */}
      {showHistoryModal && (
          <>
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setShowHistoryModal(false)} />
            <div className="fixed top-0 right-0 h-full w-[85%] md:w-[70%] bg-white z-50 shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-bold text-gray-900">Session History</h2>
                        <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {history.map(session => (
                            <div key={session.id} className="group relative">
                                <button 
                                    onClick={() => { onReview(session); setShowHistoryModal(false); }}
                                    className="bg-gray-50 p-6 rounded-2xl hover:bg-white hover:shadow-lg border border-transparent hover:border-gray-200 transition-all text-left w-full"
                                >
                                    <h4 className="font-bold text-lg text-gray-800 mb-2 pr-8">{session.title}</h4>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span>{new Date(session.date).toLocaleString()}</span>
                                        {session.evaluation ? (
                                            <span className={`font-bold ${session.evaluation.score >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
                                                Score: {session.evaluation.score}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 italic">Unfinished</span>
                                        )}
                                    </div>
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                                    className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                    title="Delete Session"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          </>
      )}
    </div>
  );
};